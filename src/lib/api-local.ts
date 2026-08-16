/**
 * Connector ke Local Standalone Backend (FastAPI di http://127.0.0.1:8000)
 */

export interface BackendHealth {
  status: string
  mode: string
  downloadDir: string
  engines: {
    ytdlp: boolean
    streamrip: boolean
    ffmpeg: boolean
    aria2c: boolean
  }
  platform: string
}

export interface AnalyzedDownload {
  format_id?: string
  type: string
  ext?: string
  filesize?: number
  url?: string
  local?: boolean
}

export interface AnalyzedMedia {
  title: string
  thumbnail?: string
  duration?: number
  platform: string
  sourceUrl: string
  downloads: AnalyzedDownload[]
  engine: string
}

export interface LocalMusicItem {
  id: string
  title: string
  artist: string
  album?: string
  artwork?: string
  preview?: string
  source: string
  duration?: number
  duration_str?: string
  direct_url?: string
}

export interface LocalVideoItem {
  id: string
  title: string
  channel?: string
  duration?: number
  duration_str?: string
  thumbnail?: string
  url: string
  view_count?: number
  type: string
  source: string
}

export interface UnifiedSearchResult {
  query: string
  videos: LocalVideoItem[]
  musics: LocalMusicItem[]
  total: number
}

export interface LocalTorrentItem {
  title: string
  size: string
  seeders: number
  leechers: number
  magnet: string
  source: string
}

function getBackendBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location.port === '8000') {
    return `${window.location.protocol}//${window.location.host}`
  }
  return 'http://127.0.0.1:8000'
}

export async function checkLocalHealth(): Promise<BackendHealth | null> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 1200)
    const res = await fetch(`${getBackendBaseUrl()}/api/health`, { signal: ctrl.signal })
    clearTimeout(t)
    if (!res.ok) return null
    return (await res.json()) as BackendHealth
  } catch {
    return null
  }
}

export async function analyzeLocalMedia(url: string, signal?: AbortSignal): Promise<AnalyzedMedia> {
  const res = await fetch(`${getBackendBaseUrl()}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
    signal,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Gagal menganalisis media.' }))
    throw new Error(err.detail || `Status ${res.status}`)
  }
  return res.json()
}

export async function startLocalDownload(params: {
  url: string
  format?: string
  category?: 'Videos' | 'Music' | 'Torrents'
  title?: string
  artist?: string
  album?: string
  artwork?: string
}): Promise<{ status: string; job_id: string }> {
  const res = await fetch(`${getBackendBaseUrl()}/api/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: params.url,
      format: params.format || 'best',
      category: params.category || 'Videos',
      title: params.title,
      artist: params.artist,
      album: params.album,
      artwork: params.artwork,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Gagal memulai unduhan lokal.' }))
    throw new Error(err.detail || `Status ${res.status}`)
  }
  return res.json()
}

export async function searchLocalUnified(query: string, signal?: AbortSignal): Promise<UnifiedSearchResult> {
  const res = await fetch(
    `${getBackendBaseUrl()}/api/search/unified?q=${encodeURIComponent(query)}`,
    { signal },
  )
  if (!res.ok) {
    return { query, videos: [], musics: [], total: 0 }
  }
  return res.json()
}

export async function searchLocalMusic(query: string, signal?: AbortSignal): Promise<LocalMusicItem[]> {
  const res = await fetch(
    `${getBackendBaseUrl()}/api/search/music?q=${encodeURIComponent(query)}`,
    { signal },
  )
  if (!res.ok) return []
  const data = await res.json()
  return data.results || []
}

export async function searchLocalTorrent(query: string, signal?: AbortSignal): Promise<LocalTorrentItem[]> {
  const res = await fetch(
    `${getBackendBaseUrl()}/api/search/torrent?q=${encodeURIComponent(query)}`,
    { signal },
  )
  if (!res.ok) return []
  const data = await res.json()
  return data.results || []
}
