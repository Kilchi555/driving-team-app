/**
 * GET /api/admin/refund-requests
 * Returns pending refund requests for the tenant (admin only).
 */
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const role: string = authUser.role || authUser.profile?.role || ''
  const tenantId: string = authUser.tenant_id || authUser.profile?.tenant_id || ''

  if (!['admin', 'staff', 'superadmin'].includes(role) || !tenantId) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const supabase = getSupabaseAdmin()

  const { data } = await supabase
    .from('refund_requests')
    .select(`
      id, status, requested_amount_rappen, reason, created_at, reviewed_at, review_note,
      requested_by:users!refund_requests_requested_by_fkey(id, first_name, last_name),
      payment:payments(id, total_amount_rappen, wallee_transaction_id, appointment_id)
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  return { success: true, data: data || [] }
})
