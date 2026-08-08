import type { ReactNode } from 'react'

export function Chip({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'accent'
}) {
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide ' +
        (tone === 'accent'
          ? 'bg-accent-soft text-accent'
          : 'bg-glass-2 text-ink-muted border border-glass-border-soft')
      }
    >
      {children}
    </span>
  )
}