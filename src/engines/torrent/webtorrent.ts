export interface TorrentFileRef {
  name: string
  size: number
  save: () => void
}

export interface TorrentProgress {
  name: string
  infoHash: string
  progress: number // 0..1
  downloadSpeed: number
  uploadSpeed: number
  numPeers: number
  timeRemaining: number
  done: boolean
  files: TorrentFileRef[]
  magnet: string
  connecting: boolean
}

export type TorrentWatcher = (snapshot: TorrentProgress) => void

/** Ubah input menjadi magnet yang valid untuk WebTorrent. */
function toMagnet(id: string): string {
  const raw = id.trim()
  if (/^magnet:/i.test(raw)) return raw
  const clean = raw.replace(/^urn:btih:/i, '')
  if (/^[a-f0-9]{40}$/i.test(clean)) return `magnet:?xt=urn:btih:${clean.toLowerCase()}`
  return raw
}

function toFileRef(f: any): TorrentFileRef {
  return {
    name: f.name,
    size: f.length,
    save: () => {
      f.getBlobURL((err: unknown, url: string | null) => {
        if (err || !url) return
        const a = document.createElement('a')
        a.href = url
        a.download = f.name
        a.click()
        window.setTimeout(() => URL.revokeObjectURL(url), 5000)
      })
    },
  }
}

/**
 * Wrapper WebTorrent — client singleton + dynamic import agar bundle berat
 * hanya dimuat saat tab torrent dipakai.
 */
class TorrentManager {
  private client: any = null

  private async ensureClient(): Promise<any> {
    if (this.client) return this.client
    const mod = await import('webtorrent')
    const WebTorrent = mod.default ?? mod
    this.client = new WebTorrent()
    return this.client
  }

  async add(id: string, watcher: TorrentWatcher): Promise<void> {
    const client = await this.ensureClient()
    const magnet = toMagnet(id)

    const torrent = client.add(magnet, { deselect: false })

    const snapshot = (connecting: boolean): TorrentProgress => ({
      name: torrent.name ?? '',
      infoHash: torrent.infoHash ?? '',
      progress: torrent.done ? 1 : torrent.progress ?? 0,
      downloadSpeed: torrent.downloadSpeed ?? 0,
      uploadSpeed: torrent.uploadSpeed ?? 0,
      numPeers: torrent.numPeers ?? 0,
      timeRemaining: torrent.timeRemaining ?? 0,
      done: torrent.done ?? false,
      files: (torrent.files ?? []).map(toFileRef),
      magnet,
      connecting,
    })

    const onTick = () => watcher(snapshot(false))
    torrent.on('download', onTick)
    torrent.on('upload', onTick)
    torrent.on('done', onTick)
    torrent.on('metadata', () => watcher(snapshot(false)))
    torrent.on('warning', (e: any) => console.warn('[torrent]', e?.message))
    torrent.on('error', (e: any) => console.error('[torrent]', e?.message))

    watcher(snapshot(true))
  }

  async remove(infoHash: string): Promise<void> {
    if (!this.client) return
    const t = this.client.get(infoHash)
    if (t) t.destroy()
  }

  async destroy(): Promise<void> {
    if (!this.client) return
    this.client.destroy()
    this.client = null
  }
}

export const torrentManager = new TorrentManager()