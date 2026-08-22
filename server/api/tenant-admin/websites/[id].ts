import { applyWebsiteEditorExtras } from '~/server/utils/website-apply-editor-extras'
import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { newWizardId } from '~/utils/website-wizard-content'

type CmsPrice = { label: string; value: string; note: string }
type CmsStaff = {
  first_name: string
  last_name: string
  email: string
  phone: string
  languages: string
  create_login: boolean
}

function parseChf(raw: string): number | null {
  const n = Number(String(raw || '').replace(/[^\d.,]/g, '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

function priceLabel(value: string, chf: number | null) {
  const raw = String(value || '').trim()
  if (raw) return /chf|fr\.?/i.test(raw) ? raw : `CHF ${raw}`
  if (chf != null) return `CHF ${chf}`
  return null
}

function pricesFromLanding(landing: any): CmsPrice[] {
  const services = landing?.blocks?.find((b: any) => b?.type === 'services')?.content?.services
  if (!Array.isArray(services)) return []
  return services
    .map((s: any) => ({
      label: String(s.name || '').trim(),
      value: String(s.price_label || (s.price_cents ? `CHF ${Math.round(Number(s.price_cents) / 100)}` : '')).trim(),
      note: String(s.description || '').trim(),
    }))
    .filter((p: CmsPrice) => p.label)
}

function staffFromLanding(landing: any): CmsStaff[] {
  const team = Array.isArray(landing?.brand?.website_team)
    ? landing.brand.website_team
    : landing?.blocks?.find((b: any) => b?.type === 'team')?.content?.members || []
  return (team || [])
    .filter((m: any) => m?.visible !== false && String(m?.name || '').trim())
    .map((m: any) => {
      const parts = String(m.name || '').trim().split(/\s+/)
      return {
        first_name: parts[0] || '',
        last_name: parts.slice(1).join(' '),
        email: String(m.email || '').trim(),
        phone: String(m.phone || '').trim(),
        languages: Array.isArray(m.languages) ? m.languages.join(', ') : String(m.role_label || '').trim(),
        create_login: false,
      }
    })
}

function applyCmsPrices(landing: any, prices: CmsPrice[]) {
  const named = prices.filter((p) => p.label.trim())
  const matched = new Set<string>()
  const services = landing?.blocks?.find((b: any) => b?.type === 'services')?.content?.services
  if (Array.isArray(services)) {
    for (const svc of services) {
      if (String(svc?.id || '').startsWith('extra-')) continue
      const match = named.find((p) => p.label.toLowerCase() === String(svc.name || '').trim().toLowerCase())
      if (!match) {
        svc.price_label = null
        svc.price_cents = null
        continue
      }
      matched.add(match.label.toLowerCase())
      const chf = parseChf(match.value)
      svc.price_cents = chf != null ? Math.round(chf * 100) : null
      svc.price_label = priceLabel(match.value, chf)
      if (match.note) svc.description = match.note
    }
  }
  const extras = named
    .filter((p) => !matched.has(p.label.toLowerCase()))
    .map((p, i) => ({
      id: `extra-${i + 1}`,
      name: p.label,
      description: p.note,
      price_chf: parseChf(p.value),
    }))
  const next = applyWebsiteEditorExtras(landing, { extraServices: extras })
  const all = next.blocks.find((b) => b.type === 'services')?.content?.services
  if (Array.isArray(all)) {
    for (const svc of all) {
      if (!String(svc?.id || '').startsWith('extra-')) continue
      const match = named.find((p) => p.label.toLowerCase() === String(svc.name || '').trim().toLowerCase())
      if (!match) continue
      svc.price_label = priceLabel(match.value, parseChf(match.value))
    }
  }
  return next
}

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const tenantId = getRouterParam(event, 'id')
  if (!tenantId) throw createError({ statusCode: 400, statusMessage: 'tenant id required' })

  const supabase = getSupabaseAdmin()
  const method = getMethod(event)

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .maybeSingle()
  if (tenantError) throw createError({ statusCode: 500, statusMessage: tenantError.message })
  if (!tenant) throw createError({ statusCode: 404, statusMessage: 'Tenant nicht gefunden' })

  const { data: website } = await supabase
    .from('website_tenants')
    .select('id, subdomain, addon_pages_enabled, primary_color, secondary_color')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  let home: any = null
  if (website?.id) {
    const { data } = await supabase
      .from('website_pages')
      .select('id, blocks')
      .eq('website_id', website.id)
      .eq('is_home', true)
      .maybeSingle()
    home = data
  }

  if (method === 'GET') {
    return {
      success: true,
      tenant,
      website,
      prices: pricesFromLanding(home?.blocks),
      staff: staffFromLanding(home?.blocks),
    }
  }

  if (method !== 'PATCH') {
    throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
  }

  const body = (await readBody(event)) || {}
  const now = new Date().toISOString()
  const tenantPatch: Record<string, unknown> = { updated_at: now }
  for (const key of [
    'name',
    'slug',
    'contact_email',
    'contact_phone',
    'address',
    'website_domain',
    'description',
    'primary_color',
    'secondary_color',
    'website_notes',
  ]) {
    if (body[key] !== undefined) tenantPatch[key] = body[key]
  }

  const { data: updatedTenant, error: updateError } = await supabase
    .from('tenants')
    .update(tenantPatch)
    .eq('id', tenantId)
    .select('*')
    .single()
  if (updateError) throw createError({ statusCode: 500, statusMessage: updateError.message })

  if (website?.id && (body.primary_color || body.secondary_color)) {
    await supabase
      .from('website_tenants')
      .update({
        primary_color: body.primary_color || website.primary_color,
        secondary_color: body.secondary_color || website.secondary_color,
        updated_at: now,
      })
      .eq('id', website.id)
  }

  const prices: CmsPrice[] = Array.isArray(body.prices)
    ? body.prices.map((p: any) => ({
        label: String(p?.label || '').trim(),
        value: String(p?.value || '').trim(),
        note: String(p?.note || '').trim(),
      }))
    : []
  const staff: CmsStaff[] = Array.isArray(body.staff)
    ? body.staff.map((s: any) => ({
        first_name: String(s?.first_name || '').trim(),
        last_name: String(s?.last_name || '').trim(),
        email: String(s?.email || '').trim(),
        phone: String(s?.phone || '').trim(),
        languages: String(s?.languages || '').trim(),
        create_login: false,
      }))
    : []

  if (home?.id && home.blocks) {
    let landing = applyCmsPrices(home.blocks, prices)
    landing = applyWebsiteEditorExtras(landing, {
      teamMembers: staff
        .filter((s) => s.first_name || s.last_name)
        .map((s) => ({
          id: newWizardId('team'),
          source: 'custom' as const,
          name: [s.first_name, s.last_name].filter(Boolean).join(' '),
          role_label: s.languages || 'Team',
          visible: true,
        })),
    })
    if (landing.brand) {
      if (body.name) landing.brand.name = String(body.name)
      if (body.primary_color) landing.brand.primary = String(body.primary_color)
      if (body.secondary_color) landing.brand.secondary = String(body.secondary_color)
    }
    const { error: pageError } = await supabase
      .from('website_pages')
      .update({ blocks: landing, updated_at: now })
      .eq('id', home.id)
    if (pageError) throw createError({ statusCode: 500, statusMessage: pageError.message })
  }

  return {
    success: true,
    tenant: updatedTenant,
    prices,
    staff,
  }
})
