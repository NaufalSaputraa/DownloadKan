import { useCallback, useState } from 'react'
import { fetchMedia, mediaEngines } from '../engines/media'
import type { MediaResult } from '../engines/media/types'
import { detectKind, detectPlatform, type DetectResult } from '../utils/url-detect'
import { pushHistory } from '../lib/storage'

export interface MediaState {
  status: 'idle' | 'analyzing' | 'done' | 'error'
  result: MediaResult | null
  error: string | null
  detection: DetectResult | null
}

const IDLE: MediaState = { status: 'idle', result: null, error: null, detection: null }

export function useMedia() {
  const [state, setState] = useState<MediaState>(IDLE)

  const analyze = useCallback(async (input: string, jerexdKey: string) => {
    const detection = detectKind(input)
    setState({ status: 'analyzing', result: null, error: null, detection })

    if (detection.kind !== 'media') {
      setState({ status: 'error', result: null, error: 'Itu bukan tautan media yang didukung.', detection })
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