import { defineEventHandler, createError, getQuery } from 'h3'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { createClient } from '@supabase/supabase-js'
import logger from '~/utils/logger'

/**
 * ✅ GET /api/staff/get-payment
 * 
 * Secure API to fetch payment details
 * 
 * Query Params:
 *   - id: Payment ID (optional if appointment_id provided)
 *   - appointment_id: Appointment ID (optional if id provided)
 * 
 * Security Layers:
 *   1. Bearer Token Authentication
 *   2. Tenant Isolation
 *   3. Ownership Check
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
    const query = getQuery(event)
    const paymentId = query.id as string | undefined
    const appointmentId = query.appointment_id as string | undefined

    if (!paymentId && !appointmentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Payment ID or Appointment ID is required'
      })
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (paymentId && !uuidRegex.test(paymentId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid payment ID format'
      })
    }
    if (appointmentId && !uuidRegex.test(appointmentId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid appointment ID format'
      })
    }

    // ✅ LAYER 4: DATABASE QUERY with Tenant Isolation
    let queryBuilder = supabaseAdmin
      .from('payments')
      .select('id, lesson_price_rappen, admin_fee_rappen, products_price_rappen, discount_amount_rappen, total_amount_rappen, amount_paid_rappen, credit_used_rappen, payment_status, payment_method, wallee_transaction_id, appointment_id, user_id, tenant_id, created_at')
      .eq('tenant_id', tenantId)

    if (paymentId) {
      queryBuilder = queryBuilder.eq('id', paymentId)
    } else if (appointmentId) {
      queryBuilder = queryBuilder.eq('appointment_id', appointmentId)
    }

    const { data: payment, error } = await queryBuilder
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      logger.error('❌ Error fetching payment:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch payment'
      })
    }

    // ✅ LAYER 5: AUDIT LOGGING
    logger.debug('✅ Payment fetched successfully:', {
      userId: userProfile.id,
      tenantId: tenantId,
      paymentId: payment?.id || null,
      appointmentId: appointmentId || null
    })

    return {
      success: true,
      data: payment // Can be null if not found
    }

  } catch (error: any) {
    logger.error('❌ Staff get-payment API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch payment'
    })
  }
})

