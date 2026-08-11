/**
 * Canonical trailing-slash URLs (matches sitemap + <link rel="canonical">).
 * Skip APIs, Nuxt assets, and files with extensions.
 */
export default defineEventHandler((event) => {
  const url = event.node.req.url
  if (!url) return

  const [path, query] = url.split('?')
  if (!path || path === '/' || path.endsWith('/')) return

  if (
    path.startsWith('/api/') ||
    path.startsWith('/_nuxt/') ||
    path.startsWith('/images/') ||
    path.includes('.')
  ) {
    return
  }

  const qs = query ? `?${query}` : ''
  return sendRedirect(event, `${path}/${qs}`, 301)
})
