import type { MediaEngine, MediaResult } from './types'
import { buildProxyUrl } from '../../lib/proxy'
import { NEZUMI_PUBLIC_KEY, extractNezumiDownloads, type NezumiPayload } from './nezumi'

/**
 * Engine Skraper Mori — platform spesifik prioritas utama:
 * 1. Pixiv (artworks via pixiv.re)
 * 2. Apple Music (track lookup via iTunes API)
 * 3. Bandcamp (audio stream & album art via proxy)
 * 4. X / Twitter (media HD)
 * 5. Facebook (video HD/SD)
 * 6. Threads (gallery/video)
 */

export const moriEngine: MediaEngine = {
  id: 'mori',
  name: 'Mori Engine',
  supports: (url: string) => {
    return /tiktok\.com|douyin\.com|pixiv\.net|music\.apple\.com|bandcamp\.com|deezer\.com|spotify\.com|x\.com|twitter\.com|facebook\.com|fb\.watch|threads\.net/i.test(url)
  },
  async fetch(url: string, { jerexdKey }): Promise<MediaResult> {
    // 1. TIKTOK & DOUYIN (FULL HD)
    if (/tiktok\.com|douyin\.com/i.test(url)) {
      return fetchTikTok(url)
    }

    // 2. PIXIV
    if (/pixiv\.net/i.test(url)) {
      return fetchPixiv(url)
    }

    // 3. APPLE MUSIC
    if (/music\.apple\.com/i.test(url)) {
      return fetchAppleMusic(url)
    }

    // 4. DEEZER (FLAC Lossless & MP3 320kbps)
    if (/deezer\.com/i.test(url)) {
      return fetchDeezer(url, jerexdKey)
    }

    // 5. BANDCAMP
    if (/bandcamp\.com/i.test(url)) {
      return fetchBandcamp(url)
    }

    // 6. X / TWITTER, FACEBOOK, THREADS (via proxy fallback)
    return fetchSocialMori(url, jerexdKey)
  },
}

/** Pixiv artwork parser via pixiv.re (High-Res Proxy & CDN) */
function fetchPixiv(url: string): MediaResult {
  const match = /\/artworks\/(\d+)/i.exec(url) || /\/en\/artworks\/(\d+)/i.exec(url) || /illust_id=(\d+)/i.exec(url)
  const artworkId = match ? match[1] : null

  if (!artworkId) {
    throw new MoriError('ID Karya Pixiv tidak ditemukan dari URL.')
  }

  const mainImageUrl = `https://pixiv.re/${artworkId}.png`
  const page2Url = `https://pixiv.re/${artworkId}-2.png`

  return {
    title: `Pixiv Artwork #${artworkId}`,
    thumbnail: mainImageUrl,
    platform: 'pixiv',
    sourceUrl: url,
    downloads: [
      { type: 'Gambar Utama (PNG HD)', url: mainImageUrl },
      { type: 'Halaman 2 (PNG HD)', url: page2Url },
    ],
    engine: 'Mori (Pixiv)',
  }
}

/** Apple Music track lookup via iTunes Search API */
async function fetchAppleMusic(url: string): Promise<MediaResult> {
  const match = /i=(\d+)/i.exec(url) || /\/album\/[^/]+\/(\d+)/i.exec(url)
  const trackId = match ? match[1] : null

  let queryUrl = ''
  if (trackId) {
    queryUrl = `https://itunes.apple.com/lookup?id=${trackId}`
  } else {
    // ekstrak judul dari URL path
    const parts = url.split('/')
    const titleSlug = parts[parts.indexOf('album') + 1] || 'apple music'
    queryUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(titleSlug.replace(/-/g, ' '))}&media=music&limit=1`
  }

  let res: Response
  try {
    res = await fetch(queryUrl)
  } catch (err) {
    throw new MoriError(`Gagal menghubungi iTunes API (${(err as Error).message})`)
  }

  let json: { results?: Array<{ trackName?: string; artistName?: string; artworkUrl100?: string; previewUrl?: string }> }
  try {
    json = await res.json()
  } catch {
    throw new MoriError('Respons Apple Music bukan JSON valid')
  }

  const track = json.results?.[0]
  if (!track || !track.previewUrl) {
    throw new MoriError('Pratinjau lagu Apple Music tidak ditemukan.')
  }

  const hdCover = track.artworkUrl100 ? track.artworkUrl100.replace('100x100bb', '600x600bb') : null

  return {
    title: `${track.artistName ?? 'Apple Music'} - ${track.trackName ?? 'Song'}`,
    thumbnail: hdCover,
    platform: 'applemusic',
    sourceUrl: url,
    downloads: [
      { type: 'Audio Preview (MP3)', url: track.previewUrl },
      ...(hdCover ? [{ type: 'Cover Art (HD JPG)', url: hdCover }] : []),
    ],
    engine: 'Mori (Apple Music)',
  }
}

/** Deezer Track Lossless FLAC & 320kbps MP3 Parser */
async function fetchDeezer(url: string, jerexdKey: string): Promise<MediaResult> {
  const match = /\/track\/(\d+)/i.exec(url)
  const trackId = match ? match[1] : null

  if (!trackId) {
    throw new MoriError('ID Lagu Deezer tidak ditemukan dari URL.')
  }

  // Gunakan proxy untuk menghindari CORS
  const deezerEndpoint = buildProxyUrl('deezer', `track/${trackId}`, {})
  let res: Response
  try {
    res = await fetch(deezerEndpoint)
  } catch (err) {
    throw new MoriError(`Gagal menghubungi Deezer API (${(err as Error).message})`)
  }

  let json: {
    title?: string
    artist?: { name?: string }
    album?: { title?: string; cover_big?: string }
    preview?: string
  }
  try {
    json = await res.json()
  } catch {
    throw new MoriError('Respons Deezer API bukan JSON valid')
  }

  const title = json.title ? `${json.artist?.name ?? 'Artist'} - ${json.title}` : 'Deezer Track'
  const cover = json.album?.cover_big ?? null
  const downloads: Array<{ type: string; url: string }> = []

  // 1. Coba Jerexd untuk full song download (FLAC/MP3 320) via aio.
  // Key default disembunyikan server-side — frontend hanya kirim apikey bila user override.
  {
    try {
      const params: Record<string, string> = { url }
      if (jerexdKey?.trim()) params.apikey = jerexdKey.trim()
      const endpoint = buildProxyUrl('jerexd', 'api/downloader/aio', params)
      const jRes = await fetch(endpoint)
      const jJson = (await jRes.json()) as {
        downloadUrl?: string
        downloads?: Array<{ type?: string; url?: string }>
        status?: boolean
        result?: unknown
      }
      if (typeof jJson.downloadUrl === 'string' && jJson.downloadUrl.startsWith('http')) {
        downloads.push({ type: 'Audio Utuh (FLAC/MP3 320)', url: jJson.downloadUrl })
      }
      if (Array.isArray(jJson.downloads)) {
        jJson.downloads.forEach((d) => {
          if (typeof d?.url === 'string' && d.url.startsWith('http')) {
            downloads.push({ type: 'Audio Utuh (FLAC/MP3 320)', url: d.url })
          }
        })
      }
    } catch {
      // Jerexd gagal, lanjut ke fallback
    }
  }

  // 2. Preview 30 detik dari Deezer API sebagai cadangan
  if (json.preview) {
    downloads.push({ type: 'Audio Preview 30 Detik (MP3)', url: json.preview })
  }

  // Coba Nezumi sebagai fallback untuk full song — hanya untuk platform yang
  // didukung Nezumi (deezer TIDAK didukung → tidak usah dipanggil).
  if (!downloads.some((d) => d.type.includes('Utuh')) && !/deezer\.com/i.test(url)) {
    try {
      const nezEndpoint = buildProxyUrl('nezumi', 'api/download', { apikey: NEZUMI_PUBLIC_KEY, url })
      const nezRes = await fetch(nezEndpoint)
      const nezJson = (await nezRes.json()) as NezumiPayload
      if (nezJson.status && nezJson.result) {
        const nezDownloads = extractNezumiDownloads(nezJson.result)
        if (nezDownloads.length) {
          downloads.push(...nezDownloads)
        }
      }
    } catch {
      // Nezumi juga gagal, lanjut ke preview
    }
  }

  // Cover art HD sebagai bonus
  if (cover) {
    const hdCover = cover.replace(/\/\d+x\d+/, '/1000x1000')
    downloads.push({ type: 'Cover Art HD (JPG)', url: hdCover })
  }

  if (!downloads.length) {
    throw new MoriError('Audio Deezer tidak dapat ditemukan')
  }

  return {
    title,
    thumbnail: cover,
    platform: 'deezer',
    sourceUrl: url,
    downloads,
    engine: 'Mori (Deezer)',
  }
}

/** Bandcamp audio stream extractor */
async function fetchBandcamp(url: string): Promise<MediaResult> {
  // Panggil proxy HTML untuk mengekstrak stream MP3 & artwork
  const endpoint = buildProxyUrl('nezumi', 'api/download', { apikey: NEZUMI_PUBLIC_KEY, url })

  try {
    const res = await fetch(endpoint)
    const json = (await res.json()) as NezumiPayload
    if (json.status && json.result?.downloads?.length) {
      return {
        title: json.result.title ?? 'Bandcamp Track',
        thumbnail: json.result.thumbnail ?? null,
        platform: 'bandcamp',
        sourceUrl: url,
        downloads: json.result.downloads.map((d) => ({ type: d.type ?? 'MP3 Audio', url: d.url ?? '' })),
        engine: 'Mori (Bandcamp)',
      }
    }
  } catch {
    /* fallback ke generic response jika proxy timeout */
  }

  return {
    title: 'Bandcamp Track',
    thumbnail: null,
    platform: 'bandcamp',
    sourceUrl: url,
    downloads: [
      { type: 'Buka Halaman Utama Audio', url },
    ],
    engine: 'Mori (Bandcamp)',
  }
}

/** Social Media Mori (X/Twitter, Facebook, Threads) */
async function fetchSocialMori(url: string, _jerexdKey?: string): Promise<MediaResult> {
  const isTwitter = /x\.com|twitter\.com/i.test(url)
  const isFB = /facebook\.com|fb\.watch/i.test(url)
  const isThreads = /threads\.net/i.test(url)
  const platform = isTwitter ? 'twitter' : isFB ? 'facebook' : isThreads ? 'threads' : 'media'

  const endpoint = buildProxyUrl('nezumi', 'api/download', { apikey: NEZUMI_PUBLIC_KEY, url })

  let res: Response
  try {
    res = await fetch(endpoint)
  } catch (err) {
    throw new MoriError(`Mori social proxy gagal (${(err as Error).message})`)
  }

  let json: NezumiPayload
  try {
    json = (await res.json()) as NezumiPayload
  } catch {
    throw new MoriError('Respons sosial Mori bukan JSON')
  }

  if (!res.ok || json.status === false || !json.result?.downloads?.length) {
    throw new MoriError(json.message ?? `Gagal memproses media ${platform}`)
  }

  const r = json.result
  const downloads = (r.downloads ?? [])
    .filter((d) => typeof d.url === 'string' && d.url)
    .map((d, idx) => ({
      type: d.type ?? (idx === 0 ? 'HD Video / Media' : 'SD Video / Thumbnail'),
      url: d.url as string,
    }))

  return {
    title: r.title ?? `${platform.toUpperCase()} Media`,
    thumbnail: r.thumbnail ?? null,
    platform,
    sourceUrl: url,
    downloads,
    engine: `Mori (${platform.toUpperCase()})`,
  }
}

/** TikTok Full HD parser via Nezumi API */
async function fetchTikTok(url: string): Promise<MediaResult> {
  const endpoint = buildProxyUrl('nezumi', 'api/tiktok', { apikey: NEZUMI_PUBLIC_KEY, url })
  let res: Response
  try {
    res = await fetch(endpoint)
  } catch (err) {
    throw new MoriError(`Mori TikTok proxy gagal (${(err as Error).message})`)
  }

  let json: NezumiPayload
  try {
    json = (await res.json()) as NezumiPayload
  } catch {
    throw new MoriError('Respons TikTok bukan JSON')
  }

  const downloads = extractNezumiDownloads(json.result)
  if (!res.ok || json.status === false || !downloads.length) {
    throw new MoriError(json.message ?? 'Gagal memproses TikTok HD')
  }

  const r = json.result
  return {
    title: r?.title ?? r?.description ?? 'TikTok Video Full HD',
    thumbnail: r?.thumbnail ?? r?.cover ?? null,
    platform: 'tiktok',
    sourceUrl: url,
    downloads,
    engine: 'Mori (TikTok HD)',
  }
}

export class MoriError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MoriError'
  }
}
