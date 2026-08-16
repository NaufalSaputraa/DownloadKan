import { useCallback, useState } from 'react'
import { detectKind, detectPlatform, isPlaylistUrl, type DetectResult } from '../utils/url-detect'
import { pushHistory } from '../lib/storage'
import {
  searchLocalUnified,
  analyzeLocalMedia,
  extractPlaylist,
  type UnifiedSearchResult,
  type AnalyzedMedia,
  type PlaylistInfo,
} from '../lib/api-local'

export interface MediaState {
  status: 'idle' | 'analyzing' | 'done' | 'unified_search_done' | 'playlist_done' | 'error'
  result: AnalyzedMedia | null
  error: string | null
  detection: DetectResult | null
  unifiedResults?: UnifiedSearchResult
  playlistInfo?: PlaylistInfo
  searchQuery?: string
}

const IDLE: MediaState = { status: 'idle', result: null, error: null, detection: null }

export function useMedia() {
  const [state, setState] = useState<MediaState>(IDLE)

  const analyze = useCallback(async (input: string) => {
    const detection = detectKind(input)
    setState({ status: 'analyzing', result: null, error: null, detection })

    // 1. JIKA INPUT ADALAH KATA KUNCI PENCARIAN
    if (detection.kind === 'search') {
      try {
        const unified = await searchLocalUnified(detection.url)
        setState({
          status: 'unified_search_done',
          result: null,
          error: null,
          detection,
          unifiedResults: unified,
          searchQuery: detection.url,
        })
        return
      } catch (err) {
        setState({
          status: 'error',
          result: null,
          error: `Gagal mencari: ${(err as Error).message}`,
          detection,
        })
        return
      }
    }

    if (detection.kind !== 'media') {
      setState({
        status: 'error',
        result: null,
        error: 'Itu bukan tautan media atau kata kunci pencarian yang valid.',
        detection,
      })
      return
    }

    // 2. JIKA INPUT ADALAH PLAYLIST / ALBUM URL
    if (isPlaylistUrl(detection.url)) {
      try {
        const playlistInfo = await extractPlaylist(detection.url)
        setState({
          status: 'playlist_done',
          result: null,
          error: null,
          detection,
          playlistInfo,
        })
        return
      } catch {
        /* Jika gagal sebagai playlist, lanjutkan analisis sebagai single track/video */
      }
    }

    // 3. ANALISIS URL MEDIA VIA LOCAL STANDALONE CORE (yt-dlp)
    try {
      const result = await analyzeLocalMedia(detection.url)
      const platform = detectPlatform(detection.url)
      pushHistory({
        kind: 'media',
        platform,
        title: result.title,
        thumbnail: result.thumbnail ?? null,
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

  return { state, analyze, reset }
}