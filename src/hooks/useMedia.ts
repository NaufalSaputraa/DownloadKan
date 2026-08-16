import { useCallback, useState } from 'react'
import { fetchMedia, mediaEngines } from '../engines/media'
import type { MediaResult } from '../engines/media/types'
import { detectKind, detectPlatform, type DetectResult } from '../utils/url-detect'
import { pushHistory } from '../lib/storage'
import { buildProxyUrl } from '../lib/proxy'
import { searchLocalUnified, type UnifiedSearchResult } from '../lib/api-local'

export interface MediaState {
  status: 'idle' | 'analyzing' | 'done' | 'unified_search_done' | 'error'
  result: MediaResult | null
  error: string | null
  detection: DetectResult | null
  unifiedResults?: UnifiedSearchResult
  searchQuery?: string
}

const IDLE: MediaState = { status: 'idle', result: null, error: null, detection: null }

export function useMedia() {
  const [state, setState] = useState<MediaState>(IDLE)

  const analyze = useCallback(async (input: string, jerexdKey: string) => {
    const detection = detectKind(input)
    setState({ status: 'analyzing', result: null, error: null, detection })

    // JIKA INPUT ADALAH KATA KUNCI PENCARIAN (Bukan URL)
    if (detection.kind === 'search') {
      try {
        // Coba unified search lokal (YouTube Video + Music FLAC)
        const unified = await searchLocalUnified(detection.url)
        if (unified && unified.total > 0) {
          setState({
            status: 'unified_search_done',
            result: null,
            error: null,
            detection,
            unifiedResults: unified,
            searchQuery: detection.url,
          })
          return
        }

        // Fallback Cloud jika local backend belum menyala
        const endpoint = buildProxyUrl('deezer', 'search', { q: detection.url, limit: '25' })
        const res = await fetch(endpoint)
        const json = (await res.json()) as {
          data?: Array<{
            id: number
            title: string
            artist?: { name?: string }
            album?: { title?: string; cover_medium?: string }
            preview?: string
            duration?: number
            link?: string
          }>
        }

        const fallbackUnified: UnifiedSearchResult = {
          query: detection.url,
          videos: [],
          musics: (json.data ?? []).map((t) => ({
            id: String(t.id),
            title: t.title,
            artist: t.artist?.name ?? 'Unknown Artist',
            album: t.album?.title ?? 'Single',
            artwork: t.album?.cover_medium ?? '',
            preview: t.preview ?? '',
            duration: t.duration ?? 0,
            duration_str: t.duration ? `${Math.floor(t.duration / 60)}:${t.duration % 60 < 10 ? '0' : ''}${t.duration % 60}` : '',
            source: 'Deezer',
            direct_url: t.link ?? `https://www.deezer.com/track/${t.id}`,
          })),
          total: (json.data ?? []).length,
        }

        setState({
          status: 'unified_search_done',
          result: null,
          error: null,
          detection,
          unifiedResults: fallbackUnified,
          searchQuery: detection.url,
        })
        return
      } catch (err) {
        setState({
          status: 'error',
          result: null,
          error: `Gagal mencari (${(err as Error).message})`,
          detection,
        })
        return
      }
    }

    if (detection.kind !== 'media') {
      setState({ status: 'error', result: null, error: 'Itu bukan tautan media atau kata kunci pencarian yang valid.', detection })
      return
    }

    try {
      const result = await fetchMedia(detection.url, jerexdKey)
      const platform = detectPlatform(detection.url)
      pushHistory({
        kind: 'media',
        platform,
        title: result.title,
        thumbnail: result.thumbnail,
        source: detection.url,
        format: result.downloads[0]?.type ?? '',
        engine: result.engine,
        status: 'done',
      })
      setState({ status: 'done', result, error: null, detection })
    } catch (err) {
      setState({ status: 'error', result: null, error: (err as Error).message, detection })
    }
  }, [])

  const reset = useCallback(() => setState(IDLE), [])

  return { state, analyze, reset, engineCount: mediaEngines.length }
}