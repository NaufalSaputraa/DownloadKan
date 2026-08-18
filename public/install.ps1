# ==============================================================================
# DownloadKan — All-In-One 1-Line Installer for Windows (PowerShell)
# Usage: irm https://raw.githubusercontent.com/NaufalSaputraa/DownloadKan/main/install.ps1 | iex
# ==============================================================================

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "  ____                      _                 _  __            " -ForegroundColor Cyan
Write-Host " |  _ \  _____      ___ __ | | ___   __ _  __| |/ /____ _ _ __  " -ForegroundColor Cyan
Write-Host " | | | |/ _ \ \ /\ / / '_ \| |/ _ \ / _` |/ _` | ' / _` | '_ \ " -ForegroundColor Cyan
Write-Host " | |_| | (_) \ V  V /| | | | | (_) | (_| | (_| | . \ (_| | | | |" -ForegroundColor Cyan
Write-Host " |____/ \___/ \_/\_/ |_| |_|_|\___/ \__,_|\__,_|_|\_\__,_|_| |_|" -ForegroundColor Cyan
Write-Host "             All-In-One Installer for Windows" -ForegroundColor White
Write-Host ""

$InstallDir = "$HOME\.downloadkan"

# 1. CEK / INSTALL DEPENDENSI SISTEM (Python, FFmpeg, aria2, Git)
Write-Host "[1/4] Memeriksa dependensi sistem..." -ForegroundColor Yellow

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "Python belum terpasang. Memasang Python via winget..." -ForegroundColor Cyan
    winget install Python.Python.3.12 --accept-package-agreements --accept-source-agreements
}

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    Write-Host "FFmpeg belum terpasang. Memasang FFmpeg via winget..." -ForegroundColor Cyan
    winget install Gyan.FFmpeg --accept-package-agreements --accept-source-agreements
}

if (-not (Get-Command aria2c -ErrorAction SilentlyContinue)) {
    Write-Host "aria2 belum terpasang. Memasang aria2 via winget..." -ForegroundColor Cyan
    winget install aria2.aria2 --accept-package-agreements --accept-source-agreements
}

# 2. SETUP REPOSITORY
Write-Host "[2/4] Mengunduh core DownloadKan..." -ForegroundColor Yellow
if (Test-Path $InstallDir) {
    Set-Location $InstallDir
    if (Get-Command git -ErrorAction SilentlyContinue) {
        git pull 2>$null
    }
} else {
    if (Get-Command git -ErrorAction SilentlyContinue) {
        git clone https://github.com/NaufalSaputraa/DownloadKan.git $InstallDir
    } else {
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
        Invoke-WebRequest -Uri "https://github.com/NaufalSaputraa/DownloadKan/archive/refs/heads/main.zip" -OutFile "$HOME\downloadkan.zip"
        Expand-Archive -Path "$HOME\downloadkan.zip" -DestinationPath "$HOME\dk_temp" -Force
        Copy-Item -Path "$HOME\dk_temp\DownloadKan-main\*" -Destination $InstallDir -Recurse -Force
        Remove-Item "$HOME\downloadkan.zip", "$HOME\dk_temp" -Recurse -Force
    }
    Set-Location $InstallDir
}

# 3. INSTALL DEPENDENSI PYTHON
Write-Host "[3/4] Memasang library Python (FastAPI, uvicorn, yt-dlp, mutagen, rich)..." -ForegroundColor Yellow
$packages = @("fastapi", "uvicorn", "yt-dlp", "mutagen", "rich", "aiohttp", "websockets", "requests", "beautifulsoup4")
python -m pip install --no-cache-dir $packages

# 4. MEMBUAT SHORTCUT PERINTAH 'downloadkan'
Write-Host "[4/4] Memasang shortcut perintah 'downloadkan'..." -ForegroundColor Yellow
$BinDir = "$HOME\AppData\Local\Microsoft\WindowsApps"
if (-not (Test-Path $BinDir)) {
    $BinDir = "$HOME\bin"
    New-Item -ItemType Directory -Path $BinDir -Force | Out-Null
    [Environment]::SetEnvironmentVariable("Path", $env:Path + ";$BinDir", "User")
}

$CmdContent = "@echo off`r`npython `"$InstallDir\cli.py`" %*"
Set-Content -Path "$BinDir\downloadkan.cmd" -Value $CmdContent -Encoding ASCII

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Green
Write-Host " INSTALASI DOWNLOADKAN SELESAI & SIAP DIGUNAKAN! " -ForegroundColor Green
Write-Host "===============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Cukup ketik perintah di terminal / PowerShell:" -ForegroundColor White
Write-Host "  downloadkan        -> Buka Web UI di browser Anda" -ForegroundColor Cyan
Write-Host "  downloadkan <URL>  -> Unduh langsung lewat terminal" -ForegroundColor Cyan
Write-Host ""
Write-Host "File unduhan otomatis tersimpan di folder:" -ForegroundColor White
Write-Host "  $HOME\Downloads\DownloadKan\" -ForegroundColor Yellow
Write-Host ""
