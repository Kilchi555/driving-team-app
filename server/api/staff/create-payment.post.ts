import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import logger from '~/utils/logger'
import { isChargeableEventType } from '~/server/utils/event-type-charge'
import {
  quoteStaffAppointmentFromRow,
  staffQuoteMetadata,
  throwIfStaffPricingError,
} from '~/server/utils/staff-appointment-price'

const STAFF_ROLES = ['admin', 'staff', 'super_admin', 'tenant_admin']
const OFFLINE_COMPLETABLE = ['cash', 'twint', 'bank_transfer', 'card_terminal']

/**
 * POST /api/staff/create-payment
 *
 * Appointment lesson payments are quoted server-side. Client monetary
 * fields are ignored. Standalone (no appointment_id) inserts are rejected.
 */
export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    const supabase = getSupabaseAdmin()

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !user) {
      throw createError({ statusCode: 401, message: 'User not found' })
    }

    if (!STAFF_ROLES.includes(user.role)) {
      throw createError({ statusCode: 403, message: 'Insufficient permissions – staff or admin role required' })
    }

    const paymentData = await readBody(event)
    if (!paymentData?.appointment_id || !paymentData.user_id) {
      throw createError({
        statusCode: 400,
        message: 'appointment_id and user_id are required',
      })
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, tenant_id, type, event_type_code, duration_minutes, user_id, vehicle_id, room_id, staff_id')
      .eq('id', paymentData.appointment_id)
      .maybeSingle()

    if (appointmentError || !appointment) {
      throw createError({ statusCode: 404, message: 'Appointment not found' })
    }
    if (appointment.tenant_id !== user.tenant_id) {
      throw createError({ statusCode: 403, message: 'Access denied: tenant mismatch' })
    }
    if (paymentData.user_id !== appointment.user_id) {
      throw createError({ statusCode: 400, message: 'user_id does not match appointment' })
    }

    const chargeable = await isChargeableEventType(supabase, appointment.tenant_id, appointment.event_type_code)
    if (!chargeable) {
      throw createError({ statusCode: 400, message: 'Appointment is not chargeable' })
    }

    const { data: existing } = await supabase
      .from('payments')
      .select('id')
      .eq('appointment_id', appointment.id)
      .maybeSingle()
    if (existing) {
      throw createError({ statusCode: 409, message: 'Payment already exists for this appointment' })
    }

    let quoted
    try {
      quoted = await quoteStaffAppointmentFromRow(supabase, appointment, {
        productLines: paymentData.productLines,
        requestedDiscountRappen: 0,
        requestedCreditRappen: 0,
        mode: 'create',
      })
    } catch (err) {
      throwIfStaffPricingError(err)
      throw err
    }

    const method = String(paymentData.payment_method || 'cash')
    const offlineCompletable = OFFLINE_COMPLETABLE.includes(method)
    const requestedStatus = String(paymentData.payment_status || 'pending')
    let paymentStatus = 'pending'
    if (requestedStatus === 'completed' && offlineCompletable) {
      paymentStatus = 'completed'
    } else if (requestedStatus === 'pending' || requestedStatus === 'processing') {
      paymentStatus = requestedStatus
    }
    if (quoted.totals.credit_used_rappen >= quoted.totals.total_amount_rappen && quoted.totals.total_amount_rappen >= 0) {
      paymentStatus = 'completed'
    }

    const paymentToInsert: Record<string, any> = {
      appointment_id: appointment.id,
      user_id: appointment.user_id,
      staff_id: appointment.staff_id || paymentData.staff_id || user.id,
      tenant_id: user.tenant_id,
      lesson_price_rappen: quoted.totals.lesson_price_rappen,
      admin_fee_rappen: quoted.totals.admin_fee_rappen,
      products_price_rappen: quoted.totals.products_price_rappen,
      discount_amount_rappen: quoted.totals.discount_amount_rappen,
      credit_used_rappen: quoted.totals.credit_used_rappen,
      voucher_discount_rappen: 0,
      total_amount_rappen: quoted.totals.total_amount_rappen,
      payment_method: method,
      payment_status: paymentStatus,
      currency: paymentData.currency || 'CHF',
      description: typeof paymentData.description === 'string' ? paymentData.description : null,
      metadata: {
        ...(paymentData.metadata && typeof paymentData.metadata === 'object' ? paymentData.metadata : {}),
        ...staffQuoteMetadata(quoted.quote, quoted.totals),
      },
    }
    if (paymentStatus === 'completed') {
      paymentToInsert.paid_at = paymentData.paid_at || new Date().toISOString()
    }

    const { data: payment, error: insertError } = await supabase
      .from('payments')
      .insert(paymentToInsert)
      .select()
      .single()

    if (insertError) {
      logger.error('❌ Error creating payment:', insertError)
      throw createError({
        statusCode: 500,
        message: 'Failed to create payment',
      })
    }

    logger.debug('✅ Payment created:', {
      userId: user.id,
      paymentId: payment.id,
      amount: quoted.totals.total_amount_rappen,
      tenantId: user.tenant_id,
    })

    return {
      success: true,
      data: payment,
    }
  } catch (error: any) {
    logger.error('❌ Error in create-payment API:', error.message)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to create payment',
    })
  }
})
