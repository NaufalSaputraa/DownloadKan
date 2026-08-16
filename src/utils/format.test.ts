import { describe, it, expect } from 'vitest'
import { formatBytes, formatSpeed, formatEta } from './format'

describe('format utility', () => {
  describe('formatBytes', () => {
    it('handles zero or falsy values', () => {
      expect(formatBytes(0)).toBe('0 B')
    })

    it('formats bytes correctly', () => {
      expect(formatBytes(500)).toBe('500 B')
      expect(formatBytes(1024)).toBe('1.0 KB')
      expect(formatBytes(1536)).toBe('1.5 KB')
      expect(formatBytes(1048576)).toBe('1.0 MB')
      expect(formatBytes(10485760)).toBe('10 MB')
      expect(formatBytes(1073741824)).toBe('1.0 GB')
    })
  })

  describe('formatSpeed', () => {
    it('appends /s suffix to formatBytes', () => {
      expect(formatSpeed(1048576)).toBe('1.0 MB/s')
      expect(formatSpeed(0)).toBe('0 B/s')
    })
  })

  describe('formatEta', () => {
    it('handles falsy or infinite values', () => {
      expect(formatEta(0)).toBe('…')
      expect(formatEta(-1000)).toBe('…')
      expect(formatEta(Infinity)).toBe('…')
    })

    it('formats seconds', () => {
      expect(formatEta(45000)).toBe('45s')
    })

    it('formats minutes and seconds', () => {
      expect(formatEta(125000)).toBe('2m 5s')
    })

    it('formats hours and minutes', () => {
      expect(formatEta(3720000)).toBe('1j 2m')
    })
  })
})
