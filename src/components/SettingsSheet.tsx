import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Settings } from '../lib/storage'
import { getEngineHealth } from '../engines/media'

interface Props {
  open: boolean
  settings: Settings
  onClose: () => void
  onChange: (patch: Partial<Settings>) => void
}

export function SettingsSheet({ open, settings, onClose, onChange }: Props) {
  const [draft, setDraft] = useState(settings.jerexdKey)
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const healthList = getEngineHealth()

  // sinkronkan draft bila data berubah di luar
  if (!open && draft !== settings.jerexdKey) setDraft(settings.jerexdKey)

  const save = () => {
    onChange({ jerexdKey: draft.trim() })
    setSaved(true)
    window.setTimeout(() => {
      setSaved(false)
      onClose()
    }, 600)
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
            aria-label="Pengaturan"
            className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-md"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="glass-2 rounded-[24px] p-6">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="font-display text-xl text-ink">Pengaturan</h2>
                <button
                  onClick={onClose}
                  className="rounded-full p-1.5 text-ink-faint transition-colors hover:bg-glass hover:text-ink"
                  aria-label="Tutup"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <p className="mb-4 max-w-sm text-sm text-ink-muted">
                API key hanya tersimpan privat di browser-mu (localStorage). Tidak pernah dikirim ke server kami.
              </p>

              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-ink-faint">
                  API Key Jerexd
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && save()}
                    placeholder="jere_••••••••••••"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className="w-full rounded-2xl border border-glass-border bg-glass py-3 pl-4 pr-11 font-mono text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-glass-border focus:outline-none focus:ring-1 focus:ring-glass-border"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 rounded-full p-1 text-ink-faint hover:text-ink"
                    title={showKey ? 'Sembunyikan API key' : 'Tampilkan API key'}
                  >
                    {showKey ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                      </svg>
                    )}
                  </button>
                </div>
                <span className="mt-1.5 block text-xs text-ink-faint">
                  Engine fallback (tersimpan tersandi privat di localStorage).
                </span>
              </div>

              {/* Status Health Engine */}
              <div className="mb-5 rounded-2xl border border-glass-border bg-glass/40 p-4">
                <span className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-ink-faint">
                  Status Engine Media
                </span>
                <div className="space-y-2">
                  {healthList.map((e) => (
                    <div key={e.id} className="flex items-center justify-between text-xs">
                      <span className="font-medium text-ink">{e.name}</span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-glass-2 px-2.5 py-0.5 font-mono text-ink-muted">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        {e.id === 'nezumi' ? 'Gratis (Aktif)' : e.score > 0 ? `Sukses: ${e.score}` : 'Siaga'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <button
                  onClick={save}
                  className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-[oklch(86%_0.008_260)]"
                >
                  {saved ? 'Tersimpan ✓' : 'Simpan'}
                </button>
                <button
                  onClick={onClose}
                  className="rounded-full px-4 py-2.5 text-sm text-ink-muted transition-colors hover:text-ink"
                >
                  Batal
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}