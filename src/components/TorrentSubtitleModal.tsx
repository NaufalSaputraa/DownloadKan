import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { searchMovieSubtitles, downloadSingleSubtitle, type MovieSubtitleItem } from '../lib/api-local'
import { useToast } from '../hooks/useToast'

interface TorrentSubtitleModalProps {
  open: boolean
  movieTitle: string
  magnet?: string
  onClose: () => void
  onStartTorrent?: (magnet: string, title: string) => void
}

const LANGUAGE_FILTERS = [
  { id: 'all', label: 'Semua Bahasa', flag: '🌐' },
  { id: 'id', label: 'Indonesia', flag: '🇮🇩' },
  { id: 'en', label: 'English', flag: '🇬🇧' },
  { id: 'ja', label: 'Jepang', flag: '🇯🇵' },
  { id: 'ko', label: 'Korea', flag: '🇰🇷' },
  { id: 'ar', label: 'Arab', flag: '🇸🇦' },
  { id: 'es', label: 'Spanyol', flag: '🇪🇸' },
  { id: 'fr', label: 'Prancis', flag: '🇫🇷' },
  { id: 'de', label: 'Jerman', flag: '🇩🇪' },
]

export function TorrentSubtitleModal({
  open,
  movieTitle,
  magnet,
  onClose,
  onStartTorrent,
}: TorrentSubtitleModalProps) {
  const [loading, setLoading] = useState(false)
  const [subtitles, setSubtitles] = useState<MovieSubtitleItem[]>([])
  const [cleanTitle, setCleanTitle] = useState('')
  const [year, setYear] = useState('')
  const [langFilter, setLangFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null)
  const [downloadedUrls, setDownloadedUrls] = useState<Set<string>>(new Set())
  const { push } = useToast()

  useEffect(() => {
    if (!open || !movieTitle) {
      setSubtitles([])
      return
    }

    let mounted = true
    setLoading(true)
    setCleanTitle('')
    setYear('')
    setLangFilter('all')
    setDownloadedUrls(new Set())

    searchMovieSubtitles(movieTitle)
      .then((res) => {
        if (!mounted) return
        setSubtitles(res.subtitles || [])
        setCleanTitle(res.clean_title || movieTitle)
        setYear(res.year || '')
      })
      .catch((err) => {
        if (!mounted) return
        push(`Gagal memuat subtitle: ${(err as Error).message}`, 'error')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [open, movieTitle, push])

  const handleDownloadSubtitleOnly = async (sub: MovieSubtitleItem) => {
    if (!sub.sub_page) return
    try {
      setDownloadingUrl(sub.sub_page)
      const res = await downloadSingleSubtitle(sub.sub_page, sub.lang_code, cleanTitle || movieTitle)
      if (res) {
        push(`Berhasil mengunduh subtitle: ${res}`, 'success')
        setDownloadedUrls((prev) => new Set([...prev, sub.sub_page!]))
      } else {
        push(`Gagal mengunduh subtitle pilihan.`, 'error')
      }
    } catch (e) {
      push(`Gagal mengunduh: ${(e as Error).message}`, 'error')
    } finally {
      setDownloadingUrl(null)
    }
  }

  const handleDownloadMovieAndSubtitle = async (sub: MovieSubtitleItem) => {
    await handleDownloadSubtitleOnly(sub)
    if (magnet && onStartTorrent) {
      onStartTorrent(magnet, movieTitle)
      push(`Memulai unduhan film (resolusi terbaik) + Subtitle ${sub.language}!`, 'info')
      onClose()
    }
  }

  // Filter Subtitle berdasarkan Tab Bahasa & Input Pencarian
  const filteredSubtitles = subtitles.filter((sub) => {
    const matchLang = langFilter === 'all' || sub.lang_code === langFilter
    const matchQuery =
      !searchQuery.trim() ||
      sub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.language.toLowerCase().includes(searchQuery.toLowerCase())
    return matchLang && matchQuery
  })

  // Dapatkan daftar bahasa yang tersedia
  const availableLangs = Array.from(new Set(subtitles.map((s) => s.lang_code)))

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border border-glass-border bg-paper shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-glass-border flex items-start justify-between gap-4 bg-glass-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-accent">💬 Pilihan Subtitle & Unduh Film</span>
                  {year && (
                    <span className="px-2 py-0.5 rounded-md bg-accent/15 border border-accent/30 font-mono text-[10px] text-accent">
                      {year}
                    </span>
                  )}
                </div>
                <h3 className="font-display font-bold text-lg sm:text-xl text-ink mt-1 truncate max-w-lg">
                  {cleanTitle || movieTitle}
                </h3>
                <p className="font-mono text-xs text-ink-muted mt-0.5">
                  Pilih bahasa subtitle yang diinginkan untuk diunduh bersama film
                </p>
              </div>

              <button
                onClick={onClose}
                className="rounded-full p-2 bg-glass text-ink-muted hover:text-ink hover:bg-glass-2 transition-colors border border-glass-border cursor-pointer"
                aria-label="Tutup"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Language Filter Chips */}
            <div className="p-3 sm:px-6 border-b border-glass-border bg-glass flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {LANGUAGE_FILTERS.filter(
                (f) => f.id === 'all' || availableLangs.includes(f.id),
              ).map((f) => {
                const count =
                  f.id === 'all' ? subtitles.length : subtitles.filter((s) => s.lang_code === f.id).length
                const isActive = langFilter === f.id

                return (
                  <button
                    key={f.id}
                    onClick={() => setLangFilter(f.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono whitespace-nowrap transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-accent text-paper font-semibold shadow-sm'
                        : 'bg-glass-2 border border-glass-border text-ink-muted hover:text-ink hover:bg-glass'
                    }`}
                  >
                    <span>{f.flag}</span>
                    <span>{f.label}</span>
                    <span className="opacity-70 text-[10px]">({count})</span>
                  </button>
                )
              })}
            </div>

            {/* Search Subtitle Filter Input */}
            <div className="p-3 sm:px-6 border-b border-glass-border">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari versi rilis subtitle (e.g. 1080p, BluRay, WEBRip, YIFY)..."
                className="w-full rounded-xl border border-glass-border bg-glass px-3.5 py-2 text-xs font-mono text-ink outline-none placeholder:text-ink-faint focus:border-accent"
              />
            </div>

            {/* Subtitle List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-ink-muted space-y-3">
                  <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                  <p className="font-mono text-xs">Mencari subtitle dari basis data global...</p>
                </div>
              ) : filteredSubtitles.length > 0 ? (
                filteredSubtitles.map((sub, idx) => {
                  const isDownloading = downloadingUrl === sub.sub_page
                  const isDownloaded = sub.sub_page ? downloadedUrls.has(sub.sub_page) : false

                  return (
                    <motion.div
                      key={idx}
                      layout
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-glass-border hover:border-accent/40 transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-glass-2 border border-glass-border text-ink font-semibold uppercase">
                            {sub.language}
                          </span>
                          {sub.rating && sub.rating !== '0' && (
                            <span className="font-mono text-[10px] text-amber-400">
                              ★ {sub.rating}
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-xs sm:text-sm text-ink truncate mt-1" title={sub.title}>
                          {sub.title}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                        {/* Download Subtitle Only */}
                        <button
                          onClick={() => handleDownloadSubtitleOnly(sub)}
                          disabled={isDownloading || isDownloaded}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                            isDownloaded
                              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                              : 'bg-glass border border-glass-border text-ink-muted hover:text-ink hover:bg-glass-2 disabled:opacity-50'
                          }`}
                          title="Unduh file .SRT saja ke folder film"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                          </svg>
                          {isDownloaded ? 'Tersimpan ✓' : 'Hanya .SRT'}
                        </button>

                        {/* Download Movie + Subtitle */}
                        {magnet && (
                          <button
                            onClick={() => handleDownloadMovieAndSubtitle(sub)}
                            disabled={isDownloading}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent text-paper text-xs font-mono font-medium hover:opacity-95 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                            title="Unduh film dalam resolusi tertinggi + simpan subtitle ini otomatis"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
                            </svg>
                            Unduh Film + Sub
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-ink-muted space-y-2">
                  <span className="text-3xl">🔍</span>
                  <p className="font-mono text-xs">
                    Tidak ada subtitle yang cocok dengan filter saat ini.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-glass-border bg-glass-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono text-ink-faint">
              <span>💡 DownloadKan otomatis menyinkronkan file .SRT ke folder unduhan film.</span>
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-glass border border-glass-border text-ink hover:bg-glass-2 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
