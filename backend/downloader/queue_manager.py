import json
import time
import threading
from pathlib import Path
from typing import List, Dict, Any, Optional, Callable
import uuid

from ..models.queue_item import QueueItem
from ..models.enums import DownloadStatus, ExistingFilePolicy
from .progress_tracker import ProgressTracker
from .download_worker import DownloadWorker
from ..utils.logger import logger
from ..utils.filename_sanitizer import sanitize_filename, generate_filename
from ..config import QUEUE_STATE_FILE


class QueueManager:
    def __init__(self, broadcast_callback: Optional[Callable[[Dict[str, Any]], None]] = None):
        self.broadcast_callback = broadcast_callback
        self.progress_tracker = ProgressTracker(broadcast_callback=self._on_progress_broadcast)
        self.queue_id: str = f"q_{uuid.uuid4().hex[:8]}"
        self.items: List[QueueItem] = []
        self.overall_status: str = "idle"  # idle, downloading, paused, completed, cancelled
        self.current_index: int = 0
        self.download_folder: str = ""
        self.existing_file_policy: ExistingFilePolicy = ExistingFilePolicy.SKIP
        self.start_time: float = 0.0
        self.end_time: float = 0.0

        # Thread synchronization
        self.pause_event = threading.Event()
        self.pause_event.set()  # set = running, clear = paused
        self.cancel_current_event = threading.Event()
        self.cancel_all_event = threading.Event()
        self.worker_thread: Optional[threading.Thread] = None
        self._lock = threading.RLock()

        # Load persisted state if exists
        self.load_state()

    def _on_progress_broadcast(self, payload: Dict[str, Any]):
        """Injects overall queue summary, status, and items into progress event."""
        with self._lock:
            payload["queue_summary"] = self.get_summary()
            payload["overall_status"] = self.overall_status
            payload["queue_items"] = [item.to_dict() for item in self.items]
        if self.broadcast_callback:
            try:
                self.broadcast_callback(payload)
            except Exception:
                pass

    def add_item(self, item_data: Dict[str, Any]) -> QueueItem:
        """Adds a single item to the queue with sanitized filename."""
        with self._lock:
            item_id = item_data.get("id") or f"video_{uuid.uuid4().hex[:6]}"
            title = item_data.get("title", "Untitled")
            playlist_index = item_data.get("index") or item_data.get("playlist_index", len(self.items) + 1)
            video_id = item_data.get("video_id", "")
            raw_filename = item_data.get("filename", "")
            if raw_filename:
                safe_filename = sanitize_filename(raw_filename, fallback_id=f"{playlist_index:03d}_{video_id}")
            else:
                safe_filename = generate_filename(title, playlist_index, video_id)

            item = QueueItem(
                id=item_id,
                playlist_index=playlist_index,
                video_id=video_id,
                title=title,
                url=item_data.get("url") or f"https://www.youtube.com/watch?v={video_id}",
                status=DownloadStatus.WAITING,
                quality=item_data.get("quality", "best"),
                filename=safe_filename,
                download_folder=item_data.get("download_folder", self.download_folder),
            )
            self.items.append(item)
            return item

    def start_queue(
        self,
        items: List[Dict[str, Any]],
        download_folder: str,
        existing_file_policy: ExistingFilePolicy = ExistingFilePolicy.SKIP
    ) -> str:
        """Initializes and begins downloading queue items sequentially."""
        with self._lock:
            # If already running, cancel previous and wait for thread to terminate
            if self.worker_thread and self.worker_thread.is_alive():
                self.cancel_all()
                self.worker_thread.join(timeout=3.0)

            self.queue_id = f"q_{uuid.uuid4().hex[:8]}"
            self.items = []
            self.download_folder = download_folder
            self.existing_file_policy = existing_file_policy
            self.pause_event.set()
            self.cancel_current_event.clear()
            self.cancel_all_event.clear()
            self.overall_status = "downloading"
            self.start_time = time.time()
            self.end_time = 0.0

            for idx, raw in enumerate(items, start=1):
                raw["playlist_index"] = raw.get("index", idx)
                raw["download_folder"] = download_folder
                self.add_item(raw)

            self.save_state()

            # Start worker thread
            self.worker_thread = threading.Thread(target=self._process_queue_loop, daemon=True)
            self.worker_thread.start()

            return self.queue_id

    def pause(self) -> bool:
        """Pauses the download queue."""
        with self._lock:
            if self.overall_status == "downloading":
                self.pause_event.clear()
                self.overall_status = "paused"
                self.save_state()
                logger.info("Download queue paused.")
                return True
            return False

    def resume(self) -> bool:
        """Resumes a paused download queue."""
        with self._lock:
            if self.overall_status == "paused":
                self.pause_event.set()
                self.overall_status = "downloading"
                self.save_state()
                logger.info("Download queue resumed.")
                return True
            return False

    def is_paused(self) -> bool:
        return not self.pause_event.is_set() or self.overall_status == "paused"

    def cancel_current(self) -> Dict[str, Any]:
        """Cancels the currently downloading item only."""
        with self._lock:
            self.cancel_current_event.set()
            # If the queue is paused, un-pause so the worker can notice the skip and
            # move on to the next video instead of staying stuck.
            if self.overall_status == "paused":
                self.pause_event.set()
                self.overall_status = "downloading"
            current_item = self.get_current_item()
            if current_item:
                cancelled_id = current_item.id
            else:
                # If no item is currently in DOWNLOADING status, cancel the next WAITING item
                cancelled_id = None
                for item in self.items:
                    if item.status == DownloadStatus.WAITING:
                        item.status = DownloadStatus.CANCELLED
                        cancelled_id = item.id
                        break

            # Find next item
            next_item = None
            for item in self.items:
                if item.status == DownloadStatus.WAITING:
                    next_item = item
                    break

            return {
                "cancelled_item": cancelled_id,
                "next_item": next_item.id if next_item else None
            }

    def cancel_all(self) -> int:
        """Cancels all items and halts queue processing."""
        with self._lock:
            self.cancel_all_event.set()
            self.cancel_current_event.set()
            self.pause_event.set()  # Unblock if paused so thread can exit
            self.overall_status = "cancelled"

            cancelled_count = 0
            for item in self.items:
                if item.status in (DownloadStatus.WAITING, DownloadStatus.DOWNLOADING):
                    item.status = DownloadStatus.CANCELLED
                    cancelled_count += 1

            self.save_state()
            logger.info(f"Queue cancelled. {cancelled_count} items cancelled.")
            return cancelled_count

    def retry_failed(self) -> str:
        """Restarts queue for failed items only, preserving completed and skipped."""
        with self._lock:
            if self.worker_thread and self.worker_thread.is_alive():
                self.worker_thread.join(timeout=2.0)
                if self.worker_thread.is_alive():
                    return self.queue_id  # already running; avoid two workers on one queue
            failed_items = [item for item in self.items if item.status == DownloadStatus.FAILED]
            if not failed_items:
                return self.queue_id

            for item in failed_items:
                item.status = DownloadStatus.WAITING
                item.retry_count = 0
                item.error = None
                item.error_type = None
                item.error_details = None

            self.overall_status = "downloading"
            self.pause_event.set()
            self.cancel_current_event.clear()
            self.cancel_all_event.clear()
            self.save_state()

            # Start worker loop again
            self.worker_thread = threading.Thread(target=self._process_queue_loop, daemon=True)
            self.worker_thread.start()

            return self.queue_id

    def _process_queue_loop(self):
        """Worker loop processing each item in the queue sequentially."""
        logger.info(f"Starting queue loop for queue: {self.queue_id}")
        try:
            for idx, item in enumerate(self.items):
                if self.cancel_all_event.is_set():
                    break

                if item.status != DownloadStatus.WAITING:
                    continue

                self.current_index = idx + 1
                # Clear any stale skip request before starting this video
                self.cancel_current_event.clear()
                # Respect pause between videos
                while not self.pause_event.is_set() and not self.cancel_all_event.is_set():
                    time.sleep(0.3)
                if self.cancel_all_event.is_set():
                    break

                worker = DownloadWorker(
                    progress_tracker=self.progress_tracker,
                    pause_event=self.pause_event,
                    cancel_event=self.cancel_current_event
                )

                # Process single video
                try:
                    worker.download_item(
                        item=item,
                        existing_file_policy=self.existing_file_policy,
                        status_update_cb=self._on_item_status_updated
                    )
                except Exception as e:
                    logger.error(f"Error processing item {item.title}: {e}")
                    item.status = DownloadStatus.FAILED
                    item.error = str(e)
                    self._on_item_status_updated(item)

                self.save_state()
        finally:
            # Wrap up queue processing
            with self._lock:
                self.end_time = time.time()
                if self.cancel_all_event.is_set():
                    self.overall_status = "cancelled"
                else:
                    self.overall_status = "completed"

                self.save_state()

            self._emit_completion_event()

    def _on_item_status_updated(self, item: QueueItem):
        """Callback when an item changes status."""
        self.progress_tracker.emit_progress(item, queue_summary=self.get_summary())

    def _emit_completion_event(self):
        """Broadcasts download_complete event to WebSocket clients."""
        if not self.broadcast_callback:
            return

        with self._lock:
            summary = self.get_summary()
            elapsed_sec = int(self.end_time - self.start_time) if self.start_time else 0
            total_bytes = sum(i.progress.bytes_downloaded for i in self.items)

            failed_items = [
                {
                    "index": item.playlist_index,
                    "video_id": item.video_id,
                    "title": item.title,
                    "error": item.error_type or "DownloadError",
                    "message": item.error or "Unknown error"
                }
                for item in self.items if item.status == DownloadStatus.FAILED
            ]

            payload = {
                "event_type": "download_complete",
                "overall_status": self.overall_status,
                "summary": {
                    "total_requested": summary["total_requested"],
                    "completed": summary["completed"],
                    "skipped": summary["skipped"],
                    "failed": summary["failed"],
                    "total_bytes_downloaded": total_bytes,
                    "elapsed_seconds": elapsed_sec,
                },
                "queue_items": [item.to_dict() for item in self.items],
                "failed_items": failed_items
            }

        try:
            self.broadcast_callback(payload)
        except Exception:
            pass

    def get_current_item(self) -> Optional[QueueItem]:
        for item in self.items:
            if item.status == DownloadStatus.DOWNLOADING:
                return item
        return None

    def get_summary(self) -> Dict[str, int]:
        total = len(self.items)
        completed = sum(1 for i in self.items if i.status == DownloadStatus.COMPLETED)
        downloading = sum(1 for i in self.items if i.status == DownloadStatus.DOWNLOADING)
        waiting = sum(1 for i in self.items if i.status == DownloadStatus.WAITING)
        failed = sum(1 for i in self.items if i.status == DownloadStatus.FAILED)
        skipped = sum(1 for i in self.items if i.status == DownloadStatus.SKIPPED)
        cancelled = sum(1 for i in self.items if i.status == DownloadStatus.CANCELLED)

        return {
            "total_requested": total,
            "completed": completed,
            "downloading": downloading,
            "waiting": waiting,
            "failed": failed,
            "skipped": skipped,
            "cancelled": cancelled
        }

    def get_status_response(self) -> Dict[str, Any]:
        """Builds full status payload matching GET /api/download/status."""
        with self._lock:
            current = self.get_current_item()
            summary = self.get_summary()

            return {
                "queue_id": self.queue_id,
                "overall_status": self.overall_status,
                "current_video_index": current.playlist_index if current else 0,
                "current_video_id": current.video_id if current else "",
                "current_video_title": current.title if current else "",
                "current_video_progress": current.progress.to_dict() if current else {
                    "percentage": 0.0,
                    "bytes_downloaded": 0,
                    "total_bytes": 0,
                    "speed_mbps": 0.0,
                    "eta_seconds": 0
                },
                "queue_items": [item.to_dict() for item in self.items],
                "summary": summary
            }

    def save_state(self):
        """Persists current queue state to JSON file."""
        try:
            QUEUE_STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
            state = {
                "queue_id": self.queue_id,
                "overall_status": self.overall_status,
                "download_folder": self.download_folder,
                "existing_file_policy": self.existing_file_policy.value if isinstance(self.existing_file_policy, ExistingFilePolicy) else self.existing_file_policy,
                "items": [item.to_dict() for item in self.items],
            }
            with open(QUEUE_STATE_FILE, "w", encoding="utf-8") as f:
                json.dump(state, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to persist queue state: {e}")

    def load_state(self):
        """Loads persisted state from JSON file if available."""
        if not QUEUE_STATE_FILE.exists():
            return
        try:
            with open(QUEUE_STATE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.queue_id = data.get("queue_id", self.queue_id)
            self.overall_status = data.get("overall_status", "idle")
            self.download_folder = data.get("download_folder", "")
            raw_policy = data.get("existing_file_policy", "skip")
            try:
                self.existing_file_policy = ExistingFilePolicy(raw_policy)
            except ValueError:
                self.existing_file_policy = ExistingFilePolicy.SKIP

            self.items = [QueueItem.from_dict(item_dict) for item_dict in data.get("items", [])]

            # If persisted state was actively downloading when the server shut down or crashed,
            # reset overall status to paused and any in-progress item back to waiting.
            if self.overall_status == "downloading":
                self.overall_status = "paused"
                for item in self.items:
                    if item.status == DownloadStatus.DOWNLOADING:
                        item.status = DownloadStatus.WAITING

            logger.info(f"Loaded persisted queue state: {len(self.items)} items.")
        except Exception as e:
            logger.error(f"Failed to load queue state: {e}")


queue_manager = QueueManager()
