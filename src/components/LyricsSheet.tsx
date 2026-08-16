import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface LyricLine {
  time: number
  text: string
}

export function parseLrc(lrcText: string): LyricLine[] {
  if (!lrcText) return []
  const lines = lrcText.split('\n')
  const result: LyricLine[] = []
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const matches = Array.from(trimmed.matchAll(timeRegex))
    if (!matches.length) continue

    const text = trimmed.replace(timeRegex, '').trim()
    if (!text) continue

    for (const m of matches) {
      const mins = parseInt(m[1], 10)
      const secs = parseInt(m[2], 10)
      const ms = m[3] ? parseInt(m[3].padEnd(3, '0').slice(0, 3), 10) : 0
      const totalSeconds = mins * 60 + secs + ms / 1000
      result.push({ time: totalSeconds, text })
    }
  }

  return result.sort((a, b) => a.time - b.time)
}

interface LyricsSheetProps {
  open: boolean
  title: string
  artist: string
  artwork?: string
  lrcText?: string | null
  currentTime: number
  onSeek: (time: number) => void
  onClose: () => void
}

export function LyricsSheet({
  open,
  title,
  artist,
  artwork,
  lrcText,
  currentTime,
  onSeek,
  onClose,
}: LyricsSheetProps) {
  const [lyrics, setLyrics] = useState<LyricLine[]>([])
  const activeLineRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (lrcText) {
      setLyrics(parseLrc(lrcText))
    } else {
      setLyrics([])
    }
  }, [lrcText])

  // Cari baris lirik aktif berdasarkan currentTime
  let activeIndex = -1
  for (let i = 0; i < lyrics.length; i++) {
    if (currentTime >= lyrics[i].time) {
      activeIndex = i
    } else {
      break
    }
  }

  // Auto-scroll ke baris aktif
  useEffect(() => {
    if (activeLineRef.current && containerRef.current && open) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [activeIndex, open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex flex-col bg-paper/95 backdrop-blur-2xl"
        >
          {/* Background Blurred Album Glow */}
          {artwork && (
            <div
              className="absolute inset-0 pointer-events-none opacity-20 blur-3xl scale-125 bg-cover bg-center transition-all duration-700"
              style={{ backgroundImage: `url(${artwork})` }}
            />
          )}

          {/* Top Bar Header */}
          <div className="relative z-10 flex items-center justify-between p-4 sm:p-6 border-b border-glass-border">
            <div className="flex items-center gap-3.5">
              {artwork ? (
                <img
                  src={artwork}
                  alt={title}
                  className="h-12 w-12 rounded-xl object-cover shadow-md border border-glass-border"
                />
              ) : (
                <div className="h-12 w-12 rounded-xl bg-glass-2 flex items-center justify-center text-lg">
                  🎵
                </div>
              )}
              <div>
                <h3 className="font-display font-semibold text-base sm:text-lg text-ink truncate max-w-[220px] sm:max-w-md">
                  {title}
                </h3>
                <p className="font-mono text-xs text-ink-muted truncate max-w-[200px] sm:max-w-xs">
                  {artist || 'Unknown Artist'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-full p-2.5 bg-glass-2 text-ink transition-colors hover:bg-glass border border-glass-border"
              aria-label="Tutup Lirik"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Lyrics Content */}
          <div
            ref={containerRef}
            className="relative z-10 flex-1 overflow-y-auto px-6 py-12 text-center sm:text-left max-w-2xl mx-auto w-full space-y-6 select-none"
          >
            {lyrics.length > 0 ? (
              lyrics.map((line, idx) => {
                const isActive = idx === activeIndex
                return (
                  <motion.div
                    key={`${line.time}_${idx}`}
                    ref={isActive ? activeLineRef : null}
                    onClick={() => onSeek(line.time)}
                    className={`cursor-pointer transition-all duration-300 py-1.5 px-3 rounded-xl ${
                      isActive
                        ? 'text-accent font-display font-bold text-2xl sm:text-3xl scale-105 opacity-100 drop-shadow-[0_0_12px_rgba(235,94,85,0.4)]'
                        : 'text-ink-muted text-lg sm:text-xl opacity-40 hover:opacity-80 hover:text-ink font-medium'
                    }`}
                  >
                    {line.text}
                  </motion.div>
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-ink-muted space-y-3 pt-20">
                <span className="text-4xl">🎙️</span>
                <p className="font-mono text-sm">
                  {lrcText === null ? 'Memuat lirik karaoke...' : 'Lirik tersinkronisasi tidak tersedia untuk lagu ini.'}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
