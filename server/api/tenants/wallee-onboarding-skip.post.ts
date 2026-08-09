// POST /api/tenants/wallee-onboarding-skip
// Mark online payments as "not needed for now" so setup checklist can complete.

import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  if (!['admin', 'super_admin'].includes(authUser.role || '')) {
    throw createError({ statusCode: 403, statusMessage: 'Admin role required' })
  }

  const tenantId = authUser.tenant_id as string
  if (!tenantId) throw createError({ statusCode: 400, statusMessage: 'Tenant ID missing' })

  const supabase = getSupabaseAdmin()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('wallee_onboarding_status, wallee_enabled')
    .eq('id', tenantId)
    .single()

  if (!tenant) throw createError({ statusCode: 404, statusMessage: 'Tenant nicht gefunden' })

  if (tenant.wallee_enabled || tenant.wallee_onboarding_status === 'active') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Online-Zahlungen sind bereits aktiv — Überspringen nicht möglich.',
    })
  }

  if (tenant.wallee_onboarding_status === 'pending' || tenant.wallee_onboarding_status === 'pending_uid') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Dein Antrag wird bereits bearbeitet.',
    })
  }

  const { error } = await supabase
    .from('tenants')
    .update({
      wallee_onboarding_status: 'skipped',
      updated_at: new Date().toISOString(),
    })
    .eq('id', tenantId)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true, status: 'skipped' }
})
