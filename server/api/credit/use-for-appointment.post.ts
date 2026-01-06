import { defineEventHandler, createError, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { validateUUID, throwValidationError } from '~/server/utils/validators'
import { logAudit } from '~/server/utils/audit'
import { getClientIP } from '~/server/utils/ip-utils'

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  const ipAddress = getClientIP(event)
  let authenticatedUserId: string | undefined
  let tenantId: string | undefined
  let requestingUser: any = null

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
    const body = await readBody(event)
    const { appointmentId, amountRappen, notes } = body

    const errors: any = {}
    if (!appointmentId || !validateUUID(appointmentId).valid) {
      errors.appointmentId = 'Valid appointment ID required'
    }
    if (!amountRappen || typeof amountRappen !== 'number' || amountRappen <= 0) {
      errors.amountRappen = 'Valid amount (> 0) required'
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

    // ============ LAYER 6: LOAD APPOINTMENT ============
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('appointments')
      .select('id, user_id, tenant_id, title, status, start_time')
      .eq('id', appointmentId)
      .single()

    if (appointmentError || !appointment) {
      logger.warn(`⚠️ Appointment not found: ${appointmentId}`)
      throw createError({ statusCode: 404, statusMessage: 'Appointment not found' })
    }

    // ============ LAYER 7: AUTHORIZATION - STAFF CAN ONLY MODIFY OWN TENANT ============
    if (appointment.tenant_id !== userData.tenant_id) {
      logger.warn(`🚫 Staff ${userData.id} attempted to access appointment from different tenant`)
      throw createError({
        statusCode: 403,
        statusMessage: 'Not authorized to access this appointment'
      })
    }

    const studentUserId = appointment.user_id

    // ============ LAYER 8: GET CURRENT STUDENT CREDIT BALANCE ============
    const { data: studentCredit, error: creditError } = await supabaseAdmin
      .from('student_credits')
      .select('id, balance_rappen')
      .eq('user_id', studentUserId)
      .eq('tenant_id', tenantId)
      .single()

    if (creditError && creditError.code !== 'PGRST116') {
      logger.warn('⚠️ Error loading student credit:', creditError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to load student credit'
      })
    }

    // If no credit exists, create one with 0 balance
    let creditId: string
    let oldBalance = 0

    if (!studentCredit) {
      logger.debug('💳 Creating new student credit record')
      const { data: newCredit, error: createCreditError } = await supabaseAdmin
        .from('student_credits')
        .insert([{
          user_id: studentUserId,
          balance_rappen: 0,
          tenant_id: tenantId
        }])
        .select('id')
        .single()

      if (createCreditError) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to create student credit'
        })
      }

      creditId = newCredit.id
    } else {
      creditId = studentCredit.id
      oldBalance = studentCredit.balance_rappen || 0
    }

    // ============ LAYER 9: VALIDATE CREDIT AMOUNT ============
    // Make sure we're using a valid amount (not more than available)
    const creditToUse = Math.min(amountRappen, oldBalance)

    if (creditToUse <= 0) {
      logger.warn(`⚠️ No credit to use: amount=${amountRappen}, balance=${oldBalance}`)
      throw createError({
        statusCode: 400,
        statusMessage: 'Insufficient credit balance'
      })
    }

    const newBalance = oldBalance - creditToUse

    // ============ LAYER 10: UPDATE STUDENT CREDIT BALANCE ============
    const { error: updateCreditError } = await supabaseAdmin
      .from('student_credits')
      .update({
        balance_rappen: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', creditId)

    if (updateCreditError) {
      logger.error('❌ Failed to update student credit:', updateCreditError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update student credit'
      })
    }

    logger.debug('✅ Student credit balance updated:', {
      oldBalance: (oldBalance / 100).toFixed(2),
      used: (creditToUse / 100).toFixed(2),
      newBalance: (newBalance / 100).toFixed(2)
    })

    // ============ LAYER 11: CREATE CREDIT TRANSACTION ============
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('credit_transactions')
      .insert([{
        user_id: studentUserId,
        transaction_type: 'appointment',
        amount_rappen: creditToUse,
        balance_before_rappen: oldBalance,
        balance_after_rappen: newBalance,
        payment_method: 'credit',
        reference_id: appointmentId,
        reference_type: 'appointment',
        created_by: userData.id,
        tenant_id: tenantId,
        notes: notes || `Guthaben verwendet für Termin: ${appointment.title}`
      }])
      .select('id')
      .single()

    if (transactionError) {
      logger.error('❌ Failed to create credit transaction:', transactionError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create credit transaction'
      })
    }

    const creditTransactionId = transaction.id

    logger.debug('✅ Credit transaction created:', {
      transactionId: creditTransactionId,
      amountUsed: (creditToUse / 100).toFixed(2)
    })

    // ============ LAYER 12: UPDATE PAYMENT WITH CREDIT TRANSACTION ID ============
    const { error: paymentUpdateError } = await supabaseAdmin
      .from('payments')
      .update({
        credit_transaction_id: creditTransactionId,
        updated_at: new Date().toISOString()
      })
      .eq('appointment_id', appointmentId)

    if (paymentUpdateError) {
      logger.warn('⚠️ Could not update payment with credit transaction ID:', paymentUpdateError)
      // Don't throw - credit transaction was created successfully
    } else {
      logger.debug('✅ Payment updated with credit transaction ID')
    }

    // ============ AUDIT LOGGING: Success ============
    await logAudit({
      user_id: userData.id,
      auth_user_id: authenticatedUserId,
      action: 'use_credit_for_appointment',
      resource_type: 'appointment',
      resource_id: appointmentId,
      status: 'success',
      ip_address: ipAddress,
      tenant_id: tenantId,
      details: {
        student_user_id: studentUserId,
        credit_used_rappen: creditToUse,
        balance_before: oldBalance,
        balance_after: newBalance,
        credit_transaction_id: creditTransactionId,
        duration_ms: Date.now() - startTime
      }
    })

    return {
      success: true,
      creditTransactionId,
      amountUsed: creditToUse,
      balanceBefore: oldBalance,
      balanceAfter: newBalance,
      message: `${(creditToUse / 100).toFixed(2)} CHF Guthaben verwendet`
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

    throw error
  }
})

