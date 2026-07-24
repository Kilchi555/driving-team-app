import Stripe from 'stripe'
import { getSupabaseAdmin } from '~/utils/supabase'
import { PLANS, ADDONS, type SubscriptionPlan } from '~/utils/planFeatures'
import { sendEmail } from '~/server/utils/email'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { syncFeatureFlags } from '~/server/utils/syncFeatureFlags'

interface UpdateBody {
  plan?: SubscriptionPlan
  addons?: {
    seats?: number    // total extra seats desired (on top of plan's included)
    courses?: boolean
    affiliate?: boolean
    gbp?: boolean
  }
  staffToDeactivate?: string[]
}

export default defineEventHandler(async (event) => {
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  if (!stripeSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Stripe not configured' })
  }

  // ── Auth ────────────────────────────────────────────────────────────────────
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()
  const tenantId = authUser.tenant_id || authUser.profile?.tenant_id
  const userRole = authUser.role || authUser.profile?.role

  if (!tenantId || userRole !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Only admins can update subscriptions' })
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('stripe_subscription_id, stripe_customer_id, subscription_plan, addon_seats, addon_courses_enabled, addon_affiliate_enabled, addon_gbp_enabled, name, contact_email')
    .eq('id', tenantId)
    .single()

  if (!tenant?.stripe_subscription_id) {
    throw createError({ statusCode: 400, statusMessage: 'No active subscription to update. Please subscribe first.' })
  }

  const body = await readBody<UpdateBody>(event)
  const staffToDeactivate = Array.isArray(body?.staffToDeactivate) ? body.staffToDeactivate : []
  const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' })

  // ── Fetch current subscription from Stripe ──────────────────────────────────
  const sub = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id, {
    expand: ['items.data.price'],
  })

  if (sub.status === 'canceled' || sub.status === 'incomplete_expired') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Subscription is already canceled',
      data: { code: 'subscription_canceled' },
    })
  }

  // ── Resolve desired state ────────────────────────────────────────────────────
  const MAX_ADDON_SEATS = 10
  const desiredPlan = (body.plan || tenant.subscription_plan || 'starter') as SubscriptionPlan
  const desiredSeats = Math.min(MAX_ADDON_SEATS, body.addons?.seats ?? tenant.addon_seats ?? 0)
  const desiredCourses = body.addons?.courses ?? tenant.addon_courses_enabled ?? false
  const desiredAffiliate = body.addons?.affiliate ?? tenant.addon_affiliate_enabled ?? false
  const desiredGbp = body.addons?.gbp ?? (tenant as any).addon_gbp_enabled ?? false

  const planDef = PLANS.find(p => p.id === desiredPlan)
  if (!planDef?.priceEnvKey) {
    throw createError({ statusCode: 400, statusMessage: `Unknown plan: ${desiredPlan}` })
  }

  // .trim() defensively against trailing newlines pasted into Vercel env vars.
  const planPriceId = process.env[planDef.priceEnvKey]?.trim()
  const seatPriceId = process.env[ADDONS.find(a => a.key === 'seats')!.priceEnvKey]?.trim()
  const coursesPriceId = process.env[ADDONS.find(a => a.key === 'courses')!.priceEnvKey]?.trim()
  const affiliatePriceId = process.env[ADDONS.find(a => a.key === 'affiliate')!.priceEnvKey]?.trim()
  const gbpPriceId = process.env[ADDONS.find(a => a.key === 'gbp')!.priceEnvKey]?.trim()

  if (!planPriceId) {
    throw createError({ statusCode: 500, statusMessage: `Missing env var ${planDef.priceEnvKey}` })
  }

  // ── Map current items by price ID ────────────────────────────────────────────
  const currentItems = sub.items.data
  const findItem = (priceId: string | undefined) =>
    priceId ? currentItems.find(i => i.price.id === priceId) : undefined

  const currentPlanItem = currentItems.find(i =>
    PLANS.some(p => p.priceEnvKey && process.env[p.priceEnvKey]?.trim() === i.price.id)
  )
  const currentSeatItem = findItem(seatPriceId)
  const currentCoursesItem = findItem(coursesPriceId)
  const currentAffiliateItem = findItem(affiliatePriceId)
  const currentGbpItem = findItem(gbpPriceId)

  // ── Build update params ──────────────────────────────────────────────────────
  const itemUpdates: Stripe.SubscriptionUpdateParams.Item[] = []

  // Plan item: swap price if changed, keep if same
  if (currentPlanItem) {
    if (currentPlanItem.price.id !== planPriceId) {
      // Upgrade/downgrade
      itemUpdates.push({ id: currentPlanItem.id, price: planPriceId, quantity: 1 })
    }
    // else: no change needed for plan
  } else {
    // No plan item found (shouldn't happen) — add it
    itemUpdates.push({ price: planPriceId, quantity: 1 })
  }

  // Seats add-on
  if (seatPriceId) {
    if (desiredSeats > 0) {
      if (currentSeatItem) {
        if (currentSeatItem.quantity !== desiredSeats) {
          itemUpdates.push({ id: currentSeatItem.id, quantity: desiredSeats })
        }
      } else {
        itemUpdates.push({ price: seatPriceId, quantity: desiredSeats })
      }
    } else if (currentSeatItem) {
      // Remove seats
      itemUpdates.push({ id: currentSeatItem.id, deleted: true })
    }
  }

  // Courses add-on
  if (coursesPriceId) {
    if (desiredCourses && !currentCoursesItem) {
      itemUpdates.push({ price: coursesPriceId, quantity: 1 })
    } else if (!desiredCourses && currentCoursesItem) {
      itemUpdates.push({ id: currentCoursesItem.id, deleted: true })
    }
  }

  // Affiliate add-on
  if (affiliatePriceId) {
    if (desiredAffiliate && !currentAffiliateItem) {
      itemUpdates.push({ price: affiliatePriceId, quantity: 1 })
    } else if (!desiredAffiliate && currentAffiliateItem) {
      itemUpdates.push({ id: currentAffiliateItem.id, deleted: true })
    }
  }

  // Google Business Profile add-on
  if (gbpPriceId) {
    if (desiredGbp && !currentGbpItem) {
      itemUpdates.push({ price: gbpPriceId, quantity: 1 })
    } else if (!desiredGbp && currentGbpItem) {
      itemUpdates.push({ id: currentGbpItem.id, deleted: true })
    }
  }

  if (itemUpdates.length === 0) {
    return { success: true, message: 'No changes detected', unchanged: true }
  }

  // ── Apply update with proration ─────────────────────────────────────────────
  let updatedSub: Stripe.Subscription
  try {
    updatedSub = await stripe.subscriptions.update(tenant.stripe_subscription_id, {
      items: itemUpdates,
      proration_behavior: 'create_prorations',
      metadata: {
        plan: desiredPlan,
        addon_seats: String(desiredSeats),
        addon_courses: String(desiredCourses),
        addon_affiliate: String(desiredAffiliate),
        addon_gbp: String(desiredGbp),
        tenant_id: tenantId,
      },
    })
  } catch (err: any) {
    console.error('❌ Stripe subscription update failed:', err?.message || err)
    throw createError({
      statusCode: 502,
      statusMessage: err?.message || 'Stripe-Abonnement konnte nicht aktualisiert werden',
    })
  }

  // ── Sync to DB immediately (webhook will also fire but this keeps UI snappy) ─
  // Basil API (2025-03-31+): current_period_end lives on subscription items, not the subscription.
  const currentPeriodEnd = resolveSubscriptionPeriodEnd(updatedSub)

  await supabase
    .from('tenants')
    .update({
      subscription_plan: desiredPlan,
      current_period_end: currentPeriodEnd,
      addon_seats: desiredSeats,
      addon_courses_enabled: desiredCourses,
      addon_affiliate_enabled: desiredAffiliate,
      addon_gbp_enabled: desiredGbp,
      is_trial: false,
    })
    .eq('id', tenantId)

  await syncFeatureFlags(supabase, tenantId, desiredPlan, {
    courses: desiredCourses,
    affiliate: desiredAffiliate,
    gbp: desiredGbp,
  })

  if (staffToDeactivate.length > 0) {
    const { error: deactivateError } = await supabase
      .from('users')
      .update({ is_active: false })
      .in('id', staffToDeactivate)
      .eq('tenant_id', tenantId)
    if (deactivateError) {
      console.error('⚠️ Failed to deactivate staff after subscription update:', deactivateError.message)
    } else {
      console.log(`🔒 Deactivated ${staffToDeactivate.length} staff for tenant ${tenantId}`)
    }
  }

  console.log(`✅ Subscription updated for tenant ${tenantId}: plan=${desiredPlan}, seats=+${desiredSeats}`)

  // Send plan change confirmation to tenant
  if (tenant?.contact_email) {
    const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'https://app.simy.ch'
    const tenantName = tenant.name || 'Fahrschule'
    const planName = PLANS.find(p => p.id === desiredPlan)?.name ?? desiredPlan
    const oldPlanName = PLANS.find(p => p.id === tenant.subscription_plan)?.name ?? tenant.subscription_plan ?? '–'
    const isUpgrade = PLANS.findIndex(p => p.id === desiredPlan) > PLANS.findIndex(p => p.id === tenant.subscription_plan)
    const changeLabel = isUpgrade ? 'Upgrade' : 'Änderung'
    const nextBillingStr = currentPeriodEnd
      ? new Date(currentPeriodEnd).toLocaleDateString('de-CH', { day: '2-digit', month: 'long', year: 'numeric' })
      : '–'

    const addonsText = [
      desiredSeats > 0 ? `${desiredSeats} Extra-Seat${desiredSeats !== 1 ? 's' : ''}` : '',
      desiredCourses ? 'Kursbuchungsseite' : '',
      desiredAffiliate ? 'Affiliate-System' : '',
      desiredGbp ? 'Google Business Profile' : '',
    ].filter(Boolean).join(', ')

    sendEmail({
      to: tenant.contact_email,
      senderName: 'Simy',
      subject: `Abonnement ${changeLabel} – ${oldPlanName} → ${planName}`,
      html: `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
        <tr><td style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08)">
          <div style="background:linear-gradient(135deg,#6000BD,#8B2FE8);padding:32px;border-radius:12px 12px 0 0;text-align:center">
            <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">Abonnement ${changeLabel}</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,.8);font-size:14px">${oldPlanName} → ${planName}</p>
          </div>
          <div style="padding:32px">
            <p style="color:#111827;font-size:15px;margin:0 0 12px">Hallo <strong>${tenantName}</strong>,</p>
            <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">
              Dein Simy-Abonnement wurde erfolgreich aktualisiert.
            </p>
            <div style="background:#f5f3ff;border-radius:8px;padding:18px 20px;margin:20px 0">
              <table width="100%" cellpadding="4">
                <tr>
                  <td style="font-size:13px;color:#6b7280">Neuer Plan</td>
                  <td style="font-size:15px;font-weight:700;color:#6000BD;text-align:right">${planName}</td>
                </tr>
                ${addonsText ? `<tr>
                  <td style="font-size:13px;color:#6b7280">Add-ons</td>
                  <td style="font-size:14px;color:#374151;text-align:right">${addonsText}</td>
                </tr>` : ''}
                <tr>
                  <td style="font-size:13px;color:#6b7280">Nächste Abrechnung</td>
                  <td style="font-size:14px;color:#374151;text-align:right">${nextBillingStr}</td>
                </tr>
              </table>
            </div>
            <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 24px">
              Die anteilsmässige Verrechnung für die Planänderung erscheint auf deiner nächsten Rechnung.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td align="center" style="padding:0 0 8px">
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
</body></html>`
    }).catch(e => console.error('Failed to send plan-change email:', e))
  }

  return {
    success: true,
    subscription_id: updatedSub.id,
    plan: desiredPlan,
    addons: { seats: desiredSeats, courses: desiredCourses, affiliate: desiredAffiliate },
    current_period_end: currentPeriodEnd,
    message: 'Abonnement erfolgreich aktualisiert. Anteilsmässige Verrechnung erfolgt auf der nächsten Rechnung.',
  }
})

/** Basil API: period end is on subscription items; fall back for older payloads. */
function resolveSubscriptionPeriodEnd(sub: Stripe.Subscription): string | null {
  const itemEnds = (sub.items?.data ?? [])
    .map((item) => (item as Stripe.SubscriptionItem).current_period_end)
    .filter((ts): ts is number => typeof ts === 'number' && Number.isFinite(ts))

  const periodEndTs =
    (itemEnds.length > 0 ? Math.max(...itemEnds) : null)
    ?? (sub as any).current_period_end
    ?? (sub as any).billing_cycle_anchor
    ?? null

  if (periodEndTs == null || !Number.isFinite(Number(periodEndTs))) return null
  return new Date(Number(periodEndTs) * 1000).toISOString()
}
