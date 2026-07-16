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
import { isRoomAvailable } from '~/server/utils/room-availability'

export default defineEventHandler(async (event) => {
  const { room_id, start_time, end_time } = getQuery(event) as Record<string, string>

  if (!room_id || !start_time || !end_time) {
    throw createError({ statusCode: 400, statusMessage: 'room_id, start_time and end_time are required' })
  }

  const supabase = getSupabaseAdmin()

  const available = await isRoomAvailable(supabase, { roomId: room_id, startTime: start_time, endTime: end_time })

  return { available }
})
