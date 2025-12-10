// server/utils/payment-with-negative-credits.ts
// Helper functions to handle negative credits during payment

import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { checkNegativeCredits } from './appointment-price-adjustment'

export interface PaymentAmountCalculation {
  baseAmount: number // Original payment amount in Rappen
  debtAmount: number // Negative credits (debt) in Rappen
  totalAmount: number // Final amount to charge (baseAmount + debtAmount)
  hasDebt: boolean
  creditBalance: number // Current credit balance
}

/**
 * Calculate payment amount including negative credits (debt)
 */
export async function calculatePaymentWithDebt(
  userId: string,
  baseAmountRappen: number
): Promise<PaymentAmountCalculation> {
  try {
    logger.debug('PaymentCalc', 'Calculating payment with potential debt for user:', userId)

    // Check for negative credits
    const creditCheck = await checkNegativeCredits(userId)

    logger.debug('PaymentCalc', 'Credit check result:', {
      hasDebt: creditCheck.hasDebt,
      debtAmount: creditCheck.debtAmount,
      creditBalance: creditCheck.creditBalance
    })

    if (creditCheck.hasDebt) {
      // User has debt - add to payment
      const totalAmount = baseAmountRappen + creditCheck.debtAmount

      logger.debug('PaymentCalc', 'Adding debt to payment:', {
        baseAmount: (baseAmountRappen / 100).toFixed(2),
        debtAmount: (creditCheck.debtAmount / 100).toFixed(2),
        totalAmount: (totalAmount / 100).toFixed(2)
      })

      return {
        baseAmount: baseAmountRappen,
        debtAmount: creditCheck.debtAmount,
        totalAmount,
        hasDebt: true,
        creditBalance: creditCheck.creditBalance
      }
    }

    // No debt - normal payment
    return {
      baseAmount: baseAmountRappen,
      debtAmount: 0,
      totalAmount: baseAmountRappen,
      hasDebt: false,
      creditBalance: creditCheck.creditBalance
    }
  } catch (error) {
    logger.error('PaymentCalc', 'Error calculating payment with debt:', error)
    
    // Fallback: return base amount without debt
    return {
      baseAmount: baseAmountRappen,
      debtAmount: 0,
      totalAmount: baseAmountRappen,
      hasDebt: false,
      creditBalance: 0
    }
  }
}

/**
 * Clear negative credits after payment
 * This should be called after a successful payment to reset the debt
 */
export async function clearDebtAfterPayment(
  userId: string,
  paidDebtAmount: number // Amount that was paid towards debt in Rappen
): Promise<{ success: boolean; newBalance: number }> {
  const supabase = getSupabaseAdmin()

  try {
    logger.debug('PaymentCalc', 'Clearing debt after payment:', {
      userId,
      paidDebtAmount: (paidDebtAmount / 100).toFixed(2)
    })

    // Get current credits
    const { data: credits, error: fetchError } = await supabase
      .from('student_credits')
      .select('credits_rappen')
      .eq('user_id', userId)
      .single()

    if (fetchError || !credits) {
      logger.error('PaymentCalc', 'Failed to fetch credits:', fetchError)
      return { success: false, newBalance: 0 }
    }

    const currentBalance = credits.credits_rappen || 0

    // Calculate new balance after clearing debt
    // If balance was -4000 (CHF -40 debt) and user paid 4000, new balance should be 0
    const newBalance = currentBalance + paidDebtAmount

    logger.debug('PaymentCalc', 'Updating credit balance:', {
      oldBalance: (currentBalance / 100).toFixed(2),
      paidAmount: (paidDebtAmount / 100).toFixed(2),
      newBalance: (newBalance / 100).toFixed(2)
    })

    // Update credits
    const { error: updateError } = await supabase
      .from('student_credits')
      .update({
        credits_rappen: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (updateError) {
      logger.error('PaymentCalc', 'Failed to update credits:', updateError)
      return { success: false, newBalance: currentBalance }
    }

    // Log the debt payment in appointment_price_adjustments (for audit trail)
    const { error: logError } = await supabase
      .from('appointment_price_adjustments')
      .insert({
        appointment_id: null, // No specific appointment - this is debt settlement
        old_duration_minutes: 0,
        new_duration_minutes: 0,
        old_price_rappen: 0,
        new_price_rappen: 0,
        adjustment_amount_rappen: paidDebtAmount, // Positive = payment received
        adjustment_type: 'charge',
        adjusted_by: userId, // User themselves paid
        reason: 'Debt settlement from negative credits',
        applied_to_credits: true
      })

    if (logError) {
      logger.error('PaymentCalc', 'Failed to log debt settlement:', logError)
      // Don't fail - the important part (updating credits) succeeded
    }

    logger.debug('PaymentCalc', 'Debt cleared successfully, new balance:', (newBalance / 100).toFixed(2))

    return {
      success: true,
      newBalance
    }
  } catch (error) {
    logger.error('PaymentCalc', 'Error clearing debt:', error)
    return { success: false, newBalance: 0 }
  }
}

/**
 * Format payment description to include debt information
 */
export function formatPaymentDescriptionWithDebt(
  baseDescription: string,
  calculation: PaymentAmountCalculation
): string {
  if (!calculation.hasDebt) {
    return baseDescription
  }

  const debtCHF = (calculation.debtAmount / 100).toFixed(2)
  const baseCHF = (calculation.baseAmount / 100).toFixed(2)

  return `${baseDescription} + Ausgleich offener Betrag (CHF ${debtCHF}) - Total inkl. Schuldenausgleich: CHF ${baseCHF}`
}

