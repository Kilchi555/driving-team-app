import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { validateUUID, throwValidationError } from '~/server/utils/validators'
import { logAudit } from '~/server/utils/audit'

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  let authenticatedUserId: string | undefined
  let tenantId: string | undefined
  let requestingUser: any = null

  try {
    // ============ LAYER 1: AUTHENTICATION ============
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }
    authenticatedUserId = authUser.id

    // ============ LAYER 2: RATE LIMITING ============
    const rateLimitResult = await checkRateLimit(
      authenticatedUserId,
      'calculate_prices',
      100, // maxRequests: 100 per minute
      60 * 1000 // windowMs: 1 minute
    )
    if (!rateLimitResult.allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.'
      })
    }

    // ============ LAYER 3: INPUT VALIDATION ============
    const body = await readBody(event)
    const {
      appointmentId,
      basePriceRappen,
      adminFeeRappen,
      productsPriceRappen,
      discountAmountRappen,
      couponCode,
      durationMinutes,
      categoryCode
    } = body

    const errors: any = {}
    if (!basePriceRappen || typeof basePriceRappen !== 'number' || basePriceRappen < 0) {
      errors.basePriceRappen = 'Valid base price required'
    }
    if (adminFeeRappen === undefined || typeof adminFeeRappen !== 'number' || adminFeeRappen < 0) {
      errors.adminFeeRappen = 'Valid admin fee required'
    }
    if (productsPriceRappen === undefined || typeof productsPriceRappen !== 'number' || productsPriceRappen < 0) {
      errors.productsPriceRappen = 'Valid products price required'
    }
    if (discountAmountRappen === undefined || typeof discountAmountRappen !== 'number' || discountAmountRappen < 0) {
      errors.discountAmountRappen = 'Valid discount amount required'
    }
    if (Object.keys(errors).length > 0) {
      throwValidationError(errors)
    }

    const supabaseAdmin = getSupabaseAdmin()

    // ============ LAYER 4: GET AUTHENTICATED USER FROM USERS TABLE ============
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authenticatedUserId)
      .single()

    if (userError || !userData) {
      logger.warn(`⚠️ User not found for auth_user_id: ${authenticatedUserId}`)
      throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }

    requestingUser = userData
    tenantId = userData.tenant_id

    // ============ LAYER 5: VALIDATE VOUCHER CODE (if provided) ============
    let voucherDiscount = 0
    let voucherId: string | null = null
    if (couponCode) {
      const { data: voucher, error: voucherError } = await supabaseAdmin
        .from('voucher_codes')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .single()

      if (voucherError) {
        logger.warn(`⚠️ Voucher code not found: ${couponCode}`)
        throw createError({
          statusCode: 400,
          statusMessage: `Gutschein-Code "${couponCode}" ist ungültig oder abgelaufen`
        })
      }

      // Only discount codes can be used for price reduction
      if (voucher.type !== 'discount') {
        throw createError({
          statusCode: 400,
          statusMessage: `Code "${couponCode}" ist kein gültiger Rabatt-Code`
        })
      }

      voucherId = voucher.id

      // Check validity period
      const now = new Date()
      if (voucher.valid_from && new Date(voucher.valid_from) > now) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Dieser Rabatt-Code ist noch nicht gültig'
        })
      }
      if (voucher.valid_until && new Date(voucher.valid_until) < now) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Dieser Rabatt-Code ist abgelaufen'
        })
      }

      // Check global usage limits
      if (voucher.max_redemptions) {
        const { data: redemptions, error: redemptionError } = await supabaseAdmin
          .from('voucher_redemptions')
          .select('id', { count: 'exact' })
          .eq('voucher_code_id', voucher.id)

        const usageCount = redemptions?.length || 0
        if (usageCount >= voucher.max_redemptions) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Dieser Rabatt-Code hat sein Verwendungslimit erreicht'
          })
        }
      }

      // Check per-user usage limit
      if (voucher.max_usage_per_user) {
        const { data: userRedemptions, error: userRedemptionError } = await supabaseAdmin
          .from('voucher_redemptions')
          .select('id', { count: 'exact' })
          .eq('voucher_code_id', voucher.id)
          .eq('user_id', userData.id)

        const userUsageCount = userRedemptions?.length || 0
        if (userUsageCount >= voucher.max_usage_per_user) {
          throw createError({
            statusCode: 400,
            statusMessage: `Du kannst diesen Rabatt-Code maximal ${voucher.max_usage_per_user}x verwenden`
          })
        }
      }

      // Check category restrictions
      if (voucher.allowed_categories && voucher.allowed_categories.length > 0) {
        if (!categoryCode || !voucher.allowed_categories.includes(categoryCode)) {
          throw createError({
            statusCode: 400,
            statusMessage: `Dieser Rabatt-Code ist nicht für diese Kategorie gültig`
          })
        }
      }

      // Calculate discount
      const subtotal = basePriceRappen + adminFeeRappen + productsPriceRappen
      
      if (voucher.discount_type === 'percentage') {
        voucherDiscount = Math.round((subtotal * voucher.discount_value) / 100)
        // Apply cap if set
        if (voucher.max_discount_rappen && voucherDiscount > voucher.max_discount_rappen) {
          voucherDiscount = voucher.max_discount_rappen
        }
      } else if (voucher.discount_type === 'fixed') {
        voucherDiscount = voucher.discount_value
      }

      // Check minimum amount
      if (voucher.min_amount_rappen && subtotal < voucher.min_amount_rappen) {
        throw createError({
          statusCode: 400,
          statusMessage: `Mindestbestellwert für diesen Code: CHF ${(voucher.min_amount_rappen / 100).toFixed(2)}`
        })
      }

      logger.debug('✅ Voucher code validated:', {
        code: couponCode,
        type: voucher.type,
        discountType: voucher.discount_type,
        discountAmount: (voucherDiscount / 100).toFixed(2)
      })
    }

    // ============ LAYER 6: CALCULATE FINAL PRICE ============
    const subtotal = basePriceRappen + adminFeeRappen + productsPriceRappen
    
    // ✅ IMPORTANT: Apply discounts in order
    // 1. Voucher discount (server-validated)
    // 2. Manual discount (from frontend, already validated by staff)
    const totalDiscount = voucherDiscount + discountAmountRappen
    const totalBeforeCredit = Math.max(0, subtotal - totalDiscount)

    // ============ LAYER 7: CREATE PENDING QUOTE ============
    // This prevents fraud: must use same quote_id when creating appointment
    const quoteId = crypto.randomUUID()
    const quoteExpiry = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    const { error: quoteError } = await supabaseAdmin
      .from('pending_quotes')
      .insert([{
        id: quoteId,
        user_id: userData.id,
        tenant_id: tenantId,
        base_price_rappen: basePriceRappen,
        admin_fee_rappen: adminFeeRappen,
        products_price_rappen: productsPriceRappen,
        discount_amount_rappen: discountAmountRappen,
        voucher_code: couponCode || null,
        voucher_discount_rappen: voucherDiscount,
        total_discount_rappen: totalDiscount,
        total_amount_before_credit_rappen: totalBeforeCredit,
        expires_at: quoteExpiry.toISOString(),
        appointment_id: appointmentId || null
      }])

    if (quoteError) {
      logger.warn('⚠️ Failed to create pending quote:', quoteError)
      // Don't fail - quote is just for fraud prevention
    }

    logger.debug('✅ Price calculation completed:', {
      basePriceRappen,
      adminFeeRappen,
      productsPriceRappen,
      manualDiscountRappen: discountAmountRappen,
      voucherDiscountRappen: voucherDiscount,
      totalDiscountRappen: totalDiscount,
      totalAmountRappen: totalBeforeCredit
    })

    // ============ AUDIT LOGGING: Success ============
    await logAudit({
      user_id: userData.id,
      auth_user_id: authenticatedUserId,
      action: 'calculate_prices',
      resource_type: 'payment',
      resource_id: quoteId,
      status: 'success',
      tenant_id: tenantId,
      details: {
        base_price: (basePriceRappen / 100).toFixed(2),
        admin_fee: (adminFeeRappen / 100).toFixed(2),
        products_total: (productsPriceRappen / 100).toFixed(2),
        manual_discount: (discountAmountRappen / 100).toFixed(2),
        voucher_discount: (voucherDiscount / 100).toFixed(2),
        total_discount: (totalDiscount / 100).toFixed(2),
        total_amount: (totalBeforeCredit / 100).toFixed(2),
        voucher_code: couponCode || 'none',
        duration_ms: Date.now() - startTime
      }
    })

      return {
        success: true,
        quoteId,
        expiresAt: quoteExpiry.toISOString(),
        breakdown: {
          basePriceRappen,
          adminFeeRappen,
          productsPriceRappen,
          discountAmountRappen,
          voucherDiscountRappen: voucherDiscount,
          totalDiscountRappen: totalDiscount,
          totalAmountBeforeCreditRappen: totalBeforeCredit
        },
        message: couponCode ? `Gutschein-Code "${couponCode}" erfolgreich angewendet` : 'Preisberechnung erfolgreich'
      }

  } catch (error: any) {
    logger.error('❌ Error calculating prices:', error)

    // ============ AUDIT LOGGING: Error ============
    await logAudit({
      user_id: requestingUser?.id,
      auth_user_id: authenticatedUserId,
      action: 'calculate_prices',
      resource_type: 'payment',
      status: 'error',
      error_message: error.message || error.statusMessage || 'Unknown error',
      tenant_id: tenantId,
      details: {
        duration_ms: Date.now() - startTime
      }
    })

    throw error
  }
})

