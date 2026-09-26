import os
from pathlib import Path
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status

from .schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    StartDownloadRequest,
    StartDownloadResponse,
    QueueActionRequest,
    FolderSelectRequest,
    FolderSelectResponse,
    OpenFolderRequest,
    HealthResponse,
)
from ..services.youtube_service import youtube_service
from ..services.ffmpeg_service import ffmpeg_service
from ..services.filesystem_service import validate_download_directory, open_folder_in_explorer
from ..downloader.queue_manager import queue_manager
from ..models.enums import ExistingFilePolicy
from ..utils.logger import logger
from ..utils.subprocess_runner import run_command_safe
from ..config import DEFAULT_DOWNLOAD_DIR

router = APIRouter(prefix="/api")


@router.get("/health", response_model=HealthResponse)
def health_check():
    """Returns system status, FFmpeg installation, and version."""
    ff_info = ffmpeg_service.get_version_info()
    return HealthResponse(
        status="ok",
        ffmpeg_installed=ff_info["installed"],
        ffmpeg_version=ff_info["version"],
        version="1.0.0"
    )


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze_url(request: AnalyzeRequest):
    """Analyzes a YouTube video or playlist URL and extracts metadata."""
    result = youtube_service.analyze_url(request.url)
    if not result.get("success", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": result.get("error", "INVALID_URL"),
                "message": result.get("message", "Failed to analyze URL")
            }
        )
    return result


@router.post("/download/start", response_model=StartDownloadResponse)
def start_download(request: StartDownloadRequest):
    """Initializes and begins downloading the requested video queue."""
    if not request.videos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "NO_VIDEOS", "message": "No videos provided in download request."}
        )

    # Validate destination directory
    val = validate_download_directory(request.download_folder)
    if not val["valid"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "INVALID_DIRECTORY", "message": val["error"]}
        )

    try:
        policy = ExistingFilePolicy(request.existing_file_policy)
    except ValueError:
        policy = ExistingFilePolicy.SKIP

    # Convert request items to dictionaries
    items_data = [v.model_dump() for v in request.videos]

    # Calculate estimated total size
    total_est = sum(v.get("estimated_size_mb", 50) for v in items_data)

    queue_id = queue_manager.start_queue(
        items=items_data,
        download_folder=val["path"],
        existing_file_policy=policy
    )

    return StartDownloadResponse(
        queue_id=queue_id,
        status="started",
        total_videos=len(items_data),
        estimated_total_size_mb=total_est
    )


@router.get("/download/status")
def get_download_status():
    """Returns real-time queue status, current video progress, and summary."""
    return queue_manager.get_status_response()


@router.post("/download/pause")
def pause_download(request: QueueActionRequest):
    """Pauses the download queue."""
    paused = queue_manager.pause()
    return {
        "status": "paused" if paused else queue_manager.overall_status,
        "message": "Download paused. Can be resumed."
    }


@router.post("/download/resume")
def resume_download(request: QueueActionRequest):
    """Resumes the download queue."""
    resumed = queue_manager.resume()
    return {
        "status": "resumed" if resumed else queue_manager.overall_status,
        "message": "Download resumed."
    }


@router.post("/download/cancel")
def cancel_current_video(request: QueueActionRequest):
    """Cancels the current video and skips to the next video."""
    res = queue_manager.cancel_current()
    return {
        "status": "cancelled",
        "cancelled_item": res["cancelled_item"],
        "next_item": res["next_item"]
    }


@router.post("/download/cancel-all")
def cancel_entire_queue(request: QueueActionRequest):
    """Cancels all pending and in-progress downloads."""
    count = queue_manager.cancel_all()
    return {
        "status": "queue_cancelled",
        "total_cancelled": count
    }


@router.post("/download/retry-failed")
def retry_failed_videos(request: QueueActionRequest):
    """Retries only the failed videos in the current queue."""
    new_qid = queue_manager.retry_failed()
    failed_count = sum(1 for i in queue_manager.items if i.status.value in ("waiting", "downloading"))
    return {
        "status": "retrying",
        "retry_count": failed_count,
        "new_queue_id": new_qid
    }


@router.post("/folder-select", response_model=FolderSelectResponse)
def select_folder(request: FolderSelectRequest):
    """Opens native Windows folder picker dialog via clean subprocess."""
    import sys
    from ..config import BASE_DIR
    pick_script = BASE_DIR / "utils" / "pick_folder.py"

    title = request.title or "Choose download folder"
    initial_dir = request.initial_folder if (request.initial_folder and Path(request.initial_folder).exists()) else str(DEFAULT_DOWNLOAD_DIR)
    rc, stdout, stderr = run_command_safe(
        [sys.executable, str(pick_script), title, initial_dir],
        timeout_seconds=120
    )
    selected_dir = stdout.strip()

    if not selected_dir:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "USER_CANCELLED", "message": "User cancelled folder selection"}
        )

    val = validate_download_directory(selected_dir)
    if not val["valid"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "INVALID_DIRECTORY", "message": val["error"]}
        )

    return FolderSelectResponse(
        folder=val["path"],
        exists=True,
        writable=True,
        free_space_mb=val["free_space_mb"]
    )


@router.post("/folder-validate", response_model=FolderSelectResponse)
def validate_folder(request: OpenFolderRequest):
    """Validates any typed or pasted folder path and returns free disk space."""
    val = validate_download_directory(request.folder)
    if not val["valid"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "INVALID_DIRECTORY", "message": val["error"]}
        )
    return FolderSelectResponse(
        folder=val["path"],
        exists=True,
        writable=True,
        free_space_mb=val["free_space_mb"]
    )


@router.post("/folder-open")
def open_folder(request: OpenFolderRequest):
    """Opens the destination folder in Windows Explorer."""
    success = open_folder_in_explorer(request.folder)
    return {"success": success, "folder": request.folder}
