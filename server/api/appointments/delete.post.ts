// server/api/appointments/delete.post.ts
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getHeader } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { appointmentId } = body
    
    if (!appointmentId) {
      throw new Error('Appointment ID is required')
    }
    
    logger.debug('🗑️ Deleting appointment:', appointmentId)
    
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
    
    // Get appointment
    const { data: appointment, error: fetchError } = await supabaseAdmin
      .from('appointments')
      .select('id, staff_id, user_id, tenant_id')
      .eq('id', appointmentId)
      .single()
    
    if (fetchError || !appointment) {
      throw new Error('Appointment not found')
    }
    
    // Verify user can delete (staff who created it or admin)
    if (appointment.staff_id !== user.id) {
      // Check if user is admin and same tenant
      const { data: currentUser } = await supabaseAdmin
        .from('users')
        .select('is_admin, tenant_id')
        .eq('id', user.id)
        .single()
      
      if (!currentUser?.is_admin || currentUser.tenant_id !== appointment.tenant_id) {
        throw new Error('Unauthorized to delete this appointment')
      }
    }
    
    // Delete appointment
    const { error: deleteError } = await supabaseAdmin
      .from('appointments')
      .delete()
      .eq('id', appointmentId)
    
    if (deleteError) {
      logger.error('❌ Error deleting appointment:', deleteError)
      throw new Error(deleteError.message)
    }
    
    logger.debug('✅ Appointment deleted:', appointmentId)

    // ✅ NEW: Queue staff for availability recalculation
    if (appointment.staff_id && appointment.tenant_id) {
      try {
        logger.debug(`📋 Queueing staff ${appointment.staff_id} for recalc after appointment deletion`)
        
        await supabaseAdmin
          .from('availability_recalc_queue')
          .upsert(
            {
              staff_id: appointment.staff_id,
              tenant_id: appointment.tenant_id,
              trigger: 'appointment',
              queued_at: new Date().toISOString(),
              processed: false
            },
            { onConflict: 'staff_id,tenant_id' }
          )
        
        logger.debug(`✅ Staff queued for recalculation after appointment deletion`)
      } catch (queueError: any) {
        logger.warn(`⚠️ Failed to queue staff for recalc (non-critical):`, queueError.message)
      }
    }
    
    return {
      success: true,
      message: 'Appointment deleted successfully'
    }
    
  } catch (error: any) {
    logger.error('❌ Error in delete:', error)
    throw createError({
      statusCode: 400,
      statusMessage: error.message || 'Failed to delete appointment'
    })
  }
})
