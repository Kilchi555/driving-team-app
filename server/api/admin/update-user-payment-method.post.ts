import { defineEventHandler, createError, readBody } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

interface UpdatePaymentMethodRequest {
  userId: string
  paymentMethod: string
  billingAddressId?: string
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<UpdatePaymentMethodRequest>(event)

    if (!body.userId || !body.paymentMethod) {
      throw createError({
        statusCode: 400,
        statusMessage: 'userId and paymentMethod are required'
      })
    }

    // LAYER 1: AUTHENTICATE USER
    const authenticatedUser = await getAuthenticatedUser(event)
    if (!authenticatedUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      })
    }

    const supabase = getSupabaseAdmin()

    // LAYER 2: GET AUTHENTICATED USER FROM USERS TABLE
    const { data: requestingUser, error: requestingUserError } = await supabase
      .from('users')
      .select('id, role, tenant_id')
      .eq('auth_user_id', authenticatedUser.id)
      .single()

    if (requestingUserError || !requestingUser) {
      logger.warn('⚠️ Requesting user not found:', requestingUserError)
      throw createError({
        statusCode: 404,
        statusMessage: 'User profile not found'
      })
    }

    // LAYER 3: AUTHORIZATION - Only staff/admins can update user payment methods
    if (!['staff', 'admin', 'tenant_admin'].includes(requestingUser.role)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Only staff/admins can update user payment methods'
      })
    }

    // LAYER 4: VERIFY TARGET USER IS IN SAME TENANT
    const { data: targetUser, error: targetUserError } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('id', body.userId)
      .eq('tenant_id', requestingUser.tenant_id)
      .single()

    if (targetUserError || !targetUser) {
      logger.warn('⚠️ Target user not found or not in same tenant:', targetUserError)
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found or not in same tenant'
      })
    }

    // LAYER 5: UPDATE PAYMENT METHOD
    const updateData: any = {
      preferred_payment_method: body.paymentMethod
    }

    // Also update billing address if provided
    if (body.billingAddressId) {
      updateData.default_company_billing_address_id = body.billingAddressId
      logger.debug('📋 Updating billing address:', body.billingAddressId)
    }

    const { data: updated, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', body.userId)
      .select('id, preferred_payment_method, default_company_billing_address_id')
      .single()

    if (updateError) {
      logger.error('❌ Error updating payment method:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to update payment method: ${updateError.message}`
      })
    }

    logger.debug('✅ Payment method updated successfully:', {
      userId: body.userId,
      paymentMethod: body.paymentMethod,
      billingAddressId: body.billingAddressId
    })

    return {
      success: true,
      data: updated
    }
  } catch (error: any) {
    logger.error('❌ Error in update-user-payment-method API:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})

