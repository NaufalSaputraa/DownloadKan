import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

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

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      webtorrentBrowserStubs(),
      nodePolyfills({
        include: ['events', 'path', 'process', 'stream', 'buffer', 'util', 'crypto', 'net', 'dgram', 'string_decoder', 'timers', 'http', 'https', 'url', 'os', 'zlib'],
        globals: { Buffer: true, process: true, global: true },
      }),
    ],
    define: {
      global: 'globalThis',
    },
    optimizeDeps: {
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
        // Proxy semua request API ke Standalone FastAPI Backend
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          ws: true,
        },
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