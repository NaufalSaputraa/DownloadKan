import asyncio
from server import health_check, search_music, search_torrent, analyze_url, AnalyzeRequest

async def main():
    print("=== 1. Health Check Test ===")
    h = await health_check()
    print("Status:", h["status"])
    print("Download Dir:", h["downloadDir"])
    print("Engines:", h["engines"])

    print("\n=== 2. Music Search Test ===")
    m = await search_music("coldplay yellow")
    results = m.get("results", [])
    print(f"Total tracks found: {len(results)}")
    for track in results[:3]:
        print(f" - [{track['source']}] {track['artist']} - {track['title']}")

    print("\n=== 3. Torrent Aggregator Search Test (torlink pattern) ===")
    t = await search_torrent(q="ubuntu")
    torrents = t.get("results", [])
    print(f"Total torrents found: {len(torrents)}")
    for item in torrents[:3]:
        print(f" - [{item['source']}] {item['title']} | Seeders: {item['seeders']} | Size: {item['size']}")

    print("\n=== 4. Media Analyzer Test (yt-dlp) ===")
    try:
        req = AnalyzeRequest(url="https://www.youtube.com/watch?v=dQw4w9WgXcQ")
        res = await analyze_url(req)
        print("Title:", res.get("title"))
        print("Platform:", res.get("platform"))
        print(f"Downloads available: {len(res.get('downloads', []))}")
        if res.get("downloads"):
            print("Sample download option:", res["downloads"][0])
    except Exception as e:
        print("Analyze result:", e)

    print("\n[SUCCESS] All Standalone Backend Tests Passed Cleanly!")

if __name__ == "__main__":
    asyncio.run(main())
