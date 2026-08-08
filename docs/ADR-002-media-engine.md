# Architecture Decision Record — ADR-002: Nezumi API sebagai Engine Media Utama + Jerexd Fallback

> **Status:** Accepted
> **Tanggal:** 2026-08-08
> **Penulis:** Agent
> **Proyek:** LinkDownloader

---

## 1. Konteks (Context)

Perlu penyedia unduhan media sosial (TikTok, IG, YouTube, X, Spotify, dll). Kandidat dari riset:
`api.nezumi.eu.cc` (gratis, key publik) dan `api.jerexd.my.id` (wajib apikey user). Diverifikasi langsung
di browser pada 2026-08-08:

| Aspek | Nezumi | Jerexd |
| :--- | :--- | :--- |
| CORS dari browser | ❌ blokir (lewat proxy `/api/proxy/nezumi`) | ❌ blokir (lewat proxy `/api/proxy/jerexd`) |
| API key | ✅ publik (`NezumiApi`) | ⚠️ wajib key user (401 tanpa) |
| Endpoint | `/api/download` (auto-detect), `/api/tiktok` | `/api/downloader/aio`, `/api/downloader/{slug}` |
| Response | `result.downloads[]` (URL MP4/MP3) | JSON per platform |

## 2. Keputusan (Decision)

- **Engine utama:** Nezumi (gratis, key publik, auto-detect banyak platform).
- **Engine fallback:** Jerexd — dipakai jika Nezumi gagal; key user diambil dari `localStorage`.
- Keduanya mengimplementasikan kontrak `MediaEngine` yang sama di `src/engines/media/`; registry
  mencoba berurutan hingga sukses.
- **KOREKSI (2026-08-08):** Keduanya **memblokir CORS cross-origin** (riset awal keliru karena diuji
  same-origin). Semua panggilan mesti lewat proxy `/api/proxy/{target}` — prod: CF Pages Function
  (free tier); dev: Vite dev-proxy. File unduhan tetap langsung dari CDN sumber.

## 3. Konsekuensi (Consequences)

### Dampak Positif (Pros):
- Resiliency: 2 sumber berbeda untuk satu request.
- Interface seragam memudahkan menambah engine baru nanti.

### Dampak Negatif / Trade-offs (Cons):
- Tergantung kebijakan API (rate limit, harga premium, perubahan format).
- Nezumi berorientasi bot WA/TG — endpoint bisa berubah tanpa pemberitahuan.

## 4. Opsi Lain Yang Dipertimbangkan

- **Opsi A: hanya 1 engine** — cepat dibuat tapi single point of failure.
- **Opsi B: yt-dlp self-host** — paling kuat tapi butuh server (bertentangan ADR-001).