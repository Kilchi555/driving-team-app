/**
 * GET /api/rentals/week-availability?vehicle_id=<uuid>&from=YYYY-MM-DD&tenant_slug=<slug>
 *
 * Returns blocked time ranges for a vehicle for a 7-day window starting at `from`.
 * Requires an active Simy session.
 */
import { defineEventHandler, getQuery, createError } from 'h3'
import { getRentalUser } from '~/server/utils/rental-auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const rentalUser = await getRentalUser(event)
  const { vehicle_id, from, tenant_slug } = getQuery(event) as {
    vehicle_id?: string
    from?: string
    tenant_slug?: string
  }

  if (!vehicle_id || !from) {
    throw createError({ statusCode: 400, statusMessage: 'vehicle_id and from (YYYY-MM-DD) are required' })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    throw createError({ statusCode: 400, statusMessage: 'from must be in YYYY-MM-DD format' })
  }

  const supabase = getSupabaseAdmin()

  // Resolve tenant (vehicle may belong to a different tenant than the user)
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

  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('id, make, model, hourly_rate_rappen, rental_access')
    .eq('id', vehicle_id)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .in('rental_access', ['public', 'invite_only'])
    .maybeSingle()

  if (!vehicle) throw createError({ statusCode: 404, statusMessage: 'Vehicle not found' })

  const rangeStart = new Date(`${from}T00:00:00Z`)
  const rangeEnd = new Date(rangeStart)
  rangeEnd.setDate(rangeEnd.getDate() + 7)
  const rangeEndStr = rangeEnd.toISOString()

  const [{ data: bookings }, { data: rentals }] = await Promise.all([
    supabase
      .from('vehicle_bookings')
      .select('start_time, end_time, purpose')
      .eq('vehicle_id', vehicle_id)
      .neq('status', 'cancelled')
      .lt('start_time', rangeEndStr)
      .gte('end_time', from),
    supabase
      .from('vehicle_rentals')
      .select('start_time, end_time, renter_user_id')
      .eq('vehicle_id', vehicle_id)
      .neq('status', 'cancelled')
      .lt('start_time', rangeEndStr)
      .gte('end_time', from),
  ])

  const days: Record<string, { start: string; end: string; reason: string; own?: boolean }[]> = {}
  for (let i = 0; i < 7; i++) {
    const d = new Date(rangeStart)
    d.setDate(d.getDate() + i)
    days[d.toISOString().split('T')[0]] = []
  }

  const addBlock = (startISO: string, endISO: string, reason: string, own = false) => {
    for (const dayKey of Object.keys(days)) {
      const dayStart = new Date(`${dayKey}T00:00:00Z`)
      const dayEnd = new Date(`${dayKey}T23:59:59Z`)
      const blockStart = new Date(startISO)
      const blockEnd = new Date(endISO)
      if (blockEnd <= dayStart || blockStart >= dayEnd) continue
      days[dayKey].push({
        start: (blockStart < dayStart ? dayStart : blockStart).toISOString(),
        end: (blockEnd > dayEnd ? dayEnd : blockEnd).toISOString(),
        reason,
        own,
      })
    }
  }

  for (const b of bookings || []) {
    addBlock(b.start_time, b.end_time, b.purpose === 'external_rental' ? 'Externe Vermietung' : 'Schullektion')
  }
  for (const r of rentals || []) {
    addBlock(r.start_time, r.end_time, r.renter_user_id === rentalUser.id ? 'Deine Buchung' : 'Bereits gebucht', r.renter_user_id === rentalUser.id)
  }

  return {
    success: true,
    vehicle: {
      id: vehicle.id,
      label: `${vehicle.make} ${vehicle.model}`,
      hourly_rate_rappen: vehicle.hourly_rate_rappen,
    },
    from,
    days,
  }
})
