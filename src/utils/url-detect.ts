export type MediaPlatform =
  | 'tiktok'
  | 'instagram'
  | 'youtube'
  | 'twitter'
  | 'facebook'
  | 'spotify'
  | 'applemusic'
  | 'pinterest'
  | 'threads'
  | 'soundcloud'
  | 'pixiv'
  | 'bandcamp'
  | 'deezer'
  | 'douyin'
  | 'rednote'
  | 'bilibili'
  | 'unknown'

export type DetectKind = 'media' | 'torrent' | 'search' | 'unknown'

export interface DetectResult {
  kind: DetectKind
  platform: MediaPlatform
  /** magnet atau infohash mentah untuk torrent */
  torrentId?: string
  url: string
}

const MAGNET_RE = /^magnet:\?xt=urn:btih:([a-fA-F0-9]{40})/i
const INFOHASH_RE = /^[a-fA-F0-9]{40}$/

const PLATFORM_RULES: Array<[MediaPlatform, RegExp]> = [
  ['tiktok', /(?:^|[/.])tiktok\.com|vm\.tiktok\.com/i],
  ['douyin', /douyin\.com|iesdouyin\.com/i],
  ['instagram', /instagram\.com|instagr\.am/i],
  ['youtube', /youtube\.com|youtu\.be|music\.youtube\.com/i],
  ['twitter', /(?:^|[/.])x\.com|twitter\.com/i],
  ['facebook', /facebook\.com|fb\.watch|fb\.com/i],
  ['threads', /threads\.net/i],
  ['spotify', /open\.spotify\.com|spotify\.link/i],
  ['applemusic', /music\.apple\.com/i],
  ['soundcloud', /soundcloud\.com/i],
  ['pinterest', /pinterest\.com|pin\.it/i],
  ['pixiv', /pixiv\.net/i],
  ['bandcamp', /bandcamp\.com/i],
  ['deezer', /deezer\.com|deezer\.page\.link/i],
  ['rednote', /xhslink\.com|xiaohongshu\.com/i],
  ['bilibili', /bilibili\.com|b23\.tv/i],
]

/** Bersihkan parameter pelacakan umum (utm, fbclid, dsb.) dari URL. */
export function stripTracking(url: string): string {
  try {
    const u = new URL(url)
    for (const key of [...u.searchParams.keys()]) {
      if (/(^|_)utm_|fbclid|igshid|spm|^si$|^s$|^t$/i.test(key) || key === 'feature') {
        u.searchParams.delete(key)
      }
    }
    return u.toString()
  } catch {
    return url
  }
}

/** Deteksi platform media dari URL hostname. */
export function detectPlatform(url: string): MediaPlatform {
  for (const [platform, re] of PLATFORM_RULES) {
    if (re.test(url)) return platform
  }
  return 'unknown'
}

export function detectKind(input: string): DetectResult {
  const raw = input.trim()

  if (MAGNET_RE.test(raw) || INFOHASH_RE.test(raw)) {
    const id = MAGNET_RE.exec(raw)?.[1] ?? raw.toLowerCase()
    return { kind: 'torrent', platform: 'unknown', torrentId: id, url: raw }
  }

  if (/^https?:\/\//i.test(raw)) {
    const clean = stripTracking(raw)
    return { kind: 'media', platform: detectPlatform(clean), url: clean }
  }

  if (raw.length > 0) {
    return { kind: 'search', platform: 'deezer', url: raw }
  }

  return { kind: 'unknown', platform: 'unknown', url: raw }
}

export function isPlaylistUrl(url: string): boolean {
  return /[?&]list=[a-zA-Z0-9_-]+|\/playlist|\/album\//i.test(url)
}

/** Benarkah URL ini punya peluang didukung salah satu engine media? */
export function isSupportedPlatform(platform: MediaPlatform): boolean {
  return platform !== 'unknown'
}