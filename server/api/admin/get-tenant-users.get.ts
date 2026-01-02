import { defineEventHandler, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    logger.error('❌ Supabase credentials not configured')
    throw createError({
      statusCode: 500,
      statusMessage: 'Server configuration error'
    })
  }

  const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    // Get authenticated user from Authorization header
    const authHeader = event.node.req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError({ statusCode: 401, statusMessage: 'Missing authorization header' })
    }

    const token = authHeader.substring(7)
    
    // Verify token and get user
    const { data: { user: authUser }, error: authError } = await serviceSupabase.auth.getUser(token)
    
    if (authError || !authUser) {
      logger.warn(`⚠️ Invalid token: ${authError?.message}`)
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    // Get current user's profile to check role and tenant
    const { data: currentUserProfile, error: currentUserError } = await serviceSupabase
      .from('users')
      .select('id, tenant_id, role, is_active')
      .eq('auth_user_id', authUser.id)
      .single()

    if (currentUserError || !currentUserProfile) {
      logger.warn(`⚠️ User profile not found for auth_user_id: ${authUser.id}`)
      throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
    }

    // Check if user has permission (staff, admin, tenant_admin, or super_admin)
    if (!['staff', 'admin', 'tenant_admin', 'super_admin'].includes(currentUserProfile.role)) {
      logger.warn(`🚫 User ${authUser.id} with role ${currentUserProfile.role} attempted to access tenant users.`)
      throw createError({ statusCode: 403, statusMessage: 'Forbidden: Insufficient permissions' })
    }

    // For super_admin: return all users
    if (currentUserProfile.role === 'super_admin') {
      const { data: allUsers, error: allUsersError } = await serviceSupabase
        .from('users')
        .select('*')
        .is('deleted_at', null)
        .order('last_name', { ascending: true })

      if (allUsersError) {
        logger.error('❌ Error fetching all users:', allUsersError)
        throw createError({ statusCode: 500, statusMessage: 'Failed to fetch users' })
      }

      return { success: true, data: allUsers }
    }

    // For admin/staff/tenant_admin: return only their tenant users
    if (!currentUserProfile.tenant_id) {
      logger.warn(`⚠️ User ${authUser.id} has role but no tenant_id`)
      throw createError({ statusCode: 400, statusMessage: 'User not assigned to a tenant' })
    }

    const { data: tenantUsers, error: tenantUsersError } = await serviceSupabase
      .from('users')
      .select('*')
      .eq('tenant_id', currentUserProfile.tenant_id)
      .is('deleted_at', null)
      .order('last_name', { ascending: true })

    if (tenantUsersError) {
      logger.error(`❌ Error fetching tenant users:`, tenantUsersError)
      throw createError({ statusCode: 500, statusMessage: 'Failed to fetch users' })
    }

    return { success: true, data: tenantUsers }

  } catch (error: any) {
    logger.error('❌ Error in get-tenant-users API:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})
