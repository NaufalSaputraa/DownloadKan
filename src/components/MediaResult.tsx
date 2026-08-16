import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AnalyzedMedia as MediaResult, AnalyzedDownload as MediaDownload } from '../lib/api-local'
import { useLocalBackend } from '../hooks/useLocalBackend'

/**
 * Tentukan extension file yang benar dari type label dan URL.
 */
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
/*  Ikon SVG                                                          */
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

/* ------------------------------------------------------------------ */
/*  Komponen utama                                                    */
/* ------------------------------------------------------------------ */
export function MediaResult({ result }: { result: MediaResult }) {
  const [active, setActive] = useState(0)
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')
  const [dlState, setDlState] = useState<'idle' | 'downloading' | 'done'>('idle')
  const { isLocal, download: startLocalDownload } = useLocalBackend()
  const item = result.downloads[active]
  const platformTag = result.platform || 'media'

  const handleCopy = useCallback(async () => {
    if (copyState === 'copied') return
    const targetUrl = item.url || result.sourceUrl || window.location.href
    try {
      await navigator.clipboard.writeText(targetUrl)
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 2200)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = targetUrl
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 2200)
    }
  }, [item, copyState, result.sourceUrl])

  const handleDownload = useCallback(async () => {
    if (dlState === 'downloading') return
    setDlState('downloading')
    const filename = buildDownloadFilename(result.title, item)

    // Jika berjalan di standalone local core, kirim ke backend lokal
    if (isLocal) {
      try {
        const isAudio = /mp3|audio|flac|music/i.test(item.type)
        await startLocalDownload(
          result.sourceUrl,
          isAudio ? 'mp3' : 'best',
          isAudio ? 'Music' : 'Videos',
          filename,
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
      window.open(item.url, '_blank', 'noopener,noreferrer')
      setDlState('done')
      setTimeout(() => setDlState('idle'), 3000)
    }
  }, [result.title, result.sourceUrl, item, dlState, isLocal, startLocalDownload])

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="glass w-full overflow-hidden rounded-[24px]"
    >
      <div className="grid grid-cols-1 gap-0 sm:grid-cols-[180px_minmax(0,1fr)] md:grid-cols-[210px_minmax(0,1fr)]">
        {/* Thumbnail preview */}
        <div className="relative aspect-video sm:aspect-auto sm:h-full overflow-hidden bg-glass-2 border-b sm:border-b-0 sm:border-r border-glass-border">
          {result.thumbnail ? (
            <img
              src={result.thumbnail}
              alt={result.title}
              className="h-full w-full object-cover object-center transition-transform duration-500 hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full min-h-[140px] w-full items-center justify-center text-ink-faint">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10 9l5 3-5 3V9z" fill="currentColor" />
              </svg>
            </div>
          )}
          <span className="absolute bottom-2 left-2 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white">
            {platformTag}
          </span>
        </div>

        {/* Content */}
        <div className="flex flex-col justify-between p-4 sm:p-5 gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                Sumber
              </span>
              <span className="ms-auto rounded-full bg-glass-2 px-2 py-0.5 text-[11px] text-accent">
                {result.engine}
              </span>
            </div>
            <h2 className="line-clamp-2 break-words text-base sm:text-lg font-medium leading-snug text-ink">{result.title}</h2>
            <p className="truncate max-w-full font-mono text-xs text-ink-faint" title={result.sourceUrl}>
              {result.sourceUrl}
            </p>
          </div>

          {item && (
            <div className="min-w-0 space-y-3">
              <div className="flex max-w-full flex-wrap gap-2 overflow-hidden">
                {result.downloads.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => setActive(i)}
                    className={`rounded-full border px-3.5 py-1.5 text-xs sm:text-sm transition-colors ${
                      i === active
                        ? 'border-accent bg-accent-soft text-accent font-medium'
                        : 'border-glass-border-soft text-ink-muted hover:border-glass-border hover:text-ink'
                    }`}
                    aria-pressed={i === active}
                  >
                    {d.type}
                  </button>
                ))}
              </div>

              {/* Audio Preview Inline Player */}
              {/mp3|audio|music|sound|preview/i.test(item.type) && (
                <div className="mt-2 min-w-0 rounded-2xl border border-glass-border bg-glass/60 p-3">
                  <div className="mb-2 flex items-center justify-between text-xs text-ink-muted">
                    <span className="flex items-center gap-1.5 font-medium text-ink">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M9 18V5l12-2v13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="1.8" />
                        <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="1.8" />
                      </svg>
                      Pemutar Audio ({item.type})
                    </span>
                    {!/preview|pratinjau/i.test(item.type) && (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">Lagu Utuh</span>
                    )}
                  </div>
                  <audio controls controlsList="nodownload" className="h-8 w-full rounded-lg accent-accent" src={item.url}>
                    Browser-mu tidak mendukung pemutar audio.
                  </audio>
                </div>
              )}

              <div className="flex max-w-full flex-wrap items-center gap-2 pt-1 overflow-hidden">
                {/* Tombol Download Utama */}
                <button
                  type="button"
                  disabled={dlState === 'downloading'}
                  onClick={handleDownload}
                  className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs sm:text-sm font-medium transition-all ${
                    dlState === 'done'
                      ? 'bg-emerald-500/90 text-white'
                      : dlState === 'downloading'
                        ? 'bg-ink/70 text-paper cursor-wait'
                        : 'bg-ink text-paper hover:bg-[oklch(86%_0.008_260)] active:scale-[0.97]'
                  }`}
                  title={isLocal ? "Unduh langsung ke folder Downloads HP/PC" : "Unduh via browser"}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {dlState === 'downloading' ? (
                      <motion.span key="spin" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} transition={{ duration: 0.15 }}>
                        <SpinnerIcon />
                      </motion.span>
                    ) : dlState === 'done' ? (
                      <motion.span key="check" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} transition={{ duration: 0.15 }}>
                        <CheckIcon />
                      </motion.span>
                    ) : (
                      <motion.span key="dl" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} transition={{ duration: 0.15 }}>
                        <DownloadIcon />
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {dlState === 'downloading' ? 'Mengunduh…' : dlState === 'done' ? 'Tersimpan!' : isLocal ? `Simpan ${item.type}` : `Unduh ${item.type}`}
                </button>

                {/* Tombol Salin Tautan dengan animasi feedback */}
                <button
                  onClick={handleCopy}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs transition-all duration-300 ${
                    copyState === 'copied'
                      ? 'border-emerald-400/50 bg-emerald-400/15 text-emerald-300 scale-[1.03]'
                      : 'border-glass-border bg-glass text-ink-muted hover:text-ink hover:border-glass-border-strong active:scale-[0.97]'
                  }`}
                  title="Salin URL langsung untuk di-paste di IDM / ABDM / Aria2"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {copyState === 'copied' ? (
                      <motion.span
                        key="check"
                        initial={{ opacity: 0, scale: 0.3, rotate: -90 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.3 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                      >
                        <CheckIcon />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="copy"
                        initial={{ opacity: 0, scale: 0.3 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.3 }}
                        transition={{ duration: 0.15 }}
                      >
                        <CopyIcon />
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {copyState === 'copied' ? 'Tersalin!' : 'Salin Tautan (IDM/ABDM)'}
                </button>

                {/* PDF Exporter untuk Galeri / Slide Foto */}
                {result.downloads.length > 1 && (
                  <button
                    onClick={() => exportGalleryToPdf(result)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft px-3.5 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
                    title="Gabungkan galeri foto menjadi 1 file PDF"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    PDF ({result.downloads.length} Item)
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  )
}

function exportGalleryToPdf(result: MediaResult) {
  const win = window.open('', '_blank')
  if (!win) {
    alert('Izinkan popup di browser-mu untuk mengekspor PDF galeri.')
    return
  }

  const safeTitle = result.title.replace(/[^\w\s-]/g, '')
  const html = `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="utf-8">
        <title>${safeTitle} - Galeri PDF DownloadKan</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; color: #111; margin: 0; padding: 20px; }
          .header { border-bottom: 2px solid #eee; padding-bottom: 12px; margin-bottom: 24px; }
          h1 { font-size: 20px; margin: 0 0 6px 0; color: #0b0c0f; }
          .meta { font-size: 12px; color: #666; font-family: monospace; }
          .page-item { page-break-after: always; text-align: center; margin-bottom: 30px; }
          .page-item:last-child { page-break-after: auto; }
          img { max-width: 100%; max-height: 230mm; object-fit: contain; border-radius: 8px; border: 1px solid #eee; }
          .caption { font-size: 11px; color: #888; margin-top: 8px; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${result.title}</h1>
          <div class="meta">DownloadKan Gallery Export · Platform: ${result.platform.toUpperCase()} · Total ${result.downloads.length} Items</div>
        </div>
        ${result.downloads
          .map(
            (item, idx) => `
          <div class="page-item">
            <img src="${item.url}" alt="Item ${idx + 1}" />
            <div class="caption">Halaman ${idx + 1} dari ${result.downloads.length} (${item.type})</div>
          </div>
        `,
          )
          .join('')}
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
            }, 600);
          };
        </script>
      </body>
    </html>
  `
  win.document.write(html)
  win.document.close()
}