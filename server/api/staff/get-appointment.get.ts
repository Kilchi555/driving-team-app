import { defineEventHandler, createError, getQuery } from 'h3'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { createClient } from '@supabase/supabase-js'
import logger from '~/utils/logger'

/**
 * ✅ GET /api/staff/get-appointment
 * 
 * Secure API to fetch appointment details for EventModal
 * 
 * Query Params:
 *   - id (required): Appointment ID
 *   - include_payment (optional): Include payment details (default: false)
 * 
 * Security Layers:
 *   1. Bearer Token Authentication
 *   2. Tenant Isolation
 *   3. Ownership Check (appointment belongs to user's tenant)
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
    const appointmentId = query.id as string | undefined
    const includePayment = query.include_payment === 'true'

    if (!appointmentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Appointment ID is required'
      })
    }

    // Validate UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(appointmentId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid appointment ID format'
      })
    }

    // ✅ LAYER 4: DATABASE QUERY with Tenant Isolation
    let selectQuery = 'id, duration_minutes, user_id, tenant_id, start_time, end_time, type, event_type_code, status, deleted_at, cancelled, cancellation_reason_id'
    
    if (includePayment) {
      selectQuery += ', payments(id, payment_status, lesson_price_rappen, admin_fee_rappen, products_price_rappen, discount_amount_rappen, total_amount_rappen, credit_used_rappen, wallee_transaction_id)'
    }

    const { data: appointment, error } = await supabaseAdmin
      .from('appointments')
      .select(selectQuery)
      .eq('id', appointmentId)
      .eq('tenant_id', tenantId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Appointment not found'
        })
      }
      logger.error('❌ Error fetching appointment:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch appointment'
      })
    }

    // ✅ LAYER 5: AUDIT LOGGING
    logger.debug('✅ Appointment fetched successfully:', {
      userId: userProfile.id,
      tenantId: tenantId,
      appointmentId: appointmentId,
      includePayment
    })

    return {
      success: true,
      data: appointment
    }

  } catch (error: any) {
    logger.error('❌ Staff get-appointment API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch appointment'
    })
  }
})

