import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendSMS } from '~/server/utils/sms'
import { sendTenantEmail } from '~/server/utils/email'
import { logger } from '~/utils/logger'
import { cancelResourceBookingsForAppointment } from '~/server/utils/resource-bookings'

/**
 * POST /api/medical-certificate/approve-and-cancel
 * Genehmigt das Arztzeugnis, storniert den Termin ohne Kostenfolge
 * und schickt eine Benachrichtigung (E-Mail oder SMS).
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()
  const { appointmentId, notes } = await readBody<{ appointmentId: string; notes?: string }>(event)

  if (!appointmentId) throw createError({ statusCode: 400, statusMessage: 'appointmentId required' })

  // 1. Load appointment + user + payment
  const { data: appt, error: apptErr } = await supabase
    .from('appointments')
    .select('id, user_id, tenant_id, start_time, medical_certificate_status, medical_certificate_url, status')
    .eq('id', appointmentId)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (apptErr || !appt) throw createError({ statusCode: 404, statusMessage: 'Appointment not found' })
  if (!appt.medical_certificate_url) throw createError({ statusCode: 400, statusMessage: 'Kein Arztzeugnis hochgeladen' })

  const [{ data: user }, { data: tenant }, { data: payments }] = await Promise.all([
    supabase.from('users').select('first_name, last_name, email, phone').eq('id', appt.user_id).single(),
    supabase.from('tenants').select('name, from_email, resend_domain_verified, twilio_from_sender').eq('id', profile.tenant_id).single(),
    supabase.from('payments').select('id, payment_status, total_amount_rappen').eq('appointment_id', appointmentId).order('created_at', { ascending: false }).limit(1),
  ])

  const payment = payments?.[0]

  // 2. Approve medical certificate
  await supabase.from('appointments').update({
    medical_certificate_status: 'approved',
    medical_certificate_reviewed_by: profile.id,
    medical_certificate_reviewed_at: new Date().toISOString(),
    medical_certificate_notes: notes || null,
    ...(appt.status !== 'cancelled' ? { status: 'cancelled' } : {}),
  }).eq('id', appointmentId)

  // 3. Cancel payment without cost (set to cancelled if not already completed)
  if (payment && payment.payment_status !== 'completed') {
    await supabase.from('payments').update({ payment_status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', payment.id)
  }

  // 3b. Release vehicle/room reservations tied to this appointment
  if (appt.status !== 'cancelled') {
    await cancelResourceBookingsForAppointment(supabase, appointmentId, appt.tenant_id)
  }

  // 4. Send notification
  const tenantName = tenant?.name || 'Ihre Fahrschule'
  const firstName = user?.first_name || ''
  const apptDate = appt.start_time ? new Date(appt.start_time).toLocaleDateString('de-CH', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : ''
  const hasPaid = payment?.payment_status === 'completed'
  const amountChf = payment ? `CHF ${(payment.total_amount_rappen / 100).toFixed(2)}` : ''

  const smsText = `Hallo ${firstName}, dein Arztzeugnis wurde geprüft und genehmigt. Dein Termin${apptDate ? ` vom ${apptDate}` : ''} wurde ohne Kostenfolge storniert.${hasPaid ? ` Der Betrag von ${amountChf} wird dir gutgeschrieben.` : ''} Freundliche Grüsse, ${tenantName}`

  let notificationSent = false
  let notificationMethod = ''

  if (user?.email) {
    try {
      const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08)">
<tr><td style="background:linear-gradient(135deg,#16a34a,#15803d);padding:28px 32px;text-align:center;">
<h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">✅ Arztzeugnis genehmigt</h1></td></tr>
<tr><td style="padding:28px 32px;">
<p style="margin:0 0 12px;font-size:16px;color:#111">Hallo ${firstName},</p>
<p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
  Wir haben dein Arztzeugnis geprüft und <strong>genehmigt</strong>. 
  Dein Termin${apptDate ? ` vom <strong>${apptDate}</strong>` : ''} wurde <strong>ohne Kostenfolge storniert</strong>.
</p>
${hasPaid ? `<p style="margin:0 0 16px;font-size:15px;color:#374151;">Der bezahlte Betrag von <strong>${amountChf}</strong> wird dir gutgeschrieben oder zurückerstattet.</p>` : ''}
${notes ? `<div style="background:#f9fafb;border-left:3px solid #16a34a;padding:12px 16px;border-radius:4px;margin-bottom:16px;"><p style="margin:0;font-size:13px;color:#374151;">${notes}</p></div>` : ''}
<p style="margin:0;font-size:14px;color:#6b7280;">Bei Fragen stehen wir dir gerne zur Verfügung.</p>
</td></tr>
<tr><td style="background:#f3f4f6;padding:16px 32px;text-align:center;">
<p style="margin:0;font-size:12px;color:#9ca3af;">${tenantName}</p>
</td></tr>
</table></td></tr></table></body></html>`

      await sendTenantEmail(profile.tenant_id, {
        to: user.email,
        subject: `Arztzeugnis genehmigt – Termin storniert`,
        html,
        fromName: tenantName,
        fromEmail: tenant?.from_email,
        domainVerified: tenant?.resend_domain_verified,
      })
      notificationSent = true
      notificationMethod = 'email'
    } catch (e: any) {
      logger.warn('⚠️ Email failed, trying SMS:', e.message)
    }
  }

  if (!notificationSent && user?.phone) {
    try {
      await sendSMS({ to: user.phone, message: smsText, senderName: tenant?.twilio_from_sender || tenantName })
      notificationSent = true
      notificationMethod = 'sms'
    } catch (e: any) {
      logger.warn('⚠️ SMS also failed:', e.message)
    }
  }

  logger.info(`✅ approve-and-cancel: appointment=${appointmentId}, notification=${notificationMethod}`)

  return {
    success: true,
    notificationSent,
    notificationMethod,
    message: notificationSent
      ? `Genehmigt${hasPaid ? ` & ${amountChf} gutgeschrieben` : ''} · Benachrichtigung per ${notificationMethod === 'email' ? 'E-Mail' : 'SMS'} gesendet`
      : 'Genehmigt · Keine Benachrichtigung (keine Kontaktdaten)',
  }
})
