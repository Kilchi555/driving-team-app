import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { createClient } from '@supabase/supabase-js'
import logger from '~/utils/logger'

/**
 * ✅ POST /api/staff/process-bulk-payment
 * 
 * Secure API to process multiple payments in bulk (mark as cash or online)
 * 
 * Body:
 *   - payment_ids (required): Array of Payment IDs
 *   - method (required): 'cash' or 'online'
 * 
 * Security Layers:
 *   1. Bearer Token Authentication
 *   2. Tenant Isolation
 *   3. Ownership Check for each payment
 *   4. Audit Logging
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
    const { payment_ids, method, partial_amount_rappen } = body

    if (!Array.isArray(payment_ids) || payment_ids.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Payment IDs array is required and must not be empty'
      })
    }

    if (!['cash', 'online'].includes(method)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Method must be "cash" or "online"'
      })
    }

    logger.debug(`💳 Processing ${payment_ids.length} payments as ${method}`, { partial_amount_rappen })

    // Load all payments upfront (including already-paid partial amounts)
    const { data: allPayments, error: loadAllError } = await supabaseAdmin
      .from('payments')
      .select(`
        id,
        tenant_id,
        user_id,
        appointment_id,
        total_amount_rappen,
        admin_fee_rappen,
        credit_used_rappen,
        amount_paid_rappen,
        payment_status,
        metadata,
        created_at,
        appointments(id, status, cancellation_charge_percentage, type)
      `)
      .in('id', payment_ids)
      .eq('tenant_id', tenantId)

    if (loadAllError || !allPayments) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to load payments' })
    }

    // Calculate remaining due per payment (total - credit - already paid via earlier partial payments)
    const paymentDues = allPayments.map((p: any) => {
      let fullDue = (p.total_amount_rappen || 0) - (p.credit_used_rappen || 0)
      if (p.appointments?.status === 'cancelled') {
        const chargePercentage = p.appointments.cancellation_charge_percentage ?? 100
        const appointmentCost = (p.total_amount_rappen || 0) - (p.admin_fee_rappen || 0)
        fullDue = Math.round(appointmentCost * chargePercentage / 100)
      }
      const alreadyPaid = p.payment_status === 'partial' ? (p.amount_paid_rappen || 0) : 0
      const remaining = Math.max(0, fullDue - alreadyPaid)
      return { ...p, due_rappen: remaining, already_paid_rappen: alreadyPaid, full_due_rappen: fullDue, metadata: p.metadata || {} }
    })

    // Distribute partial payment if provided
    let remainingRappen = (typeof partial_amount_rappen === 'number' && partial_amount_rappen > 0)
      ? partial_amount_rappen
      : null

    const totalDueRappen = paymentDues.reduce((sum: number, p: any) => sum + p.due_rappen, 0)

    // Sort by remaining due ascending so cheapest appointments are covered first
    const sortedPayments = remainingRappen !== null
      ? [...paymentDues].sort((a, b) => a.due_rappen - b.due_rappen)
      : paymentDues

    // decision stores how much NEW money is being applied to this payment
    const paymentDecisions: Map<string, { status: 'completed' | 'partial'; new_amount: number }> = new Map()
    if (remainingRappen !== null) {
      for (const p of sortedPayments) {
        if (p.due_rappen === 0) continue // already fully paid, skip
        if (remainingRappen >= p.due_rappen) {
          paymentDecisions.set(p.id, { status: 'completed', new_amount: p.due_rappen })
          remainingRappen -= p.due_rappen
        } else if (remainingRappen > 0) {
          paymentDecisions.set(p.id, { status: 'partial', new_amount: remainingRappen })
          remainingRappen = 0
        }
      }
    } else {
      for (const p of paymentDues) {
        if (p.due_rappen > 0) {
          paymentDecisions.set(p.id, { status: 'completed', new_amount: p.due_rappen })
        }
      }
    }

    // Overpayment = money paid beyond total due → goes to student credit
    const overpaymentRappen = (typeof partial_amount_rappen === 'number' && partial_amount_rappen > totalDueRappen)
      ? partial_amount_rappen - totalDueRappen
      : 0

    const results = []
    const now = new Date().toISOString()

    // Process each payment
    for (const paymentData of allPayments as any[]) {
      const paymentId = paymentData.id
      const decision = paymentDecisions.get(paymentId)

      if (!decision) {
        // Not covered by partial payment – skip
        results.push({ payment_id: paymentId, success: true, skipped: true })
        continue
      }

      try {
        const paymentDueData = paymentDues.find((p: any) => p.id === paymentId) as any
        const totalAmountPaid = (paymentDueData?.already_paid_rappen || 0) + decision.new_amount

        const updateData: any = {
          payment_method: method === 'cash' ? 'cash' : 'wallee',
          payment_status: method === 'cash' ? decision.status : 'pending'
        }

        if (method === 'cash') {
          updateData.amount_paid_rappen = totalAmountPaid
          if (decision.status === 'completed') {
            updateData.paid_at = now
          }
          // Append to partial_payments history in metadata
          const existingMeta = (paymentDueData as any)?.metadata || {}
          const existingHistory: any[] = existingMeta.partial_payments || []

          // ✅ Falls bereits vorher etwas bezahlt wurde (already_paid_rappen > 0, z.B. direkt bei
          // der Terminerstellung), aber noch nie in der partial_payments-Historie erfasst wurde,
          // zuerst rückwirkend einen Eintrag dafür anlegen - sonst würde diese (neue) Zahlung
          // fälschlich als "1. Zahlung" angezeigt, obwohl es schon eine frühere gab.
          const alreadyPaidRappen = paymentDueData?.already_paid_rappen || 0
          if (existingHistory.length === 0 && alreadyPaidRappen > 0) {
            existingHistory.push({
              amount_rappen: alreadyPaidRappen,
              paid_at: paymentDueData?.created_at || now
            })
          }

          existingHistory.push({ amount_rappen: decision.new_amount, paid_at: now })
          updateData.metadata = { ...existingMeta, partial_payments: existingHistory }
        }

        const { error: updateError } = await supabaseAdmin
          .from('payments')
          .update(updateData)
          .eq('id', paymentId)
          .eq('tenant_id', tenantId)

        if (updateError) {
          logger.error(`❌ Error updating payment ${paymentId}:`, updateError)
          results.push({ payment_id: paymentId, success: false, error: updateError.message })
          continue
        }

        // Confirm pending appointments for fully paid cash payments
        if (method === 'cash' && decision.status === 'completed' && paymentData?.appointment_id) {
          const { error: appointmentError } = await supabaseAdmin
            .from('appointments')
            .update({ status: 'confirmed' })
            .eq('id', paymentData.appointment_id)
            .eq('status', 'pending_confirmation')
            .eq('tenant_id', tenantId)

          if (appointmentError) {
            logger.warn(`⚠️ Could not confirm appointment ${paymentData.appointment_id}:`, appointmentError)
          } else {
            logger.debug(`✅ Appointment ${paymentData.appointment_id} confirmed`)
          }

          // ✅ AFFILIATE REWARD HOOK
          if (paymentData.user_id) {
            $fetch('/api/affiliate/process-reward', {
              method: 'POST',
              headers: { 'x-internal-secret': process.env.CRON_SECRET || '' },
              body: {
                appointment_id: paymentData.appointment_id,
                user_id: paymentData.user_id,
                tenant_id: tenantId,
                driving_category: (paymentData.appointments as any)?.type ?? null
              }
            }).catch((err: any) =>
              logger.warn('⚠️ Affiliate reward hook failed (non-fatal):', err?.message)
            )
          }
        }

        logger.debug(`✅ Payment ${paymentId} → ${decision.status} (total paid: ${totalAmountPaid} rp)`)
        results.push({ payment_id: paymentId, success: true, status: decision.status })

      } catch (paymentError: any) {
        logger.error(`❌ Error processing payment ${paymentId}:`, paymentError)
        results.push({ payment_id: paymentId, success: false, error: paymentError.message })
      }
    }

    // ✅ OVERPAYMENT → add directly to student credit using admin client
    logger.debug(`💳 Overpayment check: partial_amount=${partial_amount_rappen}, totalDue=${totalDueRappen}, overpayment=${overpaymentRappen}`)
    let creditAdded = 0
    if (overpaymentRappen > 0 && method === 'cash') {
      const studentUserId = (allPayments as any[])[0]?.user_id
      if (studentUserId) {
        try {
          const notes = `Überzahlung bei Barzahlung (CHF ${(overpaymentRappen / 100).toFixed(2)} Rückgeld)`
          // Get current balance
          const { data: currentCredit } = await supabaseAdmin
            .from('student_credits')
            .select('balance_rappen')
            .eq('user_id', studentUserId)
            .eq('tenant_id', tenantId)
            .maybeSingle()
          const currentBalance = currentCredit?.balance_rappen || 0
          const newBalance = currentBalance + overpaymentRappen

          // Upsert credit
          const { error: creditErr } = await supabaseAdmin
            .from('student_credits')
            .upsert({ user_id: studentUserId, tenant_id: tenantId, balance_rappen: newBalance, notes, updated_at: now }, { onConflict: 'user_id,tenant_id' })
          if (creditErr) {
            logger.error('❌ Overpayment credit upsert failed:', creditErr)
            throw creditErr
          }

          // Log transaction
          const { error: txErr } = await supabaseAdmin.from('credit_transactions').insert({
            user_id: studentUserId,
            tenant_id: tenantId,
            transaction_type: 'deposit',
            amount_rappen: overpaymentRappen,
            balance_before_rappen: currentBalance,
            balance_after_rappen: newBalance,
            payment_method: 'cash',
            reference_type: 'overpayment',
            created_by: userProfile.id,
            notes,
            created_at: now
          })
          if (txErr) logger.warn('⚠️ Credit transaction log failed (non-fatal):', txErr)

          creditAdded = overpaymentRappen
          logger.info(`💰 Overpayment CHF ${(overpaymentRappen / 100).toFixed(2)} credited to user ${studentUserId} (balance: ${currentBalance} → ${newBalance} rp)`)
        } catch (creditErr: any) {
          logger.error('❌ Could not add overpayment to student credit:', creditErr?.message, creditErr)
        }
      }
    }

    // ✅ AUDIT LOGGING
    const successCount = results.filter(r => r.success).length
    logger.debug('✅ Bulk payment processing completed:', {
      userId: userProfile.id,
      tenantId: tenantId,
      method,
      totalPayments: payment_ids.length,
      successCount,
      failureCount: payment_ids.length - successCount
    })

    return {
      success: true,
      results,
      credit_added_rappen: creditAdded,
      summary: {
        total: payment_ids.length,
        successful: successCount,
        failed: payment_ids.length - successCount
      }
    }

  } catch (error: any) {
    logger.error('❌ Staff process-bulk-payment API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to process bulk payment'
    })
  }
})
