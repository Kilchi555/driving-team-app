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
      .select('id, staff_id, user_id, tenant_id, event_type_code, start_time')
      .eq('id', appointmentId)
      .single()
    
    if (fetchError || !appointment) {
      throw new Error('Appointment not found')
    }
    
    // Resolve DB user record (auth_user_id → users.id)
    const { data: currentUser } = await supabaseAdmin
      .from('users')
      .select('id, role, tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!currentUser) throw new Error('Unauthorized')

    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'tenant_admin'
    const isOwner = appointment.staff_id === currentUser.id
    const sameTenant = currentUser.tenant_id === appointment.tenant_id

    if ((!isOwner && !isAdmin) || !sameTenant) {
      throw new Error('Unauthorized to delete this appointment')
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

    // If a vacation appointment was deleted, recalculate that month's staff_monthly_hours
    if (appointment.event_type_code === 'vacation' && appointment.staff_id && appointment.start_time) {
      try {
        const deletedYear = new Date(appointment.start_time).getFullYear()
        const deletedMonth = new Date(appointment.start_time).getMonth() + 1
        const now = new Date()
        // Only recalculate past months (calculator skips current/future anyway)
        if (deletedYear < now.getFullYear() || (deletedYear === now.getFullYear() && deletedMonth < now.getMonth() + 1)) {
          await $fetch('/api/admin/staff-monthly-hours', {
            method: 'POST',
            body: {
              action: 'recalculate',
              staffId: appointment.staff_id,
              year: deletedYear,
              months: [deletedMonth]
            }
          })
          logger.debug(`✅ Recalculated month ${deletedMonth}/${deletedYear} after vacation deletion`)
        }
      } catch (recalcErr: any) {
        logger.warn('⚠️ Could not recalculate after vacation deletion (non-critical):', recalcErr.message)
      }
    }

    // ✅ NEW: Queue staff for availability recalculation
    if (appointment.staff_id && appointment.tenant_id) {
      try {
        logger.debug(`📋 Queueing staff ${appointment.staff_id} for recalc after appointment deletion`)
        
        await $fetch('/api/availability/queue-recalc', {
          method: 'POST',
          body: {
            staff_id: appointment.staff_id,
            tenant_id: appointment.tenant_id,
            trigger: 'appointment'
          }
        })
        
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
