// POST /api/website/custom-domain/verify — re-check DNS + Vercel verification
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  checkDnsPointsToVercel,
  ClientCustomDomainEvidenceError,
  customDomainActivation,
  dnsInstructions,
  normalizeHostname,
  readCustomDomainClaimBody,
  vercelGetDomain,
  vercelVerifyDomain,
} from '~/server/utils/custom-domain'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  try {
    // Domain and verification come from the stored row and server checks.
    // A client tls or verification field is rejected and never written.
    readCustomDomainClaimBody(await readBody(event))
  } catch (err) {
    if (err instanceof ClientCustomDomainEvidenceError) {
      throw createError({ statusCode: 400, statusMessage: err.message })
    }
    throw err
  }

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

  const platformConfigured = !!(existing.configured && existing.data && !vercelError)
  const verification = {
    dns: { ok: dns.ok === true },
    vercel: {
      configured: platformConfigured,
      verified: platformConfigured && vercelVerified === true,
      verification: vercelPayload?.verification || existing.data?.verification || null,
      error: vercelError,
    },
    checked_at: new Date().toISOString(),
  }
  const activation = await customDomainActivation({
    domain,
    isPublished: website.is_published === true,
    verification,
  })

  const now = new Date().toISOString()
  const { data: updated, error } = await supabase
    .from('website_tenants')
    .update({
      custom_domain_status: activation.status,
      custom_domain_verified: activation.verified,
      custom_domain_verified_at: activation.verified ? now : null,
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
    verified: activation.verified,
    status: activation.status,
    dns: dnsInstructions(domain),
    check: verification,
    website: updated,
    message: activation.verified
      ? 'Domain ist aktiv und zeigt auf eure Landingpage'
      : dns.ok
        ? 'DNS erkannt. Die Domain wird noch nicht öffentlich zugeordnet.'
        : `DNS noch nicht korrekt: ${dns.detail}`,
  }
})
