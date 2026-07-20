// server/api/appointments/cancel-customer.post.ts
// SECURED: Customer appointment cancellation with full security layers
import { getSupabaseAdmin } from '~/utils/supabase'
import { toLocalTimeString } from '~/utils/dateUtils'
import { logger } from '~/utils/logger'
import { getClientIP } from '~/server/utils/ip-utils'
import { logAudit } from '~/server/utils/audit'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { validateUUID } from '~/server/utils/validators'
import { generateCustomerCancelledAdminEmail } from '~/server/utils/email'
import { processWalleeRefund } from '~/server/utils/wallee-refund'
import { mapSupabaseError } from '~/server/utils/supabase-error'
import { calculateCancellationCharges } from '~/utils/policyCalculations'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  const ipAddress = getClientIP(event)
  let authenticatedUserId: string | undefined
  let tenantId: string | undefined
  let userProfile: any = null
  let payment: any = null  // ✅ FIX: Define payment at top scope
  
  try {
    // ============ LAYER 1: AUTHENTICATION ============
    const user = await getAuthenticatedUser(event)
    if (!user) {
      throw createError({
        statusCode: 401,
        message: 'Authentication required'
      })
    }

    const supabase = getSupabaseAdmin()

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
    const { appointmentId, cancellationReasonId, refundDestination } = body

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
      .select('id, tenant_id, role, email, first_name, last_name')
      .eq('auth_user_id', user.id)
      .single()

    logger.debug('🔍 User profile query result:', { userProfile: userProfileData, profileError })

    if (profileError) {
      console.error('❌ Profile error:', profileError)
      throw createError({
        statusCode: 500,
        message: 'Failed to load user profile. Please try again later.'
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
        message: 'User profile not found. Please contact support.'
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
        payments (id, payment_status, total_amount_rappen, credit_used_rappen, wallee_transaction_id, notes, metadata)
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
      .eq('applies_to', 'appointments') // Without this filter a 'courses' policy could be picked instead
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

    // 4. Calculate hours until appointment (using Zurich timezone) — kept for
    // logging/audit/email purposes even though the charge itself is now derived
    // from the shared policy engine below.
    const appointmentTime = new Date(appointment.start_time)
    
    // Convert to Zurich timezone for accurate hour calculation
    const appointmentZurich = new Date(appointmentTime.toLocaleString('en-US', { timeZone: 'Europe/Zurich' }))
    const nowZurich = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Zurich' }))
    
    const hoursUntilAppointment = (appointmentZurich.getTime() - nowZurich.getTime()) / (1000 * 60 * 60)

    // 5. Determine charge percentage based on the policy's rule tiers.
    // ✅ FIX: This used to be a hardcoded binary 0%/100% check against a single
    // "free cancellation" rule, which silently ignored any intermediate tiers
    // (e.g. 50% between 24h and 48h) an admin might configure, and used its own
    // logic instead of the shared engine that powers the staff flow (EventModal)
    // and the customer-facing preview — so preview and actual result could drift.
    // A per-reason force_charge_percentage (e.g. "No-Show" always 100%, "Force
    // majeure" always 0%) takes priority over the time-based rules, mirroring
    // the staff-side logic in EventModal.vue.
    const forceChargePercentage = (reason as any).force_charge_percentage
    let chargePercentage: number
    let policyDescription: string

    // payment is extracted early here (rather than further below) so its amount
    // can feed the charge calculation.
    payment = Array.isArray(appointment.payments) ? appointment.payments[0] : appointment.payments

    if (forceChargePercentage !== null && forceChargePercentage !== undefined) {
      chargePercentage = forceChargePercentage
      policyDescription = chargePercentage === 0
        ? `Kostenlose Stornierung (fester Absage-Grund: ${reason.name_de})`
        : `Feste Stornogebühr für diesen Absage-Grund (${chargePercentage}%)`
      logger.debug('✅ Using force_charge_percentage from cancellation reason:', chargePercentage)
    } else {
      const appointmentDataForPolicy = {
        id: appointment.id,
        start_time: appointment.start_time,
        duration_minutes: appointment.duration_minutes || 45,
        price_rappen: payment?.total_amount_rappen || 0,
        user_id: appointment.user_id,
        staff_id: appointment.staff_id,
      }
      const calcResult = calculateCancellationCharges(cancellationPolicy as any, appointmentDataForPolicy, now, 'student')
      chargePercentage = calcResult.calculation.chargePercentage
      policyDescription = calcResult.calculation.description
      logger.debug('✅ Charge percentage from policy engine:', chargePercentage, policyDescription)
    }

    const creditHours = true // Unrelated to chargePercentage — preserves previous behavior.

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

    // 8. Handle payment if exists.
    // ✅ FIX: This used to only run for a fully free (0%) cancellation — any
    // charged cancellation (whether 100% or, previously unsupported, a partial
    // tier like 50%) silently skipped this whole block. That was correct-by-luck
    // for 100% (nothing to refund) but meant a partial tier's non-charged
    // portion was never actually refunded. Now generalized to scale every
    // refund amount by refundPercentage = 100 - chargePercentage.
    const refundPercentage = 100 - chargePercentage

    if (payment && refundPercentage > 0) {
      // ✅ ALWAYS refund the applicable share of credit_used_rappen back to wallet — this portion was never charged to Wallee
      if (payment.credit_used_rappen && payment.credit_used_rappen > 0) {
        const creditRefundAmount = Math.round((payment.credit_used_rappen * refundPercentage) / 100)

        if (creditRefundAmount > 0) {
          logger.debug('💳 Refunding credit portion back to wallet:', {
            paymentId: payment.id,
            creditUsed: (payment.credit_used_rappen / 100).toFixed(2),
            refundPercentage,
            creditRefundAmount: (creditRefundAmount / 100).toFixed(2)
          })

          let { data: studentCreditForRefund, error: creditErrorForRefund } = await supabaseAdmin
            .from('student_credits')
            .select('id, balance_rappen')
            .eq('user_id', appointment.user_id)
            .eq('tenant_id', userProfile.tenant_id)
            .maybeSingle()

          if (creditErrorForRefund) {
            logger.error('❌ Failed to load student_credits for credit refund:', creditErrorForRefund)
            throw createError({ statusCode: 500, statusMessage: 'Stornierung fehlgeschlagen: Guthaben konnte nicht geladen werden.' })
          }

          // Create row if it doesn't exist yet
          if (!studentCreditForRefund) {
            const { data: newCredit, error: createCreditErr } = await supabaseAdmin
              .from('student_credits')
              .insert([{ user_id: appointment.user_id, balance_rappen: 0, tenant_id: userProfile.tenant_id }])
              .select('id, balance_rappen')
              .single()
            if (createCreditErr) {
              logger.error('❌ Failed to create student_credits for credit refund:', createCreditErr)
              throw createError({ statusCode: 500, statusMessage: 'Stornierung fehlgeschlagen: Guthabenkonto konnte nicht erstellt werden.' })
            }
            studentCreditForRefund = newCredit
          }

          if (studentCreditForRefund) {
            const oldCreditBalance = studentCreditForRefund.balance_rappen || 0
            const newCreditBalance = oldCreditBalance + creditRefundAmount

            const { error: updateCreditRefundError } = await supabaseAdmin
              .from('student_credits')
              .update({ balance_rappen: newCreditBalance, updated_at: new Date().toISOString() })
              .eq('id', studentCreditForRefund.id)

            if (updateCreditRefundError) {
              logger.error('❌ Failed to refund credit portion to wallet:', updateCreditRefundError)
              throw createError({ statusCode: 500, statusMessage: 'Stornierung fehlgeschlagen: Guthaben-Rückerstattung fehlgeschlagen.' })
            }

            logger.debug('✅ Credit portion refunded to wallet:', {
              oldBalance: (oldCreditBalance / 100).toFixed(2),
              refund: (creditRefundAmount / 100).toFixed(2),
              newBalance: (newCreditBalance / 100).toFixed(2)
            })

            await supabaseAdmin.from('credit_transactions').insert([{
              user_id: appointment.user_id,
              tenant_id: userProfile.tenant_id,
              transaction_type: 'cancellation_credit_refund',
              amount_rappen: creditRefundAmount,
              balance_before_rappen: oldCreditBalance,
              balance_after_rappen: newCreditBalance,
              payment_method: 'credit_refund',
              reference_id: payment.id,
              reference_type: 'payment',
              created_by: userProfile.id,
              notes: `Guthaben-Rückerstattung bei Stornierung: ${reason.name_de} (CHF ${(creditRefundAmount / 100).toFixed(2)}, ${refundPercentage}% von CHF ${(payment.credit_used_rappen / 100).toFixed(2)})`
            }])
          }
        }
      }
      
      if (payment.payment_status === 'completed') {
        // Payment was completed: refund the applicable share of the Wallee portion either to wallet or directly via Wallee
        const creditAlreadyUsed = payment.credit_used_rappen || 0
        const walleeCapturedRappen = payment.total_amount_rappen - creditAlreadyUsed
        const walleePortionToRefund = Math.round((walleeCapturedRappen * refundPercentage) / 100)

        let walleeRefundId: string | null = null
        if (walleePortionToRefund > 0) {
          if (refundDestination === 'wallee') {
            // ── Direct Wallee refund ─────────────────────────────────────
            logger.debug('💳 Customer chose direct Wallee refund:', {
              paymentId: payment.id,
              walleeRefundChf: (walleePortionToRefund / 100).toFixed(2),
            })

            const walleeResult = await processWalleeRefund({
              payment: {
                id: payment.id,
                wallee_transaction_id: payment.wallee_transaction_id,
                total_amount_rappen: payment.total_amount_rappen,
                credit_used_rappen: creditAlreadyUsed,
                payment_status: payment.payment_status,
                tenant_id: userProfile.tenant_id,
              },
              requestedAmountRappen: walleePortionToRefund,
              tenantId: userProfile.tenant_id,
              idempotencyKey: `appointment-cancel-${appointmentId}`,
              reason: `Kundenstornierung: ${reason.name_de}`,
            })

            if (walleeResult.success) {
              walleeRefundId = walleeResult.refundId || null
              logger.info('✅ Customer Wallee refund successful:', {
                refundId: walleeResult.refundId,
                amountChf: walleeResult.refundedAmountChf,
              })

              // Audit transaction (no balance change, refund goes back to card)
              await supabaseAdmin.from('credit_transactions').insert([{
                user_id: appointment.user_id,
                tenant_id: userProfile.tenant_id,
                transaction_type: 'cancellation',
                amount_rappen: walleeResult.refundedAmountRappen,
                balance_before_rappen: null,
                balance_after_rappen: null,
                payment_method: 'wallee_refund',
                reference_id: appointmentId,
                reference_type: 'appointment',
                created_by: userProfile.id,
                notes: `Wallee-Rückerstattung bei Kundenstornierung: ${reason.name_de} (CHF ${walleeResult.refundedAmountChf.toFixed(2)})`,
              }])
            } else {
              // Fallback to wallet if Wallee refund failed
              logger.warn('⚠️ Wallee refund failed, crediting wallet instead:', walleeResult.error)
              try {
                await creditWalletRefund(
                  supabaseAdmin, appointment.user_id, userProfile.tenant_id,
                  walleePortionToRefund, payment, appointmentId, reason.name_de, userProfile.id
                )
              } catch (walletErr: any) {
                logger.error('❌ Wallet fallback also failed — customer needs manual refund:', {
                  userId: appointment.user_id,
                  amountRappen: walleePortionToRefund,
                  error: walletErr.message,
                })
                throw createError({ statusCode: 500, statusMessage: 'Stornierung fehlgeschlagen: Rückerstattung konnte weder via Wallee noch auf das Guthaben verbucht werden.' })
              }
            }
          } else {
            // ── Wallet credit (default) ──────────────────────────────────
            logger.debug('💳 Refunding Wallee payment portion to student credit:', {
              paymentId: payment.id,
              totalAmount: (payment.total_amount_rappen / 100).toFixed(2),
              creditUsed: (creditAlreadyUsed / 100).toFixed(2),
              walleeRefund: (walleePortionToRefund / 100).toFixed(2)
            })

            await creditWalletRefund(
              supabaseAdmin, appointment.user_id, userProfile.tenant_id,
              walleePortionToRefund, payment, appointmentId, reason.name_de, userProfile.id
            )
          }
        }
        
        // Mark payment as refunded (covers both full and partial refunds — the
        // exact refunded share is recorded in notes/credit_transactions above)
        await supabaseAdmin
          .from('payments')
          .update({
            payment_status: 'refunded',
            refunded_at: new Date().toISOString(),
            ...(walleeRefundId ? { wallee_refund_id: walleeRefundId } : {}),
            notes: refundPercentage < 100
              ? `Kundenstornierung mit ${chargePercentage}% Gebühr: ${reason.name_de} (${refundPercentage}% erstattet${refundDestination === 'wallee' ? ' via Wallee' : ''})`
              : refundDestination === 'wallee'
                ? `Kundenstornierung (Wallee-Rückerstattung): ${reason.name_de}`
                : `Kostenlose Stornierung: ${reason.name_de}`,
            updated_at: toLocalTimeString(now)
          })
          .eq('id', payment.id)
        
        logger.debug('✅ Payment marked as refunded')
      } 
      else if (payment.payment_status === 'authorized') {
        if (chargePercentage === 0) {
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
        } else {
          // A partial/forced charge on a not-yet-captured authorization can't be
          // resolved automatically today (no partial-capture support in the Wallee
          // integration) — leave it authorized and flag it for manual handling
          // instead of silently doing nothing.
          logger.warn('⚠️ Charged cancellation on an authorized (not yet captured) payment — needs manual capture/void:', {
            paymentId: payment.id,
            chargePercentage,
          })
          await supabaseAdmin
            .from('payments')
            .update({
              notes: `${payment.notes ? payment.notes + ' | ' : ''}⚠️ Kundenstornierung mit ${chargePercentage}% Gebühr auf offene Autorisierung — manuelle Erfassung nötig: ${reason.name_de}`,
              updated_at: toLocalTimeString(now)
            })
            .eq('id', payment.id)
        }
      }
      else if (payment.payment_status === 'pending') {
        if (chargePercentage === 0) {
          await supabaseAdmin
            .from('payments')
            .update({
              payment_status: 'cancelled',
              updated_at: toLocalTimeString(now)
            })
            .eq('id', payment.id)

          logger.debug('✅ Payment cancelled (pending)')
        } else {
          // Partial charge on an unpaid appointment: keep the payment pending
          // but record the reduced amount actually owed so it isn't collected
          // in full — mirrors the same pattern used for staff cancellations in
          // handle-cancellation.post.ts.
          const chargeAmountRappen = Math.round(((payment.total_amount_rappen || 0) * chargePercentage) / 100)
          await supabaseAdmin
            .from('payments')
            .update({
              notes: `${payment.notes ? payment.notes + ' | ' : ''}Stornierung mit ${chargePercentage}% Gebühr: ${reason.name_de}`,
              metadata: {
                ...(payment.metadata || {}),
                cancellation_charge_percentage: chargePercentage,
                cancellation_charge_amount_rappen: chargeAmountRappen,
                cancellation_reason: reason.name_de,
              },
              updated_at: toLocalTimeString(now)
            })
            .eq('id', payment.id)

          logger.debug('✅ Payment kept pending with reduced cancellation charge amount:', {
            paymentId: payment.id,
            chargePercentage,
            chargeAmountRappen,
          })
        }
      }
    }
    // ============ LAYER 9: NOTIFY STAFF + CLIENT ============
    // Awaited (inside try/catch so a notification failure never rolls back the
    // already-committed cancellation). Previously this was a fire-and-forget IIFE
    // which was unreliable on Vercel serverless.
    try {
      const supabaseAdmin = getSupabaseAdmin()

      // Format appointment date/time (Zurich TZ)
      const apptDate = new Date(appointment.start_time).toLocaleDateString('de-CH', {
        timeZone: 'Europe/Zurich', weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'
      })
      const apptTime = new Date(appointment.start_time).toLocaleTimeString('de-CH', {
        timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit'
      })
      const appointmentDateTime = `${apptDate} ${apptTime}`
      const customerName = [userProfile.first_name, userProfile.last_name].filter(Boolean).join(' ')
        || userProfile.email
        || 'Unbekannt'

      // Fetch staff name + email
      let staffName = 'Unbekannt'
      let staffEmail: string | null = null
      if (appointment.staff_id) {
        const { data: staff } = await supabaseAdmin
          .from('users')
          .select('first_name, last_name, email')
          .eq('id', appointment.staff_id)
          .single()
        if (staff) {
          staffName = `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || 'Fahrlehrer'
          staffEmail = staff.email || null
        }
      }

      // Fetch tenant info
      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('name, slug')
        .eq('id', tenantId)
        .single()

      const tenantName = tenant?.name || 'Fahrschule'
      const tenantSlug = tenant?.slug || ''

      // Refund info for customer email — reflects any charge tier (0/50/100%…), not just free-vs-full
      const wasPaid = payment?.payment_status === 'completed'
      const refundAmountRappen = wasPaid
        ? Math.round(((payment?.total_amount_rappen ?? 0) * (100 - chargePercentage)) / 100)
        : 0
      const chargeAmountRappen = !wasPaid ? 0 : Math.round(((payment?.total_amount_rappen ?? 0) * chargePercentage) / 100)
      const refundAmountFormatted = refundAmountRappen > 0 ? `CHF ${(refundAmountRappen / 100).toFixed(2)}` : undefined
      const chargeAmountFormatted = chargeAmountRappen > 0 ? `CHF ${(chargeAmountRappen / 100).toFixed(2)}` : undefined

      const emailParams = {
        customerName,
        customerEmail: userProfile.email,
        appointmentDate: apptDate,
        appointmentTime: apptTime,
        staffName,
        reason: reason.name_de,
        chargePercentage,
        tenantName,
        requiresMedicalCertificate: reason.requires_proof || false,
      }

      // 1. Notify staff (queued for retry/audit)
      if (staffEmail) {
        const html = generateCustomerCancelledAdminEmail({ ...emailParams, recipientName: staffName })
        await supabaseAdmin.from('outbound_messages_queue').insert({
          tenant_id: tenantId,
          channel: 'email',
          recipient_email: staffEmail,
          subject: `Termin abgesagt – ${customerName} (${apptDate})`,
          body: html,
          status: 'pending',
          send_at: new Date().toISOString(),
          context_data: {
            stage: 'appointment_cancellation_staff',
            tenant_name: tenantName,
          },
        })
        logger.debug('✅ Staff cancellation notification queued for:', staffEmail)
      }

      // 2. Notify customer (using the existing cancelled template in send-appointment-notification)
      if (userProfile.email) {
        await $fetch('/api/email/send-appointment-notification', {
          method: 'POST',
          body: {
            email: userProfile.email,
            studentName: customerName,
            appointmentTime: appointmentDateTime,
            type: 'cancelled',
            cancellationReason: reason.name_de,
            staffName,
            tenantName,
            tenantId,
            tenantSlug,
            customerDashboard: `https://app.simy.ch/${tenantSlug}`,
            wasPaid,
            chargePercentage,
            refundAmount: refundAmountFormatted,
            chargeAmount: chargeAmountFormatted,
            userId: userProfile.id,
          },
        })
        logger.debug('✅ Customer cancellation confirmation sent to:', userProfile.email)
      }
    } catch (notifyErr: any) {
      logger.warn('⚠️ Cancellation notification failed (non-critical):', notifyErr.message)
    }

    // ============ LAYER 10: QUEUE AVAILABILITY RECALCULATION ============
    // Release the appointment slots and regenerate availability for the freed time
    try {
      logger.debug('📋 Queueing availability recalculation after customer cancellation...')
      await $fetch('/api/availability/queue-recalc', {
        method: 'POST',
        body: {
          staff_id: appointment.staff_id,
          tenant_id: tenantId,
          trigger: 'appointment'
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
      chargePercentage,
      policyDescription,
      refundDestination: refundDestination || 'wallet',
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
    
    throw mapSupabaseError(error)
  }
})

/**
 * Credits a refund amount to the student's wallet balance.
 * Extracted as a helper to avoid code duplication between the wallet and Wallee-fallback branches.
 */
async function creditWalletRefund(
  supabase: any,
  userId: string,
  tenantId: string,
  amountRappen: number,
  payment: any,
  appointmentId: string,
  reasonName: string,
  createdBy: string
) {
  let { data: studentCredit, error: creditError } = await supabase
    .from('student_credits')
    .select('id, balance_rappen')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (creditError) {
    logger.error('❌ creditWalletRefund: failed to fetch student_credits:', creditError)
    throw new Error(`Failed to fetch student_credits: ${creditError.message}`)
  }

  if (!studentCredit) {
    const { data: newCredit, error: createErr } = await supabase
      .from('student_credits')
      .insert([{ user_id: userId, balance_rappen: 0, tenant_id: tenantId }])
      .select('id, balance_rappen')
      .single()

    if (createErr) {
      logger.error('❌ creditWalletRefund: failed to create student_credits row:', createErr)
      throw new Error(`Failed to create student_credits: ${createErr.message}`)
    }
    studentCredit = newCredit
  }

  if (!studentCredit) {
    logger.error('❌ creditWalletRefund: no student_credits record after create attempt')
    throw new Error('Could not find or create student_credits record')
  }

  const oldBalance = studentCredit.balance_rappen || 0
  const newBalance = oldBalance + amountRappen

  const { error: updateErr } = await supabase
    .from('student_credits')
    .update({ balance_rappen: newBalance, updated_at: new Date().toISOString() })
    .eq('id', studentCredit.id)

  if (updateErr) {
    logger.error('❌ creditWalletRefund: failed to update balance:', updateErr)
    throw new Error(`Failed to update credit balance: ${updateErr.message}`)
  }

  const { error: txErr } = await supabase.from('credit_transactions').insert([{
    user_id: userId,
    tenant_id: tenantId,
    transaction_type: 'cancellation',
    amount_rappen: amountRappen,
    balance_before_rappen: oldBalance,
    balance_after_rappen: newBalance,
    payment_method: 'refund',
    reference_id: appointmentId,
    reference_type: 'appointment',
    created_by: createdBy,
    notes: `Kostenlose Stornierung (Gutschrift): ${reasonName} (CHF ${(amountRappen / 100).toFixed(2)})`,
  }])

  if (txErr) {
    logger.warn('⚠️ creditWalletRefund: credit_transactions insert failed (balance already updated):', txErr)
  }

  logger.info('✅ creditWalletRefund: wallet credited successfully', { userId, amountRappen, newBalance })
}

