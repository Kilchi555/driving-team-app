// server/api/discounts/check-and-save.post.ts
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getHeader } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { appointmentId, discountData } = body
    
    if (!appointmentId) {
      throw new Error('Appointment ID is required')
    }
    
    logger.debug('💰 Checking and saving discount:', { appointmentId })
    
    const supabaseAdmin = getSupabaseAdmin()
    const authorization = getHeader(event, 'authorization')
    const token = authorization?.replace('Bearer ', '')
    
    if (!token) {
      throw new Error('No authorization token')
    }
    
    // Get current user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Unauthorized')
    }
    
    // Verify user can access this appointment
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('appointments')
      .select('staff_id')
      .eq('id', appointmentId)
      .single()
    
    if (appointmentError || !appointment) {
      throw new Error('Appointment not found')
    }
    
    if (appointment.staff_id !== user.id) {
      throw new Error('Unauthorized to manage discount for this appointment')
    }
    
    // Check if discount already exists
    const { data: existingDiscount, error: checkError } = await supabaseAdmin
      .from('discount_sales')
      .select('id')
      .eq('appointment_id', appointmentId)
      .maybeSingle()
    
    if (checkError && checkError.code !== 'PGRST116') {
      logger.error('❌ Error checking existing discount:', checkError)
      throw new Error(checkError.message)
    }
    
    let discountRecord = null
    
    if (existingDiscount) {
      // Update existing discount
      logger.debug('📝 Updating existing discount')
      
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('discount_sales')
        .update(discountData)
        .eq('id', existingDiscount.id)
        .select()
        .single()
      
      if (updateError) {
        logger.error('❌ Error updating discount:', updateError)
        throw new Error(updateError.message)
      }
      
      discountRecord = updated
      logger.debug('✅ Discount updated successfully')
    } else {
      // Create new discount
      logger.debug('➕ Creating new discount')
      
      const { data: created, error: insertError } = await supabaseAdmin
        .from('discount_sales')
        .insert(discountData)
        .select()
        .single()
      
      if (insertError) {
        logger.error('❌ Error creating discount:', insertError)
        throw new Error(insertError.message)
      }
      
      discountRecord = created
      logger.debug('✅ Discount created successfully')
    }
    
    return {
      success: true,
      data: discountRecord,
      message: 'Discount saved successfully'
    }
    
  } catch (error: any) {
    logger.error('❌ Error in check-and-save:', error)
    throw createError({
      statusCode: 400,
      statusMessage: error.message || 'Failed to save discount'
    })
  }
})
