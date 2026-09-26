import threading
from backend.downloader.download_worker import DownloadWorker
from backend.downloader.progress_tracker import ProgressTracker
from backend.services.youtube_service import youtube_service
from backend.models.queue_item import QueueItem
from backend.models.enums import DownloadStatus, ExistingFilePolicy


def test_quality_fallback_format_selector():
    # Verify format selector logic handles 1080p, 720p, 4K, and best
    spec_1080 = youtube_service.get_yt_dlp_format_selector("1080p")
    assert "height<=1080" in spec_1080

    spec_720 = youtube_service.get_yt_dlp_format_selector("720p")
    assert "height<=720" in spec_720

    spec_best = youtube_service.get_yt_dlp_format_selector("Best Available")
    assert "bestvideo" in spec_best


def test_existing_file_skip(tmp_path):
    tracker = ProgressTracker()
    worker = DownloadWorker(progress_tracker=tracker)

    # Create dummy existing file
    existing_file = tmp_path / "001 - Test.mp4"
    existing_file.write_bytes(b"dummy video content")

    item = QueueItem(
        id="item_skip",
        playlist_index=1,
        video_id="skip_vid",
        title="Test",
        url="https://youtube.com/watch?v=skip_vid",
        filename="001 - Test.mp4",
        download_folder=str(tmp_path)
    )

    result = worker.download_item(item, existing_file_policy=ExistingFilePolicy.SKIP)
    assert result is True
    assert item.status == DownloadStatus.SKIPPED
