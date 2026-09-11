import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { createClient } from '@supabase/supabase-js'
import logger from '~/utils/logger'
import {
  quoteStaffAppointmentFromRow,
  staffQuoteMetadata,
  throwIfStaffPricingError,
} from '~/server/utils/staff-appointment-price'

const STAFF_ROLES = ['admin', 'staff', 'super_admin', 'tenant_admin']
const ALLOWED_NON_MONETARY_FIELDS = ['payment_status', 'payment_method'] as const
const REJECTED_MONETARY_FIELDS = [
  'lesson_price_rappen',
  'admin_fee_rappen',
  'products_price_rappen',
  'discount_amount_rappen',
  'total_amount_rappen',
  'credit_used_rappen',
  'voucher_discount_rappen',
]

/**
 * POST /api/staff/update-payment
 *
 * Monetary columns cannot be planted. Appointment-linked payments are
 * re-quoted from the appointment row when a requote is requested via
 * update_data.requote === true. Otherwise only status/method may change.
 */
export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthUserFromRequest(event)
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - Authentication required',
      })
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role, is_active')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !userProfile) {
      throw createError({
        statusCode: 403,
        statusMessage: 'User profile not found',
      })
    }

    if (!userProfile.is_active) {
      throw createError({
        statusCode: 403,
        statusMessage: 'User account is inactive',
      })
    }

    if (!STAFF_ROLES.includes(userProfile.role)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Insufficient permissions – staff or admin role required',
      })
    }

    const tenantId = userProfile.tenant_id
    const body = await readBody(event)
    const paymentId = body.payment_id
    const updateData = body.update_data

    if (!paymentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Payment ID is required',
      })
    }

    if (!updateData || typeof updateData !== 'object') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Update data is required',
      })
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(paymentId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid payment ID format',
      })
    }

    const { data: payment, error: loadError } = await supabaseAdmin
      .from('payments')
      .select('id, tenant_id, appointment_id, metadata, payment_status')
      .eq('id', paymentId)
      .eq('tenant_id', tenantId)
      .single()

    if (loadError || !payment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Payment not found or access denied',
      })
    }

    const sanitizedUpdateData: Record<string, any> = {}
    for (const key of ALLOWED_NON_MONETARY_FIELDS) {
      if (updateData[key] !== undefined) sanitizedUpdateData[key] = updateData[key]
    }

    const wantsRequote = updateData.requote === true
    const sentMonetaryField = REJECTED_MONETARY_FIELDS.some(field => updateData[field] !== undefined)

    if (sentMonetaryField && !wantsRequote) {
      // Ignore planted amounts; EventModal duration-decrease still sends them.
      logger.warn('⚠️ [update-payment] Ignoring client monetary fields', {
        paymentId,
        fields: REJECTED_MONETARY_FIELDS.filter(field => updateData[field] !== undefined),
      })
    }

    if (wantsRequote) {
      if (!payment.appointment_id) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Cannot requote a payment without an appointment',
        })
      }
      const { data: appointment, error: appointmentError } = await supabaseAdmin
        .from('appointments')
        .select('id, tenant_id, type, event_type_code, duration_minutes, user_id, vehicle_id, room_id')
        .eq('id', payment.appointment_id)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (appointmentError || !appointment) {
        throw createError({ statusCode: 404, statusMessage: 'Appointment not found' })
      }
      let quoted
      try {
        quoted = await quoteStaffAppointmentFromRow(supabaseAdmin, appointment, { mode: 'edit' })
      } catch (err) {
        throwIfStaffPricingError(err)
        throw err
      }
      Object.assign(sanitizedUpdateData, {
        lesson_price_rappen: quoted.totals.lesson_price_rappen,
        admin_fee_rappen: quoted.totals.admin_fee_rappen,
        products_price_rappen: quoted.totals.products_price_rappen,
        discount_amount_rappen: quoted.totals.discount_amount_rappen,
        voucher_discount_rappen: 0,
        total_amount_rappen: quoted.totals.total_amount_rappen,
        credit_used_rappen: quoted.totals.credit_used_rappen,
        metadata: {
          ...(payment.metadata || {}),
          ...staffQuoteMetadata(quoted.quote, quoted.totals),
        },
      })
    }

    if (Object.keys(sanitizedUpdateData).length === 0) {
      const { data: unchanged } = await supabaseAdmin
        .from('payments')
        .select()
        .eq('id', paymentId)
        .eq('tenant_id', tenantId)
        .single()
      return { success: true, data: unchanged }
    }

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
        statusMessage: 'Failed to update payment',
      })
    }

    logger.debug('✅ Payment updated successfully:', {
      userId: userProfile.id,
      tenantId,
      paymentId,
      updatedFields: Object.keys(sanitizedUpdateData),
    })

    return {
      success: true,
      data: updatedPayment,
    }
  } catch (error: any) {
    logger.error('❌ Staff update-payment API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to update payment',
    })
  }
})
