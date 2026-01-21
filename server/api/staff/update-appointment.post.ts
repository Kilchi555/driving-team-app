import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { createClient } from '@supabase/supabase-js'
import logger from '~/utils/logger'

/**
 * ✅ POST /api/staff/update-appointment
 * 
 * Secure API to update appointment details
 * Handles duration reduction with automatic credit refund
 * 
 * Body:
 *   - appointment_id (required): Appointment ID to update
 *   - update_data (required): Object with fields to update
 *   - check_duration_reduction (optional): Check for duration reduction and credit student
 * 
 * Security Layers:
 *   1. Bearer Token Authentication
 *   2. Tenant Isolation
 *   3. Ownership Check
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
    const body = await readBody(event)
    const appointmentId = body.appointment_id
    const updateData = body.update_data
    const checkDurationReduction = body.check_duration_reduction || false

    if (!appointmentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Appointment ID is required'
      })
    }

    if (!updateData || typeof updateData !== 'object') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Update data is required'
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

    // ✅ LAYER 4: Load original appointment for ownership check
    const { data: originalAppointment, error: loadError } = await supabaseAdmin
      .from('appointments')
      .select('id, duration_minutes, user_id, tenant_id')
      .eq('id', appointmentId)
      .eq('tenant_id', tenantId)
      .single()

    if (loadError || !originalAppointment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Appointment not found or access denied'
      })
    }

    // ✅ LAYER 5: Check for duration reduction and handle credit
    let creditAdjustment = null
    if (checkDurationReduction && updateData.duration_minutes && updateData.duration_minutes < originalAppointment.duration_minutes) {
      const durationReduction = originalAppointment.duration_minutes - updateData.duration_minutes
      
      logger.debug('📉 Duration decreased, crediting student:', {
        original: originalAppointment.duration_minutes,
        new: updateData.duration_minutes,
        reduction: durationReduction
      })

      // Load payment to calculate credit
      const { data: payment } = await supabaseAdmin
        .from('payments')
        .select('*')
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (payment && payment.lesson_price_rappen > 0) {
        const pricePerMinute = payment.lesson_price_rappen / originalAppointment.duration_minutes
        const creditAmount = Math.round(pricePerMinute * durationReduction)

        // Load or create student credit
        const { data: existingCredit } = await supabaseAdmin
          .from('student_credits')
          .select('id, balance_rappen')
          .eq('user_id', originalAppointment.user_id)
          .eq('tenant_id', tenantId)
          .single()

        if (existingCredit) {
          const newBalance = existingCredit.balance_rappen + creditAmount
          await supabaseAdmin
            .from('student_credits')
            .update({ balance_rappen: newBalance })
            .eq('id', existingCredit.id)
        } else {
          await supabaseAdmin
            .from('student_credits')
            .insert({
              user_id: originalAppointment.user_id,
              tenant_id: tenantId,
              balance_rappen: creditAmount
            })
        }

        // Log credit transaction
        await supabaseAdmin
          .from('credit_transactions')
          .insert({
            user_id: originalAppointment.user_id,
            tenant_id: tenantId,
            amount_rappen: creditAmount,
            transaction_type: 'duration_reduction_credit',
            description: `Gutschrift für Dauerreduktion: ${durationReduction} Min`,
            reference_type: 'appointment',
            reference_id: appointmentId,
            created_by: userProfile.id
          })

        creditAdjustment = {
          amount_rappen: creditAmount,
          duration_reduction: durationReduction
        }

        // Update payment amount
        const newLessonPrice = Math.round(pricePerMinute * updateData.duration_minutes)
        await supabaseAdmin
          .from('payments')
          .update({
            lesson_price_rappen: newLessonPrice,
            total_amount_rappen: newLessonPrice + (payment.admin_fee_rappen || 0) + (payment.products_price_rappen || 0) - (payment.discount_amount_rappen || 0)
          })
          .eq('id', payment.id)
      }
    }

    // ✅ LAYER 6: Update appointment
    const { data: updatedAppointment, error: updateError } = await supabaseAdmin
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (updateError) {
      logger.error('❌ Error updating appointment:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update appointment'
      })
    }

    // ✅ LAYER 7: AUDIT LOGGING
    logger.debug('✅ Appointment updated successfully:', {
      userId: userProfile.id,
      tenantId: tenantId,
      appointmentId: appointmentId,
      updatedFields: Object.keys(updateData),
      creditAdjustment
    })

    return {
      success: true,
      data: updatedAppointment,
      credit_adjustment: creditAdjustment
    }

  } catch (error: any) {
    logger.error('❌ Staff update-appointment API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to update appointment'
    })
  }
})

