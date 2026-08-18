/**
 * Public image resize proxy for tenant landing pages.
 * Only allowlisted HTTPS hosts. Long CDN cache — LCP-critical.
 */
import sharp from 'sharp'

const ALLOWED_HOST_RE = [
  /\.supabase\.co$/i,
  /\.supabase\.in$/i,
  /(^|\.)unsplash\.com$/i,
  /(^|\.)imgix\.net$/i,
]

const MAX_UPSTREAM_BYTES = 8 * 1024 * 1024
const WIDTHS = new Set([400, 640, 800, 960, 1280, 1600])

function hostAllowed(hostname: string): boolean {
  const host = hostname.toLowerCase()
  return ALLOWED_HOST_RE.some((re) => re.test(host))
}

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) {
    const [a, b] = h.split('.').map(Number)
    if (a === 10 || a === 127 || a === 0) return true
    if (a === 192 && b === 168) return true
    if (a === 172 && b >= 16 && b <= 31) return true
  }
  return false
}

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const raw = String(q.u || q.url || '').trim()
  const width = Number(q.w || 960)
  const format = String(q.fm || 'webp').toLowerCase() === 'avif' ? 'avif' : 'webp'

  if (!raw) {
    throw createError({ statusCode: 400, statusMessage: 'u required' })
  }
  if (!WIDTHS.has(width)) {
    throw createError({ statusCode: 400, statusMessage: 'unsupported width' })
  }

  let target: URL
  try {
    target = new URL(raw)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'invalid url' })
  }

  if (target.protocol !== 'https:') {
    throw createError({ statusCode: 400, statusMessage: 'https only' })
  }
  if (isPrivateHost(target.hostname) || !hostAllowed(target.hostname)) {
    throw createError({ statusCode: 403, statusMessage: 'host not allowed' })
  }

  let upstream: Response
  try {
    upstream = await fetch(target.toString(), {
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'image/avif,image/webp,image/*' },
    })
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'image fetch failed' })
  }

  if (!upstream.ok) {
    throw createError({ statusCode: 502, statusMessage: `upstream ${upstream.status}` })
  }

  const len = Number(upstream.headers.get('content-length') || 0)
  if (len > MAX_UPSTREAM_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'image too large' })
  }

  const buf = Buffer.from(await upstream.arrayBuffer())
  if (buf.length > MAX_UPSTREAM_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'image too large' })
  }

  const fit = String(q.fit || 'cover') === 'inside' ? 'inside' : 'cover'
  const pipeline = sharp(buf, { failOn: 'none', animated: false }).rotate().resize({
    width,
    height: fit === 'cover' ? Math.round((width * 9) / 16) : undefined,
    fit,
    position: 'centre',
    withoutEnlargement: true,
  })

  const out =
    format === 'avif'
      ? await pipeline.avif({ quality: 52, effort: 4 }).toBuffer()
      : await pipeline.webp({ quality: 74, effort: 4 }).toBuffer()

  setHeader(event, 'Content-Type', format === 'avif' ? 'image/avif' : 'image/webp')
  setHeader(event, 'Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400')
  setHeader(event, 'CDN-Cache-Control', 'public, s-maxage=604800')
  return out
})
