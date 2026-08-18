#!/usr/bin/env bash
# ==============================================================================
# DownloadKan — All-In-One 1-Line Universal Installer
# Compatible with: Android (Termux), Linux (Debian, Ubuntu, Arch, Fedora, Alpine), macOS
# Usage: curl -fsSL https://raw.githubusercontent.com/NaufalSaputraa/DownloadKan/main/install.sh | bash
# ==============================================================================

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
cat << "EOF"
  ____                      _                 _  __            
 |  _ \  _____      ___ __ | | ___   __ _  __| |/ /____ _ _ __  
 | | | |/ _ \ \ /\ / / '_ \| |/ _ \ / _` |/ _` | ' / _` | '_ \ 
 | |_| | (_) \ V  V /| | | | | (_) | (_| | (_| | . \ (_| | | | |
 |____/ \___/ \_/\_/ |_| |_|_|\___/ \__,_|\__,_|_|\_\__,_|_| |_|
            All-In-One Installer for Mobile & Desktop
EOF
echo -e "${NC}"

INSTALL_DIR="$HOME/.downloadkan"

# 1. DETEKSI LINGKUNGAN SISTEM
echo -e "${YELLOW}[1/5] Mendeteksi lingkungan sistem...${NC}"
IS_TERMUX=false
if [ -d "/data/data/com.termux" ] || [ -n "$TERMUX_VERSION" ]; then
    IS_TERMUX=true
    echo -e "${GREEN}✓ Terdeteksi Termux di Android.${NC}"
elif [ "$(uname)" = "Darwin" ]; then
    echo -e "${GREEN}✓ Terdeteksi sistem macOS ($(uname -m)).${NC}"
else
    echo -e "${GREEN}✓ Terdeteksi sistem Linux ($(uname -m)).${NC}"
fi

# 2. PASANG PAKET SISTEM NATIVE (Python, FFmpeg, Aria2, Git, Curl)
echo -e "${YELLOW}[2/5] Memasang paket sistem native (Python, FFmpeg, Aria2, Git)...${NC}"

if [ "$IS_TERMUX" = true ]; then
    pkg update -y 2>/dev/null || true
    pkg install -y python python-pip ffmpeg aria2 git curl nodejs 2>/dev/null || true
    
    # Izin penyimpanan Android
    if [ ! -d "$HOME/storage" ]; then
        echo -e "${CYAN}Mengatur izin penyimpanan Android... Silakan 'Allow' jika muncul dialog di layar.${NC}"
        termux-setup-storage 2>/dev/null || true
    fi
else
    if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update -y 2>/dev/null || true
        sudo apt-get install -y python3 python3-pip ffmpeg aria2 git curl 2>/dev/null || true
    elif command -v pacman >/dev/null 2>&1; then
        sudo pacman -Sy --noconfirm python python-pip ffmpeg aria2 git curl 2>/dev/null || true
    elif command -v dnf >/dev/null 2>&1; then
        sudo dnf install -y python3 python3-pip ffmpeg aria2 git curl 2>/dev/null || true
    elif command -v apk >/dev/null 2>&1; then
        apk add --no-cache python3 py3-pip ffmpeg aria2 git curl 2>/dev/null || true
    elif command -v brew >/dev/null 2>&1; then
        brew install python ffmpeg aria2 git curl 2>/dev/null || true
    fi
fi

# 3. SETUP REPOSITORY CORE DOWNLOADKAN
echo -e "${YELLOW}[3/5] Mengunduh core DownloadKan...${NC}"
if [ -d "$INSTALL_DIR/.git" ]; then
    cd "$INSTALL_DIR"
    git pull origin main 2>/dev/null || true
else
    mkdir -p "$INSTALL_DIR"
    if command -v git >/dev/null 2>&1; then
        git clone https://github.com/NaufalSaputraa/DownloadKan.git "$INSTALL_DIR" 2>/dev/null || {
            curl -fsSL "https://github.com/NaufalSaputraa/DownloadKan/archive/refs/heads/main.tar.gz" | tar -xz -C "$INSTALL_DIR" --strip-components=1 2>/dev/null || true
        }
    else
        curl -fsSL "https://github.com/NaufalSaputraa/DownloadKan/archive/refs/heads/main.tar.gz" | tar -xz -C "$INSTALL_DIR" --strip-components=1 2>/dev/null || true
    fi
    cd "$INSTALL_DIR"
fi

# 4. PASANG DEPENDENSI PYTHON (Resilient & Universal)
echo -e "${YELLOW}[4/5] Memasang dependensi Python (FastAPI, uvicorn, yt-dlp, mutagen, rich)...${NC}"
PYTHON_BIN="python3"
if ! command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="python"
fi

PIP_FLAGS="--no-cache-dir"
# Cek apakah butuh flag --break-system-packages (PEP 668 di Termux & modern Linux)
if $PYTHON_BIN -m pip help install 2>/dev/null | grep -q "break-system-packages"; then
    PIP_FLAGS="--no-cache-dir --break-system-packages"
fi

if [ "$IS_TERMUX" = true ]; then
    # Di Termux: wajib gunakan fastapi<0.100.0 dan pydantic<2.0.0 (Pure Python, bebas dependensi Rust)
    CORE_PKGS="pydantic<2.0.0 fastapi<0.100.0 uvicorn yt-dlp mutagen rich aiohttp websockets requests beautifulsoup4"
else
    CORE_PKGS="fastapi uvicorn yt-dlp mutagen rich aiohttp websockets requests beautifulsoup4"
fi

$PYTHON_BIN -m pip install $PIP_FLAGS $CORE_PKGS 2>/dev/null || {
    echo -e "${YELLOW}Memasang dependensi per modul untuk keandalan maksimal...${NC}"
    for p in $CORE_PKGS; do
        $PYTHON_BIN -m pip install $PIP_FLAGS "$p" 2>/dev/null || true
    done
}

# 5. MEMBUAT SHORTCUT PERINTAH GLOBAL 'downloadkan'
echo -e "${YELLOW}[5/5] Memasang shortcut perintah 'downloadkan'...${NC}"

BIN_DIR="/usr/local/bin"
if [ "$IS_TERMUX" = true ]; then
    BIN_DIR="$PREFIX/bin"
elif [ ! -w "/usr/local/bin" ]; then
    BIN_DIR="$HOME/.local/bin"
    mkdir -p "$BIN_DIR"
    export PATH="$PATH:$BIN_DIR"
fi

cat << EOF > "$BIN_DIR/downloadkan"
#!/usr/bin/env bash
$PYTHON_BIN "$INSTALL_DIR/cli.py" "\$@"
EOF
chmod +x "$BIN_DIR/downloadkan"

# 6. INTEGRASI ANDROID SHARE SHEET (Buka link di Spotify/TikTok -> Share -> Termux -> Langsung unduh)
if [ "$IS_TERMUX" = true ]; then
    mkdir -p "$HOME/bin"
    cat << "EOF" > "$HOME/bin/termux-url-opener"
#!/usr/bin/env bash
url="$1"
python3 "$HOME/.downloadkan/cli.py" "$url"
EOF
    chmod +x "$HOME/bin/termux-url-opener"
    echo -e "${GREEN}✓ Fitur Android Share Sheet terpasang! (Buka link di Spotify/TikTok -> Share -> Termux -> Langsung unduh).${NC}"
fi

echo -e "\n${GREEN}===============================================================${NC}"
echo -e "${GREEN} 🎉 INSTALASI DOWNLOADKAN SELESAI & SIAP DIGUNAKAN!${NC}"
echo -e "${GREEN}===============================================================${NC}"
echo -e " 🚀 Cukup ketik perintah di terminal:\n"
echo -e "     ${CYAN}downloadkan${NC}               -> Masuk ke Dashboard Interaktif Rich TUI"
echo -e "     ${CYAN}downloadkan get <URL>${NC}         -> Unduh video/audio langsung (YouTube, TikTok, IG, FB, dll)"
echo -e "     ${CYAN}downloadkan music <query>${NC}     -> Cari musik & unduh Hi-Res FLAC/MP3"
echo -e "     ${CYAN}downloadkan torrent <query>${NC}   -> Cari & unduh torrent via terminal"
echo -e "     ${CYAN}downloadkan server${NC}            -> Jalankan server lokal & buka Web UI browser"
echo -e "     ${CYAN}downloadkan doctor${NC}            -> Cek status dependensi sistem\n"

if [ "$IS_TERMUX" = true ]; then
    echo -e " 📂 File unduhan otomatis tersimpan di folder ${CYAN}/sdcard/Download/DownloadKan/${NC}\n"
else
    echo -e " 📂 File unduhan otomatis tersimpan di folder ${CYAN}$HOME/Downloads/DownloadKan/${NC}\n"
fi
