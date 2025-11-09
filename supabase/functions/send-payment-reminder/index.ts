import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0"

interface ReminderRequestBody {
  paymentId?: string
  userId?: string
  tenantId?: string
  reminderNumber?: number
  manual?: boolean
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'noreply@drivingteam.ch'

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase configuration for edge function')
}

const supabase = createClient(SUPABASE_URL ?? '', SUPABASE_SERVICE_ROLE_KEY ?? '')

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString)
  const formatterDate = new Intl.DateTimeFormat('de-CH', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })

  const formatterTime = new Intl.DateTimeFormat('de-CH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })

  return {
    date: formatterDate.format(date),
    time: formatterTime.format(date)
  }
}

function generatePaymentReminderEmail(data: {
  customerName: string
  appointmentDate: string
  appointmentTime: string
  staffName: string
  amount: string
  dashboardLink: string
  tenantName: string
  reminderNumber: number
}) {
  const urgencyText = data.reminderNumber === 1
    ? 'Bitte bestätigen Sie Ihren Termin'
    : data.reminderNumber === 2
      ? 'Erinnerung: Bitte bestätigen Sie Ihren Termin'
      : 'Letzte Erinnerung: Bitte bestätigen Sie Ihren Termin'

  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Terminbestätigung erforderlich</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; margin-bottom: 20px;">
    <h1 style="color: #2563eb; margin-top: 0;">${urgencyText}</h1>
    
    <p>Hallo ${data.customerName},</p>
    
    <p>Sie haben einen Termin bei <strong>${data.tenantName}</strong> gebucht, der noch nicht bestätigt wurde.</p>
    
    <div style="background-color: white; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 5px;">
      <h3 style="margin-top: 0; color: #2563eb;">Termin-Details</h3>
      <p style="margin: 5px 0;"><strong>Datum:</strong> ${data.appointmentDate}</p>
      <p style="margin: 5px 0;"><strong>Zeit:</strong> ${data.appointmentTime}</p>
      <p style="margin: 5px 0;"><strong>Fahrlehrer:</strong> ${data.staffName}</p>
      <p style="margin: 5px 0;"><strong>Betrag:</strong> CHF ${data.amount}</p>
    </div>
    
    ${data.reminderNumber >= 3 ? `
    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 5px;">
      <p style="color: #dc2626; margin: 0;"><strong>⚠️ Wichtig:</strong> Bitte bestätigen Sie Ihren Termin so bald wie möglich. Unbestätigte Termine können automatisch storniert werden.</p>
    </div>
    ` : ''}
    
    <p>Bitte bestätigen Sie Ihren Termin, indem Sie auf den folgenden Button klicken:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.dashboardLink}" 
         style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        Termin jetzt bestätigen
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666;">
      Oder kopieren Sie diesen Link in Ihren Browser:<br>
      <a href="${data.dashboardLink}" style="color: #2563eb; word-break: break-all;">${data.dashboardLink}</a>
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #999;">
      Diese E-Mail wurde automatisch generiert. Bei Fragen wenden Sie sich bitte direkt an ${data.tenantName}.
    </p>
  </div>
</body>
</html>
  `.trim()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: jsonHeaders
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: jsonHeaders
    })
  }

  try {
    const body = (await req.json()) as ReminderRequestBody
    const { paymentId, userId, tenantId, reminderNumber: explicitReminder, manual = false } = body

    if (!paymentId || !userId || !tenantId) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Missing required fields: paymentId, userId, tenantId'
      }), {
        status: 400,
        headers: jsonHeaders
      })
    }

    if (!RESEND_API_KEY) {
      console.log('ℹ️ Skipping reminder email: RESEND_API_KEY not configured (edge function)')
      return new Response(JSON.stringify({
        success: true,
        message: 'Reminder skipped (email not configured)',
        emailSent: false
      }), {
        status: 200,
        headers: jsonHeaders
      })
    }

    // Load payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, appointment_id, total_amount_rappen, reminder_count, first_reminder_sent_at, last_reminder_sent_at')
      .eq('id', paymentId)
      .single()

    if (paymentError || !payment) {
      console.error('❌ Payment not found:', paymentError)
      return new Response(JSON.stringify({
        success: false,
        message: 'Payment not found'
      }), {
        status: 404,
        headers: jsonHeaders
      })
    }

    // Load appointment with staff info
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        id,
        start_time,
        staff_id,
        users!appointments_staff_id_fkey (
          first_name,
          last_name
        )
      `)
      .eq('id', payment.appointment_id)
      .single()

    if (appointmentError || !appointment) {
      console.error('❌ Appointment not found:', appointmentError)
      return new Response(JSON.stringify({
        success: false,
        message: 'Appointment not found'
      }), {
        status: 404,
        headers: jsonHeaders
      })
    }

    // Load user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('first_name, last_name, email, phone')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      console.error('❌ User not found:', userError)
      return new Response(JSON.stringify({
        success: false,
        message: 'User not found'
      }), {
        status: 404,
        headers: jsonHeaders
      })
    }

    if (!user.email) {
      console.warn('⚠️ User has no email, skipping reminder')
      return new Response(JSON.stringify({
        success: true,
        message: 'User has no email, reminder skipped',
        emailSent: false
      }), {
        status: 200,
        headers: jsonHeaders
      })
    }

    // Load tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name, slug, contact_email, contact_phone')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenant) {
      console.error('❌ Tenant not found:', tenantError)
      return new Response(JSON.stringify({
        success: false,
        message: 'Tenant not found'
      }), {
        status: 404,
        headers: jsonHeaders
      })
    }

    const { date: appointmentDate, time: appointmentTime } = formatDateTime(appointment.start_time)
    const staffMember = Array.isArray(appointment.users) ? appointment.users[0] : appointment.users
    const staffName = staffMember
      ? `${staffMember.first_name} ${staffMember.last_name}`
      : 'Ihr Fahrlehrer'

    const amount = (payment.total_amount_rappen / 100).toFixed(2)
    const customerName = `${user.first_name} ${user.last_name}`
    const dashboardLink = `https://${tenant.slug}.drivingteam.ch/customer-dashboard`

    // Determine reminder number
    let reminderNumber = explicitReminder
    if (!reminderNumber) {
      const currentCount = payment.reminder_count ?? 0
      reminderNumber = currentCount + 1
    }

    const emailHtml = generatePaymentReminderEmail({
      customerName,
      appointmentDate,
      appointmentTime,
      staffName,
      amount,
      dashboardLink,
      tenantName: tenant.name,
      reminderNumber
    })

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: user.email,
        subject: `Terminbestätigung erforderlich - ${tenant.name}`,
        html: emailHtml
      })
    })

    if (!emailResponse.ok) {
      const errorBody = await emailResponse.text()
      console.error('❌ Resend API error:', emailResponse.status, errorBody)

      await supabase.from('payment_reminders').insert({
        payment_id: paymentId,
        reminder_type: 'email',
        reminder_number: reminderNumber,
        status: 'failed',
        error_message: `Resend error: ${errorBody}`,
        metadata: {
          manual,
          to: user.email
        }
      })

      return new Response(JSON.stringify({
        success: false,
        message: 'Failed to send reminder email'
      }), {
        status: 500,
        headers: jsonHeaders
      })
    }

    const emailResult = await emailResponse.json().catch(() => ({}))

    await supabase.from('payment_reminders').insert({
      payment_id: paymentId,
      reminder_type: 'email',
      reminder_number: reminderNumber,
      status: 'sent',
      metadata: {
        manual,
        message_id: emailResult?.id ?? null,
        to: user.email
      }
    })

    const nowIso = new Date().toISOString()
    const updatePayload: Record<string, any> = {
      last_reminder_sent_at: nowIso,
      reminder_count: reminderNumber
    }

    if (!payment.first_reminder_sent_at) {
      updatePayload.first_reminder_sent_at = nowIso
    }

    await supabase
      .from('payments')
      .update(updatePayload)
      .eq('id', paymentId)

    console.log(`✅ Reminder email sent for payment ${paymentId} (reminder #${reminderNumber})`)

    return new Response(JSON.stringify({
      success: true,
      message: 'Reminder sent successfully',
      emailSent: true,
      reminderNumber
    }), {
      status: 200,
      headers: jsonHeaders
    })
  } catch (error) {
    console.error('❌ Unexpected error in send-payment-reminder function:', error)

    return new Response(JSON.stringify({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: jsonHeaders
    })
  }
})

