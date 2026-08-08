import { motion } from 'framer-motion'

export interface MusicTrackItem {
  id: number
  title: string
  artist: string
  album: string
  cover: string
  preview: string
  duration: number
  link: string
}

interface Props {
  query: string
  results: MusicTrackItem[]
  onSelectTrack: (link: string) => void
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

export function MusicSearchResults({ query, results, onSelectTrack }: Props) {
  if (!results.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-[24px] p-6 text-center"
      >
        <p className="font-medium text-ink">Tidak ada hasil musik untuk &quot;{query}&quot;</p>
        <p className="mt-1 font-mono text-xs text-ink-muted">Coba ketik kata kunci judul lagu atau nama artis lain.</p>
      </motion.div>
    )
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between px-1">
        <h2 className="font-display text-xl text-ink">Hasil Pencarian Musik ({results.length})</h2>
        <span className="font-mono text-xs text-ink-faint">Query: &quot;{query}&quot;</span>
      </div>

      <div className="space-y-3">
        {results.map((track, idx) => (
          <motion.div
            key={track.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="glass group flex flex-col gap-4 rounded-[20px] p-4 transition-all hover:bg-glass-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-3.5">
              {track.cover ? (
                <img
                  src={track.cover}
                  alt=""
                  loading="lazy"
                  className="h-16 w-16 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-glass-2 text-ink-faint">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M9 18V5l12-2v13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="1.8" />
                    <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                </div>
              )}

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-base font-medium text-ink" title={track.title}>
                    {track.title}
                  </h3>
                  <span className="rounded-full bg-glass-2 px-2 py-0.5 font-mono text-[10px] text-ink-faint">
                    {formatDuration(track.duration)}
                  </span>
                </div>
                <p className="truncate text-xs font-medium text-ink-muted">{track.artist}</p>
                <p className="truncate font-mono text-[11px] text-ink-faint">{track.album}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              {track.preview && (
                <div className="w-full sm:w-44">
                  <audio
                    controls
                    controlsList="nodownload"
                    className="h-7 w-full rounded-md accent-accent"
                    src={track.preview}
                  >
                    Audio tidak didukung
                  </audio>
                </div>
              )}

              <button
                onClick={() => onSelectTrack(track.link)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper transition-transform hover:scale-105 hover:bg-[oklch(86%_0.008_260)]"
                title="Pilih lagu ini untuk diunduh versi FLAC / MP3 320kbps"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Unduh FLAC / MP3
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  )
}
