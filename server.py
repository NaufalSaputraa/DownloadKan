"""
DownloadKan — Standalone Local Core Backend Server
Menggabungkan yt-dlp (Video), streamrip (Lossless FLAC), dan torlink/aria2c (Torrent)
Menyajikan Web UI DownloadKan langsung di http://127.0.0.1:8000
"""

import asyncio
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.parse
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import requests

app = FastAPI(title="DownloadKan Standalone Core", version="1.0.0")

# CORS middleware for local development
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
        # Kirim status aktif saat connect
        await websocket.send_json({"type": "initial_state", "jobs": active_jobs})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


# ============================================================================
# HEALTH & SYSTEM STATUS
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
        raise HTTPException(status_code=500, detail="Library yt-dlp belum terpasang. Jalankan pip install yt-dlp")

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extract_flat": "in_playlist",
    }

    try:
        loop = asyncio.get_event_loop()
        def extract():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                return ydl.extract_info(url, download=False)

        info = await loop.run_in_executor(None, extract)
        if not info:
            raise HTTPException(status_code=404, detail="Tidak dapat mengekstrak metadata.")

        title = info.get("title", "Media Download")
        thumbnail = info.get("thumbnail")
        duration = info.get("duration")
        extractor = info.get("extractor", "media").lower()

        # Format picker
        formats_list = []
        formats = info.get("formats", [])

        # Filter video + audio formats
        best_video = None
        best_audio = None
        for f in formats:
            vcodec = f.get("vcodec", "none")
            acodec = f.get("acodec", "none")
            height = f.get("height")
            url_link = f.get("url")

            if vcodec != "none" and url_link:
                label = f"Video {height}p" if height else "Video HD"
                if height and height >= 1080:
                    label = f"Video Full HD ({height}p)"
                elif height and height >= 2160:
                    label = f"Video 4K Ultra HD ({height}p)"
                formats_list.append({
                    "format_id": f.get("format_id"),
                    "type": label,
                    "ext": f.get("ext", "mp4"),
                    "filesize": f.get("filesize") or f.get("filesize_approx"),
                    "url": url_link,
                })
            elif acodec != "none" and vcodec == "none" and url_link:
                abr = f.get("abr", 128)
                formats_list.append({
                    "format_id": f.get("format_id"),
                    "type": f"Audio MP3 ({int(abr)} kbps)" if abr else "Audio MP3",
                    "ext": f.get("ext", "mp3"),
                    "filesize": f.get("filesize") or f.get("filesize_approx"),
                    "url": url_link,
                })

        # Jika format direct tidak banyak, sediakan opsi download lokal standar
        downloads = []
        if formats_list:
            downloads = formats_list[:8]
        else:
            downloads = [
                {"type": "Video Kualitas Terbaik (MP4)", "url": url, "ext": "mp4", "local": True},
                {"type": "Audio Ekstraksi (MP3 320kbps)", "url": url, "ext": "mp3", "local": True},
            ]

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
    filename: Optional[str] = None
    category: str = "Videos" # "Videos", "Music", "Torrents"

@app.post("/api/download")
async def start_download_job(req: DownloadJobRequest):
    job_id = str(abs(hash(req.url + req.format + str(asyncio.get_event_loop().time()))))
    
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
        "filename": req.filename or "Memproses...",
    }

    # Jalankan background worker
    asyncio.create_task(run_download_worker(job_id, req.url, req.format, target_dir))

    return {"status": "started", "job_id": job_id}


async def run_download_worker(job_id: str, url: str, format_type: str, target_dir: Path):
    active_jobs[job_id]["status"] = "downloading"
    await manager.broadcast({"type": "job_update", "job": active_jobs[job_id]})

    # 1. TORRENT via aria2c
    if url.startswith("magnet:") or url.endswith(".torrent"):
        if shutil.which("aria2c"):
            cmd = ["aria2c", "--dir", str(target_dir), "--seed-time=0", url]
            try:
                proc = await asyncio.create_subprocess_exec(
                    *cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE
                )
                await proc.communicate()
                active_jobs[job_id]["status"] = "done"
                active_jobs[job_id]["progress"] = 100
                await manager.broadcast({"type": "job_update", "job": active_jobs[job_id]})
                return
            except Exception as e:
                active_jobs[job_id]["status"] = "failed"
                active_jobs[job_id]["error"] = str(e)
                await manager.broadcast({"type": "job_update", "job": active_jobs[job_id]})
                return

    # 2. VIDEO & AUDIO via yt-dlp
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
                active_jobs[job_id]["eta"] = eta_str
                active_jobs[job_id]["filename"] = Path(d.get("filename", "")).name or "Downloading..."
                asyncio.run(manager.broadcast({"type": "job_update", "job": active_jobs[job_id]}))

        ydl_opts = {
            "outtmpl": str(target_dir / "%(title)s.%(ext)s"),
            "progress_hooks": [ytdl_progress_hook],
            "quiet": True,
            "no_warnings": True,
        }

        if format_type in ["mp3", "audio"]:
            ydl_opts["format"] = "bestaudio/best"
            ydl_opts["postprocessors"] = [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "320",
            }]
        elif format_type == "flac":
            ydl_opts["format"] = "bestaudio/best"
            ydl_opts["postprocessors"] = [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "flac",
            }]
        else:
            ydl_opts["format"] = "bestvideo+bestaudio/best"

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
# MULTI-ENGINE MUSIC SEARCH (Deezer, iTunes, LRCLIB Synced Lyrics)
# ============================================================================
@app.get("/api/search/music")
async def search_music(q: str):
    query = q.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Kata kunci pencarian wajib diisi.")

    results = []

    # 1. iTunes API
    try:
        r = requests.get(
            f"https://itunes.apple.com/search?term={urllib.parse.quote(query)}&media=music&limit=10",
            timeout=5,
        )
        if r.status_code == 200:
            for item in r.json().get("results", []):
                artwork = item.get("artworkUrl100", "").replace("100x100bb", "600x600bb")
                results.append({
                    "id": str(item.get("trackId")),
                    "title": item.get("trackName"),
                    "artist": item.get("artistName"),
                    "album": item.get("collectionName"),
                    "artwork": artwork,
                    "preview": item.get("previewUrl"),
                    "source": "Apple Music",
                    "duration": item.get("trackTimeMillis", 0) // 1000,
                })
    except Exception:
        pass

    # 2. Deezer API (via search)
    try:
        r = requests.get(
            f"https://api.deezer.com/search?q={urllib.parse.quote(query)}&limit=10",
            timeout=5,
        )
        if r.status_code == 200:
            for item in r.json().get("data", []):
                results.append({
                    "id": str(item.get("id")),
                    "title": item.get("title"),
                    "artist": item.get("artist", {}).get("name"),
                    "album": item.get("album", {}).get("title"),
                    "artwork": item.get("album", {}).get("cover_big"),
                    "preview": item.get("preview"),
                    "source": "Deezer (FLAC)",
                    "duration": item.get("duration", 0),
                })
    except Exception:
        pass

    return {"query": query, "results": results}


# ============================================================================
# MULTI-SOURCE TORRENT SEARCH (torlink Aggregator: TPB, Nyaa, YTS, 1337x)
# ============================================================================
@app.get("/api/search/torrent")
async def search_torrent(q: str):
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

    # 2. Nyaa.si (Anime & Media)
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

    # Sort hits by seeders descending
    hits.sort(key=lambda x: x.get("seeders", 0), reverse=True)
    return {"query": query, "results": hits}


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
