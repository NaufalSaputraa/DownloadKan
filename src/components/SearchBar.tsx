import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { detectKind } from '../utils/url-detect'
import { Button } from './ui/Button'
import { Chip } from './ui/Chip'

interface Props {
  disabled?: boolean
  onSubmit: (url: string) => void
}

export function SearchBar({ disabled, onSubmit }: Props) {
  const [value, setValue] = useState('')
  const [pasted, setPasted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const detection = detectKind(value)
  const modeLabel =
    detection.kind === 'torrent'
      ? 'torrent · magnet'
      : detection.kind === 'media'
        ? `media · ${detection.platform}`
        : detection.kind === 'search'
          ? 'musik · cari judul'
          : 'tempat tautan…'

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const trimmed = text ? text.trim() : ''
      if (trimmed) {
        setValue(trimmed)
        setPasted(true)
        window.setTimeout(() => setPasted(false), 1400)
        if (!disabled && /^https?:\/\//i.test(trimmed) || /^magnet:\?/i.test(trimmed)) {
          onSubmit(trimmed)
        }
      }
    } catch {
      inputRef.current?.focus()
    }
  }

  return (
    <motion.div
      layout
      className="w-full"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
    >
      <div
        className="glass flex w-full items-center gap-3 rounded-[20px] px-4 py-3 sm:px-5 sm:py-4 border-none outline-none focus-within:outline-none focus-within:ring-0 shadow-none"
        onClick={() => inputRef.current?.focus()}
        role="presentation"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-ink-faint">
          <path d="M11 19a8 8 0 1 0-6.36-3.14L3 19l3.64-.86" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M21 13a8 8 0 0 1-13.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>

        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && value.trim() && !disabled) onSubmit(value.trim())
          }}
          placeholder="Tempel tautan media/magnet atau cari judul lagu/artis…"
          className="search-input min-w-0 flex-1 bg-transparent font-mono text-sm text-ink placeholder:text-ink-faint"
          aria-label="Tautan atau magnet yang mau diunduh"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
        />

        <Chip tone={detection.kind === 'torrent' ? 'accent' : 'neutral'}>{modeLabel}</Chip>

        <button
          type="button"
          onClick={handlePaste}
          className="shrink-0 rounded-full p-2 text-ink-faint transition-colors hover:bg-glass hover:text-ink"
          aria-label={pasted ? 'Tersalin' : 'Tempel dari clipboard'}
          title="Tempel dari clipboard"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="8" y="2" width="8" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" />
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>

        <Button
          disabled={disabled || !value.trim()}
          onClick={() => onSubmit(value.trim())}
          className={disabled ? 'cursor-wait' : ''}
        >
          {disabled ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3a9 9 0 1 0 9 9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              Mencari…
            </>
          ) : (
            'Analisis'
          )}
        </Button>
      </div>
    </motion.div>
  )
}