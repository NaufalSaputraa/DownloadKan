# Menghubungkan DownloadKan ke Git (Cloudflare Pages)

Agar env var `VITE_JEREXD_DEFAULT_KEY` (key Jerexd default) terbaca saat build di cloud, project
Pages harus terhubung ke GitHub lewat **Git integration**. Build di cloud akan menjalankan
`npm run build` dan membaca env var Production yang kamu set di dashboard.

> **Kenapa perlu?** Deploy via `wrangler pages deploy dist` itu build-lokal — env var dashboard
> tidak ikut. Git integration membuat Cloudflare yang build (di cloud), jadi env var terbaca.

---

## Langkah (dari dashboard Cloudflare)

1. **Login** ke [dash.cloudflare.com](https://dash.cloudflare.com).
2. Buka **Workers & Pages** → pilih project **`downloadkan`**.
3. Di menu kiri pilih **Settings** → **Builds & deployments**.
4. Di bagian **Build configurations**, isi:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** *(kosongkan / `/`)*
   - **Node.js version:** `22` (sesuai `.nvmrc`)
5. Di **Environment variables** (tab **Production**), tambahkan:
   - Nama: `VITE_JEREXD_DEFAULT_KEY`
   - Nilai: *(key Jerexd default kamu)*
6. Klik **Save**.

### Menghubungkan Git (jika project belum terhubung)
- Di halaman project, klik **"Create project" / "Connect to Git"** (atau di dashboard **Workers &
  Pages → Create application → Pages → Connect to Git**).
- Pilih repo **`NaufalSaputraa/DownloadKan`** → **Begin setup**.
- Pastikan build config di atas terisi → **Save and Deploy**.

> Catatan: jika project sudah dibuat lewat CLI (kasus kita), paling aman buat project Pages **baru**
> via Connect to Git (nama bebas, mis. `downloadkan-git`), set env var, lalu arahkan custom domain.
> Ini menghindari konflik konfigurasi antara project CLI dan project Git.

---

## Alternatif: GitHub Actions (tanpa dashboard)

Kalau mau deploy dari git tanpa connect Git di dashboard, pakai workflow Actions. Buat
`.github/workflows/deploy.yml` dengan secret `CLOUDFLARE_API_TOKEN` dan env
`VITE_JEREXD_DEFAULT_KEY` di **GitHub → Settings → Secrets and variables → Actions**.

```yaml
name: Deploy to Cloudflare Pages
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run build
        env:
          VITE_JEREXD_DEFAULT_KEY: ${{ secrets.VITE_JEREXD_DEFAULT_KEY }}
      - uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: 2e9b5d234a5ff40ceb2377f739e0718b
          projectName: downloadkan
          directory: dist
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

---

## Verifikasi setelah terhubung

- [ ] Deployment di cloud sukses (hijau di dashboard / Actions).
- [ ] Buka `https://downloadkan.pages.dev` → DevTools → Network → cari `index-*.js`.
- [ ] Isi JS memuat string key default (artinya env var terbaca saat build).
- [ ] Coba Analisis link Spotify tanpa mengisi key di Settings → harus berhasil (pakai key default).
