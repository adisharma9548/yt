import time
from typing import Callable, Optional, Dict, Any
from ..models.queue_item import QueueItem, DownloadProgress
from ..models.enums import DownloadStatus


class ProgressTracker:
    def __init__(self, broadcast_callback: Optional[Callable[[Dict[str, Any]], None]] = None):
        self.broadcast_callback = broadcast_callback
        self.last_emit_time = 0.0
        self.emit_interval = 0.5  # 500ms throttle

    def update_item_progress(
        self,
        item: QueueItem,
        bytes_downloaded: int,
        total_bytes: int,
        speed_bytes: Optional[float] = None,
        eta_seconds: Optional[int] = None,
        force_emit: bool = False
    ):
        """Updates item progress and emits throttled progress event."""
        item.progress.bytes_downloaded = bytes_downloaded
        item.progress.total_bytes = max(total_bytes, bytes_downloaded)

        if item.progress.total_bytes > 0:
            percentage = round((bytes_downloaded / item.progress.total_bytes) * 100, 1)
            item.progress.percentage = min(100.0, max(0.0, percentage))
        else:
            item.progress.percentage = 0.0

        if speed_bytes:
            item.progress.speed_mbps = round(speed_bytes / (1024 * 1024), 2)
        if eta_seconds is not None:
            item.progress.eta_seconds = max(0, int(eta_seconds))

        now = time.time()
        if force_emit or (now - self.last_emit_time >= self.emit_interval):
            self.last_emit_time = now
            self.emit_progress(item)

    def emit_progress(self, current_item: QueueItem, queue_summary: Optional[Dict[str, Any]] = None):
        """Dispatches real-time update event to WebSocket clients."""
        if not self.broadcast_callback:
            return

        payload = {
            "event_type": "progress_update",
            "current_video": {
                "index": current_item.playlist_index,
                "video_id": current_item.video_id,
                "title": current_item.title,
                "status": current_item.status.value,
                "percentage": current_item.progress.percentage,
                "bytes_downloaded": current_item.progress.bytes_downloaded,
                "total_bytes": current_item.progress.total_bytes,
                "speed_mbps": current_item.progress.speed_mbps,
                "eta_seconds": current_item.progress.eta_seconds,
            },
            "queue_summary": queue_summary or {}
        }
        try:
            self.broadcast_callback(payload)
        except Exception:
            pass
