/**
 * WhatsApp / Facebook / Slack fetch the shared URL without running JS.
 * The tenant app is SPA, so we return a small OG document for those crawlers.
 * Humans still get the Vue app (their in-app browser uses a normal UA).
 */
import {
  buildTenantOgHtml,
  buildTenantOgTags,
  canonicalUrlForEvent,
  loadTenantOgSource,
  resolveRequestOrigin,
  shouldServeTenantOgStub,
  tenantRefForOg,
} from '~/server/utils/tenant-og'

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  const query = Object.fromEntries(url.searchParams.entries())
  if (
    !shouldServeTenantOgStub({
      method: event.method,
      pathname: url.pathname,
      userAgent: getHeader(event, 'user-agent'),
      query,
    })
  ) {
    return
  }

  const ref = tenantRefForOg(url.pathname, query)
  if (ref?.surface !== 'app') return

  const source = await loadTenantOgSource(ref.slug)
  if (!source) return

  const origin = resolveRequestOrigin(event)
  const tags = buildTenantOgTags(source, {
    origin,
    canonicalUrl: canonicalUrlForEvent(origin, url.pathname, url.search),
  })

  setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400')
  return buildTenantOgHtml(tags)
})
