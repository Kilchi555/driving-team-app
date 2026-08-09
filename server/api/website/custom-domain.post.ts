// POST /api/website/custom-domain — attach a customer domain to the landing page
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  dnsInstructions,
  isValidHostname,
  normalizeHostname,
  vercelAddDomain,
} from '~/server/utils/custom-domain'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody(event)
  const domain = normalizeHostname(String(body?.domain || ''))

  if (!isValidHostname(domain)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Ungültige Domain. Beispiel: www.meine-firma.ch',
    })
  }

  const supabase = getSupabaseAdmin()
  const { data: user } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!user?.tenant_id) throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })

  // Ensure website row exists
  let { data: website } = await supabase
    .from('website_tenants')
    .select('*')
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  if (!website) {
    const { data: tenant } = await supabase.from('tenants').select('slug, name, primary_color, secondary_color, accent_color, logo_url').eq('id', user.tenant_id).single()
    const { slugifySubdomain } = await import('~/server/utils/website-landing-builder')
    const subdomain = slugifySubdomain(tenant?.slug || tenant?.name || user.tenant_id.slice(0, 8)) || user.tenant_id.slice(0, 8)
    const { data: created, error: createErr } = await supabase
      .from('website_tenants')
      .insert({
        tenant_id: user.tenant_id,
        subdomain,
        primary_color: tenant?.primary_color || '#0F766E',
        secondary_color: tenant?.secondary_color || '#134E4A',
        accent_color: tenant?.accent_color || '#F59E0B',
        logo_url: tenant?.logo_url || null,
      })
      .select('*')
      .single()
    if (createErr || !created) {
      throw createError({ statusCode: 500, statusMessage: createErr?.message || 'Website init failed' })
    }
    website = created
    await supabase.from('website_pages').insert({
      website_id: website.id,
      title: 'Home',
      slug: 'index',
      is_home: true,
      page_type: 'home',
      blocks: [],
    })
  }

  const { data: taken } = await supabase
    .from('website_tenants')
    .select('id, tenant_id')
    .eq('custom_domain', domain)
    .neq('id', website.id)
    .maybeSingle()

  if (taken) {
    throw createError({ statusCode: 409, statusMessage: 'Diese Domain ist bereits einem anderen Konto zugeordnet' })
  }

  let verification: any = null
  let status = 'dns_pending'
  let verified = false

  try {
    const added = await vercelAddDomain(domain)
    if (added.configured && added.data) {
      verification = {
        vercel: {
          verified: !!added.data.verified,
          verification: added.data.verification || null,
          alreadyExists: !!added.alreadyExists,
        },
        checked_at: new Date().toISOString(),
      }
      if (added.data.verified) {
        verified = true
        status = 'active'
      }
    } else {
      verification = {
        vercel: { configured: false },
        note: 'Vercel API nicht konfiguriert — Domain manuell im Vercel-Projekt hinzufügen, DNS setzen, dann «Prüfen».',
        checked_at: new Date().toISOString(),
      }
    }
  } catch (err: any) {
    verification = {
      vercel: { error: err?.message || 'Vercel error' },
      note: 'Domain lokal gespeichert. Bitte Domain ggf. manuell in Vercel hinzufügen und DNS setzen.',
      checked_at: new Date().toISOString(),
    }
    status = 'dns_pending'
  }

  const now = new Date().toISOString()
  const { data: updated, error } = await supabase
    .from('website_tenants')
    .update({
      custom_domain: domain,
      custom_domain_status: status,
      custom_domain_verified: verified,
      custom_domain_verified_at: verified ? now : null,
      custom_domain_verification: verification,
      updated_at: now,
    })
    .eq('id', website.id)
    .select(
      'id, subdomain, custom_domain, custom_domain_status, custom_domain_verified, custom_domain_verified_at, custom_domain_verification',
    )
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return {
    success: true,
    domain,
    status,
    verified,
    dns: dnsInstructions(domain),
    website: updated,
    message: verified
      ? 'Domain aktiv'
      : 'Domain gespeichert. Bitte DNS setzen und danach prüfen.',
  }
})
