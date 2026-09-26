from enum import Enum


class DownloadStatus(str, Enum):
    WAITING = "waiting"
    DOWNLOADING = "downloading"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"
    CANCELLED = "cancelled"
    PAUSED = "paused"


class ExistingFilePolicy(str, Enum):
    SKIP = "skip"
    OVERWRITE = "overwrite"
    ASK = "ask"


class NamingMode(str, Enum):
    INDEX_TITLE = "index_title"  # 001 - Title.mp4
    TITLE_ONLY = "title_only"    # Title.mp4
    INDEX_ONLY = "index_only"    # 001.mp4
    CUSTOM = "custom"            # Custom template format
