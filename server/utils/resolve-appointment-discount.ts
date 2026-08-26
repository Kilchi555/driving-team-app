import { matchesDiscountCategoryFilter } from '~/server/utils/discount-category-filter'
import { escapeLikePattern } from '~/server/utils/sql-helpers'
import { logger } from '~/utils/logger'

export type AppointmentDiscountSource = 'voucher_code' | 'gift_card' | 'discount' | null

export type ResolvedAppointmentDiscount = {
  code: string | null
  amountRappen: number
  source: AppointmentDiscountSource
}

export function computeAppointmentDiscountRappen(opts: {
  kind: 'percentage' | 'fixed_rappen' | 'fixed_chf' | 'free_lesson'
  value: number
  lessonAmountRappen: number
  maxDiscountRappen?: number | null
}): number {
  const lesson = Math.max(0, Math.round(opts.lessonAmountRappen || 0))
  let amount = 0
  if (opts.kind === 'percentage') {
    amount = Math.round((lesson * Number(opts.value || 0)) / 100)
  } else if (opts.kind === 'fixed_rappen') {
    amount = Math.round(Number(opts.value || 0))
  } else if (opts.kind === 'fixed_chf') {
    amount = Math.round(Number(opts.value || 0) * 100)
  } else {
    amount = lesson
  }
  if (opts.maxDiscountRappen) {
    amount = Math.min(amount, opts.maxDiscountRappen)
  }
  return Math.max(0, amount)
}

export function netAfterAppointmentDiscount(grossRappen: number, discountRappen: number): number {
  return Math.max(0, Math.round(grossRappen || 0) - Math.max(0, Math.round(discountRappen || 0)))
}

/**
 * Server-side booking discount. Never trust the client amount.
 * Caps at the full payable (lesson + admin + travel), so a 100 CHF gift card
 * can cover admin fee as well.
 */
export async function resolveAppointmentDiscount(opts: {
  supabase: any
  tenantId: string
  code?: string | null
  lessonAmountRappen: number
  capAtRappen: number
  categoryCode?: string | null
  userId?: string | null
}): Promise<ResolvedAppointmentDiscount> {
  const empty: ResolvedAppointmentDiscount = { code: null, amountRappen: 0, source: null }
  const rawCode = typeof opts.code === 'string' ? opts.code.trim() : ''
  if (!rawCode || !opts.tenantId) return empty

  const escaped = escapeLikePattern(rawCode)
  const cap = Math.max(0, Math.round(opts.capAtRappen || 0))
  let amount = 0
  let source: AppointmentDiscountSource = null

  try {
    const { data: voucherData } = await opts.supabase
      .from('voucher_codes')
      .select('discount_type, discount_value, max_discount_rappen, valid_from, valid_until, is_active, type, applies_to, max_redemptions, current_redemptions')
      .ilike('code', escaped)
      .eq('tenant_id', opts.tenantId)
      .eq('is_active', true)
      .maybeSingle()

    if (voucherData) {
      const isDiscountType = voucherData.type && voucherData.type !== 'credit'
      const appliesTo = voucherData.applies_to || 'appointments'
      const appliesToAppointments = appliesTo === 'all' || appliesTo === 'appointments'
      const now = new Date()
      const validFrom = voucherData.valid_from ? new Date(voucherData.valid_from) : null
      const validUntil = voucherData.valid_until ? new Date(voucherData.valid_until) : null
      const withinPeriod = (!validFrom || now >= validFrom) && (!validUntil || now <= validUntil)
      const withinLimit = !voucherData.max_redemptions || (voucherData.current_redemptions ?? 0) < voucherData.max_redemptions

      if (isDiscountType && appliesToAppointments && withinPeriod && withinLimit) {
        if (voucherData.discount_type === 'percentage') {
          amount = computeAppointmentDiscountRappen({
            kind: 'percentage',
            value: voucherData.discount_value,
            lessonAmountRappen: opts.lessonAmountRappen,
            maxDiscountRappen: voucherData.max_discount_rappen,
          })
        } else if (voucherData.discount_type === 'fixed') {
          amount = computeAppointmentDiscountRappen({
            kind: 'fixed_rappen',
            value: voucherData.discount_value,
            lessonAmountRappen: opts.lessonAmountRappen,
          })
        }
        source = 'voucher_code'
      }
    }

    if (!source) {
      const { data: giftCard } = await opts.supabase
        .from('vouchers')
        .select('amount_rappen, redeemed_at, valid_until, is_active')
        .ilike('code', escaped)
        .eq('tenant_id', opts.tenantId)
        .eq('is_active', true)
        .maybeSingle()

      if (giftCard && !giftCard.redeemed_at) {
        const withinPeriod = !giftCard.valid_until || new Date(giftCard.valid_until) >= new Date()
        if (withinPeriod) {
          amount = computeAppointmentDiscountRappen({
            kind: 'fixed_rappen',
            value: giftCard.amount_rappen,
            lessonAmountRappen: opts.lessonAmountRappen,
          })
          source = 'gift_card'
        }
      }
    }

    if (!source) {
      const { data: discountData } = await opts.supabase
        .from('discounts')
        .select('discount_type, discount_value, max_discount_rappen, valid_from, valid_until, is_active, first_lesson_only, usage_limit, usage_count, category_filter')
        .ilike('code', escaped)
        .eq('tenant_id', opts.tenantId)
        .eq('is_active', true)
        .maybeSingle()

      if (discountData) {
        const now = new Date()
        const validFrom = discountData.valid_from ? new Date(discountData.valid_from) : null
        const validUntil = discountData.valid_until ? new Date(discountData.valid_until) : null
        const withinPeriod = (!validFrom || now >= validFrom) && (!validUntil || now <= validUntil)
        const withinLimit = !discountData.usage_limit || (discountData.usage_count ?? 0) < discountData.usage_limit
        const categoryOk = matchesDiscountCategoryFilter(discountData.category_filter, opts.categoryCode)

        let firstLessonOk = true
        if (discountData.first_lesson_only && opts.userId) {
          const { count: apptCount } = await opts.supabase
            .from('appointments')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', opts.userId)
            .eq('tenant_id', opts.tenantId)
            .in('status', ['confirmed', 'completed'])
          firstLessonOk = (apptCount ?? 0) <= 1
        }

        if (withinPeriod && withinLimit && categoryOk && firstLessonOk) {
          if (discountData.discount_type === 'percentage') {
            amount = computeAppointmentDiscountRappen({
              kind: 'percentage',
              value: discountData.discount_value,
              lessonAmountRappen: opts.lessonAmountRappen,
              maxDiscountRappen: discountData.max_discount_rappen,
            })
          } else if (discountData.discount_type === 'fixed') {
            amount = computeAppointmentDiscountRappen({
              kind: 'fixed_chf',
              value: discountData.discount_value,
              lessonAmountRappen: opts.lessonAmountRappen,
            })
          } else if (discountData.discount_type === 'free_lesson') {
            amount = computeAppointmentDiscountRappen({
              kind: 'free_lesson',
              value: 0,
              lessonAmountRappen: opts.lessonAmountRappen,
            })
          }
          source = 'discount'
        }
      }
    }
  } catch (err: any) {
    logger.warn('⚠️ Appointment discount validation failed (non-critical):', err?.message)
    return empty
  }

  amount = Math.min(Math.max(0, amount), cap)
  if (!source || amount <= 0) return empty

  logger.debug('💸 Booking discount validated', { code: rawCode, amount, source })
  return { code: rawCode, amountRappen: amount, source }
}

export async function incrementAppointmentDiscountUsage(opts: {
  supabase: any
  tenantId: string
  code: string
}): Promise<void> {
  const escaped = escapeLikePattern(opts.code.trim())
  if (!escaped || !opts.tenantId) return

  try {
    const { data: disc } = await opts.supabase
      .from('discounts')
      .select('id, usage_count')
      .ilike('code', escaped)
      .eq('tenant_id', opts.tenantId)
      .maybeSingle()

    if (disc) {
      await opts.supabase
        .from('discounts')
        .update({ usage_count: (disc.usage_count ?? 0) + 1 })
        .eq('id', disc.id)
      return
    }

    const { data: vc } = await opts.supabase
      .from('voucher_codes')
      .select('id, current_redemptions')
      .ilike('code', escaped)
      .eq('tenant_id', opts.tenantId)
      .maybeSingle()

    if (vc) {
      await opts.supabase
        .from('voucher_codes')
        .update({ current_redemptions: (vc.current_redemptions ?? 0) + 1 })
        .eq('id', vc.id)
    }
  } catch (e: any) {
    logger.warn('⚠️ Failed to increment discount usage (non-critical):', e.message)
  }
}
