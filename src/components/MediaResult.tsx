import { useState } from 'react'
import { motion } from 'framer-motion'
import type { MediaResult } from '../engines/media/types'

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
      <div className="grid grid-cols-1 gap-0 md:grid-cols-[240px_1fr]">
        {/* Thumbnail */}
        <div className="relative min-h-[180px] overflow-hidden bg-glass-2 md:min-h-full">
          {result.thumbnail ? (
            <img
              src={result.thumbnail}
              alt=""
              loading="lazy"
              className="h-full w-full min-h-[180px] object-cover"
            />
          ) : (
            <div className="flex h-full min-h-[180px] items-center justify-center text-ink-faint">
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
        <div className="flex flex-col justify-between gap-4 p-5 sm:p-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">
                Sumber
              </span>
              <span className="ms-auto rounded-full bg-glass-2 px-2 py-0.5 text-[11px] text-accent">
                {result.engine}
              </span>
            </div>
            <h2 className="text-lg font-medium leading-snug text-ink">{result.title}</h2>
            <p className="truncate font-mono text-xs text-ink-faint" title={result.sourceUrl}>
              {result.sourceUrl}
            </p>
          </div>

          {item && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
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

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={item.url}
                  download={result.title ? `${result.title.replace(/[^\w\s-]/g, '_').slice(0, 50)}.${item.type}` : true}
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
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  )
}