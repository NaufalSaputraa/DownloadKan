import { useCallback, useState } from 'react'
import { fetchMedia, mediaEngines } from '../engines/media'
import type { MediaResult } from '../engines/media/types'
import type { MusicTrackItem } from '../components/MusicSearchResults'
import { detectKind, detectPlatform, type DetectResult } from '../utils/url-detect'
import { pushHistory } from '../lib/storage'
import { buildProxyUrl } from '../lib/proxy'

export interface MediaState {
  status: 'idle' | 'analyzing' | 'done' | 'search_done' | 'error'
  result: MediaResult | null
  error: string | null
  detection: DetectResult | null
  searchResults?: MusicTrackItem[]
  searchQuery?: string
}

const IDLE: MediaState = { status: 'idle', result: null, error: null, detection: null }

export function useMedia() {
  const [state, setState] = useState<MediaState>(IDLE)

  const analyze = useCallback(async (input: string, jerexdKey: string) => {
    const detection = detectKind(input)
    setState({ status: 'analyzing', result: null, error: null, detection })

    if (detection.kind === 'search') {
      try {
        const endpoint = buildProxyUrl('deezer', 'search', { q: detection.url, limit: '10' })
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

        const items: MusicTrackItem[] = (json.data ?? []).map((t) => ({
          id: t.id,
          title: t.title,
          artist: t.artist?.name ?? 'Unknown Artist',
          album: t.album?.title ?? 'Single',
          cover: t.album?.cover_medium ?? '',
          preview: t.preview ?? '',
          duration: t.duration ?? 0,
          link: t.link ?? `https://www.deezer.com/track/${t.id}`,
        }))

        setState({
          status: 'search_done',
          result: null,
          error: null,
          detection,
          searchResults: items,
          searchQuery: detection.url,
        })
        return
      } catch (err) {
        setState({
          status: 'error',
          result: null,
          error: `Gagal mencari musik (${(err as Error).message})`,
          detection,
        })
        return
      }
    }

    if (detection.kind !== 'media') {
      setState({ status: 'error', result: null, error: 'Itu bukan tautan media atau kata kunci musik yang valid.', detection })
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