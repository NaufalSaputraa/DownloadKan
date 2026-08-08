export interface Settings {
  jerexdKey: string
  defaultFormat: string
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

export const DEFAULT_SETTINGS: Settings = {
  jerexdKey: 'JEREXD_API_KEY_TERHAPUS',
  defaultFormat: 'mp4',
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
  return { ...DEFAULT_SETTINGS, ...safeGet<Partial<Settings>>(SETTINGS_KEY, {}) }
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