import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface VideoPlayerModalProps {
  isOpen: boolean
  onClose: () => void
  videoUrl: string
  title: string
  subtitleUrl?: string
}

export function VideoPlayerModal({
  isOpen,
  onClose,
  videoUrl,
  title,
  subtitleUrl,
}: VideoPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-4xl rounded-2xl overflow-hidden glass-2 border border-glass-border shadow-2xl flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-glass-border bg-glass/40">
              <div className="flex items-center gap-2 truncate pr-4">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-accent flex-shrink-0" aria-hidden="true">
                  <polygon points="5 3 19 12 5 21 5 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <h3 className="font-display font-medium text-sm sm:text-base text-ink truncate">
                  {title || 'Pemutar Video'}
                </h3>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1.5 text-ink-muted hover:text-ink hover:bg-glass transition-colors cursor-pointer"
                aria-label="Tutup pemutar video"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* Video Container */}
            <div className="relative aspect-video w-full bg-black flex items-center justify-center">
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              >
                {subtitleUrl && (
                  <track
                    src={subtitleUrl}
                    kind="subtitles"
                    srcLang="id"
                    label="Bahasa Indonesia"
                    default
                  />
                )}
                Browser Anda tidak mendukung pemutaran video HTML5.
              </video>
            </div>

            {/* Footer Toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 text-xs text-ink-muted bg-glass/20 border-t border-glass-border">
              <span className="font-mono text-[11px]">DownloadKan In-Browser Video Player</span>
              <span className="font-mono text-[11px] text-accent">HD / Lossless Mux</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
