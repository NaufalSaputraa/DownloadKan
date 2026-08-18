import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { act } from 'react'
import { MediaResult } from './MediaResult'
import type { AnalyzedMedia as MediaResultType } from '../lib/api-local'

describe('MediaResult component', () => {
  const mockResult: MediaResultType = {
    title: 'Awesome Viral Video',
    thumbnail: 'https://example.com/thumb.jpg',
    platform: 'tiktok',
    sourceUrl: 'https://tiktok.com/@user/123',
    downloads: [
      { type: 'Video HD (No Watermark)', url: 'https://cdn.example.com/video.mp4' },
      { type: 'Audio MP3 (HD)', url: 'https://cdn.example.com/audio.mp3' },
    ],
    engine: 'yt-dlp',
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders video title and platform badge', () => {
    render(<MediaResult result={mockResult} />)
    expect(screen.getByText('Awesome Viral Video')).toBeInTheDocument()
    expect(screen.getByText('tiktok')).toBeInTheDocument()
  })

  it('renders download options and allows switching formats', () => {
    render(<MediaResult result={mockResult} />)
    expect(screen.getByText('Video HD (No Watermark)')).toBeInTheDocument()
    expect(screen.getByText('Audio MP3 (HD)')).toBeInTheDocument()

    // Click on audio format
    const audioRadio = screen.getByText('Audio MP3 (HD)')
    fireEvent.click(audioRadio)
    expect(audioRadio).toHaveAttribute('aria-pressed', 'true')
  })

  it('copies download link when copy button is clicked', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    })

    render(<MediaResult result={mockResult} />)
    const copyButton = screen.getByText(/Salin Tautan/i)
    act(() => {
      fireEvent.click(copyButton)
    })

    expect(writeText).toHaveBeenCalledWith('https://cdn.example.com/video.mp4')
  })
})
