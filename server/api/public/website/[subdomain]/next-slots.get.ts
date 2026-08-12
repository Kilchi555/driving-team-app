// GET /api/public/website/:subdomain/next-slots
// Light teaser slots for marketing landing (cached ~2 min)
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { loadWebsiteTeaserSlots } from '~/server/utils/website-next-slots'
import { setWebsitePublicCache } from '~/server/utils/website-public-cache'

function appBaseUrl(event: any) {
  const fromEnv = process.env.NUXT_PUBLIC_APP_URL || process.env.NUXT_PUBLIC_BASE_URL || process.env.APP_BASE_URL
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  const host = getRequestHeader(event, 'x-forwarded-host') || getRequestHeader(event, 'host')
  const proto = getRequestHeader(event, 'x-forwarded-proto') || 'https'
  return host ? `${proto}://${String(host).split(',')[0]}` : 'https://app.simy.ch'
}

export default defineEventHandler(async (event) => {
  const subdomain = getRouterParam(event, 'subdomain')?.trim().toLowerCase()
  if (!subdomain) {
    throw createError({ statusCode: 400, statusMessage: 'subdomain required' })
  }

  const preview = String(getQuery(event).preview || '') === '1'
  const supabase = getSupabaseAdmin()

  const { data: website } = await supabase
    .from('website_tenants')
    .select('id, tenant_id, subdomain, is_published')
    .eq('subdomain', subdomain)
    .maybeSingle()

  if (!website || (!website.is_published && !preview)) {
    throw createError({ statusCode: 404, statusMessage: 'Website not found' })
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, slug, minimum_booking_lead_time_hours')
    .eq('id', website.tenant_id)
    .maybeSingle()

  if (!tenant) {
    throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })
  }

  const slug = tenant.slug || website.subdomain
  const bookingUrl = `${appBaseUrl(event)}/booking/availability/${encodeURIComponent(slug)}`

  const slots = await loadWebsiteTeaserSlots(supabase, {
    tenantId: tenant.id,
    bookingUrl,
    leadTimeHours: tenant.minimum_booking_lead_time_hours,
  })

  // CDN/shared cache ~2 min; browsers should revalidate (soft-refresh teaser)
  setWebsitePublicCache(event, {
    preview,
    sMaxAge: 60,
    swr: 300,
    tag: `website-slots-${subdomain}`,
  })

  return {
    slots,
    booking_url: bookingUrl,
    cached_hint_seconds: 60,
  }
})
