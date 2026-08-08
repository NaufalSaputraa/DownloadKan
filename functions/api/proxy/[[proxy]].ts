/**
 * Cloudflare Pages Function — proxy CORS untuk engine media.
 * Frontend memanggil `/api/proxy/{target}/...`; function ini meneruskan ke upstream.
 * Keuntungan: hanya metadata lewat edge; file unduhan tetap langsung dari CDN sumber.
 *
 * Lokal: `npm run pages:dev` (wrangler) atau `npm run dev` (Vite dev-proxy di vite.config.ts).
 */

interface Env {
  /** Key Jerexd default — secret server-side. Dipakai bila user tidak mengirim apikey sendiri. */
  JEREXD_API_KEY?: string
}

const UPSTREAMS: Record<string, string> = {
  nezumi: 'https://api.nezumi.eu.cc',
  jerexd: 'https://api.jerexd.my.id',
  deezer: 'https://api.deezer.com',
}

export const onRequest: PagesFunction<Env> = async ({ request, params, env }) => {
  const dynamic = params['proxy']
  const path = Array.isArray(dynamic) ? dynamic.join('/') : String(dynamic ?? '')
  const [target, ...rest] = path.split('/')
  const upstream = UPSTREAMS[target]

  if (!upstream) {
    return new Response(JSON.stringify({ error: `unknown proxy target: ${target}` }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    })
  }

  const apiPath = rest.join('/')
  const url = new URL(request.url)
  const params2 = new URLSearchParams(url.search)

  // Sembunyikan key default: jika user tidak mengirim apikey, injeksi dari secret server-side.
  // (User yang mengisi key sendiri tetap memakai key mereka — override.)
  if (target === 'jerexd' && !params2.has('apikey') && env.JEREXD_API_KEY) {
    params2.set('apikey', env.JEREXD_API_KEY)
  }

  const qs = params2.toString()
  const targetUrl = `${upstream}/${apiPath}${qs ? `?${qs}` : ''}`

  const upstreamRes = await fetch(targetUrl, {
    method: request.method,
    headers: {
      'user-agent': request.headers.get('user-agent') ?? 'DownloadKan/edge',
      accept: 'application/json',
    },
  })

  const contentType = upstreamRes.headers.get('content-type') ?? 'application/json'
  const body = await upstreamRes.text()

  return new Response(body, {
    status: upstreamRes.status,
    headers: {
      'content-type': contentType,
      'cache-control': 'no-store',
    },
  })
}