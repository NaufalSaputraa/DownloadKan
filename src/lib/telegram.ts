/**
 * Helper integrasi Telegram — deep-link ke bot downloader.
 * Arsitektur $0: user cukup klik tombol → terbuka chat bot Telegram → bot
 * (pihak ketiga, mis. @deezload2bot) yang menangani unduhan penuh.
 */

export const DEEZLOAD_BOT = '@deezload2bot'

/** Deep-link ke bot dengan payload (biasanya URL lagu / kata kunci). */
export function telegramBotDeepLink(bot = DEEZLOAD_BOT, payload?: string): string {
  const handle = bot.startsWith('@') ? bot.slice(1) : bot
  const base = `https://t.me/${handle}`
  return payload ? `${base}?start=${encodeURIComponent(payload)}` : base
}

/** Deep-link Telegram (tanpa `?start=`) — bisa dipakai untuk share teks. */
export function telegramShareLink(text: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(text)}`
}
