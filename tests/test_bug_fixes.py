import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.youtube_service import youtube_service
from backend.services.ffmpeg_service import ffmpeg_service
from backend.downloader.queue_manager import QueueManager
from backend.models.enums import DownloadStatus, ExistingFilePolicy
from backend.utils.url_validator import (
    extract_video_id,
    extract_playlist_id,
    parse_youtube_url,
)
from backend.utils.filename_sanitizer import sanitize_filename

client = TestClient(app)


def test_single_video_url_format():
    """Verify single video URL does not contain errant 'f' prefix before video ID."""
    raw_info = {
        "id": "dQw4w9WgXcQ",
        "title": "Never Gonna Give You Up",
        "uploader": "Rick Astley",
        "duration": 212,
        "formats": []
    }
    processed = youtube_service._process_single_video(raw_info, "https://youtube.com/watch?v=dQw4w9WgXcQ")
    video = processed["videos"][0]
    assert video["url"] == "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    assert "v=fdQw" not in video["url"]


def test_live_url_extraction():
    """Verify /live/ URLs are properly recognized and video ID extracted."""
    live_url = "https://www.youtube.com/live/dQw4w9WgXcQ"
    assert extract_video_id(live_url) == "dQw4w9WgXcQ"
    parsed = parse_youtube_url(live_url)
    assert parsed["valid"] is True
    assert parsed["type"] == "video"
    assert parsed["video_id"] == "dQw4w9WgXcQ"


def test_short_playlist_ids():
    """Verify short playlist IDs (e.g. WL, LL, RD mixes) are extracted."""
    assert extract_playlist_id("https://www.youtube.com/playlist?list=WL") == "WL"
    assert extract_playlist_id("https://www.youtube.com/playlist?list=LL") == "LL"
    assert extract_playlist_id("https://www.youtube.com/playlist?list=RDCLAK5uy_k") == "RDCLAK5uy_k"


def test_filename_sanitization_in_queue_manager():
    """Verify QueueManager.add_item sanitizes filenames with illegal Windows chars."""
    qm = QueueManager()
    qm.items = []
    item = qm.add_item({
        "title": "Video: The <Best> *Show*?",
        "video_id": "abc12345678",
        "filename": "001 - Video: The <Best> *Show*?.mp4"
    })
    assert ":" not in item.filename
    assert "<" not in item.filename
    assert ">" not in item.filename
    assert "?" not in item.filename
    assert "*" not in item.filename
    assert item.filename.endswith(".mp4")


def test_health_check_returns_default_folder():
    """Verify /api/health returns default_download_dir and free_space_mb."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "default_download_dir" in data
    assert data["default_download_dir"] is not None
    assert "free_space_mb" in data
    assert data["free_space_mb"] is not None


def test_crash_recovery_in_load_state(tmp_path, monkeypatch):
    """Verify that a crashed state with 'downloading' recovers to 'paused' and WAITING."""
    import sys
    import backend.downloader.queue_manager
    qm_mod = sys.modules["backend.downloader.queue_manager"]
    test_state_file = tmp_path / "test_queue_state.json"
    monkeypatch.setattr(qm_mod, "QUEUE_STATE_FILE", test_state_file)

    # Simulate crashed persisted state
    import json
    crashed_data = {
        "queue_id": "q_crash_test",
        "overall_status": "downloading",
        "download_folder": str(tmp_path),
        "existing_file_policy": "skip",
        "items": [
            {
                "id": "v1",
                "playlist_index": 1,
                "video_id": "vid1",
                "title": "Video 1",
                "url": "https://youtube.com/watch?v=vid1",
                "status": "downloading",
                "quality": "1080p",
                "filename": "001 - Video 1.mp4",
                "download_folder": str(tmp_path),
                "progress": {"percentage": 45.0, "bytes_downloaded": 1000, "total_bytes": 2200}
            }
        ]
    }
    test_state_file.write_text(json.dumps(crashed_data), encoding="utf-8")

    qm = QueueManager()
    qm.load_state()

    assert qm.overall_status == "paused"
    assert qm.items[0].status == DownloadStatus.WAITING


def test_playlist_contiguous_indices_with_deleted_entries():
    """Verify playlist entries produce contiguous 1..N indices even if some entries are None."""
    raw_playlist = {
        "id": "PL12345",
        "title": "Test Playlist",
        "uploader": "Test Channel",
        "entries": [
            None,  # deleted video
            {"id": "v1", "title": "First Valid", "duration": 120},
            None,  # private video
            {"id": "v2", "title": "Second Valid", "duration": 180},
        ]
    }
    res = youtube_service._process_playlist(raw_playlist, "https://youtube.com/playlist?list=PL12345")
    assert res["video_count"] == 2
    assert res["videos"][0]["index"] == 1
    assert res["videos"][1]["index"] == 2


def test_best_available_size_mapping():
    """Verify 'Best Available' is mapped in sizes for both playlist and single video."""
    raw_info = {
        "id": "abc12345678",
        "title": "Test Single",
        "duration": 60,
        "formats": []
    }
    res_single = youtube_service._process_single_video(raw_info, "https://youtube.com/watch?v=abc12345678")
    assert "Best Available" in res_single["videos"][0]["quality_sizes"]

    raw_playlist = {
        "id": "PL12345",
        "title": "Test Playlist",
        "entries": [raw_info]
    }
    res_pl = youtube_service._process_playlist(raw_playlist, "https://youtube.com/playlist?list=PL12345")
    assert "Best Available" in res_pl["videos"][0]["quality_sizes"]
