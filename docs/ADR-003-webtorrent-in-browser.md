# Architecture Decision Record — ADR-003: WebTorrent In-Browser untuk Unduhan Torrent

> **Status:** Accepted
> **Tanggal:** 2026-08-08
> **Penulis:** Agent
> **Proyek:** LinkDownloader

---

## 1. Konteks (Context)

Perlu menjalankan unduhan torrent tanpa server. Acuan: **torlink** — client torrent zero-setup yang punya
mode headless dan menekankan "files stay on your disk, nothing routes through a central server".
Apakah model web bisa memakai konsep yang sama?

## 2. Keputusan (Decision)

- **WebTorrent dijalankan di browser user**, bukan di server.
- User paste magnet/infohash → wrapper `src/engines/torrent/webtorrent.ts` → koneksi P2P/WebRTC langsung
  dari browser → API `torrent.on('download')` untuk progress → stream file ke browser user.
- Ini menjaga SPA statis (ADR-001): bandwidth P2P = bandwidth user, bukan server kita.

## 3. Konsekuensi (Consequences)

### Dampak Positif (Pros):
- Biaya $0 untuk bandwidth server; semakin banyak peers maka semakin cepat.
- Mengikuti prinsip torlink: private (tidak melalui server), seeding balik opsi otomatis.

### Dampak Negatif / Trade-offs (Cons):
- Bergantung seeder/peer aktif; magnet tanpa seeder akan mepet (perlu UX status & timeout).
- WebTorrent tidak 100% kompatibel dengan client BitTorrent klasik (webRTC vs tcp).

## 4. Opsi Lain Yang Dipertimbangkan

- **Opsi A: Torrent di server (libtorrent/aria2)** — membebani bandwidth server, butuh infra (konflik ADR-001).
- **Opsi B: layanan pihak ketiga (sail hybrid)** — mengandalkan pihak ketiga + biaya.