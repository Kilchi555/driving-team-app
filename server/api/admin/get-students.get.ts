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
      
      // ✅ Query students where assigned_staff_id (singular) matches
      // This covers old assignments
      const { data: oldAssignedStudents, error: oldError } = await serviceSupabase
        .from('users')
        .select('id, first_name, last_name, email, phone, category, assigned_staff_id, assigned_staff_ids, preferred_location_id, role, is_active, onboarding_status')
        .eq('role', 'client') // Only clients, not staff
        .eq('tenant_id', tenantId)
        .eq('assigned_staff_id', userId)
        .or('is_active.eq.true,onboarding_status.eq.pending')
        .order('first_name')

      if (oldError) throw oldError

      logger.debug('🔍 Old-style assigned students loaded:', oldAssignedStudents?.length || 0)

      // ✅ For new-style assigned_staff_ids (array), we need to load ALL active students
      // and filter server-side because Supabase array contains is complex
      // Load students with assigned_staff_ids regardless of is_active status
      const { data: allStudents, error: allError } = await serviceSupabase
        .from('users')
        .select('id, first_name, last_name, email, phone, category, assigned_staff_id, assigned_staff_ids, preferred_location_id, role, is_active, onboarding_status')
        .eq('role', 'client')
        .eq('tenant_id', tenantId)
        .not('assigned_staff_ids', 'is', null)
        .order('first_name')

      if (allError) throw allError

      // ✅ Server-side filter: only students where userId is in assigned_staff_ids
      const newAssignedStudents = (allStudents || []).filter(student => 
        Array.isArray(student.assigned_staff_ids) && student.assigned_staff_ids.includes(userId)
      )

      logger.debug('🔍 New-style assigned students loaded:', newAssignedStudents?.length || 0)

      // ✅ Combine both old and new assignments
      const assignedStudents = [...(oldAssignedStudents || []), ...(newAssignedStudents || [])]
      const uniqueStudents = Object.values(
        assignedStudents.reduce((acc: Record<string, any>, student: any) => {
          acc[student.id] = student
          return acc
        }, {})
      )

      logger.debug('🔍 Total assigned students (deduplicated):', uniqueStudents.length || 0)

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

      // Combine and deduplicate with appointment students
      const byId: Record<string, any> = {}

      // First: students from assignment (new and old style)
      for (const student of uniqueStudents || []) {
        byId[student.id] = student
      }

      // Then: add students from appointment history (fallback if not assigned)
      // But exclude the staff member themselves
      if (appointmentStudents) {
        for (const apt of appointmentStudents) {
          if (apt.users && !byId[apt.users.id] && apt.users.id !== userId) { // ✅ Exclude staff member
            byId[apt.users.id] = apt.users
          }
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

