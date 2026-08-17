"""
Generate ultra-crisp SVG screenshots of DownloadKan CLI & Rich TUI.
"""
import io
import sys
from pathlib import Path
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

out_dir = Path("docs/screenshots")
out_dir.mkdir(parents=True, exist_ok=True)

banner = r"""
  ____                      _                 _  __            
 |  _ \  _____      ___ __ | | ___   __ _  __| |/ /____ _ _ __  
 | | | |/ _ \ \ /\ / / '_ \| |/ _ \ / _` |/ _` | ' / _` | '_ \ 
 | |_| | (_) \ V  V /| | | | | (_) | (_| | (_| | . \ (_| | | | |
 |____/ \___/ \_/\_/ |_| |_|_|\___/ \__,_|\__,_|_|\_\__,_|_| |_|
            Standalone Core v2.2.0 - Terminal & Rich TUI
"""

# 1. MAIN RICH TUI MENU SCREENSHOT
buf_menu = io.StringIO()
console_menu = Console(record=True, width=90, file=buf_menu, force_terminal=True, color_system="truecolor")
console_menu.print(f"[bold cyan]{banner}[/bold cyan]")
menu_tbl = Table(show_header=True, header_style="bold yellow", box=None)
menu_tbl.add_column("No", style="bold cyan", width=4)
menu_tbl.add_column("Fitur & Menu Utama", style="bold white", width=38)
menu_tbl.add_column("Deskripsi & Mode", style="dim white")

menu_tbl.add_row("1", "[Unduh Media Cepat]", "YouTube, TikTok, IG, FB, dll (Video/Audio HD)")
menu_tbl.add_row("2", "[Unduh Musik Hi-Res / FLAC]", "Lossless Master 24-bit + Synced Lyrics + Tagging")
menu_tbl.add_row("3", "[Cari & Unduh Torrent]", "Multi-Indexer (TPB, Nyaa, YTS, TorLink) + Live Trackers")
menu_tbl.add_row("4", "[Batch & Playlist Queue]", "Unduh album penuh / playlist otomatis ke subfolder")
menu_tbl.add_row("5", "[Jalankan Web Server Core]", "Server backend FastAPI & Glassmorphism Web App")
menu_tbl.add_row("6", "[Diagnostik Sistem (Doctor)]", "Cek kelengkapan runtime: Python, ffmpeg, aria2, yt-dlp")
menu_tbl.add_row("7", "[Konfigurasi & Pengaturan]", "Atur direktori unduhan & opsi default")
menu_tbl.add_row("8", "[Cek Pembaruan Engine]", "Silent background updater & self-healing core")
menu_tbl.add_row("0", "[Keluar]", "Tutup aplikasi")

console_menu.print(Panel(menu_tbl, title="[bold green]DOWNLOADKAN TERMINAL DASHBOARD[/bold green]", border_style="cyan"))
console_menu.save_svg(str(out_dir / "tui_main_menu.svg"), title="DownloadKan TUI Main Dashboard")

# 2. DOCTOR DIAGNOSTICS SCREENSHOT
buf_doc = io.StringIO()
console_doc = Console(record=True, width=90, file=buf_doc, force_terminal=True, color_system="truecolor")
console_doc.print(f"[bold cyan]{banner}[/bold cyan]")
doc_tbl = Table(show_header=True, header_style="bold green")
doc_tbl.add_column("Perkakas / Modul", style="bold white", width=22)
doc_tbl.add_column("Tipe", style="cyan", width=14)
doc_tbl.add_column("Status", width=18)
doc_tbl.add_column("Versi / Detail", style="dim white")

doc_tbl.add_row("Python Core", "Runtime", "[bold green]OK Terpasang[/bold green]", "v3.14.2 (Native Runtime)")
doc_tbl.add_row("yt-dlp", "Media Engine", "[bold green]OK Terpasang[/bold green]", "v2026.07.04 (Latest Upstream)")
doc_tbl.add_row("aria2c", "Torrent/AIO", "[bold green]OK Terpasang[/bold green]", "v1.37.0 (16-Connection Engine)")
doc_tbl.add_row("ffmpeg", "Muxer/Audio", "[bold green]OK Terpasang[/bold green]", "ffmpeg v8.1.1 (Full Codec Pack)")
doc_tbl.add_row("streamrip", "FLAC Hi-Res", "[bold green]OK Terpasang[/bold green]", "Qobuz/Tidal/Deezer Lossless Ripper")
doc_tbl.add_row("mutagen", "ID3 Tagging", "[bold green]OK Terpasang[/bold green]", "v1.48.1 (1200x1200 Artwork Tag)")

console_doc.print(Panel(doc_tbl, title="[bold green]DIAGNOSTIK SISTEM & PERKAKAS NATIVE[/bold green]", border_style="green"))
console_doc.print("\n[bold cyan]Direktori Penyimpanan Default:[/bold cyan] [white]C:\\Users\\Downloads\\DownloadKan[/white]\n")
console_doc.save_svg(str(out_dir / "tui_doctor.svg"), title="DownloadKan System Diagnostics")

# 3. LOSSLESS MUSIC & ALBUM SCREENSHOT
buf_mus = io.StringIO()
console_mus = Console(record=True, width=90, file=buf_mus, force_terminal=True, color_system="truecolor")
console_mus.print("\n[bold yellow]=== [ Lossless FLAC & Album Studio Extractor ] ===[/bold yellow]")
console_mus.print("[cyan]Memindai Album / Playlist:[/cyan] [bold white]Reality Club - Never Get Better (13 Tracks)[/bold white]")
console_mus.print("[green]Auto-Subfolder Dibuat:[/green] [white]Downloads/DownloadKan/Music/Reality Club - Never Get Better/[/white]")
console_mus.print("[green]M3U Playlist Generated:[/green] [white]Never Get Better.m3u[/white]\n")

mus_tbl = Table(show_header=True, header_style="bold magenta")
mus_tbl.add_column("Track", style="bold cyan", width=6)
mus_tbl.add_column("Judul Lagu & Artis", style="bold white", width=38)
mus_tbl.add_column("Kualitas Audio", style="bold green", width=20)
mus_tbl.add_column("Cover Art & Lyrics", style="cyan")

mus_tbl.add_row("01", "Reality Club - Elastic Hearts", "FLAC Lossless (Level 8)", "1200x1200px + Synced LRC")
mus_tbl.add_row("02", "Reality Club - Things Move Fast", "FLAC Lossless (Level 8)", "1200x1200px + Synced LRC")
mus_tbl.add_row("03", "Reality Club - Shoulder", "FLAC Lossless (Level 8)", "1200x1200px + Synced LRC")
mus_tbl.add_row("04", "Reality Club - Okay", "FLAC Lossless (Level 8)", "1200x1200px + Synced LRC")
mus_tbl.add_row("05", "Reality Club - Mentions", "FLAC Lossless (Level 8)", "1200x1200px + Synced LRC")
mus_tbl.add_row("...", "8 Lagu Lainnya dalam Album...", "FLAC Lossless (Level 8)", "Auto Tagged Mutagen ID3")

console_mus.print(mus_tbl)
console_mus.print("\n[bold green]OK Total Unduhan: 13 Lagu (630.26 MB) - 100% Selesai & Terverifikasi![/bold green]\n")
console_mus.save_svg(str(out_dir / "tui_music_album.svg"), title="DownloadKan Lossless FLAC Album Downloader")

# 4. TORRENT AGGREGATOR SCREENSHOT
buf_tor = io.StringIO()
console_tor = Console(record=True, width=90, file=buf_tor, force_terminal=True, color_system="truecolor")
console_tor.print("\n[bold cyan]Hasil Pencarian Torrent Multi-Indexer (TPB, Nyaa, YTS, TorLink):[/bold cyan]")
tor_tbl = Table(show_header=True, header_style="bold yellow")
tor_tbl.add_column("No", style="bold cyan", width=4)
tor_tbl.add_column("Judul File / Torrent", style="bold white", width=40)
tor_tbl.add_column("Ukuran", style="green", width=10)
tor_tbl.add_column("Seed / Leech", style="magenta", width=14)
tor_tbl.add_column("Sumber", style="cyan")

tor_tbl.add_row("1", "Ubuntu 24.04.1 LTS Desktop ISO (x86_64)", "5.8 GB", "348 / 12", "TorLink Aggregator")
tor_tbl.add_row("2", "Arch Linux 2026 x86_64 Live System", "1.1 GB", "182 / 5", "TorLink Aggregator")
tor_tbl.add_row("3", "Debian 12.8 Bookworm Netinst ISO", "720 MB", "95 / 2", "The Pirate Bay")

console_tor.print(tor_tbl)
console_tor.print("\n[dim yellow]Auto-injeksi 7 Live High-Speed Trackers berhasil untuk kecepatan peer maksimal.[/dim yellow]\n")
console_tor.save_svg(str(out_dir / "tui_torrent_search.svg"), title="DownloadKan Multi-Indexer Torrent Search")

print("All CLI SVG screenshots generated successfully in docs/screenshots/")
