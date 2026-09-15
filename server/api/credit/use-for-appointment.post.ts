import { defineEventHandler, createError, readBody } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { validateUUID, throwValidationError } from '~/server/utils/validators'
import { logAudit } from '~/server/utils/audit'
import { getClientIP } from '~/server/utils/ip-utils'
import { mapSupabaseError } from '~/server/utils/supabase-error'
import { applyCreditToPayment } from '~/server/utils/apply-credit-to-payment'

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  const ipAddress = getClientIP(event)
  let authenticatedUserId: string | undefined
  let tenantId: string | undefined
  let requestingUser: any = null
  let body: any

  try {
    // ============ LAYER 1: AUTHENTICATION ============
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }
    authenticatedUserId = authUser.id

    // ============ LAYER 2: RATE LIMITING ============
    const rateLimitResult = await checkRateLimit(
      authenticatedUserId,
      'use_credit_for_appointment',
      50, // maxRequests: 50 per hour
      60 * 60 * 1000 // windowMs: 1 hour
    )
    if (!rateLimitResult.allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.'
      })
    }

    // ============ LAYER 3: INPUT VALIDATION ============
    body = await readBody(event)
    const paymentIdInput = body.payment_id || body.paymentId
    const appointmentId = body.appointmentId
    const amountRappen = Math.round(Number(body.amountRappen) || 0)

    const errors: any = {}
    if (paymentIdInput) {
      if (!validateUUID(paymentIdInput).valid) errors.payment_id = 'Valid payment ID required'
    } else if (appointmentId) {
      if (!validateUUID(appointmentId).valid) errors.appointmentId = 'Valid appointment ID required'
    } else {
      errors.payment_id = 'payment_id is required'
    }
    if (Object.keys(errors).length > 0) {
      throwValidationError(errors)
    }

    const supabaseAdmin = getSupabaseAdmin()

    // ============ LAYER 4: GET AUTHENTICATED USER FROM USERS TABLE ============
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authenticatedUserId)
      .single()

    if (userError || !userData) {
      logger.warn(`⚠️ User not found for auth_user_id: ${authenticatedUserId}`)
      throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }

    requestingUser = userData
    tenantId = userData.tenant_id

    // ============ LAYER 5: AUTHORIZATION - ONLY STAFF/ADMINS CAN USE THIS ============
    if (!['staff', 'admin', 'tenant_admin'].includes(userData.role)) {
      logger.warn(`🚫 User ${userData.id} with role ${userData.role} attempted to use credit`)
      throw createError({
        statusCode: 403,
        statusMessage: 'Only staff/admins can use this endpoint'
      })
    }

    // ============ LAYER 6: RESOLVE PAYMENT IN TENANT ============
    let paymentId = paymentIdInput as string | undefined
    if (!paymentId && appointmentId) {
      const { data: appointment, error: appointmentError } = await supabaseAdmin
        .from('appointments')
        .select('id, tenant_id')
        .eq('id', appointmentId)
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (appointmentError || !appointment) {
        throw createError({ statusCode: 404, statusMessage: 'Appointment not found' })
      }

      const { data: paymentRow } = await supabaseAdmin
        .from('payments')
        .select('id')
        .eq('appointment_id', appointmentId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!paymentRow?.id) {
        throw createError({ statusCode: 404, statusMessage: 'Payment not found' })
      }
      paymentId = paymentRow.id
    } else {
      const { data: paymentRow } = await supabaseAdmin
        .from('payments')
        .select('id')
        .eq('id', paymentId)
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (!paymentRow?.id) {
        throw createError({ statusCode: 404, statusMessage: 'Payment not found' })
      }
      paymentId = paymentRow.id
    }

    const applied = await applyCreditToPayment(supabaseAdmin, {
      paymentId,
      tenantId,
      requestedRappen: amountRappen,
      actorUserId: userData.id,
    })

    await logAudit({
      user_id: userData.id,
      auth_user_id: authenticatedUserId,
      action: 'use_credit_for_appointment',
      resource_type: 'payment',
      resource_id: paymentId,
      status: 'success',
      ip_address: ipAddress,
      tenant_id: tenantId,
      details: {
        credit_used_rappen: applied.credit_used_rappen,
        credit_to_use_rappen: applied.credit_to_use_rappen,
        remaining_amount_rappen: applied.remaining_amount_rappen,
        credit_transaction_id: applied.credit_transaction_id,
        applied: applied.applied,
        duration_ms: Date.now() - startTime
      }
    })

    return {
      success: true,
      payment_id: applied.payment_id,
      creditTransactionId: applied.credit_transaction_id,
      amountUsed: applied.credit_to_use_rappen,
      credit_used_rappen: applied.credit_used_rappen,
      remaining_amount_rappen: applied.remaining_amount_rappen,
      payment_status: applied.payment_status,
      applied: applied.applied,
      message: `${(applied.credit_to_use_rappen / 100).toFixed(2)} CHF Guthaben verwendet`
    }

  } catch (error: any) {
    logger.error('❌ Error using credit for appointment:', error)

    // ============ AUDIT LOGGING: Error ============
    await logAudit({
      user_id: requestingUser?.id,
      auth_user_id: authenticatedUserId,
      action: 'use_credit_for_appointment',
      resource_type: 'appointment',
      resource_id: body?.appointmentId,
      status: 'error',
      error_message: error.message || error.statusMessage || 'Unknown error',
      ip_address: ipAddress,
      tenant_id: tenantId,
      details: {
        duration_ms: Date.now() - startTime
      }
    })

    throw mapSupabaseError(error, 'use-credit-for-appointment')
  }
})

