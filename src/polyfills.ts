/**
 * Polyfill minimum modul Node untuk WebTorrent di browser (Vite/ESM).
 * WebTorrent mengimpor `events`, `path`, `process`, `Buffer`, `global`.
 * `events` & `path` di-alias di vite.config.ts (package `events`, `path-browserify`).
 * Berikut sisanya yang butuh runtime hooking, dijalankan sebelum import app.
 */
import { Buffer } from 'buffer'

const g = globalThis as any

if (!g.process) {
  g.process = {
    env: {
      NODE_ENV: 'production',
      // WebTorrent membaca opsi env berikut; nilai kosong = tidak didukung
      NODE_JS: '',
      UTP_SUPPORT: '',
      ENABLE_HTTPS: '',
      WEBRTC_SUPPORT: 'true',
    },
    browser: true,
    nextTick: (cb: () => void) => queueMicrotask(cb),
    platform: 'browser',
    argv: [],
    version: '',
    cwd: () => '/',
    hrtime: () => [0, 0],
  }
}
if (!g.Buffer) g.Buffer = Buffer
if (!g.global) g.global = g

export {}