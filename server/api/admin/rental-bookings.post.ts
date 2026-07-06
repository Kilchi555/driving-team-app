/**
 * POST /api/admin/rental-bookings
 * Confirm, cancel, or update payment status of a vehicle rental.
 * Body: { action: 'confirm'|'cancel'|'set_payment', rental_id, admin_notes?, payment_method?, payment_status? }
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { sendTenantEmail } from '~/server/utils/email'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()
  const { data: dbUser } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!dbUser || !['admin', 'superadmin'].includes(dbUser.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const body = await readBody(event)
  const { action, rental_id, admin_notes, payment_method, payment_status } = body

  if (!rental_id) throw createError({ statusCode: 400, statusMessage: 'rental_id is required' })

  // Fetch rental with renter info (new schema: renter_user_id → users)
  const { data: rental } = await supabase
    .from('vehicle_rentals')
    .select(`
      id, status, vehicle_booking_id, payment_status, payment_method,
      start_time, end_time, hourly_rate_rappen,
      renter_user_id,
      vehicles ( name, marke, modell ),
      users ( id, email, first_name, last_name )
    `)
    .eq('id', rental_id)
    .eq('tenant_id', dbUser.tenant_id)
    .single()

  if (!rental) throw createError({ statusCode: 404, statusMessage: 'Rental not found' })

  const renter = rental.users as any
  const vehicle = rental.vehicles as any
  const renterName = [renter?.first_name, renter?.last_name].filter(Boolean).join(' ') || renter?.email || 'Fahrlehrer'
  const vehicleLabel = vehicle ? ([vehicle.marke, vehicle.modell].filter(Boolean).join(' ') || vehicle.name || 'Fahrzeug') : 'Fahrzeug'

  const startDt = new Date(rental.start_time)
  const endDt = new Date(rental.end_time)
  const durationHours = (endDt.getTime() - startDt.getTime()) / 3_600_000
  const totalChf = (rental.hourly_rate_rappen * durationHours / 100).toFixed(2)
  const dateLabel = startDt.toLocaleDateString('de-CH', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeLabel = `${startDt.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}–${endDt.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}`

  // ── CONFIRM ────────────────────────────────────────────────────────────────
  if (action === 'confirm') {
    if (rental.status !== 'pending') {
      throw createError({ statusCode: 400, statusMessage: 'Nur ausstehende Buchungen können bestätigt werden' })
    }

    await supabase
      .from('vehicle_rentals')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString(), admin_notes: admin_notes || null })
      .eq('id', rental_id)

    if (rental.vehicle_booking_id) {
      await supabase.from('vehicle_bookings').update({ status: 'confirmed' }).eq('id', rental.vehicle_booking_id)
    }

    if (renter?.email) {
      await sendTenantEmail(dbUser.tenant_id, {
        to: renter.email,
        subject: `✅ Fahrzeugbuchung bestätigt – ${vehicleLabel}`,
        html: buildStatusEmail({
          renterName,
          vehicleLabel,
          dateLabel,
          timeLabel,
          totalChf,
          status: 'confirmed',
          adminNotes: admin_notes,
        }),
      }).catch(() => {})
    }

    return { success: true, message: 'Buchung bestätigt.' }
  }

  // ── CANCEL ─────────────────────────────────────────────────────────────────
  if (action === 'cancel') {
    await supabase
      .from('vehicle_rentals')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), admin_notes: admin_notes || null })
      .eq('id', rental_id)

    if (rental.vehicle_booking_id) {
      await supabase.from('vehicle_bookings').update({ status: 'cancelled' }).eq('id', rental.vehicle_booking_id)
    }

    if (renter?.email) {
      await sendTenantEmail(dbUser.tenant_id, {
        to: renter.email,
        subject: `❌ Fahrzeugbuchung abgelehnt – ${vehicleLabel}`,
        html: buildStatusEmail({
          renterName,
          vehicleLabel,
          dateLabel,
          timeLabel,
          totalChf,
          status: 'cancelled',
          adminNotes: admin_notes,
        }),
      }).catch(() => {})
    }

    return { success: true, message: 'Buchung storniert.' }
  }

  // ── SET PAYMENT ─────────────────────────────────────────────────────────────
  if (action === 'set_payment') {
    if (!payment_status) throw createError({ statusCode: 400, statusMessage: 'payment_status is required' })

    await supabase
      .from('vehicle_rentals')
      .update({
        payment_status,
        payment_method: payment_method || null,
        admin_notes: admin_notes || null,
      })
      .eq('id', rental_id)

    return { success: true, message: 'Zahlungsstatus aktualisiert.' }
  }

  throw createError({ statusCode: 400, statusMessage: 'Unknown action' })
})

function buildStatusEmail(p: {
  renterName: string
  vehicleLabel: string
  dateLabel: string
  timeLabel: string
  totalChf: string
  status: 'confirmed' | 'cancelled'
  adminNotes?: string
}): string {
  const isConfirmed = p.status === 'confirmed'

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.wrap{max-width:540px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.07)}
.header{padding:28px 32px;text-align:center}
.header h1{margin:0;color:#fff;font-size:20px;font-weight:700}
.body{padding:32px}
.detail{margin-bottom:12px}
.label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;margin-bottom:2px}
.value{font-size:15px;color:#111827}
.box{background:#f9fafb;border-radius:10px;padding:18px 22px;margin:20px 0}
.note{background:#fef3c7;border-radius:10px;padding:14px 18px;margin:16px 0;font-size:14px;color:#78350f}
.footer{border-top:1px solid #f3f4f6;padding:18px 32px;font-size:12px;color:#9ca3af;text-align:center}
</style></head>
<body><div class="wrap">
  <div class="header" style="background:${isConfirmed ? '#059669' : '#dc2626'}">
    <h1>${isConfirmed ? '✅ Buchung bestätigt' : '❌ Buchung abgelehnt'}</h1>
  </div>
  <div class="body">
    <p style="font-size:15px;color:#374151;margin:0 0 20px">Hallo ${p.renterName},</p>
    <p style="font-size:15px;color:#374151;margin:0 0 20px">
      ${isConfirmed
        ? 'deine Fahrzeugbuchung wurde bestätigt. Das Fahrzeug steht dir zur vereinbarten Zeit zur Verfügung.'
        : 'leider konnten wir deine Buchungsanfrage nicht bestätigen. Bitte buche einen anderen Zeitraum.'}
    </p>
    <div class="box">
      <div class="detail"><div class="label">Fahrzeug</div><div class="value">${p.vehicleLabel}</div></div>
      <div class="detail"><div class="label">Datum</div><div class="value">${p.dateLabel}</div></div>
      <div class="detail"><div class="label">Zeit</div><div class="value">${p.timeLabel}</div></div>
      ${isConfirmed ? `<div class="detail"><div class="label">Betrag</div><div class="value">CHF ${p.totalChf}</div></div>` : ''}
    </div>
    ${p.adminNotes ? `<div class="note"><strong>${isConfirmed ? 'Hinweis' : 'Begründung'}:</strong> ${p.adminNotes}</div>` : ''}
  </div>
  <div class="footer">Powered by Simy.ch</div>
</div></body></html>`
}
