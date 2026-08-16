import { describe, it, expect } from 'vitest'
import { detectKind, detectPlatform, stripTracking, isSupportedPlatform } from './url-detect'

describe('url-detect utility', () => {
  describe('stripTracking', () => {
    it('removes utm parameters, fbclid, igshid, si', () => {
      const url = 'https://youtu.be/dQw4w9WgXcQ?si=abcdef123456&utm_source=share&fbclid=xyz987'
      const clean = stripTracking(url)
      expect(clean).toBe('https://youtu.be/dQw4w9WgXcQ')
    })

    it('preserves non-tracking query parameters', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s'
      const clean = stripTracking(url)
      expect(clean).toContain('v=dQw4w9WgXcQ')
    })

    it('returns raw string if invalid URL is provided', () => {
      expect(stripTracking('not-a-valid-url')).toBe('not-a-valid-url')
    })
  })

  describe('detectPlatform', () => {
    const cases: Array<[string, string]> = [
      ['https://www.tiktok.com/@user/video/123456', 'tiktok'],
      ['https://vm.tiktok.com/ZM8abc/', 'tiktok'],
      ['https://www.instagram.com/reel/C123456/', 'instagram'],
      ['https://youtu.be/dQw4w9WgXcQ', 'youtube'],
      ['https://music.youtube.com/watch?v=xyz', 'youtube'],
      ['https://x.com/jack/status/20', 'twitter'],
      ['https://twitter.com/jack/status/20', 'twitter'],
      ['https://www.facebook.com/watch/?v=123', 'facebook'],
      ['https://fb.watch/xyz123/', 'facebook'],
      ['https://www.threads.net/@user/post/abc', 'threads'],
      ['https://open.spotify.com/track/12345', 'spotify'],
      ['https://music.apple.com/us/album/song/123', 'applemusic'],
      ['https://soundcloud.com/artist/track', 'soundcloud'],
      ['https://pin.it/7abcxyz', 'pinterest'],
      ['https://www.pixiv.net/en/artworks/123456', 'pixiv'],
      ['https://artist.bandcamp.com/track/song', 'bandcamp'],
      ['https://www.deezer.com/track/123456', 'deezer'],
      ['https://www.bilibili.com/video/BV1xx411c7mD', 'bilibili'],
      ['https://example.com/random', 'unknown'],
    ]

    cases.forEach(([url, expected]) => {
      it(`detects ${expected} for ${url}`, () => {
        expect(detectPlatform(url)).toBe(expected)
      })
    })
  })

  describe('detectKind', () => {
    it('detects magnet URI as torrent', () => {
      const magnet = 'magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567&dn=Ubuntu'
      const result = detectKind(magnet)
      expect(result.kind).toBe('torrent')
      expect(result.torrentId).toBe('0123456789abcdef0123456789abcdef01234567')
    })

    it('detects 40-char infohash as torrent', () => {
      const infohash = '0123456789abcdef0123456789abcdef01234567'
      const result = detectKind(infohash)
      expect(result.kind).toBe('torrent')
      expect(result.torrentId).toBe('0123456789abcdef0123456789abcdef01234567')
    })

    it('detects HTTP URLs as media', () => {
      const result = detectKind('https://tiktok.com/@creator/video/123')
      expect(result.kind).toBe('media')
      expect(result.platform).toBe('tiktok')
    })

    it('detects text search query as search', () => {
      const result = detectKind('Daft Punk Starboy')
      expect(result.kind).toBe('search')
      expect(result.url).toBe('Daft Punk Starboy')
    })

    it('detects empty input as unknown', () => {
      const result = detectKind('')
      expect(result.kind).toBe('unknown')
    })
  })

  describe('isSupportedPlatform', () => {
    it('returns true for known platforms and false for unknown', () => {
      expect(isSupportedPlatform('youtube')).toBe(true)
      expect(isSupportedPlatform('pixiv')).toBe(true)
      expect(isSupportedPlatform('unknown')).toBe(false)
    })
  })
})
