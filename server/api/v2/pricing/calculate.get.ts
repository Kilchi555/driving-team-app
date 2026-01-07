import { defineEventHandler, createError, getQuery } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { validateUUID } from '~/server/utils/validators'

/**
 * V2 Pricing API - Server-Side Price Calculation
 * 
 * ✅ USES EXACT SAME LOGIC AS usePricing.ts composable!
 * 
 * This API calculates ALL prices on the server to prevent client-side manipulation.
 * Frontend only provides data, server calculates and returns the breakdown.
 * 
 * Query Parameters:
 * - userId: UUID (required)
 * - category: string (required, e.g. "B")
 * - durationMinutes: number (required)
 * - appointmentType: string (optional, "lesson" | "theory" | "consultation")
 * - voucherCode: string (optional)
 * - useCredit: boolean (optional)
 * - productIds: string[] (optional, comma-separated)
 */

// ✅ HELPER: Round to nearest Franken (from usePricing.ts line 469-476)
const roundToNearestFranken = (rappen: number): number => {
  const remainder = rappen % 100
  if (remainder < 50) {
    return rappen - remainder
  } else {
    return rappen + (100 - remainder)
  }
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  let authenticatedUserId: string | undefined
  let tenantId: string | undefined

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
      'calculate_pricing',
      200, // High limit for real-time calculations
      60 * 1000
    )
    if (!rateLimitResult.allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Zu viele Anfragen'
      })
    }

    // ============ LAYER 3: PARSE & VALIDATE INPUT ============
    const query = getQuery(event)
    const {
      userId,
      category,
      durationMinutes: durationStr,
      appointmentType = 'lesson',
      voucherCode,
      useCredit: useCreditStr,
      productIds: productIdsStr
    } = query

    // Validate required fields
    if (!userId || !validateUUID(userId as string).valid) {
      throw createError({ statusCode: 400, statusMessage: 'Valid userId required' })
    }
    if (!category || typeof category !== 'string') {
      throw createError({ statusCode: 400, statusMessage: 'Category required' })
    }
    if (!durationStr || isNaN(Number(durationStr))) {
      throw createError({ statusCode: 400, statusMessage: 'Valid durationMinutes required' })
    }

    const durationMinutes = Number(durationStr)
    const useCredit = useCreditStr === 'true'
    const productIds = productIdsStr ? String(productIdsStr).split(',') : []

    const supabaseAdmin = getSupabaseAdmin()

    // ============ LAYER 4: GET TENANT FROM AUTHENTICATED USER ============
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id')
      .eq('auth_user_id', authenticatedUserId)
      .single()

    if (userError || !userData) {
      throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }

    tenantId = userData.tenant_id

    // ============ LAYER 5: VERIFY USER BELONGS TO TENANT ============
    const { data: targetUser, error: targetUserError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id')
      .eq('id', userId)
      .single()

    if (targetUserError || !targetUser || targetUser.tenant_id !== tenantId) {
      throw createError({ statusCode: 403, statusMessage: 'Not authorized' })
    }

    // ============ LAYER 6: CALCULATE BASE PRICE ============
    // ✅ SAME LOGIC AS usePricing.ts line 828-847
    
    // Load pricing rules for this category and tenant
    const { data: pricingRule, error: pricingError } = await supabaseAdmin
      .from('pricing_rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('category_code', category)
      .eq('rule_type', appointmentType === 'theory' ? 'theory' : appointmentType === 'consultation' ? 'consultation' : 'base_price')
      .single()

    if (pricingError || !pricingRule) {
      logger.warn(`⚠️ No pricing rule found for category ${category} type ${appointmentType}`)
      throw createError({ statusCode: 404, statusMessage: 'Pricing rule not found for this category' })
    }

    const pricePerMinuteRappen = pricingRule.price_per_minute || 0
    let basePriceRappen = Math.round(durationMinutes * pricePerMinuteRappen)
    
    // ✅ USE EXISTING LOGIC: Round to nearest Franken (like usePricing.ts does)
    basePriceRappen = roundToNearestFranken(basePriceRappen)

    logger.debug('💰 Base price calculated:', {
      category,
      durationMinutes,
      pricePerMinute: (pricePerMinuteRappen / 100).toFixed(2),
      basePrice: (basePriceRappen / 100).toFixed(2)
    })

    // ============ LAYER 7: CALCULATE ADMIN FEE ============
    // ✅ SAME LOGIC AS usePricing.ts line 849-867
    
    const motorcycleCategories = ['A', 'A1', 'A35kW']
    const isMotorcycle = motorcycleCategories.includes(category)
    
    let adminFeeRappen = 0
    
    if (!isMotorcycle && appointmentType !== 'theory' && appointmentType !== 'consultation') {
      // Get appointment count (from usePricing.ts line 576-596)
      const { count: appointmentCount } = await supabaseAdmin
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('type', category)
        .is('deleted_at', null)
        .not('status', 'in', '(cancelled,aborted)')
      
      // Check if admin fee was already paid (from usePricing.ts line 505-556)
      const { data: paymentsData } = await supabaseAdmin
        .from('payments')
        .select('id, admin_fee_rappen, metadata')
        .eq('user_id', userId)
        .gt('admin_fee_rappen', 0)
        .limit(100)
      
      const paymentsWithAdminFee = paymentsData?.filter(payment => {
        let metadataObj: any = {}
        try {
          if (payment.metadata == null) {
            metadataObj = {}
          } else if (typeof payment.metadata === 'string') {
            metadataObj = JSON.parse(payment.metadata)
          } else if (typeof payment.metadata === 'object') {
            metadataObj = payment.metadata
          } else {
            metadataObj = {}
          }
        } catch (_e) {
          metadataObj = {}
        }
        return metadataObj?.category === category
      }) || []
      
      const adminFeeAlreadyPaid = paymentsWithAdminFee.length > 0
      
      // ✅ EXACT LOGIC from usePricing.ts line 559-574
      // Admin fee applies on appointment #2 AND not yet paid
      const currentAppointmentNumber = (appointmentCount || 0) + 1
      const shouldApplyAdminFee = currentAppointmentNumber === 2 && !adminFeeAlreadyPaid
      
      if (shouldApplyAdminFee) {
        // Load admin fee from pricing rules
        const { data: adminFeeRule } = await supabaseAdmin
          .from('pricing_rules')
          .select('admin_fee, admin_fee_applies_from')
          .eq('tenant_id', tenantId)
          .eq('category_code', category)
          .eq('rule_type', 'admin_fee')
          .single()
        
        if (adminFeeRule) {
          adminFeeRappen = adminFeeRule.admin_fee || 0
        }
      }
      
      logger.debug('💰 Admin fee calculated:', {
        appointmentCount: currentAppointmentNumber,
        adminFeeAlreadyPaid,
        shouldApply: shouldApplyAdminFee,
        adminFee: (adminFeeRappen / 100).toFixed(2)
      })
    }

    // ============ LAYER 8: CALCULATE PRODUCTS PRICE ============
    let productsPriceRappen = 0
    const productDetails: any[] = []

    if (productIds.length > 0) {
      const { data: products, error: productsError } = await supabaseAdmin
        .from('products')
        .select('id, name, price_rappen')
        .in('id', productIds)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)

      if (!productsError && products) {
        productsPriceRappen = products.reduce((sum, p) => sum + (p.price_rappen || 0), 0)
        productDetails.push(...products)
      }
    }

    logger.debug('💰 Products price calculated:', {
      productCount: productIds.length,
      productsPrice: (productsPriceRappen / 100).toFixed(2)
    })

    // ============ LAYER 9: VALIDATE & CALCULATE VOUCHER DISCOUNT ============
    let voucherDiscountRappen = 0
    let voucherDetails: any = null

    if (voucherCode) {
      const { data: voucher, error: voucherError } = await supabaseAdmin
        .from('voucher_codes')
        .select('*')
        .eq('code', voucherCode.toUpperCase())
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .single()

      if (voucherError) {
        // Don't throw - just return 0 discount and error message
        logger.warn(`⚠️ Voucher code not found: ${voucherCode}`)
        voucherDetails = { error: `Gutschein-Code "${voucherCode}" ist ungültig` }
      } else {
        // Validate voucher
        const now = new Date()
        if (voucher.valid_from && new Date(voucher.valid_from) > now) {
          voucherDetails = { error: 'Dieser Gutschein ist noch nicht gültig' }
        } else if (voucher.valid_until && new Date(voucher.valid_until) < now) {
          voucherDetails = { error: 'Dieser Gutschein ist abgelaufen' }
        } else if (voucher.type === 'discount') {
          // Check usage limits
          const { count: redemptionCount } = await supabaseAdmin
            .from('voucher_redemptions')
            .select('*', { count: 'exact', head: true })
            .eq('voucher_code_id', voucher.id)

          if (voucher.max_redemptions && redemptionCount && redemptionCount >= voucher.max_redemptions) {
            voucherDetails = { error: 'Dieser Gutschein hat sein Verwendungslimit erreicht' }
          } else {
            // Calculate discount
            const subtotal = basePriceRappen + adminFeeRappen + productsPriceRappen
            
            if (voucher.discount_type === 'percentage') {
              voucherDiscountRappen = Math.round((subtotal * voucher.discount_value) / 100)
              if (voucher.max_discount_rappen && voucherDiscountRappen > voucher.max_discount_rappen) {
                voucherDiscountRappen = voucher.max_discount_rappen
              }
            } else if (voucher.discount_type === 'fixed') {
              voucherDiscountRappen = voucher.discount_value
            }

            voucherDetails = {
              code: voucher.code,
              type: voucher.discount_type,
              value: voucher.discount_value,
              discount: voucherDiscountRappen
            }
          }
        } else {
          voucherDetails = { error: `Code "${voucherCode}" ist kein Rabatt-Code` }
        }
      }
    }

    logger.debug('💰 Voucher discount calculated:', {
      voucherCode,
      discount: (voucherDiscountRappen / 100).toFixed(2)
    })

    // ============ LAYER 10: CALCULATE CREDIT AVAILABLE ============
    let creditAvailableRappen = 0
    let creditToUseRappen = 0

    if (useCredit) {
      const { data: studentCredit } = await supabaseAdmin
        .from('student_credits')
        .select('balance_rappen')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .single()

      creditAvailableRappen = studentCredit?.balance_rappen || 0

      // Calculate how much credit can be used
      const totalBeforeCredit = Math.max(0, basePriceRappen + adminFeeRappen + productsPriceRappen - voucherDiscountRappen)
      creditToUseRappen = Math.min(creditAvailableRappen, totalBeforeCredit)
    }

    logger.debug('💰 Credit calculated:', {
      available: (creditAvailableRappen / 100).toFixed(2),
      toUse: (creditToUseRappen / 100).toFixed(2)
    })

    // ============ LAYER 11: CALCULATE FINAL TOTAL ============
    const subtotal = basePriceRappen + adminFeeRappen + productsPriceRappen
    const totalDiscount = voucherDiscountRappen
    const totalBeforeCredit = Math.max(0, subtotal - totalDiscount)
    const finalTotal = Math.max(0, totalBeforeCredit - creditToUseRappen)

    logger.debug('✅ Final price calculated:', {
      subtotal: (subtotal / 100).toFixed(2),
      discount: (totalDiscount / 100).toFixed(2),
      beforeCredit: (totalBeforeCredit / 100).toFixed(2),
      creditUsed: (creditToUseRappen / 100).toFixed(2),
      finalTotal: (finalTotal / 100).toFixed(2),
      duration_ms: Date.now() - startTime
    })

    // ============ RETURN COMPLETE BREAKDOWN ============
    return {
      success: true,
      pricing: {
        basePriceRappen,
        adminFeeRappen,
        productsPriceRappen,
        voucherDiscountRappen,
        creditAvailableRappen,
        creditToUseRappen,
        subtotalRappen: subtotal,
        totalDiscountRappen: totalDiscount,
        totalBeforeCreditRappen: totalBeforeCredit,
        finalTotalRappen: finalTotal
      },
      breakdown: {
        basePrice: (basePriceRappen / 100).toFixed(2),
        adminFee: (adminFeeRappen / 100).toFixed(2),
        productsPrice: (productsPriceRappen / 100).toFixed(2),
        voucherDiscount: (voucherDiscountRappen / 100).toFixed(2),
        creditAvailable: (creditAvailableRappen / 100).toFixed(2),
        creditToUse: (creditToUseRappen / 100).toFixed(2),
        subtotal: (subtotal / 100).toFixed(2),
        totalDiscount: (totalDiscount / 100).toFixed(2),
        totalBeforeCredit: (totalBeforeCredit / 100).toFixed(2),
        finalTotal: (finalTotal / 100).toFixed(2)
      },
      details: {
        pricePerMinute: (pricePerMinuteRappen / 100).toFixed(2),
        products: productDetails,
        voucher: voucherDetails
      }
    }

  } catch (error: any) {
    logger.error('❌ Error calculating pricing:', error)
    throw error
  }
})
