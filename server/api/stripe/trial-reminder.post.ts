import { getSupabaseAdmin } from '~/utils/supabase'
import { sendEmail } from '~/server/utils/email'

// Endpoint for a cron job to send trial expiry warnings.
// Call daily via external cron (e.g. Vercel Cron, GitHub Actions, Supabase cron):
//   POST /api/stripe/trial-reminder
//   Authorization: Bearer <CRON_SECRET>
//
// Sends a warning email to tenants whose trial ends in exactly 7 days or 1 day.
export default defineEventHandler(async (event) => {
  // Simple secret check to prevent unauthorized calls
  const cronSecret = process.env.CRON_SECRET
  const authHeader = getHeader(event, 'authorization')

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()
  const now = new Date()

  // Find tenants with trials ending in 7 days (±12h window) or 1 day (±12h window)
  const windows = [
    { days: 7, label: '7 Tage' },
    { days: 1, label: '1 Tag' },
  ]

  let totalSent = 0
  const results: { tenantId: string; email: string; daysLeft: number; sent: boolean }[] = []

  for (const { days, label } of windows) {
    const windowStart = new Date(now.getTime() + (days - 0.5) * 24 * 60 * 60 * 1000)
    const windowEnd   = new Date(now.getTime() + (days + 0.5) * 24 * 60 * 60 * 1000)

    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, name, email, trial_ends_at, subscription_plan')
      .eq('is_trial', true)
      .gte('trial_ends_at', windowStart.toISOString())
      .lt('trial_ends_at', windowEnd.toISOString())
      .neq('subscription_plan', 'starter')   // exclude already-converted
      .neq('subscription_plan', 'professional')
      .neq('subscription_plan', 'enterprise')

    for (const tenant of tenants || []) {
      if (!tenant.email) continue

      const trialEnd = new Date(tenant.trial_ends_at!)
      const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'https://www.simy.ch'

      try {
        await sendEmail({
          to: tenant.email,
          subject: `Dein Simy Trial endet in ${label} – jetzt upgraden`,
          senderName: 'Simy',
          html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;font-family:Helvetica,Arial,sans-serif;background:#f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,.1);">
        <tr>
          <td style="background:linear-gradient(135deg,#6000BD,#8B2FE8);padding:40px 30px;border-radius:8px 8px 0 0;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:24px;">Dein Trial endet bald</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 30px;">
            <p style="color:#333;font-size:16px;">Hallo <strong>${tenant.name || 'Fahrschule'}</strong>,</p>
            <p style="color:#555;font-size:16px;">dein kostenloser Simy-Trial endet in <strong>${label}</strong> (${trialEnd.toLocaleDateString('de-CH')}).</p>
            <p style="color:#555;font-size:16px;">Um deine Daten und den Betrieb deiner Fahrschule ununterbrochen weiterzuführen, wähle jetzt deinen Plan:</p>
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td align="center" style="padding:20px 0;">
                <a href="${baseUrl}/upgrade"
                   style="display:inline-block;background:linear-gradient(135deg,#6000BD,#8B2FE8);color:#fff;text-decoration:none;padding:16px 40px;border-radius:6px;font-size:16px;font-weight:600;">
                  Jetzt Plan wählen →
                </a>
              </td>
            </tr></table>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:4px;margin:20px 0;">
              <tr><td style="padding:15px;">
                <p style="margin:0;color:#92400e;font-size:14px;">
                  <strong>Wichtig:</strong> Nach Ablauf des Trials wird der Zugang zur Plattform eingeschränkt. Deine Daten bleiben für 30 Tage erhalten.
                </p>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#f8f9fa;padding:20px 30px;border-radius:0 0 8px 8px;text-align:center;">
            <p style="margin:0;color:#6b7280;font-size:12px;">Simy · support@simy.ch · <a href="${baseUrl}/agb" style="color:#6b7280;">AGB</a> · <a href="${baseUrl}/datenschutz" style="color:#6b7280;">Datenschutz</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
        })
        totalSent++
        results.push({ tenantId: tenant.id, email: tenant.email, daysLeft, sent: true })
        console.log(`📧 Trial reminder sent to ${tenant.email} (${daysLeft} days left)`)
      } catch (err) {
        console.error(`❌ Failed to send trial reminder to ${tenant.email}:`, err)
        results.push({ tenantId: tenant.id, email: tenant.email, daysLeft, sent: false })
      }
    }
  }

  return { success: true, sent: totalSent, results }
})
