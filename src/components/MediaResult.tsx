import { useState } from 'react'
import { motion } from 'framer-motion'
import type { MediaResult, MediaDownload } from '../engines/media/types'
import { DEEZLOAD_BOT, telegramBotDeepLink } from '../lib/telegram'

/**
 * Tentukan extension file yang benar dari type label dan URL.
 * Type label bisa berupa "Video Full HD (No Watermark)" — bukan extension valid.
 */
function guessExtension(item: MediaDownload): string {
  const t = item.type.toLowerCase()
  const u = item.url.toLowerCase()

  // Cek URL path untuk extension nyata
  try {
    const pathname = new URL(u).pathname
    const ext = pathname.split('.').pop()?.split('?')[0] ?? ''
    if (['mp4', 'webm', 'mkv', 'mov', 'mp3', 'flac', 'wav', 'ogg', 'aac', 'm4a', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'pdf'].includes(ext)) {
      return ext
    }
  } catch { /* URL tidak valid, lanjut */ }

  // Deteksi dari type label
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
  return 'mp4' // default
}

function buildDownloadFilename(title: string, item: MediaDownload): string {
  const safeName = title
    ? title.replace(/[^\w\s\u00C0-\u024F\u4E00-\u9FFF\uAC00-\uD7AF-]/g, '_').replace(/_+/g, '_').slice(0, 60).trim()
    : 'download'
  const ext = guessExtension(item)
  return `${safeName}.${ext}`
}

export function MediaResult({ result }: { result: MediaResult }) {
  const [active, setActive] = useState(0)
  const item = result.downloads[active]
  const platformTag = result.platform || 'media'

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="glass w-full overflow-hidden rounded-[24px]"
    >
      <div className="grid grid-cols-1 gap-0 sm:grid-cols-[180px_minmax(0,1fr)] md:grid-cols-[210px_minmax(0,1fr)]">
        {/* Thumbnail */}
        <div className="relative min-h-[160px] overflow-hidden bg-glass-2 sm:min-h-full">
          {result.thumbnail ? (
            <img
              src={result.thumbnail}
              alt=""
              loading="lazy"
              className="h-full w-full min-h-[160px] object-cover"
            />
          ) : (
            <div className="flex h-full min-h-[160px] items-center justify-center text-ink-faint">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
                <path d="m9 9 5 3-5 3V9Z" fill="currentColor" />
              </svg>
            </div>
          )}
          <div className="absolute top-3 left-3">
            <span className="glass rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide text-ink">
              {platformTag}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="flex min-w-0 max-w-full flex-col justify-between gap-4 overflow-hidden p-4 sm:p-5">
          <div className="min-w-0 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">
                Sumber
              </span>
              <span className="ms-auto rounded-full bg-glass-2 px-2 py-0.5 text-[11px] text-accent">
                {result.engine}
              </span>
            </div>
            <h2 className="line-clamp-2 break-words text-lg font-medium leading-snug text-ink">{result.title}</h2>
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
                    className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                      i === active
                        ? 'border-accent bg-accent-soft text-accent'
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
                      Pratinjau Audio ({item.type})
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">Direct Stream</span>
                  </div>
                  <audio controls controlsList="nodownload" className="h-8 w-full rounded-lg accent-accent" src={item.url}>
                    Browser-mu tidak mendukung pemutar audio.
                  </audio>
                </div>
              )}

              <div className="flex max-w-full flex-wrap items-center gap-2.5 pt-1 overflow-hidden">
                <a
                  href={item.url}
                  download={buildDownloadFilename(result.title, item)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-all hover:bg-[oklch(86%_0.008_260)]"
                  title="Klik untuk mengunduh langsung atau ditangkap oleh IDM / ABDM / Download Manager"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Unduh {item.type}
                </a>

                <button
                  onClick={() => {
                    void navigator.clipboard.writeText(item.url)
                    alert('Tautan direct berhasil disalin! Silakan paste di IDM / ABDM.')
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-glass-border bg-glass px-4 py-2.5 text-xs text-ink-muted transition-colors hover:text-ink"
                  title="Salin URL langsung untuk di-paste di IDM / ABDM / Aria2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                  Salin Tautan (IDM/ABDM)
                </button>

                {/* Unduh penuh via bot Telegram (untuk lagu yang engine lokal tak punya full song) */}
                {/deezer|spotify|apple|soundcloud|music|audio|mp3/i.test(`${result.platform} ${item.type}`) && (
                  <a
                    href={telegramBotDeepLink(DEEZLOAD_BOT, result.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2.5 text-xs font-medium text-sky-300 transition-colors hover:bg-sky-400/20"
                    title={`Unduh lagu ini lewat bot Telegram ${DEEZLOAD_BOT}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M21.9 4.1 18.8 19.3c-.2 1-.8 1.2-1.7.8l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.4-4.8 8.7-7.9c.4-.3-.1-.5-.6-.2L7.5 12.5 2.8 11c-1-.3-1-1 .2-1.5l17.6-6.8c.9-.3 1.6.2 1.3 1.4Z" />
                    </svg>
                    Telegram
                  </a>
                )}

                {/* PDF Exporter untuk Galeri / Slide Foto */}
                {result.downloads.length > 1 && (
                  <button
                    onClick={() => exportGalleryToPdf(result)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft px-4 py-2.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
                    title="Gabungkan galeri foto menjadi 1 file PDF"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Ekspor Galeri ke PDF ({result.downloads.length} Item)
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