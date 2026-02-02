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
    const { payment_ids, method } = body

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

    logger.debug(`💳 Processing ${payment_ids.length} payments as ${method}`)

    const results = []

    // Process each payment
    for (const paymentId of payment_ids) {
      try {
        // Load payment with appointment data
        const { data: paymentData, error: loadError } = await supabaseAdmin
          .from('payments')
          .select(`
            id,
            tenant_id,
            appointment_id,
            total_amount_rappen,
            admin_fee_rappen,
            appointments(id, status, cancellation_charge_percentage)
          `)
          .eq('id', paymentId)
          .eq('tenant_id', tenantId)
          .single()

        if (loadError || !paymentData) {
          logger.warn(`⚠️ Payment ${paymentId} not found or access denied`)
          results.push({
            payment_id: paymentId,
            success: false,
            error: 'Payment not found or access denied'
          })
          continue
        }

        // Calculate amount for cancelled appointments
        let amountToMarkAsPaid = paymentData.total_amount_rappen
        
        if (paymentData.appointments?.status === 'cancelled') {
          const chargePercentage = paymentData.appointments.cancellation_charge_percentage ?? 100
          const appointmentCost = (paymentData.total_amount_rappen || 0) - (paymentData.admin_fee_rappen || 0)
          const chargeAmount = Math.round(appointmentCost * chargePercentage / 100)
          amountToMarkAsPaid = chargeAmount
          
          logger.debug(`💰 Cancelled payment - calculating charge:`, {
            paymentId,
            chargePercentage,
            originalAmount: paymentData.total_amount_rappen,
            chargeAmount
          })
        }

        // Update payment
        const updateData: any = {
          payment_method: method === 'cash' ? 'cash' : 'wallee',
          payment_status: method === 'cash' ? 'completed' : 'pending'
        }

        if (method === 'cash') {
          updateData.paid_at = new Date().toISOString()
          updateData.total_amount_rappen = amountToMarkAsPaid
        }

        const { error: updateError } = await supabaseAdmin
          .from('payments')
          .update(updateData)
          .eq('id', paymentId)
          .eq('tenant_id', tenantId)

        if (updateError) {
          logger.error(`❌ Error updating payment ${paymentId}:`, updateError)
          results.push({
            payment_id: paymentId,
            success: false,
            error: updateError.message
          })
          continue
        }

        // If cash payment, confirm the appointment if it's pending
        if (method === 'cash' && paymentData?.appointment_id) {
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
        }

        logger.debug(`✅ Payment ${paymentId} updated to ${method}`)
        results.push({
          payment_id: paymentId,
          success: true
        })

      } catch (paymentError: any) {
        logger.error(`❌ Error processing payment ${paymentId}:`, paymentError)
        results.push({
          payment_id: paymentId,
          success: false,
          error: paymentError.message
        })
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
