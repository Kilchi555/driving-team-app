import { defineEventHandler, createError, getQuery } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getFilteredStudents } from '~/server/utils/get-filtered-students'

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
    const showInactive = query.showInactive === 'true'

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

    if (!['staff', 'admin', 'tenant_admin', 'super_admin'].includes(userProfile.role)) {
      logger.warn(`🚫 User ${authUser.id} with role ${userProfile.role} attempted to access students list.`)
      throw createError({ statusCode: 403, statusMessage: 'Forbidden: Insufficient permissions' })
    }

    const tenantId = userProfile.tenant_id
    const userId = userProfile.id
    const userRole = userProfile.role

    logger.debug(`🔍 Fetching students for user ${userId} with role ${userRole} in tenant ${tenantId} (showAllStudents=${showAllStudents}, showInactive=${showInactive})`)

    const students = await getFilteredStudents(serviceSupabase, {
      tenantId,
      userId,
      userRole,
      showAllStudents,
      showInactive
    })

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
