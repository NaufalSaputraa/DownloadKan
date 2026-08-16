import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { PlaylistInfo, PlaylistItem } from '../lib/api-local'
import { startBatchDownload } from '../lib/api-local'
import { useToast } from '../hooks/useToast'

interface PlaylistBatchModalProps {
  open: boolean
  playlist: PlaylistInfo | null
  onClose: () => void
}

export function PlaylistBatchModal({ open, playlist, onClose }: PlaylistBatchModalProps) {
  const { push } = useToast()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [format, setFormat] = useState<'mp3' | 'flac' | 'best'>('mp3')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!playlist) return null

  // Inisialisasi: Pilih semua item saat playlist pertama dibuka
  const allIds = playlist.items.map((i) => i.id)
  const isAllSelected = selectedIds.size === playlist.items.length

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allIds))
    }
  }

  const toggleItem = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  const handleStartBatch = async () => {
    const selectedItems: PlaylistItem[] = playlist.items.filter((i) =>
      selectedIds.has(i.id),
    )
    if (!selectedItems.length) {
      push('Pilih minimal 1 item untuk diunduh.', 'error')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await startBatchDownload({
        items: selectedItems.map((i) => ({
          url: i.url,
          title: i.title,
          artist: i.artist,
        })),
        format,
        category: format === 'best' ? 'Videos' : 'Music',
      })
      push(`Memulai antrean batch: ${res.count} track berhasil dimasukkan antrean!`, 'info')
      onClose()
    } catch (e) {
      push(`Gagal memulai batch download: ${(e as Error).message}`, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[70] bg-[oklch(10%_0.01_260/0.5)] backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="fixed inset-x-3 bottom-3 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 z-[80] mx-auto max-w-xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="glass-2 max-h-[85vh] flex flex-col rounded-[24px] p-5 sm:p-6 text-ink space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-glass-border pb-3">
                <div className="flex items-center gap-3 truncate">
                  {playlist.thumbnail ? (
                    <img
                      src={playlist.thumbnail}
                      alt={playlist.title}
                      className="h-11 w-11 rounded-xl object-cover border border-glass-border flex-shrink-0"
                    />
                  ) : (
                    <div className="h-11 w-11 rounded-xl bg-glass flex items-center justify-center text-lg flex-shrink-0">
                      📦
                    </div>
                  )}
                  <div className="truncate">
                    <h3 className="font-display font-semibold text-base sm:text-lg text-ink truncate">
                      {playlist.title}
                    </h3>
                    <p className="font-mono text-xs text-ink-muted">
                      {playlist.uploader} · {playlist.item_count} Track
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="rounded-full p-2 text-ink-faint hover:text-ink hover:bg-glass transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              {/* Format & Select All Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                {/* Format Pills */}
                <div className="flex items-center gap-1.5 rounded-full bg-glass p-1 border border-glass-border">
                  <button
                    type="button"
                    onClick={() => setFormat('mp3')}
                    className={`rounded-full px-3 py-1 text-xs font-mono transition-colors ${
                      format === 'mp3' ? 'bg-accent text-white font-semibold' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    MP3 320k
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('flac')}
                    className={`rounded-full px-3 py-1 text-xs font-mono transition-colors ${
                      format === 'flac' ? 'bg-accent text-white font-semibold' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    FLAC
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('best')}
                    className={`rounded-full px-3 py-1 text-xs font-mono transition-colors ${
                      format === 'best' ? 'bg-accent text-white font-semibold' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    MP4 Video
                  </button>
                </div>

                {/* Select All Checkbox */}
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="font-mono text-xs text-accent hover:underline px-2 py-1"
                >
                  {isAllSelected ? 'Batal Pilih Semua' : 'Pilih Semua'} ({selectedIds.size}/{playlist.items.length})
                </button>
              </div>

              {/* Track list */}
              <div className="flex-1 overflow-y-auto max-h-[42vh] space-y-1.5 pr-1">
                {playlist.items.map((item) => {
                  const isChecked = selectedIds.has(item.id)
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors border ${
                        isChecked
                          ? 'bg-glass-2 border-accent/40 text-ink'
                          : 'bg-glass/30 border-glass-border text-ink-muted hover:bg-glass'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="h-4 w-4 rounded accent-accent pointer-events-none"
                        />
                        <span className="font-mono text-xs text-ink-faint w-5 text-right">{item.index}.</span>
                        <div className="truncate">
                          <p className="font-medium text-xs text-ink truncate">{item.title}</p>
                          <p className="font-mono text-[10px] text-ink-muted truncate">{item.artist}</p>
                        </div>
                      </div>
                      <span className="font-mono text-[11px] text-ink-faint flex-shrink-0 ml-2">
                        {item.duration_str}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Footer action */}
              <div className="pt-2 border-t border-glass-border flex items-center justify-between">
                <span className="font-mono text-xs text-ink-muted">
                  Concurrency: <span className="text-accent font-semibold">3 Simultan</span>
                </span>
                <button
                  type="button"
                  disabled={selectedIds.size === 0 || isSubmitting}
                  onClick={handleStartBatch}
                  className="rounded-full bg-ink px-6 py-2.5 text-xs font-semibold text-paper hover:bg-[oklch(86%_0.008_260)] disabled:opacity-40 transition-all flex items-center gap-2"
                >
                  {isSubmitting ? (
                    'Memproses...'
                  ) : (
                    <>
                      <span>Unduh Batch ({selectedIds.size})</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 5v14M5 12l7 7 7-7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
