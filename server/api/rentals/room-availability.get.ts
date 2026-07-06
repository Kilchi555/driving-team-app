/**
 * GET /api/rentals/room-availability?room_id=<uuid>&from=YYYY-MM-DD&tenant_slug=<slug>
 * Returns blocked time ranges for a room for a 7-day window.
 * Requires an active Simy session.
 */
import { defineEventHandler, getQuery, createError } from 'h3'
import { getRentalUser } from '~/server/utils/rental-auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const rentalUser = await getRentalUser(event)
  const { room_id, from, tenant_slug } = getQuery(event) as {
    room_id?: string
    from?: string
    tenant_slug?: string
  }

  if (!room_id || !from) throw createError({ statusCode: 400, statusMessage: 'room_id and from required' })
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) throw createError({ statusCode: 400, statusMessage: 'from must be YYYY-MM-DD' })

  const supabase = getSupabaseAdmin()

  let tenantId: string
  if (tenant_slug) {
    const { data: t } = await supabase
      .from('tenants')
      .select('id')
      .or(`slug.eq.${tenant_slug},rental_portal_slug.eq.${tenant_slug}`)
      .maybeSingle()
    if (!t) throw createError({ statusCode: 404, statusMessage: 'Fahrschule nicht gefunden' })
    tenantId = t.id
  } else {
    tenantId = rentalUser.tenant_id
  }

  const { data: room } = await supabase
    .from('rooms')
    .select('id, name')
    .eq('id', room_id)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .in('visibility', ['public', 'link'])
    .maybeSingle()

  if (!room) throw createError({ statusCode: 404, statusMessage: 'Raum nicht gefunden' })

  const rangeStart = new Date(`${from}T00:00:00Z`)
  const rangeEnd = new Date(rangeStart)
  rangeEnd.setDate(rangeEnd.getDate() + 7)

  const { data: bookings } = await supabase
    .from('room_bookings')
    .select('start_time, end_time, purpose, booked_by')
    .eq('room_id', room_id)
    .neq('status', 'cancelled')
    .lt('start_time', rangeEnd.toISOString())
    .gte('end_time', from)

  const days: Record<string, { start: string; end: string; reason: string; own?: boolean }[]> = {}
  for (let i = 0; i < 7; i++) {
    const d = new Date(rangeStart)
    d.setDate(d.getDate() + i)
    days[d.toISOString().split('T')[0]] = []
  }

  for (const b of bookings || []) {
    for (const dayKey of Object.keys(days)) {
      const dayStart = new Date(`${dayKey}T00:00:00Z`)
      const dayEnd = new Date(`${dayKey}T23:59:59Z`)
      const blockStart = new Date(b.start_time)
      const blockEnd = new Date(b.end_time)
      if (blockEnd <= dayStart || blockStart >= dayEnd) continue
      const isOwn = b.booked_by === rentalUser.id
      days[dayKey].push({
        start: (blockStart < dayStart ? dayStart : blockStart).toISOString(),
        end: (blockEnd > dayEnd ? dayEnd : blockEnd).toISOString(),
        reason: isOwn ? 'Deine Buchung' : (b.purpose === 'course' ? 'Kurs' : 'Belegt'),
        own: isOwn,
      })
    }
  }

  return { success: true, room: { id: room.id, name: room.name }, from, days }
})
