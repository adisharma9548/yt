from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "ffmpeg_installed" in data
    assert data["version"] == "1.0.0"


def test_analyze_invalid_url():
    response = client.post("/api/analyze", json={
        "url": "https://example.com/video"
    })
    assert response.status_code == 400
    data = response.json()
    assert "detail" in data
    assert data["detail"]["error"] == "INVALID_URL"


def test_download_start_and_status(tmp_path):
    response = client.post("/api/download/start", json={
        "videos": [
            {
                "video_id": "test_v1",
                "index": 1,
                "quality": "1080p",
                "filename": "001 - Test 1.mp4",
                "title": "Test Video 1",
                "url": "https://youtube.com/watch?v=test_v1"
            }
        ],
        "download_folder": str(tmp_path),
        "existing_file_policy": "skip"
    })
    assert response.status_code == 200
    data = response.json()
    assert "queue_id" in data
    assert data["status"] == "started"
    assert data["total_videos"] == 1

    # Check status endpoint
    status_resp = client.get("/api/download/status")
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert "queue_items" in status_data
    assert "summary" in status_data


def test_folder_validate(tmp_path):
    response = client.post("/api/folder-validate", json={"folder": str(tmp_path)})
    assert response.status_code == 200
    data = response.json()
    assert data["exists"] is True
    assert data["writable"] is True
    assert data["free_space_mb"] > 0


def test_folder_validate_invalid():
    response = client.post("/api/folder-validate", json={"folder": "Z:\\NonExistentDrive_XYZ_123\\Subfolder"})
    assert response.status_code == 400
    data = response.json()
    assert "detail" in data
