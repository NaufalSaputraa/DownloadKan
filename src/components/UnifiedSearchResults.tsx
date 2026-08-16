import { useState } from 'react'
import { motion } from 'framer-motion'
import type { LocalVideoItem, LocalMusicItem } from '../lib/api-local'
import { startLocalDownload } from '../lib/api-local'
import { useToast } from '../hooks/useToast'

export interface UnifiedResultsProps {
  query: string
  videos: LocalVideoItem[]
  musics: LocalMusicItem[]
  onSelectUrl?: (url: string) => void
}

type FilterType = 'all' | 'video' | 'music'

export function UnifiedSearchResults({ query, videos, musics, onSelectUrl }: UnifiedResultsProps) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [playingPreview, setPlayingPreview] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const { push } = useToast()

  const handleDownloadMusic = async (track: LocalMusicItem, format: 'mp3' | 'flac' = 'mp3') => {
    try {
      setDownloadingId(track.id)
      await startLocalDownload({
        url: `${track.artist} - ${track.title}`,
        format,
        category: 'Music',
        title: track.title,
        artist: track.artist,
        album: track.album,
        artwork: track.artwork,
      })
      push(`Memulai unduhan full song: ${track.artist} - ${track.title}`, 'info')
    } catch (e) {
      push(`Gagal mengunduh musik: ${(e as Error).message}`, 'error')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDownloadVideo = async (video: LocalVideoItem, format: 'video' | 'audio' = 'video') => {
    try {
      setDownloadingId(video.id)
      if (format === 'video') {
        await startLocalDownload({
          url: video.url,
          format: 'best',
          category: 'Videos',
          title: video.title,
        })
        push(`Memulai unduhan video: ${video.title}`, 'info')
      } else {
        await startLocalDownload({
          url: video.url,
          format: 'mp3',
          category: 'Music',
          title: video.title,
        })
        push(`Memulai ekstraksi audio: ${video.title}`, 'info')
      }
    } catch (e) {
      push(`Gagal memulai unduhan: ${(e as Error).message}`, 'error')
    } finally {
      setDownloadingId(null)
    }
  }

  const togglePreview = (previewUrl: string) => {
    if (playingPreview === previewUrl) {
      setPlayingPreview(null)
    } else {
      setPlayingPreview(previewUrl)
    }
  }

  const showVideos = (filter === 'all' || filter === 'video') && videos.length > 0
  const showMusics = (filter === 'all' || filter === 'music') && musics.length > 0

  return (
    <div className="w-full space-y-4">
      {/* Header & Filter Pills */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl text-ink">Hasil Pencarian</h2>
          <p className="font-mono text-xs text-ink-muted">
            Menemukan {videos.length} video & {musics.length} lagu untuk &quot;{query}&quot;
          </p>
        </div>

        {/* Filter Switcher */}
        <div className="flex items-center gap-1.5 rounded-full bg-glass p-1 border border-glass-border">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === 'all' ? 'bg-glass-2 text-ink font-semibold' : 'text-ink-muted hover:text-ink'
            }`}
          >
            Semua ({videos.length + musics.length})
          </button>
          <button
            onClick={() => setFilter('video')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === 'video' ? 'bg-glass-2 text-ink font-semibold' : 'text-ink-muted hover:text-ink'
            }`}
          >
            🎬 Video ({videos.length})
          </button>
          <button
            onClick={() => setFilter('music')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === 'music' ? 'bg-glass-2 text-ink font-semibold' : 'text-ink-muted hover:text-ink'
            }`}
          >
            🎵 Musik ({musics.length})
          </button>
        </div>
      </div>

      {/* Hidden Audio Player for Preview */}
      {playingPreview && (
        <audio
          src={playingPreview}
          autoPlay
          onEnded={() => setPlayingPreview(null)}
          onError={() => setPlayingPreview(null)}
          className="hidden"
        />
      )}

      {/* SECTION: MUSIK FULL SONG */}
      {showMusics && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold uppercase tracking-wider text-accent">🎵 Musik Lossless & Full Song</span>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
              100% Full Track + Cover Art HD
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {musics.map((track) => {
              const isPlaying = playingPreview === track.preview
              const isDownloading = downloadingId === track.id

              return (
                <motion.div
                  key={track.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass flex flex-col justify-between rounded-2xl p-3 border border-glass-border hover:border-accent/40 transition-all"
                >
                  <div className="flex items-start gap-3">
                    {/* Artwork */}
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-glass-2">
                      {track.artwork ? (
                        <img
                          src={track.artwork}
                          alt={track.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center font-mono text-xs text-ink-muted">
                          FLAC
                        </div>
                      )}
                      {track.preview && (
                        <button
                          onClick={() => togglePreview(track.preview!)}
                          className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-90 hover:opacity-100 transition-opacity"
                          title={isPlaying ? 'Jeda preview' : 'Putar preview'}
                        >
                          {isPlaying ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M6 4h4v16H6V4Zm8 0h4v16h-4V4Z" />
                            </svg>
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0">
                      <h4 className="truncate font-medium text-ink text-sm" title={track.title}>
                        {track.title}
                      </h4>
                      <p className="truncate font-mono text-xs text-ink-muted" title={track.artist}>
                        {track.artist}
                      </p>
                      <p className="truncate font-mono text-[11px] text-ink-faint/70" title={track.album}>
                        {track.album || 'Single'} {track.duration_str ? `· ${track.duration_str}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex items-center gap-2 pt-2 border-t border-glass-border">
                    <button
                      onClick={() => handleDownloadMusic(track, 'mp3')}
                      disabled={isDownloading}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-ink px-3 py-1.5 text-xs font-medium text-paper hover:bg-[oklch(86%_0.008_260)] transition-colors disabled:opacity-50"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                      </svg>
                      {isDownloading ? 'Mengunduh...' : 'Unduh Full MP3 320k'}
                    </button>

                    <button
                      onClick={() => handleDownloadMusic(track, 'flac')}
                      disabled={isDownloading}
                      className="inline-flex items-center justify-center gap-1 rounded-xl border border-glass-border bg-glass px-2.5 py-1.5 text-xs font-mono text-emerald-400 hover:bg-glass-2 transition-colors"
                      title="Unduh FLAC Lossless 24-bit"
                    >
                      FLAC
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* SECTION: YOUTUBE VIDEO */}
      {showVideos && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold uppercase tracking-wider text-rose-400">🎬 Video YouTube</span>
            <span className="font-mono text-xs text-ink-muted">Resolusi hingga 1080p / 4K</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {videos.map((vid) => {
              const isDownloading = downloadingId === vid.id

              return (
                <motion.div
                  key={vid.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass flex flex-col justify-between rounded-2xl overflow-hidden border border-glass-border hover:border-accent/40 transition-all"
                >
                  {/* Thumbnail with Duration Badge */}
                  <div className="relative aspect-video w-full bg-glass-2 overflow-hidden">
                    {vid.thumbnail && (
                      <img
                        src={vid.thumbnail}
                        alt={vid.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    )}
                    {vid.duration_str && (
                      <span className="absolute bottom-2 right-2 rounded-md bg-black/75 px-1.5 py-0.5 font-mono text-[10px] text-white">
                        {vid.duration_str}
                      </span>
                    )}
                  </div>

                  {/* Body Info */}
                  <div className="p-3 space-y-1">
                    <h4 className="line-clamp-2 font-medium text-ink text-sm leading-snug" title={vid.title}>
                      {vid.title}
                    </h4>
                    <p className="truncate font-mono text-xs text-ink-muted">
                      {vid.channel || 'YouTube'}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="p-3 pt-0 flex items-center gap-2">
                    <button
                      onClick={() => handleDownloadVideo(vid, 'video')}
                      disabled={isDownloading}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-ink px-3 py-1.5 text-xs font-medium text-paper hover:bg-[oklch(86%_0.008_260)] transition-colors disabled:opacity-50"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                      </svg>
                      {isDownloading ? 'Memproses...' : 'Unduh Video'}
                    </button>

                    <button
                      onClick={() => handleDownloadVideo(vid, 'audio')}
                      disabled={isDownloading}
                      className="inline-flex items-center justify-center gap-1 rounded-xl border border-glass-border bg-glass px-3 py-1.5 text-xs text-ink hover:bg-glass-2 transition-colors"
                      title="Ekstrak Audio MP3"
                    >
                      Audio
                    </button>

                    {onSelectUrl && (
                      <button
                        onClick={() => onSelectUrl(vid.url)}
                        className="rounded-xl border border-glass-border bg-glass p-1.5 text-ink-muted hover:text-ink hover:bg-glass-2 transition-colors"
                        title="Analisis detail resolusi"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
