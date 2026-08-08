import { useCallback, useEffect, useState } from 'react'
import { getSettings, saveSettings, type Settings } from '../lib/storage'

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => getSettings())

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'dk.settings') setSettings(getSettings())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const update = useCallback((patch: Partial<Settings>) => {
    const next = saveSettings(patch)
    setSettings(next)
  }, [])

  return { settings, update }
}