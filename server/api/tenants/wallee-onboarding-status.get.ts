// server/api/tenants/wallee-onboarding-status.get.ts
import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('tenants')
    .select('wallee_onboarding_status, wallee_enabled, wallee_applied_at')
    .eq('id', authUser.tenant_id as string)
    .single()

  if (error || !data) throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })

  return {
    status:    data.wallee_onboarding_status ?? 'not_started',
    enabled:   data.wallee_enabled ?? false,
    appliedAt: data.wallee_applied_at ?? null,
  }
})
