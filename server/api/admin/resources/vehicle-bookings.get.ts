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
    .select(`
      id, vehicle_id, start_time, end_time, purpose, status, notes, booked_by, cost_rappen,
      appointment_id, course_id, driver_name, external_contact_name, external_contact_email, external_contact_phone,
      appointment:appointments!vehicle_bookings_appointment_id_fkey(
        id, type, event_type_code, location_id, custom_location_name, custom_location_address,
        student:users!appointments_user_id_fkey(first_name, last_name, phone, email),
        instructor:users!appointments_staff_id_fkey(first_name, last_name)
      ),
      course:courses!vehicle_bookings_course_id_fkey(id, name, city),
      booked_by_user:users!vehicle_bookings_booked_by_fkey(first_name, last_name)
    `)
    .eq('tenant_id', profile.tenant_id)
    .neq('status', 'cancelled')
    .gte('start_time', `${from}T00:00:00`)
    .lt('start_time', `${to}T00:00:00`)
    .order('start_time')

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const bookings = data || []

  // ── Enrich with location (no direct FK between appointments.location_id and locations,
  //    so PostgREST can't embed it — fetch separately and merge). ──────────────────────────
  const locationIds = [...new Set(
    bookings.map((b: any) => b.appointment?.location_id).filter(Boolean)
  )]
  if (locationIds.length > 0) {
    const { data: locations } = await supabase
      .from('locations')
      .select('id, name, address')
      .in('id', locationIds)
    const locationsMap = new Map((locations || []).map((l: any) => [l.id, l]))
    for (const b of bookings as any[]) {
      if (b.appointment?.location_id) {
        b.appointment.location = locationsMap.get(b.appointment.location_id) || null
      }
    }
  }

  return { success: true, bookings }
})
