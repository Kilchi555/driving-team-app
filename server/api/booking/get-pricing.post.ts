/**
 * Public API: Get Pricing for Booking
 * 
 * PURPOSE:
 * Fetch pricing rules for a specific category and duration for the booking flow.
 * Reuses the same pricing logic as the internal calculate.post.ts but optimized for public booking.
 * 
 * SECURITY:
 * - Public endpoint (no auth required)
 * - Tenant isolation via tenant_id parameter
 * - Only returns active pricing rules
 * 
 * USAGE:
 * POST /api/booking/get-pricing
 * Body: { tenant_id: "<uuid>", category_code: "B", duration_minutes?: 45 }
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

interface GetPricingRequest {
  tenant_id: string
  category_code: string
  duration_minutes?: number
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) as GetPricingRequest
    const { tenant_id, category_code, duration_minutes } = body

    // Validate required parameters
    if (!tenant_id || !category_code) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required parameters: tenant_id, category_code'
      })
    }

    const supabase = getSupabaseAdmin()

    logger.debug('💰 Fetching pricing for booking:', {
      tenant_id,
      category_code,
      duration_minutes
    })

    // 1. Get active pricing rules for this category (using same logic as pricing/calculate.post.ts)
    const { data: rawRules, error: pricingError } = await supabase
      .from('pricing_rules')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('category_code', category_code)
      .eq('is_active', true)
      .order('valid_from', { ascending: false })

    if (pricingError) {
      logger.error('❌ Error fetching pricing rules:', pricingError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to load pricing information'
      })
    }

    if (!rawRules || rawRules.length === 0) {
      logger.warn('⚠️ No pricing rules found for category:', category_code)
      // Return null pricing - frontend will handle gracefully
      return {
        success: true,
        pricing: null,
        price_rappen: null,
        price_chf: null
      }
    }

    // 2. Combine rules by rule_type (same logic as pricing/calculate.post.ts)
    const combined = {
      category_code: category_code,
      rule_name: '',
      price_per_minute_rappen: 0,
      admin_fee_rappen: 0,
      admin_fee_applies_from: 2,
      base_duration_minutes: 45,
      is_active: true,
      valid_from: null as string | null,
      valid_until: null as string | null
    }

    rawRules.forEach((rule: any) => {
      // Base pricing rules
      if (rule.rule_type === 'base' || rule.rule_type === 'pricing' || rule.rule_type === 'base_price' || !rule.rule_type) {
        if (rule.price_per_minute_rappen) {
          combined.price_per_minute_rappen = rule.price_per_minute_rappen
        }
        if (rule.base_duration_minutes) {
          combined.base_duration_minutes = rule.base_duration_minutes
        }
        if (rule.rule_name && !combined.rule_name.includes('Admin-Fee')) {
          combined.rule_name = rule.rule_name
        }
        if (rule.valid_from) {
          combined.valid_from = rule.valid_from
        }
        if (rule.valid_until) {
          combined.valid_until = rule.valid_until
        }
      }

      // Admin fee rules
      if (rule.rule_type === 'admin_fee') {
        if (rule.admin_fee_rappen !== undefined) {
          combined.admin_fee_rappen = rule.admin_fee_rappen
        }
        if (rule.admin_fee_applies_from !== undefined) {
          combined.admin_fee_applies_from = rule.admin_fee_applies_from
        }
      }
    })

    // 3. Calculate total price for the duration (WITHOUT admin fee for display)
    const durationMinutes = duration_minutes || combined.base_duration_minutes || 45
    let priceRappen = combined.price_per_minute_rappen * durationMinutes

    // ℹ️ Do NOT add admin_fee here - it's shown separately to the user
    // Admin fee is only added at checkout/payment time

    // ✅ SWISS ROUNDING: Round to nearest Franken (50 Rappen boundary)
    const roundToNearestFranken = (rappen: number): number => {
      const remainder = rappen % 100
      if (remainder === 0) return rappen
      if (remainder < 50) return rappen - remainder      // Round down if < 50 Rappen
      else return rappen + (100 - remainder)             // Round up if >= 50 Rappen
    }

    const roundedPriceRappen = roundToNearestFranken(priceRappen)
    const priceCHF = (roundedPriceRappen / 100).toFixed(2)

    logger.debug('✅ Pricing loaded (base price without admin fee):', {
      category_code,
      duration_minutes: durationMinutes,
      price_per_minute: combined.price_per_minute_rappen,
      admin_fee_available: combined.admin_fee_rappen,
      base_price_before_rounding_rappen: priceRappen,
      base_price_before_rounding_chf: (priceRappen / 100).toFixed(2),
      rounded_base_price_rappen: roundedPriceRappen,
      display_price_chf: priceCHF
    })

    return {
      success: true,
      pricing: combined,
      price_rappen: roundedPriceRappen,
      price_chf: priceCHF,
      duration_minutes: durationMinutes
    }

  } catch (err: any) {
    logger.error('❌ Error in get-pricing:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to fetch pricing'
    })
  }
})
