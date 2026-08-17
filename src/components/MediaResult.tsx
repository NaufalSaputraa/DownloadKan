import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AnalyzedMedia as MediaResult, AnalyzedDownload as MediaDownload } from '../lib/api-local'
import { useLocalBackend } from '../hooks/useLocalBackend'
import { VideoPlayerModal } from './VideoPlayerModal'

function guessExtension(item: MediaDownload): string {
  const t = item.type.toLowerCase()
  const u = (item.url || '').toLowerCase()

  try {
    if (u) {
      const pathname = new URL(u).pathname
      const ext = pathname.split('.').pop()?.split('?')[0] ?? ''
      if (['mp4', 'webm', 'mkv', 'mov', 'mp3', 'flac', 'wav', 'ogg', 'aac', 'm4a', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'pdf'].includes(ext)) {
        return ext
      }
    }
  } catch { /* URL tidak valid, lanjut */ }

  if (t.includes('flac') || t.includes('lossless')) return 'flac'
  if (t.includes('mp3') || t.includes('audio') || t.includes('music') || t.includes('sound')) return 'mp3'
  if (t.includes('m4a') || t.includes('aac')) return 'm4a'
  if (t.includes('wav')) return 'wav'
  if (t.includes('png')) return 'png'
  if (t.includes('jpg') || t.includes('jpeg') || t.includes('gambar') || t.includes('cover') || t.includes('foto')) return 'jpg'
  if (t.includes('webp')) return 'webp'
  if (t.includes('gif')) return 'gif'
  if (t.includes('webm')) return 'webm'
  if (t.includes('video') || t.includes('mp4') || t.includes('hd') || t.includes('sd')) return 'mp4'
  return 'mp4'
}

function buildDownloadFilename(title: string, item: MediaDownload): string {
  const safeName = title
    ? title.replace(/[^\w\s\u00C0-\u024F\u4E00-\u9FFF\uAC00-\uD7AF-]/g, '_').replace(/_+/g, '_').slice(0, 60).trim()
    : 'download'
  const ext = guessExtension(item)
  return `${safeName}.${ext}`
}

/* ------------------------------------------------------------------ */
/*  SVG Icons (No Emojis)                                             */
/* ------------------------------------------------------------------ */
function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <motion.path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ScissorsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  )
}

function SubtitleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <line x1="6" y1="12" x2="10" y2="12" />
      <line x1="14" y1="12" x2="18" y2="12" />
      <line x1="6" y1="16" x2="14" y2="16" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Komponen utama                                                    */
/* ------------------------------------------------------------------ */
export function MediaResult({ result }: { result: MediaResult }) {
  const [active, setActive] = useState(0)
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')
  const [dlState, setDlState] = useState<'idle' | 'downloading' | 'done'>('idle')
  const [trimOpen, setTrimOpen] = useState(false)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [withSubtitles, setWithSubtitles] = useState(false)
  const [subLang, setSubLang] = useState('id,en')
  const [videoModalOpen, setVideoModalOpen] = useState(false)

  const { isLocal, download: startLocalDownload } = useLocalBackend()
  const item = result.downloads[active]
  const platformTag = result.platform || 'media'

  const handleCopy = useCallback(async () => {
    if (copyState === 'copied') return
    const targetUrl = item?.url || result.sourceUrl || window.location.href
    try {
      await navigator.clipboard.writeText(targetUrl)
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 2200)
    } catch {
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 2200)
    }
  }, [item, copyState, result.sourceUrl])

  const handleDownload = useCallback(async () => {
    if (dlState === 'downloading' || !item) return
    setDlState('downloading')
    const filename = buildDownloadFilename(result.title, item)

    // Jika berjalan di standalone local core, kirim ke backend lokal
    if (isLocal) {
      try {
        const isAudio = /mp3|audio|flac|music/i.test(item.type)
        await startLocalDownload(
          result.sourceUrl,
          isAudio ? (item.type.includes('flac') ? 'flac' : 'mp3') : 'best',
          isAudio ? 'Music' : 'Videos',
          filename,
          {
            start_time: startTime || undefined,
            end_time: endTime || undefined,
            subtitles: withSubtitles,
            sub_lang: subLang,
          },
        )
        setDlState('done')
        setTimeout(() => setDlState('idle'), 3000)
        return
      } catch {
        /* Fallback ke browser download jika local engine gagal */
      }
    }

    const proxyUrl = `/api/proxy/download?url=${encodeURIComponent(item.url || result.sourceUrl)}&filename=${encodeURIComponent(filename)}`
    try {
      const res = await fetch(proxyUrl)
      if (!res.ok) throw new Error(`Status ${res.status}`)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000)
      setDlState('done')
      setTimeout(() => setDlState('idle'), 3000)
    } catch {
      window.open(item.url || result.sourceUrl, '_blank')
      setDlState('idle')
    }
  }, [item, dlState, result, isLocal, startLocalDownload, startTime, endTime, withSubtitles, subLang])

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="glass-2 rounded-2xl p-4 sm:p-5 border border-glass-border shadow-2xl backdrop-blur-2xl flex flex-col gap-4"
      >
        {/* Header Preview & Metadata */}
        <div className="flex items-start gap-3.5">
          {result.thumbnail && (
            <div className="relative group rounded-xl overflow-hidden border border-glass-border flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 bg-black/40 shadow-md">
              <img
                src={result.thumbnail}
                alt={result.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {/* Play Button Overlay */}
              <button
                type="button"
                onClick={() => setVideoModalOpen(true)}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                title="Pratinjau Video"
              >
                <span className="p-2 rounded-full bg-accent/80 backdrop-blur-sm shadow-md">
                  <PlayIcon />
                </span>
              </button>
            </div>
          )}

          <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider bg-accent/15 text-accent border border-accent/25">
                  {platformTag}
                </span>
                {result.duration ? (
                  <span className="font-mono text-[11px] text-ink-muted">
                    {Math.floor(result.duration / 60)}:{(result.duration % 60).toString().padStart(2, '0')}
                  </span>
                ) : null}
              </div>
              <h3 className="font-display font-medium text-base sm:text-lg text-ink leading-snug line-clamp-2">
                {result.title}
              </h3>
            </div>

            {/* Quick Play Trigger for Video */}
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setVideoModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-glass hover:bg-glass-2 border border-glass-border text-ink-muted hover:text-ink transition-colors cursor-pointer"
              >
                <PlayIcon />
                <span>Pratinjau Player</span>
              </button>
            </div>
          </div>
        </div>

        {/* Format Selector Pills */}
        <div>
          <label className="block font-mono text-[11px] text-ink-muted mb-2 uppercase tracking-wider">
            Pilihan Kualitas & Format
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {result.downloads.map((d, idx) => {
              const isSelected = active === idx
              return (
                <button
                  key={idx}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setActive(idx)}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-accent/15 border-accent text-ink shadow-sm'
                      : 'bg-glass/40 border-glass-border hover:bg-glass text-ink-muted hover:text-ink'
                  }`}
                >
                  <span className="font-display font-medium text-xs truncate" aria-pressed={isSelected}>
                    {d.type}
                  </span>
                  <span className="font-mono text-[10px] opacity-70 mt-1">
                    {d.filesize ? `${(d.filesize / 1024 / 1024).toFixed(1)} MB` : d.ext?.toUpperCase() || 'HQ'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Expandable Advanced Options: Time Trimmer & Subtitles */}
        <div className="border-t border-glass-border/60 pt-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setTrimOpen(!trimOpen)}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-ink-muted hover:text-ink transition-colors cursor-pointer"
            >
              <ScissorsIcon />
              <span>{trimOpen ? 'Sembunyikan Opsi Lanjutan' : 'Potong Durasi & Subtitle'}</span>
            </button>

            <label className="inline-flex items-center gap-1.5 text-xs font-mono text-ink-muted cursor-pointer">
              <input
                type="checkbox"
                checked={withSubtitles}
                onChange={(e) => setWithSubtitles(e.target.checked)}
                className="rounded border-glass-border bg-glass text-accent focus:ring-0 cursor-pointer"
              />
              <SubtitleIcon />
              <span>Sertakan Subtitle</span>
            </label>
          </div>

          <AnimatePresence>
            {trimOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 p-3 rounded-xl bg-glass/30 border border-glass-border flex flex-col gap-2.5 overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-mono text-[10px] text-ink-muted mb-1">
                      Mulai (Start Time)
                    </label>
                    <input
                      type="text"
                      placeholder="00:00"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-glass border border-glass-border text-xs font-mono text-ink focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] text-ink-muted mb-1">
                      Selesai (End Time)
                    </label>
                    <input
                      type="text"
                      placeholder="02:30"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-glass border border-glass-border text-xs font-mono text-ink focus:border-accent"
                    />
                  </div>
                </div>

                {/* Subtitle Language Selector */}
                {withSubtitles && (
                  <div className="pt-1">
                    <label className="block font-mono text-[10px] text-ink-muted mb-1">
                      Bahasa Subtitle
                    </label>
                    <select
                      value={subLang}
                      onChange={(e) => setSubLang(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-glass border border-glass-border text-xs font-mono text-ink cursor-pointer"
                    >
                      <option value="id,en" className="bg-paper text-ink">Indonesia & English (Default)</option>
                      <option value="id" className="bg-paper text-ink">Indonesia Only (id)</option>
                      <option value="en" className="bg-paper text-ink">English Only (en)</option>
                      <option value="all" className="bg-paper text-ink">Semua Bahasa Tersedia (all)</option>
                    </select>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Buttons: Copy Link & Download Now */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3.5 py-2.5 rounded-xl border border-glass-border bg-glass hover:bg-glass-2 text-ink-muted hover:text-ink text-xs font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title="Salin Tautan Langsung"
          >
            {copyState === 'copied' ? <CheckIcon /> : <CopyIcon />}
            <span>{copyState === 'copied' ? 'Tersalin' : 'Salin Tautan'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={dlState === 'downloading'}
            className="flex-1 py-2.5 px-4 rounded-xl bg-accent text-paper font-display font-medium text-sm flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer shadow-lg shadow-accent/15 disabled:opacity-50"
          >
            {dlState === 'downloading' ? (
              <>
                <SpinnerIcon />
                <span>Memproses Unduhan...</span>
              </>
            ) : dlState === 'done' ? (
              <>
                <CheckIcon />
                <span>Unduhan Dimulai!</span>
              </>
            ) : (
              <>
                <DownloadIcon />
                <span>Unduh {item ? item.type : 'Sekarang'}</span>
              </>
            )}
          </button>
        </div>
      </motion.article>

      {/* In-Browser Video Player Modal */}
      <VideoPlayerModal
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        videoUrl={item?.url || result.sourceUrl}
        title={result.title}
      />
    </>
  )
}