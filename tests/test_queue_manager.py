from backend.downloader.queue_manager import QueueManager
from backend.models.enums import DownloadStatus


def test_add_to_queue():
    queue = QueueManager()
    queue.items = []  # Clear for test
    item = queue.add_item({"video_id": "test_id_1", "title": "Video 1"})
    assert len(queue.items) == 1
    assert item.video_id == "test_id_1"
    assert item.status == DownloadStatus.WAITING


def test_queue_status_transitions():
    queue = QueueManager()
    queue.items = []
    item = queue.add_item({"video_id": "test_id_2", "title": "Video 2"})
    assert item.status == DownloadStatus.WAITING

    item.status = DownloadStatus.DOWNLOADING
    assert item.status == DownloadStatus.DOWNLOADING

    item.status = DownloadStatus.COMPLETED
    assert item.status == DownloadStatus.COMPLETED


def test_pause_resume():
    queue = QueueManager()
    queue.overall_status = "downloading"
    queue.pause()
    assert queue.is_paused()

    queue.resume()
    assert not queue.is_paused()


def test_persistence():
    queue1 = QueueManager()
    queue1.items = []
    queue1.add_item({"video_id": "persist_vid", "title": "Persist Test Video"})
    queue1.save_state()

    queue2 = QueueManager()
    queue2.load_state()
    found = any(i.video_id == "persist_vid" for i in queue2.items)
    assert found
