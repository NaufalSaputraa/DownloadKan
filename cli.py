#!/usr/bin/env python3
"""
DownloadKan CLI — Dual Mode Launcher & Direct Downloader
"""

import os
import sys
import subprocess
import webbrowser
import shutil
import time

BANNER = r"""
  ____                      _                 _  __            
 |  _ \  _____      ___ __ | | ___   __ _  __| |/ /____ _ _ __  
 | | | |/ _ \ \ /\ / / '_ \| |/ _ \ / _` |/ _` | ' / _` | '_ \ 
 | |_| | (_) \ V  V /| | | | | (_) | (_| | (_| | . \ (_| | | | |
 |____/ \___/ \_/\_/ |_| |_|_|\___/ \__,_|\__,_|_|\_\__,_|_| |_|
               Standalone Core - Video, FLAC, Torrent
"""

def open_url(url: str):
    """Buka browser di Termux (Android) atau Desktop OS."""
    if shutil.which("termux-open-url"):
        subprocess.run(["termux-open-url", url], check=False)
    else:
        webbrowser.open(url)

def run_server():
    """Jalankan local server + buka browser otomatis."""
    print(BANNER)
    print(" [*] Menjalankan DownloadKan Standalone Core...")
    print(" [*] Server lokal aktif di: http://127.0.0.1:8000")
    print(" [*] Membuka antarmuka Web UI di browser device...")
    print(" [!] Tekan Ctrl + C di terminal ini untuk berhenti.\n")
    print("---------------------------------------------------------------")

    # Buka browser setelah 1 detik
    def delayed_open():
        time.sleep(1.2)
        open_url("http://127.0.0.1:8000")

    import threading
    threading.Thread(target=delayed_open, daemon=True).start()

    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, log_level="info")

def direct_download(url: str):
    """Download langsung lewat terminal tanpa buka browser."""
    print(BANNER)
    print(f" [*] Memulai unduhan instan: {url}\n")
    
    # 1. Magnet / Torrent
    if url.startswith("magnet:") or url.endswith(".torrent"):
        if shutil.which("aria2c"):
            print(" [*] Mengunduh torrent via aria2c...")
            subprocess.run(["aria2c", "--seed-time=0", url])
            return
        else:
            print(" [!] aria2c tidak ditemukan. Silakan pasang aria2 (pkg install aria2 / apt install aria2).")
            return

    # 2. Video / Audio via yt-dlp
    try:
        import yt_dlp
        ydl_opts = {
            "outtmpl": "%(title)s.%(ext)s",
            "format": "bestvideo+bestaudio/best",
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        print("\n [SUCCESS] Unduhan selesai!")
    except ImportError:
        print(" [ERROR] yt-dlp belum terpasang. Jalankan: pip install yt-dlp")
    except Exception as e:
        print(f" [ERROR] Gagal mengunduh: {e}")

def main():
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        if arg in ["--help", "-h"]:
            print(BANNER)
            print("Penggunaan:")
            print("  downloadkan              Buka server lokal dan Web UI di browser")
            print("  downloadkan <URL>        Unduh langsung media/torrent via terminal")
            print("  downloadkan --help       Tampilkan bantuan ini\n")
            return
        direct_download(arg)
    else:
        run_server()

if __name__ == "__main__":
    main()
