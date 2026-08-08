import type { MediaEngine, MediaResult } from './types'
import { buildProxyUrl } from '../../lib/proxy'

export const NEZUMI_PUBLIC_KEY = 'NezumiApi'

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
    const route = /tiktok|douyin/i.test(url) ? 'tiktok' : 'download'
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