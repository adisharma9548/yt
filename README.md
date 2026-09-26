# YouTube Downloader — Local Windows Web Application

> A production-ready local Windows web application for downloading public YouTube videos and playlists with real-time progress, automatic quality fallback, lossless FFmpeg stream merging, and a high-impact **Neo-Brutalist Editorial** UI.

---

## ⚡ Architecture

```
Browser (React 19 + TypeScript + Vite + Tailwind CSS)
    ↓ (HTTP REST + WebSocket live progress)
FastAPI Backend (Python 3.11+)
    ↓
Download Queue Manager (Sequential execution, persistence to JSON)
    ↓ (Metadata extraction & format filtering)
yt-dlp Library (Direct Python integration, progress hooks)
    ↓ (Audio/Video remuxing without re-encoding)
FFmpeg Subprocess (Safe execution with shell=False)
    ↓
Windows Filesystem (e.g. C:\Users\<Name>\Downloads\...)
```

---

## 🚀 Key Features

- **Direct yt-dlp Python Library Engine**: No fragile CLI subprocess scraping; direct programmatic access to video and playlist metadata.
- **Neo-Brutalist Editorial Aesthetic**: High-contrast black, white, and electric green (`#00FF66`), tactile chunky buttons, 3px-4px hard offset shadows (`shadow-brutal`), and oversized typography.
- **Virtualized High-Performance Playlist Table**: Uses `@tanstack/react-virtual` to render 100+ playlist entries at a steady 60fps with minimal DOM overhead.
- **Advanced Range & Syntax Selection Parser**:
  - Individual items: `1, 4, 7, 12`
  - Ranges: `1-20`
  - Mixed notation: `1, 4, 8-12, 20`
  - Keyword: `all`
  - Instant validation with clear human-readable error messages for 0, negative indices, or out-of-range bounds.
- **Quality Fallback Guarantee**: If requested resolution (e.g. 1080p) is unavailable, automatically downloads highest available stream (e.g. 720p) without throwing a fatal error.
- **Lossless Stream Merging**: Automatically combines separate DASH video and audio streams using FFmpeg (`-c:v copy -c:a aac -strict -2`) into a standard `.mp4` container.
- **Native Windows Folder Selection**: Integrates with Windows Explorer via Python's native dialog, validating write permissions and reporting real-time free disk space.
- **Two-Level Live Progress**:
  - **Level 1**: Current video percentage, speed in MB/s, ETA, and bytes downloaded.
  - **Level 2**: Overall queue progress, elapsed time, and total remaining time.
- **Queue Controls**: Pause, resume, skip current video, cancel all, and retry failed videos without re-downloading completed files.
- **Crash Recovery & State Persistence**: Queue state is persisted to disk in `.temp/queue_state.json` so the app resumes seamlessly across restarts.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.11+, FastAPI, Uvicorn, yt-dlp, Pydantic v2, WebSockets |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, @tanstack/react-virtual |
| **Media Remuxer**| FFmpeg (Windows build) |
| **Testing** | Pytest, FastAPI TestClient, Vitest / Vite build |

---

## 🏁 Quick Start

### 1. Install Dependencies
```powershell
# In project root:
pip install -r requirements.txt

# In frontend folder:
cd frontend
npm install
npm run build
cd ..
```

### 2. Start Application

**Using PowerShell Launchers:**
- Terminal 1: `.\scripts\run_backend.ps1`
- Terminal 2: `.\scripts\run_frontend.ps1`

Or manually:
```powershell
# Terminal 1:
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000

# Terminal 2:
cd frontend
npm run dev
```

### 3. Open Browser
Open **`http://localhost:5173`** to access the application.

---

## 🧪 Test Suite

Run the complete test suite covering all utility parsers, models, and endpoints:
```powershell
python -m pytest tests/ -v
```

Tests include:
- `test_selection_parser.py`: Selection syntax, ranges, deduplication, error handling.
- `test_filename_sanitizer.py`: Windows reserved words (CON, AUX, NUL), illegal characters, 255-char limit.
- `test_url_validator.py`: YouTube domain parsing, shorts, playlist IDs.
- `test_queue_manager.py`: State transitions, pause/resume, JSON persistence.
- `test_download_worker.py`: Quality fallback format strings, skip-existing policy.
- `test_api_endpoints.py`: `/api/health`, `/api/analyze`, `/api/download/start`, `/api/download/status`.

---

## 📖 API Documentation

The backend exposes an interactive OpenAPI Swagger UI at `http://127.0.0.1:8000/docs`.

### Key Endpoints:
- `GET /api/health` — System status, FFmpeg installation check, and version.
- `POST /api/analyze` — Parses YouTube URL and returns video list with available resolutions and estimated file sizes.
- `POST /api/download/start` — Initializes sequential download queue.
- `GET /api/download/status` — Returns current video progress and queue items.
- `POST /api/download/pause` — Pauses current active queue.
- `POST /api/download/resume` — Resumes paused queue.
- `POST /api/download/cancel` — Cancels current item and skips to next.
- `POST /api/download/cancel-all` — Cancels entire remaining queue.
- `POST /api/download/retry-failed` — Re-enqueues only failed items.
- `POST /api/folder-select` — Opens native Windows folder browser dialog.
- `POST /api/folder-open` — Opens Windows Explorer at destination directory.
- `WS /ws` — WebSocket real-time progress broadcast at 500ms intervals.
