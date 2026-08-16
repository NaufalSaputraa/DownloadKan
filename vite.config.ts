import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { loadEnv } from 'vite'
import { searchTorrents } from './src/engines/torrent/sources.ts'

const PROXY = (target: string) => ({
  target,
  changeOrigin: true,
  secure: true,
  rewrite: (p: string) => {
    // /api/proxy/nezumi/api/download → /api/download
    const idx = p.indexOf('/api/proxy/')
    if (idx === -1) return p
    const rest = p.slice(idx + '/api/proxy/'.length)
    const slash = rest.indexOf('/')
    return slash === -1 ? '/' : rest.slice(slash)
  },
})

/** Dev-proxy untuk jerexd — menyuntikkan key default dari `.env` di sisi Node
 * (tidak pernah ter-bake ke bundle browser; meniru perilaku CF secret di produksi). */
function jerexdProxy(jerexdKey: string) {
  return {
    target: 'https://api.jerexd.my.id',
    changeOrigin: true,
    secure: true,
    rewrite: (p: string) => {
      const idx = p.indexOf('/api/proxy/')
      const rest = idx === -1 ? p : p.slice(idx + '/api/proxy/'.length)
      const slash = rest.indexOf('/')
      let path = slash === -1 ? '/' : rest.slice(slash)
      // Jika user belum override (tanpa apikey), suntik key default server-side.
      if (jerexdKey && !path.includes('apikey=')) {
        path += `${path.includes('?') ? '&' : '?'}apikey=${encodeURIComponent(jerexdKey)}`
      }
      return path
    },
  }
}

/** Dev middleware: melayani /api/torrent-search tanpa perlu `wrangler pages dev`. */
function torrentSearchDevMiddleware(): Plugin {
  return {
    name: 'torrent-search-dev',
    configureServer(server) {
      server.middlewares.use('/api/torrent-search', async (req, res) => {
        try {
          const url = new URL(req.url ?? '/', 'http://localhost')
          const q = url.searchParams.get('q')?.trim() ?? ''
          if (!q) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'query wajib.' }))
            return
          }
          const hits = await searchTorrents(q)
          res.setHeader('content-type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ query: q, results: hits }))
        } catch (err) {
          res.statusCode = 502
          res.end(JSON.stringify({ error: (err as Error).message }))
        }
      })
    },
  }
}

/** Dev middleware: /api/proxy/download?url=...&filename=... — stream file CDN
 *  dengan `Content-Disposition` yang benar agar nama file unduhan sesuai judul. */
function downloadProxyMiddleware(): Plugin {
  return {
    name: 'download-proxy-dev',
    configureServer(server) {
      server.middlewares.use('/api/proxy/download', async (req, res) => {
        try {
          const parsed = new URL(req.url ?? '/', 'http://localhost')
          const targetUrl = parsed.searchParams.get('url')
          const filename = parsed.searchParams.get('filename') || 'download'
          if (!targetUrl) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'url param required' }))
            return
          }
          const upstream = await fetch(targetUrl)
          if (!upstream.ok) {
            res.statusCode = upstream.status
            res.end(`Upstream error: ${upstream.status}`)
            return
          }
          const ct = upstream.headers.get('content-type') || 'application/octet-stream'
          const cl = upstream.headers.get('content-length')
          res.setHeader('Content-Type', ct)
          if (cl) res.setHeader('Content-Length', cl)
          // Force filename — inilah yang menyelesaikan masalah UUID
          res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/"/g, "'")}"`)
          res.setHeader('Access-Control-Allow-Origin', '*')
          const reader = upstream.body?.getReader()
          if (!reader) { res.statusCode = 502; res.end('No body'); return }
          const pump = async () => {
            while (true) {
              const { done, value } = await reader.read()
              if (done) { res.end(); break }
              res.write(Buffer.from(value))
            }
          }
          await pump()
        } catch (err) {
          if (!res.headersSent) {
            res.statusCode = 502
            res.end(JSON.stringify({ error: (err as Error).message }))
          }
        }
      })
    },
  }
}

/**
 * WebTorrent di-bundle untuk Node; di browser beberapa modulnya tidak valid
 * (utp-native, nat-api, conn-pool yang di-`browser:false`). Stub dipasang di
 * dua lapis: esbuildOptions (saat prebundle) & plugin resolveId (saat serve/build).
 */
const WEBTORRENT_STUB_SRC = `export const UTP_SUPPORT = false;\nexport default { UTP_SUPPORT: false };`
const WEBTORRENT_STUB_NAMES = ['utp-native', '@silentbot1/nat-api']
const WEBTORRENT_STUB_PATH_MARKERS = ['webtorrent/lib/utp', 'webtorrent/lib/conn-pool', 'lib/conn-pool', 'lib/utp']

function isStubTarget(id: string): boolean {
  const norm = id.replace(/\\/g, '/').toLowerCase()
  if (WEBTORRENT_STUB_NAMES.includes(norm)) return true
  return WEBTORRENT_STUB_PATH_MARKERS.some((m) => norm.endsWith(m) || norm.includes(m + '.cjs') || norm.includes(m + '.js'))
}

function webtorrentBrowserStubs(): Plugin {
  return {
    name: 'webtorrent-browser-stubs',
    resolveId(id) {
      const norm = id.replace(/\\/g, '/').toLowerCase()
      if (norm.includes('version.cjs')) return '\0wt-version'
      if (norm.includes('cpus/browser.js') || norm.endsWith('/cpus') || norm === 'cpus') return '\0wt-cpus'
      if (isStubTarget(id)) return `\0wt-stub:${id}`
      return null
    },
    load(id) {
      if (id === '\0wt-version') return `export default '3.0.21';`
      if (id === '\0wt-cpus') {
        return `export default function cpus() {
          const num = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 1;
          return Array.from({ length: num }, () => ({ model: '', speed: 0, times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 } }));
        };`
      }
      if (id.startsWith('\0wt-stub:')) return WEBTORRENT_STUB_SRC
      return null
    },
  }
}

export default defineConfig(({ mode }) => {
  // `.env` untuk dev lokal (JEREXD_API_KEY) — dibaca di sisi Node, bukan di bundle.
  const env = loadEnv(mode, process.cwd(), '')
  const jerexdKey = env.JEREXD_API_KEY?.trim() ?? ''

  return {
    plugins: [
      react(),
      tailwindcss(),
      torrentSearchDevMiddleware(),
      downloadProxyMiddleware(),
      webtorrentBrowserStubs(),
      nodePolyfills({
        // Polyfill modul Node yang dibutuhkan WebTorrent di browser.
        include: ['events', 'path', 'process', 'stream', 'buffer', 'util', 'crypto', 'net', 'dgram', 'string_decoder', 'timers', 'http', 'https', 'url', 'os', 'zlib'],
        globals: { Buffer: true, process: true, global: true },
      }),
    ],
    define: {
      global: 'globalThis',
    },
    optimizeDeps: {
      // WebTorrent di-serve lewat pipeline transform (bukan prebundle) agar plugin
      // webtorrentBrowserStubs (resolveId) men-stub conn-pool/utp/nat-api yang
      // di-`browser:false` menjadi undefined. Deps CJS-nya tetap di-prebulle agar
      // interop named/default (debug, streamx, err-code, mime, …) berfungsi.
      exclude: ['webtorrent'],
      include: [
        'debug',
        'streamx',
        'err-code',
        'block-iterator',
        'unordered-array-remove',
        'addr-to-ip-port',
        'bitfield',
        'bittorrent-dht',
        'bittorrent-protocol',
        'bittorrent-tracker',
        'cache-chunk-store',
        'create-torrent',
        'escape-html',
        'fsa-chunk-store',
        'immediate-chunk-store',
        'join-async-iterator',
        'lt_donthave',
        'memory-chunk-store',
        'mime',
        'mime/lite',
        'once',
        'parse-torrent',
        'pump',
        'queue-microtask',
        'random-iterate',
        'range-parser',
        'run-parallel',
        'run-parallel-limit',
        'speed-limiter',
        'throughput',
        'torrent-piece',
        'uint8-util',
        'ut_metadata',
        '@thaunknown/simple-peer',
        'cpus',
      ],
    },
    server: {
      port: 5173,
      proxy: {
        '/api/proxy/nezumi': PROXY('https://api.nezumi.eu.cc'),
        '/api/proxy/jerexd': jerexdProxy(jerexdKey),
        '/api/proxy/deezer': PROXY('https://api.deezer.com'),
      },
    },
    resolve: {
      alias: [
        { find: 'mime/lite.js', replacement: 'mime/lite' },
        { find: /.*version\.cjs$/, replacement: '/src/lib/webtorrent-version-stub.ts' },
      ],
    },
  }
})