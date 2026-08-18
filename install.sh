#!/usr/bin/env bash
# ==============================================================================
# DownloadKan — All-In-One 1-Line Installer for Termux (Android) & Linux / macOS
# Usage: curl -fsSL https://raw.githubusercontent.com/.../install.sh | bash
# ==============================================================================

set -e

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

# 1. DETEKSI LINGKUNGAN
echo -e "${YELLOW}[1/5] Mendeteksi lingkungan sistem...${NC}"
IS_TERMUX=false
if [ -d "/data/data/com.termux" ]; then
    IS_TERMUX=true
    echo -e "${GREEN}✓ Terdeteksi Termux di Android.${NC}"
else
    echo -e "${GREEN}✓ Terdeteksi sistem Linux / macOS.${NC}"
fi

# 2. INSTALL DEPENDENSI SISTEM
echo -e "${YELLOW}[2/5] Memasang paket sistem (Python, FFmpeg, Aria2, Git)...${NC}"
if [ "$IS_TERMUX" = true ]; then
    pkg update -y || true
    pkg install -y python ffmpeg aria2 git curl nodejs
    
    # Setup Termux Storage Permission jika belum
    if [ ! -d "$HOME/storage" ]; then
        echo -e "${CYAN}Mengatur izin penyimpanan Android... Silakan izinkan popup di layar HP.${NC}"
        termux-setup-storage || true
    fi
else
    if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update -y
        sudo apt-get install -y python3 python3-pip ffmpeg aria2 git curl
    elif command -v pacman >/dev/null 2>&1; then
        sudo pacman -Sy --noconfirm python python-pip ffmpeg aria2 git curl
    elif command -v brew >/dev/null 2>&1; then
        brew install python ffmpeg aria2 git curl
    fi
fi

# 3. SETUP REPOSITORY
echo -e "${YELLOW}[3/5] Mengunduh core DownloadKan...${NC}"
if [ -d "$INSTALL_DIR" ]; then
    cd "$INSTALL_DIR"
    git pull || true
else
    git clone https://github.com/NaufalSaputraa/DownloadKan.git "$INSTALL_DIR" || mkdir -p "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# 4. DEPENDENSI PYTHON (Aman di Termux & Desktop)
echo -e "${YELLOW}[4/5] Memasang library Python (FastAPI, uvicorn, yt-dlp, mutagen, rich)...${NC}"
CORE_PKGS="fastapi uvicorn yt-dlp mutagen rich aiohttp websockets requests beautifulsoup4"

if [ "$IS_TERMUX" = true ]; then
    # Di Termux: gunakan pure-python uvicorn (tanpa [standard] agar tidak butuh rust toolchain / maturin)
    python3 -m pip install --no-cache-dir --break-system-packages $CORE_PKGS || {
        echo -e "${YELLOW}Mencoba instalasi dependensi per paket...${NC}"
        for p in $CORE_PKGS; do
            python3 -m pip install --no-cache-dir --break-system-packages "$p" || true
        done
    }
else
    python3 -m pip install --upgrade pip || true
    python3 -m pip install --no-cache-dir $CORE_PKGS || {
        for p in $CORE_PKGS; do
            python3 -m pip install --no-cache-dir "$p" || true
        done
    }
fi

# 5. MEMBUAT EXECUTABLE GLOBAL (downloadkan)
echo -e "${YELLOW}[5/5] Memasang shortcut perintah 'downloadkan'...${NC}"

BIN_DIR="/usr/local/bin"
if [ "$IS_TERMUX" = true ]; then
    BIN_DIR="$PREFIX/bin"
elif [ ! -w "/usr/local/bin" ]; then
    BIN_DIR="$HOME/.local/bin"
    mkdir -p "$BIN_DIR"
fi

cat << EOF > "$BIN_DIR/downloadkan"
#!/usr/bin/env bash
python3 "$INSTALL_DIR/cli.py" "\$@"
EOF
chmod +x "$BIN_DIR/downloadkan"

# 6. INTEGRASI ANDROID SHARE MENU (TERMUX URL OPENER)
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
echo -e " 🚀 Contoh perintah di terminal:\n"
echo -e "     ${CYAN}downloadkan${NC}               -> Masuk ke Dashboard Interaktif Rich TUI"
echo -e "     ${CYAN}downloadkan get <URL>${NC}         -> Unduh video/audio langsung (YouTube, TikTok, dll)"
echo -e "     ${CYAN}downloadkan torrent <query>${NC}   -> Cari & unduh torrent via terminal"
echo -e "     ${CYAN}downloadkan music <query>${NC}     -> Cari musik & unduh Hi-Res FLAC/MP3"
echo -e "     ${CYAN}downloadkan batch <file>${NC}      -> Unduh antrean URL dari file .txt"
echo -e "     ${CYAN}downloadkan doctor${NC}            -> Cek status dependensi sistem"
echo -e "     ${CYAN}downloadkan server${NC}            -> Jalankan server lokal & buka Web UI\n"

if [ "$IS_TERMUX" = true ]; then
    echo -e " 📂 File unduhan otomatis tersimpan di folder ${CYAN}/sdcard/Download/DownloadKan/${NC}"
fi
