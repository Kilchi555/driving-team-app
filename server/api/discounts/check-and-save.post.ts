// server/api/discounts/check-and-save.post.ts
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { appointmentId, discountData } = body
    
    if (!appointmentId) {
      throw new Error('Appointment ID is required')
    }
    
    logger.debug('💰 Checking and saving discount:', { appointmentId })
    
    const supabaseAdmin = getSupabaseAdmin()
    const user = await getAuthenticatedUser(event)
    if (!user) {
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

    const isManualDiscount = Boolean(
      discountData?.is_manual_discount &&
      (discountData?.discount_amount_rappen || 0) > 0
    )
    if (isManualDiscount) {
      const { data: dbUser } = await supabaseAdmin
        .from('users')
        .select('id, tenant_id, role')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (!dbUser?.tenant_id) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
      }

      const { assertStaffCanApplyManualDiscount } = await import('~/server/utils/staff-manual-discount')
      await assertStaffCanApplyManualDiscount({
        tenantId: dbUser.tenant_id,
        role: dbUser.role,
        isManualDiscount: true
      })
    }

    // Strip client-only flag before DB write
    const { is_manual_discount: _manualFlag, ...persistDiscountData } = discountData || {}

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
        .update(persistDiscountData)
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
        .insert(persistDiscountData)
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
