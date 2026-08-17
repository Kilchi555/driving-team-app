/**
 * Old WordPress / GSC leftovers: umlaut slugs and trailing junk
 * (") „ ) that never match vercel.json percent-encoding.
 */
export default defineEventHandler((event) => {
  const url = event.node.req.url
  if (!url) return

  const [rawPath, query] = url.split('?')
  if (
    !rawPath ||
    rawPath === '/' ||
    rawPath.startsWith('/api/') ||
    rawPath.startsWith('/_nuxt/') ||
    rawPath.startsWith('/images/')
  ) {
    return
  }

  let path = rawPath
  try {
    path = decodeURIComponent(rawPath)
  } catch {
    path = rawPath
  }

  const cleaned = path
    .replace(/[)\]„“”"'\u201e\u201c\u201d]+\/?$/, '')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')

  if (cleaned === rawPath) return

  const qs = query ? `?${query}` : ''
  return sendRedirect(event, `${cleaned}${qs}`, 301)
})
