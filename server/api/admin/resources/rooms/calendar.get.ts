/**
 * GET /api/admin/resources/rooms/calendar?from=YYYY-MM-DD&days=7
 * Returns room_bookings grouped by room for a given date range.
 */
import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const { from, days = '7' } = getQuery(event) as { from?: string; days?: string }

  if (!from) throw createError({ statusCode: 400, statusMessage: 'from date required (YYYY-MM-DD)' })

  const fromDate = new Date(`${from}T00:00:00`)
  const toDate = new Date(fromDate)
  toDate.setDate(toDate.getDate() + parseInt(days))

  const supabase = getSupabaseAdmin()

  const [roomsResult, bookingsResult] = await Promise.all([
    supabase
      .from('rooms')
      .select('id, name, location, capacity, hourly_rate_rappen, is_public')
      .eq('tenant_id', profile.tenant_id)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('room_bookings')
      .select('id, room_id, start_time, end_time, purpose, status, room_cost_rappen, booked_by, external_contact_name, external_contact_email, appointment_id, course_id')
      .eq('tenant_id', profile.tenant_id)
      .neq('status', 'cancelled')
      .gte('start_time', fromDate.toISOString())
      .lt('start_time', toDate.toISOString())
      .order('start_time'),
  ])

  if (roomsResult.error) throw roomsResult.error
  if (bookingsResult.error) throw bookingsResult.error

  const bookingsByRoom: Record<string, any[]> = {}
  for (const r of roomsResult.data || []) {
    bookingsByRoom[r.id] = []
  }
  for (const b of bookingsResult.data || []) {
    if (bookingsByRoom[b.room_id]) {
      bookingsByRoom[b.room_id].push(b)
    }
  }

  return {
    success: true,
    rooms: (roomsResult.data || []).map((r: any) => ({
      ...r,
      hourly_rate_chf: (r.hourly_rate_rappen / 100).toFixed(2),
      bookings: bookingsByRoom[r.id] || [],
    })),
    from: from,
    to: toDate.toISOString().split('T')[0],
  }
})
