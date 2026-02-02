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

    // IMPORTANT: Token is optional for most pricing actions
    // We only need tenant_id for certain operations
    let user: any = null
    let tenantId: string | null = null

    if (token) {
      try {
        // Get current user
        const { data: { user: authUser }, error: userError } = await supabaseAdmin.auth.getUser(token)
        if (!userError && authUser) {
          user = authUser

          // Get user profile for tenant_id
          const { data: userProfile, error: profileError } = await supabaseAdmin
            .from('users')
            .select('tenant_id')
            .eq('id', user.id)
            .single()

          if (!profileError && userProfile?.tenant_id) {
            tenantId = userProfile.tenant_id
            logger.debug('👤 User authenticated:', { userId: user.id, tenantId })
          } else {
            logger.debug('👤 User authenticated but no tenant_id')
          }
        }
      } catch (err: any) {
        logger.warn('⚠️ Failed to authenticate user, using fallback pricing')
      }
    } else {
      logger.debug('ℹ️ No authorization token provided, using fallback pricing')
    }

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
      // Can be called with tenantId (get all) or categoryCode (get specific)
      logger.debug('💰 Getting pricing rules', { tenantId })

      // If no tenant_id, return empty and let client use fallback
      if (!tenantId) {
        logger.debug('ℹ️ No tenant_id available, returning empty pricing rules')
        return {
          success: true,
          data: []
        }
      }

      let query = supabaseAdmin
        .from('pricing_rules')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('category_code')

      if (body.categoryCode) {
        query = query.eq('category_code', body.categoryCode)
      }

      const { data: rawRules, error } = await query

      if (error) {
        logger.error('❌ Error fetching pricing rules:', error)
        // Gracefully return empty, client will use fallback
        return {
          success: true,
          data: []
        }
      }

      if (!rawRules || rawRules.length === 0) {
        return {
          success: true,
          data: []
        }
      }

      // If getting all rules (no specific category), combine by category
      if (!body.categoryCode) {
        // Combine rules by category_code (merge base and admin_fee rules)
        const rulesByCategory = rawRules.reduce((acc, rule) => {
          if (!acc[rule.category_code]) {
            acc[rule.category_code] = {
              category_code: rule.category_code,
              rule_name: rule.rule_name || `${rule.category_code} - Regel`,
              price_per_minute_rappen: 0,
              admin_fee_rappen: 0,
              admin_fee_applies_from: 2,
              base_duration_minutes: 45,
              is_active: true,
              valid_from: rule.valid_from,
              valid_until: rule.valid_until
            }
          }

          // Combine values based on rule_type
          if (rule.rule_type === 'base' || rule.rule_type === 'pricing' || rule.rule_type === 'base_price' || !rule.rule_type) {
            if (rule.price_per_minute_rappen) {
              acc[rule.category_code].price_per_minute_rappen = rule.price_per_minute_rappen
            }
            if (rule.base_duration_minutes) {
              acc[rule.category_code].base_duration_minutes = rule.base_duration_minutes
            }
            if (rule.rule_name && !acc[rule.category_code].rule_name.includes('Admin-Fee')) {
              acc[rule.category_code].rule_name = rule.rule_name
            }
          }

          if (rule.rule_type === 'admin_fee') {
            if (rule.admin_fee_rappen !== undefined) {
              acc[rule.category_code].admin_fee_rappen = rule.admin_fee_rappen
            }
            if (rule.admin_fee_applies_from !== undefined) {
              acc[rule.category_code].admin_fee_applies_from = rule.admin_fee_applies_from
            }
            if (rule.rule_name) {
              acc[rule.category_code].rule_name = rule.rule_name
            }
          }

          return acc
        }, {} as Record<string, any>)

        const combined = Object.values(rulesByCategory)
        logger.debug('💰 Pricing rules combined:', combined.length, 'categories')
        return {
          success: true,
          data: combined
        }
      }

      return {
        success: true,
        data: rawRules || []
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
        durationMinutes: body.durationMinutes,
        hasTenantId: !!tenantId
      })

      // If no tenant_id, return empty data to signal client should use fallback
      if (!tenantId) {
        logger.debug('ℹ️ No tenant_id for price calculation, returning empty')
        return {
          success: true,
          data: null
        }
      }

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
        // Return null to signal client should use fallback
        logger.debug('ℹ️ No pricing rule found, client will use fallback')
        return {
          success: true,
          data: null
        }
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
