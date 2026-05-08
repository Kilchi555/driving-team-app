/**
 * DELETE /api/admin/email-domain/remove
 * Removes the custom email domain from Resend and clears tenant fields.
 */

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile?.tenant_id || !['admin', 'owner'].includes(profile.role)) {
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
