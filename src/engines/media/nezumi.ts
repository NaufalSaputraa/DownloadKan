import type { MediaEngine, MediaResult } from './types'
import { buildProxyUrl } from '../../lib/proxy'

export const NEZUMI_PUBLIC_KEY = 'NezumiApi'

/**
 * Nezumi punya endpoint khusus per platform; auto-detect `/api/download`
 * dipakai hanya untuk yang tanpa route khusus. Tambahkan di sini bila Nezumi
 * menyediakan route baru.
 */
const NEZUMI_ROUTES: Array<[RegExp, string]> = [
  [/youtube\.com|youtu\.be|music\.youtube\.com/i, 'youtube'],
  [/instagram\.com|instagr\.am/i, 'instagram'],
  [/twitter\.com|(^|\.)x\.com/i, 'twitter'],
  [/facebook\.com|fb\.watch|fb\.com/i, 'facebook'],
  [/tiktok\.com|douyin\.com|iesdouyin\.com/i, 'tiktok'],
  [/open\.spotify\.com|spotify\.link/i, 'spotify'],
  [/music\.apple\.com/i, 'applemusic'],
  [/pinterest\.com|pin\.it/i, 'pinterest'],
  [/bandcamp\.com/i, 'bandcamp'],
  [/pixiv\.net/i, 'pixiv'],
  [/threads\.net/i, 'threads'],
]

function pickNezumiRoute(url: string): string {
  for (const [re, route] of NEZUMI_ROUTES) {
    if (re.test(url)) return route
  }
  return 'download'
}

export interface NezumiPayload {
  status?: boolean
  creator?: string
  platform?: string
  message?: string
  result?: {
    title?: string
    description?: string
    thumbnail?: string | null
    cover?: string | null
    downloads?: Array<{ type?: string; url?: string }>
    videos?: Array<{ type?: string; url?: string }>
    audios?: Array<{ type?: string; url?: string }>
    images?: Array<{ type?: string; url?: string }>
    source_url?: string
  }
}

export function extractNezumiDownloads(r: NezumiPayload['result']): Array<{ type: string; url: string }> {
  if (!r) return []
  const list: Array<{ type: string; url: string }> = []

  if (Array.isArray(r.videos)) {
    r.videos.forEach((v, i) => {
      if (v?.url) list.push({ type: v.type ?? (i === 0 ? 'Video Full HD (No Watermark)' : 'Video HD'), url: v.url })
    })
  }
  if (Array.isArray(r.downloads)) {
    r.downloads.forEach((d) => {
      if (d?.url) list.push({ type: d.type ?? 'Media', url: d.url })
    })
  }
  if (Array.isArray(r.images)) {
    r.images.forEach((img, i) => {
      if (img?.url) list.push({ type: img.type ?? `Gambar Slide ${i + 1}`, url: img.url })
    })
  }
  if (Array.isArray(r.audios)) {
    r.audios.forEach((a) => {
      if (a?.url) list.push({ type: a.type ?? 'Audio MP3 (HD)', url: a.url })
    })
  }
  return list
}

export const nezumiEngine: MediaEngine = {
  id: 'nezumi',
  name: 'Nezumi',
  supports: () => true,
  async fetch(url: string): Promise<MediaResult> {
    const route = pickNezumiRoute(url)
    const endpoint = buildProxyUrl(
      'nezumi',
      `api/${route}`,
      { apikey: NEZUMI_PUBLIC_KEY, url },
    )

    let res: Response
    try {
      res = await fetch(endpoint)
    } catch (err) {
      throw new NezumiError(`Tidak bisa menghubungi Nezumi (${(err as Error).message})`)
    }

    let json: NezumiPayload
    try {
      json = (await res.json()) as NezumiPayload
    } catch {
      throw new NezumiError('Respons Nezumi bukan JSON')
    }

    const downloads = extractNezumiDownloads(json.result)
    if (!res.ok || json.status === false || !downloads.length) {
      throw new NezumiError(json.message ?? `Status ${res.status}`)
    }

    const r = json.result
    return {
      title: r?.title ?? r?.description ?? 'Tanpa judul',
      thumbnail: r?.thumbnail ?? r?.cover ?? null,
      platform: json.platform ?? 'tiktok',
      sourceUrl: url,
      downloads,
      engine: 'Nezumi',
    }
  },
}

export class NezumiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NezumiError'
  }
}