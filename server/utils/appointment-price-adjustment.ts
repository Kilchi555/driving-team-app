// server/utils/appointment-price-adjustment.ts
// Utility functions for handling appointment price adjustments

import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'

export interface PriceAdjustmentResult {
  adjustmentAmount: number // in Rappen
  adjustmentType: 'credit' | 'charge' | 'none'
  oldPrice: number
  newPrice: number
  appliedToCredits: boolean
  error?: string
}

export interface AdjustmentParams {
  appointmentId: string
  newDurationMinutes: number
  adjustedBy: string // userId of staff making the change
  reason?: string
}

/**
 * Calculate the price difference for an appointment duration change
 */
export async function calculatePriceAdjustment(
  appointmentId: string,
  newDurationMinutes: number
): Promise<{ oldPrice: number; newPrice: number; difference: number } | null> {
  const supabase = getSupabaseAdmin()

  try {
    // Get appointment details
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select('id, user_id, staff_id, category, duration_minutes, lesson_price_rappen, original_price_rappen, status')
      .eq('id', appointmentId)
      .single()

    if (error || !appointment) {
      logger.error('PriceAdjustment', 'Failed to load appointment:', error)
      return null
    }

    // Determine the original price (either from original_price_rappen or current lesson_price_rappen)
    const oldPrice = appointment.original_price_rappen || appointment.lesson_price_rappen || 0
    const oldDuration = appointment.duration_minutes

    // Calculate new price based on duration
    // We need to get the pricing rules for this category and duration
    const { data: pricingRules } = await supabase
      .from('pricing_rules')
      .select('*')
      .eq('category', appointment.category)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!pricingRules) {
      // Fallback: Calculate proportionally based on old price
      const pricePerMinute = oldPrice / oldDuration
      const newPrice = Math.round(pricePerMinute * newDurationMinutes)
      const difference = newPrice - oldPrice

      logger.debug('PriceAdjustment', 'Calculated proportional price:', {
        oldPrice,
        oldDuration,
        newPrice,
        newDuration: newDurationMinutes,
        difference
      })

      return { oldPrice, newPrice, difference }
    }

    // Calculate new price using pricing rules
    const newPrice = calculatePriceFromRules(pricingRules, newDurationMinutes)
    const difference = newPrice - oldPrice

    logger.debug('PriceAdjustment', 'Calculated price from rules:', {
      oldPrice,
      oldDuration,
      newPrice,
      newDuration: newDurationMinutes,
      difference
    })

    return { oldPrice, newPrice, difference }
  } catch (error) {
    logger.error('PriceAdjustment', 'Error calculating price adjustment:', error)
    return null
  }
}

/**
 * Calculate price from pricing rules
 * This is a simplified version - adapt based on your actual pricing logic
 */
function calculatePriceFromRules(pricingRule: any, durationMinutes: number): number {
  // Assuming pricing_rule has base_price and price_per_minute or similar
  // Adapt this based on your actual pricing_rules structure
  const basePrice = pricingRule.base_price_rappen || 0
  const pricePerMinute = pricingRule.price_per_minute_rappen || 0
  
  return basePrice + (pricePerMinute * durationMinutes)
}

/**
 * Apply price adjustment: update credits and log the change
 */
export async function applyPriceAdjustment(
  params: AdjustmentParams
): Promise<PriceAdjustmentResult> {
  const supabase = getSupabaseAdmin()
  const { appointmentId, newDurationMinutes, adjustedBy, reason } = params

  try {
    // 1. Calculate price difference
    const calculation = await calculatePriceAdjustment(appointmentId, newDurationMinutes)
    
    if (!calculation) {
      return {
        adjustmentAmount: 0,
        adjustmentType: 'none',
        oldPrice: 0,
        newPrice: 0,
        appliedToCredits: false,
        error: 'Failed to calculate price adjustment'
      }
    }

    const { oldPrice, newPrice, difference } = calculation

    // If no difference, no adjustment needed
    if (difference === 0) {
      logger.debug('PriceAdjustment', 'No price difference, skipping adjustment')
      return {
        adjustmentAmount: 0,
        adjustmentType: 'none',
        oldPrice,
        newPrice,
        appliedToCredits: false
      }
    }

    // 2. Get appointment and user details
    const { data: appointment } = await supabase
      .from('appointments')
      .select('id, user_id, duration_minutes, original_price_rappen')
      .eq('id', appointmentId)
      .single()

    if (!appointment) {
      throw new Error('Appointment not found')
    }

    const userId = appointment.user_id
    const oldDuration = appointment.duration_minutes

    // 3. Determine adjustment type
    const adjustmentType: 'credit' | 'charge' = difference < 0 ? 'credit' : 'charge'

    // 4. Update student_credits
    const creditChange = Math.abs(difference)
    const operation = adjustmentType === 'credit' ? '+' : '-'

    logger.debug('PriceAdjustment', `Adjusting credits: ${operation}${creditChange} Rappen`)

    const { data: currentCredits } = await supabase
      .from('student_credits')
      .select('credits_rappen')
      .eq('user_id', userId)
      .single()

    const newCreditBalance = adjustmentType === 'credit'
      ? (currentCredits?.credits_rappen || 0) + creditChange
      : (currentCredits?.credits_rappen || 0) - creditChange

    const { error: creditsError } = await supabase
      .from('student_credits')
      .upsert({
        user_id: userId,
        credits_rappen: newCreditBalance
      })

    if (creditsError) {
      logger.error('PriceAdjustment', 'Failed to update credits:', creditsError)
      throw new Error('Failed to update student credits')
    }

    // 5. Log the adjustment
    const { error: logError } = await supabase
      .from('appointment_price_adjustments')
      .insert({
        appointment_id: appointmentId,
        old_duration_minutes: oldDuration,
        new_duration_minutes: newDurationMinutes,
        old_price_rappen: oldPrice,
        new_price_rappen: newPrice,
        adjustment_amount_rappen: difference,
        adjustment_type: adjustmentType,
        adjusted_by: adjustedBy,
        reason: reason || null,
        applied_to_credits: true
      })

    if (logError) {
      logger.error('PriceAdjustment', 'Failed to log adjustment:', logError)
      // Don't fail - credits were already updated
    }

    // 6. Update appointment with original_price_rappen if not set
    if (!appointment.original_price_rappen) {
      await supabase
        .from('appointments')
        .update({ original_price_rappen: oldPrice })
        .eq('id', appointmentId)
    }

    logger.debug('PriceAdjustment', 'Adjustment applied successfully:', {
      appointmentId,
      adjustmentType,
      amount: difference,
      newCreditBalance
    })

    return {
      adjustmentAmount: difference,
      adjustmentType,
      oldPrice,
      newPrice,
      appliedToCredits: true
    }
  } catch (error: any) {
    logger.error('PriceAdjustment', 'Error applying price adjustment:', error)
    return {
      adjustmentAmount: 0,
      adjustmentType: 'none',
      oldPrice: 0,
      newPrice: 0,
      appliedToCredits: false,
      error: error.message || 'Unknown error'
    }
  }
}

/**
 * Get adjustment history for an appointment
 */
export async function getAdjustmentHistory(appointmentId: string) {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('appointment_price_adjustments')
    .select(`
      *,
      adjusted_by_user:users!adjusted_by(id, first_name, last_name)
    `)
    .eq('appointment_id', appointmentId)
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('PriceAdjustment', 'Failed to load adjustment history:', error)
    return []
  }

  return data || []
}

/**
 * Check if user has negative credits (debt)
 */
export async function checkNegativeCredits(userId: string): Promise<{
  hasDebt: boolean
  debtAmount: number // positive number in Rappen
  creditBalance: number // actual balance (can be negative)
}> {
  const supabase = getSupabaseAdmin()

  const { data } = await supabase
    .from('student_credits')
    .select('credits_rappen')
    .eq('user_id', userId)
    .single()

  const creditBalance = data?.credits_rappen || 0
  const hasDebt = creditBalance < 0
  const debtAmount = hasDebt ? Math.abs(creditBalance) : 0

  return {
    hasDebt,
    debtAmount,
    creditBalance
  }
}

