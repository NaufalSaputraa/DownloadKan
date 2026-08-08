# DownloadKan (LinkDownloader) — Proyek & Panduan Agent

## Memori & Progress (Uteke/CorIn)

Ikuti protokol memori global (`~/.config/opencode/uteke-memory.md`):

1. **Sebelum mulai tugas**: `uteke_recall` dengan `namespace: "linkdownloader"`.
2. **Setelah selesai/mempelajari sesuatu**: `uteke_remember` dengan `namespace: "linkdownloader"` + tag
   (`#architecture`, `#fix`, `#preference`, `#convention`).
3. Server Uteke (port `8767`) mungkin tidak tersedia karena index di-lock CorIn (Windows) → **fallback
   lokal**: titik `./.agent/memory/MEMORY.md` — selalu perbarui file itu & `docs/*`.
4. Progress proyek dicatat di `./.agent/memory/MEMORY.md` dan `docs/PLAN.md`.

## Autoskill (Wajib)

- Pastikan `npx autoskills -y` pernah dijalankan di pohon ini (lock ada di `skills-lock.json`).
- Muat skill sesuai tugas via tool `skill` (list di system prompt `available_skills`).

## Gambaran Proyek

Downloader web **statis 100% client-side** ($0 biaya server) **bernama UI: "DownloadKan"** yang menggabungkan:
1. **Media downloader** (TikTok, Instagram, YouTube, X, Spotify, dll) via engine API publik:
   - **Nezumi API** (engine utama — key gratis `NezumiApi`, CORS OK)
   - **Jerexd API** (engine fallback — butuh API key user)
2. **Torrent**: 
   - **Download** via **WebTorrent** langsung di browser user (paste magnet/infohash)
   - **Search** via **Cloudflare Pages Function** (proxy CORS ke YTS/Nyaa/dll)

## Prinsip Arsitektur (Sangat Penting)

- **TANPA server/backend sendiri**: semua di browser user. Biaya $0.
- **Engine registry + failover** (pola Mori): coba engine 1 → gagal → engine 2.
- **CORS: engine media memblokir lintas-origin** (Nezumi & Jerexd). Semua panggilan analisis lewat
  proxy `/api/proxy/{target}` — prod: CF Pages Function; dev: Vite dev-proxy (vite.config.ts).
  File unduhan akhir tetap langsung dari CDN sumber.
- **Jangan pernah hardcode secret/API key di source code** — user key disimpan di `localStorage`.
- Semua unduhan torrent P2P (WebTorrent) **tidak melewati server kita**.

## Teknologi

- **Frontend:** Vite + React 19 + TypeScript + Tailwind CSS v4 + Framer Motion
- **Estetika UI:** Glassmorphism elegan (blur, translucency) ala Apple/mori — monokrom minimalis
- **Torrent client:** `webtorrent` (npm)
- **Edge Function:** Cloudflare Pages Function (`/functions/`) sebagai proxy CORS torrent search
- **Penyimpanan:** `localStorage` (history unduhan & API keys user)
- **Deploy:** Cloudflare Pages (gratis)

## Struktur Folder

```
LinkDownloader/
├── docs/                      # Dokumentasi proyek (PRD, arsitektur, dll)
├── functions/                # Cloudflare Pages Functions (torrent search proxy)
├── public/
├── src/
│   ├── engines/
│   │   ├── media/
│   │   │   ├── nezumi.ts     # engine Nezumi API
│   │   │   ├── jerexd.ts     # engine Jerexd API
│   │   │   └── index.ts      # registry + failover engine
│   │   └── torrent/
│   │       ├── webtorrent.ts # WebTorrent wrapper
│   │       └── search.ts     # hit Cloudflare function
│   ├── utils/
│   │   └── url-detect.ts     # auto-deteksi URL (media vs magnet)
│   ├── hooks/
│   ├── components/
│   ├── stores/               # localStorage-based state
│   ├── App.tsx
│   └── main.tsx
├── AGENTS.md
└── docs/
```

## Workflow yang Disepakati

1. Fase 0: RISET CORS & endpoint API — sudah selesai (hasil di `docs/ARCHITECTURE.md`).
2. Fase 1: Scaffold Vite + setup autoskill.
3. Fase 2: Implementasi engine media + URL detector.
4. Fase 3: Implementasi torrent (WebTorrent + search via function).
5. Fase 4: UI glassmorphism + polish + deploy ke Cloudflare Pages.

## Command Utama

- `npm run dev` — dev server Vite (media proxy + torrent search middleware)
- `npm run build` — build produksi
- `npm run preview` — pratinjau build lokal
- `npm run pages:dev` — lokaltes Cloudflare Pages (static + Functions, port 8788)
- `npm run pages:deploy` — deploy ke Cloudflare Pages (`--project-name=downloadkan`)

## Konvensi & Aturan

- Bahasa: respons & komentar kode dalam Bahasa Indonesia, kecuali nama variabel/fungsi (English).
- UI: **React + Tailwind**, komponen kecil modular di `src/components/`.
- Engine media mengimplementasikan kontrak interface sama (lihat `src/engines/media/index.ts`).
- TAMBAH API key jangan pernah ditulis di source code — ambil dari settings user (localStorage).
- Referensi dokumentasi: contoh templates di `docs/` (PRD, ADR, dll) — pakai struktur itu kalau menambah dokumen.