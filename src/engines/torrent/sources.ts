/**
 * Sumber pencarian torrent — logika murni dipakai DUA tempat:
 *  - Cloudflare Pages Function `functions/api/torrent-search.ts` (production)
 *  - Vite `configureServer` middleware (dev tanpa wrangler)
 * Kedua lingkung mendukung Web fetch + URLSearchParams + DOMParser? TIDAK —
 * Worker tidak punya DOM. Karena itu parsing Nyaa memakai regex ringan.
 */

export interface TorrentHit {
  source: string
  title: string
  size: string
  seeders: number
  leechers: number
  magnet: string
  quality?: string
}

function cleanQuery(q: string): string {
  return q.trim().replace(/\s+/g, ' ')
}

async function text(url: string, signal: AbortSignal): Promise<string> {
  const res = await fetch(url, { signal, headers: { accept: '*/*', 'user-agent': 'Mozilla/5.0' } })
  return res.text()
}

function magnetFromHash(hash: string, display: string): string {
  return `magnet:?xt=urn:btih:${hash.toLowerCase()}&dn=${encodeURIComponent(display)}`
}

/** TPB mirror API — REST JSON, stabil, tanpa HTML. */
async function searchThePirateBay(query: string, signal: AbortSignal): Promise<TorrentHit[]> {
  const q = cleanQuery(query)
  const raw = await text(`https://apibay.org/q.php?q=${encodeURIComponent(q)}&cat=0`, signal)
  let rows: any[] = []
  try {
    rows = JSON.parse(raw)
  } catch {
    return []
  }
  return rows
    .filter((r) => r.name && r.info_hash)
    .map((r) => ({
      source: 'TPB',
      title: r.name,
      size: fmtBytes(Number(r.size) || 0),
      seeders: Number(r.seeders) || 0,
      leechers: Number(r.leechers) || 0,
      magnet: magnetFromHash(r.info_hash, r.name),
    }))
}

/** Nyaa HTML-scrape ringan (setelah API JSON dihapus situs). */
async function searchNyaa(query: string, signal: AbortSignal): Promise<TorrentHit[]> {
  const q = cleanQuery(query)
  const html = await text(`https://nyaa.si/?f=0&c=0_0&q=${encodeURIComponent(q)}`, signal)
  return parseNyaaRows(html)
}

function parseNyaaRows(html: string): TorrentHit[] {
  const rows: TorrentHit[] = []
  const rowRe = /<tr class="default"[^>]*>([\s\S]*?)<\/tr>/g
  let rm: RegExpExecArray | null
  while ((rm = rowRe.exec(html)) !== null) {
    const block = rm[1]

    const magnetMatch = block.match(/href="(magnet:\?xt=urn:btih:[a-f0-9]{40}[^"]*)"/i)
    if (!magnetMatch) continue
    const magnet = decodeEntities(magnetMatch[1])

    // Judul: <a href="/view/123" title="Nama">Nama</a>
    const titleMatch =
      block.match(/<a href="\/view\/\d+"[^>]*title="([^"]*)"[^>]*>/i) ??
      block.match(/class="comments"[^>]*>[\s\S]*?<a[^>]*>([^<]*)</i)
    // Jangan tertangkap link komentar (title "N comment")
    let rawTitle = titleMatch?.[1]?.replace(/( \d+) comment(),?/i, '$2') ?? '[untitled]'
    if (/^\d+ comments?$/i.test(rawTitle)) rawTitle = '[untitled]'
    const title = decodeEntities(rawTitle.trim())

    // Ukuran dari sel yang memuat satuan (MiB/GiB/…)
    const sizeMatch = block.match(/<td[^>]*>\s*([\d.,]+\s*(?:B|KiB|MiB|GiB|TiB))\s*<\/td>/i)
    const scells = block.match(/<td class="text-center">(\d+)<\/td>/g) ?? []
    const lastTwo = scells
      .slice(-2)
      .map((s) => parseInt(s.replace(/<[^>]*>/g, ''), 10) || 0)

    rows.push({
      source: 'Nyaa',
      title,
      size: sizeMatch?.[1] ?? '',
      seeders: lastTwo[0] ?? 0,
      leechers: lastTwo[1] ?? 0,
      magnet,
    })
    if (rows.length >= 30) break
  }
  return rows
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
}

function fmtBytes(bytes: number): string {
  if (!bytes) return ''
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let v = bytes
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(v >= 10 ? 0 : 1)} ${units[i]}`
}

const SOURCES: Array<{ name: string; run: typeof searchThePirateBay }> = [
  { name: 'TPB', run: searchThePirateBay },
  { name: 'Nyaa', run: searchNyaa },
]

export async function searchTorrents(
  query: string,
  signal: AbortSignal = new AbortController().signal,
): Promise<TorrentHit[]> {
  const q = cleanQuery(query)
  if (!q) return []
  const results = await Promise.all(SOURCES.map((s) => s.run(q, signal)))
  return results
    .flat()
    .sort((a, b) => b.seeders - a.seeders)
    .slice(0, 40)
}