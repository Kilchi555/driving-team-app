/**
 * GET /api/admin/booking-settings
 * Returns the tenant's online booking configuration:
 *   - minimum_booking_lead_time_hours: how many hours in advance a customer must book (default 12)
 *   - appointment_edit_lock_mode: when staff can no longer edit a past appointment
 *       'immediately' | 'after_hours' | 'never' (default 'immediately')
 *   - appointment_edit_lock_hours: grace period in hours, used when mode = 'after_hours' (default 0)
 */
import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export const DEFAULT_LEAD_TIME_HOURS = 12
export const DEFAULT_APPOINTMENT_EDIT_LOCK_MODE = 'immediately'
export const DEFAULT_APPOINTMENT_EDIT_LOCK_HOURS = 0

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
    .select('minimum_booking_lead_time_hours, appointment_edit_lock_mode, appointment_edit_lock_hours')
    .eq('id', auth.tenantId)
    .single()

  return {
    minimum_booking_lead_time_hours: data?.minimum_booking_lead_time_hours ?? DEFAULT_LEAD_TIME_HOURS,
    appointment_edit_lock_mode: data?.appointment_edit_lock_mode ?? DEFAULT_APPOINTMENT_EDIT_LOCK_MODE,
    appointment_edit_lock_hours: data?.appointment_edit_lock_hours ?? DEFAULT_APPOINTMENT_EDIT_LOCK_HOURS,
  }
})
