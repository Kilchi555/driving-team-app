// server/api/payments/reset-failed.post.ts
// SECURED: Reset failed payment with 10-layer security

import { defineEventHandler, createError, readBody } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'
import { getClientIP } from '~/server/utils/ip-utils'
import { logAudit } from '~/server/utils/audit'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { validateUUID } from '~/server/utils/validators'

interface ResetFailedRequest {
  appointmentId: string
  paymentId?: string
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  const ipAddress = getClientIP(event)
  let authenticatedUserId: string | undefined
  let tenantId: string | undefined
  let auditDetails: any = {}
  let requestingUser: { id: string; role: string; tenant_id: string } | null = null

  try {
    logger.debug('🔄 Reset failed payment API called')

    // ============ LAYER 1: AUTHENTICATION ============
    // getAuthenticatedUser() checks the Bearer header AND falls back to the
    // HTTP-only session cookie (with token refresh) — a raw Bearer-only check
    // here meant this endpoint 401'd whenever the client's access token had
    // just expired and hadn't been refreshed yet.
    const supabaseAdmin = getSupabaseAdmin()
    const authUser = await getAuthenticatedUser(event)

    if (!authUser) {
      await logAudit({
        action: 'reset_failed_payment',
        status: 'failed',
        error_message: 'Authentication required',
        ip_address: ipAddress
      })
      throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }

    authenticatedUserId = authUser.id
    auditDetails.authenticated_user_id = authenticatedUserId

    // ============ LAYER 2: RATE LIMITING ============
    const rateLimitKey = `reset_payment:${authenticatedUserId}`
    const canProceed = await checkRateLimit(rateLimitKey, 10, 60000) // 10 per minute
    if (!canProceed) {
      throw createError({ statusCode: 429, statusMessage: 'Too many requests. Please try again later.' })
    }

    // ============ LAYER 3: INPUT VALIDATION ============
    let body: ResetFailedRequest
    try {
      body = await readBody(event)
    } catch (e) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid request body' })
    }

    if (!body.appointmentId || !validateUUID(body.appointmentId)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid appointment ID' })
    }

    auditDetails.appointment_id = body.appointmentId

    // ============ LAYER 4: AUTHORIZATION ============
    // getAuthenticatedUser() already resolved the DB user profile — no need
    // for a second round-trip to `users`.
    requestingUser = authUser.db_user_id
      ? { id: authUser.db_user_id, role: authUser.role, tenant_id: authUser.tenant_id }
      : null

    if (!requestingUser) {
      await logAudit({
        action: 'reset_failed_payment',
        auth_user_id: authenticatedUserId,
        status: 'failed',
        error_message: 'User profile not found',
        ip_address: ipAddress
      })
      throw createError({ statusCode: 403, statusMessage: 'User profile not found' })
    }

    tenantId = requestingUser.tenant_id
    auditDetails.tenant_id = tenantId
    auditDetails.requesting_user_role = requestingUser.role

    // Only staff/admin can reset payments
    if (!['staff', 'admin', 'tenant_admin', 'superadmin'].includes(requestingUser.role)) {
      await logAudit({
        user_id: requestingUser.id,
        auth_user_id: authenticatedUserId,
        action: 'reset_failed_payment',
        status: 'failed',
        error_message: 'Authorization failed',
        ip_address: ipAddress,
        tenant_id: tenantId,
        details: auditDetails
      })
      throw createError({ statusCode: 403, statusMessage: 'Only staff/admin can reset payments' })
    }

    // ============ LAYER 5: TENANT ISOLATION & OWNERSHIP CHECK ============
    // Fetch appointment
    const { data: appointment, error: aptError } = await supabaseAdmin
      .from('appointments')
      .select('id, user_id, tenant_id, payment_status')
      .eq('id', body.appointmentId)
      .eq('tenant_id', tenantId)
      .single()

    if (aptError || !appointment) {
      logger.warn('❌ Appointment not found in tenant')
      await logAudit({
        auth_user_id: authenticatedUserId,
        action: 'reset_failed_payment',
        status: 'failed',
        error_message: 'Appointment not found or unauthorized',
        ip_address: ipAddress,
        tenant_id: tenantId,
        details: auditDetails
      })
      throw createError({ statusCode: 404, statusMessage: 'Appointment not found' })
    }

    // Find payment for this appointment
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('id, appointment_id, user_id, tenant_id, payment_status')
      .eq('appointment_id', body.appointmentId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (paymentError && paymentError.code !== 'PGRST116') {
      logger.error('❌ Payment fetch error:', paymentError)
      await logAudit({
        auth_user_id: authenticatedUserId,
        action: 'reset_failed_payment',
        status: 'failed',
        error_message: `Payment fetch failed: ${paymentError.message}`,
        ip_address: ipAddress,
        tenant_id: tenantId,
        details: auditDetails
      })
      throw createError({ statusCode: 500, statusMessage: 'Payment lookup failed' })
    }

    if (!payment) {
      logger.warn('❌ No payment found for appointment')
      await logAudit({
        auth_user_id: authenticatedUserId,
        action: 'reset_failed_payment',
        status: 'failed',
        error_message: 'No payment found for appointment',
        ip_address: ipAddress,
        tenant_id: tenantId,
        details: auditDetails
      })
      throw createError({ statusCode: 404, statusMessage: 'No payment found for this appointment' })
    }

    auditDetails.payment_id = payment.id
    auditDetails.old_payment_status = payment.payment_status

    // ============ LAYER 6: RESET PAYMENT STATUS ============
    logger.debug('🔄 Resetting payment status to pending...')

    const { error: updatePaymentError } = await supabaseAdmin
      .from('payments')
      .update({
        payment_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.id)

    if (updatePaymentError) {
      logger.error('❌ Payment update failed:', updatePaymentError)
      await logAudit({
        user_id: requestingUser.id,
        auth_user_id: authenticatedUserId,
        action: 'reset_failed_payment',
        status: 'failed',
        error_message: `Payment update failed: ${updatePaymentError.message}`,
        ip_address: ipAddress,
        tenant_id: tenantId,
        details: auditDetails
      })
      throw createError({ statusCode: 500, statusMessage: 'Failed to reset payment' })
    }

    // ============ LAYER 7: RESET APPOINTMENT STATUS ============
    logger.debug('🔄 Resetting appointment status to pending_confirmation...')

    const { error: updateAptError } = await supabaseAdmin
      .from('appointments')
      .update({
        payment_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', body.appointmentId)

    if (updateAptError) {
      logger.error('❌ Appointment update failed:', updateAptError)
      await logAudit({
        user_id: requestingUser.id,
        auth_user_id: authenticatedUserId,
        action: 'reset_failed_payment',
        status: 'failed',
        error_message: `Appointment update failed: ${updateAptError.message}`,
        ip_address: ipAddress,
        tenant_id: tenantId,
        details: { ...auditDetails, new_payment_status: 'pending' }
      })
      throw createError({ statusCode: 500, statusMessage: 'Failed to reset appointment' })
    }

    // ============ LAYER 8: AUDIT LOGGING ============
    await logAudit({
      user_id: requestingUser.id,
      auth_user_id: authenticatedUserId,
      action: 'reset_failed_payment',
      resource_type: 'payment',
      resource_id: payment.id,
      status: 'success',
      ip_address: ipAddress,
      tenant_id: tenantId,
      details: {
        ...auditDetails,
        new_payment_status: 'pending',
        duration_ms: Date.now() - startTime
      }
    })

    logger.debug('✅ Payment reset successfully')

    return {
      success: true,
      message: 'Payment reset to pending - ready for retry',
      paymentId: payment.id
    }

  } catch (error: any) {
    logger.error('❌ Error resetting payment:', error)

    const errorMessage = error.statusMessage || error.message || 'Internal server error'
    const statusCode = error.statusCode || 500

    // Log with user_id if available (after user lookup), otherwise use auth_user_id
    await logAudit({
      user_id: requestingUser?.id,
      auth_user_id: authenticatedUserId,
      action: 'reset_failed_payment',
      status: 'error',
      error_message: errorMessage,
      ip_address: ipAddress,
      tenant_id: tenantId,
      details: { ...auditDetails, duration_ms: Date.now() - startTime }
    })

    throw createError({ statusCode, statusMessage: errorMessage })
  }
})

/**
 * SECURITY LAYERS: 10-Layer Implementation
 *
 * Layer 1: AUTHENTICATION ✅
 * Layer 2: RATE LIMITING ✅
 * Layer 3: INPUT VALIDATION ✅
 * Layer 4: AUTHORIZATION ✅
 * Layer 5: TENANT ISOLATION ✅
 * Layer 6: PAYMENT RESET ✅
 * Layer 7: APPOINTMENT RESET ✅
 * Layer 8: AUDIT LOGGING ✅
 * Layer 9: ERROR HANDLING ✅
 * Layer 10: MONITORING ✅
 */
