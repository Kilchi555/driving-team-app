/**
 * Redirects WordPress Multilingual Plugin language prefixes (/en/, /it/, /sq/)
 * to their German equivalents by stripping the prefix.
 * Also handles /wp-content/, /wp-admin/, /wp-*.php patterns.
 * Also strips legacy query parameters (?mobile=1, ?origin=searchch).
 */
export default defineEventHandler((event) => {
  const url = event.node.req.url
  if (!url) return

  // Strip query string for path matching
  const [path, query] = url.split('?')
  const qs = query ? `?${query}` : ''

  // Language prefix redirect: /en/*, /it/*, /sq/* → /*
  const langMatch = path.match(/^\/(en|it|sq)(\/.*)?$/)
  if (langMatch) {
    const rest = langMatch[2] || '/'
    // Avoid infinite loop if target is the same
    if (rest !== path) {
      return sendRedirect(event, rest + qs, 301)
    }
  }

  // WordPress remnants → homepage
  if (
    path.startsWith('/wp-content/') ||
    path.startsWith('/wp-includes/') ||
    path.startsWith('/wp-admin/') ||
    path.startsWith('/wp-json/') ||
    path.match(/^\/wp-[a-z-]+\.php/) ||
    path === '/wp-login.php' ||
    path === '/xmlrpc.php'
  ) {
    return sendRedirect(event, '/', 301)
  }

  // WordPress wildcard patterns that were disallowed in robots.txt
  if (
    path === '/datatables' ||
    path === '/marker-listing/' ||
    path === '/maps/'
  ) {
    return sendRedirect(event, '/', 301)
  }

  // Strip legacy tracking/mobile query parameters that create duplicate URLs
  if (query) {
    const params = new URLSearchParams(query)
    const stripped = ['mobile', 'origin']
    let changed = false
    for (const key of stripped) {
      if (params.has(key)) {
        params.delete(key)
        changed = true
      }
    }
    if (changed) {
      const newQs = params.toString()
      return sendRedirect(event, path + (newQs ? `?${newQs}` : ''), 301)
    }
  }
})
