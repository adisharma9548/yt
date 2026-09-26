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
        self.pause_event.set()  # Default not paused (set = running)

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
                success = self._execute_yt_dlp(item, final_file_path)
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

                # yt-dlp may return normally even when no usable output file was
                # produced. Treat that as a failed attempt; otherwise this loop
                # retries forever without incrementing retry_count and the queue
                # never advances to the next video.
                raise RuntimeError("Download finished without producing an output file")

            except DownloadCancelledException:
                logger.info(f"Download of '{item.title}' was cancelled mid-stream.")
                item.status = DownloadStatus.CANCELLED
                if status_update_cb:
                    status_update_cb(item)
                return False

            except Exception as e:
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

    def _execute_yt_dlp(self, item: QueueItem, final_file_path: Path) -> bool:
        """Internal yt-dlp execution with hooks."""
        outtmpl = str(final_file_path.with_suffix(".%(ext)s"))
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
            "continuedl": True,  # Support resuming interrupted downloads
            "merge_output_format": "mp4",
        }

        if FFMPEG_PATH:
            ydl_opts["ffmpeg_location"] = FFMPEG_PATH

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([item.url])

        # Verify output file exists
        if final_file_path.exists() and final_file_path.stat().st_size > 0:
            size = final_file_path.stat().st_size
            item.progress.bytes_downloaded = size
            item.progress.total_bytes = size
            item.progress.percentage = 100.0
            return True

        # Check if yt-dlp saved it with a slightly different extension without using Path.glob
        # (avoiding bracket regex bugs like [Official Video])
        parent_dir = final_file_path.parent
        candidates = [
            f for f in parent_dir.iterdir()
            if f.is_file() and f.stem == final_file_path.stem and not f.name.endswith(".part") and not f.name.endswith(".ytdl")
        ]
        if candidates:
            # Rename or use first valid candidate
            matched = candidates[0]
            if matched.suffix.lower() != ".mp4" and ffmpeg_service.is_available():
                # Remux to mp4
                ffmpeg_service.merge_video_audio(matched, matched, final_file_path)
                if final_file_path.exists():
                    try:
                        matched.unlink()
                    except Exception:
                        pass
                    size = final_file_path.stat().st_size
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
