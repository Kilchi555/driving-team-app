/**
 * Redirects WordPress Multilingual Plugin language prefixes (/en/, /it/, /sq/)
 * to their German equivalents by stripping the prefix.
 * Also handles /wp-content/, /wp-admin/, /wp-*.php patterns.
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
})
