import { useState, useEffect, useCallback } from 'react'
import { checkLocalHealth, type BackendHealth, startLocalDownload } from '../lib/api-local'

export interface DownloadJob {
  id: string
  url: string
  format: string
  status: 'starting' | 'downloading' | 'done' | 'failed'
  progress: number
  speed: string
  eta: string
  filename: string
  error?: string
}

export function useLocalBackend() {
  const [health, setHealth] = useState<BackendHealth | null>(null)
  const [isLocal, setIsLocal] = useState(false)
  const [jobs, setJobs] = useState<Record<string, DownloadJob>>({})

  useEffect(() => {
    let mounted = true
    const check = async () => {
      const h = await checkLocalHealth()
      if (mounted) {
        setHealth(h)
        setIsLocal(h !== null)
      }
    }
    check()
    const interval = setInterval(check, 10000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (!isLocal) return

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.port === '8000' ? window.location.host : '127.0.0.1:8000'
    const ws = new WebSocket(`${wsProtocol}//${host}/api/ws`)

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'initial_state' && data.jobs) {
          setJobs(data.jobs)
        } else if (data.type === 'job_update' && data.job) {
          setJobs((prev) => ({
            ...prev,
            [data.job.id]: data.job,
          }))
        }
      } catch {
        /* noop */
      }
    }

    return () => {
      ws.close()
    }
  }, [isLocal])

  const download = useCallback(
    async (
      url: string,
      format: string = 'best',
      category: 'Videos' | 'Music' | 'Torrents' = 'Videos',
      filename?: string,
      options?: {
        start_time?: string
        end_time?: string
        subtitles?: boolean
        sub_lang?: string
      },
    ) => {
      return startLocalDownload({
        url,
        format,
        category,
        title: filename,
        start_time: options?.start_time,
        end_time: options?.end_time,
        subtitles: options?.subtitles,
        sub_lang: options?.sub_lang,
      })
    },
    [],
  )

  return {
    health,
    isLocal,
    jobs: Object.values(jobs),
    download,
  }
}
