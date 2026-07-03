/**
 * Edge Function: send-registration-reminders
 *
 * Täglich via Cron ausführen (z.B. jeden Morgen um 08:00 Zürich-Zeit):
 *   0 6 * * *   (= 06:00 UTC = 08:00 CEST)
 *
 * Findet alle Schüler, die:
 * - onboarding_status = 'pending'
 * - noch nicht registriert (kein auth_user_id)
 * - E-Mail oder Telefon vorhanden
 * - vor >= reminder_days Tagen erstellt
 * - onboarding_reminder_count < 3 (max. 3 Erinnerungen)
 *
 * Pro Tenant wird die booking_policy gelesen und geprüft, ob
 * registration_reminder_enabled = true.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const resendApiKey = Deno.env.get('RESEND_API_KEY')!
const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')!
const twilioFromNumber = Deno.env.get('TWILIO_FROM_NUMBER') || '+41800000000'
const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://app.simy.ch'

const supabase = createClient(supabaseUrl, supabaseKey)

interface BookingPolicy {
  registration_reminder_enabled?: boolean
  registration_reminder_days?: number
  registration_reminder_email_enabled?: boolean
  registration_reminder_sms_enabled?: boolean
}

interface TenantRow {
  id: string
  name: string
  slug: string
  primary_color: string | null
  booking_policy: BookingPolicy | null
}

Deno.serve(async (req) => {
  // Allow manual trigger via POST (for testing), cron hits GET
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const results: Array<{ userId: string; tenantId: string; sent: string[]; skipped: string }> = []
  let totalSent = 0
  let totalSkipped = 0

  try {
    // 1. Load all active tenants with reminder enabled
    const { data: tenants, error: tenantErr } = await supabase
      .from('tenants')
      .select('id, name, slug, primary_color, booking_policy')
      .eq('is_active', true)

    if (tenantErr || !tenants?.length) {
      return new Response(JSON.stringify({ success: true, message: 'No tenants found', results }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    for (const tenant of tenants as TenantRow[]) {
      const policy = tenant.booking_policy ?? {}
      if (!policy.registration_reminder_enabled) continue

      const reminderDays = policy.registration_reminder_days ?? 7
      const emailEnabled = policy.registration_reminder_email_enabled !== false
      const smsEnabled = policy.registration_reminder_sms_enabled !== false

      // Cutoff: users created >= reminderDays ago
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - reminderDays)

      // 2. Find pending users for this tenant
      const { data: pendingUsers, error: usersErr } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, phone, onboarding_token, onboarding_reminder_count, created_at')
        .eq('tenant_id', tenant.id)
        .eq('onboarding_status', 'pending')
        .is('auth_user_id', null)
        .eq('is_active', true)
        .lt('created_at', cutoffDate.toISOString())
        .lt('onboarding_reminder_count', 3) // max 3 reminders

      if (usersErr || !pendingUsers?.length) continue

      for (const user of pendingUsers) {
        const sent: string[] = []
        const onboardingLink = `${appBaseUrl}/onboarding/${user.onboarding_token}`
        const firstName = user.first_name || 'Liebe/r Fahrschüler/in'

        // Send email reminder
        if (emailEnabled && user.email) {
          const emailSent = await sendReminderEmail({
            to: user.email,
            firstName,
            tenantName: tenant.name,
            tenantColor: tenant.primary_color || '#3B82F6',
            onboardingLink,
          })
          if (emailSent) sent.push('email')
        }

        // Send SMS reminder
        if (smsEnabled && user.phone) {
          const smsSent = await sendReminderSms({
            to: user.phone,
            firstName,
            tenantName: tenant.name,
            onboardingLink,
          })
          if (smsSent) sent.push('sms')
        }

        if (sent.length > 0) {
          // Update reminder tracking
          await supabase
            .from('users')
            .update({
              onboarding_reminder_sent_at: new Date().toISOString(),
              onboarding_reminder_count: (user.onboarding_reminder_count ?? 0) + 1,
            })
            .eq('id', user.id)

          results.push({ userId: user.id, tenantId: tenant.id, sent, skipped: '' })
          totalSent++
        } else {
          results.push({ userId: user.id, tenantId: tenant.id, sent: [], skipped: 'no_channel_available' })
          totalSkipped++
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, totalSent, totalSkipped, results }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('❌ send-registration-reminders error:', err)
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

async function sendReminderEmail(opts: {
  to: string
  firstName: string
  tenantName: string
  tenantColor: string
  onboardingLink: string
}): Promise<boolean> {
  try {
    const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
        <div style="background:${opts.tenantColor};border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
          <h1 style="color:#fff;margin:0;font-size:22px">${opts.tenantName}</h1>
        </div>
        <h2 style="color:#111827;font-size:18px">Hallo ${opts.firstName} 👋</h2>
        <p style="color:#374151;line-height:1.6">
          Du hast noch kein Profil in unserem System erstellt. Damit du deine Termine einsehen,
          Quittungen herunterladen und immer auf dem Laufenden bleiben kannst, bitten wir dich,
          die Registrierung abzuschliessen.
        </p>
        <p style="color:#374151;line-height:1.6">
          Es dauert nur wenige Sekunden!
        </p>
        <div style="text-align:center;margin:32px 0">
          <a href="${opts.onboardingLink}"
            style="background:${opts.tenantColor};color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">
            Jetzt registrieren →
          </a>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center">
          Dieser Link ist persönlich und nur für dich bestimmt. Bitte nicht weiterleiten.
        </p>
      </div>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${opts.tenantName} <noreply@simy.ch>`,
        to: [opts.to],
        subject: `Bitte registriere dich – ${opts.tenantName}`,
        html,
      }),
    })
    return res.ok
  } catch (err) {
    console.error('❌ Email send failed:', err)
    return false
  }
}

async function sendReminderSms(opts: {
  to: string
  firstName: string
  tenantName: string
  onboardingLink: string
}): Promise<boolean> {
  try {
    const body = `Hallo ${opts.firstName}! Bitte schliesse deine Registrierung bei ${opts.tenantName} ab: ${opts.onboardingLink}`

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`
    const params = new URLSearchParams({
      To: opts.to,
      From: twilioFromNumber,
      Body: body,
    })

    const res = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })
    return res.ok
  } catch (err) {
    console.error('❌ SMS send failed:', err)
    return false
  }
}
