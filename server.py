import os
import sys
import re
import json
import shutil
import asyncio
import subprocess
import urllib.parse
from pathlib import Path
from typing import Dict, List, Optional, Any

import requests
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

app = FastAPI(
    title="DownloadKan Standalone Local Core",
    version="2.0.0",
    description="Universal Media, FLAC Lossless & Torrent Downloader",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Direktori Download Default (Termux / Linux / macOS / Windows)
if os.path.exists("/data/data/com.termux/files/home/storage/downloads"):
    DOWNLOAD_DIR = Path("/data/data/com.termux/files/home/storage/downloads/DownloadKan")
elif "HOME" in os.environ:
    DOWNLOAD_DIR = Path(os.environ["HOME"]) / "Downloads" / "DownloadKan"
elif "USERPROFILE" in os.environ:
    DOWNLOAD_DIR = Path(os.environ["USERPROFILE"]) / "Downloads" / "DownloadKan"
else:
    DOWNLOAD_DIR = Path.cwd() / "downloads"

DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
(DOWNLOAD_DIR / "Music").mkdir(exist_ok=True)
(DOWNLOAD_DIR / "Videos").mkdir(exist_ok=True)
(DOWNLOAD_DIR / "Torrents").mkdir(exist_ok=True)


# ============================================================================
# WEBSOCKET MANAGER FOR REALTIME PROGRESS
# ============================================================================
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)


manager = ConnectionManager()
active_jobs: Dict[str, Dict[str, Any]] = {}


@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        await websocket.send_json({"type": "initial_state", "jobs": active_jobs})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


# ============================================================================
# HEALTH & ENVIRONMENT CHECK
# ============================================================================
@app.get("/api/health")
async def health_check():
    has_ffmpeg = shutil.which("ffmpeg") is not None
    has_aria2 = shutil.which("aria2c") is not None
    has_ytdlp = False
    has_streamrip = False

    try:
        import yt_dlp
        has_ytdlp = True
    except ImportError:
        pass

    try:
        import streamrip
        has_streamrip = True
    except ImportError:
        pass

    return {
        "status": "ok",
        "mode": "standalone_local",
        "downloadDir": str(DOWNLOAD_DIR),
        "engines": {
            "ytdlp": has_ytdlp,
            "streamrip": has_streamrip,
            "ffmpeg": has_ffmpeg,
            "aria2c": has_aria2,
        },
        "platform": sys.platform,
    }


# ============================================================================
# FILENAME SANITIZER (Clean & Tidy Names)
# ============================================================================
def sanitize_clean_name(name: str) -> str:
    if not name:
        return "DownloadKan_Media"
    # 1. Bersihkan noise / tag video YouTube yang mengganggu
    clean = re.sub(r"\[(Official Video|Official Audio|MV|HD|4K|Lyrics|Audio|Full Video|Remastered|4K Remaster|Video)\]", "", name, flags=re.IGNORECASE)
    clean = re.sub(r"\((Official Video|Official Audio|Official Music Video|MV|HD|4K|Lyrics|Audio|Full Video|Remastered|4K Remaster|Lyric Video|Audio Video)\)", "", clean, flags=re.IGNORECASE)
    # 2. Hapus karakter terlarang di Windows/Linux/Android/Termux
    clean = re.sub(r'[\\/*?:"<>|#]', "", clean)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean or "DownloadKan_Media"


# ============================================================================
# METADATA & LRCLIB LYRICS TAGGING HELPER (mutagen)
# ============================================================================
def fetch_lrclib_lyrics(title: str, artist: str, album: str = "", duration: int = 0) -> Optional[str]:
    try:
        params = {
            "track_name": title,
            "artist_name": artist,
        }
        if album:
            params["album_name"] = album
        if duration > 0:
            params["duration"] = str(duration)

        r = requests.get("https://lrclib.net/api/get", params=params, timeout=4)
        if r.status_code == 200:
            data = r.json()
            return data.get("syncedLyrics") or data.get("plainLyrics")
    except Exception:
        pass
    return None


def embed_mp3_metadata(file_path: Path, title: str, artist: str, album: str, cover_url: str = "", lyrics: str = ""):
    try:
        from mutagen.easyid3 import EasyID3
        from mutagen.id3 import ID3, APIC, USLT, ID3NoHeaderError

        try:
            audio = EasyID3(str(file_path))
        except ID3NoHeaderError:
            audio = EasyID3()
            audio.save(str(file_path))

        if title:
            audio["title"] = title
        if artist:
            audio["artist"] = artist
        if album:
            audio["album"] = album
        audio.save()

        # Cover Art & Lyrics via raw ID3
        id3 = ID3(str(file_path))
        if cover_url:
            try:
                cover_data = requests.get(cover_url, timeout=5).content
                id3.add(APIC(
                    encoding=3,
                    mime="image/jpeg",
                    type=3, # front cover
                    desc="Cover",
                    data=cover_data,
                ))
            except Exception:
                pass

        if lyrics:
            id3.add(USLT(encoding=3, lang="eng", desc="Lyrics", text=lyrics))

        id3.save(v2_version=3)
    except Exception as e:
        print(f"Warning: mutagen MP3 embed error: {e}")


def embed_flac_metadata(file_path: Path, title: str, artist: str, album: str, cover_url: str = "", lyrics: str = ""):
    try:
        from mutagen.flac import FLAC, Picture

        audio = FLAC(str(file_path))
        if title:
            audio["title"] = title
        if artist:
            audio["artist"] = artist
        if album:
            audio["album"] = album
        if lyrics:
            audio["lyrics"] = lyrics

        if cover_url:
            try:
                cover_data = requests.get(cover_url, timeout=5).content
                pic = Picture()
                pic.type = 3
                pic.mime = "image/jpeg"
                pic.desc = "Cover"
                pic.data = cover_data
                audio.add_picture(pic)
            except Exception:
                pass

        audio.save()
    except Exception as e:
        print(f"Warning: mutagen FLAC embed error: {e}")


# ============================================================================
# AUTOMATIC MOVIE SUBTITLE FETCHER (YTS-Subs & IMDb Suggest)
# ============================================================================
def clean_movie_title_and_year(raw_name: str) -> tuple[str, str]:
    cleaned = re.sub(r'\[.*?\]|\(.*?\)', '', raw_name)
    year_match = re.search(r'\b(19\d\d|20\d\d)\b', raw_name)
    year = year_match.group(1) if year_match else ""
    cleaned = re.split(r'\b(19\d\d|20\d\d|1080p|720p|2160p|4k|bluray|bdrip|webrip|web-dl|x264|x265|hevc|yify|yts|aac|dts)\b', cleaned, flags=re.IGNORECASE)[0]
    cleaned = cleaned.replace(".", " ").replace("_", " ").strip()
    return cleaned, year


def find_movie_imdb_id(title: str, year: str = "") -> Optional[str]:
    slug = re.sub(r'[^a-zA-Z0-9]', '_', title.lower())
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    try:
        r = requests.get(f"https://v3.sg.media-imdb.com/suggestion/x/{slug}.json", headers=headers, timeout=5)
        if r.status_code == 200:
            d = r.json()
            for item in d.get("d", []):
                if item.get("id", "").startswith("tt"):
                    return item.get("id")
    except Exception:
        pass
    return None


def fetch_movie_subtitles(imdb_id: str, languages=("indonesian", "english")) -> list[dict]:
    import base64
    from bs4 import BeautifulSoup
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    subtitles = []
    try:
        r = requests.get(f"https://yts-subs.com/movie-imdb/{imdb_id}", headers=headers, timeout=8)
        if r.status_code != 200:
            return []

        soup = BeautifulSoup(r.text, "html.parser")
        for row in soup.find_all("tr"):
            lang_td = row.find("span", class_="sub-lang")
            if not lang_td:
                continue
            lang_text = lang_td.get_text(strip=True).lower()
            matched_lang = next((l for l in languages if l in lang_text), None)
            if not matched_lang:
                continue

            a_tag = row.find("a", href=True)
            if not a_tag:
                continue

            sub_url = a_tag["href"]
            sub_page = f"https://yts-subs.com{sub_url}" if not sub_url.startswith("http") else sub_url

            sub_resp = requests.get(sub_page, headers=headers, timeout=6)
            if sub_resp.status_code == 200:
                sub_soup = BeautifulSoup(sub_resp.text, "html.parser")
                dl_tag = sub_soup.find("a", class_="download-subtitle")
                if dl_tag and dl_tag.get("data-link"):
                    direct_zip = base64.b64decode(dl_tag.get("data-link")).decode("utf-8")
                    subtitles.append({
                        "language": "Indonesian" if "indo" in lang_text else "English",
                        "lang_code": "id" if "indo" in lang_text else "en",
                        "title": a_tag.get_text(strip=True),
                        "zip_url": direct_zip,
                    })
                    if len([s for s in subtitles if s["lang_code"] == ("id" if "indo" in lang_text else "en")]) >= 2:
                        continue
    except Exception:
        pass
    return subtitles


def auto_save_movie_subtitles(raw_title: str, target_dir: Path, base_filename: str = "") -> list[str]:
    import zipfile, io
    clean_title, year = clean_movie_title_and_year(raw_title)
    imdb_id = find_movie_imdb_id(clean_title, year)
    if not imdb_id:
        return []

    subs = fetch_movie_subtitles(imdb_id)
    saved = []
    headers = {"User-Agent": "Mozilla/5.0"}

    for sub in subs:
        lang_code = sub["lang_code"]
        target_name = f"{base_filename or clean_title}.{lang_code}.srt"
        target_path = target_dir / target_name
        if target_path.exists():
            continue
        try:
            zr = requests.get(sub["zip_url"], headers=headers, timeout=8)
            if zr.status_code == 200:
                z = zipfile.ZipFile(io.BytesIO(zr.content))
                for fname in z.namelist():
                    if fname.endswith(".srt"):
                        srt_bytes = z.read(fname)
                        target_path.write_bytes(srt_bytes)
                        saved.append(str(target_path.name))
                        break
        except Exception:
            pass
    return saved


def parse_time_to_seconds(t_str: Optional[str]) -> Optional[float]:
    """Konversi waktu format '01:30' atau '01:15:30' atau '90' ke detik."""
    if not t_str:
        return None
    try:
        parts = t_str.strip().split(":")
        if len(parts) == 1:
            return float(parts[0])
        elif len(parts) == 2:
            return float(parts[0]) * 60 + float(parts[1])
        elif len(parts) == 3:
            return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])
    except Exception:
        pass
    return None


# ============================================================================
# UNIVERSAL MEDIA ANALYZER (yt-dlp)
# ============================================================================
class AnalyzeRequest(BaseModel):
    url: str

@app.post("/api/analyze")
async def analyze_url(req: AnalyzeRequest):
    url = req.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL wajib diisi.")

    try:
        import yt_dlp
    except ImportError:
        raise HTTPException(status_code=500, detail="Library yt-dlp belum terpasang.")

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "extract_flat": False,
        "skip_download": True,
    }

    try:
        loop = asyncio.get_event_loop()
        def extract():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                return ydl.extract_info(url, download=False)

        info = await loop.run_in_executor(None, extract)
        if not info:
            raise HTTPException(status_code=400, detail="Tidak dapat membaca media dari URL ini.")

        title = info.get("title", "Media Tanpa Judul")
        thumbnail = info.get("thumbnail")
        duration = info.get("duration")
        extractor = info.get("extractor", "media").lower()

        formats_list = []
        formats = info.get("formats", [])

        # Filter and group video & audio formats
        video_formats = {}
        audio_formats = {}

        for f in formats:
            vcodec = f.get("vcodec", "none")
            acodec = f.get("acodec", "none")
            height = f.get("height")
            fps = f.get("fps")
            filesize = f.get("filesize") or f.get("filesize_approx") or 0

            if vcodec != "none" and height and height >= 144:
                res_key = height
                fps_str = f" {int(fps)}fps" if fps and fps > 30 else ""
                if height >= 2160:
                    label = f"Video 4K Ultra HD (2160p{fps_str})"
                elif height >= 1440:
                    label = f"Video 2K Quad HD (1440p{fps_str})"
                elif height >= 1080:
                    label = f"Video Full HD (1080p{fps_str})"
                elif height >= 720:
                    label = f"Video HD (720p{fps_str})"
                elif height >= 480:
                    label = f"Video SD (480p)"
                elif height >= 360:
                    label = f"Video SD (360p)"
                else:
                    label = f"Video ({height}p)"

                if res_key not in video_formats or (filesize and filesize > video_formats[res_key].get("filesize", 0)):
                    video_formats[res_key] = {
                        "format_id": f.get("format_id"),
                        "type": label,
                        "ext": "mp4",
                        "height": height,
                        "filesize": filesize,
                        "url": f.get("url"),
                    }
            elif acodec != "none" and vcodec == "none":
                abr = int(f.get("abr", 0) or 0)
                if abr > 0:
                    audio_formats[abr] = {
                        "format_id": f.get("format_id"),
                        "type": f"Audio MP3 ({abr} kbps)",
                        "ext": "mp3",
                        "abr": abr,
                        "filesize": filesize,
                        "url": f.get("url"),
                    }

        # Sort video formats descending by resolution (4K -> 1440p -> 1080p -> 720p -> ...)
        sorted_videos = sorted(video_formats.values(), key=lambda x: x["height"], reverse=True)

        downloads = []
        # 1. Add Lossless FLAC & MP3 320k at the top
        downloads.append({
            "format_id": "bestaudio/best",
            "type": "Lossless FLAC Master (Studio)",
            "ext": "flac",
            "filesize": None,
            "url": url,
            "local": True,
        })
        downloads.append({
            "format_id": "bestaudio/best",
            "type": "Audio MP3 320k (HQ)",
            "ext": "mp3",
            "filesize": None,
            "url": url,
            "local": True,
        })

        # 2. Add Top Video Resolutions (4K, 2K, 1080p, 720p, 480p, 360p)
        for v in sorted_videos[:6]:
            downloads.append({
                "format_id": v["format_id"],
                "type": v["type"],
                "ext": "mp4",
                "filesize": v["filesize"],
                "url": v["url"] or url,
            })

        if not sorted_videos:
            downloads.append({
                "type": "Video Kualitas Terbaik (MP4)",
                "url": url,
                "ext": "mp4",
                "local": True,
            })

        return {
            "title": title,
            "thumbnail": thumbnail,
            "duration": duration,
            "platform": extractor,
            "sourceUrl": url,
            "downloads": downloads,
            "engine": "yt-dlp Standalone",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal menganalisis: {str(e)}")


# ============================================================================
# DOWNLOAD HANDLER (yt-dlp / streamrip / aria2)
# ============================================================================
class DownloadJobRequest(BaseModel):
    url: str
    format: str = "best" # "best_video", "mp3", "flac", "torrent"
    title: Optional[str] = None
    artist: Optional[str] = None
    album: Optional[str] = None
    artwork: Optional[str] = None
    category: str = "Videos" # "Videos", "Music", "Torrents"
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    subtitles: bool = False
    sub_lang: str = "id,en"

@app.post("/api/download")
async def start_download(req: DownloadJobRequest):
    job_id = f"job_{len(active_jobs) + 1}_{int(asyncio.get_event_loop().time())}"
    
    target_dir = DOWNLOAD_DIR / req.category
    target_dir.mkdir(parents=True, exist_ok=True)

    active_jobs[job_id] = {
        "id": job_id,
        "url": req.url,
        "format": req.format,
        "status": "starting",
        "progress": 0,
        "speed": "0 KB/s",
        "eta": "…",
        "filename": req.title or "Memproses...",
    }

    asyncio.create_task(run_download_worker(job_id, req, target_dir))
    return {"status": "started", "job_id": job_id}


async def run_download_worker(job_id: str, req: DownloadJobRequest, target_dir: Path):
    active_jobs[job_id]["status"] = "downloading"
    await manager.broadcast({"type": "job_update", "job": active_jobs[job_id]})

    url = req.url

    # 1. TORRENT via aria2c
    if url.startswith("magnet:") or url.endswith(".torrent"):
        if shutil.which("aria2c"):
            cmd = ["aria2c", "--dir", str(target_dir), "--seed-time=0", url]
            try:
                proc = await asyncio.create_subprocess_exec(
                    *cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE
                )
                await proc.communicate()
                # Auto-fetch Subtitle Indonesia & English untuk film torrent
                try:
                    loop = asyncio.get_event_loop()
                    await loop.run_in_executor(None, auto_save_movie_subtitles, req.title or url, target_dir)
                except Exception:
                    pass
                active_jobs[job_id]["status"] = "done"
                active_jobs[job_id]["progress"] = 100
                await manager.broadcast({"type": "job_update", "job": active_jobs[job_id]})
                return
            except Exception as e:
                active_jobs[job_id]["status"] = "failed"
                active_jobs[job_id]["error"] = str(e)
                await manager.broadcast({"type": "job_update", "job": active_jobs[job_id]})
                return

    # 2. AUDIO & MUSIC (SpotiFLAC Pattern + Mutagen Lyrics Embedding)
    if req.category == "Music" or req.format in ["mp3", "flac", "audio"]:
        try:
            import yt_dlp

            # Resolve query jika berupa teks judul/artis
            search_target = url
            if not url.startswith("http"):
                search_target = f"ytsearch1:{req.artist or ''} {req.title or url} audio"

            out_filename_base = f"{req.artist} - {req.title}" if (req.artist and req.title) else "%(title)s"

            def ytdl_progress_hook(d):
                if d["status"] == "downloading":
                    total = d.get("total_bytes") or d.get("total_bytes_estimate") or 1
                    downloaded = d.get("downloaded_bytes", 0)
                    pct = round((downloaded / total) * 100, 1)
                    speed_bytes = d.get("speed", 0) or 0
                    eta_s = d.get("eta", 0) or 0

                    speed_str = f"{speed_bytes / 1024 / 1024:.1f} MB/s" if speed_bytes > 1024 * 1024 else f"{speed_bytes / 1024:.0f} KB/s"
                    eta_str = f"{eta_s}s" if eta_s < 60 else f"{eta_s // 60}m {eta_s % 60}s"

                    active_jobs[job_id]["progress"] = pct
                    active_jobs[job_id]["speed"] = speed_str
                    active_jobs[job_id]["eta"] = eta_str
                    asyncio.run(manager.broadcast({"type": "job_update", "job": active_jobs[job_id]}))

            is_flac = req.format == "flac"
            final_ext = "flac" if is_flac else "mp3"
            
            ydl_opts = {
                "outtmpl": str(target_dir / f"{out_filename_base}.%(ext)s"),
                "progress_hooks": [ytdl_progress_hook],
                "quiet": True,
                "no_warnings": True,
                "format": "bestaudio/best",
                "extractor_args": {
                    "youtube": {
                        "player_client": ["android", "ios", "web"]
                    }
                },
                "postprocessors": [{
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": final_ext,
                    "preferredquality": "0" if is_flac else "320",
                }],
            }

            loop = asyncio.get_event_loop()
            def do_music_download():
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(search_target, download=True)
                    raw_title = req.title or info.get("title", "Track")
                    raw_artist = req.artist or info.get("artist") or info.get("uploader", "")
                    raw_album = req.album or ""

                    clean_title = sanitize_clean_name(raw_title)
                    clean_artist = sanitize_clean_name(raw_artist)
                    clean_album = sanitize_clean_name(raw_album)
                    
                    clean_filename = f"{clean_artist} - {clean_title}.{final_ext}" if clean_artist else f"{clean_title}.{final_ext}"
                    dest_path = target_dir / clean_filename

                    # Jika file terdownload dengan nama sementara yt-dlp, rename ke clean_filename
                    if not dest_path.exists():
                        for f in sorted(target_dir.glob(f"*.{final_ext}"), key=os.path.getmtime, reverse=True):
                            try:
                                f.rename(dest_path)
                            except Exception:
                                dest_path = f
                            break

                    # Ambil Lirik LRCLIB
                    lyrics_text = fetch_lrclib_lyrics(clean_title, clean_artist, clean_album, info.get("duration", 0))
                    if lyrics_text:
                        lrc_path = dest_path.with_suffix(".lrc")
                        try:
                            lrc_path.write_text(lyrics_text, encoding="utf-8")
                        except Exception:
                            pass

                    # Embed Tag & Cover Art Mutagen
                    cover = req.artwork or info.get("thumbnail", "")
                    if is_flac:
                        embed_flac_metadata(dest_path, clean_title, clean_artist, clean_album, cover, lyrics_text or "")
                    else:
                        embed_mp3_metadata(dest_path, clean_title, clean_artist, clean_album, cover, lyrics_text or "")

            await loop.run_in_executor(None, do_music_download)
            active_jobs[job_id]["status"] = "done"
            active_jobs[job_id]["progress"] = 100
            await manager.broadcast({"type": "job_update", "job": active_jobs[job_id]})
            return

        except Exception as err:
            active_jobs[job_id]["status"] = "failed"
            active_jobs[job_id]["error"] = str(err)
            await manager.broadcast({"type": "job_update", "job": active_jobs[job_id]})
            return

    # 3. VIDEO VIA yt-dlp
    try:
        import yt_dlp

        def ytdl_progress_hook(d):
            if d["status"] == "downloading":
                total = d.get("total_bytes") or d.get("total_bytes_estimate") or 1
                downloaded = d.get("downloaded_bytes", 0)
                pct = round((downloaded / total) * 100, 1)
                speed_bytes = d.get("speed", 0) or 0
                eta_s = d.get("eta", 0) or 0

                speed_str = f"{speed_bytes / 1024 / 1024:.1f} MB/s" if speed_bytes > 1024 * 1024 else f"{speed_bytes / 1024:.0f} KB/s"
                eta_str = f"{eta_s}s" if eta_s < 60 else f"{eta_s // 60}m {eta_s % 60}s"

                active_jobs[job_id]["progress"] = pct
                active_jobs[job_id]["speed"] = speed_str
        fmt_low = (req.format or "best").lower()
        if fmt_low == "2160p" or "4k" in fmt_low or "2160" in fmt_low:
            selected_fmt = "bestvideo[height<=2160]+bestaudio/best[height<=2160]/best"
        elif fmt_low == "1440p" or "2k" in fmt_low or "1440" in fmt_low:
            selected_fmt = "bestvideo[height<=1440]+bestaudio/best[height<=1440]/best"
        elif fmt_low == "1080p" or "full hd" in fmt_low or "1080" in fmt_low:
            selected_fmt = "bestvideo[height<=1080]+bestaudio/best[height<=1080]/best"
        elif fmt_low == "720p" or "720" in fmt_low:
            selected_fmt = "bestvideo[height<=720]+bestaudio/best[height<=720]/best"
        elif fmt_low == "480p" or "480" in fmt_low:
            selected_fmt = "bestvideo[height<=480]+bestaudio/best[height<=480]/best"
        elif fmt_low == "360p" or "360" in fmt_low:
            selected_fmt = "bestvideo[height<=360]+bestaudio/best[height<=360]/best"
        elif req.format and req.format not in ["best", "video"]:
            selected_fmt = req.format
        else:
            selected_fmt = "bestvideo+bestaudio/best"

        ydl_opts = {
            "outtmpl": str(target_dir / "%(title)s.%(ext)s"),
            "progress_hooks": [ytdl_progress_hook],
            "quiet": True,
            "no_warnings": True,
            "format": selected_fmt,
            "merge_output_format": "mp4",
            "postprocessors": [
                {
                    "key": "FFmpegVideoConvertor",
                    "preferedformat": "mp4",
                }
            ],
            "extractor_args": {
                "youtube": {
                    "player_client": ["web", "default"]
                }
            },
        }

        # Trimming rentang waktu
        start_sec = parse_time_to_seconds(req.start_time) or 0
        end_sec = parse_time_to_seconds(req.end_time)
        if start_sec > 0 or end_sec is not None:
            try:
                import yt_dlp.utils
                ydl_opts["download_ranges"] = yt_dlp.utils.download_range_func(None, [(start_sec, end_sec or float("inf"))])
                ydl_opts["force_keyframes_at_cuts"] = True
            except Exception:
                pass

        # Subtitles
        if req.subtitles:
            ydl_opts["writesubtitles"] = True
            ydl_opts["writeautomaticsub"] = True
            ydl_opts["subtitleslangs"] = [s.strip() for s in req.sub_lang.split(",")]
            ydl_opts["postprocessors"] = [{"key": "FFmpegEmbedSubtitle", "already_have_subtitle": False}]

        loop = asyncio.get_event_loop()
        def do_download():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])

        await loop.run_in_executor(None, do_download)
        active_jobs[job_id]["status"] = "done"
        active_jobs[job_id]["progress"] = 100
        await manager.broadcast({"type": "job_update", "job": active_jobs[job_id]})

    except Exception as err:
        active_jobs[job_id]["status"] = "failed"
        active_jobs[job_id]["error"] = str(err)
        await manager.broadcast({"type": "job_update", "job": active_jobs[job_id]})


# ============================================================================
# BATCH & PLAYLIST DOWNLOAD HANDLERS (Concurrency 3 Semaphore)
# ============================================================================
concurrency_semaphore = asyncio.Semaphore(3)

class BatchDownloadItem(BaseModel):
    url: str
    title: Optional[str] = None
    artist: Optional[str] = None
    album: Optional[str] = None
    artwork: Optional[str] = None

class BatchDownloadRequest(BaseModel):
    items: List[BatchDownloadItem]
    format: str = "mp3"  # mp3, flac, video
    category: str = "Music"
    playlist_name: Optional[str] = None

@app.post("/api/download/batch")
async def start_batch_download(req: BatchDownloadRequest):
    if not req.items:
        raise HTTPException(status_code=400, detail="Daftar item batch tidak boleh kosong.")

    base_dir = DOWNLOAD_DIR / req.category
    if req.playlist_name:
        target_dir = base_dir / sanitize_clean_name(req.playlist_name)
    else:
        target_dir = base_dir
    target_dir.mkdir(parents=True, exist_ok=True)
    queued_jobs = []

    async def run_bounded(job_id: str, job_req: DownloadJobRequest):
        async with concurrency_semaphore:
            await run_download_worker(job_id, job_req, target_dir)

    for i, item in enumerate(req.items):
        job_id = f"job_batch_{int(asyncio.get_event_loop().time())}_{i}_{os.urandom(3).hex()}"
        clean_title = sanitize_clean_name(item.title or "Track")
        clean_artist = sanitize_clean_name(item.artist or "")
        filename = f"{clean_artist} - {clean_title}.{req.format}" if clean_artist else f"{clean_title}.{req.format}"

        active_jobs[job_id] = {
            "id": job_id,
            "url": item.url,
            "format": req.format,
            "status": "starting",
            "progress": 0,
            "speed": "0 KB/s",
            "eta": "…",
            "filename": filename,
        }
        queued_jobs.append(job_id)

        job_req = DownloadJobRequest(
            url=item.url,
            format=req.format,
            title=item.title,
            artist=item.artist,
            album=item.album,
            artwork=item.artwork,
            category=req.category,
        )
        asyncio.create_task(run_bounded(job_id, job_req))

    return {"status": "queued", "count": len(queued_jobs), "job_ids": queued_jobs}


# ============================================================================
# PLAYLIST & ALBUM EXTRACTION (yt-dlp Flat & Apple Music/Spotify Extractor)
# ============================================================================
@app.post("/api/playlist/extract")
async def extract_playlist(req: AnalyzeRequest):
    url = req.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL wajib diisi.")

    try:
        import yt_dlp
        ydl_opts = {
            "extract_flat": True,
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
        }
        loop = asyncio.get_event_loop()
        def do_extract():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                return ydl.extract_info(url, download=False)

        info = await loop.run_in_executor(None, do_extract)
        if not info:
            raise Exception("Gagal mengekstrak informasi playlist.")

        entries = info.get("entries") or []
        items = []
        for i, entry in enumerate(entries):
            if not entry:
                continue
            dur = entry.get("duration", 0) or 0
            mins = int(dur // 60)
            secs = int(dur % 60)
            dur_str = f"{mins}:{secs:02d}" if dur else ""
            vid_url = entry.get("url") or f"https://www.youtube.com/watch?v={entry.get('id')}"
            items.append({
                "id": str(entry.get("id") or f"item_{i}"),
                "index": i + 1,
                "title": sanitize_clean_name(entry.get("title", "Track")),
                "artist": entry.get("uploader") or entry.get("channel") or info.get("uploader", ""),
                "duration": dur,
                "duration_str": dur_str,
                "thumbnail": entry.get("thumbnail") or info.get("thumbnail", ""),
                "url": vid_url,
            })

        return {
            "title": sanitize_clean_name(info.get("title", "Playlist")),
            "uploader": info.get("uploader") or info.get("channel", "Various Artists"),
            "thumbnail": info.get("thumbnail", ""),
            "item_count": len(items),
            "items": items,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal mengekstrak playlist: {str(e)}")


# ============================================================================
# IN-APP MEDIA STREAMING (Audio & Video Range Streaming)
# ============================================================================
@app.get("/api/stream/{category}/{filename}")
async def stream_media(category: str, filename: str):
    file_path = DOWNLOAD_DIR / category / filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File tidak ditemukan di disk lokal.")

    media_type = "application/octet-stream"
    if filename.endswith(".mp3"):
        media_type = "audio/mpeg"
    elif filename.endswith(".flac"):
        media_type = "audio/flac"
    elif filename.endswith(".mp4"):
        media_type = "video/mp4"
    elif filename.endswith(".lrc") or filename.endswith(".srt"):
        media_type = "text/plain; charset=utf-8"

    return FileResponse(file_path, media_type=media_type, filename=filename)


# ============================================================================
# LYRICS FETCHER (Local Disk .lrc & Live LRCLIB)
# ============================================================================
@app.get("/api/lyrics/get")
async def get_lyrics(title: str, artist: str = "", album: str = ""):
    clean_title = sanitize_clean_name(title)
    clean_artist = sanitize_clean_name(artist)

    # 1. Cek apakah ada file .lrc di folder Music
    for candidate in [
        DOWNLOAD_DIR / "Music" / f"{clean_artist} - {clean_title}.lrc",
        DOWNLOAD_DIR / "Music" / f"{clean_title}.lrc",
    ]:
        if candidate.exists():
            return {
                "title": clean_title,
                "artist": clean_artist,
                "lyrics": candidate.read_text(encoding="utf-8"),
                "source": "local_disk",
            }

    # 2. Ambil dari LRCLIB
    lrc_text = fetch_lrclib_lyrics(clean_title, clean_artist, album)
    return {
        "title": clean_title,
        "artist": clean_artist,
        "lyrics": lrc_text,
        "source": "lrclib" if lrc_text else "none",
    }


# ============================================================================
# 1-CLICK ENGINE UPDATER & HEALTH SELF-HEALING
# ============================================================================
@app.post("/api/system/update-engine")
async def update_engine_core():
    try:
        proc = await asyncio.create_subprocess_exec(
            sys.executable, "-m", "pip", "install", "--no-cache-dir", "--upgrade", "yt-dlp",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        out_msg = stdout.decode("utf-8", errors="ignore")

        import yt_dlp
        version = getattr(yt_dlp.version, "__version__", "Terbaru")
        return {
            "status": "success",
            "message": f"Engine yt-dlp berhasil diperbarui (v{version}).",
            "version": version,
            "log": out_msg[-300:] if out_msg else "",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal memperbarui engine: {str(e)}")


# ============================================================================
# UNIFIED MULTI-SEARCH (YouTube Video + YouTube Music + Lossless Tracks)
# ============================================================================
@app.get("/api/search/unified")
async def search_unified(q: str):
    query = q.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Kata kunci pencarian wajib diisi.")

    videos = []
    musics = []

    # 1. YouTube Video & Music search via yt-dlp flat search
    try:
        import yt_dlp
        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "extract_flat": True,
            "skip_download": True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            yt_res = ydl.extract_info(f"ytsearch25:{query}", download=False)
            if yt_res and "entries" in yt_res:
                for entry in yt_res["entries"]:
                    if not entry:
                        continue
                    dur = entry.get("duration", 0) or 0
                    mins = int(dur // 60)
                    secs = int(dur % 60)
                    dur_str = f"{mins}:{secs:02d}" if dur else ""
                    
                    vid_url = f"https://www.youtube.com/watch?v={entry.get('id')}"
                    thumb = entry.get("thumbnail") or f"https://i.ytimg.com/vi/{entry.get('id')}/hqdefault.jpg"

                    videos.append({
                        "id": entry.get("id"),
                        "title": entry.get("title"),
                        "channel": entry.get("uploader") or entry.get("channel"),
                        "duration": dur,
                        "duration_str": dur_str,
                        "thumbnail": thumb,
                        "url": vid_url,
                        "view_count": entry.get("view_count"),
                        "type": "video",
                        "source": "YouTube",
                    })
    except Exception as e:
        print(f"YouTube search notice: {e}")

    # 2. Lossless Music Search (iTunes / Apple Music / Deezer)
    try:
        r = requests.get(
            f"https://itunes.apple.com/search?term={urllib.parse.quote(query)}&media=music&country=ID&limit=60",
            timeout=6,
        )
        if r.status_code == 200:
            for item in r.json().get("results", []):
                artwork = item.get("artworkUrl100", "").replace("100x100bb", "1200x1200bb")
                dur_s = item.get("trackTimeMillis", 0) // 1000
                musics.append({
                    "id": f"music_{item.get('trackId')}",
                    "title": item.get("trackName"),
                    "artist": item.get("artistName"),
                    "album": item.get("collectionName"),
                    "artwork": artwork,
                    "preview": item.get("previewUrl"),
                    "duration": dur_s,
                    "duration_str": f"{dur_s // 60}:{dur_s % 60:02d}",
                    "type": "music",
                    "source": "Lossless / FLAC 24-bit",
                    "direct_url": item.get("trackViewUrl"),
                })
    except Exception:
        pass

    return {
        "query": query,
        "videos": videos,
        "musics": musics,
        "total": len(videos) + len(musics),
    }


@app.get("/api/search/music")
async def search_music(q: str):
    res = await search_unified(q)
    return {"query": q, "results": res["musics"]}


@app.get("/api/stream")
async def stream_audio_endpoint(q: Optional[str] = None, url: Optional[str] = None):
    """
    Ekstrak URL direct stream audio lengkap (mulai dari 00:00) untuk sinkronisasi lirik sempurna.
    """
    target = url or (f"ytsearch1:{q}" if q else None)
    if not target:
        raise HTTPException(status_code=400, detail="Query atau URL wajib diisi.")

    try:
        import yt_dlp
        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "format": "bestaudio/best",
            "extract_flat": False,
        }
        loop = asyncio.get_event_loop()
        def extract():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(target, download=False)
                if "entries" in info and info["entries"]:
                    info = info["entries"][0]
                return {
                    "stream_url": info.get("url"),
                    "title": info.get("title"),
                    "duration": info.get("duration"),
                    "thumbnail": info.get("thumbnail"),
                }
        data = await loop.run_in_executor(None, extract)
        if data.get("stream_url"):
            return data
        raise HTTPException(status_code=404, detail="Audio stream tidak ditemukan.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# MULTI-SOURCE TORRENT SEARCH (torlink Aggregator: TPB, Nyaa, YTS)
# ============================================================================
@app.get("/api/search/torrent")
async def search_torrent(q: str):
    import re
    query = q.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Kata kunci torrent wajib diisi.")

    hits = []

    # 1. The Pirate Bay (apibay.org)
    try:
        r = requests.get(
            f"https://apibay.org/q.php?q={urllib.parse.quote(query)}",
            timeout=5,
        )
        if r.status_code == 200:
            for item in r.json()[:15]:
                if item.get("name") and item.get("name") != "No results returned":
                    info_hash = item.get("info_hash")
                    seeders = int(item.get("seeders", 0))
                    size_bytes = int(item.get("size", 0))
                    size_str = f"{size_bytes / 1024 / 1024 / 1024:.1f} GB" if size_bytes > 1024*1024*1024 else f"{size_bytes / 1024 / 1024:.0f} MB"
                    hits.append({
                        "title": item.get("name"),
                        "size": size_str,
                        "seeders": seeders,
                        "leechers": int(item.get("leechers", 0)),
                        "magnet": f"magnet:?xt=urn:btih:{info_hash}&dn={urllib.parse.quote(item.get('name'))}",
                        "source": "TPB",
                    })
    except Exception:
        pass

    # 2. Nyaa.si
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
                    hits.append({
                        "title": title_m.group(1),
                        "size": size_m.group(1) if size_m else "N/A",
                        "seeders": int(seed_m.group(1)) if seed_m else 0,
                        "leechers": 0,
                        "magnet": magnet_m.group(1),
                        "source": "Nyaa",
                    })
    except Exception:
        pass

    hits.sort(key=lambda x: x.get("seeders", 0), reverse=True)
    return {"query": query, "results": hits}


# ============================================================================
# MOVIE SUBTITLE API ENDPOINTS
# ============================================================================
@app.get("/api/subtitles/search")
async def search_movie_subtitles_endpoint(title: str, year: str = ""):
    clean_title, y = clean_movie_title_and_year(title)
    imdb_id = find_movie_imdb_id(clean_title, year or y)
    if not imdb_id:
        return {"query": title, "clean_title": clean_title, "year": year or y, "imdb_id": None, "subtitles": []}

    loop = asyncio.get_event_loop()
    subs = await loop.run_in_executor(None, fetch_movie_subtitles, imdb_id)
    return {"query": title, "clean_title": clean_title, "year": year or y, "imdb_id": imdb_id, "subtitles": subs}


@app.post("/api/subtitles/auto-download")
async def auto_download_movie_subtitles_endpoint(title: str):
    target_dir = DOWNLOAD_DIR / "Torrents"
    loop = asyncio.get_event_loop()
    saved = await loop.run_in_executor(None, auto_save_movie_subtitles, title, target_dir)
    return {"status": "ok", "title": title, "saved_files": saved}


# ============================================================================
# SERVE STATIC FRONTEND BUNDLE (dist/)
# ============================================================================
DIST_DIR = Path(__file__).parent / "dist"
if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = DIST_DIR / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(DIST_DIR / "index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=False)
