# HANDOFF — DownloadKan (LinkDownloader)

> **Ditujukan untuk:** AI agent lain yang akan melanjutkan pekerjaan proyek ini.
> **Tanggal:** 2026-08-08
> **Cara pakai:** Baca dokumen ini dulu, lalu baca `AGENTS.md`, `.agent/memory/MEMORY.md`, dan `docs/` sesuai kebutuhan.
> **Memori lintas sesi:** server Uteke aktif di `http://127.0.0.1:8767` (namespace: `linkdownloader`). Jika tidak tersedia, pakai `.agent/memory/MEMORY.md`.

---

## 1. Ringkasan Proyek

**DownloadKan** adalah web downloader **100% client-side, $0 biaya server**, dengan 2 kemampuan utama:

1. **Unduh media sosial** (TikTok, Instagram, YouTube, X, Spotify, SoundCloud, dll.)
   via API pihak ketiga — engine utama **Nezumi** (gratis, key publik `NezumiApi`) + fallback **Jerexd**
   (butuh API key user).
2. **Torrent** — unduh lewat **WebTorrent** di browser (paste magnet/infohash), dan **pencarian** via
   Cloudflare Pages Function (proxy CORS ke TPB/Nyaa).

**Stack:** Vite 8 + React 19 + TypeScript (strict) + Tailwind CSS v4 + Framer Motion.
**Hosting:** Cloudflare Pages (statis + Pages Functions, gratis).
**Estetika:** glassmorphism premium ala Apple/Mori, monokrom, font Instrument Serif + Geist + Geist Mono
(disiplin anti-slop dari skill **Hallmark**).

---

## 2. Status Per Fase

| Fase | Isi | Status |
|------|-----|--------|
| **Fase 0** | Riset CORS & endpoint API | ✅ Selesai |
| **Fase 1** | Init repo, docs, scaffold, autoskill | ✅ Selesai |
| **Fase 2** | Engine media (Nezumi/Jerexd + registry failover) + URL detector + UI | ✅ Selesai |
| **Fase 3** | WebTorrent in-browser + torrent search (TPB/Nyaa) | ✅ Selesai |
| **Fase 4** | Polish (PWA/a11y/security) + deploy-ready | 🔶 Hampir tuntas — **tinggal deploy** |
| **Fase 5** | (Baru) Ekspansi platform via skraper Mori via proxy | ⏳ Belum |

**Semua fitur sudah TERVERIFIKASI di environment Cloudflare asli** (`npm run pages:dev`, port 8788):
proxy media → YouTube MP4/MP3 ✓, torrent search 40 hasil ✓, WebTorrent progress card ✓, build+lint 0 error ✓.

---

## 3. Arsitektur & Keputusan Kunci (Ringkas)

| Keputusan | Detail | Dokumen |
|-----------|--------|---------|
| **Tanpa backend** | Semua di browser; $0 | `docs/ADR-001` |
| **Engine registry + failover** | Coba engine 1 → gagal → engine 2 | `docs/ADR-002` |
| **WebTorrent in-browser** | P2P tanpa server | `docs/ADR-003` |
| **Edge Function untuk search** | CF Pages Function sebagai proxy CORS | `docs/ADR-004` |
| **Skraper Mori via proxy** (opsional) | Port skraper per-platform di balik `/api/proxy/` | `docs/ADR-005` |

**PENTING — koreksi riset (2026-08):** Nezumi & Jerexd **memblokir CORS cross-origin** (uji awal keliru
karena same-origin). Karena itu semua panggilan analisis media lewat **proxy** `/api/proxy/{target}`:
- dev: Vite dev-proxy (`vite.config.ts`)
- prod: CF Pages Function `functions/api/proxy/[[proxy]].ts`
File unduhan akhir tetap **langsung dari CDN sumber** (hanya metadata yang lewat prox).

---

## 4. Struktur Kode (Penting)

```
LinkDownloader/
├── functions/
│   ├── api/
│   │   ├── torrent-search.ts      # CF Function: cari torrent (TPB + Nyaa)
│   │   └── proxy/[[proxy]].ts     # CF Function catch-all: proxy CORS media
├── public/
│   ├── _headers                   # Security headers (CSP utk WebTorrent dll)
│   ├── _routes.json               # /api/* → Functions, sisanya statis
│   ├── favicon.svg, site.webmanifest
├── src/
│   ├── engines/
│   │   ├── media/
│   │   │   ├── types.ts           # kontrak MediaEngine / MediaResult
│   │   │   ├── nezumi.ts          # engine utama (key publik)
│   │   │   ├── jerexd.ts          # engine fallback (key user)
│   │   │   └── index.ts           # registry + failover dinamis
│   │   └── torrent/
│   │       ├── webtorrent.ts      # wrapper WebTorrent (add, progress, save)
│   │       ├── sources.ts         # logika search TPB apibay + Nyaa scrape
│   │       └── search.ts          # client panggil /api/torrent-search
│   ├── utils/
│   │   ├── url-detect.ts          # deteksi media vs magnet + platform
│   │   └── format.ts              # formatBytes/speed/ETA
│   ├── lib/
│   │   ├── storage.ts             # localStorage (settings + history)
│   │   └── proxy.ts               # buildProxyUrl helper
│   ├── hooks/                     # useMedia, useTorrent, useSettings, useToast
│   ├── components/                # SearchBar, MediaResult, TorrentPanel, SettingsSheet, ui/*
│   ├── polyfills.ts               # polyfill process/Buffer/global utk WebTorrent
│   ├── App.tsx, main.tsx, index.css
├── vite.config.ts                 # dev-proxy + WebTorrent stubs + torrent-search middleware
├── wrangler.jsonc                 # config CF Pages
├── AGENTS.md                      # panduan agent (WAJIB dibaca)
└── docs/                          # PRD, ARCHITECTURE, DESIGN, ADR-001..005, PLAN, dll.
```

---

## 5. Command Penting

| Command | Fungsi |
|---------|--------|
| `npm run dev` | Dev server Vite (port 5173, media proxy + torrent search middleware) |
| `npm run build` | Build produksi (TS strict + Vite) |
| `npm run lint` | oxlint (0 warning target) |
| `npm run preview` | Pratinjau build lokal |
| `npm run pages:dev` | Lokaltes Cloudflare Pages + Functions (port 8788) — **wajib build dulu** |
| `npm run pages:deploy` | Deploy ke Cloudflare Pages (butuh login CF) |

---

## 6. Kendala Teknis yang Sudah Dipecahkan (Jangan Ulangi dari Nol)

### 6.1. CORS API media (Nezumi/Jerexd)
Semua panggilan media **wajib lewat proxy** `/api/proxy/{target}`. Jangan panggil API langsung dari browser.

### 6.2. WebTorrent + Vite 8 (rolldown optimizer)
Ini yang paling rumit. Solusi yang sudah terbukti di `vite.config.ts`:
- `optimizeDeps.exclude: ['webtorrent']` (biarkan di-transform via pipeline)
- `optimizeDeps.include: [semua dep CJS]` (debug, streamx, err-code, mime, block-iterator, dll.)
- Plugin `webtorrentBrowserStubs` (resolveId → stub) untuk `conn-pool.js`, `utp.cjs`, `utp.js`,
  `utp-native`, `@silentbot1/nat-api` — yang di-`browser:false` menjadi `void 0` dan bikin
  `WebTorrent.UTP_SUPPORT` crash.
- `polyfills.ts` di-import di `main.tsx` (process/Buffer/global).
- `vite-plugin-node-polyfills` terpasang.
Jangan hapus/hapus konfigurasi ini tanpa tahu persis apa yang kamu lakukan.

### 6.3. Sumber torrent
- **TPB via `apibay.org`** (REST JSON, stabil) — YTS `yts.mx` DNS mati; Nyaa JSON API dihapus.
- **Nyaa** = HTML scrape via regex (tanpa DOM — aman untuk CF Worker).

### 6.4. CF Functions
- Catch-all proxy harus **`[[proxy]].ts`** (params key = `proxy`, bukan `proxy-path`).
- `public/_routes.json` membatasi `/api/*` ke Functions.

---

## 7. Konvensi & Aturan (Ringkas — detail di `AGENTS.md`)

- Bahasa respons & komentar kode: **Bahasa Indonesia**; nama variabel/fungsi English.
- **Jangan pernah commit API key / secret** — key user (Jerexd) disimpan di localStorage lewat Settings.
- UI: React + Tailwind, komponen modular di `src/components/`.
- Engine baru harus implement kontrak `MediaEngine` (`src/engines/media/types.ts`) + daftar di registry.
- Sebelum mulai tugas: `uteke_recall` namespace `linkdownloader`; setelah selesai: `uteke_remember`
  (fallback: `.agent/memory/MEMORY.md`).
- Jalankan `npx autoskills -y` jika skill stack berubah; muat skill via tool `skill` saat sesuai.

---

## 8. Yang Belum / Harus Dilakukan (TODO)

### 🔴 Deploy (tinggal 1 langkah besar)
- [ ] `npx wrangler login` (akun Cloudflare user) lalu `npm run pages:deploy`
      → project `downloadkan` di `*.pages.dev`.
- [ ] Setelah deploy: verifikasi `_headers` (CSP), proxy media, torrent search di domain live.

### 🟡 Peningkatan yang masuk akal
- [x] **Dukungan IDM / ABDM / Download Manager**: link unduhan direct dengan atribut `download` & tombol "Salin Tautan" instan.
- [x] **History torrent** penuh (otomatis dicatat ke `localStorage` via `pushHistory`).
- [x] **UI Settings Engine Health**: indikator visual status & skor sukses per engine (`Nezumi`, `Jerexd`).
- [x] **PWA installable & offline shell**: Service Worker (`public/sw.js`) dibuat & terintegrasi.
- [x] **Porting skraper Mori Engine**: `src/engines/media/mori.ts` dibuat untuk platform prioritas utama (**Pixiv** via `pixiv.re`, **Apple Music** via iTunes API, **Bandcamp** MP3 audio stream, **X / Twitter**, **Facebook**, dan **Threads**). Terdaftar sebagai engine utama di `mediaEngines` registry.

### 🟢 Nice to have
- [ ] PDF exporter galeri (seperti Mori).
- [ ] Share-target dari HP ke aplikasi.
- [ ] Autentikasi PIN lokal untuk menyembunyikan riwayat.

---

## 9. Risiko yang Perlu Diingat

- **Ketergantungan API pihak ketiga** (Nezumi/Jerexd) — bisa berubah format/mati kapan saja;
  registry + failover adalah pengaman utama.
- **Audit npm `ip` (high)** via `webtorrent` → jangan downgrade (breaking), dampak di browser rendah.
- **CSP `connect-src`** harus mengizinkan `wss:`/`ws:`/`https:` untuk WebTorrent + proxy — jangan
  disempitkan tanpa uji torrent.
- **Sumber skraper Mori** rawan captcha/berubah — validasi endpoint sebelum porting (pola riset Fase 0).

---

*Dokumen ini adalah panduan handoff. Bacaan pendukung: `AGENTS.md`, `.agent/memory/MEMORY.md`,
`docs/PLAN.md`, `docs/ARCHITECTURE.md`, `docs/PRD.md`, `docs/DESIGN.md`, `docs/ADR-001..005`.*