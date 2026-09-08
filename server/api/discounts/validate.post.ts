import { defineEventHandler, createError, readBody } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'
import { matchesDiscountCategoryFilter } from '~/server/utils/discount-category-filter'
import { toPublicDiscountPayload } from '~/server/utils/public-discount-payload'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getClientIP } from '~/server/utils/ip-utils'

/**
 * Code-guessing budget. This endpoint is the only public surface that can test a
 * promo or gift-card code since F-3 removed anon SELECT on vouchers /
 * voucher_codes, so it needs its own brute-force budget.
 * 30/min is well above a real checkout (a customer types one or two codes) and
 * matches the /api/vouchers/lookup pattern.
 */
const VALIDATE_MAX_REQUESTS = 30
const VALIDATE_WINDOW_MS = 60_000

/**
 * POST /api/discounts/validate
 * Validate a discount code and return the discount amount
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { code, amount_rappen, categoryCode, tenant_id: bodyTenantId, context } = body
    // context: 'appointment' | 'product' | undefined – used to enforce applies_to restrictions

    if (!code) {
      throw createError({ statusCode: 400, statusMessage: 'Discount code is required' })
    }

    if (amount_rappen === undefined) {
      throw createError({ statusCode: 400, statusMessage: 'Amount in rappen is required' })
    }

    // Resolve tenant_id from auth or from body (for guest/shop checkout)
    let tenantId: string | null = null
    const authUser = await getAuthenticatedUser(event).catch(() => null)
    if (authUser?.tenant_id) {
      tenantId = authUser.tenant_id
    } else if (bodyTenantId) {
      tenantId = bodyTenantId
    }

    if (!tenantId) {
      throw createError({ statusCode: 401, statusMessage: 'User has no tenant assigned' })
    }

    // Brute-force budget per IP+tenant. Checked before any code lookup so the
    // response cannot be used as an unlimited code oracle. The message is
    // deliberately generic and identical for valid and invalid codes.
    const rateLimit = await checkRateLimit(
      getClientIP(event),
      'discount_validate',
      VALIDATE_MAX_REQUESTS,
      VALIDATE_WINDOW_MS,
      undefined,
      tenantId,
    )
    if (!rateLimit.allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Zu viele Anfragen. Bitte versuchen Sie es in einer Minute erneut.',
      })
    }

    logger.debug('🔍 Validating discount code:', code, 'for tenant:', tenantId)

    const supabaseAdmin = getSupabaseAdmin()

    // ✅ FIRST: Try voucher_codes table
    const { data: voucherData, error: voucherError } = await supabaseAdmin
      .from('voucher_codes')
      .select('id, code, description, type, discount_type, discount_value, min_amount_rappen, max_discount_rappen, applies_to, valid_from, valid_until, max_redemptions, current_redemptions')
      .ilike('code', code)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .maybeSingle()

    if (!voucherError && voucherData) {
      const now = new Date()
      const validFrom = new Date(voucherData.valid_from)
      const validUntil = voucherData.valid_until ? new Date(voucherData.valid_until) : null

      if (now < validFrom || (validUntil && now > validUntil)) {
        return {
          isValid: false,
          discount_amount_rappen: 0,
          error: 'Gutschein ist nicht gültig'
        }
      }

      if (voucherData.max_redemptions && voucherData.current_redemptions >= voucherData.max_redemptions) {
        return {
          isValid: false,
          discount_amount_rappen: 0,
          error: 'Gutschein hat das Nutzungslimit erreicht'
        }
      }

      // Credit-type: adds balance to student wallet — not a checkout discount
      if (!voucherData.type || voucherData.type === 'credit') {
        return {
          isValid: false,
          discount_amount_rappen: 0,
          error: 'Dieser Code ist ein Guthaben-Gutschein. Bitte lösen Sie ihn unter "Guthaben" → "Code einlösen" ein.'
        }
      }

      // applies_to check: if caller specifies context, enforce the restriction
      if (context) {
        const appliesTo = voucherData.applies_to || 'appointments'
        if (appliesTo !== 'all') {
          if (context === 'appointment' && appliesTo !== 'appointments') {
            return { isValid: false, discount_amount_rappen: 0, error: 'Dieser Code gilt nur für Produktkäufe' }
          }
          if (context === 'product' && appliesTo !== 'products') {
            return { isValid: false, discount_amount_rappen: 0, error: 'Dieser Code gilt nur für Termin-Buchungen' }
          }
        }
      }

      // Discount-type: calculate the actual discount amount based on discount_type
      let discountAmount = 0
      if (voucherData.discount_type === 'percentage') {
        discountAmount = Math.round((amount_rappen * voucherData.discount_value) / 100)
        if (voucherData.max_discount_rappen) {
          discountAmount = Math.min(discountAmount, voucherData.max_discount_rappen)
        }
      } else if (voucherData.discount_type === 'fixed') {
        // discount_value is stored in rappen
        discountAmount = voucherData.discount_value || 0
      }

      // Never exceed the actual cart amount
      discountAmount = Math.min(discountAmount, amount_rappen)

      logger.debug('✅ Voucher discount code valid:', voucherData.id, 'amount:', discountAmount)
      return {
        isValid: true,
        discount_amount_rappen: discountAmount,
        discount: toPublicDiscountPayload(
          { ...voucherData, name: voucherData.description },
          'voucher_code',
        )
      }
    }

    // ✅ SECOND: Try vouchers table (purchased gift cards from shop)
    const { data: giftCardData, error: giftCardError } = await supabaseAdmin
      .from('vouchers')
      .select('id, code, name, description, amount_rappen, redeemed_at, valid_until')
      .ilike('code', code)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .maybeSingle()

    if (!giftCardError && giftCardData) {
      // Check if already redeemed
      if (giftCardData.redeemed_at) {
        return {
          isValid: false,
          discount_amount_rappen: 0,
          error: 'Dieser Gutschein wurde bereits eingelöst'
        }
      }

      // Check if expired
      const now = new Date()
      if (giftCardData.valid_until && new Date(giftCardData.valid_until) < now) {
        return {
          isValid: false,
          discount_amount_rappen: 0,
          error: 'Dieser Gutschein ist abgelaufen'
        }
      }

      // Gift cards: use full amount as discount
      const discountAmount = giftCardData.amount_rappen

      logger.debug('✅ Gift card voucher valid:', giftCardData.id, 'amount:', discountAmount)
      return {
        isValid: true,
        discount_amount_rappen: discountAmount,
        discount: toPublicDiscountPayload(giftCardData, 'gift_card')
      }
    }

    // ✅ THIRD: Try discounts table
    const { data: discountData, error: discountError } = await supabaseAdmin
      .from('discounts')
      .select('id, code, name, discount_type, discount_value, min_amount_rappen, max_discount_rappen, applies_to, first_lesson_only, category_filter, valid_from, valid_until, usage_limit, usage_count')
      .ilike('code', code)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .maybeSingle()

    if (discountError || !discountData) {
      return {
        isValid: false,
        discount_amount_rappen: 0,
        error: 'Gutscheincode nicht gefunden'
      }
    }

    const discount = discountData

    // Validate period
    const now = new Date()
    const validFrom = new Date(discount.valid_from)
    const validUntil = discount.valid_until ? new Date(discount.valid_until) : null

    if (now < validFrom || (validUntil && now > validUntil)) {
      return {
        isValid: false,
        discount_amount_rappen: 0,
        error: 'Gutschein ist nicht gültig'
      }
    }

    // Check minimum amount
    if (amount_rappen < discount.min_amount_rappen) {
      return {
        isValid: false,
        discount_amount_rappen: 0,
        error: `Mindestbetrag von CHF ${(discount.min_amount_rappen / 100).toFixed(2)} nicht erreicht`
      }
    }

    // Check category filter (single code or comma-separated list)
    if (!matchesDiscountCategoryFilter(discount.category_filter, categoryCode)) {
      return {
        isValid: false,
        discount_amount_rappen: 0,
        error: 'Gutschein gilt nicht für diese Kategorie'
      }
    }

    // Check usage limit
    if (discount.usage_limit && discount.usage_count >= discount.usage_limit) {
      return {
        isValid: false,
        discount_amount_rappen: 0,
        error: 'Gutschein wurde bereits maximal genutzt'
      }
    }

    // Check first-lesson-only restriction
    // Guests: allow for price preview (hard check runs at create-appointment after login)
    if (discount.first_lesson_only && authUser) {
      const { data: userProfile } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('auth_user_id', authUser.id)
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (userProfile) {
        const { count } = await supabaseAdmin
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userProfile.id)
          .eq('tenant_id', tenantId)
          .in('status', ['confirmed', 'completed'])

        if ((count ?? 0) > 0) {
          return {
            isValid: false,
            discount_amount_rappen: 0,
            error: 'Dieser Code gilt nur für den ersten Termin'
          }
        }
      }
    }

    // Calculate discount amount
    let discountAmount = 0
    switch (discount.discount_type) {
      case 'percentage':
        discountAmount = Math.round((amount_rappen * discount.discount_value) / 100)
        break
      case 'fixed':
        discountAmount = Math.round(discount.discount_value * 100)
        break
      case 'free_lesson':
      case 'free_product':
        discountAmount = amount_rappen
        break
    }

    // Limit to max discount
    if (discount.max_discount_rappen && discountAmount > discount.max_discount_rappen) {
      discountAmount = discount.max_discount_rappen
    }

    // Limit to actual amount
    discountAmount = Math.min(discountAmount, amount_rappen)

    logger.debug('✅ Discount valid:', discount.id, 'amount:', discountAmount)
    return {
      isValid: true,
      discount: toPublicDiscountPayload(discount, 'discount'),
      discount_amount_rappen: discountAmount
    }
  } catch (err: any) {
    logger.error('❌ Error in POST /api/discounts/validate:', err.message)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to validate discount'
    })
  }
})
