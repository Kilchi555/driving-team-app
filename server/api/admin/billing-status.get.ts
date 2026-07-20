import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  // Bearer header with HTTP-only-cookie fallback + token refresh, instead of
  // a raw Bearer-only check that would 401 whenever the client's access
  // token had just expired.
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()
  const userRow = authUser.db_user_id
    ? { tenant_id: authUser.tenant_id, role: authUser.role }
    : null

  if (!userRow?.tenant_id || userRow.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Admins only' })
  }

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select(`
      subscription_plan,
      is_trial,
      trial_ends_at,
      current_period_end,
      subscription_cancel_at,
      addon_seats,
      addon_courses_enabled,
      addon_affiliate_enabled,
      addon_gbp_enabled,
      stripe_subscription_id,
      stripe_customer_id
    `)
    .eq('id', userRow.tenant_id)
    .single()

  if (error || !tenant) {
    throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })
  }

  return {
    plan: tenant.subscription_plan ?? 'trial',
    is_trial: tenant.is_trial ?? true,
    trial_ends_at: tenant.trial_ends_at ?? null,
    current_period_end: tenant.current_period_end ?? null,
    subscription_cancel_at: tenant.subscription_cancel_at ?? null,
    addon_seats: tenant.addon_seats ?? 0,
    addon_courses_enabled: tenant.addon_courses_enabled ?? false,
    addon_affiliate_enabled: tenant.addon_affiliate_enabled ?? false,
    addon_gbp_enabled: (tenant as any).addon_gbp_enabled ?? false,
    has_stripe_subscription: !!tenant.stripe_subscription_id,
    has_stripe_customer: !!tenant.stripe_customer_id,
  }
})
