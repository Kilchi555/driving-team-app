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

export type CourseResourceCancelResult = {
  ok: boolean
  roomBookingIds: string[]
  vehicleBookingIds: string[]
  errors: string[]
}

/**
 * Same as cancelResourceBookingsForAppointment, but for course-linked
 * vehicle_bookings / room_bookings (keyed by course_id instead of
 * appointment_id). Call this whenever a course is cancelled so its vehicle
 * and room reservations don't keep blocking the fleet/room calendar.
 *
 * Returns structured success/error so course cancellation can mark incomplete
 * when required resource cleanup fails. Does not delete booking history.
 */
export async function cancelResourceBookingsForCourse(
  supabase: any,
  courseId: string,
  tenantId: string
): Promise<CourseResourceCancelResult> {
  const result: CourseResourceCancelResult = {
    ok: true,
    roomBookingIds: [],
    vehicleBookingIds: [],
    errors: [],
  }

  try {
    const [
      { data: vehicles, error: vehicleError },
      { data: rooms, error: roomError },
    ] = await Promise.all([
      supabase
        .from('vehicle_bookings')
        .update({ status: 'cancelled' })
        .eq('course_id', courseId)
        .eq('tenant_id', tenantId)
        .neq('status', 'cancelled')
        .select('id'),
      supabase
        .from('room_bookings')
        .update({ status: 'cancelled' })
        .eq('course_id', courseId)
        .eq('tenant_id', tenantId)
        .neq('status', 'cancelled')
        .select('id'),
    ])

    if (vehicleError) {
      result.ok = false
      result.errors.push(`vehicle_bookings: ${vehicleError.message || String(vehicleError)}`)
      logger.warn('⚠️ Could not cancel vehicle_bookings for course:', vehicleError)
    } else {
      result.vehicleBookingIds = (vehicles || []).map((row: { id: string }) => row.id)
    }

    if (roomError) {
      result.ok = false
      result.errors.push(`room_bookings: ${roomError.message || String(roomError)}`)
      logger.warn('⚠️ Could not cancel room_bookings for course:', roomError)
    } else {
      result.roomBookingIds = (rooms || []).map((row: { id: string }) => row.id)
    }

    if (result.ok) {
      logger.debug('✅ Resource bookings released after course cancellation:', {
        courseId,
        vehicleBookingsCancelled: result.vehicleBookingIds.length,
        roomBookingsCancelled: result.roomBookingIds.length,
      })
    }
  } catch (error: any) {
    result.ok = false
    result.errors.push(error?.message || String(error))
    logger.warn('⚠️ Error cancelling course resource bookings:', error?.message || error)
  }

  return result
}
