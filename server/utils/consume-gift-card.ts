import { logger } from '~/utils/logger'
import { escapeLikePattern } from '~/server/utils/sql-helpers'

export function giftCardCodeFromPaymentMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null
  const code = (metadata as { discount_code?: unknown }).discount_code
  if (typeof code !== 'string') return null
  const trimmed = code.trim()
  return trimmed.length > 0 ? trimmed : null
}

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

  const now = new Date().toISOString()
  const { data, error } = await opts.supabase
    .from('vouchers')
    .update({
      redeemed_at: now,
      redeemed_by: opts.redeemedBy || null,
      is_active: false,
    })
    .ilike('code', escapeLikePattern(code))
    .eq('tenant_id', opts.tenantId)
    .is('redeemed_at', null)
    .select('id')
    .maybeSingle()

  if (error) {
    logger.warn('consumeGiftCardByCode failed', { message: error.message, tenantId: opts.tenantId })
    return { consumed: false, alreadyRedeemed: false }
  }

  return { consumed: !!data, alreadyRedeemed: !data }
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

  const result = await consumeGiftCardByCode({
    supabase: opts.supabase,
    tenantId: opts.tenantId,
    code,
    redeemedBy: opts.redeemedBy,
  })
  return { consumed: result.consumed }
}
