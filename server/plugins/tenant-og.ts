/**
 * Rewrite OG tags in rendered HTML for tenant app URLs.
 * Covers unknown crawlers and "View Source" on SPA fallback documents.
 * `/s/**` websites already SSR their own page-level SEO — leave those alone.
 */
import {
  applyTenantOgToHeadChunks,
  buildTenantOgTags,
  canonicalUrlForEvent,
  loadTenantOgSource,
  resolveRequestOrigin,
  tenantRefForOg,
} from '~/server/utils/tenant-og'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', async (html, { event }) => {
    try {
      const url = getRequestURL(event)
      const query = Object.fromEntries(url.searchParams.entries())
      const ref = tenantRefForOg(url.pathname, query)
      if (ref?.surface !== 'app') return

      const source = await loadTenantOgSource(ref.slug)
      if (!source) return

      const origin = resolveRequestOrigin(event)
      const tags = buildTenantOgTags(source, {
        origin,
        canonicalUrl: canonicalUrlForEvent(origin, url.pathname, url.search),
      })
      html.head = applyTenantOgToHeadChunks(html.head || [], tags)
    } catch {
      /* never break page render */
    }
  })
})
