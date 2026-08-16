import requests

BASE = "http://127.0.0.1:8000"

def test_lyrics():
    print("\n1. Testing /api/lyrics/get ...")
    r = requests.get(f"{BASE}/api/lyrics/get?title=Yellow&artist=Coldplay")
    print(f"Status: {r.status_code}")
    data = r.json()
    print(f"Lyrics source: {data.get('source')}")
    print(f"Lyrics snippet:\n{data.get('lyrics', '')[:120]}...\n")
    assert r.status_code == 200
    assert data.get("lyrics") is not None

def test_update_engine():
    print("\n2. Testing /api/system/update-engine ...")
    r = requests.post(f"{BASE}/api/system/update-engine")
    print(f"Status: {r.status_code}")
    print(f"Response: {r.json()}\n")
    assert r.status_code == 200

def test_stream():
    print("\n3. Testing /api/stream/Music/Coldplay - Yellow.mp3 ...")
    r = requests.get(f"{BASE}/api/stream/Music/Coldplay%20-%20Yellow.mp3", stream=True)
    print(f"Status: {r.status_code}")
    print(f"Content-Type: {r.headers.get('Content-Type')}")
    print(f"Content-Length: {r.headers.get('Content-Length')}")
    assert r.status_code == 200

if __name__ == "__main__":
    test_lyrics()
    test_stream()
    test_update_engine()
    print("All backend tests PASSED 100%!")
