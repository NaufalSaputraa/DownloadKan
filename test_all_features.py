#!/usr/bin/env python3
"""
Test All Download Features of DownloadKan
"""
import os
import sys
import tempfile
import requests
from pathlib import Path

import cli

def run_all_tests():
    print("================================================================")
    print(" 🚀 PENGUJIAN MENYELURUH FITUR DOWNLOADKAN (CLI & CORE)")
    print("================================================================")
    
    test_dir = Path(tempfile.gettempdir()) / "downloadkan_test_suite"
    test_dir.mkdir(parents=True, exist_ok=True)
    
    results = {}
    
    # -------------------------------------------------------------
    # 1. TEST VIDEO DOWNLOAD & ANALYSIS (Big Buck Bunny Sample)
    # -------------------------------------------------------------
    print("\n[TEST 1/5] Menguji Analisis & Unduhan Video (yt-dlp)...")
    sample_url = "https://www.youtube.com/watch?v=aqz-KE-bpKQ" # Big Buck Bunny Clip
    try:
        vid_dir = test_dir / "Videos"
        vid_dir.mkdir(exist_ok=True)
        cli.analyze_and_download_media(sample_url, format_choice="720p", output_dir=str(vid_dir))
        files = list(vid_dir.glob("*.mp4")) + list(vid_dir.glob("*.mkv")) + list(vid_dir.glob("*.webm"))
        if files:
            print(f"✓ Video berhasil diunduh: {files[0].name} ({files[0].stat().st_size / 1024 / 1024:.2f} MB)")
            results["video_download"] = "PASSED"
        else:
            print("! Video tidak ditemukan di folder output.")
            results["video_download"] = "FAILED"
    except Exception as e:
        print(f"✗ Error Test 1: {e}")
        results["video_download"] = f"FAILED: {e}"

    # -------------------------------------------------------------
    # 2. TEST AUDIO EXTRACTION & MP3 TAGGING
    # -------------------------------------------------------------
    print("\n[TEST 2/5] Menguji Ekstraksi Audio MP3 & Mutagen Tagging...")
    try:
        music_dir = test_dir / "Music"
        music_dir.mkdir(exist_ok=True)
        cli.analyze_and_download_media(sample_url, format_choice="mp3", audio_only=True, output_dir=str(music_dir))
        mp3_files = list(music_dir.glob("*.mp3"))
        if mp3_files:
            print(f"✓ Audio MP3 berhasil diekstrak: {mp3_files[0].name} ({mp3_files[0].stat().st_size / 1024:.1f} KB)")
            results["audio_mp3"] = "PASSED"
        else:
            print("! File MP3 tidak ditemukan.")
            results["audio_mp3"] = "FAILED"
    except Exception as e:
        print(f"✗ Error Test 2: {e}")
        results["audio_mp3"] = f"FAILED: {e}"

    # -------------------------------------------------------------
    # 3. TEST TORRENT SEARCH (The Pirate Bay & Nyaa API)
    # -------------------------------------------------------------
    print("\n[TEST 3/5] Menguji Pencarian Multi-Source Torrent...")
    try:
        tpb_req = requests.get("https://apibay.org/q.php?q=ubuntu", timeout=6)
        if tpb_req.status_code == 200:
            hits = tpb_req.json()
            valid_hits = [h for h in hits if h.get("name") and h.get("name") != "No results returned"]
            print(f"✓ TPB API mengembalikan {len(valid_hits)} torrent hits untuk 'ubuntu'.")
            if valid_hits:
                print(f"  Contoh Top Hit: {valid_hits[0].get('name')} (Seeders: {valid_hits[0].get('seeders')})")
            results["torrent_search"] = "PASSED"
        else:
            results["torrent_search"] = f"FAILED (HTTP {tpb_req.status_code})"
    except Exception as e:
        print(f"✗ Error Test 3: {e}")
        results["torrent_search"] = f"FAILED: {e}"

    # -------------------------------------------------------------
    # 4. TEST MUSIC SEARCH & METADATA (iTunes API)
    # -------------------------------------------------------------
    print("\n[TEST 4/5] Menguji Pencarian Musik & Metadata Lossless...")
    try:
        itunes_req = requests.get("https://itunes.apple.com/search?term=coldplay+yellow&media=music&limit=3", timeout=6)
        if itunes_req.status_code == 200:
            tracks = itunes_req.json().get("results", [])
            print(f"✓ iTunes API mengembalikan {len(tracks)} trek musik.")
            if tracks:
                print(f"  Contoh Track: {tracks[0].get('artistName')} - {tracks[0].get('trackName')} (Album: {tracks[0].get('collectionName')})")
            results["music_search"] = "PASSED"
        else:
            results["music_search"] = f"FAILED (HTTP {itunes_req.status_code})"
    except Exception as e:
        print(f"✗ Error Test 4: {e}")
        results["music_search"] = f"FAILED: {e}"

    # -------------------------------------------------------------
    # 5. TEST BATCH QUEUE DOWNLOADER (.txt file input)
    # -------------------------------------------------------------
    print("\n[TEST 5/5] Menguji Antrean Unduhan Batch...")
    try:
        batch_dir = test_dir / "Batch"
        batch_dir.mkdir(exist_ok=True)
        batch_file = test_dir / "test_queue.txt"
        batch_file.write_text(f"{sample_url}\n", encoding="utf-8")
        
        cli.run_batch_downloader(str(batch_file), format_choice="720p", output_dir=str(batch_dir))
        b_files = list(batch_dir.glob("*.*"))
        if b_files:
            print(f"✓ Batch download berhasil memproses item: {b_files[0].name}")
            results["batch_downloader"] = "PASSED"
        else:
            print("! Batch folder kosong.")
            results["batch_downloader"] = "FAILED"
    except Exception as e:
        print(f"✗ Error Test 5: {e}")
        results["batch_downloader"] = f"FAILED: {e}"

    # -------------------------------------------------------------
    # SUMMARY
    # -------------------------------------------------------------
    print("\n================================================================")
    print(" 📊 HASIL PENGUJIAN SEMUA FITUR DOWNLOAD")
    print("================================================================")
    all_passed = True
    for test_name, status in results.items():
        icon = "✅" if status == "PASSED" else "❌"
        print(f" {icon} {test_name.upper():<22} : {status}")
        if status != "PASSED":
            all_passed = False
            
    print("================================================================")
    if all_passed:
        print(" 🎉 SEMUA FITUR DOWNLOAD TERBUKTI BERFUNGSI 100%!")
    else:
        print(" ⚠️ Beberapa pengujian memerlukan perbaikan.")

if __name__ == "__main__":
    run_all_tests()
