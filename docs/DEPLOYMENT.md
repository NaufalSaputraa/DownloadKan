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

- **`VITE_JEREXD_DEFAULT_KEY`** (untuk produksi): key Jerexd default (fallback). Dibaca **saat build**
  oleh Vite (di-inline ke bundle JS). Cara set yang PASTI bekerja: **GitHub Actions** — workflow di
  `.github/workflows/deploy.yml` meng-inject `VITE_JEREXD_DEFAULT_KEY` dari GitHub secret saat
  `npm run build`. (Environment variable di dashboard Cloudflare juga bisa, tapi tidak seandalkan
  Secret Pages untuk `VITE_*` — Secret hanya untuk runtime Functions.) Lokal: `.env` (jangan di-commit).
- `TELEGRAM_BOT_TOKEN` (secret, untuk bot webhook): set via `npx wrangler pages secret put TELEGRAM_BOT_TOKEN`.
- Tidak ada env runtime lain yang wajib.

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
