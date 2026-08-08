import type { MediaEngine, MediaResult } from './types'
import { buildProxyUrl } from '../../lib/proxy'

/** Peta pola URL → slug endpoint Jerexd (yang terverifikasi ada). */
const SLUGS: [RegExp, string][] = [
  [/tiktok|douyin|pinterest|threads|rednote|pixiv/i, 'aio'],
  [/twitter|x\.com/i, 'ssstweet'],
  [/facebook|fb\./i, 'facebook'],
  [/soundcloud\.com/i, 'soundcloud'],
]

function pickEndpoint(url: string): string {
  for (const [re, slug] of SLUGS) {
    if (re.test(url)) return slug
  }
  return 'aio'
}

interface JerexdResponse {
  status?: boolean | string
  statusCode?: number
  result?: {
    title?: string
    download_file?: string
    media?: Array<{ type?: string; url?: string; size?: number }>
    data?: Array<{ type?: string; url?: string }>
  }
}

export const jerexdEngine: MediaEngine = {
  id: 'jerexd',
  name: 'Jerexd',
  supports: () => true,
  async fetch(url, { jerexdKey }): Promise<MediaResult> {
    if (!jerexdKey) throw new JerexdError('Butuh API key Jerexd. Isi di Pengaturan.')
    const slug = pickEndpoint(url)
    const endpoint = buildProxyUrl('jerexd', `api/downloader/${slug}`, {
      url,
      apikey: jerexdKey,
    })

    let res: Response
    try {
      res = await fetch(endpoint)
    } catch (err) {
      throw new JerexdError(`Gagal terhubung Jerexd: ${(err as Error).message}`)
    }

    let json: JerexdResponse
    try {
      json = (await res.json()) as JerexdResponse
    } catch {
      throw new JerexdError('Respons Jerexd bukan JSON')
    }

    if (res.status === 401) throw new JerexdError('API key Jerexd tidak valid (401).')
    if (!res.ok) throw new JerexdError(`Jerexd error ${res.status}`)

    const r = json.result
    if (!r) throw new JerexdError(`Jerexd tidak mengembalikan hasil (${json.statusCode})`)

    // Jerexd .aio: result bisa string (direct media URL) atau {media: string | {…}} atau array.
    const downloads = normalizeDownloads(r)
    if (!downloads.length) throw new JerexdError('Jerexd: hasil tanpa link unduhan.')

    return {
      title: typeof r === 'string' ? 'Media' : (r.title ?? 'Media'),
      thumbnail: null,
      platform: 'unknown',
      sourceUrl: url,
      downloads,
      engine: 'Jerexd',
    }
  },
}

function normalizeDownloads(r: JerexdResponse['result']): Array<{ type: string; url: string }> {
  if (typeof r === 'string') return [{ type: 'media', url: r }]
  const arr: Array<{ type: string; url: string }> = []

  const push = (value: unknown, type = 'media') => {
    if (typeof value === 'string') {
      if (value.startsWith('http')) arr.push({ type, url: value })
    } else if (value && typeof value === 'object') {
      const obj = value as { url?: unknown; type?: unknown }
      if (typeof obj.url === 'string') arr.push({ type: String(obj.type ?? type), url: obj.url })
    }
  }

  if (r) {
    push(r.media)
    if (Array.isArray(r.media))
      r.media.forEach((m) => push(m, typeof m === 'string' ? 'media' : m.type))
    if (Array.isArray(r.data)) r.data.forEach((d) => push(d, d.type))
  }
  return arr
}

export class JerexdError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JerexdError'
  }
}