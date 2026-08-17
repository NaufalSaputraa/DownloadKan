import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { LocalVideoItem, LocalMusicItem } from '../lib/api-local'
import { startLocalDownload } from '../lib/api-local'
import { useToast } from '../hooks/useToast'
import { SortSelect, type SortOption } from './ui/SortSelect'

export interface UnifiedResultsProps {
  query: string
  videos: LocalVideoItem[]
  musics: LocalMusicItem[]
  onSelectUrl?: (url: string) => void
  onPlayTrack?: (track: LocalMusicItem) => void
}

type FilterType = 'all' | 'video' | 'music'
type AudioFormat = 'flac' | 'mp3' | 'm4a' | 'wav' | 'opus'
type MusicSortType = 'default' | 'name-az' | 'name-za' | 'artist-az' | 'duration-long' | 'duration-short'
type VideoSortType = 'default' | 'name-az' | 'name-za' | 'views-most' | 'views-least' | 'duration-long' | 'duration-short'

const MUSIC_PER_PAGE = 16
const VIDEO_PER_PAGE = 8

const MUSIC_SORT_OPTIONS: SortOption<MusicSortType>[] = [
  { id: 'default', label: 'Paling Relevan', icon: '🔍' },
  { id: 'name-az', label: 'Judul A → Z', icon: '🔤' },
  { id: 'name-za', label: 'Judul Z → A', icon: '🔤' },
  { id: 'artist-az', label: 'Artis A → Z', icon: '🎤' },
  { id: 'duration-long', label: 'Durasi Terlama', icon: '⏱️' },
  { id: 'duration-short', label: 'Durasi Terpendek', icon: '⏱️' },
]

const VIDEO_SORT_OPTIONS: SortOption<VideoSortType>[] = [
  { id: 'default', label: 'Paling Relevan', icon: '🔍' },
  { id: 'name-az', label: 'Judul A → Z', icon: '🔤' },
  { id: 'name-za', label: 'Judul Z → A', icon: '🔤' },
  { id: 'views-most', label: 'Views Terbanyak', icon: '👀' },
  { id: 'views-least', label: 'Views Tersedikit', icon: '👀' },
  { id: 'duration-long', label: 'Durasi Terlama', icon: '⏱️' },
  { id: 'duration-short', label: 'Durasi Terpendek', icon: '⏱️' },
]

const AUDIO_FORMAT_OPTIONS: Array<{ id: AudioFormat; label: string; desc: string; badge: string }> = [
  { id: 'flac', label: 'FLAC Lossless', desc: 'Master 24-bit Studio Quality', badge: 'Terbaik' },
  { id: 'mp3', label: 'MP3 320k', desc: 'Ultra High Quality MP3', badge: 'Universal' },
  { id: 'm4a', label: 'M4A / AAC', desc: 'Apple Music 256 kbps', badge: 'iOS/Mac' },
  { id: 'wav', label: 'WAV 16-bit', desc: 'Uncompressed Studio Audio', badge: 'Raw' },
  { id: 'opus', label: 'OPUS 160k', desc: 'Modern High Efficiency Codec', badge: 'Stream' },
]

function sortMusics(arr: LocalMusicItem[], sort: MusicSortType): LocalMusicItem[] {
  if (sort === 'default') return arr
  const sorted = [...arr]
  switch (sort) {
    case 'name-az': return sorted.sort((a, b) => a.title.localeCompare(b.title))
    case 'name-za': return sorted.sort((a, b) => b.title.localeCompare(a.title))
    case 'artist-az': return sorted.sort((a, b) => a.artist.localeCompare(b.artist))
    case 'duration-long': return sorted.sort((a, b) => (b.duration || 0) - (a.duration || 0))
    case 'duration-short': return sorted.sort((a, b) => (a.duration || 0) - (b.duration || 0))
    default: return sorted
  }
}

function sortVideos(arr: LocalVideoItem[], sort: VideoSortType): LocalVideoItem[] {
  if (sort === 'default') return arr
  const sorted = [...arr]
  switch (sort) {
    case 'name-az': return sorted.sort((a, b) => a.title.localeCompare(b.title))
    case 'name-za': return sorted.sort((a, b) => b.title.localeCompare(a.title))
    case 'views-most': return sorted.sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
    case 'views-least': return sorted.sort((a, b) => (a.view_count || 0) - (b.view_count || 0))
    case 'duration-long': return sorted.sort((a, b) => (b.duration || 0) - (a.duration || 0))
    case 'duration-short': return sorted.sort((a, b) => (a.duration || 0) - (b.duration || 0))
    default: return sorted
  }
}

export function UnifiedSearchResults({ query, videos, musics, onSelectUrl, onPlayTrack }: UnifiedResultsProps) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [musicPage, setMusicPage] = useState(1)
  const [videoPage, setVideoPage] = useState(1)
  const [musicSort, setMusicSort] = useState<MusicSortType>('default')
  const [videoSort, setVideoSort] = useState<VideoSortType>('default')
  const [selectedFormats, setSelectedFormats] = useState<Record<string, AudioFormat>>({})
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null)
  const { push } = useToast()

  const handleDownloadMusic = async (track: LocalMusicItem, forcedFormat?: AudioFormat) => {
    const format = forcedFormat || selectedFormats[track.id] || 'flac'
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
      push(`Memulai unduhan (${format.toUpperCase()}): ${track.artist} - ${track.title}`, 'info')
    } catch (e) {
      push(`Gagal mengunduh musik: ${(e as Error).message}`, 'error')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDownloadVideo = async (video: LocalVideoItem, format: 'video' | 'audio' = 'video') => {
    try {
      setDownloadingId(video.id)
      if (format === 'audio') {
        await startLocalDownload({
          url: video.url,
          format: 'mp3',
          category: 'Music',
          title: video.title,
        })
        push(`Mengekstrak audio MP3: ${video.title}`, 'info')
      } else {
        await startLocalDownload({
          url: video.url,
          format: '1080p',
          category: 'Videos',
          title: video.title,
        })
        push(`Memulai unduhan Full HD: ${video.title}`, 'info')
      }
    } catch (e) {
      push(`Gagal memulai unduhan: ${(e as Error).message}`, 'error')
    } finally {
      setDownloadingId(null)
    }
  }

  const showVideos = (filter === 'all' || filter === 'video') && videos.length > 0
  const showMusics = (filter === 'all' || filter === 'music') && musics.length > 0

  const sortedMusics = useMemo(() => sortMusics(musics, musicSort), [musics, musicSort])
  const sortedVideos = useMemo(() => sortVideos(videos, videoSort), [videos, videoSort])

  const totalMusicPages = Math.ceil(sortedMusics.length / MUSIC_PER_PAGE) || 1
  const totalVideoPages = Math.ceil(sortedVideos.length / VIDEO_PER_PAGE) || 1

  const paginatedMusics = sortedMusics.slice((musicPage - 1) * MUSIC_PER_PAGE, musicPage * MUSIC_PER_PAGE)
  const paginatedVideos = sortedVideos.slice((videoPage - 1) * VIDEO_PER_PAGE, videoPage * VIDEO_PER_PAGE)

  return (
    <div className="w-full space-y-5">
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
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
              filter === 'all' ? 'bg-glass-2 text-ink font-semibold' : 'text-ink-muted hover:text-ink'
            }`}
          >
            Semua ({videos.length + musics.length})
          </button>
          <button
            onClick={() => setFilter('video')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
              filter === 'video' ? 'bg-glass-2 text-ink font-semibold' : 'text-ink-muted hover:text-ink'
            }`}
          >
            🎬 Video ({videos.length})
          </button>
          <button
            onClick={() => setFilter('music')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
              filter === 'music' ? 'bg-glass-2 text-ink font-semibold' : 'text-ink-muted hover:text-ink'
            }`}
          >
            🎵 Musik ({musics.length})
          </button>
        </div>
      </div>

      {/* SECTION: MUSIK FULL SONG */}
      {showMusics && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold uppercase tracking-wider text-accent">🎵 Musik Lossless & Full Song</span>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
                100% Full Track + Cover Art HD
              </span>
            </div>
            <div className="flex items-center gap-3">
              <SortSelect
                options={MUSIC_SORT_OPTIONS}
                value={musicSort}
                onChange={(v) => {
                  setMusicSort(v)
                  setMusicPage(1)
                }}
                label="Urutkan:"
              />
              <span className="font-mono text-[11px] text-ink-muted hidden sm:inline">
                Hal {musicPage} dari {totalMusicPages} ({musics.length} lagu)
              </span>
            </div>
          </div>

          {/* Music Cards Grid */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 items-start">
            {paginatedMusics.map((track) => {
              const isDownloading = downloadingId === track.id
              const currentFormat = selectedFormats[track.id] || 'flac'
              const isExpanded = expandedTrackId === track.id

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
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-glass-2 border border-glass-border">
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
                          onClick={() => onPlayTrack?.(track)}
                          className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                          title="Putar lagu & lirik karaoke"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
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
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="truncate font-mono text-[11px] text-ink-faint" title={track.album}>
                          {track.album || 'Single'} {track.duration_str ? `· ${track.duration_str}` : ''}
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded font-mono text-[9px] bg-accent/15 text-accent border border-accent/25 uppercase">
                          {currentFormat.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Format Options Drawer */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2.5 pt-2.5 border-t border-glass-border/60 flex flex-col gap-1.5 overflow-hidden"
                      >
                        <span className="font-mono text-[10px] text-ink-muted uppercase tracking-wider">
                          Pilih Format Unduhan Audio:
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {AUDIO_FORMAT_OPTIONS.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setSelectedFormats((prev) => ({ ...prev, [track.id]: opt.id }))
                                setExpandedTrackId(null)
                              }}
                              className={`p-1.5 rounded-lg text-left border text-xs transition-all cursor-pointer flex items-center justify-between ${
                                currentFormat === opt.id
                                  ? 'bg-accent/20 border-accent text-ink font-semibold'
                                  : 'bg-glass/40 border-glass-border hover:bg-glass text-ink-muted hover:text-ink'
                              }`}
                            >
                              <div className="truncate">
                                <p className="font-mono text-[11px] leading-none">{opt.label}</p>
                                <p className="font-mono text-[9px] opacity-70 mt-0.5">{opt.desc}</p>
                              </div>
                              <span className="font-mono text-[8px] px-1 py-0.2 rounded bg-glass text-accent border border-glass-border flex-shrink-0 ml-1">
                                {opt.badge}
                              </span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Actions Bar */}
                  <div className="mt-2.5 flex items-center gap-2 pt-2 border-t border-glass-border">
                    {/* Primary Download Button */}
                    <button
                      onClick={() => handleDownloadMusic(track)}
                      disabled={isDownloading}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-medium text-paper hover:opacity-95 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                      </svg>
                      {isDownloading ? 'Mengunduh...' : `Unduh ${currentFormat.toUpperCase()}`}
                    </button>

                    {/* Format Switcher Toggle */}
                    <button
                      type="button"
                      onClick={() => setExpandedTrackId(isExpanded ? null : track.id)}
                      className={`inline-flex items-center justify-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-mono transition-colors cursor-pointer ${
                        isExpanded
                          ? 'bg-accent/20 border-accent text-accent'
                          : 'border-glass-border bg-glass text-ink-muted hover:text-ink hover:bg-glass-2'
                      }`}
                      title="Ubah Format Audio (FLAC, MP3, M4A, WAV, OPUS)"
                    >
                      <span>Format</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={isExpanded ? 'rotate-180 transition-transform' : 'transition-transform'}>
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Music Pagination Bar */}
          {totalMusicPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-3">
              <button
                type="button"
                onClick={() => setMusicPage((p) => Math.max(1, p - 1))}
                disabled={musicPage === 1}
                className="px-3 py-1.5 rounded-lg border border-glass-border bg-glass text-xs font-mono text-ink-muted hover:text-ink disabled:opacity-30 cursor-pointer"
              >
                ← Sebelumnya
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalMusicPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    type="button"
                    onClick={() => setMusicPage(pg)}
                    className={`w-7 h-7 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                      musicPage === pg
                        ? 'bg-accent text-paper font-semibold'
                        : 'bg-glass/40 hover:bg-glass text-ink-muted hover:text-ink border border-glass-border'
                    }`}
                  >
                    {pg}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setMusicPage((p) => Math.min(totalMusicPages, p + 1))}
                disabled={musicPage === totalMusicPages}
                className="px-3 py-1.5 rounded-lg border border-glass-border bg-glass text-xs font-mono text-ink-muted hover:text-ink disabled:opacity-30 cursor-pointer"
              >
                Berikutnya →
              </button>
            </div>
          )}
        </div>
      )}

      {/* SECTION: YOUTUBE VIDEO */}
      {showVideos && (
        <div className="space-y-3 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold uppercase tracking-wider text-rose-400">🎬 Video YouTube</span>
              <span className="font-mono text-xs text-ink-muted">Resolusi hingga 1080p / 4K</span>
            </div>
            <div className="flex items-center gap-3">
              <SortSelect
                options={VIDEO_SORT_OPTIONS}
                value={videoSort}
                onChange={(v) => {
                  setVideoSort(v)
                  setVideoPage(1)
                }}
                label="Urutkan:"
              />
              <span className="font-mono text-[11px] text-ink-muted hidden sm:inline">
                Hal {videoPage} dari {totalVideoPages} ({videos.length} video)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 items-start">
            {paginatedVideos.map((vid) => {
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
                      <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[10px] text-white">
                        {vid.duration_str}
                      </span>
                    )}
                  </div>

                  {/* Video Details */}
                  <div className="p-3 flex flex-col justify-between flex-1">
                    <div>
                      <h4 className="font-medium text-ink text-sm line-clamp-2" title={vid.title}>
                        {vid.title}
                      </h4>
                      <p className="mt-1 font-mono text-xs text-ink-muted truncate">
                        {vid.channel || 'YouTube'}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="mt-3 flex items-center gap-2 pt-2 border-t border-glass-border">
                      <button
                        onClick={() => onSelectUrl?.(vid.url)}
                        className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-accent px-3 py-1.5 text-xs font-medium text-paper hover:opacity-95 transition-all shadow-sm cursor-pointer"
                        title="Analisis opsi resolusi 4K/1080p, pemotong durasi, & subtitle"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        Pilih Resolusi (4K/HD)
                      </button>

                      <button
                        onClick={() => handleDownloadVideo(vid, 'audio')}
                        disabled={isDownloading}
                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-glass-border bg-glass px-2.5 py-1.5 text-xs font-mono text-ink-muted hover:text-ink hover:bg-glass-2 transition-colors disabled:opacity-50 cursor-pointer"
                        title="Unduh Audio Langsung"
                      >
                        Audio
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Video Pagination Bar */}
          {totalVideoPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-3">
              <button
                type="button"
                onClick={() => setVideoPage((p) => Math.max(1, p - 1))}
                disabled={videoPage === 1}
                className="px-3 py-1.5 rounded-lg border border-glass-border bg-glass text-xs font-mono text-ink-muted hover:text-ink disabled:opacity-30 cursor-pointer"
              >
                ← Sebelumnya
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalVideoPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    type="button"
                    onClick={() => setVideoPage(pg)}
                    className={`w-7 h-7 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                      videoPage === pg
                        ? 'bg-accent text-paper font-semibold'
                        : 'bg-glass/40 hover:bg-glass text-ink-muted hover:text-ink border border-glass-border'
                    }`}
                  >
                    {pg}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setVideoPage((p) => Math.min(totalVideoPages, p + 1))}
                disabled={videoPage === totalVideoPages}
                className="px-3 py-1.5 rounded-lg border border-glass-border bg-glass text-xs font-mono text-ink-muted hover:text-ink disabled:opacity-30 cursor-pointer"
              >
                Berikutnya →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
