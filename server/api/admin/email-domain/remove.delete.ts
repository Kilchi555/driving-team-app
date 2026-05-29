/**
 * DELETE /api/admin/email-domain/remove
 * Removes the custom email domain from Resend and clears tenant fields.
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
    .select('resend_domain_id')
    .eq('id', profile.tenant_id)
    .single()

  if (tenant?.resend_domain_id) {
    const resendApiKey = process.env.RESEND_API_KEY
    if (resendApiKey) {
      await $fetch(`https://api.resend.com/domains/${tenant.resend_domain_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${resendApiKey}` },
      }).catch(() => {
        // Ignore – domain may already be gone
      })
    }
  }

  await supabase
    .from('tenants')
    .update({
      from_email: null,
      resend_domain_id: null,
      resend_domain_verified: false,
    })
    .eq('id', profile.tenant_id)

  return { success: true }
})
