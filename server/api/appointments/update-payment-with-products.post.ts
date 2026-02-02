import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getHeader } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { appointmentId, productsPriceRappen } = body
    
    if (!appointmentId) {
      throw new Error('Appointment ID is required')
    }
    
    logger.debug('📝 Updating payment with products price:', {
      appointmentId,
      productsPriceRappen
    })
    
    const supabaseAdmin = getSupabaseAdmin()
    const authorization = getHeader(event, 'authorization')
    const token = authorization?.replace('Bearer ', '')
    
    if (!token) {
      throw new Error('No authorization token')
    }
    
    // 1. Get current user from token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
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
      .select('id, lesson_price_rappen, admin_fee_rappen, discount_amount_rappen, payment_status, appointment_id')
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
      .select('staff_id, tenant_id')
      .eq('id', appointmentId)
      .single()
    
    if (appointmentError || !appointment) {
      throw new Error('Appointment not found')
    }
    
    // Verify staff owns this appointment
    if (appointment.staff_id !== userProfile.id) {
      logger.error('❌ User not authorized for this appointment:', {
        staffId: appointment.staff_id,
        userProfileId: userProfile.id,
        userAuthId: user.id
      })
      throw new Error('Unauthorized to update this appointment')
    }
    
    // 4. Recalculate total: lesson + admin_fee + products - discount
    const newTotal = (existingPayment.lesson_price_rappen || 0)
      + (existingPayment.admin_fee_rappen || 0)
      + (productsPriceRappen || 0)
      - (existingPayment.discount_amount_rappen || 0)
    
    // 5. Prepare update data
    const updateData: any = {
      products_price_rappen: productsPriceRappen,
      total_amount_rappen: Math.max(0, newTotal),
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
