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

export interface LocalMusicItem {
  id: string
  title: string
  artist: string
  album?: string
  artwork?: string
  preview?: string
  source: string
  duration?: number
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

export async function startLocalDownload(
  url: string,
  format: string = 'best',
  category: 'Videos' | 'Music' | 'Torrents' = 'Videos',
  filename?: string,
): Promise<{ status: string; job_id: string }> {
  const res = await fetch(`${getBackendBaseUrl()}/api/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, format, category, filename }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Gagal memulai unduhan lokal.' }))
    throw new Error(err.detail || `Status ${res.status}`)
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
