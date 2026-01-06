import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logAudit } from '~/server/utils/audit'
import { logger } from '~/utils/logger'
import {
  validateUUID,
  throwValidationError,
  throwIfInvalid
} from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  try {
    // LAYER 1: RATE LIMITING (disabled for testing, will be re-enabled later)
    // const rateLimitResult = checkRateLimit(event, 'save_discount')
    // if (!rateLimitResult.allowed) {
    //   throw createError({
    //     statusCode: 429,
    //     message: `Rate limit exceeded. Retry after ${rateLimitResult.reset}s`
    //   })
    // }

    // LAYER 2: AUTHENTICATION
    const authenticatedUser = await getAuthenticatedUser(event)
    if (!authenticatedUser) {
      throw createError({
        statusCode: 401,
        message: 'Authentication required'
      })
    }

    const body = await readBody(event)
    const { appointmentId, discountData } = body

    // LAYER 3: INPUT VALIDATION
    if (!appointmentId || !validateUUID(appointmentId).valid) {
      throwValidationError({ appointmentId: 'Valid UUID required' })
    }

    if (!discountData) {
      throwValidationError({ discountData: 'Discount data is required' })
    }

    // LAYER 4: GET USER DETAILS
    const supabaseAdmin = getSupabaseAdmin()
    
    const { data: requestingUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authenticatedUser.id)
      .single()

    if (userError || !requestingUser) {
      logger.error('User lookup failed:', userError)
      throw createError({
        statusCode: 404,
        message: 'User not found'
      })
    }

    // LAYER 5: AUTHORIZATION - Check if user can access this appointment
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('appointments')
      .select('user_id, tenant_id')
      .eq('id', appointmentId)
      .single()

    if (appointmentError || !appointment) {
      await logAudit({
        action: 'save_discount',
        status: 'error',
        resource_type: 'appointment',
        resource_id: appointmentId,
        auth_user_id: authenticatedUser.id,
        user_id: requestingUser.id,
        tenant_id: requestingUser.tenant_id,
        error_message: 'Appointment not found'
      })
      throw createError({
        statusCode: 404,
        message: 'Appointment not found'
      })
    }

    // LAYER 6: OWNERSHIP/AUTHORIZATION CHECK
    // Staff/Admins can save discounts for any appointment in their tenant
    // Customers can only save for their own appointments
    const isStaff = ['staff', 'admin', 'tenant_admin', 'superadmin'].includes(requestingUser.role)
    const isOwner = appointment.user_id === requestingUser.id
    const sameTenant = requestingUser.tenant_id === appointment.tenant_id

    if (!isOwner && (!isStaff || !sameTenant)) {
      await logAudit({
        action: 'save_discount',
        status: 'error',
        resource_type: 'appointment',
        resource_id: appointmentId,
        auth_user_id: authenticatedUser.id,
        user_id: requestingUser.id,
        tenant_id: requestingUser.tenant_id,
        error_message: 'User not authorized to save discount for this appointment'
      })
      throw createError({
        statusCode: 403,
        message: 'Not authorized to save discount for this appointment'
      })
    }

    // LAYER 7: PREPARE DISCOUNT DATA
    const finalDiscountData = {
      appointment_id: appointmentId,
      user_id: appointment.user_id,
      staff_id: discountData.staff_id || null,
      discount_amount_rappen: discountData.discount_amount_rappen || 0,
      discount_type: discountData.discount_type || 'fixed',
      discount_reason: discountData.discount_reason || null,
      payment_method: discountData.payment_method || null,
      status: discountData.status || 'pending',
      tenant_id: appointment.tenant_id
    }

    // LAYER 8: CHECK IF RECORD EXISTS
    const { data: existingDiscount, error: checkError } = await supabaseAdmin
      .from('discount_sales')
      .select('id')
      .eq('appointment_id', appointmentId)
      .single()

    let result
    if (existingDiscount) {
      // UPDATE existing record
      const { data: updatedRecord, error: updateError } = await supabaseAdmin
        .from('discount_sales')
        .update(finalDiscountData)
        .eq('id', existingDiscount.id)
        .select()
        .single()

      if (updateError) {
        logger.error('Discount update failed:', updateError)
        throw createError({
          statusCode: 500,
          message: 'Failed to update discount'
        })
      }

      result = updatedRecord
      logger.debug('✅ Discount updated:', result.id)
    } else {
      // CREATE new record
      const { data: newRecord, error: insertError } = await supabaseAdmin
        .from('discount_sales')
        .insert(finalDiscountData)
        .select()
        .single()

      if (insertError) {
        logger.error('Discount creation failed:', insertError)
        throw createError({
          statusCode: 500,
          message: 'Failed to create discount'
        })
      }

      result = newRecord
      logger.debug('✅ Discount created:', result.id)
    }

    // LAYER 9: AUDIT LOGGING
    await logAudit({
      action: 'save_discount',
      status: 'success',
      resource_type: 'discount_sales',
      resource_id: result.id,
      auth_user_id: authenticatedUser.id,
      user_id: requestingUser.id,
      tenant_id: requestingUser.tenant_id,
      details: {
        discount_amount_rappen: result.discount_amount_rappen,
        discount_type: result.discount_type
      }
    })

    return {
      success: true,
      discount: result
    }

  } catch (err: any) {
    logger.error('Error in save discount API:', err)
    
    // Return appropriate error response
    if (err.statusCode) {
      throw err
    }

    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to save discount'
    })
  }
})

