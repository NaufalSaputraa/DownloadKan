# Testing Strategy & Quality Assurance Specification — DownloadKan

> **Nama Produk:** DownloadKan
> **Target Testing Coverage:** ≥ 80% pada logika murni (utils + engine registry)
> **Testing Frameworks:** Vitest + React Testing Library + Playwright
> **Versi:** v1.0

---

## 1. Testing Pyramid Architecture

```
        /  E2E Tests (Playwright)     \   ← Alur: analyze media, download magnet, search torrent
       / Integration Tests (Vitest)   \  ← Engine registry + failover + URL detect
      /   Unit Tests (Vitest)         \  ← format.ts, url-detect.ts (regex), sanitasi
```

## 2. Test Execution Commands

- **Unit:** `npm run test:unit`
- **Integration:** `npm run test:integration`
- **E2E:** `npx playwright test`
- **Build check:** `npm run build` (TypeScript strict + lint)

## 3. Mandatory Testing Rules (AAA Pattern)

Semua unit test wajib memakai pola **Arrange-Act-Assert (AAA)**:

```typescript
test('url-detect mengklasifikasikan magnet dengan benar', () => {
  // Arrange
  const input = 'magnet:?xt=urn:btih:d69f91e6d2e8f53b7d74a2f87f63f1ee2c4b5f8e';

  // Act
  const result = detectType(input);

  // Assert
  expect(result).toBe('torrent');
});
```

## 4. Unit Tests (high-value)

| File | Kasus |
| :--- | :--- |
| `url-detect.ts` | YouTube/TikTok/IG/X/Spotify URL → `{ platform }`; magnet & infohash → `torrent`; string acak → `unknown`; tanpa parameter pelacakan (utm) |
| `format.ts` | formatBytes(0/1024/2M), sanitizeFileName (hapus `\/:*?"<>|`), parseDuration |
| `engine registry` (mock fetch) | Nezumi sukses → return; Nezumi 500 → fallback Jerexd; keduanya gagal → `MediaError` terstruktur |
| `storage.ts` | set/get/remove safe JSON localStorage; versioning (v1) |

## 5. Integration & E2E (Playwright)

Alur kritis 3:

1. **Media flow**: paste URL TikTok/IG di input → klik Analisis → (mock intercept Nezumi) → expect preview
   + tombol format muncul. (E2E use mock `route` agar tidak bergantung API live.)
2. **Torrent flow**: tambahkan magnet test (infohash valid) → expect status "connecting"/progress event.
   (E2E opsional karena butuh peers; cukup pastikan no-crash & UI render.)
3. **Search**: mock response function → tampil card hasil {name, size, seeders} → klik unduh meneruskan ke
   WebTorrent handler.

## 6. Extra QA

- **Build CI:** lint + typecheck + test di GitHub Actions / wrangler actions.
- **Manual smoke** sebelum release: `npm run build` + `npx wrangler pages dev` mencoba search function
  (karena memerlukan CF runtime).
