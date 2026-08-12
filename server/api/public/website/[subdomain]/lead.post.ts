// POST /api/public/website/:subdomain/lead — contact / Schnupperform from marketing site
import { createHash } from 'node:crypto'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getClientIP } from '~/server/utils/ip-utils'

const recentByIp = new Map<string, number[]>()

function rateLimit(ip: string, limit = 5, windowMs = 60 * 60 * 1000) {
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

  const body = await readBody(event)
  // Honeypot
  if (String(body?.website || body?.company || '').trim()) {
    return { success: true, message: 'Danke — wir melden uns bei Ihnen.' }
  }

  const firstName = String(body?.first_name || body?.name || '').trim().slice(0, 80)
  const lastName = String(body?.last_name || '').trim().slice(0, 80)
  const email = String(body?.email || '')
    .trim()
    .toLowerCase()
    .slice(0, 160)
  const phone = String(body?.phone || '').trim().slice(0, 40)
  const message = String(body?.message || '').trim().slice(0, 2000)
  const category = String(body?.category || 'contact').trim().slice(0, 60) || 'contact'

  if (!firstName || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Name und gültige E-Mail erforderlich' })
  }

  const ip = getClientIP(event) || 'unknown'
  if (!rateLimit(ip)) {
    throw createError({ statusCode: 429, statusMessage: 'Zu viele Anfragen — bitte später erneut versuchen' })
  }

  const supabase = getSupabaseAdmin()
  const { data: website } = await supabase
    .from('website_tenants')
    .select('id, tenant_id, is_published, subdomain')
    .eq('subdomain', subdomain)
    .maybeSingle()

  if (!website?.tenant_id || !website.is_published) {
    throw createError({ statusCode: 404, statusMessage: 'Website not found' })
  }

  const ipHash = ip && ip !== 'unknown' ? createHash('sha256').update(ip).digest('hex').slice(0, 32) : null

  const { error } = await supabase.from('website_leads').insert({
    tenant_id: website.tenant_id,
    first_name: firstName,
    last_name: lastName || null,
    email,
    phone: phone || null,
    message: message || null,
    category,
    source: `website:${subdomain}`,
    status: 'new',
    ip_hash: ipHash,
  })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true, message: 'Danke — wir melden uns bei Ihnen.' }
})
