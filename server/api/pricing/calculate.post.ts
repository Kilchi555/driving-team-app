// server/api/pricing/calculate.post.ts
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getHeader } from 'h3'

interface CalculatePricingBody {
  action: 'get-event-type' | 'get-pricing-rules' | 'get-appointment-count' | 'check-admin-fee' | 'calculate-price' | 'should-apply-admin-fee'
  code?: string
  tenantId?: string
  categoryCode?: string
  userId?: string
  durationMinutes?: number
  appointmentNumber?: number
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<CalculatePricingBody>(event)
    const { action } = body

    logger.debug('💰 Pricing calculation:', action)

    const supabaseAdmin = getSupabaseAdmin()
    const authorization = getHeader(event, 'authorization')
    const token = authorization?.replace('Bearer ', '')

    if (!token) {
      throw new Error('No authorization token')
    }

    // Get current user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Get user profile for tenant_id
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile?.tenant_id) {
      throw new Error('User profile not found')
    }

    const tenantId = userProfile.tenant_id

    // ========== GET EVENT TYPE ==========
    if (action === 'get-event-type') {
      if (!body.code) {
        throw new Error('Code required')
      }

      logger.debug('📋 Getting event type:', body.code)

      const { data: eventType, error } = await supabaseAdmin
        .from('event_types')
        .select('code, name, default_price_rappen, default_fee_rappen, require_payment')
        .eq('code', body.code)
        .eq('is_active', true)
        .single()

      if (error) {
        logger.warn('⚠️ Event type not found:', body.code)
        return {
          success: false,
          data: null
        }
      }

      return {
        success: true,
        data: eventType
      }
    }

    // ========== GET PRICING RULES ==========
    if (action === 'get-pricing-rules') {
      if (!body.categoryCode) {
        throw new Error('Category code required')
      }

      logger.debug('💰 Getting pricing rules for:', body.categoryCode)

      const { data: rules, error } = await supabaseAdmin
        .from('pricing_rules')
        .select('*')
        .eq('category_code', body.categoryCode)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        logger.error('❌ Error fetching pricing rules:', error)
        throw new Error(error.message)
      }

      return {
        success: true,
        data: rules || []
      }
    }

    // ========== GET APPOINTMENT COUNT ==========
    if (action === 'get-appointment-count') {
      if (!body.userId || !body.categoryCode) {
        throw new Error('User ID and category code required')
      }

      logger.debug('📊 Getting appointment count for user:', body.userId)

      const { count, error } = await supabaseAdmin
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', body.userId)
        .in('status', ['completed', 'confirmed'])

      if (error) {
        logger.warn('⚠️ Error counting appointments:', error)
        return {
          success: true,
          data: { count: 1 } // Default to 1 if error
        }
      }

      return {
        success: true,
        data: { count: (count || 0) + 1 }
      }
    }

    // ========== CHECK ADMIN FEE ==========
    if (action === 'check-admin-fee') {
      if (!body.userId || !body.categoryCode) {
        throw new Error('User ID and category code required')
      }

      logger.debug('💳 Checking if admin fee was paid:', body.userId)

      // Check if admin fee was paid in last 12 months for this category
      const twelveMonthsAgo = new Date()
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

      const { count, error } = await supabaseAdmin
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', body.userId)
        .eq('admin_fee_rappen', 0)
        .gte('created_at', twelveMonthsAgo.toISOString())

      if (error) {
        logger.warn('⚠️ Error checking admin fee payment:', error)
        return {
          success: true,
          data: { paid: false }
        }
      }

      const paid = (count || 0) > 0

      return {
        success: true,
        data: { paid }
      }
    }

    // ========== SHOULD APPLY ADMIN FEE ==========
    if (action === 'should-apply-admin-fee') {
      if (!body.userId || !body.categoryCode || body.appointmentNumber === undefined) {
        throw new Error('User ID, category code, and appointment number required')
      }

      logger.debug('🔍 Checking if admin fee should apply:', {
        userId: body.userId,
        appointmentNumber: body.appointmentNumber
      })

      // Admin fee applies for every 10th appointment
      const shouldApply = body.appointmentNumber % 10 === 0

      // But only if not paid recently
      let hasPaidRecently = false
      if (shouldApply) {
        const { count, error } = await supabaseAdmin
          .from('payments')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', body.userId)
          .eq('admin_fee_rappen', 0)
          .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())

        if (!error && count && count > 0) {
          hasPaidRecently = true
        }
      }

      const finalShouldApply = shouldApply && !hasPaidRecently

      logger.debug('✅ Admin fee decision:', {
        shouldApply,
        hasPaidRecently,
        finalShouldApply
      })

      return {
        success: true,
        data: { shouldApply: finalShouldApply }
      }
    }

    // ========== CALCULATE PRICE ==========
    if (action === 'calculate-price') {
      if (!body.categoryCode || body.durationMinutes === undefined) {
        throw new Error('Category code and duration required')
      }

      logger.debug('💰 Calculating price:', {
        categoryCode: body.categoryCode,
        durationMinutes: body.durationMinutes
      })

      // Get pricing rule
      const { data: rules, error: rulesError } = await supabaseAdmin
        .from('pricing_rules')
        .select('*')
        .eq('category_code', body.categoryCode)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)

      if (rulesError || !rules || rules.length === 0) {
        throw new Error('No pricing rule found for this category')
      }

      const rule = rules[0]

      // Calculate base price
      const baseDuration = Math.max(body.durationMinutes, rule.base_duration_minutes)
      const basePriceRappen = Math.round(baseDuration * rule.price_per_minute_rappen)

      // Calculate admin fee
      let adminFeeRappen = 0
      if (body.appointmentNumber && body.appointmentNumber % 10 === 0) {
        adminFeeRappen = rule.admin_fee_rappen
      }

      const totalRappen = basePriceRappen + adminFeeRappen

      logger.debug('✅ Price calculated:', {
        basePriceRappen,
        adminFeeRappen,
        totalRappen
      })

      return {
        success: true,
        data: {
          basePriceRappen,
          adminFeeRappen,
          totalRappen,
          basePriceChf: (basePriceRappen / 100).toFixed(2),
          adminFeeChf: (adminFeeRappen / 100).toFixed(2),
          totalChf: (totalRappen / 100).toFixed(2)
        }
      }
    }

    throw new Error('Unknown action: ' + action)

  } catch (error: any) {
    logger.error('❌ Error in pricing calculation:', error)
    throw createError({
      statusCode: 400,
      statusMessage: error.message || 'Failed to calculate pricing'
    })
  }
})
