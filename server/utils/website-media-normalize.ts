/**
 * Server-side image normalize for website slots (logo / hero).
 * Outputs WebP + AVIF at fixed ratios via sharp.
 * Video uploads are validated (mime/size) but not transcoded yet.
 */
import sharp from 'sharp'

export type WebsiteMediaSlot = 'logo' | 'hero'
export type WebsiteVideoSlot = 'hero_video'
export type WebsiteUploadSlot = WebsiteMediaSlot | WebsiteVideoSlot

export type NormalizedWebsiteMedia = {
  slot: WebsiteMediaSlot
  width: number
  height: number
  webp: Buffer
  avif: Buffer
  primaryExt: 'webp'
  primaryMime: 'image/webp'
  primary: Buffer
  avifMime: 'image/avif'
}

export type AcceptedWebsiteVideo = {
  slot: WebsiteVideoSlot
  buffer: Buffer
  mime: 'video/mp4' | 'video/webm'
  ext: 'mp4' | 'webm'
  bytes: number
}

const PRESETS: Record<
  WebsiteMediaSlot,
  { width: number; height: number; fit: keyof sharp.FitEnum; maxWebpBytes: number }
> = {
  logo: { width: 400, height: 400, fit: 'contain', maxWebpBytes: 120_000 },
  hero: { width: 1600, height: 900, fit: 'cover', maxWebpBytes: 420_000 },
}

const ALLOWED_INPUT = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/avif',
])

/** Hero video: no server transcode yet — hard size cap instead. */
export const WEBSITE_HERO_VIDEO_MAX_BYTES = 40 * 1024 * 1024

export function isWebsiteImageSlot(slot: string): slot is WebsiteMediaSlot {
  return slot === 'logo' || slot === 'hero'
}

export function isWebsiteVideoSlot(slot: string): slot is WebsiteVideoSlot {
  return slot === 'hero_video'
}

export function isAllowedWebsiteMediaMime(mime: string | undefined | null): boolean {
  if (!mime) return false
  return ALLOWED_INPUT.has(mime.toLowerCase())
}

function sniffVideoKind(buf: Buffer): 'mp4' | 'webm' | null {
  if (buf.length < 12) return null
  // WebM / EBML
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return 'webm'
  // ISO BMFF (mp4/mov) — ftyp at offset 4
  if (buf.toString('ascii', 4, 8) === 'ftyp') return 'mp4'
  return null
}

/**
 * Accept MP4/WebM as-is (Stage 1: no ffmpeg). Resolution is client/hint only.
 */
export function acceptWebsiteVideo(
  input: Buffer,
  mimeHint?: string | null,
  filenameHint?: string | null,
): AcceptedWebsiteVideo {
  if (!input?.length) {
    throw Object.assign(new Error('Leere Videodatei'), { statusCode: 400 })
  }
  if (input.length > WEBSITE_HERO_VIDEO_MAX_BYTES) {
    throw Object.assign(
      new Error(`Video zu gross (max ${WEBSITE_HERO_VIDEO_MAX_BYTES / 1024 / 1024}MB)`),
      { statusCode: 413 },
    )
  }

  const sniffed = sniffVideoKind(input)
  const mime = (mimeHint || '').toLowerCase()
  const name = (filenameHint || '').toLowerCase()

  let kind: 'mp4' | 'webm' | null = sniffed
  if (!kind && mime === 'video/webm') kind = 'webm'
  if (!kind && (mime === 'video/mp4' || mime === 'video/quicktime')) kind = 'mp4'
  if (!kind && name.endsWith('.webm')) kind = 'webm'
  if (!kind && (name.endsWith('.mp4') || name.endsWith('.m4v'))) kind = 'mp4'

  if (!kind) {
    throw Object.assign(new Error('Nur MP4 oder WebM erlaubt'), { statusCode: 400 })
  }

  return {
    slot: 'hero_video',
    buffer: input,
    mime: kind === 'webm' ? 'video/webm' : 'video/mp4',
    ext: kind,
    bytes: input.length,
  }
}

async function encodeWebpUnderBudget(
  pipeline: sharp.Sharp,
  maxBytes: number,
): Promise<Buffer> {
  let quality = 82
  let buf = await pipeline.clone().webp({ quality, effort: 4 }).toBuffer()
  while (buf.length > maxBytes && quality > 40) {
    quality -= 8
    buf = await pipeline.clone().webp({ quality, effort: 4 }).toBuffer()
  }
  return buf
}

export async function normalizeWebsiteMedia(
  input: Buffer,
  slot: WebsiteMediaSlot,
): Promise<NormalizedWebsiteMedia> {
  const preset = PRESETS[slot]
  if (!preset) {
    throw Object.assign(new Error(`Unknown media slot: ${slot}`), { statusCode: 400 })
  }

  const base = sharp(input, { animated: false, failOn: 'none' }).rotate()

  const resized =
    slot === 'logo'
      ? base.resize(preset.width, preset.height, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        })
      : base.resize(preset.width, preset.height, {
          fit: 'cover',
          position: 'centre',
        })

  const webp = await encodeWebpUnderBudget(resized, preset.maxWebpBytes)
  let avif: Buffer
  try {
    avif = await resized
      .clone()
      .avif({ quality: slot === 'hero' ? 55 : 60, effort: 4 })
      .toBuffer()
  } catch {
    // AVIF optional fallback — duplicate webp bytes so callers always get a buffer
    avif = webp
  }

  return {
    slot,
    width: preset.width,
    height: preset.height,
    webp,
    avif,
    primaryExt: 'webp',
    primaryMime: 'image/webp',
    primary: webp,
    avifMime: 'image/avif',
  }
}
