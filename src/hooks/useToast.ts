import { useCallback, useRef, useState } from 'react'

export interface Toast {
  id: number
  message: string
  kind: 'info' | 'error' | 'success'
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (message: string, kind: Toast['kind'] = 'info') => {
      const id = ++nextId.current
      setToasts((prev) => [...prev, { id, message, kind }])
      window.setTimeout(() => dismiss(id), kind === 'error' ? 6000 : 3500)
    },
    [dismiss],
  )

  return { toasts, push, dismiss }
}