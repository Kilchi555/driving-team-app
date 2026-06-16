/**
 * GET /api/admin/booking-settings
 * Returns the tenant's online booking configuration:
 *   - minimum_booking_lead_time_hours: how many hours in advance a customer must book (default 12)
 */
import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export const DEFAULT_LEAD_TIME_HOURS = 12

async function getAuthenticatedAdmin(event: any) {
  const supabase = getSupabaseAdmin()
  const authHeader = event.node.req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.substring(7)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  const { data } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('auth_user_id', user.id)
    .single()
  if (!data?.tenant_id || data.role !== 'admin') return null
  return { user, tenantId: data.tenant_id }
}

export default defineEventHandler(async (event) => {
  const auth = await getAuthenticatedAdmin(event)
  if (!auth) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('tenants')
    .select('minimum_booking_lead_time_hours')
    .eq('id', auth.tenantId)
    .single()

  return {
    minimum_booking_lead_time_hours: data?.minimum_booking_lead_time_hours ?? DEFAULT_LEAD_TIME_HOURS,
  }
})
