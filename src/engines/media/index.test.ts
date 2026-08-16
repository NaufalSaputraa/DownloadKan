import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchMedia, getEngineHealth, markEngineSuccess, MediaRoutingError } from './index'
import { moriEngine } from './mori'
import { nezumiEngine } from './nezumi'
import { jerexdEngine } from './jerexd'

describe('media engines registry and failover', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('throws MediaRoutingError for non-media URLs', async () => {
    await expect(fetchMedia('not-a-url', '')).rejects.toThrow(MediaRoutingError)
  })

  it('sorts download formats by highest quality with cover/image last', async () => {
    vi.spyOn(moriEngine, 'fetch').mockResolvedValueOnce({
      title: 'Test Song',
      thumbnail: 'https://example.com/thumb.jpg',
      platform: 'youtube',
      sourceUrl: 'https://youtu.be/123',
      downloads: [
        { type: 'Cover Art (JPG)', url: 'https://example.com/cover.jpg' },
        { type: 'Audio MP3 (128kbps)', url: 'https://example.com/audio.mp3' },
        { type: 'Video Full HD (1080p)', url: 'https://example.com/video.mp4' },
      ],
      engine: 'Mori Engine',
    })

    const result = await fetchMedia('https://youtu.be/123', '')
    expect(result.title).toBe('Test Song')
    expect(result.downloads[0].type).toBe('Video Full HD (1080p)')
    expect(result.downloads[1].type).toBe('Audio MP3 (128kbps)')
    expect(result.downloads[2].type).toBe('Cover Art (JPG)')
  })

  it('fails over to Nezumi when Mori fails', async () => {
    vi.spyOn(moriEngine, 'fetch').mockRejectedValueOnce(new Error('Mori engine failed'))
    vi.spyOn(nezumiEngine, 'fetch').mockResolvedValueOnce({
      title: 'Nezumi Video',
      thumbnail: null,
      platform: 'tiktok',
      sourceUrl: 'https://tiktok.com/@user/123',
      downloads: [{ type: 'Video HD (No Watermark)', url: 'https://nezumi.com/v.mp4' }],
      engine: 'Nezumi',
    })

    const result = await fetchMedia('https://tiktok.com/@user/123', '')
    expect(result.engine).toBe('Nezumi')
    expect(result.title).toBe('Nezumi Video')
  })

  it('fails over to Jerexd when Mori and Nezumi fail', async () => {
    vi.spyOn(moriEngine, 'fetch').mockRejectedValueOnce(new Error('Mori down'))
    vi.spyOn(nezumiEngine, 'fetch').mockRejectedValueOnce(new Error('Nezumi down'))
    vi.spyOn(jerexdEngine, 'fetch').mockResolvedValueOnce({
      title: 'Jerexd Video',
      thumbnail: null,
      platform: 'tiktok',
      sourceUrl: 'https://tiktok.com/@user/123',
      downloads: [{ type: 'Video HD', url: 'https://jerexd.com/v.mp4' }],
      engine: 'Jerexd',
    })

    const result = await fetchMedia('https://tiktok.com/@user/123', 'test_key')
    expect(result.engine).toBe('Jerexd')
    expect(result.title).toBe('Jerexd Video')
  })

  it('updates engine health score on success', () => {
    markEngineSuccess('mori')
    markEngineSuccess('mori')
    markEngineSuccess('nezumi')

    const health = getEngineHealth()
    const moriHealth = health.find((h) => h.id === 'mori')
    const nezumiHealth = health.find((h) => h.id === 'nezumi')

    expect(moriHealth?.score).toBeGreaterThanOrEqual(2)
    expect(nezumiHealth?.score).toBeGreaterThanOrEqual(1)
  })
})
