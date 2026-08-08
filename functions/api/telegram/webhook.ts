/**
 * Cloudflare Pages Function — Telegram bot webhook.
 *
 * Setup:
 *  1. Buat bot via @BotFather → dapat TOKEN.
 *  2. `npx wrangler pages secret put TELEGRAM_BOT_TOKEN --project-name=downloadkan`
 *  3. Set webhook: `curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<project>.pages.dev/api/telegram/webhook"`
 *
 * Cara kerja: user kirim URL / judul → bot coba engine lokal (Nezumi untuk YouTube/Spotify,
 * Jerexd untuk Spotify full) secara server-side (tanpa masalah CORS). Jika berhasil →
 * balas tautan unduhan langsung. Jika tak didukung (Deezer/SoundCloud) → balas deep-link
 * ke @deezload2bot untuk full song.
 */

interface Env {
  TELEGRAM_BOT_TOKEN?: string
}

const NEZUMI_KEY = 'NezumiApi'
const DEEZLOAD_BOT = 'https://t.me/deezload2bot'

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const token = env.TELEGRAM_BOT_TOKEN
  if (!token) {
    return json({ ok: false, error: 'TELEGRAM_BOT_TOKEN belum di-set. Lihat docs/BOT-TELEGRAM.md' })
  }
  if (request.method !== 'POST') return json({ ok: false, error: 'method harus POST' })

  let update: any
  try {
    update = await request.json()
  } catch {
    return json({ ok: false, error: 'body bukan JSON' })
  }

  const msg = update?.message
  const chatId = msg?.chat?.id
  const incoming: string = (msg?.text ?? '').trim()
  if (!chatId || !incoming) return json({ ok: true }) // ping/ack

  const answer = await handleMessage(incoming)
  await sendMessage(token, chatId, answer)
  return json({ ok: true })
}

async function handleMessage(query: string): Promise<string> {
  // /start dengan payload
  const clean = query.startsWith('/start') ? query.split(/\s+/).slice(1).join(' ').trim() : query
  const q = clean || query
  if (!q) {
    return 'Halo! Kirim URL lagu (YouTube/Spotify/Deezer) atau judul lagu untuk unduhan.'
  }

  const isUrl = /^https?:\/\//i.test(q)

  // Coba engine lokal (server-side, tanpa CORS).
  if (isUrl) {
    if (/youtube\.com|youtu\.be/i.test(q)) {
      const m = await nezumi(q, 'youtube')
      if (m) return m
    }
    if (/open\.spotify\.com|spotify\.link/i.test(q)) {
      const m = await nezumi(q, 'spotify')
      if (m) return m
      const j = await jerexdSpotify(q)
      if (j) return j
    }
  }

  // Fallback universal → deep-link ke @deezload2bot (full song untuk Deezer/SoundCloud/dll).
  const deep = `${DEEZLOAD_BOT}?start=${encodeURIComponent(q)}`
  return (
    `🎵 *Unduhan "${q}"*\n\n` +
    `Engine lokal kami hanya punya full song untuk YouTube & Spotify. ` +
    `Untuk lagu dari *Deezer / Apple Music / SoundCloud / lainnya*, ` +
    `gunakan bot Telegram downloader (full MP3/FLAC):\n\n` +
    `👉 [Buka @deezload2bot](https://t.me/deezload2bot?start=${encodeURIComponent(q)})\n\n` +
    `_Tautan: ${deep}_`
  )
}

async function nezumi(url: string, route: string): Promise<string | null> {
  try {
    const r = await fetch(
      `https://api.nezumi.eu.cc/api/${route}?apikey=${NEZUMI_KEY}&url=${encodeURIComponent(url)}`,
      { headers: { accept: 'application/json' } },
    )
    const j: any = await r.json()
    const dl = j?.result?.downloads ?? []
    if (!j.status || !dl.length) return null
    const lines = dl
      .slice(0, 4)
      .map((d: any) => `• *${d.type ?? 'Media'}* — ${d.url}`)
      .join('\n')
    return `✅ *${j.result?.title ?? 'Media'}*\n\n${lines}\n\n_Sumber: Nezumi_`
  } catch {
    return null
  }
}

async function jerexdSpotify(url: string): Promise<string | null> {
  try {
    const key = '' // Jerexd butuh key user; tanpa key akan 401 → fallback deezerbot.
    if (!key) return null
    const r = await fetch(
      `https://api.jerexd.my.id/api/downloader/spotify?url=${encodeURIComponent(url)}&apikey=${key}`,
      { headers: { accept: 'application/json' } },
    )
    const j: any = await r.json()
    if (!j.status || !j.downloadUrl) return null
    return `✅ *${j.title ?? 'Spotify Track'}* — ${j.artist ?? ''}\n\n📥 ${j.downloadUrl}\n\n_Sumber: Jerexd (MusicFab)_`
  } catch {
    return null
  }
}

async function sendMessage(token: string, chatId: number, msg: string): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown', disable_web_page_preview: true }),
    })
  } catch {
    /* best effort */
  }
}

function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', ...(init?.headers ?? {}) },
  })
}
