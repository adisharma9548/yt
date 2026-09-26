import os
import shutil
from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
TEMP_DIR = PROJECT_ROOT / ".temp"
DEFAULT_DOWNLOAD_DIR = Path.home() / "Downloads"
QUEUE_STATE_FILE = TEMP_DIR / "queue_state.json"

# Ensure temp directory exists
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# Server Config
HOST = os.getenv("APP_HOST", "127.0.0.1")
PORT = int(os.getenv("APP_PORT", 8000))
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Downloader Settings
CONCURRENT_DOWNLOADS = 1  # Sequential processing for v1.0
MAX_RETRIES = 3
RETRY_BACKOFF_SECONDS = [5, 15, 45]
PROGRESS_EMIT_INTERVAL_SECONDS = 0.5

# FFmpeg detection
FFMPEG_PATH = shutil.which("ffmpeg")
