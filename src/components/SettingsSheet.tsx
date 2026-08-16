import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { AudioQualitySetting, Settings } from '../lib/storage'
import { clearHistory, DEFAULT_JEREXD_KEY } from '../lib/storage'
import { getEngineHealth } from '../engines/media'
import { useLocalBackend } from '../hooks/useLocalBackend'

interface Props {
  open: boolean
  settings: Settings
  onClose: () => void
  onChange: (patch: Partial<Settings>) => void
}

const QUALITY_OPTIONS: Array<{ id: AudioQualitySetting; label: string; desc: string }> = [
  { id: 'flac', label: 'FLAC Lossless 1411 kbps', desc: 'Kualitas Tertinggi (Hi-Fi)' },
  { id: 'mp3_320', label: 'MP3 High Quality 320 kbps', desc: 'Suara Jernih Standar HQ' },
  { id: 'mp3_192', label: 'MP3 Standard 192 kbps', desc: 'Ukuran File Hemat' },
]

export function SettingsSheet({ open, settings, onClose, onChange }: Props) {
  const usingDefault = !settings.jerexdKey || settings.jerexdKey === DEFAULT_JEREXD_KEY
  const [draft, setDraft] = useState(usingDefault ? '' : settings.jerexdKey)
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const { isLocal, health } = useLocalBackend()

  const healthList = getEngineHealth()
  const selectedQuality = QUALITY_OPTIONS.find((q) => q.id === (settings.audioQuality ?? 'flac')) ?? QUALITY_OPTIONS[0]

  const save = () => {
    const finalKey = draft.trim() ? draft.trim() : ''
    onChange({ jerexdKey: finalKey })
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
            className="fixed inset-x-3 bottom-3 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 z-[80] mx-auto max-w-md"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="glass-2 max-h-[85vh] overflow-y-auto rounded-[24px] p-5 sm:p-6 text-ink">
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

              <p className="mb-4 text-xs text-ink-muted">
                Pengaturan ini tersimpan tersandi secara privat di device-mu (localStorage).
              </p>

              {/* Status Local Standalone Engine */}
              {isLocal && health && (
                <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                      ⚡ Standalone Engine Aktif
                    </span>
                    <span className="font-mono text-[10px] text-emerald-300">Local Core</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="flex items-center gap-1.5 text-ink-muted">
                      <span>yt-dlp:</span>
                      <span className={health.engines.ytdlp ? 'text-emerald-400' : 'text-rose-400'}>
                        {health.engines.ytdlp ? 'Terpasang ✓' : 'Absen'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-ink-muted">
                      <span>streamrip:</span>
                      <span className={health.engines.streamrip ? 'text-emerald-400' : 'text-rose-400'}>
                        {health.engines.streamrip ? 'Terpasang ✓' : 'Absen'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-ink-muted">
                      <span>aria2c:</span>
                      <span className={health.engines.aria2c ? 'text-emerald-400' : 'text-amber-400'}>
                        {health.engines.aria2c ? 'Terpasang ✓' : 'Opsional'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-ink-muted">
                      <span>FFmpeg:</span>
                      <span className={health.engines.ffmpeg ? 'text-emerald-400' : 'text-rose-400'}>
                        {health.engines.ffmpeg ? 'Terpasang ✓' : 'Absen'}
                      </span>
                    </div>
                  </div>
                  <p className="font-mono text-[10px] text-ink-faint truncate" title={health.downloadDir}>
                    📁 Simpan: {health.downloadDir}
                  </p>
                </div>
              )}

              {/* Input API Key Custom / Default */}
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-ink-faint">
                  API Key Jerexd (Opsional)
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && save()}
                    placeholder="Menggunakan API Key Default"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className="w-full rounded-2xl border border-glass-border bg-glass py-3 pl-4 pr-11 font-mono text-sm text-ink outline-none transition-all placeholder:text-ink-faint focus:border-glass-border focus:ring-1 focus:ring-glass-border"
                  />
                  {draft && (
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
                  )}
                </div>
              </div>

              {/* Custom Glassmorphism Dropdown untuk Kualitas Audio */}
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-ink-faint">
                  Kualitas Audio Utama
                </label>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex w-full items-center justify-between rounded-2xl border border-glass-border bg-glass px-4 py-3 text-left font-mono text-sm text-ink outline-none transition-all hover:bg-glass-2"
                >
                  <div>
                    <span className="block font-medium">{selectedQuality.label}</span>
                    <span className="text-[10px] text-ink-faint">{selectedQuality.desc}</span>
                  </div>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                  >
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-2 space-y-1 overflow-hidden rounded-2xl border border-glass-border bg-glass-2 p-1.5"
                    >
                      {QUALITY_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            onChange({ audioQuality: opt.id })
                            setDropdownOpen(false)
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs transition-colors ${
                            opt.id === selectedQuality.id
                              ? 'bg-glass-2 font-medium text-ink'
                              : 'text-ink-muted hover:bg-glass hover:text-ink'
                          }`}
                        >
                          <div>
                            <span className="block font-mono font-medium">{opt.label}</span>
                            <span className="text-[10px] text-ink-faint">{opt.desc}</span>
                          </div>
                          {opt.id === selectedQuality.id && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-ink">
                              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Status Health Engine */}
              <div className="mb-4 rounded-2xl border border-glass-border bg-glass/40 p-4">
                <span className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-ink-faint">
                  Status Engine Cloud
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

              {/* Data Local & History */}
              <div className="mb-5 flex items-center justify-between rounded-2xl border border-glass-border bg-glass/40 p-3.5">
                <div>
                  <span className="block text-xs font-medium text-ink">Riwayat Local</span>
                  <span className="text-[11px] text-ink-muted">Hapus daftar riwayat & cache browser</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearHistory()
                    setSaved(true)
                    window.setTimeout(() => setSaved(false), 1500)
                  }}
                  className="rounded-xl border border-glass-border bg-glass px-3 py-1.5 text-xs text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                >
                  Hapus Data
                </button>
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
                  Tutup
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}