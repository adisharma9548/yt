from dataclasses import dataclass, field, asdict
from typing import Optional, Dict, Any
from .enums import DownloadStatus


@dataclass
class DownloadProgress:
    bytes_downloaded: int = 0
    total_bytes: int = 0
    percentage: float = 0.0
    speed_mbps: float = 0.0
    eta_seconds: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class QueueItem:
    id: str
    playlist_index: int
    video_id: str
    title: str
    url: str
    status: DownloadStatus = DownloadStatus.WAITING
    quality: str = "best"
    filename: str = ""
    download_folder: str = ""
    progress: DownloadProgress = field(default_factory=DownloadProgress)
    error: Optional[str] = None
    error_type: Optional[str] = None
    error_details: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data["status"] = self.status.value if isinstance(self.status, DownloadStatus) else self.status
        data["progress"] = self.progress.to_dict() if isinstance(self.progress, DownloadProgress) else self.progress
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "QueueItem":
        prog_data = data.get("progress", {})
        progress = DownloadProgress(
            bytes_downloaded=prog_data.get("bytes_downloaded", 0),
            total_bytes=prog_data.get("total_bytes", 0),
            percentage=prog_data.get("percentage", 0.0),
            speed_mbps=prog_data.get("speed_mbps", 0.0),
            eta_seconds=prog_data.get("eta_seconds", 0),
        )
        status_raw = data.get("status", DownloadStatus.WAITING)
        try:
            status = DownloadStatus(status_raw)
        except ValueError:
            status = DownloadStatus.WAITING

        return cls(
            id=data["id"],
            playlist_index=data.get("playlist_index", 1),
            video_id=data.get("video_id", ""),
            title=data.get("title", ""),
            url=data.get("url", ""),
            status=status,
            quality=data.get("quality", "best"),
            filename=data.get("filename", ""),
            download_folder=data.get("download_folder", ""),
            progress=progress,
            error=data.get("error"),
            error_type=data.get("error_type"),
            error_details=data.get("error_details"),
            retry_count=data.get("retry_count", 0),
            max_retries=data.get("max_retries", 3),
        )
