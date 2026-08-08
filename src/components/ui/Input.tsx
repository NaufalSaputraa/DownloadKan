import type { InputHTMLAttributes } from 'react'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={
        'w-full bg-transparent text-ink placeholder:text-ink-faint outline-none font-mono text-sm ' +
        (props.className ?? '')
      }
    />
  )
}