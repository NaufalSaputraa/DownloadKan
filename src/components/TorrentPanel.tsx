import { useCallback, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTorrent, type ActiveTorrent } from '../hooks/useTorrent'
import { searchTorrentsFromApi } from '../engines/torrent/search'
import type { TorrentHit } from '../engines/torrent/sources'
import { formatEta, formatSpeed } from '../utils/format'
import { Chip } from './ui/Chip'

export function TorrentPanel() {
  const { active, start, remove, clearFinished } = useTorrent()
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [hits, setHits] = useState<TorrentHit[]>([])
  const [searchMsg, setSearchMsg] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const doSearch = useCallback(async () => {
    const q = query.trim()
    if (!q || searching) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setSearching(true)
    setSearchMsg(null)
    setHits([])
    try {
      const results = await searchTorrentsFromApi(q, ctrl.signal)
      setHits(results)
      if (!results.length) setSearchMsg('Tidak ada hasil untuk kueri itu.')
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setSearchMsg((err as Error).message)
    } finally {
      if (!ctrl.signal.aborted) setSearching(false)
    }
  }, [query, searching])

  const isMagnet = useCallback((q: string) => {
    const t = q.trim()
    return /^magnet:\?xt=urn:btih:/i.test(t) || /^[a-f0-9]{40}$/i.test(t)
  }, [])

  /** Enter: magnet → mulai unduh; selain itu → cari. */
  const handleSubmit = useCallback(() => {
    const q = query.trim()
    if (!q) return
    if (isMagnet(q)) {
      start(q)
      setQuery('')
      return
    }
    void doSearch()
  }, [query, isMagnet, start, doSearch])

  return (
    <motion.div
      key="torrent"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-4"
    >
      {/* Paste magnet */}
      <section className="glass rounded-[24px] p-5 sm:p-6">
        <h2 className="mb-1 font-display text-xl text-ink">Paste magnet / infohash</h2>
        <p className="mb-4 max-w-md text-sm text-ink-muted">
          Unduhan P2P berjalan langsung dari browsermu via WebTorrent — tanpa lewat server.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="magnet:?xt=urn:btih:… atau cari kata kunci"
            className="min-w-0 flex-1 rounded-2xl border border-glass-border bg-glass px-4 py-3 font-mono text-sm text-ink outline-none placeholder:text-ink-faint focus:border-accent"
            aria-label="Magnet atau kata kunci pencarian"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <button
            onClick={handleSubmit}
            disabled={searching || !query.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper transition-all hover:bg-[oklch(86%_0.008_260)] disabled:opacity-45"
          >
            {searching ? 'Mencari…' : isMagnet(query) ? 'Mulai Unduh' : 'Cari'}
          </button>
        </div>

        <p className="mt-3 font-mono text-[11px] text-ink-faint">
          Tips: kalau punya magnet/infohash langsung, paste &amp; tekan Enter — WebTorrent akan
          menyambung lalu kamu simpan filenya.
        </p>
      </section>

      {/* Hasil pencarian */}
      {searchMsg && <p className="px-2 font-mono text-xs text-ink-faint">{searchMsg}</p>}
      {hits.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <h3 className="text-sm font-medium text-ink">Hasil pencarian</h3>
            <span className="font-mono text-xs text-ink-faint">{hits.length} item</span>
          </div>
          <ul className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {hits.map((h, i) => (
                <motion.li
                  key={`${h.source}-${i}`}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3) }}
                  className="glass flex flex-col gap-2 rounded-2xl p-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip tone="accent">{h.source}</Chip>
                      {h.quality && <Chip>{h.quality}</Chip>}
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-ink">{h.title}</p>
                    <p className="mt-1 font-mono text-xs text-ink-faint">
                      {h.size} · {h.seeders} seeder · {h.leechers} leecher
                    </p>
                  </div>
                  <button
                    onClick={() => start(h.magnet)}
                    className="shrink-0 self-start rounded-full border border-glass-border px-4 py-2 text-sm text-ink transition-colors hover:border-accent hover:text-accent sm:self-center"
                  >
                    Unduh
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>
      )}

      {/* Progress unduhan aktif */}
      {active.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <h3 className="text-sm font-medium text-ink">Unduhan aktif</h3>
            <button onClick={clearFinished} className="font-mono text-[11px] text-accent hover:underline">
              bersihkan selesai
            </button>
          </div>
          <ul className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {active.map((t) => (
                <TorrentProgressCard key={t.key} t={t} onRemove={remove} />
              ))}
            </AnimatePresence>
          </ul>
        </section>
      )}
    </motion.div>
  )
}

function TorrentProgressCard({ t, onRemove }: { t: ActiveTorrent; onRemove: (k: string) => void }) {
  const p = t.progress
  const pct = Math.round(p.progress * 100)
  const label = p.connecting ? 'menghubungi peers…' : p.done ? 'selesai ✓' : `${pct}%`

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="glass rounded-2xl p-4"
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{p.name || '(memuat metadata…)'}</p>
          <p className="mt-0.5 font-mono text-[11px] text-ink-faint">{p.infoHash.slice(0, 16)}…</p>
        </div>
        <button
          onClick={() => onRemove(t.key)}
          className="shrink-0 rounded-full p-1 text-ink-faint transition-colors hover:bg-glass hover:text-ink"
          aria-label="Hapus unduhan"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="mb-2 h-1 overflow-hidden rounded-full bg-glass-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300"
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-ink-muted tabular-nums">
          {formatSpeed(p.downloadSpeed)} ↓ · {formatSpeed(p.uploadSpeed)} ↑ · {p.numPeers} peers · ETA {formatEta(p.timeRemaining)}
        </span>
        <span className="font-mono text-[11px] text-ink-muted tabular-nums">{label}</span>
      </div>

      {/* File siap disimpan */}
      {p.done && p.files.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] text-ink-faint">File:</span>
          {p.files.slice(0, 5).map((f, i) => (
            <button
              key={i}
              onClick={f.save}
              className="rounded-full border border-glass-border px-3 py-1 text-xs text-ink transition-colors hover:border-accent hover:text-accent"
              title={f.name}
            >
              Simpan {f.name.length > 24 ? `${f.name.slice(0, 24)}…` : f.name}
            </button>
          ))}
          {p.files.length > 5 && (
            <span className="font-mono text-[11px] text-ink-faint">+{p.files.length - 5} file lain</span>
          )}
        </div>
      )}
    </motion.li>
  )
}