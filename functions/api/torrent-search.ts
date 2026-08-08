import { searchTorrents, type TorrentHit } from '../../src/engines/torrent/sources'

interface Env {}

export const onRequest: PagesFunction<Env> = async ({ request }) => {
  const url = new URL(request.url)
  const q = url.searchParams.get('q')?.trim() ?? ''

  if (!q) {
    return json({ error: 'parameter `q` wajib.' }, { status: 400 })
  }

  try {
    const hits: TorrentHit[] = await searchTorrents(q)
    return json({ query: q, results: hits })
  } catch (err) {
    return json({ error: (err as Error).message }, { status: 502 })
  }
}

function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', ...(init?.headers ?? {}) },
  })
}