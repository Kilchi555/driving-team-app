import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * GET /api/tenants/trial-status
 * Returns trial/subscription info for the current user's tenant.
 * Used by the client-side auth store to enforce trial expiry in middleware.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const tenantId = authUser.tenant_id
  if (!tenantId) {
    throw createError({ statusCode: 404, statusMessage: 'No tenant found for this user' })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('tenants')
    .select('is_trial, trial_ends_at, subscription_plan, current_period_end')
    .eq('id', tenantId)
    .single()

  if (error || !data) {
    throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })
  }

  return {
    is_trial: data.is_trial,
    trial_ends_at: data.trial_ends_at,
    subscription_plan: data.subscription_plan,
    current_period_end: data.current_period_end,
  }
})
