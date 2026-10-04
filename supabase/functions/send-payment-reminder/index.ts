import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0'
import {
  authorizeInternalEmail,
  bindPaymentReminder,
  escapeHtml,
  PLATFORM_FROM_EMAIL,
  INTERNAL_EMAIL_SECRET_HEADER,
  invalidRequestResponse,
  json,
  type ReminderPayment,
  type ReminderTenant,
  type ReminderUser,
  unableToSendResponse,
  unauthorizedResponse,
} from '../_shared/internal-email-auth.ts'

/**
 * Internal payment reminder. Requires x-simy-internal-email-secret.
 * Recipient, tenant, and amount are loaded from the payment row.
 * Caller-supplied userId or tenantId must match that row or the request is rejected.
 * Gateway JWT verification is not this control.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': `authorization, x-client-info, apikey, content-type, ${INTERNAL_EMAIL_SECRET_HEADER}`,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString)
  const formatterDate = new Intl.DateTimeFormat('de-CH', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const formatterTime = new Intl.DateTimeFormat('de-CH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return {
    date: formatterDate.format(date),
    time: formatterTime.format(date),
  }
}

export async function handlePaymentReminder(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Invalid request' }, 405, corsHeaders)
  }

  const allowed = await authorizeInternalEmail(
    req.headers.get(INTERNAL_EMAIL_SECRET_HEADER),
    Deno.env.get('SIMY_INTERNAL_EMAIL_SECRET'),
  )
  if (!allowed) {
    console.error('send-payment-reminder rejected: unauthorized')
    return unauthorizedResponse(corsHeaders)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim()
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim()
  const resendApiKey = Deno.env.get('RESEND_API_KEY')?.trim()
  const portalBase = (Deno.env.get('CUSTOMER_PORTAL_BASE_URL') ?? 'https://simy.ch').replace(/\/$/, '')
  if (!supabaseUrl || !serviceKey || !resendApiKey) {
    console.error('send-payment-reminder rejected: runtime is not configured')
    return unableToSendResponse(corsHeaders)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json() as Record<string, unknown>
  } catch {
    return invalidRequestResponse(corsHeaders)
  }

  const paymentId = typeof body.paymentId === 'string' ? body.paymentId.trim() : ''
  if (!/^[0-9a-f-]{36}$/i.test(paymentId)) return invalidRequestResponse(corsHeaders)

  const callerUserId = typeof body.userId === 'string' ? body.userId : null
  const callerTenantId = typeof body.tenantId === 'string' ? body.tenantId : null

  const supabase = createClient(supabaseUrl, serviceKey)
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('id, appointment_id, user_id, tenant_id, total_amount_rappen, reminder_count, first_reminder_sent_at, payment_status, payment_method')
    .eq('id', paymentId)
    .maybeSingle()

  if (paymentError || !payment) {
    console.error('send-payment-reminder rejected: payment not usable')
    return invalidRequestResponse(corsHeaders)
  }

  const row = payment as ReminderPayment & { first_reminder_sent_at: string | null }
  const { data: user } = await supabase
    .from('users')
    .select('id, tenant_id, email, first_name, last_name')
    .eq('id', row.user_id)
    .eq('tenant_id', row.tenant_id)
    .maybeSingle()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, slug')
    .eq('id', row.tenant_id)
    .maybeSingle()

  const bound = bindPaymentReminder(row, user as ReminderUser | null, tenant as ReminderTenant | null, {
    userId: callerUserId,
    tenantId: callerTenantId,
  })
  if (!bound.ok) {
    console.error('send-payment-reminder rejected: payment relationship failed')
    return invalidRequestResponse(corsHeaders)
  }

  const { data: appointment } = await supabase
    .from('appointments')
    .select('id, start_time, tenant_id, staff_id')
    .eq('id', row.appointment_id)
    .eq('tenant_id', bound.tenantId)
    .maybeSingle()

  if (!appointment?.start_time) {
    console.error('send-payment-reminder rejected: appointment relationship failed')
    return invalidRequestResponse(corsHeaders)
  }

  let staffName = 'Ihr Fahrlehrer'
  if (appointment.staff_id) {
    const { data: staff } = await supabase
      .from('users')
      .select('first_name, last_name, tenant_id')
      .eq('id', appointment.staff_id)
      .eq('tenant_id', bound.tenantId)
      .maybeSingle()
    if (staff?.first_name || staff?.last_name) {
      staffName = `${staff.first_name ?? ''} ${staff.last_name ?? ''}`.trim()
    }
  }

  const when = formatDateTime(appointment.start_time)
  const tenantName = ((tenant as ReminderTenant).name ?? 'Ihre Fahrschule').replace(/[\r\n]/g, ' ').trim() || 'Ihre Fahrschule'
  const customerName = `${(user as ReminderUser).first_name ?? ''} ${(user as ReminderUser).last_name ?? ''}`.trim() || 'Kunde'
  const amount = (bound.amountRappen / 100).toFixed(2)
  const dashboardLink = `${portalBase}/${(tenant as ReminderTenant).slug}`
  const reminderNumber = bound.reminderNumber

  const emailHtml = `<!DOCTYPE html>
<html lang="de">
<body>
  <p>Hallo ${escapeHtml(customerName)},</p>
  <p>Sie haben einen Termin bei <strong>${escapeHtml(tenantName)}</strong>, der noch nicht bestätigt wurde.</p>
  <p>Datum: ${escapeHtml(when.date)}</p>
  <p>Zeit: ${escapeHtml(when.time)}</p>
  <p>Fahrlehrer: ${escapeHtml(staffName)}</p>
  <p>Betrag: CHF ${escapeHtml(amount)}</p>
  <p><a href="${escapeHtml(dashboardLink)}">Termin jetzt bestätigen</a></p>
</body>
</html>`

  let emailResponse: Response
  try {
    emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: PLATFORM_FROM_EMAIL,
        to: bound.email,
        subject: `Terminbestätigung erforderlich - ${tenantName}`.slice(0, 200),
        html: emailHtml,
      }),
    })
  } catch {
    console.error('send-payment-reminder provider request failed')
    return unableToSendResponse(corsHeaders)
  }

  if (!emailResponse.ok) {
    console.error('send-payment-reminder provider rejected the message', { status: emailResponse.status })
    await supabase.from('payment_reminders').insert({
      payment_id: paymentId,
      reminder_type: 'email',
      reminder_number: reminderNumber,
      status: 'failed',
      error_message: 'provider rejected the message',
    })
    return unableToSendResponse(corsHeaders)
  }

  await supabase.from('payment_reminders').insert({
    payment_id: paymentId,
    reminder_type: 'email',
    reminder_number: reminderNumber,
    status: 'sent',
  })

  const nowIso = new Date().toISOString()
  const updatePayload: Record<string, string | number> = {
    last_reminder_sent_at: nowIso,
    reminder_count: reminderNumber,
  }
  if (!row.first_reminder_sent_at) updatePayload.first_reminder_sent_at = nowIso

  await supabase
    .from('payments')
    .update(updatePayload)
    .eq('id', paymentId)
    .eq('tenant_id', bound.tenantId)
    .eq('user_id', bound.userId)

  console.log('send-payment-reminder accepted', { reminderNumber })
  return json({ success: true, emailSent: true, reminderNumber }, 200, corsHeaders)
}

Deno.serve(handlePaymentReminder)
