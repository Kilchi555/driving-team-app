import { defineEventHandler, createError, getQuery } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    logger.error('❌ Supabase credentials not configured for get-students API')
    throw createError({
      statusCode: 500,
      statusMessage: 'Server configuration error'
    })
  }

  const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    // Get authenticated user
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    // Get query parameters
    const query = getQuery(event)
    const showAllStudents = query.showAllStudents === 'true'

    // Get user's profile
    const { data: userProfile, error: userProfileError } = await serviceSupabase
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userProfileError || !userProfile) {
      logger.warn(`⚠️ User profile not found for auth_user_id: ${authUser.id}`)
      throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
    }

    const tenantId = userProfile.tenant_id
    const userId = userProfile.id
    const userRole = userProfile.role

    logger.debug(`🔍 Fetching students for user ${userId} with role ${userRole} in tenant ${tenantId}`)

    let students: any[] = []

    if (userRole === 'staff' && !showAllStudents) {
      // Load assigned students for this staff
      logger.debug('👨‍🏫 Loading assigned students for staff:', userId)
      
      const { data: assignedStudents, error: assignedError } = await serviceSupabase
        .from('users')
        .select('id, first_name, last_name, email, phone, category, assigned_staff_id, preferred_location_id, role, is_active, onboarding_status')
        .eq('role', 'client')
        .eq('assigned_staff_id', userId)
        .eq('tenant_id', tenantId)
        .or('is_active.eq.true,onboarding_status.eq.pending')
        .order('first_name')

      if (assignedError) throw assignedError

      logger.debug('🔍 Assigned students loaded:', assignedStudents?.length || 0)

      // Load students with appointment history
      logger.debug('🔍 Loading students with appointment history for staff:', userId)
      
      const { data: appointmentStudents, error: appointmentError } = await serviceSupabase
        .from('appointments')
        .select('user_id, users!appointments_user_id_fkey(id, first_name, last_name, email, phone, category, assigned_staff_id, preferred_location_id, role, is_active, onboarding_status)')
        .eq('staff_id', userId)
        .eq('tenant_id', tenantId)
        .not('users', 'is', null)

      if (appointmentError) {
        logger.warn('⚠️ Error loading appointment students:', appointmentError)
      }

      // Combine and deduplicate
      const byId: Record<string, any> = {}

      // First: students from appointment history (preferred for category)
      if (appointmentStudents) {
        for (const apt of appointmentStudents) {
          if (apt.users) {
            byId[apt.users.id] = apt.users
          }
        }
      }

      // Then: assigned students - only add if not already present
      for (const student of assignedStudents || []) {
        if (!byId[student.id]) {
          byId[student.id] = student
        }
      }

      students = Object.values(byId)

      logger.debug(`✅ Staff students loaded: ${students.length}`)
    } else {
      // Load all active students for admin mode or when showAllStudents=true
      logger.debug('👑 Loading all active students (Admin mode or show all)')

      const { data, error: fetchError } = await serviceSupabase
        .from('users')
        .select('id, first_name, last_name, email, phone, category, assigned_staff_id, preferred_location_id, role, is_active, onboarding_status')
        .eq('role', 'client')
        .eq('tenant_id', tenantId)
        .or('is_active.eq.true,onboarding_status.eq.pending')
        .order('first_name')

      if (fetchError) throw fetchError

      students = data || []

      logger.debug(`✅ All students loaded: ${students.length}`)
    }

    logger.info(`✅ Successfully fetched ${students.length} students for user ${userId}`)

    return {
      success: true,
      data: students
    }

  } catch (error: any) {
    logger.error('❌ Error in get-students API:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})

