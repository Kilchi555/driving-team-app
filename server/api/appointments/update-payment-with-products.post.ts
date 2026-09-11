import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getAuthenticatedUser } from '~/server/utils/auth'
import {
  quoteStaffAppointmentLessonPrice,
  composeStaffPaymentTotals,
  staffQuoteMetadata,
  throwIfStaffPricingError,
} from '~/server/utils/staff-appointment-price'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { appointmentId } = body
    
    if (!appointmentId) {
      throw new Error('Appointment ID is required')
    }
    
    logger.debug('📝 Updating payment with products price from server catalog:', {
      appointmentId,
    })
    
    const supabaseAdmin = getSupabaseAdmin()
    const user = await getAuthenticatedUser(event)
    if (!user) {
      throw new Error('Unauthorized')
    }
    
    // 1b. Get user profile to get the DB user ID
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, role, tenant_id')
      .eq('auth_user_id', user.id)
      .single()
    
    if (profileError || !userProfile) {
      logger.error('❌ User profile not found:', user.id)
      throw new Error('User profile not found')
    }
    
    // 2. Get existing payment
    const { data: existingPayment, error: fetchError } = await supabaseAdmin
      .from('payments')
      .select('id, lesson_price_rappen, admin_fee_rappen, discount_amount_rappen, credit_used_rappen, payment_status, appointment_id, metadata')
      .eq('appointment_id', appointmentId)
      .single()
    
    if (fetchError) {
      logger.warn('⚠️ Payment not found for appointment:', appointmentId)
      return { success: false, data: null }
    }
    
    if (!existingPayment) {
      logger.debug('ℹ️ No payment found, skipping update')
      return { success: false, data: null }
    }
    
    // 3. Verify staff has access to this appointment
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('appointments')
      .select('id, staff_id, tenant_id, type, event_type_code, duration_minutes, user_id, vehicle_id, room_id')
      .eq('id', appointmentId)
      .single()
    
    if (appointmentError || !appointment) {
      throw new Error('Appointment not found')
    }
    
    const isStaff = userProfile.role === 'staff'
    const isAdmin = ['admin', 'tenant_admin', 'super_admin'].includes(userProfile.role)
    const isOwnAppointment = appointment.staff_id === userProfile.id
    const isSameTenant = appointment.tenant_id === userProfile.tenant_id
    if (!((isStaff && isOwnAppointment && isSameTenant) || (isAdmin && isSameTenant))) {
      logger.error('❌ User not authorized for this appointment:', {
        staffId: appointment.staff_id,
        userProfileId: userProfile.id,
        userAuthId: user.id
      })
      throw new Error('Unauthorized to update this appointment')
    }

    let quote
    try {
      quote = await quoteStaffAppointmentLessonPrice(supabaseAdmin, {
        tenantId: appointment.tenant_id,
        categoryCode: appointment.type,
        eventTypeCode: appointment.event_type_code,
        durationMinutes: appointment.duration_minutes,
        studentUserId: appointment.user_id,
        vehicleId: appointment.vehicle_id,
        roomId: appointment.room_id,
        mode: 'edit',
        excludeAppointmentId: appointment.id,
      })
    } catch (err) {
      throwIfStaffPricingError(err)
      throw err
    }

    const { data: sales } = await supabaseAdmin
      .from('product_sales')
      .select('total_price_rappen')
      .eq('appointment_id', appointmentId)
    const productsPriceRappen = (sales || []).reduce(
      (sum: number, row: any) => sum + (Math.round(Number(row.total_price_rappen) || 0)),
      0,
    )

    const totals = composeStaffPaymentTotals({
      lessonPriceRappen: quote.lessonPriceRappen,
      adminFeeRappen: quote.adminFeeRappen,
      productsPriceRappen,
      resourceCostRappen: quote.resourceCostRappen,
      discountAmountRappen: existingPayment.discount_amount_rappen || 0,
      creditUsedRappen: existingPayment.credit_used_rappen || 0,
    })
    
    // 5. Prepare update data
    const updateData: any = {
      lesson_price_rappen: totals.lesson_price_rappen,
      admin_fee_rappen: totals.admin_fee_rappen,
      products_price_rappen: totals.products_price_rappen,
      discount_amount_rappen: totals.discount_amount_rappen,
      credit_used_rappen: totals.credit_used_rappen,
      total_amount_rappen: totals.total_amount_rappen,
      metadata: {
        ...(existingPayment.metadata || {}),
        ...staffQuoteMetadata(quote, totals),
      },
      updated_at: new Date().toISOString()
    }
    
    // ALWAYS preserve payment_status
    if (existingPayment.payment_status) {
      updateData.payment_status = existingPayment.payment_status
      logger.debug('✅ Preserving payment status in products update:', existingPayment.payment_status)
    }
    
    // 6. Update payment
    const { data: updatedPayment, error: updateError } = await supabaseAdmin
      .from('payments')
      .update(updateData)
      .eq('id', existingPayment.id)
      .select()
      .single()
    
    if (updateError) {
      logger.error('❌ Error updating payment:', updateError)
      throw new Error(updateError.message)
    }
    
    logger.debug('✅ Payment updated with products price:', updatedPayment)
    
    return {
      success: true,
      data: updatedPayment,
      message: 'Payment updated successfully'
    }
    
  } catch (error: any) {
    logger.error('❌ Error in update-payment-with-products:', error)
    throw createError({
      statusCode: 400,
      statusMessage: error.message || 'Failed to update payment with products'
    })
  }
})
