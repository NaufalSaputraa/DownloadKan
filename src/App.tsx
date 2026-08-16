import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SearchBar } from './components/SearchBar'
import { MediaResult } from './components/MediaResult'
import { TorrentPanel } from './components/TorrentPanel'
import { UnifiedSearchResults } from './components/UnifiedSearchResults'
import { SettingsSheet } from './components/SettingsSheet'
import { Toaster } from './components/ui/Toast'
import { DEEZLOAD_BOT, telegramBotDeepLink } from './lib/telegram'
import { useMedia } from './hooks/useMedia'
import { useSettings } from './hooks/useSettings'
import { useToast } from './hooks/useToast'
import { useLocalBackend } from './hooks/useLocalBackend'

type Tab = 'media' | 'torrent'

function App() {
  const [tab, setTab] = useState<Tab>('media')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { state, analyze } = useMedia()
  const { settings, update } = useSettings()
  const { toasts, push, dismiss } = useToast()
  const { isLocal, jobs } = useLocalBackend()

  const handleSubmit = useCallback(
    (url: string) => {
      if (state.status === 'analyzing') return
      void analyze(url, settings.jerexdKey).catch((e: unknown) => {
        push((e as Error).message, 'error')
      })
    },
    [state.status, analyze, settings.jerexdKey, push],
  )

  // Tangani tautan masukan dari PWA Share Target (?url=... atau ?text=...)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const shared = params.get('url') || params.get('text') || params.get('title')
    if (shared && /^https?:\/\//i.test(shared.trim())) {
      handleSubmit(shared.trim())
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [handleSubmit])

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pb-16 pt-8 sm:px-6">
      {/* Skip link — aksesibilitas keyboard */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-5 focus:py-2.5 focus:text-sm focus:text-paper"
      >
        Lewati ke konten utama
      </a>

      {/* Nav — N5 floating pill */}
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <a href="/" className="group flex items-baseline gap-1" aria-label="DownloadKan — beranda">
            <span className="font-display text-2xl tracking-tight text-ink">Download</span>
            <span className="font-display text-2xl italic tracking-tight text-accent">Kan</span>
          </a>
          {isLocal && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 font-mono text-[10px] text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Local Core
            </span>
          )}
        </div>

        <nav className="glass flex items-center gap-1 rounded-full p-1">
          <div className="relative flex items-center gap-1">
            {(['media', 'torrent'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                aria-pressed={tab === t}
                className="relative z-10 rounded-full px-4 py-1.5 text-sm transition-colors duration-200"
                style={{ color: tab === t ? 'var(--color-ink)' : 'var(--color-ink-muted)' }}
              >
                {tab === t && (
                  <motion.span
                    layoutId="tab-indicator"
                    className="absolute inset-0 rounded-full bg-glass-2"
                    style={{ zIndex: -1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                {t === 'media' ? 'Media' : 'Torrent'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded-full p-1.5 text-ink-faint transition-all hover:bg-glass hover:text-ink hover:rotate-45 duration-300"
            aria-label="Pengaturan"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.05a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55h.05a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.05a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </button>
        </nav>
      </header>

      {/* Hero */}
      <motion.section
        className="mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
          {isLocal ? '⚡ Standalone Local Engine — FLAC 24-bit, 4K & Torrent' : '100% di browsermu — tanpa server'}
        </p>
        <h1 className="max-w-[14ch] font-display text-4xl leading-[1.05] tracking-tight text-ink sm:text-6xl">
          Unduh dari mana saja.
        </h1>
      </motion.section>

      {/* Main */}
      <main id="main" className="flex flex-col gap-4">
        {/* Active Local Download Jobs Bar */}
        {jobs.length > 0 && (
          <section className="glass rounded-2xl p-4 border border-accent/30 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink">Antrean Unduhan Lokal</h3>
            {jobs.map((j) => (
              <div key={j.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate max-w-[260px] font-medium text-ink">{j.filename}</span>
                  <span className="font-mono text-[11px] text-ink-muted">
                    {j.speed} · ETA {j.eta} ({j.progress}%)
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-glass-2">
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-300"
                    style={{ width: `${Math.max(j.progress, 3)}%` }}
                  />
                </div>
              </div>
            ))}
          </section>
        )}

        <AnimatePresence mode="wait">
          {tab === 'media' ? (
            <motion.div
              key="media-panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-4"
            >
              <SearchBar disabled={state.status === 'analyzing'} onSubmit={handleSubmit} />
              {state.status === 'analyzing' && <SkeletonState />}
              {state.status === 'error' && <ErrorState message={state.error ?? ''} url={state.detection?.url} />}
              {state.status === 'done' && state.result && <MediaResult result={state.result} />}
              {state.status === 'unified_search_done' && state.unifiedResults && (
                <UnifiedSearchResults
                  query={state.searchQuery ?? ''}
                  videos={state.unifiedResults.videos}
                  musics={state.unifiedResults.musics}
                  onSelectUrl={(link) => handleSubmit(link)}
                />
              )}
              {state.status === 'idle' && <IdleHint />}
            </motion.div>
          ) : (
            <motion.div
              key="torrent-panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-4"
            >
              <TorrentPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-auto pt-12 text-center">
        <p className="font-display text-base sm:text-lg text-ink-muted">
          Tool, bukan api. File yang kamu unduh milikmu — tak pernah melewati server kami.
        </p>
      </footer>

      <SettingsSheet
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onChange={update}
      />
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}

function IdleHint() {
  const platforms = ['TikTok', 'Instagram', 'YouTube', 'X', 'Spotify', 'SoundCloud', 'Deezer', 'Pixiv', 'Bandcamp']
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="flex flex-col items-center gap-3 pt-8"
    >
      <div className="flex flex-wrap items-center justify-center gap-2">
        {platforms.map((p, i) => (
          <motion.span
            key={p}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35 + i * 0.05, type: 'spring', stiffness: 300, damping: 20 }}
            className="rounded-full border border-glass-border-soft bg-glass px-3 py-1 text-xs text-ink-faint transition-colors hover:border-glass-border hover:text-ink-muted"
          >
            {p}
          </motion.span>
        ))}
      </div>
      <p className="font-mono text-[11px] text-ink-faint/60">— dan masih banyak lagi.</p>
    </motion.div>
  )
}

function SkeletonState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass w-full rounded-[24px] p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="h-44 w-full rounded-2xl animate-shimmer sm:h-auto sm:w-52" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-24 rounded-full animate-shimmer" style={{ animationDelay: '0.1s' }} />
          <div className="h-6 w-4/5 rounded-lg animate-shimmer" style={{ animationDelay: '0.2s' }} />
          <div className="h-3 w-2/3 rounded-lg animate-shimmer" style={{ animationDelay: '0.3s' }} />
          <div className="mt-4 flex gap-2">
            <div className="h-8 w-24 rounded-full animate-shimmer" style={{ animationDelay: '0.4s' }} />
            <div className="h-8 w-24 rounded-full animate-shimmer" style={{ animationDelay: '0.5s' }} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function ErrorState({ message, url }: { message: string; url?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-[24px] border-[oklch(70%_0.19_25/0.4)] p-6"
    >
      <h3 className="mb-1 font-medium text-[oklch(80%_0.14_25)]">Gagal menganalisis</h3>
      <p className="whitespace-pre-wrap font-mono text-sm text-ink-muted">{message}</p>

      {url && (
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <a
            href={telegramBotDeepLink(DEEZLOAD_BOT, url)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2.5 text-sm font-medium text-sky-300 transition-colors hover:bg-sky-400/20"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M21.9 4.1 18.8 19.3c-.2 1-.8 1.2-1.7.8l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.4-4.8 8.7-7.9c.4-.3-.1-.5-.6-.2L7.5 12.5 2.8 11c-1-.3-1-1 .2-1.5l17.6-6.8c.9-.3 1.6.2 1.3 1.4Z" />
            </svg>
            Coba via Telegram ({DEEZLOAD_BOT})
          </a>
        </div>
      )}
    </motion.div>
  )
}

export default App