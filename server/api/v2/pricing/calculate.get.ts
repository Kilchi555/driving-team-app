import { defineEventHandler, createError, getQuery } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { validateUUID } from '~/server/utils/validators'
import { calculatePricingServerSide } from '~/server/utils/pricing-calculator'

/**
 * V2 Pricing API - Server-Side Price Calculation
 * 
 * ✅ USES EXACT SAME LOGIC AS usePricing.ts composable via shared helper!
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

    // ============ LAYER 6: CALCULATE PRICING SERVER-SIDE ============
    const pricing = await calculatePricingServerSide({
      userId: userId as string,
      tenantId,
      category: category as string,
      durationMinutes,
      appointmentType: appointmentType as any,
      productIds,
      voucherCode: voucherCode as string,
      useCredit
    })

    logger.debug('✅ Pricing calculated:', {
      finalTotal: (pricing.finalTotalRappen / 100).toFixed(2),
      duration_ms: Date.now() - startTime
    })

    // ============ RETURN COMPLETE BREAKDOWN ============
    return {
      success: true,
      pricing: {
        basePriceRappen: pricing.basePriceRappen,
        adminFeeRappen: pricing.adminFeeRappen,
        productsPriceRappen: pricing.productsPriceRappen,
        voucherDiscountRappen: pricing.voucherDiscountRappen,
        creditAvailableRappen: pricing.creditAvailableRappen,
        creditToUseRappen: pricing.creditToUseRappen,
        subtotalRappen: pricing.subtotalRappen,
        totalDiscountRappen: pricing.totalDiscountRappen,
        totalBeforeCreditRappen: pricing.totalBeforeCreditRappen,
        finalTotalRappen: pricing.finalTotalRappen
      },
      breakdown: {
        basePrice: (pricing.basePriceRappen / 100).toFixed(2),
        adminFee: (pricing.adminFeeRappen / 100).toFixed(2),
        productsPrice: (pricing.productsPriceRappen / 100).toFixed(2),
        voucherDiscount: (pricing.voucherDiscountRappen / 100).toFixed(2),
        creditAvailable: (pricing.creditAvailableRappen / 100).toFixed(2),
        creditToUse: (pricing.creditToUseRappen / 100).toFixed(2),
        subtotal: (pricing.subtotalRappen / 100).toFixed(2),
        totalDiscount: (pricing.totalDiscountRappen / 100).toFixed(2),
        totalBeforeCredit: (pricing.totalBeforeCreditRappen / 100).toFixed(2),
        finalTotal: (pricing.finalTotalRappen / 100).toFixed(2)
      },
      details: {
        products: pricing.productDetails || [],
        voucher: pricing.voucherDetails || null
      }
    }

  } catch (error: any) {
    logger.error('❌ Error calculating pricing:', error)
    throw error
  }
})
