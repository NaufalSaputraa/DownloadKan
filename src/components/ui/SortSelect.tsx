import { type ReactNode } from 'react'

export interface SortOption<T extends string = string> {
  id: T
  label: string
  icon?: string
}

interface SortSelectProps<T extends string> {
  options: SortOption<T>[]
  value: T
  onChange: (v: T) => void
  label?: ReactNode
}

export function SortSelect<T extends string>({ options, value, onChange, label }: SortSelectProps<T>) {
  return (
    <div className="inline-flex items-center gap-1.5">
      {label && <span className="font-mono text-[11px] text-ink-faint whitespace-nowrap">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="rounded-xl border border-glass-border bg-glass px-2.5 py-1 font-mono text-[11px] text-ink outline-none hover:bg-glass-2 focus:border-accent cursor-pointer appearance-none pr-6"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 6px center',
        }}
      >
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.icon ? `${opt.icon} ` : ''}{opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
