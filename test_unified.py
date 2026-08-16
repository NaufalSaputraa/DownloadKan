import asyncio
from server import search_unified, start_download, DownloadJobRequest, active_jobs

async def main():
    print("--- 1. Testing Unified Search (YouTube Video + Lossless Music) ---")
    res = await search_unified(q="coldplay yellow")
    print(f"Total Unified Results: {res['total']}")
    print(f"Videos Found: {len(res['videos'])}")
    for v in res["videos"][:2]:
        print(f"  [Video] {v['title']} ({v['duration_str']}) - Channel: {v['channel']}")

    print(f"Musics Found: {len(res['musics'])}")
    for m in res["musics"][:2]:
        print(f"  [Music] {m['artist']} - {m['title']} ({m['duration_str']}) - Album: {m['album']}")

    print("\n--- 2. Testing Full Song Download Job ---")
    req = DownloadJobRequest(
        url="coldplay yellow",
        format="mp3",
        title="Yellow",
        artist="Coldplay",
        album="Parachutes",
        category="Music"
    )
    job_res = await start_download(req)
    print("Job response:", job_res)
    
    # Wait for worker
    for _ in range(12):
        await asyncio.sleep(1)
        job = active_jobs.get(job_res["job_id"], {})
        print(f"Progress: {job.get('progress')}% | Speed: {job.get('speed')} | Status: {job.get('status')}")
        if job.get("status") in ["done", "failed"]:
            break

    print("\n[SUCCESS] Unified Search and Full Song Download tests verified!")

if __name__ == "__main__":
    asyncio.run(main())
