# Menghubungkan DownloadKan ke Git (Cloudflare Pages)

Agar env var `VITE_JEREXD_DEFAULT_KEY` (key Jerexd default) terbaca saat build di cloud, build harus
menjalankan `npm run build` dengan env var tersedia **saat build time** (Vite meng-inline `VITE_*`
ke bundle JS — bukan dibaca saat runtime).

> **⚠️ PENTING — Secret vs Environment variable:**
> - `VITE_*` dibaca **saat build** oleh Vite. Set sebagai **Environment variable (plain)** di build
>   process, ATAU injeksi via GitHub Actions.
> - **Secret Cloudflare Pages** hanya tersedia untuk **runtime Functions** (`context.env`) — **TIDAK
>   dijamin tersedia saat build**. Jangan andalkan Secret Pages untuk `VITE_*`.
> - Nilai `VITE_*` selalu terlihat di DevTools (ter-inline plain text) — ini sifat client-side,
>   bukan "rahasia" yang aman.

---

## Cara TERBAIK: GitHub Actions (disarankan)

Workflow sudah disiapkan di `.github/workflows/deploy.yml`. Build berjalan di GitHub (env di-inject
pasti terbaca), lalu di-deploy ke Cloudflare Pages.

### Setup (1 kali)
1. Buat **API token Cloudflare**: dashboard → My Profile → API Tokens → Create Token →
   template **"Edit Cloudflare Workers"** (beri izin `Workers Scripts: Edit` pada akun).
2. Di GitHub repo → **Settings → Secrets and variables → Actions**, tambah 2 secrets:
   - `CLOUDFLARE_API_TOKEN` = token di atas
   - `VITE_JEREXD_DEFAULT_KEY` = key Jerexd default kamu
3. Push ke `main` → Actions otomatis build + deploy.
4. (Opsional) Cek deployment: dashboard Pages → project → Deployments.

> Keuntungan: env di-inject eksplisit saat build (bebas dari quirk dashboard), dan `dist` tidak
> perlu di-commit.

---

## Cara lama: Build configuration di dashboard

Jika tetap mau via dashboard (tanpa Actions):

1. **Login** ke [dash.cloudflare.com](https://dash.cloudflare.com).
2. Buka **Workers & Pages** → pilih project **`downloadkan`**.
3. Di menu kiri pilih **Settings** → **Builds & deployments**.
4. Di bagian **Build configurations**, isi:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** *(kosongkan / `/`)*
   - **Node.js version:** `22` (sesuai `.nvmrc`)
5. Di **Environment variables** (tab **Production**), tambahkan **Environment variable (plain)**:
   - Nama: `VITE_JEREXD_DEFAULT_KEY`
   - Nilai: *(key Jerexd default kamu)*
6. Klik **Save** → Deploy.

> ⚠️ Jika kamu sudah menambahkan `VITE_JEREXD_DEFAULT_KEY` sebagai **Secret** di dashboard: untuk
> `VITE_*` lebih baik dijadikan **Environment variable** (lihat catatan di atas), atau pakai GitHub
> Actions agar ter-inject saat build.

### Menghubungkan Git (jika project belum terhubung)
- Di dashboard **Workers & Pages → Create application → Pages → Connect to Git**.
- Pilih repo **`NaufalSaputraa/DownloadKan`** → **Begin setup**.
- Isi build config di atas → **Save and Deploy**.

---

## Verifikasi setelah terhubung

- [ ] Deployment di cloud sukses (hijau di dashboard / Actions).
- [ ] Buka `https://downloadkan.pages.dev` → DevTools → Network → cari `index-*.js`.
- [ ] Isi JS memuat string key default (artinya env var terbaca saat build).
- [ ] Coba Analisis link Spotify tanpa mengisi key di Settings → harus berhasil (pakai key default).

