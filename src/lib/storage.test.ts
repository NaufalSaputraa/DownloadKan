import { describe, it, expect, beforeEach } from 'vitest'
import {
  getSettings,
  saveSettings,
  getHistory,
  pushHistory,
  clearHistory,
  DEFAULT_SETTINGS,
} from './storage'

describe('storage library', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('settings', () => {
    it('returns default settings initially', () => {
      const settings = getSettings()
      expect(settings).toEqual(DEFAULT_SETTINGS)
    })

    it('saves and merges settings patches', () => {
      saveSettings({ audioQuality: 'mp3_320' })
      const updated = getSettings()
      expect(updated.audioQuality).toBe('mp3_320')
      expect(updated.defaultFormat).toBe('mp4')
    })
  })

  describe('history', () => {
    it('returns empty history initially', () => {
      expect(getHistory()).toEqual([])
    })

    it('pushes and limits history items', () => {
      saveSettings({ historyLimit: 2 })
      pushHistory({
        kind: 'media',
        platform: 'youtube',
        title: 'Video 1',
        thumbnail: null,
        source: 'https://youtu.be/1',
        format: 'mp4',
        engine: 'nezumi',
        status: 'done',
      })
      pushHistory({
        kind: 'media',
        platform: 'youtube',
        title: 'Video 2',
        thumbnail: null,
        source: 'https://youtu.be/2',
        format: 'mp4',
        engine: 'nezumi',
        status: 'done',
      })
      pushHistory({
        kind: 'media',
        platform: 'youtube',
        title: 'Video 3',
        thumbnail: null,
        source: 'https://youtu.be/3',
        format: 'mp4',
        engine: 'nezumi',
        status: 'done',
      })

      const history = getHistory()
      expect(history.length).toBe(2)
      expect(history[0].title).toBe('Video 3')
      expect(history[1].title).toBe('Video 2')
    })

    it('clears history completely', () => {
      pushHistory({
        kind: 'media',
        platform: 'tiktok',
        title: 'Dance',
        thumbnail: null,
        source: 'https://tiktok.com/1',
        format: 'mp4',
        engine: 'mori',
        status: 'done',
      })
      expect(getHistory().length).toBe(1)
      clearHistory()
      expect(getHistory()).toEqual([])
    })
  })
})
