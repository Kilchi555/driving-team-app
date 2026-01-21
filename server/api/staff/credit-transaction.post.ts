import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { createClient } from '@supabase/supabase-js'
import logger from '~/utils/logger'

/**
 * ✅ POST /api/staff/credit-transaction
 * 
 * Secure API to add or deduct student credit
 * 
 * Body:
 *   - user_id (required): Student user ID
 *   - amount_rappen (required): Amount in rappen (positive for credit, negative for debit)
 *   - reason (required): Transaction reason/description
 *   - type (required): 'credit' or 'debit' or 'duration_reduction_credit'
 *   - reference_type (optional): 'appointment', 'payment', 'manual'
 *   - reference_id (optional): ID of related record
 * 
 * Security Layers:
 *   1. Bearer Token Authentication
 *   2. Tenant Isolation
 *   3. Balance validation (cannot go negative for debit)
 *   4. Transaction logging
 *   5. Audit Logging
 */

export default defineEventHandler(async (event) => {
  try {
    // ✅ LAYER 1: AUTHENTICATION
    const authUser = await getAuthUserFromRequest(event)
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - Authentication required'
      })
    }

    // ✅ LAYER 2: Get user profile and tenant
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role, is_active')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !userProfile) {
      throw createError({
        statusCode: 403,
        statusMessage: 'User profile not found'
      })
    }

    if (!userProfile.is_active) {
      throw createError({
        statusCode: 403,
        statusMessage: 'User account is inactive'
      })
    }

    const tenantId = userProfile.tenant_id

    // ✅ LAYER 3: INPUT VALIDATION
    const body = await readBody(event)
    const userId = body.user_id
    const amountRappen = body.amount_rappen
    const reason = body.reason
    const type = body.type
    const referenceType = body.reference_type || 'manual'
    const referenceId = body.reference_id || null

    if (!userId || !amountRappen || !reason || !type) {
      throw createError({
        statusCode: 400,
        statusMessage: 'user_id, amount_rappen, reason, and type are required'
      })
    }

    // Validate UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid user ID format'
      })
    }

    // Validate amount
    if (typeof amountRappen !== 'number' || isNaN(amountRappen)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'amount_rappen must be a number'
      })
    }

    // Validate type
    const validTypes = ['credit', 'debit', 'duration_reduction_credit']
    if (!validTypes.includes(type)) {
      throw createError({
        statusCode: 400,
        statusMessage: `type must be one of: ${validTypes.join(', ')}`
      })
    }

    // ✅ LAYER 4: Load or create student credit
    let { data: credit, error: creditError } = await supabaseAdmin
      .from('student_credits')
      .select('id, balance_rappen')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (creditError) {
      logger.error('❌ Error loading student credit:', creditError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to load student credit'
      })
    }

    // Create if not exists
    if (!credit) {
      const { data: newCredit, error: createError } = await supabaseAdmin
        .from('student_credits')
        .insert({
          user_id: userId,
          tenant_id: tenantId,
          balance_rappen: 0
        })
        .select()
        .single()

      if (createError) {
        logger.error('❌ Error creating student credit:', createError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to create student credit'
        })
      }

      credit = newCredit
    }

    // ✅ LAYER 5: Calculate new balance and validate
    const newBalance = credit.balance_rappen + amountRappen

    if (type === 'debit' && newBalance < 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Insufficient credit balance'
      })
    }

    // ✅ LAYER 6: Update credit balance
    const { error: updateError } = await supabaseAdmin
      .from('student_credits')
      .update({ balance_rappen: newBalance })
      .eq('id', credit.id)

    if (updateError) {
      logger.error('❌ Error updating credit balance:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update credit balance'
      })
    }

    // ✅ LAYER 7: Log transaction
    const { error: logError } = await supabaseAdmin
      .from('credit_transactions')
      .insert({
        user_id: userId,
        tenant_id: tenantId,
        amount_rappen: amountRappen,
        transaction_type: type,
        description: reason,
        reference_type: referenceType,
        reference_id: referenceId,
        created_by: userProfile.id
      })

    if (logError) {
      logger.error('❌ Error logging credit transaction:', logError)
      // Don't fail the transaction if logging fails
    }

    // ✅ LAYER 8: AUDIT LOGGING
    logger.debug('✅ Credit transaction completed:', {
      userId: userProfile.id,
      tenantId: tenantId,
      studentUserId: userId,
      amount: amountRappen,
      type,
      oldBalance: credit.balance_rappen,
      newBalance
    })

    return {
      success: true,
      data: {
        old_balance_rappen: credit.balance_rappen,
        new_balance_rappen: newBalance,
        transaction_amount_rappen: amountRappen,
        type
      }
    }

  } catch (error: any) {
    logger.error('❌ Staff credit-transaction API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to process credit transaction'
    })
  }
})

