/**
 * GET /api/admin/email-domain/status
 * Polls Resend for the current verification status of the tenant's domain
 * and syncs it to the tenants table.
 */

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

  const authUser = await getAuthenticatedUser(event)

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!profile?.tenant_id || !['admin', 'owner', 'super_admin'].includes(profile.role ?? '')) {
    throw createError({ statusCode: 403, statusMessage: 'Admin required' })
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('from_email, resend_domain_id, resend_domain_verified')
    .eq('id', profile.tenant_id)
    .single()

  if (!tenant?.resend_domain_id) {
    return { configured: false }
  }

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) throw createError({ statusCode: 500, statusMessage: 'RESEND_API_KEY not configured' })

  const detail = await $fetch<any>(`https://api.resend.com/domains/${tenant.resend_domain_id}`, {
    headers: { Authorization: `Bearer ${resendApiKey}` },
  }).catch(() => null)

  if (!detail) {
    return {
      configured: true,
      fromEmail: tenant.from_email,
      verified: false,
      status: 'not_found',
      dnsRecords: [],
    }
  }

  const verified = detail.status === 'verified'

  // Keep DB in sync
  if (verified !== tenant.resend_domain_verified) {
    await supabase
      .from('tenants')
      .update({ resend_domain_verified: verified })
      .eq('id', profile.tenant_id)
  }

  return {
    configured: true,
    fromEmail: tenant.from_email,
    verified,
    status: detail.status,
    dnsRecords: detail.records ?? [],
  }
})
