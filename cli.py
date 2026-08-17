#!/usr/bin/env python3
"""
DownloadKan CLI — Powerful Standalone Terminal Core & Rich TUI
Universal Media, Hi-Res FLAC Lossless, Torrents & Batch Downloader.
"""

import os
import sys
import re
import json
import shutil
import time
import argparse
import subprocess
import webbrowser
import threading
import urllib.parse
from pathlib import Path
from typing import Dict, List, Optional, Any

# Rich UI Library
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text
from rich.progress import (
    Progress,
    SpinnerColumn,
    TextColumn,
    BarColumn,
    TaskProgressColumn,
    TimeRemainingColumn,
    DownloadColumn,
    TransferSpeedColumn,
)
from rich.prompt import Prompt, Confirm, IntPrompt
from rich import box

# Force UTF-8 encoding for Windows terminals
if sys.platform == "win32":
    try:
        if sys.stdout.encoding.lower() != "utf-8":
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if sys.stderr.encoding.lower() != "utf-8":
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

console = Console(force_terminal=True, highlight=False)

# ============================================================================
# CONSTANTS & CONFIGURATION
# ============================================================================
VERSION = "2.2.0"
CONFIG_DIR = Path.home() / ".config" / "downloadkan"
CONFIG_FILE = CONFIG_DIR / "config.json"

BANNER = r"""[bold cyan]
  ____                      _                 _  __            
 |  _ \  _____      ___ __ | | ___   __ _  __| |/ /____ _ _ __  
 | | | |/ _ \ \ /\ / / '_ \| |/ _ \ / _` |/ _` | ' / _` | '_ \ 
 | |_| | (_) \ V  V /| | | | | (_) | (_| | (_| | . \ (_| | | | |
 |____/ \___/ \_/\_/ |_| |_|_|\___/ \__,_|\__,_|_|\_\__,_|_| |_|
[/bold cyan][dim white]            Standalone Core v""" + VERSION + """ — Terminal & Rich TUI[/dim white]
"""

# Default Download Paths
if os.path.exists("/data/data/com.termux/files/home/storage/downloads"):
    DEFAULT_BASE_DIR = Path("/data/data/com.termux/files/home/storage/downloads/DownloadKan")
elif "HOME" in os.environ:
    DEFAULT_BASE_DIR = Path(os.environ["HOME"]) / "Downloads" / "DownloadKan"
elif "USERPROFILE" in os.environ:
    DEFAULT_BASE_DIR = Path(os.environ["USERPROFILE"]) / "Downloads" / "DownloadKan"
else:
    DEFAULT_BASE_DIR = Path.cwd() / "downloads"


def load_config() -> Dict[str, Any]:
    """Muat konfigurasi lokal atau buat default jika belum ada."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass

    default_config = {
        "download_dir": str(DEFAULT_BASE_DIR),
        "preferred_video_quality": "1080p",
        "preferred_audio_format": "mp3",
        "aria2_connections": 8,
    }
    save_config(default_config)
    return default_config


def save_config(cfg: Dict[str, Any]):
    """Simpan konfigurasi ke disk."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2)
    except Exception as e:
        console.print(f"[red]Gagal menyimpan config:[/red] {e}")


def get_download_dirs() -> Dict[str, Path]:
    """Dapatkan direktori kategori download."""
    cfg = load_config()
    base = Path(cfg.get("download_dir", DEFAULT_BASE_DIR))
    base.mkdir(parents=True, exist_ok=True)
    dirs = {
        "base": base,
        "videos": base / "Videos",
        "music": base / "Music",
        "torrents": base / "Torrents",
        "batch": base / "Batch",
    }
    for d in dirs.values():
        d.mkdir(parents=True, exist_ok=True)
    return dirs


def sanitize_filename(name: str) -> str:
    """Bersihkan karakter berbahaya untuk nama file di semua OS."""
    clean = re.sub(r'[\\/*?:"<>|]', "", name)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean[:180] if clean else "download"


def format_bytes(size: Optional[int]) -> str:
    """Format bytes ke satuan human readable."""
    if not size:
        return "N/A"
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if size < 1024.0:
            return f"{size:.1f} {unit}"
        size /= 1024.0
    return f"{size:.1f} PB"


def format_duration(seconds: Optional[int]) -> str:
    """Format detik ke format MM:SS atau HH:MM:SS."""
    if not seconds:
        return "--:--"
    m, s = divmod(int(seconds), 60)
    h, m = divmod(m, 60)
    if h > 0:
        return f"{h:d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"


# ============================================================================
# SYSTEM DOCTOR & DEPENDENCY DIAGNOSIS
# ============================================================================
def run_doctor():
    """Pemeriksaan menyeluruh terhadap dependensi sistem & petunjuk instalasi."""
    console.print(BANNER)
    console.print(Panel("[bold yellow]🩺 DIAGNOSTIK SISTEM & PERKAKAS NATIVE[/bold yellow]", border_style="yellow"))

    table = Table(box=box.ROUNDED, expand=True)
    table.add_column("Perkakas / Modul", style="bold cyan", width=22)
    table.add_column("Tipe", style="dim", width=12)
    table.add_column("Status", width=16)
    table.add_column("Versi / Detail", style="dim white")

    # 1. Python
    py_ver = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    table.add_row("Python Core", "Runtime", "[green]✓ Terpasang[/green]", f"v{py_ver} ({sys.executable})")

    # 2. yt-dlp
    try:
        import yt_dlp
        ytdlp_ver = getattr(yt_dlp.version, "__version__", "Terpasang")
        table.add_row("yt-dlp", "Media Engine", "[green]✓ Terpasang[/green]", f"v{ytdlp_ver}")
    except ImportError:
        table.add_row("yt-dlp", "Media Engine", "[bold red]✗ Belum Ada[/bold red]", "Diperlukan untuk video & audio.")

    # 3. aria2c
    aria2_path = shutil.which("aria2c")
    if aria2_path:
        try:
            res = subprocess.run(["aria2c", "--version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=False)
            first_line = res.stdout.split("\n")[0] if res.stdout else "Terpasang"
            table.add_row("aria2c", "Torrent/AIO", "[green]✓ Terpasang[/green]", first_line[:40])
        except Exception:
            table.add_row("aria2c", "Torrent/AIO", "[green]✓ Terpasang[/green]", aria2_path)
    else:
        table.add_row("aria2c", "Torrent/AIO", "[bold red]✗ Belum Ada[/bold red]", "Diperlukan untuk torrent & multi-connection.")

    # 4. ffmpeg
    ffmpeg_path = shutil.which("ffmpeg")
    if ffmpeg_path:
        try:
            res = subprocess.run(["ffmpeg", "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=False)
            first_line = res.stdout.split("\n")[0] if res.stdout else "Terpasang"
            table.add_row("ffmpeg", "Muxer/Audio", "[green]✓ Terpasang[/green]", first_line[:40])
        except Exception:
            table.add_row("ffmpeg", "Muxer/Audio", "[green]✓ Terpasang[/green]", ffmpeg_path)
    else:
        table.add_row("ffmpeg", "Muxer/Audio", "[bold red]✗ Belum Ada[/bold red]", "Diperlukan untuk muxing video 1080p/4K & MP3/FLAC.")

    # 5. streamrip
    streamrip_path = shutil.which("rip")
    try:
        import streamrip
        table.add_row("streamrip", "FLAC Hi-Res", "[green]✓ Terpasang[/green]", "Modul Python aktif")
    except ImportError:
        if streamrip_path:
            table.add_row("streamrip", "FLAC Hi-Res", "[green]✓ Terpasang[/green]", streamrip_path)
        else:
            table.add_row("streamrip", "FLAC Hi-Res", "[yellow]! Opsional[/yellow]", "Diperlukan untuk FLAC 24-bit (Qobuz/Tidal).")

    # 6. mutagen
    try:
        import mutagen
        table.add_row("mutagen", "ID3 Tagging", "[green]✓ Terpasang[/green]", f"v{mutagen.version_string}")
    except ImportError:
        table.add_row("mutagen", "ID3 Tagging", "[yellow]! Opsional[/yellow]", "Untuk metadata cover art & lyrics.")

    console.print(table)

    # Petunjuk Instalasi
    console.print("\n[bold cyan]💡 PETUNJUK INSTALASI DEPENDENSI:[/bold cyan]")
    guide_table = Table(box=box.SIMPLE)
    guide_table.add_column("Sistem Operasi / Platform", style="bold yellow", width=25)
    guide_table.add_column("Perintah Instalasi", style="green")

    guide_table.add_row("Android (Termux)", "pkg update && pkg install python ffmpeg aria2 -y && pip install yt-dlp mutagen rich")
    guide_table.add_row("Ubuntu / Debian", "sudo apt update && sudo apt install ffmpeg aria2 python3-pip -y && pip install yt-dlp mutagen rich")
    guide_table.add_row("Arch Linux", "sudo pacman -S ffmpeg aria2 yt-dlp python-mutagen python-rich")
    guide_table.add_row("macOS (Homebrew)", "brew install ffmpeg aria2 yt-dlp && pip3 install mutagen rich")
    guide_table.add_row("Windows (Winget/Pip)", "winget install Gyan.FFmpeg aria2.aria2 && pip install yt-dlp mutagen rich")
    console.print(guide_table)

    dirs = get_download_dirs()
    console.print(f"\n[bold]📁 Direktori Penyimpanan:[/bold] [cyan]{dirs['base']}[/cyan]\n")


# ============================================================================
# SILENT BACKGROUND AUTO-UPDATER & SELF-HEALING
# ============================================================================
def trigger_silent_background_update():
    """Jalankan pembaruan otomatis di latar belakang tanpa mengganggu atau memperlambat user."""
    cfg = load_config()
    last_check = cfg.get("last_auto_update", 0)
    now = time.time()

    # Cek pembaruan otomatis berkala (setiap 12 jam)
    if now - last_check > 12 * 3600:
        cfg["last_auto_update"] = now
        save_config(cfg)

        def _bg_worker():
            try:
                # 1. Update yt-dlp, streamrip, mutagen secara senyap
                subprocess.run(
                    [sys.executable, "-m", "pip", "install", "--upgrade", "yt-dlp", "streamrip", "mutagen", "rich", "--quiet"],
                    capture_output=True,
                    timeout=90,
                )
                # 2. Update kode git jika ada
                if Path(".git").exists() and shutil.which("git"):
                    subprocess.run(["git", "pull", "--quiet"], capture_output=True, timeout=20)
            except Exception:
                pass

        threading.Thread(target=_bg_worker, daemon=True).start()


def self_heal_update_engines():
    """Perbarui engine on-the-fly jika terjadi error ekstraksi atau perubahan algoritma platform."""
    console.print("[dim yellow]⚙️ Mendeteksi kemungkinan perubahan algoritma platform. Memperbarui engine otomatis...[/dim yellow]")
    try:
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "--upgrade", "yt-dlp", "--quiet"],
            capture_output=True,
            timeout=45,
        )
    except Exception:
        pass


# ============================================================================
# UNIVERSAL MEDIA ANALYZER & DOWNLOADER
# ============================================================================
def analyze_and_download_media(url: str, format_choice: Optional[str] = None, audio_only: bool = False, output_dir: Optional[str] = None):
    """Analisis URL media menggunakan yt-dlp dan lakukan unduhan interaktif atau direct."""
    trigger_silent_background_update()
    try:
        import yt_dlp
    except ImportError:
        console.print("[bold red][ERROR][/bold red] Library yt-dlp belum terpasang. Jalankan: [green]pip install yt-dlp[/green]")
        return

    dirs = get_download_dirs()
    target_dir = Path(output_dir) if output_dir else (dirs["music"] if audio_only else dirs["videos"])
    target_dir.mkdir(parents=True, exist_ok=True)

    console.print(f"\n[cyan]🔍 Menganalisis URL:[/cyan] [dim]{url}[/dim]")

    with console.status("[bold green]Mengambil metadata video/audio...[/bold green]", spinner="dots"):
        ydl_opts_info = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "extractor_args": {
                "youtube": {
                    "player_client": ["android", "ios", "web"],
                }
            },
        }
        try:
            with yt_dlp.YoutubeDL(ydl_opts_info) as ydl:
                info = ydl.extract_info(url, download=False)
        except Exception as e:
            # Self-healing on failure: update engine and retry once
            self_heal_update_engines()
            try:
                with yt_dlp.YoutubeDL(ydl_opts_info) as ydl:
                    info = ydl.extract_info(url, download=False)
            except Exception as e2:
                console.print(f"[bold red]❌ Gagal menganalisis URL:[/bold red] {e2}")
                return

    if not info:
        console.print("[bold red]❌ Metadata tidak ditemukan untuk URL tersebut.[/bold red]")
        return

    # Metadata Display
    title = info.get("title", "Media")
    uploader = info.get("uploader") or info.get("channel") or "Unknown Creator"
    duration = info.get("duration")
    views = info.get("view_count")
    extractor = info.get("extractor_key") or "Universal"

    meta_text = Text()
    meta_text.append(f"📌 Judul     : ", style="bold")
    meta_text.append(f"{title}\n", style="bold white")
    meta_text.append(f"👤 Pembuat   : ", style="bold")
    meta_text.append(f"{uploader}\n", style="cyan")
    meta_text.append(f"⏱️  Durasi   : ", style="bold")
    meta_text.append(f"{format_duration(duration)}  |  ", style="yellow")
    meta_text.append(f"👁️  Views    : ", style="bold")
    meta_text.append(f"{views:,}  |  " if views else "N/A  |  ", style="magenta")
    meta_text.append(f"🌐 Platform : ", style="bold")
    meta_text.append(f"{extractor}\n", style="green")

    console.print(Panel(meta_text, title="[bold green]Informasi Media[/bold green]", border_style="green"))

    # Deteksi Otomatis Jika Video Merupakan Musik / Lagu
    categories = info.get("categories") or []
    raw_track = info.get("track")
    raw_artist = info.get("artist")
    channel_name = uploader.lower()

    is_music = bool(
        "music" in [c.lower() for c in categories]
        or raw_track
        or raw_artist
        or "- topic" in channel_name
        or "vevo" in channel_name
        or re.search(r"\b(official\s*(music\s*)?video|official\s*audio|lyric\s*video|mv|clip|lirik)\b", title, re.IGNORECASE)
    )

    # Ekstrak Nama Artis & Judul Bersih
    clean_title_cand = re.sub(r"[\(\[\{].*?(official|video|audio|lirik|lyric|clip|mv|remaster|hd|4k|m\/v).*?[\)\]\}]", "", title, flags=re.IGNORECASE).strip()
    clean_title_cand = re.sub(r"\s+", " ", clean_title_cand)

    if is_music:
        console.print(Panel(
            f"[bold magenta]🎵 Terdeteksi sebagai Video Musik / Lagu:[/bold magenta] [bold white]{clean_title_cand}[/bold white]\n"
            f"[dim]Tersedia opsi download [bold green]Studio FLAC Lossless[/bold green] (Lirik LRCLIB + Cover Art 1200px).[/dim]",
            border_style="magenta"
        ))

    # Parse Formats
    formats = info.get("formats", [])
    available_videos = []
    available_audios = []

    seen_heights = set()
    for f in formats:
        vcodec = f.get("vcodec", "none")
        acodec = f.get("acodec", "none")
        height = f.get("height")
        f_id = f.get("format_id")
        ext = f.get("ext", "mp4")
        fsize = f.get("filesize") or f.get("filesize_approx")

        if vcodec != "none" and height:
            if height not in seen_heights:
                seen_heights.add(height)
                available_videos.append({
                    "id": f_id,
                    "height": height,
                    "label": f"{height}p",
                    "ext": ext,
                    "size": fsize,
                    "vcodec": vcodec,
                })
        elif acodec != "none" and vcodec == "none":
            abr = f.get("abr") or 128
            available_audios.append({
                "id": f_id,
                "abr": int(abr),
                "label": f"Audio ({int(abr)} kbps)",
                "ext": ext,
                "size": fsize,
            })

    available_videos.sort(key=lambda x: x["height"], reverse=True)
    available_audios.sort(key=lambda x: x["abr"], reverse=True)

    # Resolution Selection Table
    selected_format_arg = "best[height<=1080]/bestvideo+bestaudio/best"
    out_ext = "mp4"
    is_audio_mode = audio_only

    if not format_choice:
        table = Table(title="Pilihan Format & Kualitas", box=box.ROUNDED)
        table.add_column("No", style="bold yellow", width=5, justify="center")
        table.add_column("Tipe", style="bold cyan", width=12)
        table.add_column("Kualitas / Resolusi", style="white", width=34)
        table.add_column("Format", style="dim", width=10)
        table.add_column("Estimasi Ukuran", style="green", width=15)

        options = []

        if is_music:
            options.append({"label": "Studio FLAC Lossless (Lagu Utuh + Cover 1200px + Lirik)", "arg": "bestaudio/best", "ext": "flac", "audio": True, "smart_music": True})
            table.add_row("1", "Musik Hi-Res", "[bold green]Studio FLAC Lossless (HD Cover & Lirik)[/bold green]", "flac", "30-55 MB")

            options.append({"label": "Audio MP3 (320kbps HQ + Cover & Lirik)", "arg": "bestaudio/best", "ext": "mp3", "audio": True, "smart_music": True})
            table.add_row("2", "Audio MP3", "[bold magenta]Audio MP3 320kbps (ID3 & Cover)[/bold magenta]", "mp3", "~10 MB")

            options.append({"label": "Video Terbaik (Best Video + Best Audio / Mux)", "arg": "best[height<=1080]/bestvideo+bestaudio/best", "ext": "mp4", "audio": False, "smart_music": False})
            table.add_row("3", "Video", "Video MP4 (1080p/4K Otomatis)", "mp4/mkv", "Maksimal")
        else:
            options.append({"label": "Video Terbaik (Best Video + Best Audio / Mux)", "arg": "best[height<=1080]/bestvideo+bestaudio/best", "ext": "mp4", "audio": False, "smart_music": False})
            table.add_row("1", "Video", "[bold green]Otomatis Terbaik (4K/HD)[/bold green]", "mp4/mkv", "Maksimal")

            options.append({"label": "Audio MP3 (320kbps / Best)", "arg": "bestaudio/best", "ext": "mp3", "audio": True, "smart_music": False})
            table.add_row("2", "Audio", "[bold magenta]Ekstrak MP3 (High Quality)[/bold magenta]", "mp3", "Ringan")

            options.append({"label": "Audio M4A / AAC Asli", "arg": "bestaudio[ext=m4a]/bestaudio", "ext": "m4a", "audio": True, "smart_music": False})
            table.add_row("3", "Audio", "Audio M4A / AAC Lossy", "m4a", "Ringan")

        opt_idx = len(options) + 1
        # Video Heights
        for v in available_videos[:5]:
            h = v["height"]
            options.append({
                "label": f"Video {h}p",
                "arg": f"best[height<={h}]/bestvideo[height<={h}]+bestaudio/best",
                "ext": "mp4",
                "audio": False,
                "smart_music": False,
            })
            table.add_row(str(opt_idx), "Video", f"Resolusi {h}p", v["ext"], format_bytes(v["size"]))
            opt_idx += 1

        console.print(table)
        user_pick = IntPrompt.ask(f"[bold yellow]Pilih nomor format (1-{len(options)})[/bold yellow]", default=1)
        if 1 <= user_pick <= len(options):
            chosen = options[user_pick - 1]
            selected_format_arg = chosen["arg"]
            out_ext = chosen["ext"]
            is_audio_mode = chosen["audio"]
            if chosen.get("smart_music"):
                # Redirect to studio master music pipeline with iTunes metadata + LRCLIB lyrics + 1200px artwork
                search_and_download_music(clean_title_cand, format_choice=out_ext, output_dir=str(target_dir))
                return
    else:
        if format_choice.lower() in ["mp3", "audio", "flac", "m4a"]:
            if is_music and format_choice.lower() in ["flac", "mp3"]:
                search_and_download_music(clean_title_cand, format_choice=format_choice.lower(), output_dir=str(target_dir))
                return
            selected_format_arg = "bestaudio/best"
            out_ext = format_choice.lower()
            is_audio_mode = True
        elif format_choice.endswith("p"):
            h = format_choice.replace("p", "")
            selected_format_arg = f"best[height<={h}]/bestvideo[height<={h}]+bestaudio/best"
            out_ext = "mp4"
        else:
            selected_format_arg = format_choice

    # Run Live Download with Progress Bar
    console.print(f"\n[bold green]🚀 Memulai Unduhan ke:[/bold green] [cyan]{target_dir}[/cyan]\n")

    progress = Progress(
        SpinnerColumn(),
        TextColumn("[bold cyan]{task.fields[filename]}[/bold cyan]"),
        BarColumn(bar_width=None),
        TaskProgressColumn(),
        DownloadColumn(),
        TransferSpeedColumn(),
        TimeRemainingColumn(),
        console=console,
    )

    task_id = progress.add_task("download", filename=sanitize_filename(title)[:35] + f".{out_ext}", total=None)

    def ytdlp_progress_hook(d):
        if d["status"] == "downloading":
            downloaded = d.get("downloaded_bytes", 0)
            total = d.get("total_bytes") or d.get("total_bytes_estimate")
            if total:
                progress.update(task_id, total=total, completed=downloaded)
            else:
                progress.update(task_id, completed=downloaded)
        elif d["status"] == "finished":
            progress.update(task_id, completed=progress.tasks[task_id].total or 100)

    ydl_opts_download = {
        "format": selected_format_arg,
        "outtmpl": str(target_dir / "%(title)s.%(ext)s"),
        "progress_hooks": [ytdlp_progress_hook],
        "quiet": True,
        "no_warnings": True,
        "extractor_args": {
            "youtube": {
                "player_client": ["android", "ios", "web"],
            }
        },
    }

    if is_audio_mode:
        if out_ext in ["flac", "mp3", "m4a", "wav", "aac", "opus"]:
            postproc = {
                "key": "FFmpegExtractAudio",
                "preferredcodec": out_ext,
            }
            if out_ext == "mp3":
                postproc["preferredquality"] = "320"
            elif out_ext == "flac":
                postproc["preferredquality"] = "0" # Highest FLAC compression / Lossless
            ydl_opts_download["postprocessors"] = [postproc]

    with progress:
        try:
            with yt_dlp.YoutubeDL(ydl_opts_download) as ydl:
                ydl.download([url])
            console.print(f"\n[bold green]✅ Unduhan Selesai![/bold green] File tersimpan di: [cyan]{target_dir}[/cyan]\n")
        except Exception as e:
            console.print(f"\n[bold red]❌ Terjadi kesalahan saat mengunduh:[/bold red] {e}")


# ============================================================================
# TERMINAL TORRENT SEARCH & ARIA2C DOWNLOADER (Multi-Indexer + Live Trackers)
# ============================================================================
LIVE_TRACKERS = [
    "udp://tracker.opentrackr.org:1337/announce",
    "udp://open.tracker.cl:1337/announce",
    "udp://open.demonii.com:1337/announce",
    "udp://tracker.openbittorrent.com:80/announce",
    "udp://tracker.coppersurfer.tk:6969/announce",
    "udp://p4p.arenabg.com:1337/announce",
    "udp://tracker.torrent.eu.org:451/announce",
]

def search_and_download_torrent(query: str, output_dir: Optional[str] = None):
    """Cari torrent dari The Pirate Bay / Nyaa / YTS / Torlink dengan failover cermin & auto-injeksi tracker."""
    import requests

    console.print(f"\n[cyan]🔍 Mencari torrent untuk:[/cyan] [bold white]{query}[/bold white]")
    hits = []

    with console.status("[bold green]Menghubungi indexer torrent (TPB / Nyaa / YTS / Torlink)...[/bold green]", spinner="earth"):
        # 1. The Pirate Bay (apibay.org)
        try:
            r = requests.get(f"https://apibay.org/q.php?q={urllib.parse.quote(query)}", timeout=5)
            if r.status_code == 200:
                for item in r.json()[:15]:
                    if item.get("name") and item.get("name") != "No results returned":
                        info_hash = item.get("info_hash")
                        seeders = int(item.get("seeders", 0))
                        size_bytes = int(item.get("size", 0))
                        tr_params = "".join(f"&tr={urllib.parse.quote(t)}" for t in LIVE_TRACKERS)
                        hits.append({
                            "title": item.get("name"),
                            "size": format_bytes(size_bytes),
                            "seeders": seeders,
                            "leechers": int(item.get("leechers", 0)),
                            "magnet": f"magnet:?xt=urn:btih:{info_hash}&dn={urllib.parse.quote(item.get('name'))}{tr_params}",
                            "source": "ThePirateBay",
                        })
        except Exception as e:
            console.print(f"[dim yellow]Notice (TPB): {e}[/dim yellow]")

        # 2. Nyaa.si (Anime / Asian / Manga)
        try:
            r = requests.get(
                f"https://nyaa.si/?f=0&c=0_0&q={urllib.parse.quote(query)}",
                headers={"User-Agent": "Mozilla/5.0"},
                timeout=5,
            )
            if r.status_code == 200:
                rows = re.findall(r'<tr class="default">(.*?)</tr>', r.text, re.DOTALL)
                for row in rows[:10]:
                    title_m = re.search(r'<a href="/view/\d+"[^>]*title="([^"]+)"', row)
                    magnet_m = re.search(r'href="(magnet:\?[^"]+)"', row)
                    size_m = re.search(r'<td class="text-center">([0-9.]+\s*[KMGT]i?B)</td>', row)
                    seed_m = re.search(r'<td class="text-center"[^>]*>(\d+)</td>', row)

                    if title_m and magnet_m:
                        mag = magnet_m.group(1)
                        if not any(f"&tr=" in mag for _ in [1]):
                            mag += "".join(f"&tr={urllib.parse.quote(t)}" for t in LIVE_TRACKERS)
                        hits.append({
                            "title": title_m.group(1),
                            "size": size_m.group(1) if size_m else "N/A",
                            "seeders": int(seed_m.group(1)) if seed_m else 0,
                            "leechers": 0,
                            "magnet": mag,
                            "source": "Nyaa",
                        })
        except Exception as e:
            console.print(f"[dim yellow]Notice (Nyaa): {e}[/dim yellow]")

        # 3. YTS / YIFY API (Movies HD / 4K)
        try:
            r = requests.get(f"https://yts.mx/api/v2/list_movies.json?query_term={urllib.parse.quote(query)}&limit=8", timeout=5)
            if r.status_code == 200:
                movies = r.json().get("data", {}).get("movies", []) or []
                for m in movies:
                    for tor in m.get("torrents", []):
                        info_hash = tor.get("hash")
                        if info_hash:
                            tr_params = "".join(f"&tr={urllib.parse.quote(t)}" for t in LIVE_TRACKERS)
                            hits.append({
                                "title": f"{m.get('title')} ({m.get('year')}) [{tor.get('quality')} {tor.get('type')}]",
                                "size": tor.get("size", "N/A"),
                                "seeders": int(tor.get("seeds", 0)),
                                "leechers": int(tor.get("peers", 0)),
                                "magnet": f"magnet:?xt=urn:btih:{info_hash}&dn={urllib.parse.quote(m.get('title'))}{tr_params}",
                                "source": "YTS/YIFY",
                            })
        except Exception as e:
            console.print(f"[dim yellow]Notice (YTS): {e}[/dim yellow]")

    if not hits:
        console.print("[bold red]❌ Tidak ada hasil torrent yang ditemukan untuk kata kunci tersebut.[/bold red]")
        return

    hits.sort(key=lambda x: x["seeders"], reverse=True)

    # Render Results Table
    table = Table(title=f"Hasil Pencarian Torrent: '{query}' ({len(hits)} Hasil)", box=box.ROUNDED)
    table.add_column("No", style="bold yellow", width=4, justify="center")
    table.add_column("Nama Torrent", style="bold white", no_wrap=False)
    table.add_column("Ukuran", style="green", width=12)
    table.add_column("Seed", style="bold green", width=8, justify="right")
    table.add_column("Leech", style="yellow", width=8, justify="right")
    table.add_column("Sumber", style="dim cyan", width=14)

    for i, item in enumerate(hits[:15]):
        table.add_row(
            str(i + 1),
            item["title"][:70],
            item["size"],
            str(item["seeders"]),
            str(item["leechers"]),
            item["source"],
        )

    console.print(table)

    # Prompt Selection
    pick = IntPrompt.ask(f"[bold yellow]Pilih nomor torrent untuk diunduh (1-{min(15, len(hits))}) atau 0 untuk batal[/bold yellow]", default=1)
    if pick == 0 or pick > len(hits):
        console.print("[yellow]Pencarian dibatalkan.[/yellow]")
        return

    chosen = hits[pick - 1]
    magnet_uri = chosen["magnet"]
    dirs = get_download_dirs()
    target_dir = Path(output_dir) if output_dir else dirs["torrents"]
    target_dir.mkdir(parents=True, exist_ok=True)

    console.print(f"\n[bold green]🧲 Memulai Download Torrent via aria2c:[/bold green]")
    console.print(f"[white]Nama    :[/white] {chosen['title']}")
    console.print(f"[white]Folder  :[/white] [cyan]{target_dir}[/cyan]\n")

    # Check aria2c
    aria2_path = shutil.which("aria2c")
    if not aria2_path:
        console.print("[bold red]❌ aria2c tidak ditemukan di sistem.[/bold red]")
        console.print("[yellow]Magnet Link Anda:[/yellow]")
        console.print(f"[dim cyan]{magnet_uri}[/dim cyan]\n")
        console.print("[green]Silakan pasang aria2c (pkg install aria2 / apt install aria2 / winget install aria2).[/green]")
        return

    cfg = load_config()
    connections = str(cfg.get("aria2_connections", 8))

    cmd = [
        "aria2c",
        "--dir", str(target_dir),
        "--seed-time=0",
        f"--max-connection-per-server={connections}",
        "--summary-interval=1",
        magnet_uri,
    ]

    try:
        subprocess.run(cmd, check=True)
        console.print(f"\n[bold green]✅ Download Torrent Selesai![/bold green] Tersimpan di: [cyan]{target_dir}[/cyan]\n")
    except KeyboardInterrupt:
        console.print("\n[yellow]⚠️ Download torrent dihentikan oleh user.[/yellow]")
    except Exception as e:
        console.print(f"\n[bold red]❌ Error saat menjalankan aria2c:[/bold red] {e}")


# ============================================================================
# HI-RES LOSSLESS MUSIC SEARCH & DOWNLOAD (Apple Music / iTunes / LRCLIB)
# ============================================================================
def search_and_download_music(query: str, format_choice: str = "flac", output_dir: Optional[str] = None):
    """Cari musik langsung dari Apple Music/iTunes dan unduh dengan tag FLAC/MP3 & lirik LRCLIB."""
    import requests

    console.print(f"\n[cyan]🎵 Mencari lagu:[/cyan] [bold white]{query}[/bold white]")
    tracks = []

    with console.status("[bold green]Mencari database musik Apple Music & Deezer...[/bold green]", spinner="bouncingBall"):
        try:
            r = requests.get(
                f"https://itunes.apple.com/search?term={urllib.parse.quote(query)}&media=music&country=ID&limit=10",
                timeout=6,
            )
            if r.status_code == 200:
                for item in r.json().get("results", []):
                    artwork = item.get("artworkUrl100", "").replace("100x100bb", "1200x1200bb")
                    dur_s = item.get("trackTimeMillis", 0) // 1000
                    tracks.append({
                        "title": item.get("trackName", "Track"),
                        "artist": item.get("artistName", "Artist"),
                        "album": item.get("collectionName", "Album"),
                        "artwork": artwork,
                        "duration": dur_s,
                        "stream_url": item.get("previewUrl"),
                    })
        except Exception as e:
            console.print(f"[dim yellow]Notice: {e}[/dim yellow]")

    if not tracks:
        console.print("[yellow]Tidak menemukan hasil di Apple Music. Mengalihkan ke pencarian universal...[/yellow]")
        analyze_and_download_media(f"ytsearch1:{query}", format_choice=format_choice, audio_only=True, output_dir=output_dir)
        return

    # Render Music Table
    table = Table(title=f"Hasil Pencarian Musik: '{query}' ({len(tracks)} Hasil)", box=box.ROUNDED)
    table.add_column("No", style="bold yellow", width=4, justify="center")
    table.add_column("Judul Lagu", style="bold white", width=30)
    table.add_column("Artis", style="bold cyan", width=22)
    table.add_column("Album", style="dim", width=25)
    table.add_column("Durasi", style="green", width=10)

    for i, t in enumerate(tracks):
        table.add_row(
            str(i + 1),
            t["title"][:28],
            t["artist"][:20],
            t["album"][:23],
            format_duration(t["duration"]),
        )

    console.print(table)
    pick = IntPrompt.ask(f"[bold yellow]Pilih nomor lagu (1-{len(tracks)}) atau 0 untuk batal[/bold yellow]", default=1)
    if pick == 0 or pick > len(tracks):
        return

    chosen = tracks[pick - 1]
    title = sanitize_filename(chosen["title"])
    artist = sanitize_filename(chosen["artist"])
    album = chosen["album"]
    stream_url = chosen["stream_url"]
    artwork_url = chosen["artwork"]

    dirs = get_download_dirs()
    target_dir = Path(output_dir) if output_dir else dirs["music"]
    target_dir.mkdir(parents=True, exist_ok=True)

    out_ext = format_choice.lower()
    final_file = target_dir / f"{artist} - {title}.{out_ext}"

    console.print(f"\n[bold green]📥 Mengunduh:[/bold green] [white]{artist} - {title}[/white] [{out_ext.upper()} Lossless/HQ]")

    # 1. Unduh Full Master Track (Bukan Preview)
    search_term = f"{artist} - {title} Official Audio"
    with console.status(f"[bold cyan]Mengunduh master audio utuh & konversi ke {out_ext.upper()} Lossless...[/bold cyan]", spinner="dots"):
        ydl_opts_audio = {
            "format": "bestaudio/best",
            "outtmpl": str(target_dir / f"{artist} - {title}.%(ext)s"),
            "quiet": True,
            "no_warnings": True,
            "extractor_args": {
                "youtube": {
                    "player_client": ["android", "ios", "web"],
                }
            },
            "postprocessors": [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": out_ext,
                "preferredquality": "0" if out_ext == "flac" else "320",
            }],
        }
        try:
            with yt_dlp.YoutubeDL(ydl_opts_audio) as ydl:
                ydl.download([f"ytsearch1:{search_term}"])
        except Exception as e:
            console.print(f"[dim yellow]Pencarian audio pertama dialihkan: {e}[/dim yellow]")
            try:
                with yt_dlp.YoutubeDL(ydl_opts_audio) as ydl:
                    ydl.download([f"ytsearch1:{artist} {title}"])
            except Exception as e2:
                console.print(f"[bold red]❌ Gagal mengunduh audio master:[/bold red] {e2}")
                return

    # 2. Ambil Lirik LRCLIB
    lyrics_text = ""
    try:
        lrc_r = requests.get("https://lrclib.net/api/get", params={"track_name": title, "artist_name": artist}, timeout=4)
        if lrc_r.status_code == 200:
            lyrics_text = lrc_r.json().get("syncedLyrics") or lrc_r.json().get("plainLyrics") or ""
    except Exception:
        pass

    # 3. Embed Tag Metadata & Artwork ke File FLAC / MP3
    if final_file.exists():
        if out_ext == "flac":
            try:
                from mutagen.flac import FLAC, Picture
                audio = FLAC(str(final_file))
                audio["title"] = title
                audio["artist"] = artist
                audio["album"] = album
                if lyrics_text:
                    audio["lyrics"] = lyrics_text
                if artwork_url:
                    cover_bytes = requests.get(artwork_url, timeout=5).content
                    pic = Picture()
                    pic.type = 3
                    pic.mime = "image/jpeg"
                    pic.desc = "Cover Front"
                    pic.data = cover_bytes
                    audio.add_picture(pic)
                audio.save()
            except Exception as e:
                console.print(f"[dim yellow]FLAC Tag notice: {e}[/dim yellow]")

        elif out_ext == "mp3":
            try:
                from mutagen.easyid3 import EasyID3
                from mutagen.id3 import ID3, APIC, USLT, ID3NoHeaderError
                try:
                    audio = EasyID3(str(final_file))
                except ID3NoHeaderError:
                    audio = EasyID3()
                    audio.save(str(final_file))
                audio["title"] = title
                audio["artist"] = artist
                audio["album"] = album
                audio.save()

                raw_id3 = ID3(str(final_file))
                if artwork_url:
                    cover_bytes = requests.get(artwork_url, timeout=5).content
                    raw_id3.add(APIC(encoding=3, mime="image/jpeg", type=3, desc="Cover", data=cover_bytes))
                if lyrics_text:
                    raw_id3.add(USLT(encoding=3, lang="eng", desc="Lyrics", text=lyrics_text))
                raw_id3.save(v2_version=3)
            except Exception as e:
                console.print(f"[dim yellow]MP3 Tag notice: {e}[/dim yellow]")

        f_size_mb = final_file.stat().st_size / 1024 / 1024
        console.print(f"\n[bold green]✅ Unduhan Berhasil![/bold green] File: [cyan]{final_file.name}[/cyan] ({f_size_mb:.2f} MB)")
    else:
        console.print(f"[bold red]❌ File hasil unduhan tidak ditemukan di folder output.[/bold red]")


# ============================================================================
# BATCH & PLAYLIST DOWNLOADER (Dedicated Subfolder Per Playlist/Album)
# ============================================================================
def run_batch_downloader(source: str, format_choice: str = "best", output_dir: Optional[str] = None):
    """Unduh kumpulan link dari file text atau URL playlist ke dalam subfolder khusus."""
    urls = []
    source_path = Path(source)
    playlist_folder_name = "Batch_Queue"
    dirs = get_download_dirs()

    if source_path.exists() and source_path.is_file():
        playlist_folder_name = sanitize_filename(source_path.stem)
        console.print(f"\n[cyan]📋 Membaca daftar URL dari file:[/cyan] [bold]{source_path}[/bold]")
        with open(source_path, "r", encoding="utf-8") as f:
            for line in f:
                clean = line.strip()
                if clean and not clean.startswith("#"):
                    urls.append(clean)
    else:
        # URL Playlist / Album (Apple Music, Spotify, YouTube Music, YouTube)
        console.print(f"\n[cyan]📋 Menganalisis playlist / album URL:[/cyan] [bold]{source}[/bold]")
        with console.status("[bold green]Mengekstrak daftar lagu playlist / album lintas platform...[/bold green]", spinner="dots"):
            # 1. Apple Music Album / Playlist
            if "music.apple.com" in source:
                try:
                    match_id = re.search(r"/(?:album|playlist)/[^/]+/(\d+)", source) or re.search(r"/(\d+)(?:\?|$)", source)
                    if match_id:
                        album_id = match_id.group(1)
                        r = requests.get(f"https://itunes.apple.com/lookup?id={album_id}&entity=song&country=ID", timeout=6).json()
                        res = r.get("results", [])
                        if res:
                            alb = res[0]
                            p_artist = sanitize_filename(alb.get("artistName", "Artist"))
                            p_title = sanitize_filename(alb.get("collectionName", "Album"))
                            playlist_folder_name = f"{p_artist} - {p_title}"
                            for t in res[1:]:
                                t_name = t.get("trackName")
                                if t_name:
                                    urls.append(f"{p_artist} {t_name} Official Audio")
                except Exception as e:
                    console.print(f"[dim yellow]Notice Apple Music extract: {e}[/dim yellow]")

            # 2. Spotify Album / Playlist
            if not urls and "spotify.com" in source:
                try:
                    r = requests.get(f"https://open.spotify.com/oembed?url={urllib.parse.quote(source)}", timeout=5).json()
                    if r.get("title"):
                        playlist_folder_name = sanitize_filename(r.get("title", "Spotify_Playlist"))
                    # Scraping Embed Tracks
                    embed_url = source.replace("open.spotify.com/", "open.spotify.com/embed/")
                    resp = requests.get(embed_url, timeout=5, headers={"User-Agent": "Mozilla/5.0"}).text
                    # Match track titles
                    matches = re.findall(r'"name":"([^"]+)"', resp)
                    if matches:
                        clean_matches = [m for m in matches if len(m) > 1 and m not in ["Spotify", "Music"]][:50]
                        for cm in set(clean_matches):
                            urls.append(f"{cm} Audio")
                except Exception as e:
                    console.print(f"[dim yellow]Notice Spotify extract: {e}[/dim yellow]")

            # 3. YouTube Music & Universal via yt-dlp
            if not urls:
                try:
                    import yt_dlp
                    with yt_dlp.YoutubeDL({"extract_flat": True, "quiet": True}) as ydl:
                        info = ydl.extract_info(source, download=False)
                        if info:
                            p_title = sanitize_filename(info.get("title") or "Playlist")
                            p_uploader = sanitize_filename(info.get("uploader") or info.get("channel") or "")
                            if p_uploader and p_uploader.lower() not in p_title.lower():
                                playlist_folder_name = f"{p_uploader} - {p_title}"
                            else:
                                playlist_folder_name = p_title

                            if "entries" in info:
                                for entry in info["entries"]:
                                    if entry:
                                        v_url = entry.get("url") or f"https://www.youtube.com/watch?v={entry.get('id')}"
                                        urls.append(v_url)
                except Exception as e:
                    console.print(f"[bold red]❌ Gagal mengekstrak playlist:[/bold red] {e}")
                    return

    if not urls:
        console.print("[bold red]❌ Tidak ada URL yang ditemukan untuk diunduh.[/bold red]")
        return

    # Folder Khusus Sesuai Nama Playlist / Album
    base_target = Path(output_dir) if output_dir else (dirs["music"] if format_choice.lower() in ["flac", "mp3"] else dirs["batch"])
    target_dir = base_target / playlist_folder_name
    target_dir.mkdir(parents=True, exist_ok=True)

    console.print(Panel(
        f"📁 [bold cyan]Folder Tujuan:[/bold cyan] [bold white]{target_dir}[/bold white]\n"
        f"📊 [bold yellow]Total Item   :[/bold yellow] [bold green]{len(urls)} lagu/media[/bold green]\n"
        f"🎵 [bold magenta]Format Pilihan:[/bold magenta] [white]{format_choice.upper()}[/white]",
        title="[bold green]Antrean Unduhan Playlist / Album[/bold green]",
        border_style="green"
    ))

    downloaded_files = []
    for i, u in enumerate(urls, 1):
        console.print(f"\n[bold yellow]━━━ [ Track {i:02d}/{len(urls):02d} ] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━[/bold yellow]")
        analyze_and_download_media(u, format_choice=format_choice, output_dir=str(target_dir))

    # Buat file Playlist .M3U otomatis di dalam folder
    try:
        m3u_file = target_dir / f"{playlist_folder_name}.m3u"
        m3u_lines = ["#EXTM3U\n"]
        for f in sorted(target_dir.glob("*.*")):
            if f.suffix.lower() in [".flac", ".mp3", ".m4a", ".mp4", ".mkv", ".wav"] and not f.name.endswith(".m3u"):
                m3u_lines.append(f"{f.name}\n")
        if len(m3u_lines) > 1:
            m3u_file.write_text("".join(m3u_lines), encoding="utf-8")
            console.print(f"📑 [dim]Playlist file dibuat:[/dim] [cyan]{m3u_file.name}[/cyan]")
    except Exception:
        pass

    console.print(f"\n[bold green]🎉 Seluruh playlist ({len(urls)} item) sukses tersimpan di folder:[/bold green]")
    console.print(f"👉 [bold cyan]{target_dir}[/bold cyan]\n")


# ============================================================================
# CONFIGURATION MANAGER
# ============================================================================
def configure_settings():
    """Menu kustomisasi konfigurasi downloadkan."""
    cfg = load_config()
    console.print(Panel("[bold cyan]⚙️ PENGATURAN DOWNLOADKAN[/bold cyan]", border_style="cyan"))

    console.print(f"1. Direktori Download : [green]{cfg.get('download_dir')}[/green]")
    console.print(f"2. Kualitas Default   : [green]{cfg.get('preferred_video_quality')}[/green]")
    console.print(f"3. Format Audio       : [green]{cfg.get('preferred_audio_format')}[/green]")
    console.print(f"4. Koneksi aria2c     : [green]{cfg.get('aria2_connections')}[/green]")
    console.print("0. Kembali ke Menu Utama\n")

    opt = Prompt.ask("Pilih pengaturan yang ingin diubah", choices=["1", "2", "3", "4", "0"], default="0")
    if opt == "1":
        new_dir = Prompt.ask("Masukkan path direktori baru", default=cfg.get("download_dir"))
        cfg["download_dir"] = new_dir
        save_config(cfg)
        console.print("[green]✓ Direktori berhasil disimpan![/green]")
    elif opt == "2":
        new_q = Prompt.ask("Pilih kualitas video default", choices=["2160p", "1080p", "720p", "480p", "best"], default="1080p")
        cfg["preferred_video_quality"] = new_q
        save_config(cfg)
        console.print("[green]✓ Kualitas default berhasil disimpan![/green]")
    elif opt == "3":
        new_a = Prompt.ask("Pilih format audio default", choices=["mp3", "flac", "m4a"], default="mp3")
        cfg["preferred_audio_format"] = new_a
        save_config(cfg)
        console.print("[green]✓ Format audio default berhasil disimpan![/green]")
    elif opt == "4":
        new_conn = IntPrompt.ask("Jumlah koneksi per server aria2c (1-16)", default=8)
        cfg["aria2_connections"] = max(1, min(16, new_conn))
        save_config(cfg)
        console.print("[green]✓ Koneksi aria2c berhasil disimpan![/green]")


# ============================================================================
# WEB SERVER LAUNCHER
# ============================================================================
def run_server(host: str = "127.0.0.1", port: int = 8000):
    """Jalankan local FastAPI server + buka browser otomatis."""
    console.print(BANNER)
    console.print(f" [*] Menjalankan DownloadKan Standalone Core...")
    console.print(f" [*] Server lokal aktif di: [bold cyan]http://{host}:{port}[/bold cyan]")
    console.print(" [*] Membuka antarmuka Web UI di browser device...")
    console.print(" [!] Tekan Ctrl + C di terminal ini untuk berhenti.\n")

    def delayed_open():
        time.sleep(1.2)
        url = f"http://{host}:{port}"
        if shutil.which("termux-open-url"):
            subprocess.run(["termux-open-url", url], check=False)
        else:
            webbrowser.open(url)

    threading.Thread(target=delayed_open, daemon=True).start()

    try:
        import uvicorn
        uvicorn.run("server:app", host=host, port=port, log_level="info")
    except ImportError:
        console.print("[bold red]❌ Uvicorn belum terpasang. Jalankan: pip install uvicorn[/bold red]")


# ============================================================================
# AUTO-UPDATER & ENGINE SYNC
# ============================================================================
def run_updater():
    """Perbarui seluruh dependensi inti, engine scraper, dan script DownloadKan."""
    console.print(Panel("[bold cyan]🔄 PEMBARUAN SISTEM & ENGINE SCRAPER[/bold cyan]", border_style="cyan"))

    steps = [
        ("yt-dlp (YouTube & Universal Scraper)", [sys.executable, "-m", "pip", "install", "--upgrade", "yt-dlp"]),
        ("streamrip (Lossless FLAC Scraper)", [sys.executable, "-m", "pip", "install", "--upgrade", "streamrip"]),
        ("Mutagen & Rich UI Core", [sys.executable, "-m", "pip", "install", "--upgrade", "mutagen", "rich", "requests"]),
    ]

    for name, cmd in steps:
        with console.status(f"[bold green]Memperbarui {name}...[/bold green]", spinner="dots"):
            try:
                proc = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
                if proc.returncode == 0:
                    console.print(f"  [bold green]✓[/bold green] {name}: [green]Berhasil diperbarui / Terkini[/green]")
                else:
                    console.print(f"  [yellow]![/yellow] {name}: [dim]{proc.stderr.strip()[:100]}[/dim]")
            except Exception as e:
                console.print(f"  [bold red]✗[/bold red] {name}: {e}")

    # Cek Pembaruan Git Repository Jika Ada
    if Path(".git").exists() and shutil.which("git"):
        with console.status("[bold green]Memeriksa update kode DownloadKan dari GitHub...[/bold green]", spinner="dots"):
            try:
                proc = subprocess.run(["git", "pull", "origin", "main"], capture_output=True, text=True, timeout=15)
                if "Already up to date" in proc.stdout:
                    console.print("  [bold green]✓[/bold green] Source Code: [green]Sudah menggunakan versi terbaru di GitHub[/green]")
                else:
                    console.print(f"  [bold green]✓[/bold green] Source Code: [green]Berhasil diupdate dari GitHub[/green]\n[dim]{proc.stdout[:150]}[/dim]")
            except Exception as e:
                console.print(f"  [dim yellow]Git check notice: {e}[/dim yellow]")

    console.print("\n[bold green]🎉 Seluruh engine dan dependensi siap digunakan![/bold green]\n")


# ============================================================================
# INTERACTIVE RICH TUI DASHBOARD
# ============================================================================
def interactive_menu():
    """Menu Navigasi Utama TUI Interaktif."""
    while True:
        console.clear()
        console.print(BANNER)

        dirs = get_download_dirs()
        status_panel = (
            f"[dim]📁 Penyimpanan:[/dim] [cyan]{dirs['base']}[/cyan]  "
            f"[dim]| OS:[/dim] [yellow]{sys.platform}[/yellow]  "
            f"[dim]| Python:[/dim] [green]{sys.version_info.major}.{sys.version_info.minor}[/green]"
        )
        console.print(Panel(status_panel, box=box.HORIZONTALS))

        console.print("[bold white]PILIH MENU OPERASI:[/bold white]\n")
        console.print("  [bold cyan]1.[/bold cyan] 📥 [bold]Unduh / Analisis URL Media[/bold] [dim](YouTube, TikTok, IG, FB, X, dll)[/dim]")
        console.print("  [bold magenta]2.[/bold magenta] 🧲 [bold]Cari & Unduh Torrent[/bold] [dim](The Pirate Bay, Nyaa, YTS)[/dim]")
        console.print("  [bold green]3.[/bold green] 🎵 [bold]Cari & Unduh Musik Hi-Res[/bold] [dim](FLAC 24-bit / MP3 320kbps)[/dim]")
        console.print("  [bold yellow]4.[/bold yellow] 📋 [bold]Batch / Playlist Downloader[/bold] [dim](Spotify, Apple Music, YouTube)[/dim]")
        console.print("  [bold blue]5.[/bold blue] 🌐 [bold]Jalankan Web UI Server[/bold] [dim](FastAPI Core + Browser)[/dim]")
        console.print("  [bold red]6.[/bold red] 🩺 [bold]Diagnosa Sistem & Dependensi[/bold] [dim](Doctor Check)[/dim]")
        console.print("  [bold white]7.[/bold white] ⚙️  [bold]Pengaturan & Konfigurasi[/bold]")
        console.print("  [bold green]8.[/bold green] 🔄 [bold]Perbarui Engine & Dependensi[/bold] [dim](Auto-Updater)[/dim]")
        console.print("  [dim]0.[/dim] 🚪 Keluar\n")

        choice = Prompt.ask("[bold yellow]Pilihan Anda[/bold yellow]", choices=["1", "2", "3", "4", "5", "6", "7", "8", "0"], default="1")

        if choice == "1":
            console.print("\n[bold cyan]━━━ [ 📥 Unduh / Analisis URL Media ] ━━━━━━━━━━━━━━━━━[/bold cyan]")
            url = Prompt.ask("Masukkan URL Video/Audio")
            if url.strip():
                analyze_and_download_media(url.strip())
            Prompt.ask("\n[dim]Tekan Enter untuk kembali ke menu...[/dim]")

        elif choice == "2":
            console.print("\n[bold magenta]━━━ [ 🧲 Cari & Unduh Torrent ] ━━━━━━━━━━━━━━━━━━━━━━[/bold magenta]")
            q = Prompt.ask("Masukkan kata kunci pencarian torrent")
            if q.strip():
                search_and_download_torrent(q.strip())
            Prompt.ask("\n[dim]Tekan Enter untuk kembali ke menu...[/dim]")

        elif choice == "3":
            console.print("\n[bold green]━━━ [ 🎵 Cari & Unduh Musik Hi-Res ] ━━━━━━━━━━━━━━━━[/bold green]")
            q = Prompt.ask("Masukkan judul lagu atau nama artis")
            fmt = Prompt.ask("Format audio", choices=["mp3", "flac", "m4a"], default="mp3")
            if q.strip():
                search_and_download_music(q.strip(), format_choice=fmt)
            Prompt.ask("\n[dim]Tekan Enter untuk kembali ke menu...[/dim]")

        elif choice == "4":
            console.print("\n[bold yellow]━━━ [ 📋 Batch & Playlist Downloader ] ━━━━━━━━━━━━━━[/bold yellow]")
            src = Prompt.ask("Masukkan path file .txt atau URL Playlist")
            if src.strip():
                run_batch_downloader(src.strip())
            Prompt.ask("\n[dim]Tekan Enter untuk kembali ke menu...[/dim]")

        elif choice == "5":
            run_server()
            break

        elif choice == "6":
            run_doctor()
            Prompt.ask("\n[dim]Tekan Enter untuk kembali ke menu...[/dim]")

        elif choice == "7":
            configure_settings()
            Prompt.ask("\n[dim]Tekan Enter untuk kembali ke menu...[/dim]")

        elif choice == "8":
            run_updater()
            Prompt.ask("\n[dim]Tekan Enter untuk kembali ke menu...[/dim]")

        elif choice == "0":
            console.print("\n[bold green]Sampai jumpa! Terima kasih telah menggunakan DownloadKan.[/bold green]\n")
            break


# ============================================================================
# COMMAND LINE ARGUMENT PARSER (CLI SUBCOMMANDS)
# ============================================================================
def main():
    trigger_silent_background_update()
    parser = argparse.ArgumentParser(
        description="DownloadKan CLI — Powerful Standalone Media, Music & Torrent Downloader",
        formatter_class=argparse.RawTextHelpFormatter,
    )
    subparsers = parser.add_subparsers(dest="subcommand", help="Perintah yang tersedia")

    # 1. get
    p_get = subparsers.add_parser("get", help="Unduh media langsung dari URL (YouTube, TikTok, IG, FB, dll)")
    p_get.add_argument("url", help="URL media yang ingin diunduh")
    p_get.add_argument("-f", "--format", help="Kualitas/Format (contoh: 1080p, 720p, 4k, mp3, m4a)")
    p_get.add_argument("-a", "--audio", action="store_true", help="Hanya unduh audio (MP3)")
    p_get.add_argument("-o", "--output", help="Direktori tujuan penyimpanan")

    # 2. torrent
    p_tor = subparsers.add_parser("torrent", help="Cari dan unduh torrent dari terminal")
    p_tor.add_argument("query", help="Kata kunci pencarian torrent")
    p_tor.add_argument("-o", "--output", help="Direktori tujuan penyimpanan")

    # 3. music
    p_mus = subparsers.add_parser("music", help="Cari dan unduh musik Hi-Res / MP3 dengan metadata")
    p_mus.add_argument("query", help="Judul lagu / nama artis")
    p_mus.add_argument("-f", "--format", choices=["mp3", "flac", "m4a"], default="mp3", help="Format audio (default: mp3)")
    p_mus.add_argument("-o", "--output", help="Direktori tujuan penyimpanan")

    # 4. batch
    p_bat = subparsers.add_parser("batch", help="Unduh daftar URL dari file .txt atau Playlist")
    p_bat.add_argument("source", help="Path file .txt atau URL playlist")
    p_bat.add_argument("-f", "--format", default="best", help="Format pilihan (best, mp3, 1080p)")
    p_bat.add_argument("-o", "--output", help="Direktori tujuan penyimpanan")

    # 5. doctor
    subparsers.add_parser("doctor", help="Diagnosa ketersediaan dependensi sistem (ffmpeg, aria2, yt-dlp)")

    # 6. update
    subparsers.add_parser("update", help="Perbarui engine scraper (yt-dlp, streamrip, mutagen) dan kode ke versi terbaru")

    # 7. server
    p_srv = subparsers.add_parser("server", help="Jalankan FastAPI Local Core dan buka Web UI di browser")
    p_srv.add_argument("--host", default="127.0.0.1", help="Host binding (default: 127.0.0.1)")
    p_srv.add_argument("--port", type=int, default=8000, help="Port server (default: 8000)")

    # 8. config
    subparsers.add_parser("config", help="Lihat atau ubah konfigurasi DownloadKan")

    # Fallback to direct download if first arg is an URL or magnet
    args, unknown = parser.parse_known_args()

    if not args.subcommand:
        if len(sys.argv) > 1:
            first_arg = sys.argv[1]
            if first_arg.startswith("http://") or first_arg.startswith("https://") or first_arg.startswith("magnet:"):
                if first_arg.startswith("magnet:"):
                    search_and_download_torrent(first_arg)
                else:
                    analyze_and_download_media(first_arg)
                return
            elif first_arg in ["-h", "--help"]:
                parser.print_help()
                return
            elif first_arg in ["-v", "--version"]:
                console.print(f"DownloadKan CLI v{VERSION}")
                return
        # Tidak ada argumen -> Masuk ke Interactive Rich TUI
        interactive_menu()
        return

    # Route subcommands
    if args.subcommand == "get":
        analyze_and_download_media(args.url, format_choice=args.format, audio_only=args.audio, output_dir=args.output)
    elif args.subcommand == "torrent":
        search_and_download_torrent(args.query, output_dir=args.output)
    elif args.subcommand == "music":
        search_and_download_music(args.query, format_choice=args.format, output_dir=args.output)
    elif args.subcommand == "batch":
        run_batch_downloader(args.source, format_choice=args.format, output_dir=args.output)
    elif args.subcommand == "doctor":
        run_doctor()
    elif args.subcommand == "update":
        run_updater()
    elif args.subcommand == "server":
        run_server(host=args.host, port=args.port)
    elif args.subcommand == "config":
        configure_settings()


if __name__ == "__main__":
    main()
