// GET /api/public/tenant/[slug]/og.png — 1200×630 WhatsApp / OG card

import { normalizePublicTenantSlug } from '~/utils/public-paths'
import { buildTenantOgCardInput, loadTenantOgSource } from '~/server/utils/tenant-og'
import { renderWebsiteOgCard } from '~/server/utils/website-og-card'

export default defineEventHandler(async (event) => {
  const slug = normalizePublicTenantSlug(getRouterParam(event, 'slug'))
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'slug required' })
  }

  const source = await loadTenantOgSource(slug)
  if (!source) {
    throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })
  }

  const png = await renderWebsiteOgCard(buildTenantOgCardInput(source))
  setHeader(event, 'Content-Type', 'image/png')
  setHeader(event, 'Cache-Control', 'public, max-age=3600, s-maxage=86400')
  return png
})
