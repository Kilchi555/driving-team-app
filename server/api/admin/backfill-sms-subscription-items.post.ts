/**
 * POST /api/admin/backfill-sms-subscription-items
 *
 * Attaches STRIPE_PRICE_ADDON_SMS_OVERAGE (metered) to every active tenant
 * Stripe subscription that does not already have it, and caches the item id.
 * Admin / superadmin only.
 */
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getSmsOveragePriceId } from '~/utils/planFeatures'
import { ensureSmsOverageSubscriptionItem } from '~/server/utils/sms-stripe'
import Stripe from 'stripe'

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

  // Restrict to platform operators: only superadmin, or admin on driving-team tenant
  if (dbUser.role !== 'superadmin') {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('slug')
      .eq('id', dbUser.tenant_id)
      .single()
    if (tenant?.slug !== 'driving-team') {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }
  }

  const priceId = getSmsOveragePriceId()
  if (!priceId) {
    throw createError({ statusCode: 500, statusMessage: 'STRIPE_PRICE_ADDON_SMS_OVERAGE not configured' })
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim()
  if (!stripeSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Stripe not configured' })
  }
  const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' as any })

  // Verify price exists in this Stripe mode
  try {
    await stripe.prices.retrieve(priceId)
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `SMS overage price not found in this Stripe mode: ${err?.message || err}`,
    })
  }

  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('id, slug, name, stripe_subscription_id, stripe_sms_subscription_item_id, subscription_plan')
    .not('stripe_subscription_id', 'is', null)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const results: Array<{ slug: string; status: string; itemId?: string; error?: string }> = []
  let attached = 0
  let already = 0
  let skipped = 0
  let failed = 0

  for (const t of tenants || []) {
    try {
      const sub = await stripe.subscriptions.retrieve(t.stripe_subscription_id!, {
        expand: ['items.data.price'],
      })
      if (['canceled', 'incomplete_expired'].includes(sub.status)) {
        skipped++
        results.push({ slug: t.slug || t.id, status: `skipped_${sub.status}` })
        continue
      }

      const existing = sub.items.data.find(i => i.price.id === priceId)
      if (existing) {
        if (t.stripe_sms_subscription_item_id !== existing.id) {
          await supabase
            .from('tenants')
            .update({ stripe_sms_subscription_item_id: existing.id })
            .eq('id', t.id)
        }
        already++
        results.push({ slug: t.slug || t.id, status: 'already', itemId: existing.id })
        continue
      }

      const itemId = await ensureSmsOverageSubscriptionItem({
        subscriptionId: t.stripe_subscription_id!,
        supabase,
        tenantId: t.id,
        cachedItemId: t.stripe_sms_subscription_item_id,
      })
      if (!itemId) throw new Error('Failed to attach SMS overage item')
      attached++
      results.push({ slug: t.slug || t.id, status: 'attached', itemId })
    } catch (err: any) {
      failed++
      results.push({ slug: t.slug || t.id, status: 'failed', error: err?.message || String(err) })
    }
  }

  return {
    success: true,
    summary: { attached, already, skipped, failed, total: tenants?.length || 0 },
    results,
  }
})
