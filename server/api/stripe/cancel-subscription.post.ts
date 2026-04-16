import Stripe from 'stripe'
import { getSupabaseAdmin } from '~/utils/supabase'

// Cancels the subscription with 1-month notice, effective end of the month
// after the notice period (e.g. cancel on Apr 15 → effective May 31)
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
    throw createError({ statusCode: 403, statusMessage: 'Only admins can cancel subscriptions' })
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('stripe_subscription_id, subscription_cancel_at')
    .eq('id', userRow.tenant_id)
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
    .eq('id', userRow.tenant_id)

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
