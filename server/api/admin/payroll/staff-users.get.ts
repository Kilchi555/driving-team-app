import { defineEventHandler, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * GET /api/admin/payroll/staff-users
 * Returns all staff users for this tenant that are not yet linked to a payroll employee.
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()

  const { data: allStaff, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, email')
    .eq('tenant_id', profile.tenant_id)
    .eq('role', 'staff')
    .order('last_name', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Find already-linked user_ids
  const { data: linked } = await supabase
    .from('payroll_employees')
    .select('user_id')
    .eq('tenant_id', profile.tenant_id)
    .is('end_date', null)
    .not('user_id', 'is', null)

  const linkedIds = new Set((linked ?? []).map(e => e.user_id).filter(Boolean))

  return {
    success: true,
    data: (allStaff ?? []).map(u => ({
      ...u,
      already_linked: linkedIds.has(u.id),
    })),
  }
})
