# Architecture Decision Record — ADR-005: Porting Skraper Mori via Proxy untuk Platform yang Tidak Tercakup API

> **Status:** Proposed
> **Tanggal:** 2026-08-08
> **Penulis:** Agent
> **Proyek:** DownloadKan

---

## 1. Konteks (Context)

Nezumi & Jerexd mencakup banyak platform, tapi tidak semuanya: **Pixiv, Bilibili, Bandcamp,
Apple Music, RedNote (Xiaohongshu), Douyin, Facebook, Threads** kurang/terbatas. Mori (coflyn/Mori)
punya skraper siap pakai untuk 14 platform (`public/js/scrapers/*.js`) yang memanggil server
downloader pihak ketiga (SnapTik, TikTokIO, PinDown, dsb.).

Namun Mori dibangun untuk app native (Capacitor/Tauri) yang **bebas CORS**. Di browser web,
server skraper pihak ketiga tersebut **memblokir lintas-origin** — jadi tidak bisa dipanggil
langsung dari SPA.

## 2. Keputusan (Decision)

- **Jangan panggil skraper Mori langsung dari browser.**
- **Boleh di-porting** satu-per-satu: bungkus endpoint skraper pihak ketiga di balik **proxy
  `/api/proxy/{target}`** yang sudah ada (CF Pages Function / Vite dev-proxy) — pola yang sama
  persis dengan Nezumi/Jerexd.
- Skraper yang diporting mengimplementasikan kontrak `MediaEngine` yang sama
  (`src/engines/media/types.ts`) agar tetap bisa failover.

## 3. Konsekuensi (Consequences)

### Dampak Positif (Pros):
- Jangkauan platform bertambah tanpa server sendiri ($0).
- Meniru pola Mori (registry per-platform) yang memang menjadi DNA arsitektur DownloadKan.

### Dampak Negatif / Trade-offs (Cons):
- Skraper pihak ketiga bisa berubah/kena captcha kapan saja (butuh maintenance).
- Satu endpoint skraper = satu titik ketergantungan; harus dijaga daftar health.

## 4. Opsi Lain Yang Dipertimbangkan

- **Opsi A: skip skraper, andalkan Nezumi/Jerexd saja** — paling stabil tapi jangkauan terbatas.
- **Opsi B: self-host yt-dlp** — jangkauan terluas tapi butuh server (bertentangan ADR-001).

## 5. Kandidat Prioritas untuk Di-Porting

| Platform | Skraper Mori | Proxy target | Catatan |
| :--- | :--- | :--- | :--- |
| Pixiv | `pixiv.js` | `/api/proxy/mori-pixiv` | gallery + ugoira |
| Bilibili | `bilibili.js` | `/api/proxy/mori-bilibili` | DASH video/audio |
| Bandcamp | `bandcamp.js` | `/api/proxy/mori-bandcamp` | album/MP3 |
| Apple Music | `applemusic.js` | `/api/proxy/mori-applemusic` | MP3 |
| RedNote | `rednote.js` | `/api/proxy/mori-rednote` | foto/video |

*(Porting dilakukan bertahap; tiap skraper divalidasi endpoint-nya dulu seperti riset Fase 0.)*