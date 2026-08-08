import { useCallback, useEffect, useRef, useState } from 'react'
import { torrentManager, type TorrentProgress } from '../engines/torrent/webtorrent'
import { pushHistory } from '../lib/storage'

export interface ActiveTorrent {
  key: string
  progress: TorrentProgress
}

export function useTorrent() {
  const [active, setActive] = useState<ActiveTorrent[]>([])
  const pending = useRef<Map<string, { time: number; state: TorrentProgress }>>(new Map())
  const raf = useRef<number>(0)
  const recorded = useRef<Set<string>>(new Set())

  // Flush satu kali per frame (kapasitas update UI diringankan).
  const scheduleFlush = useCallback((key: string, state: TorrentProgress) => {
    pending.current.set(key, { time: performance.now(), state })

    if (state.done && !recorded.current.has(key)) {
      recorded.current.add(key)
      pushHistory({
        kind: 'torrent',
        platform: 'Torrent (P2P)',
        title: state.name || 'WebTorrent Download',
        thumbnail: null,
        source: key,
        format: 'torrent',
        engine: 'WebTorrent',
        status: 'done',
      })
    }

    if (raf.current) return
    raf.current = requestAnimationFrame(() => {
      raf.current = 0
      pending.current.forEach(({ state }, k) => {
        setActive((prev) => {
          const exists = prev.some((p) => p.key === k)
          return exists
            ? prev.map((p) => (p.key === k ? { ...p, progress: state } : p))
            : [...prev, { key: k, progress: state }]
        })
      })
      pending.current.clear()
    })
  }, [])

  const start = useCallback(
    (magnet: string) => {
      const watcher = (s: TorrentProgress) => scheduleFlush(magnet, s)
      void torrentManager.add(magnet, watcher)
    },
    [scheduleFlush],
  )

  const remove = useCallback(async (key: string) => {
    setActive((prev) => prev.filter((p) => p.key !== key))
    await torrentManager.remove(key)
  }, [])

  const clearFinished = useCallback(() => {
    setActive((prev) => prev.filter((p) => !p.progress.done))
  }, [])

  useEffect(
    () => () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    },
    [],
  )

  return { active, start, remove, clearFinished }
}