# Architecture Decision Record — ADR-004: Edge Function untuk Pencarian Torrent

> **Status:** Accepted
> **Tanggal:** 2026-08-08
> **Penulis:** AI
> **Proyek:** LinkDownloader

---

## 1. Konteks (Context)

Fitur "cari torrent" butuh mengakses sumber (YTS, 1337x, Nyaa). Riset buatan pada 2026-08-08 membuktikan
`yts.mx/api`, `apibay.org`, `nyaa.si/api` **diblokir CORS** dari browser (`TypeError: Failed to fetch`).
Tanpa alternatif, fitur ini tidak mungkin berjalan di SPA statis murni.

## 2. Keputusan (Decision)

- Pakai **Cloudflare Pages Function** (`functions/api/torrent-search.ts`) sebagai **proxy CORS** dan
  normalizer: memanggil sumber (YTS/Nyaa), menyusun hasil `{ title, size, seeders, magnet }`, dan
  mengembalikannya ke frontend (same-origin).
- Frontend memanggil `/api/torrent-search?q=...` — tanpa hambatan CORS.

## 3. Konsekuensi (Consequences)

### Dampak Positif (Pros):
- Fitur search jalan dengan free tier Pages/Workers ($0).
- Sumber yang diblokir CORS sangat mudah ditambah karena parsing dipusat di fungsi.

### Dampak Negatif / Trade-offs (Cons):
- Bergantung pada uptime/rate limit sumber eksternal (YTS, Nyaa).
- Perlu akun Cloudflare + konfigurasi deployment.

## 4. Opsi Lain Yang Dipertimbangkan

- **Opsi A: CORS proxy publik (corsproxy.io)** — tidak stabil & anti-abuse, bukan untuk produksi.
- **Opsi B: tanpa search, input magnet saja** — tetap valid sebagai MVP minimal (option).