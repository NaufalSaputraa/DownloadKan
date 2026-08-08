import type { MediaEngine, MediaResult } from './types'
import { buildProxyUrl } from '../../lib/proxy'

/** Peta pola URL → slug endpoint Jerexd (yang terverifikasi ada). */
const SLUGS: [RegExp, string][] = [
  [/open\.spotify\.com|spotify\.link/i, 'spotify'],
  [/tiktok\.com|douyin\.com|iesdouyin\.com/i, 'tiktok'],
  [/instagram\.com|instagr\.am/i, 'instagram'],
  [/pinterest|pin\.it/i, 'pin'],
  [/rednote|xhslink|xiaohongshu/i, 'rednote'],
  [/pixiv\.net/i, 'pixiv'],
  [/twitter|x\.com/i, 'ssstweet'],
  [/facebook|fb\./i, 'facebook'],
  [/threads\.net/i, 'threads'],
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
  title?: string
  artist?: string
  thumbnail?: string
  /** beberapa endpoint (spotify, fastdl) meletakkan URL di root */
  downloadUrl?: string
  /** tiktok meletakkan array links di root */
  links?: Array<{ label?: string; url?: string }>
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
    const slug = pickEndpoint(url)
    // Key default disembunyikan server-side (CF secret). Frontend hanya mengirim
    // apikey bila USER memasukkan key sendiri (override). Tanpa apikey, CF Function
    // menyuntikkan secret JEREXD_API_KEY.
    const params: Record<string, string> = { url }
    if (jerexdKey?.trim()) params.apikey = jerexdKey.trim()
    const endpoint = buildProxyUrl('jerexd', `api/downloader/${slug}`, params)

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

    // Jerexd spotify/fastdl menaruh downloadUrl di root — preferensikan itu.
    const rootDownloads: Array<{ type: string; url: string }> = []
    if (typeof json.downloadUrl === 'string' && json.downloadUrl.startsWith('http')) {
      rootDownloads.push({ type: 'Audio Utuh (FLAC/MP3 320)', url: json.downloadUrl })
    }
    // Jerexd tiktok menaruh array links di root ({label, url}).
    if (Array.isArray(json.links)) {
      json.links.forEach((l) => {
        if (typeof l?.url === 'string' && l.url.startsWith('http')) {
          rootDownloads.push({ type: l.label ?? 'Media', url: l.url })
        }
      })
    }

    const r = json.result
    const downloads = rootDownloads.length ? rootDownloads : normalizeDownloads(r)
    if (!downloads.length) throw new JerexdError(`Jerexd tidak mengembalikan hasil (${json.statusCode})`)

    return {
      title: json.title ?? (typeof r === 'string' ? 'Media' : (r?.title ?? 'Media')),
      thumbnail: json.thumbnail ?? null,
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