from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class AnalyzeRequest(BaseModel):
    url: str = Field(..., description="YouTube video or playlist URL")


class VideoInfo(BaseModel):
    index: int
    video_id: str
    title: str
    duration_seconds: int
    duration_formatted: str
    uploader: str
    available_qualities: List[str]
    quality_sizes: Dict[str, int] = Field(default_factory=dict)
    estimated_size_mb: int
    thumbnail_url: str
    url: str


class AnalyzeResponse(BaseModel):
    success: bool = True
    type: str
    playlist_id: Optional[str] = None
    playlist_title: Optional[str] = None
    playlist_uploader: Optional[str] = None
    video_count: int
    videos: List[VideoInfo]
    error: Optional[str] = None
    message: Optional[str] = None


class DownloadVideoItem(BaseModel):
    video_id: str
    index: int
    quality: str = "1080p"
    filename: str
    title: Optional[str] = None
    url: Optional[str] = None


class StartDownloadRequest(BaseModel):
    videos: List[DownloadVideoItem]
    download_folder: str
    existing_file_policy: str = "skip"  # skip, overwrite, ask


class StartDownloadResponse(BaseModel):
    queue_id: str
    status: str
    total_videos: int
    estimated_total_size_mb: int


class QueueActionRequest(BaseModel):
    queue_id: str
    scope: Optional[str] = "current"


class FolderSelectRequest(BaseModel):
    title: Optional[str] = "Choose download folder"
    initial_folder: Optional[str] = None


class FolderSelectResponse(BaseModel):
    folder: str
    exists: bool
    writable: bool
    free_space_mb: int


class OpenFolderRequest(BaseModel):
    folder: str


class HealthResponse(BaseModel):
    status: str
    ffmpeg_installed: bool
    ffmpeg_version: str
    version: str
