// GET /api/website/custom-domain — current custom domain status + DNS instructions
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  dnsInstructions,
  getVercelDomainConfig,
  normalizeHostname,
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
    .select(
      'id, subdomain, custom_domain, custom_domain_status, custom_domain_verified, custom_domain_verified_at, custom_domain_verification, is_published',
    )
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  const domain = website?.custom_domain ? normalizeHostname(website.custom_domain) : null

  return {
    website_id: website?.id || null,
    subdomain: website?.subdomain || null,
    is_published: !!website?.is_published,
    domain,
    status: website?.custom_domain_status || (domain ? 'pending' : null),
    verified: !!website?.custom_domain_verified,
    verified_at: website?.custom_domain_verified_at || null,
    verification: website?.custom_domain_verification || null,
    dns: domain ? dnsInstructions(domain) : null,
    vercel_api_configured: !!getVercelDomainConfig(),
    live_url: domain
      ? `https://${domain}`
      : website?.subdomain
        ? `https://app.simy.ch/s/${website.subdomain}`
        : null,
    preview_url: website?.subdomain ? `https://app.simy.ch/s/${website.subdomain}?preview=1` : null,
  }
})
