import { AnimatePresence, motion } from 'framer-motion'
import type { Toast } from '../../hooks/useToast'

const tagStyles: Record<Toast['kind'], string> = {
  info: 'border-glass-border-soft',
  success: 'border-[oklch(78%_0.13_150/0.4)]',
  error: 'border-[oklch(74%_0.18_25/0.45)]',
}

const tagGlyph: Record<Toast['kind'], string> = {
  info: 'ℹ',
  success: '✓',
  error: '✕',
}

export function Toaster({
  toasts,
  onDismiss,
}: {
  toasts: Toast[]
  onDismiss: (id: number) => void
}) {
  return (
    <div
      className="pointer-events-none fixed right-4 bottom-4 z-[60] flex flex-col gap-2"
      role="status"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => onDismiss(t.id)}
            className={`glass-2 pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-2xl border px-4 py-3 text-left text-sm ${tagStyles[t.kind]}`}
          >
            <span
              aria-hidden="true"
              className={`mt-0.5 text-xs ${t.kind === 'error' ? 'text-[oklch(74%_0.18_25)]' : t.kind === 'success' ? 'text-[oklch(78%_0.13_150)]' : 'text-ink-faint'}`}
            >
              {tagGlyph[t.kind]}
            </span>
            <span className="text-ink">{t.message}</span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  )
}