# System & UI/UX Design Specification — DownloadKan

> **Nama Produk:** DownloadKan
> **Status:** Active
> **Tema Visual:** Adaptive (Light/Dark), diutamakan dark
> **Framework UI:** Tailwind CSS v4 + Framer Motion + React

---

## 1. Filosofi Desain & User Experience (UX)

- **Glassmorphism premium ala Apple**: unsur kaca — `backdrop-blur`, translucency, highlight lembut,
  bayangan ambient. Bersih, premium, dan menenangkan.
- **Monokrom minimalis**: hitam/putih/grey lembut, tanpa aksen warna mencolok; konten (thumbnail video)
  jadi satu-satunya sumber warna.
- **Satu fokus per layar**: halaman sederhana — satu input besar di tengah, hasil memenuhi layar tanpa
  distraksi iklan.
- **Micro-animations halus** (Framer Motion) untuk transisi tab, mount card, progress.
- **Responsif** dari layar 360px (HP) sampai desktop 1440px+.

---

## 2. Design Tokens & Color Palette

### 2.1. Skema Warna (Color System)
- **Background (light):** `#F5F5F7` (abu-putih Apple) / `#FAFAFA`
- **Background (dark):** `#0A0A0C` (near black) / `#1C1C1E`
- **Surface / Cards (glass):** `rgba(255,255,255,0.55)` (light) / `rgba(255,255,255,0.06)` (dark)
  dengan `backdrop-blur` 16–24px
- **Border (glass):** `rgba(0,0,0,0.08)` (light) / `rgba(255,255,255,0.10)` (dark)
- **Text Primary:** `#1C1C1E` / `#F5F5F7`
- **Text Muted:** `#86868B` / `#98989D`
- **Accent:** natural `white`/`black`; hanya progress aktif pakai `systemBlue` tipis (`#0A84FF`)

*(Skema mengikuti prinsip template desain: hindari palet generik.)*

### 2.2. Blur/Glass Realization
- Card: `backdrop-blur-xl bg-white/40 dark:bg-white/10 rounded-2xl border border-black/5 shadow-lg shadow-black/5`
- Background halos (`radial-gradient`) lembut sebagai bokeh di belakang glass — persis motif Mori/Apple.

---

## 3. Tipografi (Typography)

- **Font Utama (Body):** Inter / System-ui (`-apple-system`, Segoe UI)
- **Font Heading:** Inter (semiBold/bold, tracking-tight)
- **Font Code/Monospace:** JetBrains Mono / ui-monospace (hanya info teknis: infohash, engine label)

---

## 4. Hierarki Komponen UI (Component Hierarchy)

```
[ App Container (gradient lembut, bokeh bg) ]
 ├── [ Header ]  → logo + tab "Media" / "Torrent" + settings icon
 ├── [ Main View ]
 │    ├── [ SearchBar (glass, besar, focus glow) ]
 │    ├── [ MediaResult ]   → thumbnail + title + format buttons
 │    ├── [ TorrentResult ] → search hit list (size/seeders) + magnet button
 │    └── [ ProgressSheet ] → progress ring/bar + speed + ETA (Framer Motion)
 └── [ Footer ]  → disclaimer + DMCA/feedback
```

---

## 5. Micro-Animations & Dynamic States

- **Card hover:** scale 1.02 + border-brightening 0.25s ease.
- **Input focus:** ring `2px rgba(255,255,255,.4)` + glow, smooth.
- **Loading:** skeleton shimmer (gradient animate) pada card hasil; spinner halus saat analisa.
- **Tab switch:** `AnimatePresence` fade+translateY(6px)→0.
- **Progress:** bar menggelinding smooth (bukan lompat) — mengikuti throttle data.
- **Toast:** slide-up fade, auto-dismiss, untuk notif error/sukses engine.

---

## 6. Aksesibilitas (Accessibility & WCAG)

- **Kontras teks:** ≥ 4.5:1 untuk body, ≥ 3:1 untuk teks besar/inactive label.
- **Keyboard:** focus ring terdefinisi, tab order natural, `aria-expanded` untuk tabs/modal.
- **Screen reader:** `aria-label` di semua tombol (btn download, play, close modal); `role="status"` untuk
  toast progress.
- **Reduced motion:** hormati `prefers-reduced-motion` → animation disabled.

---

