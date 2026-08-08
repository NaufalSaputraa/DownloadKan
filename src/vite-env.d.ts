/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Key Jerexd default (fallback) — diisi via `.env` lokal / env var Cloudflare Pages saat build. */
  readonly VITE_JEREXD_DEFAULT_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
