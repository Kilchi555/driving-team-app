/**
 * Platform tenant→tenant referrals for Simy SaaS.
 * Separate from the intra-tenant client affiliate program.
 *
 * Reward: 50% of pure plan line-item on the referred tenant's 2nd paid plan invoice
 * → Stripe Customer Balance credit on the referrer.
 */
import type Stripe from 'stripe'
import { logger } from '~/utils/logger'

export const PLATFORM_REFERRAL_REWARD_RATE = 0.5
export const PLATFORM_REF_STORAGE_KEY = 'platform_ref'

export type PlatformReferralStatus =
  | 'attributed'
  | 'pending_second'
  | 'qualified'
  | 'rewarded'
  | 'cancelled'
  | 'failed'

function planPriceIdMap(): Record<string, string> {
  const map: Record<string, string> = {}
  const starter = process.env.STRIPE_PRICE_STARTER?.trim()
  const professional = process.env.STRIPE_PRICE_PROFESSIONAL?.trim()
  const enterprise = process.env.STRIPE_PRICE_ENTERPRISE?.trim()
  if (starter) map[starter] = 'starter'
  if (professional) map[professional] = 'professional'
  if (enterprise) map[enterprise] = 'enterprise'
  return map
}

function linePriceId(line: Stripe.InvoiceLineItem): string | null {
  const anyLine = line as any
  // Classic API
  if (line.price?.id) return line.price.id
  // Basil / newer shapes
  const nested = anyLine.pricing?.price_details?.price
  if (typeof nested === 'string') return nested
  if (nested?.id) return nested.id
  if (typeof anyLine.price === 'string') return anyLine.price
  // Fallback: subscription metadata on the line (set at checkout)
  const planMeta = anyLine.metadata?.plan as string | undefined
  if (planMeta && ['starter', 'professional', 'enterprise'].includes(planMeta)) {
    const map = planPriceIdMap()
    for (const [priceId, plan] of Object.entries(map)) {
      if (plan === planMeta) return priceId
    }
  }
  return null
}

/** Extract pure plan amount (rappen) from an invoice — ignores add-ons. */
export function extractPlanLineFromInvoice(invoice: Stripe.Invoice): {
  amountRappen: number
  priceId: string
  plan: string
} | null {
  const priceMap = planPriceIdMap()
  if (Object.keys(priceMap).length === 0) return null

  for (const line of invoice.lines?.data || []) {
    const priceId = linePriceId(line)
    if (!priceId || !priceMap[priceId]) continue
    // Prefer positive amounts (charges); skip credit lines
    const amount = typeof line.amount === 'number' ? line.amount : 0
    if (amount <= 0) continue
    return {
      amountRappen: amount,
      priceId,
      plan: priceMap[priceId],
    }
  }

  // Fallback: invoice/line metadata.plan (checkout + test invoices)
  const metaPlan = String(
    (invoice as any).metadata?.plan
    || invoice.lines?.data?.find((l: any) => l.metadata?.plan)?.metadata?.plan
    || '',
  ).toLowerCase()
  if (metaPlan && ['starter', 'professional', 'enterprise'].includes(metaPlan)) {
    const priceId = Object.entries(priceMap).find(([, p]) => p === metaPlan)?.[0]
    const line = (invoice.lines?.data || []).find((l) => (l.amount || 0) > 0)
    const amount = line?.amount || 0
    if (priceId && amount > 0) {
      return { amountRappen: amount, priceId, plan: metaPlan }
    }
  }

  return null
}

export function normalizePlatformReferralCode(raw: string): string {
  return String(raw || '').trim().toUpperCase()
}

export function generatePlatformReferralCode(slug: string): string {
  const base = String(slug || 'SIMY')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12) || 'SIMY'
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''
  for (let i = 0; i < 4; i++) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return `${base}-${suffix}`
}

export async function ensurePlatformReferralCode(
  supabase: any,
  tenantId: string,
  slug?: string | null,
): Promise<{ id: string; code: string }> {
  const { data: existing } = await supabase
    .from('platform_referral_codes')
    .select('id, code, is_active')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (existing?.id && existing.code) {
    if (existing.is_active === false) {
      await supabase
        .from('platform_referral_codes')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    }
    return { id: existing.id, code: existing.code }
  }

  let tenantSlug = slug
  if (!tenantSlug) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('slug')
      .eq('id', tenantId)
      .maybeSingle()
    tenantSlug = tenant?.slug
  }

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generatePlatformReferralCode(tenantSlug || 'SIMY')
    const { data, error } = await supabase
      .from('platform_referral_codes')
      .insert({
        tenant_id: tenantId,
        code,
        is_active: true,
      })
      .select('id, code')
      .single()

    if (!error && data) return { id: data.id, code: data.code }

    // Unique violation → retry with new suffix
    if (error?.code === '23505') continue
    throw error || new Error('Failed to create platform referral code')
  }

  throw new Error('Failed to allocate unique platform referral code')
}

function emailDomain(email: string | null | undefined): string | null {
  if (!email || !email.includes('@')) return null
  return email.split('@')[1]?.trim().toLowerCase() || null
}

const FREEMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'hotmail.com', 'outlook.com', 'live.com',
  'yahoo.com', 'yahoo.de', 'icloud.com', 'me.com', 'mac.com',
  'gmx.ch', 'gmx.net', 'gmx.de', 'bluewin.ch', 'protonmail.com', 'proton.me',
])

export async function attributePlatformReferral(opts: {
  supabase: any
  referredTenantId: string
  code: string
  referredContactEmail?: string | null
  referredUidNumber?: string | null
}): Promise<{ ok: boolean; reason?: string; referralId?: string }> {
  const code = normalizePlatformReferralCode(opts.code)
  if (!code) return { ok: false, reason: 'empty_code' }

  const { data: codeRow } = await opts.supabase
    .from('platform_referral_codes')
    .select('id, tenant_id, is_active')
    .eq('code', code)
    .maybeSingle()

  if (!codeRow?.id || !codeRow.is_active) {
    return { ok: false, reason: 'invalid_code' }
  }

  if (codeRow.tenant_id === opts.referredTenantId) {
    return { ok: false, reason: 'self_referral' }
  }

  const { data: referrer } = await opts.supabase
    .from('tenants')
    .select('id, contact_email, uid_number')
    .eq('id', codeRow.tenant_id)
    .maybeSingle()

  if (!referrer) return { ok: false, reason: 'referrer_missing' }

  const refEmail = (referrer.contact_email || '').trim().toLowerCase()
  const newEmail = (opts.referredContactEmail || '').trim().toLowerCase()
  if (refEmail && newEmail && refEmail === newEmail) {
    return { ok: false, reason: 'same_email' }
  }

  const refUid = (referrer.uid_number || '').trim().toLowerCase()
  const newUid = (opts.referredUidNumber || '').trim().toLowerCase()
  if (refUid && newUid && refUid === newUid) {
    return { ok: false, reason: 'same_uid' }
  }

  // Same corporate email domain (skip freemail)
  const d1 = emailDomain(refEmail)
  const d2 = emailDomain(newEmail)
  if (d1 && d2 && d1 === d2 && !FREEMAIL_DOMAINS.has(d1)) {
    return { ok: false, reason: 'same_email_domain' }
  }

  const { data: existing } = await opts.supabase
    .from('platform_referrals')
    .select('id, status')
    .eq('referred_tenant_id', opts.referredTenantId)
    .maybeSingle()

  if (existing) {
    return { ok: false, reason: 'already_attributed', referralId: existing.id }
  }

  const { data: inserted, error } = await opts.supabase
    .from('platform_referrals')
    .insert({
      referrer_tenant_id: codeRow.tenant_id,
      referred_tenant_id: opts.referredTenantId,
      code_id: codeRow.id,
      status: 'attributed',
      attributed_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    logger.warn('platform referral attribute failed:', error.message)
    return { ok: false, reason: 'insert_failed' }
  }

  await opts.supabase
    .from('tenants')
    .update({ referred_by_code: code })
    .eq('id', opts.referredTenantId)

  return { ok: true, referralId: inserted.id }
}

async function creditReferrerBalance(opts: {
  stripe: Stripe
  supabase: any
  referral: any
  planAmountRappen: number
  plan: string
  invoiceId: string
}): Promise<{ ok: boolean; txId?: string; error?: string }> {
  const rewardRappen = Math.round(opts.planAmountRappen * PLATFORM_REFERRAL_REWARD_RATE)
  if (rewardRappen <= 0) {
    return { ok: false, error: 'reward_zero' }
  }

  const { data: referrer } = await opts.supabase
    .from('tenants')
    .select('id, name, stripe_customer_id')
    .eq('id', opts.referral.referrer_tenant_id)
    .maybeSingle()

  if (!referrer?.stripe_customer_id) {
    return { ok: false, error: 'referrer_no_stripe_customer' }
  }

  const { data: referred } = await opts.supabase
    .from('tenants')
    .select('name')
    .eq('id', opts.referral.referred_tenant_id)
    .maybeSingle()

  try {
    const tx = await opts.stripe.customers.createBalanceTransaction(
      referrer.stripe_customer_id,
      {
        amount: -rewardRappen, // negative = credit
        currency: 'chf',
        description: `Simy-Empfehlung: ${referred?.name || 'Tenant'} (${opts.plan})`,
        metadata: {
          type: 'platform_referral',
          referral_id: opts.referral.id,
          referred_tenant_id: opts.referral.referred_tenant_id,
          plan: opts.plan,
          plan_amount_rappen: String(opts.planAmountRappen),
          reward_rappen: String(rewardRappen),
          invoice_id: opts.invoiceId,
        },
      },
      { idempotencyKey: `platform_ref_reward_${opts.referral.id}` },
    )

    await opts.supabase
      .from('platform_referrals')
      .update({
        status: 'rewarded',
        rewarded_at: new Date().toISOString(),
        qualified_at: opts.referral.qualified_at || new Date().toISOString(),
        qualified_invoice_id: opts.invoiceId,
        plan_amount_rappen: opts.planAmountRappen,
        reward_rappen: rewardRappen,
        reward_plan: opts.plan,
        stripe_balance_tx_id: tx.id,
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', opts.referral.id)

    return { ok: true, txId: tx.id }
  } catch (err: any) {
    const message = err?.message || 'stripe_balance_failed'
    await opts.supabase
      .from('platform_referrals')
      .update({
        status: 'failed',
        qualified_invoice_id: opts.invoiceId,
        qualified_at: new Date().toISOString(),
        plan_amount_rappen: opts.planAmountRappen,
        reward_rappen: rewardRappen,
        reward_plan: opts.plan,
        last_error: message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', opts.referral.id)
    return { ok: false, error: message }
  }
}

/**
 * Called from Stripe webhook on invoice.paid (amount_paid > 0).
 * Advances referral toward reward on the 2nd paid plan invoice.
 */
export async function handlePlatformReferralInvoicePaid(opts: {
  supabase: any
  stripe: Stripe
  tenantId: string
  invoice: Stripe.Invoice
}): Promise<void> {
  const invoice = opts.invoice
  if (!invoice?.id || (invoice.amount_paid ?? 0) <= 0) return

  const planLine = extractPlanLineFromInvoice(invoice)
  if (!planLine) {
    // Invoice without a known plan price (addons-only / $0 / unknown) — ignore
    return
  }

  const { data: referral } = await opts.supabase
    .from('platform_referrals')
    .select('*')
    .eq('referred_tenant_id', opts.tenantId)
    .in('status', ['attributed', 'pending_second', 'qualified', 'failed'])
    .maybeSingle()

  if (!referral) return

  // Idempotency: already processed this invoice as first or second
  if (
    referral.first_paid_invoice_id === invoice.id ||
    referral.qualified_invoice_id === invoice.id
  ) {
    if (referral.status === 'failed' || referral.status === 'qualified') {
      await creditReferrerBalance({
        stripe: opts.stripe,
        supabase: opts.supabase,
        referral,
        planAmountRappen: referral.plan_amount_rappen || planLine.amountRappen,
        plan: referral.reward_plan || planLine.plan,
        invoiceId: referral.qualified_invoice_id || invoice.id,
      })
    }
    return
  }

  const nextCount = (referral.paid_plan_invoice_count || 0) + 1

  if (nextCount === 1) {
    await opts.supabase
      .from('platform_referrals')
      .update({
        status: 'pending_second',
        paid_plan_invoice_count: 1,
        first_paid_invoice_id: invoice.id,
        first_paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', referral.id)
    logger.debug('platform referral: first paid plan invoice', {
      referralId: referral.id,
      invoiceId: invoice.id,
    })
    return
  }

  // 2nd+ paid plan invoice → qualify + reward (50% of THIS invoice's plan line)
  await opts.supabase
    .from('platform_referrals')
    .update({
      status: 'qualified',
      paid_plan_invoice_count: nextCount,
      qualified_invoice_id: invoice.id,
      qualified_at: new Date().toISOString(),
      plan_amount_rappen: planLine.amountRappen,
      reward_rappen: Math.round(planLine.amountRappen * PLATFORM_REFERRAL_REWARD_RATE),
      reward_plan: planLine.plan,
      updated_at: new Date().toISOString(),
    })
    .eq('id', referral.id)

  const updated = {
    ...referral,
    status: 'qualified',
    qualified_at: new Date().toISOString(),
    plan_amount_rappen: planLine.amountRappen,
    reward_plan: planLine.plan,
  }

  const result = await creditReferrerBalance({
    stripe: opts.stripe,
    supabase: opts.supabase,
    referral: updated,
    planAmountRappen: planLine.amountRappen,
    plan: planLine.plan,
    invoiceId: invoice.id,
  })

  if (result.ok) {
    logger.debug('platform referral rewarded', {
      referralId: referral.id,
      rewardRappen: Math.round(planLine.amountRappen * PLATFORM_REFERRAL_REWARD_RATE),
      txId: result.txId,
    })
  } else {
    logger.warn('platform referral reward failed', {
      referralId: referral.id,
      error: result.error,
    })
  }
}

export function buildPlatformReferralShareUrl(code: string): string {
  const base = process.env.NUXT_PUBLIC_BASE_URL || 'https://app.simy.ch'
  return `${base.replace(/\/$/, '')}/tenant-register?ref=${encodeURIComponent(code)}`
}
