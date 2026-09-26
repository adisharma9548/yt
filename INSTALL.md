# Windows Installation & Setup Guide

## YouTube Downloader — Local Windows Web Application

This guide walks you through setting up and running the YouTube Downloader on any modern Windows system (Windows 10 / Windows 11).

---

## 1. Prerequisites

### A. Python 3.11+
1. Download Python from [python.org](https://www.python.org/downloads/).
2. Run the Windows installer.
3. **CRITICAL:** Check the box that says **"Add python.exe to PATH"** before clicking Install.
4. Verify by opening a new PowerShell window and running:
   ```powershell
   python --version
   pip --version
   ```

### B. Node.js & npm
1. Download the LTS installer from [nodejs.org](https://nodejs.org/).
2. Run the installer with default settings.
3. Verify in PowerShell:
   ```powershell
   node --version
   npm --version
   ```

### C. FFmpeg (Audio/Video Remuxing Engine)
FFmpeg is required to losslessly merge separate high-definition YouTube video streams with audio streams into standard MP4 files.

**Automatic Setup (Recommended):**
In PowerShell from the project root directory, run:
```powershell
python scripts/setup_ffmpeg.py
```
This script will detect if FFmpeg is already installed, or automatically download and configure the official portable Windows build for you.

---

## 2. Project Installation

### Step 1: Open PowerShell in Project Root
Navigate to the project directory:
```powershell
cd C:\Users\adish\Desktop\yt
```

### Step 2: Install Python Dependencies
```powershell
pip install -r requirements.txt
```
*Dependencies installed: `fastapi`, `uvicorn[standard]`, `yt-dlp`, `pydantic`, `websockets`, `python-multipart`, `httpx`, `pytest`.*

### Step 3: Install Frontend Dependencies
```powershell
cd frontend
npm install
npm run build
cd ..
```

---

## 3. Running the Application

### Option A: Using One-Click PowerShell Scripts

**Terminal 1 (Backend):**
```powershell
.\scripts\run_backend.ps1
```
*Starts the FastAPI backend at `http://127.0.0.1:8000`.*

**Terminal 2 (Frontend):**
```powershell
.\scripts\run_frontend.ps1
```
*Starts the Vite dev server at `http://localhost:5173`.*

---

### Option B: Manual Command Execution

**Terminal 1 — Backend:**
```powershell
cd C:\Users\adish\Desktop\yt
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 — Frontend:**
```powershell
cd C:\Users\adish\Desktop\yt\frontend
npm run dev
```

---

## 4. Opening the Application

Open your browser (Google Chrome, Microsoft Edge, or Firefox) and navigate to:
```
http://localhost:5173
```

The application is ready! You will see:
- Real-time FFmpeg detection status in the header
- URL input for public YouTube videos, shorts, or playlists
- Virtualized selection table with range syntax parsing
- Quality configuration with automatic fallback
- Native Windows folder browser dialog
- Live two-level progress streaming with MB/s speed and remaining time

---

## 5. Running the Automated Test Suite

To verify that all components, parsers, and endpoints are operating correctly:
```powershell
cd C:\Users\adish\Desktop\yt
python -m pytest tests/ -v
```

All 32 tests will run and pass, validating:
- YouTube domain & URL regex parsing
- Filename sanitization & Windows reserved names (CON, AUX, NUL)
- Selection range parser (`1-5, 10`, `all`, deduplication, out-of-range rejections)
- Queue manager sequential lifecycle & state persistence
- Download worker retry backoff & format fallback logic
- FastAPI REST endpoints & WebSocket contracts

---

## 6. Windows Troubleshooting

### "python: The term 'python' is not recognized"
- Python was installed without the "Add to PATH" option checked.
- Re-run the Python installer, select **Modify**, and check **"Add Python to environment variables"**. Restart PowerShell.

### "FFmpeg not found. Required for merging audio/video."
- Run `python scripts/setup_ffmpeg.py` from the project directory.
- Or download FFmpeg manually from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) and add its `bin/` directory to your Windows System Environment Variables `PATH`.

### "Port 8000 already in use"
- Another local process is using port 8000.
- Change the port in PowerShell before starting:
  ```powershell
  $env:APP_PORT=8001
  python -m uvicorn backend.main:app --port 8001
  ```
  *(Vite proxy or CORS will seamlessly adapt).*

### "Directory is not writable"
- Ensure your selected download folder is on an active drive where your Windows user account has write permissions (e.g. `C:\Users\<Name>\Downloads`).
