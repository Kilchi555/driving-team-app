import { logger } from '~/utils/logger'

export function giftCardCodeFromPaymentMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null
  const code = (metadata as { discount_code?: unknown }).discount_code
  if (typeof code !== 'string') return null
  const trimmed = code.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function consumeGiftCardViaRpc(opts: {
  supabase: any
  tenantId: string
  code: string
  paymentId?: string | null
  redeemedBy?: string | null
}): Promise<boolean> {
  const { data, error } = await opts.supabase.rpc('consume_gift_card_for_payment', {
    p_tenant_id: opts.tenantId,
    p_code: opts.code.trim(),
    p_payment_id: opts.paymentId || null,
    p_redeemed_by: opts.redeemedBy || null,
  })
  if (error) {
    logger.warn('consumeGiftCardViaRpc failed', { message: error.message, tenantId: opts.tenantId })
    return false
  }
  return data === true
}

/** Immediate redeem (credit enroll). Only succeeds if the card is not reserved. */
export async function consumeGiftCardByCode(opts: {
  supabase: any
  tenantId: string
  code: string
  redeemedBy?: string | null
}): Promise<{ consumed: boolean; alreadyRedeemed: boolean }> {
  const code = opts.code.trim()
  if (!code || !opts.tenantId) {
    return { consumed: false, alreadyRedeemed: false }
  }

  const consumed = await consumeGiftCardViaRpc({
    supabase: opts.supabase,
    tenantId: opts.tenantId,
    code,
    paymentId: null,
    redeemedBy: opts.redeemedBy,
  })
  return { consumed, alreadyRedeemed: !consumed }
}

export async function consumeGiftCardForPayment(opts: {
  supabase: any
  tenantId: string
  paymentId: string
  redeemedBy?: string | null
  discountCode?: string | null
}): Promise<{ consumed: boolean }> {
  let code = opts.discountCode?.trim() || null
  if (!code) {
    const { data } = await opts.supabase
      .from('payments')
      .select('metadata')
      .eq('id', opts.paymentId)
      .eq('tenant_id', opts.tenantId)
      .maybeSingle()
    code = giftCardCodeFromPaymentMetadata(data?.metadata)
  }
  if (!code) return { consumed: false }

  const consumed = await consumeGiftCardViaRpc({
    supabase: opts.supabase,
    tenantId: opts.tenantId,
    code,
    paymentId: opts.paymentId,
    redeemedBy: opts.redeemedBy,
  })
  return { consumed }
}
