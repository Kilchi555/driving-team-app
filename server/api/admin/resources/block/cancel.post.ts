/**
 * POST /api/admin/resources/block/cancel
 * Cancel (soft-delete) a manual room_booking or vehicle_booking.
 *
 * Body: { resource_type: 'room' | 'vehicle', booking_id: string }
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'staff', 'super_admin', 'superadmin'])
  const supabase = getSupabaseAdmin()
  const { resource_type, booking_id } = await readBody(event)

  if (!resource_type || !['room', 'vehicle'].includes(resource_type)) {
    throw createError({ statusCode: 400, statusMessage: 'resource_type must be "room" or "vehicle"' })
  }
  if (!booking_id) {
    throw createError({ statusCode: 400, statusMessage: 'booking_id is required' })
  }

  const table = resource_type === 'room' ? 'room_bookings' : 'vehicle_bookings'

  // Verify booking belongs to this tenant
  const { data: booking } = await supabase
    .from(table)
    .select('id, tenant_id, appointment_id, course_id')
    .eq('id', booking_id)
    .single()

  if (!booking || booking.tenant_id !== profile.tenant_id) {
    throw createError({ statusCode: 404, statusMessage: 'Buchung nicht gefunden.' })
  }

  // Don't allow cancelling lesson/course bookings from here
  if (booking.appointment_id || booking.course_id) {
    throw createError({ statusCode: 400, statusMessage: 'Fahrstunden- und Kursbuchungen können nur über den Termin/Kurs storniert werden.' })
  }

  const { error } = await supabase
    .from(table)
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', booking_id)
    .eq('tenant_id', profile.tenant_id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true }
})
