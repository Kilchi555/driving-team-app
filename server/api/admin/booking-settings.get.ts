/**
 * GET /api/admin/booking-settings
 * Returns the tenant's online booking configuration:
 *   - minimum_booking_lead_time_hours: how many hours in advance a customer must book (default 12)
 *   - appointment_edit_lock_mode: when staff can no longer edit a past appointment
 *       'immediately' | 'after_hours' | 'never' (default 'immediately')
 *   - appointment_edit_lock_hours: grace period in hours, used when mode = 'after_hours' (default 0)
 */
import { defineEventHandler, createError } from 'h3'
import type { H3Event } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

export const DEFAULT_LEAD_TIME_HOURS = 12
export const DEFAULT_APPOINTMENT_EDIT_LOCK_MODE = 'immediately'
export const DEFAULT_APPOINTMENT_EDIT_LOCK_HOURS = 0

// Bearer header with HTTP-only-cookie fallback + token refresh, instead of a
// raw Bearer-only check that would 401 whenever the client's access token
// had just expired.
export async function getAuthenticatedAdmin(event: H3Event) {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.db_user_id || !authUser.tenant_id || authUser.role !== 'admin') return null
  return { user: authUser, tenantId: authUser.tenant_id }
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
