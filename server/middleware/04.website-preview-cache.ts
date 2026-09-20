/**
 * Preview responses must never enter a shared/public cache.
 * Authorization is the token gate; these headers are an extra layer.
 */
export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  if (!url.searchParams.get('preview')) return
  const path = url.pathname
  if (!path.startsWith('/s/') && !path.startsWith('/api/public/website/')) return
  setHeader(event, 'Cache-Control', 'private, no-store')
  setHeader(event, 'CDN-Cache-Control', 'private, no-store')
  setHeader(event, 'Vercel-CDN-Cache-Control', 'private, no-store')
})
