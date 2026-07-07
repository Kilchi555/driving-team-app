import Stripe from 'stripe'
import { getSupabaseAdmin } from '~/utils/supabase'
import {
  type SubscriptionPlan,
} from '~/utils/planFeatures'
import { syncFeatureFlags } from '~/server/utils/syncFeatureFlags'
import { sendEmail } from '~/server/utils/email'

export default defineEventHandler(async (event) => {
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripeSecret || !webhookSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Stripe not configured' })
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' })
  const rawBody = await readRawBody(event)
  const signature = getHeader(event, 'stripe-signature')

  if (!rawBody || !signature) {
    throw createError({ statusCode: 400, statusMessage: 'Missing body or signature' })
  }

  let stripeEvent: Stripe.Event
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err: any) {
    console.error('❌ Stripe webhook signature verification failed:', err.message)
    throw createError({ statusCode: 400, statusMessage: `Webhook Error: ${err.message}` })
  }

  console.log(`📨 Stripe webhook received: type="${stripeEvent.type}" livemode=${stripeEvent.livemode}`)

  const supabase = getSupabaseAdmin()

  try {
    switch (stripeEvent.type) {

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = stripeEvent.data.object as Stripe.Subscription
        await handleSubscriptionUpsert(supabase, stripe, sub)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = stripeEvent.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(supabase, sub)
        break
      }

      case 'checkout.session.completed': {
        const session = stripeEvent.data.object as Stripe.CheckoutSession
        if (session.mode === 'subscription' && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string)
          await handleSubscriptionUpsert(supabase, stripe, sub)
          // If Wallee was selected and subscription is trialing, send welcome + checklist email
          if (sub.metadata?.with_wallee === 'true' && sub.status === 'trialing') {
            await handleWalleeWelcomeEmail(supabase, sub)
          }
        }
        break
      }

      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        const invoice = stripeEvent.data.object as Stripe.Invoice
        const subscriptionId = (invoice as any).subscription as string | null | undefined
        const customerId = invoice.customer as string
        console.log(`🧾 invoice.paid: id=${invoice.id} subscription=${subscriptionId} customer=${customerId} amount=${invoice.amount_paid}`)

        let sub: Stripe.Subscription | null = null

        if (subscriptionId) {
          sub = await stripe.subscriptions.retrieve(subscriptionId)
        } else if (customerId) {
          // Fallback: invoice has no subscription ID (common for $0 trial invoices)
          // Look up the customer's active or trialing subscription directly
          const [active, trialing] = await Promise.all([
            stripe.subscriptions.list({ customer: customerId, status: 'active', limit: 1 }),
            stripe.subscriptions.list({ customer: customerId, status: 'trialing', limit: 1 }),
          ])
          sub = active.data[0] || trialing.data[0] || null
          console.log(`🔄 invoice.paid fallback: found sub via customer=${customerId} → ${sub?.id ?? 'none'}`)
        }

        if (sub) {
          await handleSubscriptionUpsert(supabase, stripe, sub)
          const tenantId = await getTenantIdByCustomer(supabase, customerId)
          if (tenantId) {
            await supabase
              .from('tenant_settings')
              .upsert({
                tenant_id: tenantId,
                category: 'billing',
                setting_key: 'subscription_status',
                setting_value: JSON.stringify({ status: 'active' }),
              }, { onConflict: 'tenant_id,setting_key' })

            // Only send a confirmation for real charges (skip $0 trial invoices)
            if (invoice.amount_paid > 0) {
              await sendPaymentConfirmationEmail(supabase, invoice, tenantId).catch(
                e => console.error('⚠️ Payment confirmation email failed (non-fatal):', e.message)
              )
            }
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = stripeEvent.data.object as Stripe.Invoice
        if (invoice.customer) {
          const tenantId = await getTenantIdByCustomer(supabase, invoice.customer as string)
          if (tenantId) {
            const failedAt = new Date().toISOString()

            // Mark tenant as past_due in tenant_settings so the UI can show a warning
            await supabase
              .from('tenant_settings')
              .upsert({
                tenant_id: tenantId,
                category: 'billing',
                setting_key: 'subscription_status',
                setting_value: JSON.stringify({ status: 'past_due', failed_at: failedAt }),
              }, { onConflict: 'tenant_id,setting_key' })

            // Notify Simy super-admin immediately
            const { data: tenant } = await supabase
              .from('tenants')
              .select('name, contact_email, subscription_plan, addon_seats, slug')
              .eq('id', tenantId)
              .single()

            const amountCHF = invoice.amount_due ? (invoice.amount_due / 100).toFixed(2) : '?'
            const tenantName = tenant?.name || tenantId
            const tenantEmail = tenant?.contact_email || '–'

            const attemptCount = (invoice as any).attempt_count ?? 1
            const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'https://app.simy.ch'

            // Notify Simy super-admin
            sendEmail({
              to: 'info@simy.ch',
              subject: `❌ Zahlung fehlgeschlagen – ${tenantName}`,
              html: `
                <h2 style="color:#dc2626">Stripe-Zahlung fehlgeschlagen</h2>
                <table cellpadding="6" style="border-collapse:collapse;font-size:14px">
                  <tr><td><strong>Tenant</strong></td><td>${tenantName}</td></tr>
                  <tr><td><strong>E-Mail</strong></td><td>${tenantEmail}</td></tr>
                  <tr><td><strong>Stripe Invoice ID</strong></td><td>${invoice.id}</td></tr>
                  <tr><td><strong>Betrag</strong></td><td>CHF ${amountCHF}</td></tr>
                  <tr><td><strong>Plan</strong></td><td>${tenant?.subscription_plan || '–'}</td></tr>
                  <tr><td><strong>Zeitpunkt</strong></td><td>${new Date(failedAt).toLocaleString('de-CH')}</td></tr>
                  <tr><td><strong>Versuch</strong></td><td>${attemptCount} / 4</td></tr>
                </table>
                <p style="margin-top:16px">
                  <a href="https://dashboard.stripe.com/invoices/${invoice.id}" style="color:#2563eb">Invoice in Stripe öffnen →</a>
                </p>`
            }).catch(e => console.error('Failed to send payment-failed simy email:', e))

            // Notify the tenant itself
            if (tenant?.contact_email) {
              sendEmail({
                to: tenant.contact_email,
                senderName: 'Simy',
                subject: '❌ Zahlung fehlgeschlagen – Bitte Zahlungsmethode aktualisieren',
                html: `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
        <tr><td style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08)">
          <div style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:32px;border-radius:12px 12px 0 0;text-align:center">
            <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">Zahlung fehlgeschlagen</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,.8);font-size:14px">Betrag: CHF ${amountCHF} · Versuch ${attemptCount} von 4</p>
          </div>
          <div style="padding:32px">
            <p style="color:#111827;font-size:15px;margin:0 0 12px">Hallo <strong>${tenantName}</strong>,</p>
            <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">
              Leider konnte deine Simy-Abonnementzahlung von <strong>CHF ${amountCHF}</strong> nicht verarbeitet werden.
            </p>
            <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">
              Stripe wird automatisch weitere ${4 - attemptCount} Versuche unternehmen. Um Unterbrechungen zu vermeiden, aktualisiere bitte jetzt deine Zahlungsmethode.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td align="center" style="padding:20px 0">
                <a href="${baseUrl}/admin/billing"
                   style="display:inline-block;background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:600">
                  Zahlungsmethode aktualisieren →
                </a>
              </td>
            </tr></table>
            <p style="color:#6b7280;font-size:13px;margin:0">Fragen? <a href="mailto:support@simy.ch" style="color:#6000BD">support@simy.ch</a></p>
          </div>
          <div style="background:#f9fafb;padding:14px 28px;text-align:center;border-top:1px solid #e5e7eb">
            <p style="margin:0;font-size:12px;color:#9ca3af">Simy.ch · support@simy.ch</p>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
              }).catch(e => console.error('Failed to send payment-failed tenant email:', e))
            }

            console.warn(`⚠️ Payment failed for tenant ${tenantId} (${tenantName}) – marked as past_due`)
          }
        }
        break
      }

      case 'customer.subscription.trial_will_end': {
        // Fires 3 days before a Stripe-managed trial ends.
        // We use our own trial system but handle this for future Stripe trial support.
        const sub = stripeEvent.data.object as Stripe.Subscription
        const tenantId = await getTenantIdByCustomer(supabase, sub.customer as string)
        if (tenantId) {
          await supabase
            .from('tenant_settings')
            .upsert({
              tenant_id: tenantId,
              category: 'billing',
              setting_key: 'subscription_status',
              setting_value: JSON.stringify({ status: 'trial_ending_soon' }),
            }, { onConflict: 'tenant_id,setting_key' })
          console.log(`📅 Trial ending soon for tenant ${tenantId}`)
        }
        break
      }

      default:
        console.log(`⏭️ Stripe event type "${stripeEvent.type}" not handled — skipping`)
        break
    }
  } catch (err: any) {
    console.error(`❌ Error handling Stripe event ${stripeEvent.type}:`, err)
    throw createError({ statusCode: 500, statusMessage: 'Webhook handler error' })
  }

  return { received: true }
})

// ─────────────────────────────────────────────────────────────────────────────

async function handleSubscriptionUpsert(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  stripe: Stripe,
  sub: Stripe.Subscription
) {
  const customerId = sub.customer as string
  console.log(`🔍 handleSubscriptionUpsert: sub.id=${sub.id}, customer=${customerId}, status=${sub.status}, metadata=${JSON.stringify(sub.metadata)}`)

  const tenantId = await resolveTenantId(supabase, customerId, sub)
  if (!tenantId) {
    console.error(`❌ No tenant found for Stripe customer ${customerId} — sub metadata: ${JSON.stringify(sub.metadata)}`)
    return
  }

  console.log(`✅ Resolved tenant: ${tenantId}`)

  // ── Resolve plan from metadata ──────────────────────────────────────────
  const plan = (sub.metadata?.plan || resolvePlanFromPrices(sub)) as SubscriptionPlan
  console.log(`📦 Resolved plan: "${plan}" (from metadata: "${sub.metadata?.plan}", from prices: "${resolvePlanFromPrices(sub)}")`)

  const periodEndTs = (sub as any).current_period_end ?? (sub as any).billing_cycle_anchor ?? null
  const currentPeriodEnd = periodEndTs != null && Number.isFinite(Number(periodEndTs))
    ? new Date(Number(periodEndTs) * 1000).toISOString()
    : null

  // ── Resolve add-ons from subscription items ─────────────────────────────
  const addonSeats = parseAddonSeats(sub)
  const addonCourses = hasAddonByEnvKey(sub, 'STRIPE_PRICE_ADDON_COURSES') ||
    sub.metadata?.addon_courses === 'true'
  const addonAffiliate = hasAddonByEnvKey(sub, 'STRIPE_PRICE_ADDON_AFFILIATE') ||
    sub.metadata?.addon_affiliate === 'true'
  const addonGbp = hasAddonByEnvKey(sub, 'STRIPE_PRICE_ADDON_GBP') ||
    sub.metadata?.addon_gbp === 'true'

  // cancel_at from Stripe (if scheduled)
  const cancelAtTs = (sub as any).cancel_at ?? null
  const cancelAt = cancelAtTs != null && Number.isFinite(Number(cancelAtTs))
    ? new Date(Number(cancelAtTs) * 1000).toISOString()
    : null

  // ── Update tenant ───────────────────────────────────────────────────────
  const isWalleeTrialing = sub.metadata?.with_wallee === 'true' && sub.status === 'trialing'
  const updatePayload = {
    stripe_subscription_id: sub.id,
    subscription_plan: plan,
    current_period_end: currentPeriodEnd,
    is_trial: false,
    addon_seats: addonSeats,
    addon_courses_enabled: addonCourses,
    addon_affiliate_enabled: addonAffiliate,
    addon_gbp_enabled: addonGbp,
    subscription_cancel_at: cancelAt,
    ...(isWalleeTrialing ? { wallee_trial_started_at: new Date().toISOString() } : {}),
  }

  console.log(`🔄 Updating tenant ${tenantId} with:`, JSON.stringify(updatePayload))

  const { error: updateError, count } = await supabase
    .from('tenants')
    .update(updatePayload)
    .eq('id', tenantId)
    .select('id', { count: 'exact', head: true })

  if (updateError) {
    console.error(`❌ Supabase tenant update FAILED for tenant ${tenantId}:`, JSON.stringify(updateError))
    throw new Error(`Supabase update failed: ${updateError.message}`)
  }

  if (count === 0) {
    console.error(`❌ Supabase update matched 0 rows for tenant_id=${tenantId} — does the tenant exist?`)
    throw new Error(`No tenant row updated for id=${tenantId}`)
  }

  console.log(`✅ Tenant ${tenantId} DB update successful (${count} row(s) updated)`)

  // ── Sync feature flags ──────────────────────────────────────────────────
  await syncFeatureFlags(supabase, tenantId, plan, { courses: addonCourses, affiliate: addonAffiliate, gbp: addonGbp })

  // ── Deactivate staff chosen by tenant during upgrade ────────────────────
  const staffToDeactivate = sub.metadata?.staff_to_deactivate
  if (staffToDeactivate) {
    const ids = staffToDeactivate.split(',').map(id => id.trim()).filter(Boolean)
    if (ids.length > 0) {
      await supabase
        .from('users')
        .update({ is_active: false })
        .in('id', ids)
        .eq('tenant_id', tenantId)
      console.log(`🔒 Deactivated ${ids.length} staff for tenant ${tenantId}:`, ids)
    }
  }

  console.log(`✅ Tenant ${tenantId} → plan=${plan} seats=+${addonSeats} courses=${addonCourses} affiliate=${addonAffiliate}`)
}

async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  sub: Stripe.Subscription
) {
  const customerId = sub.customer as string
  const tenantId = await getTenantIdByCustomer(supabase, customerId)
  if (!tenantId) return

  await supabase
    .from('tenants')
    .update({
      stripe_subscription_id: null,
      stripe_price_id: null,
      subscription_plan: 'trial',
      current_period_end: null,
      addon_seats: 0,
      addon_courses_enabled: false,
      addon_affiliate_enabled: false,
      addon_gbp_enabled: false,
      subscription_cancel_at: null,
    })
    .eq('id', tenantId)

  await syncFeatureFlags(supabase, tenantId, 'trial', {})
  console.log(`⚠️ Subscription cancelled for tenant ${tenantId}`)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getTenantIdByCustomer(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  customerId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('tenants')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  return data?.id ?? null
}

async function resolveTenantId(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  customerId: string,
  sub: Stripe.Subscription
): Promise<string | null> {
  // Try customer ID first
  const fromCustomer = await getTenantIdByCustomer(supabase, customerId)
  if (fromCustomer) return fromCustomer

  // Fallback: metadata set at checkout
  const tenantIdFromMeta = sub.metadata?.tenant_id
  if (tenantIdFromMeta) {
    // Bind the customer to this tenant for future lookups
    await supabase
      .from('tenants')
      .update({ stripe_customer_id: customerId })
      .eq('id', tenantIdFromMeta)
    return tenantIdFromMeta
  }

  return null
}

function resolvePlanFromPrices(sub: Stripe.Subscription): string {
  // .trim() defensively: a trailing newline in the env var would make the map key
  // never match the (clean) price.id from Stripe → plan silently falls back to 'starter'.
  const envMap: Record<string, string> = {
    [process.env.STRIPE_PRICE_STARTER?.trim() || '_']: 'starter',
    [process.env.STRIPE_PRICE_PROFESSIONAL?.trim() || '_']: 'professional',
    [process.env.STRIPE_PRICE_ENTERPRISE?.trim() || '_']: 'enterprise',
  }
  for (const item of sub.items.data) {
    const match = envMap[item.price.id]
    if (match) return match
  }
  return 'starter'
}

function hasAddonByEnvKey(sub: Stripe.Subscription, envKey: string): boolean {
  const priceId = process.env[envKey]
  if (!priceId) return false
  return sub.items.data.some(item => item.price.id === priceId)
}

function parseAddonSeats(sub: Stripe.Subscription): number {
  // Prefer metadata — always explicitly set at our checkout time and unambiguous
  if (sub.metadata?.addon_seats !== undefined && sub.metadata.addon_seats !== '') {
    const fromMeta = parseInt(sub.metadata.addon_seats, 10)
    if (!isNaN(fromMeta)) return fromMeta
  }
  // Fallback: read from subscription line items (e.g. portal-based upgrades without our metadata)
  const priceId = process.env['STRIPE_PRICE_ADDON_SEATS']
  if (priceId) {
    const item = sub.items.data.find(i => {
      // item.price can be a string ID or an expanded Price object depending on how sub was fetched
      const itemPriceId = typeof i.price === 'string' ? i.price : i.price?.id
      return itemPriceId === priceId
    })
    if (item) return item.quantity ?? 0
  }
  return 0
}

async function sendPaymentConfirmationEmail(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  invoice: Stripe.Invoice,
  tenantId: string
) {
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, contact_email, subscription_plan, current_period_end, addon_seats')
    .eq('id', tenantId)
    .single()

  if (!tenant?.contact_email) return

  const amountCHF = (invoice.amount_paid / 100).toFixed(2)
  const tenantName = tenant.name || tenantId
  const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'https://app.simy.ch'

  const nextBillingDate = tenant.current_period_end
    ? new Date(tenant.current_period_end).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null

  const planLabel: Record<string, string> = {
    starter: 'Starter',
    professional: 'Professional',
    enterprise: 'Enterprise',
  }
  const plan = planLabel[tenant.subscription_plan ?? ''] ?? tenant.subscription_plan ?? '–'
  const seats = tenant.addon_seats ?? 0

  await sendEmail({
    to: tenant.contact_email,
    senderName: 'Simy',
    subject: `✅ Zahlung bestätigt – CHF ${amountCHF}`,
    html: `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
        <tr><td style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08)">
          <div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:32px;border-radius:12px 12px 0 0;text-align:center">
            <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">Zahlung erfolgreich</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,.85);font-size:22px;font-weight:700">CHF ${amountCHF}</p>
          </div>
          <div style="padding:32px">
            <p style="color:#111827;font-size:15px;margin:0 0 16px">Hallo <strong>${tenantName}</strong>,</p>
            <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px">
              deine Simy-Abonnementzahlung von <strong>CHF ${amountCHF}</strong> wurde erfolgreich verarbeitet. Danke!
            </p>
            <table cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:0 0 24px">
              <tr style="background:#f9fafb">
                <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#6b7280;border-bottom:1px solid #e5e7eb" colspan="2">ZAHLUNGSDETAILS</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;font-size:14px;color:#6b7280;border-bottom:1px solid #f3f4f6">Betrag</td>
                <td style="padding:10px 16px;font-size:14px;color:#111827;font-weight:600;border-bottom:1px solid #f3f4f6">CHF ${amountCHF}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;font-size:14px;color:#6b7280;border-bottom:1px solid #f3f4f6">Plan</td>
                <td style="padding:10px 16px;font-size:14px;color:#111827;border-bottom:1px solid #f3f4f6">${plan}${seats > 0 ? ` + ${seats} zusätzliche Accounts` : ''}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;font-size:14px;color:#6b7280;border-bottom:1px solid #f3f4f6">Rechnungs-ID</td>
                <td style="padding:10px 16px;font-size:14px;color:#111827;border-bottom:1px solid #f3f4f6">${invoice.id}</td>
              </tr>
              ${nextBillingDate ? `<tr>
                <td style="padding:10px 16px;font-size:14px;color:#6b7280">Nächste Abrechnung</td>
                <td style="padding:10px 16px;font-size:14px;color:#111827">${nextBillingDate}</td>
              </tr>` : ''}
            </table>
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td align="center" style="padding:8px 0 24px">
                <a href="${baseUrl}/admin/billing"
                   style="display:inline-block;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600">
                  Abonnement verwalten →
                </a>
              </td>
            </tr></table>
            <p style="color:#6b7280;font-size:13px;margin:0">Fragen? <a href="mailto:support@simy.ch" style="color:#6000BD">support@simy.ch</a></p>
          </div>
          <div style="background:#f9fafb;padding:14px 28px;text-align:center;border-top:1px solid #e5e7eb">
            <p style="margin:0;font-size:12px;color:#9ca3af">Simy.ch · support@simy.ch</p>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  })
  console.log(`📧 Payment confirmation email sent to ${tenant.contact_email} (tenant ${tenantId}, CHF ${amountCHF})`)
}

async function handleWalleeWelcomeEmail(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  sub: Stripe.Subscription
) {
  const tenantId = sub.metadata?.tenant_id
  if (!tenantId) return
  try {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('contact_email, name')
      .eq('id', tenantId)
      .single()
    if (!tenant?.contact_email) return

    const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'https://app.simy.ch'
    await sendEmail({
      to: tenant.contact_email,
      fromName: 'Simy',
      subject: '🚀 Nächste Schritte: Online-Zahlungen einrichten (30 Tage)',
      html: `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
      <tr><td style="background:#fff;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#1e293b,#334155);padding:32px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">Online-Zahlungen einrichten</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,.7);font-size:14px">Du hast 30 Tage — hier ist dein Plan</p>
        </div>
        <div style="padding:32px">
          <p style="color:#111827;font-size:15px;margin:0 0 16px">Hallo ${tenant.name || 'Team'},</p>
          <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px">
            vielen Dank für dein Upgrade! Die Abrechnung startet erst wenn deine Online-Zahlungen aktiv sind. Du hast <strong>30 Tage</strong> Zeit — hier sind deine nächsten Schritte:
          </p>
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:20px;margin:0 0 20px">
            <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:.05em">Dein Zeitplan</p>
            <table cellpadding="4" style="font-size:14px;color:#374151;width:100%">
              <tr><td style="color:#6000BD;font-weight:700;width:80px">Jetzt</td><td>UID-Nummer beschaffen (falls noch nicht vorhanden)</td></tr>
              <tr><td style="color:#6000BD;font-weight:700">~20 Tage</td><td>Handelsregistereintrag abgeschlossen, UID erhalten</td></tr>
              <tr><td style="color:#6000BD;font-weight:700">~25 Tage</td><td>Wallee-Antrag in Simy einreichen</td></tr>
              <tr><td style="color:#6000BD;font-weight:700">~30 Tage</td><td>Online-Zahlungen aktiv ✅ — Abrechnung startet</td></tr>
            </table>
          </div>
          <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#111827">Checkliste: Einzelfirma ins Handelsregister eintragen</p>
          <table cellpadding="5" style="font-size:14px;color:#374151;width:100%;border-collapse:collapse">
            <tr><td style="padding:6px 0;border-bottom:1px solid #f3f4f6">☐ 1. Personalausweis / Pass bereithalten</td></tr>
            <tr><td style="padding:6px 0;border-bottom:1px solid #f3f4f6">☐ 2. Firmenname festlegen (muss deinen Nachnamen enthalten)</td></tr>
            <tr><td style="padding:6px 0;border-bottom:1px solid #f3f4f6">☐ 3. Anmeldeformular ausfüllen (hr-amt.ch oder EasyGov.swiss)</td></tr>
            <tr><td style="padding:6px 0;border-bottom:1px solid #f3f4f6">☐ 4. Unterschrift amtlich beglaubigen lassen (Gemeindeamt, CHF 15–30)</td></tr>
            <tr><td style="padding:6px 0;border-bottom:1px solid #f3f4f6">☐ 5. Unterlagen beim kantonalen HR-Amt einreichen (CHF 120–150)</td></tr>
            <tr><td style="padding:6px 0;border-bottom:1px solid #f3f4f6">☐ 6. UID-Nummer erhalten (5–10 Werktage)</td></tr>
            <tr><td style="padding:6px 0">☐ 7. UID in Simy hinterlegen und Wallee-Antrag einreichen</td></tr>
          </table>
          <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:10px;padding:16px;margin:20px 0">
            <p style="margin:0;font-size:14px;color:#92400e;line-height:1.6">
              <strong>Simy übernimmt die Kosten</strong> (CHF 140–180) sobald deine Online-Zahlungen aktiv sind. Es entstehen dir keine Vorauskosten.
            </p>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td align="center" style="padding:16px 0">
              <a href="${baseUrl}/admin/profile"
                 style="display:inline-block;background:linear-gradient(135deg,#1e293b,#334155);color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600">
                Wallee-Antrag einreichen →
              </a>
            </td>
          </tr></table>
          <p style="color:#6b7280;font-size:13px;margin:0">Fragen? <a href="mailto:info@simy.ch" style="color:#6000BD">info@simy.ch</a></p>
        </div>
        <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb">
          <p style="margin:0;font-size:12px;color:#9ca3af">Powered by <a href="https://simy.ch" style="color:#9ca3af">Simy.ch</a></p>
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
    })
    console.log(`📧 Wallee welcome email sent to ${tenant.contact_email} (tenant ${tenantId})`)
  } catch (e: any) {
    console.error('⚠️ Wallee welcome email failed (non-fatal):', e.message)
  }
}

