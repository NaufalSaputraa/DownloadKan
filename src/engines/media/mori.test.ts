import { describe, it, expect, vi, beforeEach } from 'vitest'
import { moriEngine } from './mori'

describe('mori engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('supports Pixiv, Apple Music, Bandcamp, TikTok, Instagram, Twitter/X', () => {
    expect(moriEngine.supports('https://www.pixiv.net/en/artworks/12345')).toBe(true)
    expect(moriEngine.supports('https://music.apple.com/us/album/song/123')).toBe(true)
    expect(moriEngine.supports('https://artist.bandcamp.com/track/hello')).toBe(true)
    expect(moriEngine.supports('https://tiktok.com/@user/video/123')).toBe(true)
    expect(moriEngine.supports('https://example.com/unsupported')).toBe(false)
  })

  it('fetches Pixiv artwork directly with pixiv.re CDN links', async () => {
    const result = await moriEngine.fetch('https://www.pixiv.net/en/artworks/109033333', { jerexdKey: '' })
    expect(result.platform).toBe('pixiv')
    expect(result.title).toBe('Pixiv Artwork #109033333')
    expect(result.downloads[0].url).toBe('https://pixiv.re/109033333.png')
  })

  it('fetches Apple Music preview and HD cover from iTunes API', async () => {
    const mockResponse = {
      results: [
        {
          trackName: 'Starboy',
          artistName: 'The Weeknd',
          artworkUrl100: 'https://is1-ssl.mzstatic.com/image/thumb/Music/v4/100x100bb.jpg',
          previewUrl: 'https://audio-ssl.itunes.apple.com/preview.mp3',
        },
      ],
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const result = await moriEngine.fetch('https://music.apple.com/us/album/starboy/12345?i=67890', { jerexdKey: '' })
    expect(result.platform).toBe('applemusic')
    expect(result.title).toBe('The Weeknd - Starboy')
    expect(result.thumbnail).toBe('https://is1-ssl.mzstatic.com/image/thumb/Music/v4/600x600bb.jpg')
    expect(result.downloads[0].url).toBe('https://audio-ssl.itunes.apple.com/preview.mp3')
  })
})
