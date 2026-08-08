import type { TorrentHit } from './sources'

export interface SearchResponse {
  query: string
  results: TorrentHit[]
  error?: string
}

export async function searchTorrentsFromApi(q: string, signal?: AbortSignal): Promise<TorrentHit[]> {
  const res = await fetch(`/api/torrent-search?q=${encodeURIComponent(q)}`, { signal })
  if (!res.ok) throw new Error(`Pencarian gagal (${res.status})`)
  const data = (await res.json()) as SearchResponse
  if (data.error || !data.results) throw new Error(data.error ?? 'Respons pencarian tidak dikenal.')
  return data.results
}