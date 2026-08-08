export interface MediaDownload {
  type: string
  url: string
  size?: number
}

export interface MediaResult {
  title: string
  thumbnail: string | null
  platform: string
  sourceUrl: string
  downloads: MediaDownload[]
  engine: string
}

export interface MediaEngine {
  id: string
  name: string
  supports(url: string): boolean
  fetch(url: string, opts: EngineOptions): Promise<MediaResult>
}

export interface EngineOptions {
  jerexdKey: string
}

export class MediaError extends Error {
  engine: string
  constructor(engine: string, message: string) {
    super(message)
    this.name = 'MediaError'
    this.engine = engine
  }
}