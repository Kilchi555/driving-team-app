/**
 * Collapse www → apex in one hop and normalize trailing slash.
 * Complements vercel.json host redirects; also covers edge/preview hosts.
 */
export default defineEventHandler((event) => {
  const host = (getRequestHeader(event, 'host') || '').split(':')[0].toLowerCase()
  if (host !== 'www.drivingteam.ch') return

  const url = getRequestURL(event)
  let path = url.pathname || '/'
  if (
    path !== '/' &&
    !path.endsWith('/') &&
    !path.startsWith('/api/') &&
    !path.startsWith('/_nuxt/') &&
    !path.includes('.')
  ) {
    path = `${path}/`
  }

  return sendRedirect(event, `https://drivingteam.ch${path}${url.search}`, 301)
})
