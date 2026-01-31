// server/api/appointments/get-last-category.get.ts
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getHeader } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const { student_id } = query
    
    logger.debug('🎯 Loading last appointment category', { student_id })
    
    const supabaseAdmin = getSupabaseAdmin()
    const authorization = getHeader(event, 'authorization')
    const token = authorization?.replace('Bearer ', '')
    
    if (!token) {
      throw new Error('No authorization token')
    }
    
    // Get current user (staff)
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Unauthorized')
    }
    
    // Build query for appointments
    let query_builder = supabaseAdmin
      .from('appointments')
      .select('type, start_time, user_id, title')
      .eq('staff_id', user.id)
      .is('deleted_at', null)
      .not('status', 'eq', 'cancelled')
      .not('status', 'eq', 'aborted')
      .order('start_time', { ascending: false })
    
    // If specific student requested, filter by that
    if (student_id) {
      logger.debug('🎯 Loading last category for specific student:', student_id)
      query_builder = query_builder.eq('user_id', student_id)
    }
    
    // Get last appointment
    const { data: lastAppointments, error } = await query_builder.limit(1)
    
    if (error) {
      logger.error('❌ Error loading last appointment:', error)
      throw new Error(error.message)
    }
    
    const lastAppointment = lastAppointments && lastAppointments.length > 0 ? lastAppointments[0] : null
    
    if (!lastAppointment) {
      logger.debug('ℹ️ No last appointment found')
      return {
        success: true,
        data: { category: null }
      }
    }
    
    logger.debug('✅ Last appointment category loaded:', lastAppointment.type)
    
    return {
      success: true,
      data: { category: lastAppointment.type }
    }
    
  } catch (error: any) {
    logger.error('❌ Error in get-last-category:', error)
    throw createError({
      statusCode: 400,
      statusMessage: error.message || 'Failed to get last appointment category'
    })
  }
})
