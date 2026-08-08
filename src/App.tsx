import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SearchBar } from './components/SearchBar'
import { MediaResult } from './components/MediaResult'
import { TorrentPanel } from './components/TorrentPanel'
import { MusicSearchResults } from './components/MusicSearchResults'
import { SettingsSheet } from './components/SettingsSheet'
import { Toaster } from './components/ui/Toast'
import { useMedia } from './hooks/useMedia'
import { useSettings } from './hooks/useSettings'
import { useToast } from './hooks/useToast'

type Tab = 'media' | 'torrent'

function App() {
  const [tab, setTab] = useState<Tab>('media')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { state, analyze } = useMedia()
  const { settings, update } = useSettings()
  const { toasts, push, dismiss } = useToast()

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
      <header className="mb-10 flex items-center justify-between">
        <a href="/" className="group flex items-baseline gap-1" aria-label="DownloadKan — beranda">
          <span className="font-display text-2xl tracking-tight text-ink">Download</span>
          <span className="font-display text-2xl italic tracking-tight text-accent">Kan</span>
        </a>

        <nav className="glass flex items-center gap-1 rounded-full p-1">
          {(['media', 'torrent'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              aria-pressed={tab === t}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                tab === t ? 'bg-glass-2 text-ink' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {t === 'media' ? 'Media' : 'Torrent'}
            </button>
          ))}
          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded-full p-1.5 text-ink-faint transition-colors hover:bg-glass hover:text-ink"
            aria-label="Pengaturan"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.05a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55h.05a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.05a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </button>
        </nav>
      </header>

      {/* Hero — macrostructure: marquee, typography-dominant */}
      <motion.section
        className="mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
          100% di browsermu — tanpa server
        </p>
        <h1 className="max-w-[12ch] font-display text-5xl leading-[1.02] tracking-tight text-ink sm:text-6xl">
          Unduh dari mana saja.
        </h1>
      </motion.section>

      {/* Main */}
      <main id="main" className="flex flex-col gap-4">
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
              {state.status === 'error' && <ErrorState message={state.error ?? ''} />}
              {state.status === 'done' && state.result && <MediaResult result={state.result} />}
              {state.status === 'search_done' && state.searchResults && (
                <MusicSearchResults
                  query={state.searchQuery ?? ''}
                  results={state.searchResults}
                  onSelectTrack={(link) => handleSubmit(link)}
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

      {/* Footer — Ft5 statement */}
      <footer className="mt-auto pt-12 text-center">
        <p className="font-display text-lg text-ink-muted">
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
  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      className="pt-6 text-center font-mono text-xs text-ink-faint"
    >
      TikTok · Instagram · YouTube · X · SoundCloud — dan masih banyak lagi.
    </motion.p>
  )
}

function SkeletonState() {
  return (
    <div className="glass w-full animate-pulse rounded-[24px] p-6">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="h-44 w-full rounded-2xl bg-glass-2 sm:h-auto sm:w-52" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-24 rounded-full bg-glass-2" />
          <div className="h-6 w-4/5 rounded-lg bg-glass-2" />
          <div className="h-3 w-2/3 rounded-lg bg-glass-2" />
          <div className="mt-4 flex gap-2">
            <div className="h-8 w-20 rounded-full bg-glass-2" />
            <div className="h-8 w-20 rounded-full bg-glass-2" />
          </div>
        </div>
      </div>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-[24px] border-[oklch(70%_0.19_25/0.4)] p-6"
    >
      <h3 className="mb-1 font-medium text-[oklch(80%_0.14_25)]">Gagal menganalisis</h3>
      <p className="whitespace-pre-wrap font-mono text-sm text-ink-muted">{message}</p>
    </motion.div>
  )
}

export default App