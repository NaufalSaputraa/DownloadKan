# PLAN: DownloadKan — Roadmap & Task Breakdown

> **Objective:** Bangun DownloadKan — web downloader media sosial + torrent, 100% client-side, $0 biaya server.
> **Sumber Referensi:** [Mori](https://github.com/coflyn/Mori), [torlink](https://github.com/baairon/torlink), [Nezumi API](https://api.nezumi.eu.cc/), [Jerexd API](https://api.jerexd.my.id/)
> **Hasil Riset:** `docs/ARCHITECTURE.md` (fase 0 — CORS & endpoint sudah diverifikasi).

---

## Context

- Nezumi: `GET /api/download?apikey=NezumiApi&url=` — CORS **OK**, key publik gratis, response
  `result.downloads[]` berisi URL MP4/MP3 langsung.
- Jerexd: `GET /api/downloader/<slug>?url=` — CORS **OK**, wajib apikey user (401 tanpa key).
- YTS / TPB / Nyaa dari browser: **DIBLOKIR CORS** → wajib lewat Cloudflare Pages Function.
- WebTorrent: jalan **100% di browser** (P2P), tanpa server.

---

## Proposed Changes (struktur proyek)

```
DownloadKan/
├── functions/api/torrent-search.ts   # [NEW] Cloudflare Pages Function (proxy CORS)
├── src/engines/media/{index,nezumi,jerexd}.ts  # [NEW] engine registry + failover
├── src/engines/torrent/{webtorrent,search}.ts   # [NEW] WebTorrent wrapper + search client
├── src/utils/url-detect.ts           # [NEW] auto-deteksi media vs magnet
├── src/stores/                       # [NEW] localStorage (history + settings)
├── src/components/                   # [NEW] UI glassmorphism
├── docs/                             # [DONE] dokumentasi ini
└── AGENTS.md                         # [DONE] panduan agent
```

---

## Task Breakdown

| # | Task | Fase | Status |
|---|------|------|--------|
| 1 | Scaffold Vite + React + TS + Tailwind v4 | 1 | ✅ |
| 2 | Setup autoskills (deteksi stack) + hallmark | 1 | ✅ |
| 3 | `src/utils/url-detect.ts` (regex media + magnet) | 2 | ✅ |
| 4 | Engine Nezumi `nezumi.ts` | 2 | ✅ |
| 5 | Engine Jerexd `jerexd.ts` (key user dari settings) | 2 | ✅ |
| 6 | Registry + failover `index.ts` | 2 | ✅ |
| 7 | UI: SearchBar, MediaResult, preview + format pick | 2 | ✅ |
| 8 | `webtorrent.ts` (add, progress, save file) + useTorrent | 3 | ✅ |
| 9 | `functions/api/torrent-search.ts` (TPB apibay + Nyaa scrape) | 3 | ✅ |
| 10 | UI: TorrentPanel (magnet-start + search + progress) | 3 | ✅ |
| 11 | Settings (localStorage) + history media | 3 | ✅ |
| 12 | Polish glassmorphism + responsive | 4 | ⏳ |
| 13 | Deploy Cloudflare Pages (static + functions) | 4 | ⏳ |

---

## Verification Plan

- [x] `npm run dev` berjalan tanpa error.
- [x] `npm run build` sukses (TypeScript strict).
- [x] Analisis media YouTube nyata berhasil (MP4/MP3) via proxy Nezumi.
- [x] Magnet sample WebTorrent jalan — status "menghubungi peers…" + progress card (production preview).
- [x] Search torrent via middleware/function mengembalikan hasil TPB + Nyaa (bukan CORS error).
- [ ] localStorage history torrent tersimpan antar reload (sebagian: media sudah).

## Catatan Implementasi

- **Vite 8 = rolldown optimizer:** untuk WebTorrent gunakan `optimizeDeps.exclude: ['webtorrent']` +
  `include` semua dep CJS (debug, streamx, err-code, mime, block-iterator, …) + plugin
  `webtorrentBrowserStubs` (resolveId) untuk conn-pool/utp/nat-api yang di-`browser:false` → void 0.
  Build produksi terverifikasi 0 error (vite preview).
- **Mori:** skraper per-platform-nya TIDAK dipakai langsung (dibuat untuk app native bebas-CORS;
  server skraper pihak ketiga juga memblokir lintas-origin + rawan captcha). Yang diadopsi hanya
  **pola registry + failover** (sama seperti engine media). Skraper spesifik (Bilibili/Pixiv/Bandcamp)
  bisa di-porting di balik proxy bila perlu.

---