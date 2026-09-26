# PowerShell script to launch FastAPI backend server
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot

Write-Host "=============================================" -ForegroundColor Green
Write-Host " STARTING YOUTUBE DOWNLOADER BACKEND         " -ForegroundColor Black -BackgroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host "Project root: $ProjectRoot"
Write-Host "Checking FFmpeg..."

python scripts/setup_ffmpeg.py

Write-Host "`nLaunching FastAPI backend on http://127.0.0.1:8000..." -ForegroundColor Cyan
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
