/**
 * GET /api/settings/cash-payment-settings
 * Returns cash payment settings for the current tenant.
 * Accessible to all authenticated users (staff + customers).
 */
import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('tenant_settings')
    .select('setting_value')
    .eq('tenant_id', authUser.tenant_id as string)
    .eq('category', 'payment')
    .eq('setting_key', 'payment_settings')
    .maybeSingle()

  const settings = data?.setting_value
    ? (typeof data.setting_value === 'string' ? JSON.parse(data.setting_value) : data.setting_value)
    : {}

  return {
    cash_payments_enabled: settings.cash_payments_enabled ?? true,
    cash_payment_visibility: settings.cash_payment_visibility ?? 'staff_only',
  }
})
