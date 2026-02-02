// server/api/staff/get-last-student-duration.get.ts
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getHeader } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const userId = query.user_id as string
    
    if (!userId) {
      throw new Error('user_id is required')
    }
    
    logger.debug('📊 Getting last student duration for:', userId)
    
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
    
    // Get user profile for tenant validation
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, role, tenant_id')
      .eq('id', user.id)
      .single()
    
    if (profileError || !userProfile) {
      throw new Error('User profile not found')
    }
    
    // Get the student's tenant to validate access
    const { data: student, error: studentError } = await supabaseAdmin
      .from('users')
      .select('tenant_id')
      .eq('id', userId)
      .single()
    
    if (studentError || !student) {
      throw new Error('Student not found')
    }
    
    // Verify staff and student are in same tenant
    if (student.tenant_id !== userProfile.tenant_id) {
      throw new Error('Unauthorized to access this student')
    }
    
    // Get last appointment for this student (ordered by start_time DESC)
    const { data: lastAppointment, error } = await supabaseAdmin
      .from('appointments')
      .select('duration_minutes')
      .eq('user_id', userId)
      .in('status', ['completed', 'confirmed'])
      .order('start_time', { ascending: false })
      .limit(1)
      .single()
    
    if (error) {
      // No previous appointments - this is OK
      if (error.code === 'PGRST116') {
        logger.debug('ℹ️ No previous appointments for student:', userId)
        return {
          success: true,
          data: null
        }
      }
      logger.error('❌ Error fetching last appointment:', error)
      throw error
    }
    
    logger.debug('✅ Last student duration found:', lastAppointment?.duration_minutes)
    
    return {
      success: true,
      data: {
        duration_minutes: lastAppointment?.duration_minutes || null
      }
    }
    
  } catch (error: any) {
    logger.error('❌ Error in get-last-student-duration:', error)
    throw createError({
      statusCode: 400,
      statusMessage: error.message || 'Failed to get last student duration'
    })
  }
})
