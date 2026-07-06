/**
 * POST /api/rentals/book-room
 * Book a public room. Requires an active Simy session.
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { getRentalUser } from '~/server/utils/rental-auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendTenantEmail } from '~/server/utils/email'

export default defineEventHandler(async (event) => {
  const rentalUser = await getRentalUser(event)
  const { room_id, tenant_slug, start_time, end_time, pricing_tier_type, notes } = await readBody(event)
  const tierType: string = pricing_tier_type || 'hourly'

  if (!room_id || !start_time || !end_time) {
    throw createError({ statusCode: 400, statusMessage: 'room_id, start_time and end_time are required' })
  }

  const start = new Date(start_time)
  const end = new Date(end_time)
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültiger Zeitraum' })
  }
  if (start < new Date()) {
    throw createError({ statusCode: 400, statusMessage: 'Buchungen in der Vergangenheit sind nicht möglich.' })
  }

  const supabase = getSupabaseAdmin()

  let tenantId: string
  if (tenant_slug) {
    const { data: t } = await supabase
      .from('tenants')
      .select('id, name, contact_email')
      .or(`slug.eq.${tenant_slug},rental_portal_slug.eq.${tenant_slug}`)
      .maybeSingle()
    if (!t) throw createError({ statusCode: 404, statusMessage: 'Fahrschule nicht gefunden' })
    tenantId = t.id
  } else {
    tenantId = rentalUser.tenant_id
  }

  const { data: room } = await supabase
    .from('rooms')
    .select('id, name, hourly_rate_rappen, pricing_tiers')
    .eq('id', room_id)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .in('visibility', ['public', 'link'])
    .maybeSingle()

  if (!room) throw createError({ statusCode: 404, statusMessage: 'Raum nicht gefunden oder nicht buchbar.' })

  // Conflict check
  const { data: conflicts } = await supabase
    .from('room_bookings')
    .select('id')
    .eq('room_id', room_id)
    .neq('status', 'cancelled')
    .lt('start_time', end.toISOString())
    .gt('end_time', start.toISOString())

  if (conflicts && conflicts.length > 0) {
    throw createError({ statusCode: 409, statusMessage: 'Dieser Raum ist im gewählten Zeitraum bereits belegt.' })
  }

  // Compute price
  const pricingTiers: any[] = room.pricing_tiers ?? []
  const selectedTier = pricingTiers.find((t: any) => t.type === tierType && t.enabled)
  const durationHrs = (end.getTime() - start.getTime()) / 3_600_000
  let totalRappen: number
  if (selectedTier) {
    totalRappen = ['half_day', 'full_day'].includes(tierType)
      ? selectedTier.rate_rappen
      : Math.round(selectedTier.rate_rappen * durationHrs)
  } else {
    totalRappen = Math.round(room.hourly_rate_rappen * durationHrs)
  }

  // Create booking
  const { data: booking, error: bookingError } = await supabase
    .from('room_bookings')
    .insert({
      tenant_id: tenantId,
      room_id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      purpose: 'external',
      status: 'confirmed',
      booked_by: rentalUser.id,
      notes: notes || null,
      room_cost_rappen: totalRappen,
    })
    .select('id')
    .single()

  if (bookingError) throw createError({ statusCode: 500, statusMessage: 'Buchung konnte nicht gespeichert werden.' })

  // Email notifications
  const dateLabel = start.toLocaleDateString('de-CH', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeLabel = `${start.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}–${end.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}`
  const totalChf = (totalRappen / 100).toFixed(2)

  const { data: tenantRow } = await supabase
    .from('tenants')
    .select('name, contact_email')
    .eq('id', tenantId)
    .maybeSingle()

  sendTenantEmail(tenantId, {
    to: rentalUser.email,
    subject: `✅ Raumbuchung bestätigt – ${room.name}`,
    html: `<p>Hallo ${rentalUser.name || rentalUser.email},</p>
<p>deine Raumbuchung ist bestätigt:</p>
<ul><li><strong>Raum:</strong> ${room.name}</li><li><strong>Datum:</strong> ${dateLabel}</li><li><strong>Zeit:</strong> ${timeLabel}</li><li><strong>Betrag:</strong> CHF ${totalChf}</li></ul>
<p>${tenantRow?.name || ''}</p>`,
  }).catch(() => {})

  if (tenantRow?.contact_email) {
    sendTenantEmail(tenantId, {
      to: tenantRow.contact_email,
      subject: `🏢 Neue Raumbuchung von ${rentalUser.name}`,
      html: `<p>${rentalUser.name} (${rentalUser.email}) hat den Raum <strong>${room.name}</strong> gebucht: ${dateLabel}, ${timeLabel} – CHF ${totalChf}.</p>`,
    }).catch(() => {})
  }

  return {
    success: true,
    booking_id: booking.id,
    message: 'Raum erfolgreich gebucht!',
  }
})
