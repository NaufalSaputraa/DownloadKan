/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Tidak ada VITE_* yang dibutuhkan. Key Jerexd default disuntikkan server-side
  // (CF secret `JEREXD_API_KEY` di produksi; `.env` → Vite dev-proxy di lokal).
}
