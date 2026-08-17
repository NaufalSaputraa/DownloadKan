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

/* ------------------------------------------------------------------ */
/*  Waveform Visualizer Simulation                                     */
/* ------------------------------------------------------------------ */
function AudioWaveform({ isPlaying }: { isPlaying: boolean }) {
  const bars = [40, 75, 55, 95, 30, 85, 60, 100, 45, 70, 90, 35]

  return (
    <div className="flex items-center gap-[2px] h-4 px-1" aria-hidden="true">
      {bars.map((height, i) => (
        <motion.span
          key={i}
          className="w-[2px] rounded-full bg-accent"
          animate={{
            height: isPlaying ? [`${Math.max(20, height * 0.4)}%`, `${height}%`, `${Math.max(20, height * 0.2)}%`] : '20%',
          }}
          transition={{
            duration: 0.6 + (i % 4) * 0.15,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
            delay: (i % 3) * 0.1,
          }}
        />
      ))}
    </div>
  )
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
    if (!currentTrack || !audioRef.current) return
    const audio = audioRef.current
    if (!currentTrack.src) {
      setIsPlaying(false)
      return
    }

    audio.pause()
    audio.currentTime = 0
    audio.volume = 1.0
    audio.src = currentTrack.src
    audio.load()

    const playPromise = audio.play()
    if (playPromise !== undefined) {
      playPromise
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn('Audio play notice:', err)
          setIsPlaying(false)
        })
    }
  }, [currentTrack])

  const togglePlay = () => {
    if (!audioRef.current) return
    const audio = audioRef.current
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.volume = 1.0
      const playPromise = audio.play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn('Play error:', err)
          })
      }
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
        preload="auto"
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={(e) => {
          console.warn('Audio tag playback error:', e)
          setIsPlaying(false)
        }}
      />

      <AnimatePresence>
        <motion.div
          initial={{ y: 80, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 80, opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-3 bottom-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-[60] w-auto max-w-xl mx-auto"
        >
          <div className="glass-2 rounded-2xl p-3 sm:p-3.5 border border-glass-border shadow-2xl backdrop-blur-2xl flex flex-col gap-2.5">
            {/* Top Row: Track info & Controls */}
            <div className="flex items-center justify-between gap-3">
              {/* Artwork & Info */}
              <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                {currentTrack.artwork ? (
                  <img
                    src={currentTrack.artwork}
                    alt={currentTrack.title}
                    className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl object-cover border border-glass-border flex-shrink-0 shadow-md"
                  />
                ) : (
                  <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-glass flex items-center justify-center flex-shrink-0 text-ink-muted border border-glass-border">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  </div>
                )}
                <div className="truncate min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-display font-medium text-xs sm:text-sm text-ink truncate">
                      {currentTrack.title}
                    </h4>
                    <span className="hidden sm:inline-flex items-center rounded px-1.5 py-0.2 font-mono text-[9px] bg-accent/15 text-accent border border-accent/25">
                      Lossless FLAC
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-[10px] sm:text-[11px] text-ink-muted truncate">
                      {currentTrack.artist || 'DownloadKan Audio'}
                    </p>
                    <AudioWaveform isPlaying={isPlaying} />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                {/* Lyrics Sheet Toggle */}
                <button
                  type="button"
                  onClick={() => setLyricsOpen(true)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-mono font-medium flex items-center gap-1.5 transition-colors border cursor-pointer ${
                    lrcText
                      ? 'bg-accent/15 text-accent border-accent/30 hover:bg-accent/25'
                      : 'bg-glass text-ink-muted border-glass-border hover:text-ink'
                  }`}
                  title="Buka Lirik Karaoke Tersinkronisasi"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                  <span className="hidden sm:inline">Lirik</span>
                </button>

                {/* Play / Pause Button */}
                <button
                  type="button"
                  onClick={togglePlay}
                  className="rounded-full bg-accent text-paper p-2 sm:p-2.5 hover:scale-105 active:scale-95 transition-transform shadow-md cursor-pointer flex items-center justify-center"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  )}
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full p-1.5 text-ink-muted hover:text-ink hover:bg-glass transition-colors cursor-pointer"
                  aria-label="Tutup pemutar audio"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Bottom Row: Scrubber & Time */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-ink-muted w-7 text-right">
                {formatSecs(currentTime)}
              </span>
              <div
                className="relative flex-1 h-1.5 bg-glass-border/40 hover:h-2 rounded-full cursor-pointer overflow-hidden transition-all"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const pos = (e.clientX - rect.left) / rect.width
                  handleSeek(pos * duration)
                }}
              >
                <div
                  className="h-full bg-accent rounded-full relative"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="font-mono text-[10px] text-ink-muted w-7">
                {formatSecs(duration)}
              </span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Synchronized Lyrics Overlay Modal */}
      <LyricsSheet
        open={lyricsOpen}
        onClose={() => setLyricsOpen(false)}
        title={currentTrack.title}
        artist={currentTrack.artist}
        artwork={currentTrack.artwork}
        currentTime={currentTime}
        lrcText={lrcText}
        onSeek={handleSeek}
      />
    </>
  )
}
