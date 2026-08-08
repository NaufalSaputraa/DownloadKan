import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'ghost' | 'outline'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 select-none disabled:cursor-not-allowed disabled:opacity-45'

const variants: Record<Variant, string> = {
  primary:
    'bg-ink text-paper hover:bg-[oklch(86%_0.008_260)] active:translate-y-px px-5 py-2.5',
  outline:
    'border border-glass-border-soft text-ink-muted hover:border-glass-border hover:text-ink px-5 py-2.5',
  ghost: 'text-ink-muted hover:text-ink hover:bg-glass-2 px-3.5 py-2',
}

export function Button({ variant = 'primary', className = '', children, ...rest }: Props) {
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  )
}