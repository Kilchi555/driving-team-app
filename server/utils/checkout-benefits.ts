import { escapeLikePattern } from '~/server/utils/sql-helpers'
import {
  decrementDiscountUsageAtomic,
  decrementVoucherCodeRedemptionAtomic,
  incrementDiscountUsageAtomic,
  incrementVoucherCodeRedemptionAtomic,
} from '~/server/utils/wallet-atomic'
import { logger } from '~/utils/logger'

export type GiftCardReserveStatus =
  | 'reserved'
  | 'already_reserved'
  | 'held_by_other'
  | 'already_redeemed'
  | 'not_found'

export function isGiftCardReservedForOther(
  card: { reserved_until?: string | null; reserved_for_payment_id?: string | null },
  paymentId?: string | null,
  nowMs = Date.now()
): boolean {
  if (!card.reserved_for_payment_id || !card.reserved_until) return false
  if (new Date(card.reserved_until).getTime() <= nowMs) return false
  return card.reserved_for_payment_id !== paymentId
}

export async function reserveGiftCardForPayment(
  supabase: any,
  opts: { tenantId: string; code: string; paymentId: string; ttlMinutes?: number }
): Promise<GiftCardReserveStatus> {
  const { data, error } = await supabase.rpc('reserve_gift_card_for_payment', {
    p_tenant_id: opts.tenantId,
    p_code: opts.code.trim(),
    p_payment_id: opts.paymentId,
    p_ttl_minutes: opts.ttlMinutes ?? 45,
  })
  if (error) {
    logger.warn('reserveGiftCardForPayment failed', { message: error.message })
    return /could not find the function|schema cache|PGRST202|does not exist/i.test(error.message || '')
      ? 'not_found'
      : 'held_by_other'
  }
  const status = typeof data === 'string' ? data : 'not_found'
  if (
    status === 'reserved'
    || status === 'already_reserved'
    || status === 'held_by_other'
    || status === 'already_redeemed'
    || status === 'not_found'
  ) {
    return status
  }
  return 'not_found'
}

export async function releaseGiftCardReservation(supabase: any, paymentId: string): Promise<void> {
  const { error } = await supabase.rpc('release_gift_card_reservation', {
    p_payment_id: paymentId,
  })
  if (error) logger.warn('releaseGiftCardReservation failed', { message: error.message, paymentId })
}

async function markDiscountUsageClaimed(supabase: any, paymentId: string): Promise<void> {
  const { data } = await supabase
    .from('payments')
    .select('metadata')
    .eq('id', paymentId)
    .maybeSingle()
  const metadata = data?.metadata && typeof data.metadata === 'object' ? { ...data.metadata } : {}
  if (metadata.discount_usage_claimed) return
  await supabase
    .from('payments')
    .update({ metadata: { ...metadata, discount_usage_claimed: true } })
    .eq('id', paymentId)
}

async function claimCatalogUsage(
  supabase: any,
  opts: { tenantId: string; code: string }
): Promise<boolean> {
  const escaped = escapeLikePattern(opts.code.trim())
  if (!escaped || !opts.tenantId) return true

  const { data: disc } = await supabase
    .from('discounts')
    .select('id')
    .ilike('code', escaped)
    .eq('tenant_id', opts.tenantId)
    .maybeSingle()
  if (disc?.id) return incrementDiscountUsageAtomic(supabase, disc.id)

  const { data: vc } = await supabase
    .from('voucher_codes')
    .select('id')
    .ilike('code', escaped)
    .eq('tenant_id', opts.tenantId)
    .maybeSingle()
  if (vc?.id) return incrementVoucherCodeRedemptionAtomic(supabase, vc.id)
  return true
}

async function releaseCatalogUsage(
  supabase: any,
  opts: { tenantId: string; code: string }
): Promise<void> {
  const escaped = escapeLikePattern(opts.code.trim())
  if (!escaped || !opts.tenantId) return

  const { data: disc } = await supabase
    .from('discounts')
    .select('id')
    .ilike('code', escaped)
    .eq('tenant_id', opts.tenantId)
    .maybeSingle()
  if (disc?.id) {
    await decrementDiscountUsageAtomic(supabase, disc.id)
    return
  }

  const { data: vc } = await supabase
    .from('voucher_codes')
    .select('id')
    .ilike('code', escaped)
    .eq('tenant_id', opts.tenantId)
    .maybeSingle()
  if (vc?.id) await decrementVoucherCodeRedemptionAtomic(supabase, vc.id)
}

export async function lockCheckoutBenefits(opts: {
  supabase: any
  tenantId: string
  paymentId: string
  code?: string | null
}): Promise<{ ok: boolean; kind: 'gift_card' | 'discount' | 'none'; reason?: string }> {
  const code = typeof opts.code === 'string' ? opts.code.trim() : ''
  if (!code || !opts.tenantId || !opts.paymentId) return { ok: true, kind: 'none' }

  const reserved = await reserveGiftCardForPayment(opts.supabase, {
    tenantId: opts.tenantId,
    code,
    paymentId: opts.paymentId,
  })
  if (reserved === 'reserved' || reserved === 'already_reserved') {
    await markDiscountUsageClaimed(opts.supabase, opts.paymentId)
    return { ok: true, kind: 'gift_card' }
  }
  if (reserved === 'held_by_other' || reserved === 'already_redeemed') {
    return {
      ok: false,
      kind: 'gift_card',
      reason: reserved === 'already_redeemed'
        ? 'Dieser Gutschein wurde bereits eingelöst'
        : 'Dieser Gutschein wird gerade in einer anderen Zahlung verwendet. Entferne den Code oder versuche es in ein paar Minuten erneut.',
    }
  }

  const claimed = await claimCatalogUsage(opts.supabase, { tenantId: opts.tenantId, code })
  if (!claimed) {
    return {
      ok: false,
      kind: 'discount',
      reason: 'Dieser Code hat das Nutzungslimit erreicht. Entferne den Code, um ohne Rabatt weiterzumachen.',
    }
  }
  await markDiscountUsageClaimed(opts.supabase, opts.paymentId)
  return { ok: true, kind: 'discount' }
}

export async function releaseCheckoutBenefits(opts: {
  supabase: any
  tenantId?: string | null
  paymentId: string
  metadata?: Record<string, any> | null
}): Promise<void> {
  await releaseGiftCardReservation(opts.supabase, opts.paymentId)

  const metadata = opts.metadata && typeof opts.metadata === 'object' ? opts.metadata : {}
  const code = typeof metadata.discount_code === 'string' ? metadata.discount_code.trim() : ''
  if (!metadata.discount_usage_claimed || !code || !opts.tenantId) return
  await releaseCatalogUsage(opts.supabase, { tenantId: opts.tenantId, code })
}

/** Cancel a just-created checkout so a failed code lock never charges a different amount. */
export async function abortCheckoutAfterBenefitLockFail(opts: {
  supabase: any
  paymentId: string
  appointmentId: string
}): Promise<void> {
  const now = new Date().toISOString()
  await opts.supabase
    .from('payments')
    .update({ payment_status: 'cancelled', updated_at: now })
    .eq('id', opts.paymentId)
  await opts.supabase
    .from('appointments')
    .update({ status: 'cancelled', updated_at: now })
    .eq('id', opts.appointmentId)
}

export function benefitLockUnavailablePayload(reason?: string) {
  return {
    statusCode: 409 as const,
    statusMessage: reason || 'Dieser Code kann gerade nicht verwendet werden',
    data: { code: 'DISCOUNT_UNAVAILABLE' as const },
  }
}

export async function stripDiscountFromPayment(opts: {
  supabase: any
  paymentId: string
  tenantId?: string | null
  lessonPriceRappen?: number
  adminFeeRappen?: number
  productsPriceRappen?: number
  creditUsedRappen?: number
}): Promise<void> {
  const { data } = await opts.supabase
    .from('payments')
    .select('lesson_price_rappen, admin_fee_rappen, products_price_rappen, credit_used_rappen, metadata, tenant_id')
    .eq('id', opts.paymentId)
    .maybeSingle()
  if (!data) return

  const metadata = data.metadata && typeof data.metadata === 'object' ? { ...data.metadata } : {}
  await releaseCheckoutBenefits({
    supabase: opts.supabase,
    tenantId: opts.tenantId || data.tenant_id,
    paymentId: opts.paymentId,
    metadata,
  })
  delete metadata.discount_code
  delete metadata.discount_auto_applied
  metadata.discount_usage_claimed = false

  const gross = (opts.lessonPriceRappen ?? data.lesson_price_rappen ?? 0)
    + (opts.adminFeeRappen ?? data.admin_fee_rappen ?? 0)
    + (opts.productsPriceRappen ?? data.products_price_rappen ?? 0)
  const credit = opts.creditUsedRappen ?? data.credit_used_rappen ?? 0

  await opts.supabase
    .from('payments')
    .update({
      discount_amount_rappen: 0,
      total_amount_rappen: Math.max(0, gross - credit),
      metadata,
    })
    .eq('id', opts.paymentId)
}
