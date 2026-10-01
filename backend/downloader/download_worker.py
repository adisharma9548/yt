import os
import time
import threading
from pathlib import Path
from typing import Optional, Dict, Any, Callable
import yt_dlp

from ..models.queue_item import QueueItem
from ..models.enums import DownloadStatus, ExistingFilePolicy
from ..services.youtube_service import youtube_service
from ..services.ffmpeg_service import ffmpeg_service
from ..services.filesystem_service import validate_download_directory
from ..downloader.progress_tracker import ProgressTracker
from ..utils.logger import logger
from ..utils.filename_sanitizer import sanitize_filename, generate_filename
from ..config import RETRY_BACKOFF_SECONDS, FFMPEG_PATH


class DownloadCancelledException(Exception):
    """Raised when user cancels download."""
    pass


class DownloadWorker:
    def __init__(
        self,
        progress_tracker: ProgressTracker,
        pause_event: Optional[threading.Event] = None,
        cancel_event: Optional[threading.Event] = None
    ):
        self.progress_tracker = progress_tracker
        self.pause_event = pause_event or threading.Event()
        self.cancel_event = cancel_event or threading.Event()
        # Only default to "running" when no shared pause event was provided.
        # Previously this un-paused the whole queue every time a new video started.
        if pause_event is None:
            self.pause_event.set()

    def download_item(
        self,
        item: QueueItem,
        existing_file_policy: ExistingFilePolicy = ExistingFilePolicy.SKIP,
        status_update_cb: Optional[Callable[[QueueItem], None]] = None
    ) -> bool:
        """
        Executes download for a single QueueItem with automatic retry & exponential backoff.
        Returns True if completed or skipped, False if failed or cancelled.
        """
        dest_dir = Path(item.download_folder).resolve()
        dest_dir.mkdir(parents=True, exist_ok=True)

        # Ensure filename is safe for Windows
        if not item.filename:
            item.filename = generate_filename(item.title, item.playlist_index, item.video_id)
        else:
            item.filename = sanitize_filename(item.filename, fallback_id=f"{item.playlist_index:03d}_{item.video_id}")

        final_file_path = dest_dir / item.filename

        # 1. Existing file policy check
        if final_file_path.exists() and final_file_path.stat().st_size > 0:
            if existing_file_policy == ExistingFilePolicy.SKIP:
                logger.info(f"Skipping existing file: {final_file_path}")
                item.status = DownloadStatus.SKIPPED
                item.progress.bytes_downloaded = final_file_path.stat().st_size
                item.progress.total_bytes = final_file_path.stat().st_size
                item.progress.percentage = 100.0
                if status_update_cb:
                    status_update_cb(item)
                return True
            elif existing_file_policy == ExistingFilePolicy.OVERWRITE:
                try:
                    final_file_path.unlink(missing_ok=True)
                except Exception as e:
                    logger.warning(f"Could not remove existing file prior to overwrite: {e}")

        # 2. Attempt download with retries
        item.status = DownloadStatus.DOWNLOADING
        if status_update_cb:
            status_update_cb(item)

        while item.retry_count <= item.max_retries:
            # Check cancellation
            if self.cancel_event.is_set():
                logger.info(f"Download cancelled by user for: {item.title}")
                item.status = DownloadStatus.CANCELLED
                if status_update_cb:
                    status_update_cb(item)
                return False

            try:
                success = self._execute_yt_dlp(
                    item,
                    final_file_path,
                    overwrite=(existing_file_policy == ExistingFilePolicy.OVERWRITE)
                )
                if success:
                    item.status = DownloadStatus.COMPLETED
                    item.progress.percentage = 100.0
                    item.progress.speed_mbps = 0.0
                    item.progress.eta_seconds = 0
                    item.error = None
                    item.error_details = None
                    self.progress_tracker.update_item_progress(
                        item=item,
                        bytes_downloaded=item.progress.bytes_downloaded or 1,
                        total_bytes=item.progress.total_bytes or 1,
                        speed_bytes=0,
                        eta_seconds=0,
                        force_emit=True
                    )
                    if status_update_cb:
                        status_update_cb(item)
                    return True

                # yt-dlp finished but no output file was found: count it as a failed
                # attempt. Previously retry_count never increased here, so the loop spun
                # forever and the queue could never move on to the next video.
                raise RuntimeError("Download finished but the output file was not found")

            except DownloadCancelledException:
                logger.info(f"Download of '{item.title}' was cancelled mid-stream.")
                item.status = DownloadStatus.CANCELLED
                if status_update_cb:
                    status_update_cb(item)
                return False

            except Exception as e:
                # yt-dlp wraps exceptions raised inside progress hooks (DownloadError),
                # so a user skip/cancel must be detected here too, not retried.
                if self.cancel_event.is_set() or isinstance(getattr(e, "exc_info", (None, None))[1], DownloadCancelledException):
                    logger.info(f"Download of '{item.title}' was cancelled by user.")
                    item.status = DownloadStatus.CANCELLED
                    if status_update_cb:
                        status_update_cb(item)
                    return False
                item.retry_count += 1
                err_msg = str(e)
                logger.error(f"Error downloading {item.title} (attempt {item.retry_count}/{item.max_retries}): {err_msg}")
                item.error = err_msg
                item.error_type = type(e).__name__
                item.error_details = err_msg

                if item.retry_count <= item.max_retries:
                    backoff = RETRY_BACKOFF_SECONDS[min(item.retry_count - 1, len(RETRY_BACKOFF_SECONDS) - 1)]
                    logger.info(f"Backing off {backoff} seconds before retry...")
                    # Sleep in small slices to remain responsive to cancel
                    for _ in range(backoff * 2):
                        if self.cancel_event.is_set():
                            item.status = DownloadStatus.CANCELLED
                            if status_update_cb:
                                status_update_cb(item)
                            return False
                        time.sleep(0.5)
                else:
                    item.status = DownloadStatus.FAILED
                    if status_update_cb:
                        status_update_cb(item)
                    return False

        item.status = DownloadStatus.FAILED
        if status_update_cb:
            status_update_cb(item)
        return False

    def _execute_yt_dlp(self, item: QueueItem, final_file_path: Path, overwrite: bool = False) -> bool:
        """Internal yt-dlp execution with hooks."""
        safe_stem = final_file_path.stem.replace("%", "%%")
        outtmpl = str(final_file_path.parent / f"{safe_stem}.%(ext)s")
        format_spec = youtube_service.get_yt_dlp_format_selector(item.quality)

        def progress_hook(d: Dict[str, Any]):
            # Check pause
            while not self.pause_event.is_set():
                if self.cancel_event.is_set():
                    raise DownloadCancelledException("Download cancelled during pause")
                time.sleep(0.3)

            # Check cancel
            if self.cancel_event.is_set():
                raise DownloadCancelledException("Download cancelled by user")

            status = d.get("status")
            if status == "downloading":
                downloaded = d.get("downloaded_bytes", 0)
                total = d.get("total_bytes") or d.get("total_bytes_estimate", 0)
                speed = d.get("speed", 0)
                eta = d.get("eta", 0)

                self.progress_tracker.update_item_progress(
                    item=item,
                    bytes_downloaded=downloaded,
                    total_bytes=total,
                    speed_bytes=speed,
                    eta_seconds=eta
                )
            elif status == "finished":
                downloaded = d.get("downloaded_bytes", 0) or d.get("total_bytes", 0)
                total = d.get("total_bytes") or downloaded
                self.progress_tracker.update_item_progress(
                    item=item,
                    bytes_downloaded=downloaded,
                    total_bytes=total,
                    speed_bytes=0,
                    eta_seconds=0,
                    force_emit=True
                )

        ydl_opts = {
            "format": format_spec,
            "outtmpl": outtmpl,
            "progress_hooks": [progress_hook],
            "quiet": True,
            "no_warnings": True,
            "ignoreerrors": False,
            "continuedl": not overwrite,  # Disable resume if overwriting
            "overwrites": overwrite,
            # Bound stalled network reads so cancellation/skip can progress even when
            # yt-dlp has not emitted a progress hook for a while.
            "socket_timeout": 15,
            "retries": 3,
            "fragment_retries": 3,
            "file_access_retries": 2,
            "merge_output_format": "mp4",
        }

        ffmpeg_bin = ffmpeg_service.ffmpeg_path or FFMPEG_PATH
        if ffmpeg_bin:
            ydl_opts["ffmpeg_location"] = str(ffmpeg_bin)

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([item.url])

        # Verify output file exists and has settled as a non-empty regular file.
        # yt-dlp's "finished" hook means the media stream finished, not necessarily
        # that post-processing/merging and final rename have completed.
        if final_file_path.is_file() and final_file_path.stat().st_size > 0:
            size = final_file_path.stat().st_size
            item.filename = final_file_path.name
            item.progress.bytes_downloaded = size
            item.progress.total_bytes = size
            item.progress.percentage = 100.0
            return True

        # Check if yt-dlp saved it with a slightly different extension without using Path.glob
        # (avoiding bracket regex bugs like [Official Video])
        parent_dir = final_file_path.parent
        target_stem = final_file_path.stem.lower()
        candidates = [
            f for f in parent_dir.iterdir()
            if f.is_file() and f.stem.lower() == target_stem and f.stat().st_size > 0
            and not f.name.endswith((".part", ".ytdl", ".temp"))
        ]
        if candidates:
            # Rename or use first valid candidate
            # Prefer the expected container extension, then the largest valid
            # candidate (avoids accidentally selecting a tiny sidecar/thumbnail).
            candidates.sort(key=lambda f: (f.suffix.lower() == final_file_path.suffix.lower(), f.stat().st_size), reverse=True)
            matched = candidates[0]
            if matched.suffix.lower() != ".mp4" and ffmpeg_service.is_available():
                # Remux to mp4 via dedicated FFmpeg remuxer
                remux_res = ffmpeg_service.remux_to_mp4(matched, final_file_path)
                if remux_res.get("success") and final_file_path.exists():
                    try:
                        matched.unlink(missing_ok=True)
                    except Exception:
                        pass
                    size = final_file_path.stat().st_size
                    item.filename = final_file_path.name
                    item.progress.bytes_downloaded = size
                    item.progress.total_bytes = size
                    item.progress.percentage = 100.0
                    return True
            item.filename = matched.name
            size = matched.stat().st_size
            item.progress.bytes_downloaded = size
            item.progress.total_bytes = size
            item.progress.percentage = 100.0
            return True

        return False
