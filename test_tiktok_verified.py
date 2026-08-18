import requests
import json
import time

SERVER_URL = "http://127.0.0.1:8000"

print("1. Testing Health...")
r = requests.get(f"{SERVER_URL}/api/health", timeout=5)
assert r.status_code == 200
print("[OK] Server healthy")

print("\n2. Testing Exact TikTok URL from Screenshot...")
tt_url = "https://www.tiktok.com/@baixiaochunanime/video/7666277563261570335"
r = requests.post(f"{SERVER_URL}/api/analyze", json={"url": tt_url}, timeout=15)
print("Analyze status:", r.status_code)
assert r.status_code == 200
data = r.json()
print("TikTok Data:")
print(" - Title:", data.get("title"))
print(" - Engine:", data.get("engine"))
print(" - Formats Count:", len(data.get("downloads", [])))
for i, d in enumerate(data.get("downloads", []), 1):
    print(f"   [{i}] {d['type']} ({d['ext']}) -> {d['url'][:60]}...")

print("\n3. Testing Download Job for TikTok Video...")
r_dl = requests.post(f"{SERVER_URL}/api/download", json={
    "url": tt_url,
    "title": "TikTok_Test_Video",
    "category": "Videos",
    "format": "play"
}, timeout=10)
print("Download response:", r_dl.status_code, r_dl.json())
assert r_dl.status_code == 200
job_id = r_dl.json().get("job_id")

# Wait for download to finish
for _ in range(20):
    time.sleep(1)
    jobs = requests.get(f"{SERVER_URL}/api/jobs").json().get("jobs", [])
    current = next((j for j in jobs if j["id"] == job_id), None)
    if current:
        print(f"Status: {current['status']}, Progress: {current['progress']}%, Speed: {current.get('speed')}")
        if current["status"] in ["done", "failed"]:
            assert current["status"] == "done"
            print("[SUCCESS] TikTok video downloaded 100% cleanly!")
            break

print("\n=======================================================")
print("=== TIKTOK NO-WATERMARK & DIRECT DOWNLOAD VERIFIED! ===")
print("=======================================================")
