import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import logger from '~/utils/logger'

/**
 * ✅ POST /api/staff/create-payment
 * 
 * Secure API to create a payment record
 * Replaces direct Supabase .insert() in usePayments.ts
 * 
 * Body: Payment data object
 * 
 * Security Layers:
 *   1. Bearer Token Authentication
 *   2. Tenant Isolation
 *   3. Input Validation
 *   4. Audit Logging
 */

export default defineEventHandler(async (event) => {
  try {
    // ✅ 1. AUTHENTIFIZIERUNG
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    const supabase = getSupabaseAdmin()

    // Get user from users table to get tenant_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !user) {
      throw createError({ statusCode: 401, message: 'User not found' })
    }

    // ✅ ROLE CHECK — only staff/admin may create payment records via this endpoint
    if (!['admin', 'staff', 'super_admin', 'tenant_admin'].includes(user.role)) {
      throw createError({ statusCode: 403, message: 'Insufficient permissions – staff or admin role required' })
    }

    // ✅ 2. INPUT VALIDATION
    const body = await readBody(event)
    const paymentData = body

    // Validate required fields
    if (!paymentData.appointment_id || !paymentData.user_id) {
      throw createError({
        statusCode: 400,
        message: 'appointment_id and user_id are required'
      })
    }

    if (typeof paymentData.total_amount_rappen !== 'number' || paymentData.total_amount_rappen < 0) {
      throw createError({
        statusCode: 400,
        message: 'total_amount_rappen must be a non-negative number'
      })
    }

    // Whitelist insertable fields — never allow caller to force completed status
    const allowedInsertFields = [
      'appointment_id', 'user_id', 'staff_id', 'lesson_price_rappen', 'admin_fee_rappen',
      'products_price_rappen', 'discount_amount_rappen', 'credit_used_rappen',
      'total_amount_rappen', 'payment_method', 'currency', 'description', 'metadata'
    ] as const
    const sanitized: Record<string, any> = {}
    for (const key of allowedInsertFields) {
      if (paymentData[key] !== undefined) sanitized[key] = paymentData[key]
    }

    // ✅ 3. ADD TENANT_ID FOR SECURITY + force pending status
    const paymentToInsert = {
      ...sanitized,
      tenant_id: user.tenant_id,
      payment_status: 'pending'
    }

    // ✅ 4. INSERT PAYMENT
    const { data: payment, error: insertError } = await supabase
      .from('payments')
      .insert(paymentToInsert)
      .select()
      .single()

    if (insertError) {
      logger.error('❌ Error creating payment:', insertError)
      throw createError({
        statusCode: 500,
        message: 'Failed to create payment'
      })
    }

    // ✅ 5. AUDIT LOGGING
    logger.debug('✅ Payment created:', {
      userId: user.id,
      paymentId: payment.id,
      amount: paymentData.total_amount_rappen,
      tenantId: user.tenant_id
    })

    return {
      success: true,
      data: payment
    }

  } catch (error: any) {
    logger.error('❌ Error in create-payment API:', error.message)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to create payment'
    })
  }
})
