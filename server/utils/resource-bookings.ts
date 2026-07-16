// server/utils/resource-bookings.ts
// Shared helper to release vehicle_bookings / room_bookings when an
// appointment is cancelled, so the resource becomes available again for
// other bookings in the same time slot. Availability checks (e.g.
// server/api/admin/resources/availability.get.ts) filter on
// status != 'cancelled', so this must run on every appointment cancellation
// path (staff/customer cancellation, medical certificate approval, etc.).
import { logger } from '~/utils/logger'

export async function cancelResourceBookingsForAppointment(
  supabase: any,
  appointmentId: string,
  tenantId: string
): Promise<void> {
  try {
    const [
      { error: vehicleError, count: vehicleCount },
      { error: roomError, count: roomCount }
    ] = await Promise.all([
      supabase
        .from('vehicle_bookings')
        .update({ status: 'cancelled' })
        .eq('appointment_id', appointmentId)
        .eq('tenant_id', tenantId)
        .neq('status', 'cancelled')
        .select('id', { count: 'exact' }),
      supabase
        .from('room_bookings')
        .update({ status: 'cancelled' })
        .eq('appointment_id', appointmentId)
        .eq('tenant_id', tenantId)
        .neq('status', 'cancelled')
        .select('id', { count: 'exact' })
    ])

    if (vehicleError) logger.warn('⚠️ Could not cancel vehicle_bookings for appointment:', vehicleError)
    if (roomError) logger.warn('⚠️ Could not cancel room_bookings for appointment:', roomError)

    if (!vehicleError && !roomError) {
      logger.debug('✅ Resource bookings released after cancellation:', {
        appointmentId,
        vehicleBookingsCancelled: vehicleCount ?? 0,
        roomBookingsCancelled: roomCount ?? 0
      })
    }
  } catch (error: any) {
    logger.warn('⚠️ Error cancelling resource bookings:', error?.message || error)
  }
}

/**
 * Same as cancelResourceBookingsForAppointment, but for course-linked
 * vehicle_bookings / room_bookings (keyed by course_id instead of
 * appointment_id). Call this whenever a course is cancelled so its vehicle
 * and room reservations don't keep blocking the fleet/room calendar.
 */
export async function cancelResourceBookingsForCourse(
  supabase: any,
  courseId: string,
  tenantId: string
): Promise<void> {
  try {
    const [
      { error: vehicleError, count: vehicleCount },
      { error: roomError, count: roomCount }
    ] = await Promise.all([
      supabase
        .from('vehicle_bookings')
        .update({ status: 'cancelled' })
        .eq('course_id', courseId)
        .eq('tenant_id', tenantId)
        .neq('status', 'cancelled')
        .select('id', { count: 'exact' }),
      supabase
        .from('room_bookings')
        .update({ status: 'cancelled' })
        .eq('course_id', courseId)
        .eq('tenant_id', tenantId)
        .neq('status', 'cancelled')
        .select('id', { count: 'exact' })
    ])

    if (vehicleError) logger.warn('⚠️ Could not cancel vehicle_bookings for course:', vehicleError)
    if (roomError) logger.warn('⚠️ Could not cancel room_bookings for course:', roomError)

    if (!vehicleError && !roomError) {
      logger.debug('✅ Resource bookings released after course cancellation:', {
        courseId,
        vehicleBookingsCancelled: vehicleCount ?? 0,
        roomBookingsCancelled: roomCount ?? 0
      })
    }
  } catch (error: any) {
    logger.warn('⚠️ Error cancelling course resource bookings:', error?.message || error)
  }
}
