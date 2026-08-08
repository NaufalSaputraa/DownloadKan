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
    thumbnail?: string | null
    downloads?: Array<{ type?: string; url?: string }>
    source_url?: string
  }
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

    if (!res.ok || json.status === false || !json.result?.downloads?.length) {
      throw new NezumiError(json.message ?? `Status ${res.status}`)
    }

    const r = json.result
    const downloads = (r.downloads ?? [])
      .filter((d) => typeof d.url === 'string' && d.url)
      .map((d) => ({ type: d.type ?? 'media', url: d.url as string }))

    return {
      title: r.title ?? 'Tanpa judul',
      thumbnail: r.thumbnail ?? null,
      platform: json.platform ?? 'unknown',
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