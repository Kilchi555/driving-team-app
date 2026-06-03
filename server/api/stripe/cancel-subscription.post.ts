import Stripe from 'stripe'
import { getSupabaseAdmin } from '~/utils/supabase'
import { sendEmail } from '~/server/utils/email'
import { getAuthenticatedUser } from '~/server/utils/auth'

// Cancels the subscription with 1-month notice, effective end of the month
// after the notice period (e.g. cancel on Apr 15 → effective May 31)
export default defineEventHandler(async (event) => {
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  if (!stripeSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Stripe not configured' })
  }

  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()
  const tenantId = authUser.tenant_id || authUser.profile?.tenant_id
  const userRole = authUser.role || authUser.profile?.role

  if (!tenantId || userRole !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Only admins can cancel subscriptions' })
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('stripe_subscription_id, subscription_cancel_at, name, contact_email, subscription_plan')
    .eq('id', tenantId)
    .single()

  if (!tenant?.stripe_subscription_id) {
    throw createError({ statusCode: 400, statusMessage: 'No active subscription found' })
  }

  if (tenant.subscription_cancel_at) {
    throw createError({ statusCode: 409, statusMessage: 'Cancellation already scheduled' })
  }

  // ── Calculate cancel_at: end of month, at least 1 month from now ────────
  const cancelAt = calculateCancelAt()

  const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' })

  await stripe.subscriptions.update(tenant.stripe_subscription_id, {
    cancel_at: Math.floor(cancelAt.getTime() / 1000),
  })

  await supabase
    .from('tenants')
    .update({ subscription_cancel_at: cancelAt.toISOString() })
    .eq('id', tenantId)

  // Send confirmation email to tenant
  if (tenant?.contact_email) {
    const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'https://app.simy.ch'
    const tenantName = tenant.name || 'Fahrschule'
    const cancelDateStr = formatDate(cancelAt)

    sendEmail({
      to: tenant.contact_email,
      senderName: 'Simy',
      subject: `Kündigung bestätigt – Abo läuft bis ${cancelDateStr}`,
      html: `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
        <tr><td style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08)">
          <div style="background:linear-gradient(135deg,#374151,#1f2937);padding:32px;border-radius:12px 12px 0 0;text-align:center">
            <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">Kündigung bestätigt</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,.7);font-size:14px">Simy · ${tenant.subscription_plan}</p>
          </div>
          <div style="padding:32px">
            <p style="color:#111827;font-size:15px;margin:0 0 12px">Hallo <strong>${tenantName}</strong>,</p>
            <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">
              Deine Kündigung des Simy-Abonnements wurde erfolgreich verarbeitet.
            </p>
            <div style="background:#f0fdf4;border-left:4px solid #16a34a;border-radius:4px;padding:14px 16px;margin:20px 0">
              <p style="margin:0;color:#15803d;font-size:14px;font-weight:600">
                Dein Abo bleibt bis <strong>${cancelDateStr}</strong> vollständig aktiv.
              </p>
            </div>
            <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">
              Bis zu diesem Datum hast du weiterhin vollen Zugang zu allen Funktionen. Nach Ablauf werden deine Daten noch 30 Tage aufbewahrt.
            </p>
            <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px">
              Du möchtest doch bleiben? Die Kündigung kann bis ${cancelDateStr} jederzeit widerrufen werden.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td align="center" style="padding:0 0 8px">
                <a href="${baseUrl}/admin/billing"
                   style="display:inline-block;background:linear-gradient(135deg,#6000BD,#8B2FE8);color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:600">
                  Kündigung rückgängig machen
                </a>
              </td>
            </tr></table>
            <p style="color:#6b7280;font-size:13px;text-align:center;margin:16px 0 0">
              Fragen? <a href="mailto:support@simy.ch" style="color:#6000BD">support@simy.ch</a>
            </p>
          </div>
          <div style="background:#f9fafb;padding:14px 28px;text-align:center;border-top:1px solid #e5e7eb">
            <p style="margin:0;font-size:12px;color:#9ca3af">Simy.ch · support@simy.ch</p>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
    }).catch(e => console.error('Failed to send cancellation email:', e))
  }

  return {
    success: true,
    cancel_at: cancelAt.toISOString(),
    message: `Kündigung bestätigt. Abo läuft bis ${formatDate(cancelAt)}.`,
  }
})

// End of month, at least 1 full month from today
// e.g. today=Apr 15 → earliest cancel = May 15 → end of May = May 31
// e.g. today=Apr 1  → earliest cancel = May 1  → end of May = May 31
function calculateCancelAt(): Date {
  const now = new Date()
  // Add 1 month
  const oneMonthLater = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
  // Go to end of that month (day 0 of next month = last day of current month)
  const endOfMonth = new Date(oneMonthLater.getFullYear(), oneMonthLater.getMonth() + 1, 0, 23, 59, 59)
  return endOfMonth
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('de-CH', { day: '2-digit', month: 'long', year: 'numeric' })
}
