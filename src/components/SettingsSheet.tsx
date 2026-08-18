import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { AudioQualitySetting, Settings } from '../lib/storage'
import { clearHistory } from '../lib/storage'
import { useLocalBackend } from '../hooks/useLocalBackend'
import { updateEngineCore } from '../lib/api-local'

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
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [cleared, setCleared] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateMsg, setUpdateMsg] = useState<string | null>(null)
  const [copiedTarget, setCopiedTarget] = useState<'termux' | 'windows' | null>(null)
  const { isLocal, health } = useLocalBackend()

  const handleUpdateEngine = async () => {
    try {
      setIsUpdating(true)
      setUpdateMsg(null)
      const res = await updateEngineCore()
      setUpdateMsg(`✓ ${res.message}`)
      setTimeout(() => setUpdateMsg(null), 4000)
    } catch (err) {
      setUpdateMsg(`✕ ${(err as Error).message}`)
      setTimeout(() => setUpdateMsg(null), 4000)
    } finally {
      setIsUpdating(false)
    }
  }

  const selectedQuality =
    QUALITY_OPTIONS.find((q) => q.id === (settings.audioQuality ?? 'flac')) ?? QUALITY_OPTIONS[0]

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
            <div className="glass-2 max-h-[85vh] overflow-y-auto rounded-[24px] p-5 sm:p-6 text-ink space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl text-ink">Pengaturan DownloadKan</h2>
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

              <p className="text-xs text-ink-muted">
                DownloadKan berjalan 100% mandiri pada server lokal perangkatmu dengan kecepatan maksimal.
              </p>

              {/* Status Local Standalone Engine */}
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Standalone Local Core
                  </span>
                  <span className="font-mono text-[11px] text-emerald-300">
                    {isLocal ? 'Terhubung (v2.0)' : 'Menghubungkan...'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="flex items-center justify-between rounded-xl bg-glass-2 px-2.5 py-1.5 border border-glass-border">
                    <span className="text-ink-muted">yt-dlp</span>
                    <span className={health?.engines.ytdlp ? 'text-emerald-400 font-semibold' : 'text-rose-400'}>
                      {health?.engines.ytdlp ? 'Siap ✓' : 'Absen'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-glass-2 px-2.5 py-1.5 border border-glass-border">
                    <span className="text-ink-muted">FFmpeg</span>
                    <span className={health?.engines.ffmpeg ? 'text-emerald-400 font-semibold' : 'text-rose-400'}>
                      {health?.engines.ffmpeg ? 'Siap ✓' : 'Absen'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-glass-2 px-2.5 py-1.5 border border-glass-border">
                    <span className="text-ink-muted">aria2c</span>
                    <span className={health?.engines.aria2c ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                      {health?.engines.aria2c ? 'Siap ✓' : 'Opsional'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-glass-2 px-2.5 py-1.5 border border-glass-border">
                    <span className="text-ink-muted">LRCLIB</span>
                    <span className="text-emerald-400 font-semibold">Aktif ✓</span>
                  </div>
                </div>

                {health?.downloadDir && (
                  <div className="rounded-xl bg-glass-2 p-2.5 border border-glass-border space-y-1">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-ink-faint block">
                      📁 Lokasi Penyimpanan Unduhan
                    </span>
                    <p className="font-mono text-xs text-ink truncate" title={health.downloadDir}>
                      {health.downloadDir}
                    </p>
                  </div>
                )}

                {/* Tombol Update Engine Core */}
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={handleUpdateEngine}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-glass px-3 py-2 text-xs font-mono text-emerald-400 hover:bg-emerald-500/15 border border-emerald-500/30 transition-colors disabled:opacity-50"
                >
                  {isUpdating ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Sedang Memperbarui yt-dlp Core...</span>
                    </>
                  ) : updateMsg ? (
                    <span>{updateMsg}</span>
                  ) : (
                    <>
                      <span>⚡ Perbarui Engine Core (yt-dlp)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Kualitas Audio Utama Dropdown */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium uppercase tracking-[0.12em] text-ink-faint">
                  Format & Kualitas Musik Standar
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

              {/* Panduan Instalasi & Tombol Salin 1-Klik */}
              <div className="rounded-2xl border border-glass-border bg-glass/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-accent flex items-center gap-1.5">
                    🚀 Pasang di HP (Termux) & Desktop
                  </span>
                </div>

                <div className="space-y-2.5">
                  {/* Android (Termux) */}
                  <div className="rounded-xl bg-glass-2 p-2.5 border border-glass-border space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-ink flex items-center gap-1.5">
                        <span>📱</span> Android (Termux)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const cmd = 'pkg install -y curl && curl -fsSL https://raw.githubusercontent.com/NaufalSaputraa/DownloadKan/main/install.sh | bash'
                          navigator.clipboard?.writeText(cmd)
                          setCopiedTarget('termux')
                          setTimeout(() => setCopiedTarget(null), 2500)
                        }}
                        className="rounded-lg bg-accent/15 hover:bg-accent/25 border border-accent/30 px-2.5 py-1 text-[11px] font-mono text-accent transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {copiedTarget === 'termux' ? '✓ Tersalin' : '📋 Salin Perintah'}
                      </button>
                    </div>
                    <code className="block bg-black/40 rounded-lg p-2 font-mono text-[10px] text-ink-muted break-all select-all">
                      pkg install -y curl && curl -fsSL https://raw.githubusercontent.com/NaufalSaputraa/DownloadKan/main/install.sh | bash
                    </code>
                  </div>

                  {/* Windows (PowerShell) */}
                  <div className="rounded-xl bg-glass-2 p-2.5 border border-glass-border space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-ink flex items-center gap-1.5">
                        <span>🪟</span> Windows (PowerShell)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const cmd = 'irm https://raw.githubusercontent.com/NaufalSaputraa/DownloadKan/main/install.ps1 | iex'
                          navigator.clipboard?.writeText(cmd)
                          setCopiedTarget('windows')
                          setTimeout(() => setCopiedTarget(null), 2500)
                        }}
                        className="rounded-lg bg-accent/15 hover:bg-accent/25 border border-accent/30 px-2.5 py-1 text-[11px] font-mono text-accent transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {copiedTarget === 'windows' ? '✓ Tersalin' : '📋 Salin Perintah'}
                      </button>
                    </div>
                    <code className="block bg-black/40 rounded-lg p-2 font-mono text-[10px] text-ink-muted break-all select-all">
                      irm https://raw.githubusercontent.com/NaufalSaputraa/DownloadKan/main/install.ps1 | iex
                    </code>
                  </div>
                </div>
              </div>

              {/* Data Local & History */}
              <div className="flex items-center justify-between rounded-2xl border border-glass-border bg-glass/40 p-3.5">
                <div>
                  <span className="block text-xs font-medium text-ink">Riwayat Local</span>
                  <span className="text-[11px] text-ink-muted">Bersihkan riwayat unduhan & cache</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearHistory()
                    setCleared(true)
                    window.setTimeout(() => setCleared(false), 1500)
                  }}
                  className="rounded-xl border border-glass-border bg-glass px-3 py-1.5 text-xs text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                >
                  {cleared ? 'Dibersihkan ✓' : 'Hapus Riwayat'}
                </button>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  onClick={onClose}
                  className="rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-[oklch(86%_0.008_260)]"
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