/**
 * GET /api/booking/room-availability
 * Lightweight public endpoint for checking a single room's availability.
 * Returns only a boolean — no conflict details exposed to clients.
 *
 * Query params:
 *   room_id    (UUID)  – required
 *   start_time (ISO)   – required
 *   end_time   (ISO)   – required
 *
 * No auth required (public endpoint — used in online booking flow).
 */
import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const { room_id, start_time, end_time } = getQuery(event) as Record<string, string>

  if (!room_id || !start_time || !end_time) {
    throw createError({ statusCode: 400, statusMessage: 'room_id, start_time and end_time are required' })
  }

  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('room_bookings')
    .select('id')
    .eq('room_id', room_id)
    .neq('status', 'cancelled')
    .lt('start_time', end_time)
    .gt('end_time', start_time)
    .limit(1)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Availability check failed' })
  }

  return { available: (data?.length ?? 0) === 0 }
})
