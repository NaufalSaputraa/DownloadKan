# Bot Telegram — Setup (DownloadKan)

DownloadKan punya 2 mode integrasi Telegram untuk lagu yang engine lokal tidak bisa unduh penuh
(Deezer / Apple Music / SoundCloud / lainnya).

## Mode 1 — Deep-link ke @deezload2bot (sudah aktif, tanpa setup)

Di UI (hasil pencarian musik, kartu media, atau layar error) ada tombol **Telegram** yang membuka
`https://t.me/deezload2bot?start=<lagu/URL>` — bot pihak ketiga tersebut yang menangani unduhan penuh.
Tidak perlu kredensial apa pun.

## Mode 2 — Bot Telegram sendiri di Cloudflare Worker (SUDAH LIVE)

Bot milikmu (token ter-set, webhook aktif) bisa dipakai jika kamu mau bot Telegram *milikmu* yang
merespons URL dengan tautan unduhan dari engine Nezumi/Jerexd, fallback ke @deezload2bot.

### Status (2026-08-08)
- Bot: `@DownloadKanbot`
- Webhook: `https://downloadkan.pages.dev/api/telegram/webhook` (aktif, `getWebhookInfo` tanpa error)
- Secret `TELEGRAM_BOT_TOKEN` ter-bind di environment production (terverifikasi di deployment baru).

> **Catatan penting (bug Cloudflare):** secret Pages yang di-set via CLI hanya ter-inject pada
> **deployment produksi terbaru**, dan kadang *alias* `production.<project>.pages.dev` masih menunjuk
> deployment lama. Jika secret tidak terbaca, deploy ulang tanpa `--branch` (default = production):
> `npx wrangler pages deploy dist --project-name=downloadkan`

### 1. Buat bot (sudah selesai)
1. Buka [@BotFather](https://t.me/BotFather) → `/newbot` → ikuti instruksi → dapat **token**.
2. Simpan token (jangan commit ke git).

### 2. Set secret (sudah selesai)
```bash
npx wrangler pages secret put TELEGRAM_BOT_TOKEN --project-name=downloadkan
```

### 3. Set webhook (sudah selesai)
```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://downloadkan.pages.dev/api/telegram/webhook"
```

### 4. Coba
Kirim pesan ke bot: URL YouTube/Spotify → bot balas tautan unduhan langsung dari engine
Nezumi/Jerexd; Deezer/SoundCloud → bot balas deep-link ke @deezload2bot.

### Catatan
- Webhook function membaca token dari `context.env.TELEGRAM_BOT_TOKEN` (Pages secret).
- Tanpa `TELEGRAM_BOT_TOKEN`, endpoint mengembalikan JSON `{ ok: false, error: '...' }` — tidak crash.
- Bot Telegram gratis; beban pada Cloudflare Pages Functions masuk free tier.
