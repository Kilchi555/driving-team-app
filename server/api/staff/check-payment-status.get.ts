import { defineEventHandler, createError, getQuery } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

/**
 * ✅ GET /api/staff/check-payment-status
 * 
 * Secure API to check if an appointment has been paid
 * Used in DurationSelector to prevent changing duration of paid appointments
 * 
 * Query Params:
 *   - appointmentId: Appointment ID (required)
 * 
 * Returns:
 *   - isPaid: boolean indicating if payment is completed or authorized
 * 
 * Security Layers:
 *   1. Authentication (HTTP-Only Cookie)
 *   2. Tenant Isolation
 *   3. Ownership Check (user must be staff for this appointment)
 */

export default defineEventHandler(async (event) => {
  try {
    // ✅ LAYER 1: AUTHENTICATION
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
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
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !userProfile) {
      throw createError({
        statusCode: 403,
        statusMessage: 'User profile not found'
      })
    }

    const tenantId = userProfile.tenant_id
    const userId = userProfile.id

    // ✅ LAYER 3: INPUT VALIDATION
    const query = getQuery(event)
    const appointmentId = query.appointmentId as string | undefined

    if (!appointmentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Appointment ID is required'
      })
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(appointmentId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid appointment ID format'
      })
    }

    // ✅ LAYER 4: Verify appointment exists and user has access
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('appointments')
      .select('id, staff_id, tenant_id')
      .eq('id', appointmentId)
      .eq('tenant_id', tenantId)
      .single()

    if (appointmentError || !appointment) {
      logger.warn(`⚠️ Appointment not found or access denied: ${appointmentId}`)
      throw createError({
        statusCode: 404,
        statusMessage: 'Appointment not found'
      })
    }

    // ✅ LAYER 5: Permission check - only staff assigned to this appointment or admin
    const isAdmin = ['admin', 'tenant_admin', 'super_admin'].includes(userProfile.role)
    const isStaffForAppointment = appointment.staff_id === userId
    
    if (!isAdmin && !isStaffForAppointment) {
      logger.warn(`🚫 User ${userId} attempted to access appointment ${appointmentId} they don't own`)
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied'
      })
    }

    // ✅ LAYER 6: Check payment status
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('payment_status')
      .eq('appointment_id', appointmentId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (paymentError) {
      logger.warn('⚠️ Error checking payment status:', paymentError)
      // Continue with unpaid status - payment may not exist
    }

    const isPaid = payment && (payment.payment_status === 'completed' || payment.payment_status === 'authorized')

    logger.debug('💳 Payment status checked:', {
      appointmentId,
      isPaid,
      paymentStatus: payment?.payment_status || 'no_payment'
    })

    return {
      success: true,
      data: {
        isPaid: isPaid || false,
        paymentStatus: payment?.payment_status || null
      }
    }

  } catch (error: any) {
    logger.error('❌ Staff check-payment-status API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to check payment status'
    })
  }
})
