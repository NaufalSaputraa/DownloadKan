# Architecture Decision Record — ADR-001: Arsitektur Client-Side Tanpa Backend

> **Status:** Accepted
> **Tanggal:** 2026-08-08
> **Penulis:** Agent
> **Proyek:** LinkDownloader

---

## 1. Konteks (Context)

User ingin membuat downloader media sosial + torrent, tetapi **tidak memiliki server** dan ingin biaya $0.
Pertanyaan awal: apakah aplikasi web bisa bekerja tanpa backend? Riset membuktikan: Nezumi & Jerexd
CORS (via CF Pages Function free-tier), WebTorrent jalan di browser, dan pencarian torrent butuh bypass CORS juga.

## 2. Keputusan (Decision)

- App dibangun sebagai **SPA statis** (Vite + React + TS) di-hosting gratis (Cloudflare Pages).
- Semua logika (deteksi, analisis media, unduhan torrent P2P) dijalankan **di browser user**.
- Satu-satunya "server" adalah **Cloudflare Pages Function** (edge, free tier) sebagai **proxy CORS**
  untuk pencarian torrent — bukan server aplikasi.

## 3. Konsekuensi (Consequences)

### Dampak Positif (Pros):
- Biaya $0 (hosting gratis, P2P tanpa server).
- Privasi maksimal — tidak ada data di server.
- Deploy sederhana (file statis).

### Dampak Negatif / Trade-offs (Cons):
- Ketergantungan pada API pihak ketiga untuk media (uptime, pricing, rate limit).
- Pencarian torrent wajib lewat edge function (CORS).

## 4. Opsi Lain Yang Dipertimbangkan

- **Opsi A (Node/Express + yt-dlp self-host):** kontrol penuh, tapi butuh VPS & storage → tidak sesuai.
- **Opsi B (app desktop seperti Mori):** lebih mudah dalam CORS (native fetch), tapi bukan web.