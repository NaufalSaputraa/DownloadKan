import { detectKind } from '../../utils/url-detect'
import { moriEngine } from './mori'
import { nezumiEngine } from './nezumi'
import { jerexdEngine } from './jerexd'
import type { MediaEngine, MediaResult } from './types'

export const mediaEngines: MediaEngine[] = [moriEngine, nezumiEngine, jerexdEngine]

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
      return sortByHighestQuality(result)
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

/**
 * Urutkan opsi unduhan agar Kualitas Tertinggi (4K / 1080p Full HD / FLAC Lossless / High-Res PNG)
 * SELALU berada di urutan pertama (index 0) dan menjadi pilihan default sistem.
 */
function sortByHighestQuality(result: MediaResult): MediaResult {
  if (!result.downloads || result.downloads.length <= 1) return result

  const sorted = [...result.downloads].sort((a, b) => {
    const scoreA = getQualityScore(a.type)
    const scoreB = getQualityScore(b.type)
    return scoreB - scoreA
  })

  return { ...result, downloads: sorted }
}

function getQualityScore(typeLabel: string): number {
  const t = typeLabel.toLowerCase()
  if (t.includes('4k') || t.includes('2160p') || t.includes('flac') || t.includes('1411')) return 100
  if (t.includes('1080p') || t.includes('full hd') || t.includes('lossless') || t.includes('320')) return 90
  if (t.includes('720p') || t.includes('hd') || t.includes('png') || t.includes('utama')) return 80
  if (t.includes('192') || t.includes('128') || t.includes('mp3')) return 60
  if (t.includes('480p') || t.includes('sd') || t.includes('pratinjau') || t.includes('preview')) return 30
  if (t.includes('watermark')) return 10
  return 50
}

export function markEngineSuccess(id: string): void {
  healthScore.set(id, (healthScore.get(id) ?? 0) + 1)
}

export interface EngineHealth {
  id: string
  name: string
  score: number
}

export function getEngineHealth(): EngineHealth[] {
  return mediaEngines.map((e) => ({
    id: e.id,
    name: e.name,
    score: healthScore.get(e.id) ?? 0,
  }))
}

export class MediaRoutingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MediaRoutingError'
  }
}