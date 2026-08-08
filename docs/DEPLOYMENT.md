# Production Deployment & Release Checklist — DownloadKan

> **Nama Produk:** DownloadKan
> **Environment:** Production (free tier)
> **Platform Target:** Cloudflare Pages (static + Pages Functions)
> **Versi:** v1.0

---

## 1. Pre-Flight Deployment Checklist

- [ ] `npm run build` sukses tanpa error (TS strict).
- [ ] Lint & unit test lulus (`npm run lint`, `npm run test:unit`).
- [ ] Tidak ada API key user yang bocor ke git (`.env*` ter-ignore).
- [ ] `functions/api/torrent-search.ts` diuji via `npx wrangler pages dev` (search berfungsi).
- [ ] Manual smoke media (TikTok/IG) & magnet sample di preview build.

---

## 2. Build & Deploy (Cloudflare Pages)

### Cara A — Dashboard (tanpa CLI, paling mudah untuk sekali pakai)
1. Publish aset `dist/` lewat dashboard Cloudflare → Pages → Create Project → Upload.
2. Settings: build command `npm run build`, output dir `dist`.
3. Pastikan Functions otomatis ter-deploy (folder `/functions` di akar proyek).

### Cara B — Git connected (disarankan)
1. Push repo ke GitHub/GitLab.
2. Di dashboard Cloudflare Pages → Connect to Git → pilih repo.
3. Build config: command `npm run build`, output `dist`. Cloudflare mendeteksi Functions otomatis.
4. Deploy setiap push (CI otomatis).

### Cara C — Wrangler CLI
```bash
npm run build
npx wrangler pages deploy dist --project-name=downloadkan
# atau (wrangler.jsonc sudah disiapkan)
npm run pages:deploy
```

### Prasyarat Functions
- Folder `/functions` di akar proyek (sudah ada): `api/torrent-search.ts` + `api/proxy/[[proxy]].ts`.
- `public/_headers` (security headers, termasuk CSP untuk WebTorrent: `connect-src https: wss: ws:`) &
  `public/_routes.json` (`include: ["/api/*"]`) otomatis ter-copy ke `dist/`.
- Local test: `npm run pages:dev` (port 8788) — jalankan `npm run build` dulu.

---

## 3. Environment / Config

- **Tidak ada env wajib untuk runtime** (SPA statis). Key media diambil dari `localStorage` user.
- Optional `.dev.vars` (lokal) hanya untuk testing — jangan di-commit.

---

## 4. Post-Deploy Health Check

- [ ] `https://<project>.pages.dev/` load 200, favicon & webmanifest ada.
- [ ] DevTools console: tidak ada CORS error saat analisis media Nezumi.
- [ ] `/api/torrent-search?q=test` mengembalikan JSON (bukan 500/CORS).
- [ ] Lighthouse ≥ 85 performance, ≥ 95 a11y (target).

---

## 5. Rollback Plan

- Cloudflare Pages menyediakan "Rollback to this deployment" di dashboard → satu klik kembali ke
  deployment sebelumnya.
- Simpan tag git untuk setiap rilis (`git tag v1.0.0`).

---
