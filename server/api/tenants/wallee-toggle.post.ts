// server/api/tenants/wallee-toggle.post.ts
// Tenant admin can enable/disable online payments at any time.
// Only allowed when wallee_onboarding_status = 'active' (KYC complete).

import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  if (!['admin', 'super_admin'].includes(authUser.role || '')) {
    throw createError({ statusCode: 403, statusMessage: 'Admin role required' })
  }

  const { enabled } = await readBody<{ enabled: boolean }>(event)
  if (typeof enabled !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'enabled (boolean) ist erforderlich' })
  }

  const tenantId = authUser.tenant_id as string
  const supabase = getSupabaseAdmin()

  // Can only enable if onboarding is complete
  if (enabled) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('wallee_onboarding_status')
      .eq('id', tenantId)
      .single()

    if (tenant?.wallee_onboarding_status !== 'active') {
      throw createError({
        statusCode: 409,
        statusMessage: 'Online-Zahlungen können erst aktiviert werden nachdem das Wallee-Onboarding abgeschlossen ist.',
      })
    }
  }

  const { error } = await supabase
    .from('tenants')
    .update({ wallee_enabled: enabled, updated_at: new Date().toISOString() })
    .eq('id', tenantId)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return {
    success: true,
    wallee_enabled: enabled,
    message: enabled ? 'Online-Zahlungen aktiviert' : 'Online-Zahlungen deaktiviert',
  }
})
