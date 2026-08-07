import { createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { DEFAULT_BOOKING_POLICY } from '~/server/api/admin/booking-policy.get'

const ADMIN_ROLES = new Set(['admin', 'superadmin', 'super_admin', 'tenant_admin'])

/**
 * Enforce booking_policy.staff_manual_discount_permission for free-amount staff discounts.
 * Admins always allowed. Non-manual (code / preset) discounts skip this check.
 */
export async function assertStaffCanApplyManualDiscount(opts: {
  tenantId: string
  role: string
  isManualDiscount: boolean
}): Promise<void> {
  if (!opts.isManualDiscount) return
  if (ADMIN_ROLES.has(opts.role)) return

  const supabase = getSupabaseAdmin()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('booking_policy')
    .eq('id', opts.tenantId)
    .maybeSingle()

  const policy = { ...DEFAULT_BOOKING_POLICY, ...(tenant?.booking_policy ?? {}) }
  if (policy.staff_manual_discount_permission !== 'allowed') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Manuelle Rabatte sind für Staff nicht aktiviert.'
    })
  }
}
