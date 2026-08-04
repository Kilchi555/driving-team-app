// DELETE /api/website/custom-domain — detach custom domain
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { normalizeHostname, vercelRemoveDomain } from '~/server/utils/custom-domain'

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
    .select('id, custom_domain')
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  if (!website) throw createError({ statusCode: 404, statusMessage: 'Website not found' })

  const domain = website.custom_domain ? normalizeHostname(website.custom_domain) : null

  if (domain) {
    try {
      await vercelRemoveDomain(domain)
    } catch {
      // still clear locally — Vercel may not be configured
    }
  }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('website_tenants')
    .update({
      custom_domain: null,
      custom_domain_status: null,
      custom_domain_verified: false,
      custom_domain_verified_at: null,
      custom_domain_verification: null,
      updated_at: now,
    })
    .eq('id', website.id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true, message: 'Custom Domain entfernt' }
})
