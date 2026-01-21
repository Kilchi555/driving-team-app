import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { createClient } from '@supabase/supabase-js'
import logger from '~/utils/logger'

/**
 * ✅ POST /api/staff/update-payment
 * 
 * Secure API to update payment details
 * 
 * Body:
 *   - payment_id (required): Payment ID
 *   - update_data (required): Object with fields to update
 * 
 * Security Layers:
 *   1. Bearer Token Authentication
 *   2. Tenant Isolation
 *   3. Ownership Check
 *   4. Field Whitelist (only specific fields can be updated)
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

    const { data: userProfile, error: userError} = await supabaseAdmin
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
    const paymentId = body.payment_id
    const updateData = body.update_data

    if (!paymentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Payment ID is required'
      })
    }

    if (!updateData || typeof updateData !== 'object') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Update data is required'
      })
    }

    // Validate UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(paymentId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid payment ID format'
      })
    }

    // ✅ LAYER 4: Field Whitelist - only allow specific fields
    const allowedFields = [
      'lesson_price_rappen',
      'admin_fee_rappen',
      'products_price_rappen',
      'discount_amount_rappen',
      'total_amount_rappen',
      'credit_used_rappen',
      'payment_status',
      'payment_method'
    ]

    const sanitizedUpdateData: any = {}
    for (const key of Object.keys(updateData)) {
      if (allowedFields.includes(key)) {
        sanitizedUpdateData[key] = updateData[key]
      }
    }

    if (Object.keys(sanitizedUpdateData).length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No valid fields to update'
      })
    }

    // ✅ LAYER 5: Ownership check
    const { data: payment, error: loadError } = await supabaseAdmin
      .from('payments')
      .select('id, tenant_id')
      .eq('id', paymentId)
      .eq('tenant_id', tenantId)
      .single()

    if (loadError || !payment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Payment not found or access denied'
      })
    }

    // ✅ LAYER 6: Update payment
    const { data: updatedPayment, error: updateError } = await supabaseAdmin
      .from('payments')
      .update(sanitizedUpdateData)
      .eq('id', paymentId)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (updateError) {
      logger.error('❌ Error updating payment:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update payment'
      })
    }

    // ✅ LAYER 7: AUDIT LOGGING
    logger.debug('✅ Payment updated successfully:', {
      userId: userProfile.id,
      tenantId: tenantId,
      paymentId: paymentId,
      updatedFields: Object.keys(sanitizedUpdateData)
    })

    return {
      success: true,
      data: updatedPayment
    }

  } catch (error: any) {
    logger.error('❌ Staff update-payment API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to update payment'
    })
  }
})

