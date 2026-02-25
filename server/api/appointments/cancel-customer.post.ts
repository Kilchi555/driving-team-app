// server/api/appointments/cancel-customer.post.ts
// SECURED: Customer appointment cancellation with full security layers
import { getSupabase, getSupabaseAdmin } from '~/utils/supabase'
import { toLocalTimeString } from '~/utils/dateUtils'
import { logger } from '~/utils/logger'
import { getClientIP } from '~/server/utils/ip-utils'
import { logAudit } from '~/server/utils/audit'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { validateUUID } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  const ipAddress = getClientIP(event)
  let authenticatedUserId: string | undefined
  let tenantId: string | undefined
  let userProfile: any = null
  let payment: any = null  // ✅ FIX: Define payment at top scope
  
  try {
    // ============ LAYER 1: AUTHENTICATION ============
    const authHeader = getHeader(event, 'authorization')
    
    if (!authHeader) {
      throw createError({
        statusCode: 401,
        message: 'Authentication required'
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = getSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('❌ Auth error:', authError)
      throw createError({
        statusCode: 401,
        message: 'Invalid token'
      })
    }

    authenticatedUserId = user.id
    logger.debug('✅ Authenticated user:', user.id, user.email)

    // ============ LAYER 2: RATE LIMITING ============
    const rateLimitResult = await checkRateLimit(
      ipAddress,
      'cancel_customer'
    )
    
    if (!rateLimitResult.allowed) {
      await logAudit({
        auth_user_id: authenticatedUserId,
        action: 'cancel_appointment',
        status: 'blocked',
        error_message: 'Rate limit exceeded',
        ip_address: ipAddress,
        details: { remaining: rateLimitResult.remaining, limit: rateLimitResult.limit }
      })
      
      throw createError({
        statusCode: 429,
        message: 'Too many cancellation requests. Please try again later.'
      })
    }

    // ============ LAYER 3: READ & VALIDATE INPUT ============
    const body = await readBody(event)
    const { appointmentId, cancellationReasonId } = body

    // ============ LAYER 4: INPUT VALIDATION ============
    const errors: any = {}

    if (!appointmentId || !validateUUID(appointmentId).valid) {
      errors.appointmentId = 'Valid appointment ID required'
    }

    if (!cancellationReasonId || !validateUUID(cancellationReasonId).valid) {
      errors.cancellationReasonId = 'Valid cancellation reason ID required'
    }

    if (Object.keys(errors).length > 0) {
      logger.warn('❌ Validation errors:', errors)
      throw createError({
        statusCode: 400,
        message: `Validation errors: ${JSON.stringify(errors)}`
      })
    }

    // ============ LAYER 5: GET TENANT FROM AUTHENTICATED USER ============
    const supabaseAdmin = getSupabaseAdmin()
    const { data: userProfileData, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role, email')
      .eq('auth_user_id', user.id)
      .single()

    logger.debug('🔍 User profile query result:', { userProfile: userProfileData, profileError })

    if (profileError) {
      console.error('❌ Profile error:', profileError)
      throw createError({
        statusCode: 500,
        message: `Database error: ${profileError.message}`
      })
    }

    if (!userProfileData) {
      console.error('❌ No profile found for auth_user_id:', user.id)
      
      await logAudit({
        auth_user_id: authenticatedUserId,
        action: 'cancel_appointment',
        status: 'failed',
        error_message: 'User profile not found',
        ip_address: ipAddress
      })
      
      throw createError({
        statusCode: 403,
        message: `User profile not found. Please contact support. (auth_user_id: ${user.id})`
      })
    }

    // ✅ Assign to outer scope variable
    userProfile = userProfileData
    tenantId = userProfile.tenant_id

    const now = new Date()

    logger.debug('🗑️ Customer cancelling appointment:', appointmentId)
    logger.debug('👤 User:', userProfile.id)
    logger.debug('📋 Reason ID:', cancellationReasonId)

    // ============ LAYER 6: ROLE CHECK - Only customers can use this endpoint ============
    // Staff/Admin should use cancel-staff.post.ts instead
    if (!['client', 'student'].includes(userProfile.role)) {
      await logAudit({
        user_id: userProfile.id,
        auth_user_id: authenticatedUserId,
        action: 'cancel_appointment',
        resource_type: 'appointment',
        status: 'failed',
        error_message: `Unauthorized: User role '${userProfile.role}' cannot use customer cancellation endpoint`,
        ip_address: ipAddress,
        tenant_id: tenantId
      })
      
      throw createError({
        statusCode: 403,
        message: 'This endpoint is for customers only. Staff should use cancel-staff endpoint.'
      })
    }

    // ============ LAYER 7: AUTHORIZATION CHECK ============
    // Get appointment with payment (including credit_used_rappen for refund handling)
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        payments (id, payment_status, total_amount_rappen, credit_used_rappen, wallee_transaction_id)
      `)
      .eq('id', appointmentId)
      .eq('tenant_id', tenantId)  // ✅ CRITICAL: Tenant isolation
      .single()

    if (appointmentError || !appointment) {
      await logAudit({
        user_id: userProfile.id,
        auth_user_id: authenticatedUserId,
        action: 'cancel_appointment',
        resource_type: 'appointment',
        resource_id: appointmentId,
        status: 'failed',
        error_message: 'Appointment not found',
        ip_address: ipAddress,
        tenant_id: tenantId
      })
      
      throw createError({
        statusCode: 404,
        message: 'Appointment not found'
      })
    }

    // Verify user owns this appointment
    if (appointment.user_id !== userProfile.id) {
      await logAudit({
        user_id: userProfile.id,
        auth_user_id: authenticatedUserId,
        action: 'cancel_appointment',
        resource_type: 'appointment',
        resource_id: appointmentId,
        status: 'failed',
        error_message: 'Unauthorized: Appointment does not belong to user',
        ip_address: ipAddress,
        tenant_id: tenantId,
        details: { 
          appointment_user_id: appointment.user_id,
          requesting_user_id: userProfile.id
        }
      })
      
      throw createError({
        statusCode: 403,
        message: 'You can only cancel your own appointments'
      })
    }

    // 2. Get cancellation reason
    const { data: reason, error: reasonError } = await supabaseAdmin
      .from('cancellation_reasons')
      .select('*')
      .eq('id', cancellationReasonId)
      .single()

    if (reasonError || !reason) {
      throw createError({
        statusCode: 404,
        message: 'Cancellation reason not found'
      })
    }

    // 3. Get tenant's cancellation policy to determine free cancellation threshold
    // First try to get tenant-specific policy, then fall back to global policy (tenant_id = NULL)
    const { data: cancellationPolicy, error: policyError } = await supabaseAdmin
      .from('cancellation_policies')
      .select(`
        *,
        rules:cancellation_rules(*)
      `)
      .or(`tenant_id.eq.${userProfile.tenant_id},tenant_id.is.null`)
      .eq('is_active', true)
      .order('tenant_id', { ascending: false }) // Tenant-specific policies come first (non-NULL before NULL)
      .order('is_default', { ascending: false })
      .limit(1)
      .maybeSingle()

    // ✅ CRITICAL: Cancellation policy MUST be configured
    if (policyError || !cancellationPolicy?.rules || !Array.isArray(cancellationPolicy.rules) || cancellationPolicy.rules.length === 0) {
      const errorMsg = 'Keine Stornierungsrichtlinie konfiguriert. Bitte kontaktieren Sie den Administrator.'
      logger.error('❌ Cancellation policy not found or invalid for tenant:', userProfile.tenant_id, {
        error: policyError?.message,
        policy: cancellationPolicy,
      })
      throw createError({
        statusCode: 500,
        message: errorMsg
      })
    }
    
    const policyScope = cancellationPolicy.tenant_id ? 'tenant-specific' : 'global'
    logger.debug(`✅ Using ${policyScope} cancellation policy:`, cancellationPolicy.name)

    // Find the threshold for free cancellation (rule with charge_percentage = 0)
    const freeRule = cancellationPolicy.rules.find((rule: any) => rule.charge_percentage === 0)
    
    if (!freeRule) {
      const errorMsg = 'Keine kostenloses Stornierungsregel in der Policy konfiguriert. Bitte kontaktieren Sie den Administrator.'
      logger.error('❌ No free cancellation rule found in policy:', cancellationPolicy.id)
      throw createError({
        statusCode: 500,
        message: errorMsg
      })
    }
    
    const hoursBeforeCancellationFree = freeRule.hours_before_appointment
    logger.debug('✅ Loaded free cancellation threshold from policy:', hoursBeforeCancellationFree, 'hours')

    // 4. Calculate hours until appointment (using Zurich timezone)
    const appointmentTime = new Date(appointment.start_time)
    
    // Convert to Zurich timezone for accurate hour calculation
    const appointmentZurich = new Date(appointmentTime.toLocaleString('en-US', { timeZone: 'Europe/Zurich' }))
    const nowZurich = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Zurich' }))
    
    const hoursUntilAppointment = (appointmentZurich.getTime() - nowZurich.getTime()) / (1000 * 60 * 60)
    
    logger.debug('🕐 Backend hours until appointment (Zurich TZ):', hoursUntilAppointment.toFixed(2), {
      appointment: appointment.start_time,
      now: now.toISOString(),
      hoursBeforeCancellationFree
    })

    // 5. Determine charge percentage based on policy
    let chargePercentage = 100 // Default
    let creditHours = false

    if (hoursUntilAppointment >= hoursBeforeCancellationFree) {
      // More than threshold hours before appointment - free cancellation
      logger.debug(`✅ Free cancellation (>= ${hoursBeforeCancellationFree}h)`)
      chargePercentage = 0
      creditHours = true
    } else {
      // Less than threshold hours before appointment - charged cancellation
      logger.debug(`⚠️ Charged cancellation (< ${hoursBeforeCancellationFree}h)`)
      chargePercentage = 100
      creditHours = true
    }
    const updateData: any = {
      status: 'cancelled',
      deleted_at: toLocalTimeString(now),
      deletion_reason: `Kunde hat abgesagt: ${reason.name_de}`,
      cancellation_reason_id: cancellationReasonId,
      cancellation_type: 'student',
      deleted_by: userProfile.id,
      cancellation_charge_percentage: chargePercentage,
      cancellation_credit_hours: creditHours,
      updated_at: toLocalTimeString(now)
    }

    // Set medical certificate status if required
    if (reason.requires_proof) {
      updateData.medical_certificate_status = 'pending'
      updateData.original_charge_percentage = chargePercentage
      logger.debug('📄 Medical certificate required - status set to pending')
    }

    // 6. Update appointment
    const { error: updateError } = await supabaseAdmin
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId)
      .eq('tenant_id', tenantId)  // ✅ CRITICAL: Tenant isolation

    if (updateError) {
      console.error('❌ Error updating appointment:', updateError)
      throw createError({
        statusCode: 500,
        message: `Failed to cancel appointment: ${updateError.message}`
      })
    }

    logger.debug('✅ Appointment cancelled successfully')

    // ============ AUDIT LOGGING: Success ============
    await logAudit({
      user_id: userProfile.id,
      auth_user_id: authenticatedUserId,
      action: 'cancel_appointment',
      resource_type: 'appointment',
      resource_id: appointmentId,
      status: 'success',
      ip_address: ipAddress,
      tenant_id: tenantId,
      details: {
        cancellation_reason: reason.name_de,
        charge_percentage: chargePercentage,
        hours_until_appointment: hoursUntilAppointment.toFixed(2),
        payment_status: payment?.payment_status,
        refund_amount: payment?.payment_status === 'completed' ? payment.total_amount_rappen : 0,
        duration_ms: Date.now() - startTime
      }
    })

    // 8. Handle payment if exists
    payment = Array.isArray(appointment.payments) 
      ? appointment.payments[0] 
      : appointment.payments

    if (payment && hoursUntilAppointment >= hoursBeforeCancellationFree) {
      // ✅ FREE CANCELLATION: Handle based on payment status
      
      // ✅ ALWAYS refund credit_used_rappen if any credit was used (regardless of payment_status)
      if (payment.credit_used_rappen && payment.credit_used_rappen > 0) {
        logger.debug('💳 Refunding used credit:', {
          paymentId: payment.id,
          creditUsed: (payment.credit_used_rappen / 100).toFixed(2)
        })
        
        // Load or create student credit
        let { data: studentCreditForRefund, error: creditErrorForRefund } = await supabaseAdmin
          .from('student_credits')
          .select('id, balance_rappen')
          .eq('user_id', appointment.user_id)
          .single()
        
        // Create if doesn't exist (shouldn't happen if they had credit, but safety)
        if (creditErrorForRefund && creditErrorForRefund.code === 'PGRST116') {
          const { data: newCredit, error: createError } = await supabaseAdmin
            .from('student_credits')
            .insert([{
              user_id: appointment.user_id,
              balance_rappen: 0,
              tenant_id: userProfile.tenant_id
            }])
            .select('id, balance_rappen')
            .single()
          
          if (!createError) {
            studentCreditForRefund = newCredit
          }
        }
        
        if (studentCreditForRefund) {
          const oldCreditBalance = studentCreditForRefund.balance_rappen || 0
          const creditRefundAmount = payment.credit_used_rappen
          const newCreditBalance = oldCreditBalance + creditRefundAmount
          
          // Update credit balance
          const { error: updateCreditRefundError } = await supabaseAdmin
            .from('student_credits')
            .update({
              balance_rappen: newCreditBalance,
              updated_at: new Date().toISOString()
            })
            .eq('id', studentCreditForRefund.id)
          
          if (!updateCreditRefundError) {
            logger.debug('✅ Credit refunded:', {
              oldBalance: (oldCreditBalance / 100).toFixed(2),
              refund: (creditRefundAmount / 100).toFixed(2),
              newBalance: (newCreditBalance / 100).toFixed(2)
            })
            
            // Create credit transaction for the refund
            await supabaseAdmin
              .from('credit_transactions')
              .insert([{
                user_id: appointment.user_id,
                transaction_type: 'cancellation_credit_refund',
                amount_rappen: creditRefundAmount,
                balance_before_rappen: oldCreditBalance,
                balance_after_rappen: newCreditBalance,
                payment_method: 'credit_refund',
                reference_id: payment.id,
                reference_type: 'payment',
                created_by: userProfile.id,
                notes: `Guthaben-Rückerstattung bei kostenloser Stornierung: ${reason.name_de} (CHF ${(creditRefundAmount / 100).toFixed(2)})`
              }])
            
            logger.debug('✅ Credit refund transaction created')
          } else {
            logger.error('❌ Failed to refund credit:', updateCreditRefundError)
          }
        }
      }
      
      if (payment.payment_status === 'completed') {
        // ✅ Payment was completed → Refund the WALLEE portion to student credit (not the credit portion, that was already refunded above)
        const creditAlreadyUsed = payment.credit_used_rappen || 0
        const walleePortionToRefund = payment.total_amount_rappen - creditAlreadyUsed
        
        if (walleePortionToRefund > 0) {
          logger.debug('💳 Refunding Wallee payment portion to student credit:', {
            paymentId: payment.id,
            totalAmount: (payment.total_amount_rappen / 100).toFixed(2),
            creditUsed: (creditAlreadyUsed / 100).toFixed(2),
            walleeRefund: (walleePortionToRefund / 100).toFixed(2)
          })
          
          // Load or create student credit
          let { data: studentCredit, error: creditError } = await supabaseAdmin
            .from('student_credits')
            .select('id, balance_rappen')
            .eq('user_id', appointment.user_id)
            .single()
          
          // Create if doesn't exist
          if (creditError && creditError.code === 'PGRST116') {
            const { data: newCredit, error: createError } = await supabaseAdmin
              .from('student_credits')
              .insert([{
                user_id: appointment.user_id,
                balance_rappen: 0,
                tenant_id: userProfile.tenant_id
              }])
              .select('id, balance_rappen')
              .single()
            
            if (createError) {
              console.error('❌ Failed to create student credit:', createError)
            } else {
              studentCredit = newCredit
              logger.debug('✅ Created new student credit record:', newCredit.id)
            }
          }
          
          if (studentCredit) {
            const oldBalance = studentCredit.balance_rappen || 0
            const newBalance = oldBalance + walleePortionToRefund
            
            // Update credit balance
            const { error: updateCreditError } = await supabaseAdmin
              .from('student_credits')
              .update({
                balance_rappen: newBalance,
                updated_at: new Date().toISOString()
              })
              .eq('id', studentCredit.id)
            
            if (updateCreditError) {
              console.error('❌ Failed to update student credit:', updateCreditError)
            } else {
              logger.debug('✅ Student credit updated (Wallee refund):', {
                oldBalance: (oldBalance / 100).toFixed(2),
                refund: (walleePortionToRefund / 100).toFixed(2),
                newBalance: (newBalance / 100).toFixed(2)
              })
              
              // Create credit transaction
              await supabaseAdmin
                .from('credit_transactions')
                .insert([{
                  user_id: appointment.user_id,
                  transaction_type: 'cancellation',
                  amount_rappen: walleePortionToRefund,
                  balance_before_rappen: oldBalance,
                  balance_after_rappen: newBalance,
                  payment_method: 'refund',
                  reference_id: appointmentId,
                  reference_type: 'appointment',
                  created_by: userProfile.id,
                  notes: `Kostenlose Stornierung (Wallee-Rückerstattung): ${reason.name_de} (CHF ${(walleePortionToRefund / 100).toFixed(2)})`
                }])
              
              logger.debug('✅ Wallee refund credit transaction created')
            }
          }
        }
        
        // Mark payment as refunded
        await supabaseAdmin
          .from('payments')
          .update({
            payment_status: 'refunded',
            refunded_at: new Date().toISOString(),
            notes: `Kostenlose Stornierung: ${reason.name_de}`,
            updated_at: toLocalTimeString(now)
          })
          .eq('id', payment.id)
        
        logger.debug('✅ Payment marked as refunded')
      } 
      else if (payment.payment_status === 'authorized') {
        // TODO: Void Wallee authorization
        logger.debug('⚠️ TODO: Void Wallee authorization:', payment.wallee_transaction_id)
        
        await supabaseAdmin
          .from('payments')
          .update({
            payment_status: 'cancelled',
            updated_at: toLocalTimeString(now)
          })
          .eq('id', payment.id)
        
        logger.debug('✅ Payment cancelled (authorized)')
      }
      else if (payment.payment_status === 'pending') {
        await supabaseAdmin
          .from('payments')
          .update({
            payment_status: 'cancelled',
            updated_at: toLocalTimeString(now)
          })
          .eq('id', payment.id)
        
        logger.debug('✅ Payment cancelled (pending)')
      }
    }
    // await sendEmailNotification({
    //   to: user.email,
    //   subject: 'Termin abgesagt',
    //   template: 'appointment_cancelled',
    //   data: { appointment, reason }
    // })

    // ============ LAYER 9: QUEUE AVAILABILITY RECALCULATION ============
    // Release the appointment slots and regenerate availability for the freed time
    try {
      logger.debug('📋 Queueing availability recalculation after customer cancellation...')
      await $fetch('/api/availability/queue-recalc', {
        method: 'POST',
        body: {
          staff_id: appointment.staff_id,
          tenant_id: tenantId,
          trigger: 'appointment_cancelled'
        }
      })
      logger.debug('✅ Queued recalculation after customer cancellation')
    } catch (queueError: any) {
      logger.warn('⚠️ Failed to queue recalculation (non-critical):', queueError.message)
    }

    return {
      success: true,
      message: 'Termin erfolgreich abgesagt',
      requiresMedicalCertificate: reason.requires_proof || false,
      chargePercentage
    }

  } catch (error: any) {
    console.error('❌ Customer cancellation error:', error)
    
    // ============ AUDIT LOGGING: Error ============
    await logAudit({
      user_id: userProfile?.id,
      auth_user_id: authenticatedUserId,
      action: 'cancel_appointment',
      resource_type: 'appointment',
      status: 'error',
      error_message: error.message || error.statusMessage || 'Unknown error',
      ip_address: ipAddress,
      tenant_id: tenantId,
      details: {
        duration_ms: Date.now() - startTime,
        error_stack: error.stack
      }
    })
    
    throw error
  }
})

