// POST /api/website/custom-domain/verify — re-check DNS + Vercel verification
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  checkDnsPointsToVercel,
  dnsInstructions,
  normalizeHostname,
  vercelGetDomain,
  vercelVerifyDomain,
} from '~/server/utils/custom-domain'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()
  const { data: user } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!user?.tenant_id) throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })

  const { data: website } = await supabase
    .from('website_tenants')
    .select('*')
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  if (!website?.custom_domain) {
    throw createError({ statusCode: 400, statusMessage: 'Keine Custom Domain hinterlegt' })
  }

  const domain = normalizeHostname(website.custom_domain)
  const dns = await checkDnsPointsToVercel(domain)

  let vercelVerified = false
  let vercelPayload: any = null
  let vercelError: string | null = null

  const existing = await vercelGetDomain(domain)
  if (existing.configured && existing.data) {
    vercelPayload = existing.data
    if (existing.data.verified) {
      vercelVerified = true
    } else {
      const verified = await vercelVerifyDomain(domain)
      if (verified.data?.verified) {
        vercelVerified = true
        vercelPayload = verified.data
      } else {
        vercelError = verified.error || null
        vercelPayload = verified.data || existing.data
      }
    }
  } else if (existing.configured && existing.error) {
    vercelError = existing.error
  }

  // Active when DNS points to Vercel AND (Vercel says verified OR Vercel API not configured)
  const vercelApiMissing = !existing.configured
  const verified = dns.ok && (vercelVerified || vercelApiMissing)
  const status = verified ? 'active' : dns.ok ? 'dns_pending' : 'dns_pending'

  const verification = {
    dns,
    vercel: existing.configured
      ? {
          verified: vercelVerified,
          payload: vercelPayload,
          error: vercelError,
        }
      : { configured: false },
    checked_at: new Date().toISOString(),
  }

  const now = new Date().toISOString()
  const { data: updated, error } = await supabase
    .from('website_tenants')
    .update({
      custom_domain_status: verified ? 'active' : status,
      custom_domain_verified: verified,
      custom_domain_verified_at: verified ? now : website.custom_domain_verified_at,
      custom_domain_verification: verification,
      updated_at: now,
    })
    .eq('id', website.id)
    .select(
      'id, subdomain, custom_domain, custom_domain_status, custom_domain_verified, custom_domain_verified_at, custom_domain_verification',
    )
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return {
    success: true,
    domain,
    verified,
    status: verified ? 'active' : status,
    dns: dnsInstructions(domain),
    check: verification,
    website: updated,
    message: verified
      ? 'Domain ist aktiv und zeigt auf eure Landingpage'
      : dns.ok
        ? 'DNS ok — Vercel-Verifikation noch ausstehend (TXT/CNAME prüfen)'
        : `DNS noch nicht korrekt: ${dns.detail}`,
  }
})
