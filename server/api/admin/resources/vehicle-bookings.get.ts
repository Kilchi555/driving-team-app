/**
 * GET /api/admin/resources/vehicle-bookings?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returns vehicle_bookings for the tenant within a date range (for the calendar).
 */
import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'staff', 'super_admin', 'superadmin'])
  const { from, to } = getQuery(event) as { from?: string; to?: string }

  if (!from || !to) throw createError({ statusCode: 400, statusMessage: 'from and to dates required (YYYY-MM-DD)' })

  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('vehicle_bookings')
    .select('id, vehicle_id, start_time, end_time, purpose, status, notes, booked_by, appointment_id, course_id, driver_name, external_contact_name, external_contact_email, external_contact_phone')
    .eq('tenant_id', profile.tenant_id)
    .neq('status', 'cancelled')
    .gte('start_time', `${from}T00:00:00`)
    .lt('start_time', `${to}T00:00:00`)
    .order('start_time')

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true, bookings: data || [] }
})
