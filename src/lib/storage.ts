export type AudioQualitySetting = 'flac' | 'mp3_320' | 'mp3_192'

export interface Settings {
  jerexdKey: string
  defaultFormat: string
  audioQuality: AudioQualitySetting
  historyLimit: number
}

export interface HistoryItem {
  id: string
  kind: 'media' | 'torrent'
  platform: string
  title: string
  thumbnail: string | null
  source: string
  format: string
  engine: string
  status: 'done' | 'failed' | 'downloading'
  createdAt: string
}

const SETTINGS_KEY = 'dk.settings'
const HISTORY_KEY = 'dk.history.v1'

/**
 * Key Jerexd default TIDAK disimpan di bundle (client-side) — untuk keamanan,
 * key default di-inject server-side oleh Cloudflare Pages Function (secret
 * `JEREXD_API_KEY`). Frontend hanya menyimpan key user sendiri (override).
 * Di dev lokal, key default disuntikkan oleh Vite dev-proxy (vite.config.ts).
 */
export const DEFAULT_JEREXD_KEY = ''

export const DEFAULT_SETTINGS: Settings = {
  jerexdKey: '',
  defaultFormat: 'mp4',
  audioQuality: 'flac',
  historyLimit: 50,
}

function safeGet<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function getSettings(): Settings {
  const loaded = safeGet<Partial<Settings>>(SETTINGS_KEY, {})
  // User override disimpan di localStorage; tanpa itu → kosong → server inject default.
  return { ...DEFAULT_SETTINGS, ...loaded }
}

export function saveSettings(patch: Partial<Settings>): Settings {
  const next = { ...getSettings(), ...patch }
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
  } catch {
    /* kuota penuh / private mode */
  }
  return next
}

export function getHistory(): HistoryItem[] {
  return safeGet<HistoryItem[]>(HISTORY_KEY, [])
}

export function pushHistory(item: Omit<HistoryItem, 'id' | 'createdAt'>): HistoryItem {
  const full: HistoryItem = { ...item, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
  const { historyLimit } = getSettings()
  const next = [full, ...getHistory()].slice(0, historyLimit)
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  } catch {
    /* jangan gagalkan operasi */
  }
  return full
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY)
  } catch {
    /* noop */
  }
}