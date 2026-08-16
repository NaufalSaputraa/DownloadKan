import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LyricsSheet } from './LyricsSheet'
import { fetchLyrics } from '../lib/api-local'

export interface TrackState {
  title: string
  artist: string
  album?: string
  artwork?: string
  src: string
  duration?: number
}

interface AudioPlayerProps {
  currentTrack: TrackState | null
  onClose: () => void
}

function formatSecs(s: number): string {
  if (isNaN(s) || s < 0) return '0:00'
  const mins = Math.floor(s / 60)
  const secs = Math.floor(s % 60)
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

export function AudioPlayer({ currentTrack, onClose }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [lyricsOpen, setLyricsOpen] = useState(false)
  const [lrcText, setLrcText] = useState<string | null>(null)

  // Muat lirik saat track berganti
  useEffect(() => {
    if (!currentTrack) {
      setLrcText(null)
      return
    }
    let mounted = true
    fetchLyrics(currentTrack.title, currentTrack.artist, currentTrack.album).then((res) => {
      if (mounted) {
        setLrcText(res.lyrics)
      }
    })
    return () => {
      mounted = false
    }
  }, [currentTrack])

  // Play audio otomatis saat track baru dimuat
  useEffect(() => {
    if (audioRef.current && currentTrack) {
      audioRef.current.src = currentTrack.src
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
    }
  }, [currentTrack])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || currentTrack?.duration || 0)
    }
  }

  const handleSeek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }, [])

  if (!currentTrack) return null

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <>
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      <AnimatePresence>
        <motion.div
          initial={{ y: 80, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 80, opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-3 bottom-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-[60] w-auto max-w-xl mx-auto"
        >
          <div className="glass-2 rounded-2xl p-3 sm:p-3.5 border border-accent/40 shadow-2xl shadow-accent/10 backdrop-blur-xl flex flex-col gap-2">
            {/* Top Row: Track info & Controls */}
            <div className="flex items-center justify-between gap-3">
              {/* Artwork & Info */}
              <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                {currentTrack.artwork ? (
                  <img
                    src={currentTrack.artwork}
                    alt={currentTrack.title}
                    className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl object-cover border border-glass-border flex-shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-glass flex items-center justify-center text-base flex-shrink-0">
                    🎵
                  </div>
                )}
                <div className="truncate min-w-0">
                  <h4 className="font-display font-medium text-xs sm:text-sm text-ink truncate">
                    {currentTrack.title}
                  </h4>
                  <p className="font-mono text-[10px] sm:text-[11px] text-ink-muted truncate">
                    {currentTrack.artist || 'DownloadKan Audio'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                {/* Lyrics Sheet Toggle */}
                <button
                  type="button"
                  onClick={() => setLyricsOpen(true)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-mono font-medium flex items-center gap-1 transition-colors border ${
                    lrcText
                      ? 'bg-accent/15 text-accent border-accent/30 hover:bg-accent/25'
                      : 'bg-glass text-ink-muted border-glass-border hover:text-ink'
                  }`}
                  title="Buka Lirik Karaoke"
                >
                  <span>🎙️</span>
                  <span className="hidden sm:inline">Lirik</span>
                </button>

                {/* Play / Pause */}
                <button
                  type="button"
                  onClick={togglePlay}
                  className="rounded-full bg-accent text-white p-2 sm:p-2.5 hover:scale-105 active:scale-95 transition-transform shadow-md shadow-accent/25"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                {/* Close Player */}
                <button
                  type="button"
                  onClick={() => {
                    audioRef.current?.pause()
                    onClose()
                  }}
                  className="rounded-full p-1.5 text-ink-faint hover:text-ink hover:bg-glass transition-colors"
                  aria-label="Tutup Player"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Bottom Row: Scrubber & Timers */}
            <div className="flex items-center gap-2 font-mono text-[10px] text-ink-muted">
              <span>{formatSecs(currentTime)}</span>
              <div
                className="relative flex-1 h-1.5 bg-glass-2 rounded-full overflow-hidden cursor-pointer group"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const pct = (e.clientX - rect.left) / rect.width
                  handleSeek(pct * duration)
                }}
              >
                <div
                  className="h-full bg-accent rounded-full transition-[width] duration-150"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span>{formatSecs(duration)}</span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Karaoke Lyrics Modal */}
      <LyricsSheet
        open={lyricsOpen}
        title={currentTrack.title}
        artist={currentTrack.artist}
        artwork={currentTrack.artwork}
        lrcText={lrcText}
        currentTime={currentTime}
        onSeek={handleSeek}
        onClose={() => setLyricsOpen(false)}
      />
    </>
  )
}
