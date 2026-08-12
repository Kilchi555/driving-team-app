/**
 * CDN / shared-cache headers for public tenant website APIs.
 * Preview must never be cached. Browsers revalidate (max-age=0); edge keeps s-maxage.
 */
export function setWebsitePublicCache(
  event: any,
  opts: {
    preview?: boolean
    /** Edge TTL in seconds (default 120) */
    sMaxAge?: number
    /** stale-while-revalidate in seconds (default 600) */
    swr?: number
    /** Optional Cache-Tag for future purge-on-publish */
    tag?: string
  } = {},
) {
  if (opts.preview) {
    setHeader(event, 'Cache-Control', 'private, no-store')
    return
  }

  const sMaxAge = opts.sMaxAge ?? 120
  const swr = opts.swr ?? 600
  setHeader(
    event,
    'Cache-Control',
    `public, max-age=0, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`,
  )
  setHeader(event, 'Vary', 'Accept-Encoding')
  if (opts.tag) {
    setHeader(event, 'Cache-Tag', opts.tag)
  }
}
