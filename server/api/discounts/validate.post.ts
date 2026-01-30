import { defineEventHandler, createError, readBody } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

/**
 * POST /api/discounts/validate
 * Validate a discount code and return the discount amount
 */
export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthenticatedUser(event)
    if (!authUser?.tenant_id) {
      throw createError({ statusCode: 401, statusMessage: 'User has no tenant assigned' })
    }

    const body = await readBody(event)
    const { code, amount_rappen, categoryCode } = body

    if (!code) {
      throw createError({ statusCode: 400, statusMessage: 'Discount code is required' })
    }

    if (amount_rappen === undefined) {
      throw createError({ statusCode: 400, statusMessage: 'Amount in rappen is required' })
    }

    logger.debug('🔍 Validating discount code:', code, 'for tenant:', authUser.tenant_id)

    const supabaseAdmin = getSupabaseAdmin()

    // ✅ FIRST: Try voucher_codes table
    const { data: voucherData, error: voucherError } = await supabaseAdmin
      .from('voucher_codes')
      .select('*')
      .ilike('code', code)
      .eq('tenant_id', authUser.tenant_id)
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

      logger.debug('✅ Voucher code valid:', voucherData.id)
      return {
        isValid: true,
        discount_amount_rappen: voucherData.credit_amount_rappen,
        discount: voucherData
      }
    }

    // ✅ SECOND: Try discounts table
    const { data: discountData, error: discountError } = await supabaseAdmin
      .from('discounts')
      .select('*')
      .ilike('code', code)
      .eq('tenant_id', authUser.tenant_id)
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

    // Check category filter
    if (discount.category_filter && discount.category_filter !== 'all' && discount.category_filter !== categoryCode) {
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
      discount,
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
