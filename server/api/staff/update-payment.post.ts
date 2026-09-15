import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { createClient } from '@supabase/supabase-js'
import logger from '~/utils/logger'
import {
  composeStaffPaymentFromOffer,
  staffQuoteFromPersistedLesson,
} from '~/server/utils/quote-staff-appointment'
import { quoteStaffResourceSurcharge } from '~/server/utils/quote-staff-resource-surcharge'

/**
 * ✅ POST /api/staff/update-payment
 * 
 * Secure API to update payment details
 * 
 * Body:
 *   - payment_id (required): Payment ID
 *   - update_data (required): Object with fields to update
 * 
 * Security Layers:
 *   1. Bearer Token Authentication
 *   2. Tenant Isolation
 *   3. Ownership Check
 *   4. Field Whitelist (only specific fields can be updated)
 *   5. Audit Logging
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

    // ✅ ROLE CHECK — only staff/admin may update payment financial fields
    if (!['admin', 'staff', 'super_admin', 'tenant_admin'].includes(userProfile.role)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Insufficient permissions – staff or admin role required'
      })
    }

    const tenantId = userProfile.tenant_id

    // ✅ LAYER 3: INPUT VALIDATION
    const body = await readBody(event)
    const paymentId = body.payment_id
    const updateData = body.update_data

    if (!paymentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Payment ID is required'
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
    if (!uuidRegex.test(paymentId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid payment ID format'
      })
    }

    // ✅ LAYER 4: Field Whitelist - only allow specific fields
    const allowedFields = [
      'lesson_price_rappen',
      'admin_fee_rappen',
      'products_price_rappen',
      'discount_amount_rappen',
      'total_amount_rappen',
      'credit_used_rappen',
      'payment_status',
      'payment_method'
    ]

    const sanitizedUpdateData: any = {}
    for (const key of Object.keys(updateData)) {
      if (allowedFields.includes(key)) {
        sanitizedUpdateData[key] = updateData[key]
      }
    }

    if (Object.keys(sanitizedUpdateData).length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No valid fields to update'
      })
    }

    // ✅ LAYER 5: Ownership check
    const { data: payment, error: loadError } = await supabaseAdmin
      .from('payments')
      .select('id, tenant_id, appointment_id, lesson_price_rappen, admin_fee_rappen, products_price_rappen, discount_amount_rappen, payment_status')
      .eq('id', paymentId)
      .eq('tenant_id', tenantId)
      .single()

    if (loadError || !payment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Payment not found or access denied'
      })
    }

    const amountKeys = [
      'lesson_price_rappen',
      'admin_fee_rappen',
      'products_price_rappen',
      'discount_amount_rappen',
      'total_amount_rappen',
    ]
    const touchesAmount = amountKeys.some((key) => Object.prototype.hasOwnProperty.call(sanitizedUpdateData, key))

    if (touchesAmount) {
      const nextLesson = Object.prototype.hasOwnProperty.call(sanitizedUpdateData, 'lesson_price_rappen')
        ? sanitizedUpdateData.lesson_price_rappen
        : payment.lesson_price_rappen
      const nextAdmin = Object.prototype.hasOwnProperty.call(sanitizedUpdateData, 'admin_fee_rappen')
        ? sanitizedUpdateData.admin_fee_rappen
        : payment.admin_fee_rappen
      const nextProducts = Object.prototype.hasOwnProperty.call(sanitizedUpdateData, 'products_price_rappen')
        ? sanitizedUpdateData.products_price_rappen
        : payment.products_price_rappen
      const nextDiscount = Object.prototype.hasOwnProperty.call(sanitizedUpdateData, 'discount_amount_rappen')
        ? sanitizedUpdateData.discount_amount_rappen
        : payment.discount_amount_rappen

      // Cancel path zeros the lesson. Resource is for the lesson/vehicle-room time —
      // do not invent a surcharge when the caller explicitly clears the lesson.
      let resourceSurchargeRappen = 0
      const lessonExplicitlyZero = Object.prototype.hasOwnProperty.call(sanitizedUpdateData, 'lesson_price_rappen')
        && Number(nextLesson) === 0

      if (!lessonExplicitlyZero && payment.appointment_id) {
        const { data: appointment } = await supabaseAdmin
          .from('appointments')
          .select('tenant_id, vehicle_id, room_id, duration_minutes')
          .eq('id', payment.appointment_id)
          .eq('tenant_id', tenantId)
          .maybeSingle()

        if (appointment) {
          const staffResource = await quoteStaffResourceSurcharge(supabaseAdmin, {
            tenantId: appointment.tenant_id,
            vehicleId: appointment.vehicle_id,
            roomId: appointment.room_id,
            durationMinutes: appointment.duration_minutes,
          })
          resourceSurchargeRappen = staffResource.totalRappen
        }
      }

      const staffPayment = composeStaffPaymentFromOffer(
        staffQuoteFromPersistedLesson(nextLesson),
        {
          adminFeeRappen: nextAdmin,
          productsPriceRappen: nextProducts,
          resourceSurchargeRappen,
          discountAmountRappen: nextDiscount,
        },
      )

      delete sanitizedUpdateData.total_amount_rappen
      sanitizedUpdateData.total_amount_rappen = staffPayment.totalAmountRappen
    }

    // ✅ LAYER 6: Update payment
    const { data: updatedPayment, error: updateError } = await supabaseAdmin
      .from('payments')
      .update(sanitizedUpdateData)
      .eq('id', paymentId)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (updateError) {
      logger.error('❌ Error updating payment:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update payment'
      })
    }

    // ✅ LAYER 7: AUDIT LOGGING
    logger.debug('✅ Payment updated successfully:', {
      userId: userProfile.id,
      tenantId: tenantId,
      paymentId: paymentId,
      updatedFields: Object.keys(sanitizedUpdateData)
    })

    return {
      success: true,
      data: updatedPayment
    }

  } catch (error: any) {
    logger.error('❌ Staff update-payment API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to update payment'
    })
  }
})

