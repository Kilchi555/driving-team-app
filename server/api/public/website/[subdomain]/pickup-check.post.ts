// POST /api/public/website/:subdomain/pickup-check — is this Swiss PLZ in the pickup radius?
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getClientIP } from '~/server/utils/ip-utils'
import { loadWebsitePickupOffer, swissPlzFromValue } from '~/server/utils/website-pickup'
import { checkWebsitePickupPlz } from '~/server/utils/website-pickup-plz'

const recentByIp = new Map<string, number[]>()

function rateLimit(ip: string, limit = 30, windowMs = 60 * 60 * 1000) {
  const now = Date.now()
  const hits = (recentByIp.get(ip) || []).filter((t) => now - t < windowMs)
  if (hits.length >= limit) return false
  hits.push(now)
  recentByIp.set(ip, hits)
  return true
}

export default defineEventHandler(async (event) => {
  const subdomain = getRouterParam(event, 'subdomain')?.trim().toLowerCase()
  if (!subdomain) {
    throw createError({ statusCode: 400, statusMessage: 'subdomain required' })
  }

  const preview = String(getQuery(event).preview || '') === '1'
  const body = await readBody(event)
  const plz = swissPlzFromValue(body?.plz)
  if (!plz) {
    throw createError({ statusCode: 400, statusMessage: 'Bitte eine gültige Schweizer PLZ (4 Ziffern) eingeben.' })
  }

  const ip = getClientIP(event) || 'unknown'
  if (!rateLimit(ip)) {
    throw createError({ statusCode: 429, statusMessage: 'Zu viele Prüfungen — bitte später erneut versuchen.' })
  }

  const supabase = getSupabaseAdmin()
  const { data: website } = await supabase
    .from('website_tenants')
    .select('id, tenant_id, is_published, subdomain')
    .eq('subdomain', subdomain)
    .maybeSingle()

  if (!website?.tenant_id || (!website.is_published && !preview)) {
    throw createError({ statusCode: 404, statusMessage: 'Website not found' })
  }

  const offer = await loadWebsitePickupOffer(supabase, website.tenant_id)
  if (!offer.enabled) {
    throw createError({ statusCode: 404, statusMessage: 'Kein Treffpunkt-Radius hinterlegt.' })
  }

  const result = await checkWebsitePickupPlz(supabase, website.tenant_id, offer, plz)
  return {
    success: true,
    ...result,
  }
})
