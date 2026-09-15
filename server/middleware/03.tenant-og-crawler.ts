/**
 * WhatsApp / Facebook / Slack fetch the shared URL without running JS.
 * The tenant app is SPA, so we return a small OG document for those crawlers.
 * Humans still get the Vue app (their in-app browser uses a normal UA).
 *
 * Cache: this document is UA-dependent on the exact same URL as the SPA.
 * It must not be stored in a shared CDN. Do not send public cache headers here.
 */
import { defineEventHandler, getHeader, getRequestURL, setHeader } from 'h3'
import {
  buildTenantOgHtml,
  buildTenantOgTags,
  canonicalUrlForEvent,
  loadTenantOgSource,
  resolveRequestOrigin,
  shouldServeTenantOgStub,
  tenantOgCrawlerStubHeaders,
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

  for (const [name, value] of Object.entries(tenantOgCrawlerStubHeaders())) {
    setHeader(event, name, value)
  }
  return buildTenantOgHtml(tags)
})
