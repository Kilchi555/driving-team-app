/**
 * GET /api/settings/invoice-payment-settings
 * Returns invoice ("Rechnung") payment settings for the current tenant.
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
    // Off by default: this is an opt-in feature, so tenants that never
    // configured it keep their previous behavior (no invoice option shown).
    invoice_payments_enabled: settings.invoice_payments_enabled ?? false,
  }
})
