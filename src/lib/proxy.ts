/**
 * CORS adalah kendala nyata: API media pihak ketiga memblokir permintaan lintas-origin.
 * Semua panggilan analisis media disalurkan lewat *proxy* (Cloudflare Pages Function di
 * production; Vite dev-proxy & wrangler di lokal). File unduhan akhir tetap langsung
 * dari CDN sumber — yang lewat proxy hanya JSON metadata.
 */
export type ProxyTarget = 'nezumi' | 'jerexd'

export function buildProxyUrl(target: ProxyTarget, apiPath: string, params: Record<string, string>): string {
  const qs = new URLSearchParams(params).toString()
  return `/api/proxy/${target}/${apiPath}${qs ? `?${qs}` : ''}`
}