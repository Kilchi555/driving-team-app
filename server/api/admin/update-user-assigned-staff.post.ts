import { defineEventHandler, createError, readBody, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { checkRateLimit } from '~/server/utils/rate-limiter'

export default defineEventHandler(async (event) => {
  // Get client IP for rate limiting
  const ipAddress = getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() || 
                    getHeader(event, 'x-real-ip') || 
                    event.node.req.socket.remoteAddress || 
                    'unknown'
  
  // Apply rate limiting: 100 requests per minute per IP (this is a staff operation)
  const rateLimit = await checkRateLimit(ipAddress, 'register', 100, 60 * 1000)
  if (!rateLimit.allowed) {
    logger.warn('🚫 Rate limit exceeded for update-user-assigned-staff from IP:', ipAddress)
    throw createError({
      statusCode: 429,
      statusMessage: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.'
    })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    logger.error('❌ Supabase credentials not configured for update-user-assigned-staff API')
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

    const body = await readBody(event)
    const { userId, staffId } = body

    if (!userId || !staffId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request: userId and staffId are required'
      })
    }

    // Get the user's profile to ensure they have permission
    const { data: currentUserProfile, error: currentUserProfileError } = await serviceSupabase
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (currentUserProfileError || !currentUserProfile) {
      logger.warn(`⚠️ Current user profile not found for auth_user_id: ${authUser.id}`)
      throw createError({ statusCode: 404, statusMessage: 'Current user profile not found' })
    }

    // Check permissions
    if (!['staff', 'admin', 'tenant_admin', 'super_admin'].includes(currentUserProfile.role)) {
      logger.warn(`🚫 User ${authUser.id} with role ${currentUserProfile.role} attempted to update assigned staff.`)
      throw createError({ statusCode: 403, statusMessage: 'Forbidden: Insufficient permissions' })
    }

    // Get target user
    const { data: targetUser, error: targetUserError } = await serviceSupabase
      .from('users')
      .select('id, assigned_staff_ids, tenant_id')
      .eq('id', userId)
      .single()

    if (targetUserError || !targetUser) {
      logger.warn(`⚠️ Target user not found for user_id: ${userId}`)
      throw createError({ statusCode: 404, statusMessage: 'Target user not found' })
    }

    // Verify same tenant (unless super_admin)
    if (currentUserProfile.role !== 'super_admin') {
      if (currentUserProfile.tenant_id !== targetUser.tenant_id) {
        logger.warn(`🚫 User ${authUser.id} (tenant: ${currentUserProfile.tenant_id}) attempted to update user ${userId} (tenant: ${targetUser.tenant_id}) in different tenant.`)
        throw createError({ statusCode: 403, statusMessage: 'Forbidden: Cannot update users outside your tenant' })
      }
    }

    // Get staff member to verify it exists
    const { data: staffMember, error: staffError } = await serviceSupabase
      .from('users')
      .select('id, role')
      .eq('id', staffId)
      .single()

    if (staffError || !staffMember || staffMember.role !== 'staff') {
      logger.warn(`⚠️ Staff member not found or invalid for staff_id: ${staffId}`)
      throw createError({ statusCode: 404, statusMessage: 'Staff member not found' })
    }

    // Update assigned_staff_ids
    const currentStaffIds = targetUser.assigned_staff_ids || []
    let updatedStaffIds = [...currentStaffIds]

    if (!updatedStaffIds.includes(staffId)) {
      updatedStaffIds.push(staffId)
    }

    const { error: updateError } = await serviceSupabase
      .from('users')
      .update({ assigned_staff_ids: updatedStaffIds })
      .eq('id', userId)

    if (updateError) {
      logger.error(`❌ Error updating assigned_staff_ids for user ${userId}:`, updateError)
      throw createError({ statusCode: 500, statusMessage: 'Failed to update assigned staff' })
    }

    logger.info(`✅ Staff ${staffId} added to user ${userId}'s assigned_staff_ids by ${authUser.id}`)
    return { success: true, assigned_staff_ids: updatedStaffIds }

  } catch (error: any) {
    logger.error('❌ Error in update-user-assigned-staff API:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})

