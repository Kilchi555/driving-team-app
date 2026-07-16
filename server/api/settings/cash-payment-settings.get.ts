/**
 * GET /api/settings/cash-payment-settings
 * Returns cash payment settings for the current tenant.
 * Accessible to all authenticated users (staff + customers), and also to
 * anonymous guests on the public booking page via `?slug=<tenant-slug>`
 * (no sensitive data is returned — just a boolean feature flag).
 */
import { defineEventHandler, createError, getQuery } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  const supabase = getSupabaseAdmin()

  let tenantId = authUser?.tenant_id as string | undefined

  if (!tenantId) {
    // Anonymous guest on the public booking page: resolve tenant via slug instead.
    const { slug } = getQuery(event)
    if (!slug || typeof slug !== 'string') {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .single()
    if (!tenant) throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })
    tenantId = tenant.id
  }

  const { data } = await supabase
    .from('tenant_settings')
    .select('setting_value')
    .eq('tenant_id', tenantId as string)
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
