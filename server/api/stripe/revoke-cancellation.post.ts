import Stripe from 'stripe'
import { getSupabaseAdmin } from '~/utils/supabase'
import { sendEmail } from '~/server/utils/email'

export default defineEventHandler(async (event) => {
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  if (!stripeSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Stripe not configured' })
  }

  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()
  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { data: userRow } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!userRow?.tenant_id || userRow.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Only admins can revoke cancellations' })
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('stripe_subscription_id, subscription_cancel_at, name, contact_email, subscription_plan')
    .eq('id', userRow.tenant_id)
    .single()

  if (!tenant?.stripe_subscription_id) {
    throw createError({ statusCode: 400, statusMessage: 'No active subscription found' })
  }

  if (!tenant.subscription_cancel_at) {
    throw createError({ statusCode: 409, statusMessage: 'No scheduled cancellation to revoke' })
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' as any })

  await stripe.subscriptions.update(tenant.stripe_subscription_id, {
    cancel_at: null,
  } as any)

  await supabase
    .from('tenants')
    .update({ subscription_cancel_at: null })
    .eq('id', userRow.tenant_id)

  if (tenant?.contact_email) {
    const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'https://app.simy.ch'
    const tenantName = tenant.name || 'Fahrschule'

    sendEmail({
      to: tenant.contact_email,
      senderName: 'Simy',
      subject: 'Kündigung widerrufen – Dein Simy-Abo bleibt aktiv',
      html: `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
        <tr><td style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08)">
          <div style="background:linear-gradient(135deg,#059669,#10b981);padding:32px;border-radius:12px 12px 0 0;text-align:center">
            <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">Kündigung widerrufen</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,.8);font-size:14px">Dein Abo läuft weiter</p>
          </div>
          <div style="padding:32px">
            <p style="color:#111827;font-size:15px;margin:0 0 12px">Hallo <strong>${tenantName}</strong>,</p>
            <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">
              Deine Kündigung wurde erfolgreich widerrufen. Dein Simy-Abonnement läuft wie gewohnt weiter.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td align="center" style="padding:16px 0">
                <a href="${baseUrl}/admin/billing"
                   style="display:inline-block;background:linear-gradient(135deg,#6000BD,#8B2FE8);color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:600">
                  Zum Abonnement →
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
</body></html>`,
    }).catch(e => console.error('Failed to send revoke-cancellation email:', e))
  }

  return { success: true, message: 'Kündigung erfolgreich widerrufen. Dein Abo läuft weiter.' }
})
