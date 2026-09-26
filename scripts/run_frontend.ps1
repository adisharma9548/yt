# PowerShell script to launch Vite React frontend dev server
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$FrontendDir = Join-Path $ProjectRoot "frontend"

Set-Location $FrontendDir

Write-Host "=============================================" -ForegroundColor Green
Write-Host " STARTING YOUTUBE DOWNLOADER FRONTEND (VITE) " -ForegroundColor Black -BackgroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host "Frontend directory: $FrontendDir"
Write-Host "`nLaunching Vite on http://localhost:5173..." -ForegroundColor Cyan

npm run dev
