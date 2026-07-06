/**
 * GET /api/admin/rental-partners
 * Returns all users who have ever rented a vehicle for this tenant,
 * plus a count of their rentals. Replaces the old external_partners approach.
 */
import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const role: string = authUser.role || authUser.profile?.role || ''
  const tenantId: string = authUser.tenant_id || authUser.profile?.tenant_id || ''

  if (!['admin', 'staff', 'superadmin'].includes(role) || !tenantId) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const supabase = getSupabaseAdmin()

  // Get all unique renters for this tenant with booking counts
  const { data: rentals } = await supabase
    .from('vehicle_rentals')
    .select('renter_user_id, status')
    .eq('tenant_id', tenantId)

  if (!rentals || rentals.length === 0) return { success: true, renters: [] }

  const renterIds = [...new Set(rentals.map((r: any) => r.renter_user_id))]

  const { data: users } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, phone, status, role, created_at, rental_payment_method')
    .in('id', renterIds)

  const countMap: Record<string, { total: number; pending: number; confirmed: number }> = {}
  for (const r of rentals) {
    if (!countMap[r.renter_user_id]) countMap[r.renter_user_id] = { total: 0, pending: 0, confirmed: 0 }
    countMap[r.renter_user_id].total++
    if (r.status === 'pending') countMap[r.renter_user_id].pending++
    if (r.status === 'confirmed') countMap[r.renter_user_id].confirmed++
  }

  return {
    success: true,
    renters: (users || []).map((u: any) => ({
      id: u.id,
      name: [u.first_name, u.last_name].filter(Boolean).join(' '),
      email: u.email,
      phone: u.phone,
      status: u.status,
      role: u.role,
      member_since: u.created_at,
      rental_payment_method: u.rental_payment_method ?? null,
      rentals: countMap[u.id] ?? { total: 0, pending: 0, confirmed: 0 },
    })),
  }
})
