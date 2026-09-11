/**
 * User-agents used only to generate link previews (WhatsApp, iMessage, Slack, …).
 * Do not include generic Googlebot — serving a stub document would affect indexing.
 */
const LINK_PREVIEW_CRAWLER_RE =
  /facebookexternalhit|facebot|whatsapp|twitterbot|linkedinbot|slackbot|telegrambot|discordbot|pinterest|iframely|embedly|skypeuripreview|vkshare/i

export function isLinkPreviewCrawler(userAgent?: string | null): boolean {
  if (!userAgent) return false
  const ua = userAgent
  // WhatsApp/Facebook in-app browsers include Mozilla + the brand token.
  // The preview scraper is typically `WhatsApp/2.x` or `facebookexternalhit/1.1` alone.
  if (/WhatsApp/i.test(ua) && /Mozilla/i.test(ua)) return false
  if (/\bFBAN\b|\bFBAV\b/i.test(ua) && !/facebookexternalhit/i.test(ua)) return false
  return LINK_PREVIEW_CRAWLER_RE.test(ua)
}

export function isSkippedTenantOgPath(pathname: string): boolean {
  const path = (pathname.split('?')[0] || '/').toLowerCase()
  if (
    path.startsWith('/api/') ||
    path.startsWith('/_nuxt') ||
    path.startsWith('/__nuxt') ||
    path.startsWith('/_vercel') ||
    path.startsWith('/.well-known') ||
    path.startsWith('/favicon') ||
    path.startsWith('/simy-')
  ) {
    return true
  }
  // Static file (logo.png, entry.js) — not a tenant page
  const last = path.split('/').pop() || ''
  return /\.[a-z0-9]{2,5}$/.test(last)
}
