import { detectKind } from '../../utils/url-detect'
import { nezumiEngine } from './nezumi'
import { jerexdEngine } from './jerexd'
import type { MediaEngine, MediaResult } from './types'

export const mediaEngines: MediaEngine[] = [nezumiEngine, jerexdEngine]

export type * from './types'

/**
 * Registry + failover engine media.
 * Coba engine berurutan; yang gagal dilewati hingga ada hasil.
 * Urutan dinamis: engine yang baru-baru ini berhasil didahulukan.
 */
export async function fetchMedia(url: string, jerexdKey: string): Promise<MediaResult> {
  const { kind, platform } = detectKind(url)
  if (kind !== 'media') throw new MediaRoutingError('Bukan tautan media.')

  const candidates = orderByHealth(mediaEngines)
  const failures: string[] = []
  for (const engine of candidates) {
    try {
      const result = await engine.fetch(url, { jerexdKey })
      markEngineSuccess(engine.id)
      return result
    } catch (err) {
      failures.push(`${engine.name}: ${(err as Error).message}`)
    }
  }
  throw new MediaRoutingError(
    `Semua engine gagal.\n${failures.map((f) => `· ${f}`).join('\n')}\nPlatform terdeteksi: ${platform}`,
  )
}

/** Engines yang sukses terakhir dipindah ke depan (bobot kecil agar stabil). */
const healthScore = new Map<string, number>()
function orderByHealth(engines: MediaEngine[]): MediaEngine[] {
  return [...engines].sort((a, b) => (healthScore.get(b.id) ?? 0) - (healthScore.get(a.id) ?? 0))
}
export function markEngineSuccess(id: string): void {
  healthScore.set(id, (healthScore.get(id) ?? 0) + 1)
}

export class MediaRoutingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MediaRoutingError'
  }
}