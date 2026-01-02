import { defineEventHandler, createError, readBody } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    logger.error('❌ Supabase credentials not configured')
    throw createError({ statusCode: 500, statusMessage: 'Server configuration error' })
  }

  const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    // Get authenticated user from Authorization header
    const authHeader = event.node.req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError({ statusCode: 401, statusMessage: 'Missing authorization header' })
    }

    const token = authHeader.substring(7)
    const { data: { user: authUser }, error: authError } = await serviceSupabase.auth.getUser(token)
    
    if (authError || !authUser) {
      logger.warn(`⚠️ Invalid token: ${authError?.message}`)
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    // Get request body (the updated user data)
    const body = await readBody(event)
    const { userId, ...updateData } = body

    if (!userId) {
      throw createError({ statusCode: 400, statusMessage: 'Missing userId' })
    }

    // Get current user's profile to check role and tenant
    const { data: currentUserProfile, error: currentUserError } = await serviceSupabase
      .from('users')
      .select('tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (currentUserError || !currentUserProfile) {
      logger.warn(`⚠️ User profile not found for auth_user_id: ${authUser.id}`)
      throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
    }

    // Check if user has permission (staff, admin, tenant_admin)
    if (!['staff', 'admin', 'tenant_admin'].includes(currentUserProfile.role)) {
      logger.warn(`🚫 User ${authUser.id} with role ${currentUserProfile.role} attempted to update users.`)
      throw createError({ statusCode: 403, statusMessage: 'Forbidden: Insufficient permissions' })
    }

    // Get the user being updated to verify they're in the same tenant
    const { data: targetUser, error: targetUserError } = await serviceSupabase
      .from('users')
      .select('tenant_id')
      .eq('id', userId)
      .single()

    if (targetUserError || !targetUser) {
      throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }

    // Verify same tenant
    if (targetUser.tenant_id !== currentUserProfile.tenant_id) {
      logger.warn(`🚫 User ${authUser.id} attempted to update user from different tenant`)
      throw createError({ statusCode: 403, statusMessage: 'Forbidden: User is in different tenant' })
    }

    // Update the user
    const { data: updatedUser, error: updateError } = await serviceSupabase
      .from('users')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      logger.error('❌ Error updating user:', updateError)
      throw createError({ statusCode: 500, statusMessage: 'Failed to update user' })
    }

    logger.debug(`✅ User ${userId} updated successfully by ${authUser.id}`)
    return { success: true, data: updatedUser }

  } catch (error: any) {
    logger.error('❌ Error in update-tenant-user API:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})

