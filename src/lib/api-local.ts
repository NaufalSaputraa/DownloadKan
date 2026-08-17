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

export interface PlaylistItem {
  id: string
  index: number
  title: string
  artist: string
  duration?: number
  duration_str?: string
  thumbnail?: string
  url: string
}

export interface PlaylistInfo {
  title: string
  uploader: string
  thumbnail?: string
  item_count: number
  items: PlaylistItem[]
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

export interface LyricsResponse {
  title: string
  artist: string
  lyrics: string | null
  source: string
}

export interface EngineUpdateResponse {
  status: string
  message: string
  version: string
  log?: string
}

export function getBackendBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location.port === '8000') {
    return `${window.location.protocol}//${window.location.host}`
  }
  return 'http://127.0.0.1:8000'
}

export function getStreamUrl(category: string, filename: string): string {
  return `${getBackendBaseUrl()}/api/stream/${encodeURIComponent(category)}/${encodeURIComponent(filename)}`
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

export async function extractPlaylist(url: string, signal?: AbortSignal): Promise<PlaylistInfo> {
  const res = await fetch(`${getBackendBaseUrl()}/api/playlist/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
    signal,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Gagal mengekstrak playlist.' }))
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
  start_time?: string
  end_time?: string
  subtitles?: boolean
  sub_lang?: string
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
      start_time: params.start_time,
      end_time: params.end_time,
      subtitles: params.subtitles,
      sub_lang: params.sub_lang || 'id,en',
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Gagal memulai unduhan lokal.' }))
    throw new Error(err.detail || `Status ${res.status}`)
  }
  return res.json()
}

export async function startBatchDownload(params: {
  items: Array<{
    url: string
    title?: string
    artist?: string
    album?: string
    artwork?: string
  }>
  format?: string
  category?: 'Videos' | 'Music' | 'Torrents'
}): Promise<{ status: string; count: number; job_ids: string[] }> {
  const res = await fetch(`${getBackendBaseUrl()}/api/download/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: params.items,
      format: params.format || 'mp3',
      category: params.category || 'Music',
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Gagal memulai unduhan batch.' }))
    throw new Error(err.detail || `Status ${res.status}`)
  }
  return res.json()
}

export async function searchLocalUnified(query: string, signal?: AbortSignal): Promise<UnifiedSearchResult> {
  try {
    const res = await fetch(
      `${getBackendBaseUrl()}/api/search/unified?q=${encodeURIComponent(query)}`,
      { signal },
    )
    if (res.ok) {
      return await res.json()
    }
  } catch {
    /* Backend local tidak merespons, fallback ke client-side search */
  }

  // Fallback 100% Client-side: iTunes API (CORS OK)
  try {
    const itunesRes = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=20`,
      { signal },
    )
    if (itunesRes.ok) {
      const data = await itunesRes.json()
      const musics: LocalMusicItem[] = (data.results || []).map((item: any) => ({
        id: String(item.trackId || item.collectionId),
        title: item.trackName || item.collectionName || query,
        artist: item.artistName || 'Unknown Artist',
        album: item.collectionName || '',
        artwork: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb').replace('100x100', '600x600') : '',
        preview: item.previewUrl || '',
        source: 'Apple Music / iTunes',
        duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : undefined,
        duration_str: item.trackTimeMillis
          ? `${Math.floor(item.trackTimeMillis / 60000)}:${Math.floor((item.trackTimeMillis % 60000) / 1000).toString().padStart(2, '0')}`
          : '',
        direct_url: item.trackViewUrl || '',
      }))

      return {
        query,
        videos: [],
        musics,
        total: musics.length,
      }
    }
  } catch {
    /* ignore */
  }

  return { query, videos: [], musics: [], total: 0 }
}

export async function searchLocalMusic(query: string, signal?: AbortSignal): Promise<LocalMusicItem[]> {
  const unified = await searchLocalUnified(query, signal)
  return unified.musics
}

export async function searchLocalTorrent(query: string, signal?: AbortSignal): Promise<LocalTorrentItem[]> {
  try {
    const res = await fetch(
      `${getBackendBaseUrl()}/api/search/torrent?q=${encodeURIComponent(query)}`,
      { signal },
    )
    if (res.ok) {
      const data = await res.json()
      return data.results || []
    }
  } catch {
    /* Fallback ke TPB apibay client-side */
  }

  try {
    const apibayRes = await fetch(
      `https://apibay.org/q.php?q=${encodeURIComponent(query)}`,
      { signal },
    )
    if (apibayRes.ok) {
      const hits = await apibayRes.json()
      if (Array.isArray(hits) && hits.length > 0 && hits[0].name !== 'No results returned') {
        return hits.slice(0, 30).map((h: any) => {
          const sz = parseInt(h.size, 10) || 0
          const sizeStr = sz > 1024 * 1024 * 1024 ? `${(sz / 1024 / 1024 / 1024).toFixed(2)} GB` : `${(sz / 1024 / 1024).toFixed(1)} MB`
          return {
            title: h.name,
            size: sizeStr,
            seeders: parseInt(h.seeders, 10) || 0,
            leechers: parseInt(h.leechers, 10) || 0,
            magnet: `magnet:?xt=urn:btih:${h.info_hash}&dn=${encodeURIComponent(h.name)}`,
            source: 'The Pirate Bay',
          }
        })
      }
    }
  } catch {
    /* ignore */
  }

  return []
}

export async function fetchLyrics(title: string, artist = '', album = '', signal?: AbortSignal): Promise<LyricsResponse> {
  try {
    const res = await fetch(
      `${getBackendBaseUrl()}/api/lyrics/get?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}&album=${encodeURIComponent(album)}`,
      { signal },
    )
    if (res.ok) {
      return await res.json()
    }
  } catch {
    /* Fallback ke public LRCLIB API */
  }

  try {
    const lrclibRes = await fetch(
      `https://lrclib.net/api/get?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}&album_name=${encodeURIComponent(album)}`,
      { signal },
    )
    if (lrclibRes.ok) {
      const d = await lrclibRes.json()
      return {
        title,
        artist,
        lyrics: d.syncedLyrics || d.plainLyrics || null,
        source: 'LRCLIB (Client-Side)',
      }
    }
  } catch {
    /* ignore */
  }

  return { title, artist, lyrics: null, source: 'none' }
}

export async function updateEngineCore(): Promise<EngineUpdateResponse> {
  const res = await fetch(`${getBackendBaseUrl()}/api/system/update-engine`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Gagal memperbarui engine.' }))
    throw new Error(err.detail || `Status ${res.status}`)
  }
  return res.json()
}
