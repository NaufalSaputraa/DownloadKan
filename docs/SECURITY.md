# Security & Compliance Specification — DownloadKan

> **Nama Produk:** DownloadKan
> **Standar Keamanan:** OWASP Top 10 (adaptif) + Local Data Isolation
> **Versi:** v1.0

---

## 1. Auth & Authorization Architecture

- **Tidak ada akun/sesi server** — aplikasi murni statis.
- Autentikasi opsional (P2 roadmap) bila ditambah: hanya PIN lokal di browser (tidak dikirim ke server),
  untuk melindungi riwayat.
- **Tidak ada kredensial server** yang dikirim ke pihak ketiga kecuali API key media (ke endpoint yang
  memang require) berdasarkan pilihan user.

## 2. Data Protection & Secrets Management

- **API keys (Jerexd dsb.) disimpan di `localStorage` user** — TIDAK pernah di-hardcode di source code.
- `.env` / `.dev.vars` hanya untuk keperluan Local (misal key Jerexd test dev) — TIDAK BOLEH di-commit
  (sudah ada di `.gitignore`).
- **Enkripsi at rest**: opsional untuk key & history via `WebCrypto` (P2.2). Default: `localStorage`
  plaintext dengan catatan privasi yang jelas (murni lokal browser user).
- **Encryption in transit:** semua panggilan API pakai HTTPS (Nezumi/Jerexd/Pages sudah).

## 3. Threat Modeling & Mitigation (align OWASP)

| Ancaman / Vulnerability | Risiko | Mitigasi Yang Diterapkan |
| :--- | :--- | :--- |
| **Open Redirect** (URL user dipakai untuk fetch) | Sedang | Validasi domain engine (allowlist), tidak follow redirect eksternal sembarangan saat render |
| **XSS via judul/nama file dari API** | Sedang | Render via React (auto-escape); sanitasi nama file & teks sebelum dijadikan `a[href=...]`; jangan pakai `innerHTML` dari data API |
| **Content Injection dari magnet/torrent nama** | Sedang | Escape saat render; file disimpan dengan nama tersanitasi regex |
| **CORS / SOR** | Tinggi | Hanya panggil domain allowlist (nezumi, jerexd, own function); tidak melewat param sembarangan ke fetch |
| **CSP bypass / mixed content** | Sedang | Set `Content-Security-Policy` production; pastikan semua sumber `https://` |
| **Malware via FileTorrent** | — | Disclaimer & tombol "report"; tidak menjalankan file torrent (hanya download); sumber terkurasi seperti torlink memfilter konten executable berisiko |

## 4. Privasi Pengguna (Local Data Isolation)

- Semua data (history, keys, pengaturan) **murni lokal browser** — tidak pernah dikirim ke server kita.
- Kunjungan analitis: default **tanpa third-party tracking** (hanya Vercel/CF optional + opt-in).
- Stream torrent tidak melalui server kita; hanya DNS/tracker public yang terhubung (sebagaimana
  ketentuan WebTorrent).

## 5. Compliance & Disclaimer

- Hanya untuk penggunaan pribadi/legal; footer menyertakan **DMCA/feedback** & disclaimer bahwa
  fitur ini hanya tool dan bukan direktori konten bajakan.
