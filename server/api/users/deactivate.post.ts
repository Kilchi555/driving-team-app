import { defineEventHandler, createError, getHeader } from 'h3'
import { getSupabase } from '~/utils/supabase'
import { toLocalTimeString } from '~/utils/dateUtils'

export default defineEventHandler(async (event) => {
  const supabase = getSupabase()

  // Get auth token from headers
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Missing or invalid authorization header' })
  }

  const token = authHeader.replace('Bearer ', '')

  // Get current user
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Get user profile and check permissions
  const { data: userProfile } = await supabase
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!userProfile) {
    throw createError({ statusCode: 403, message: 'User profile not found' })
  }

  // Only admins/staff can deactivate users
  if (!['admin', 'staff'].includes(userProfile.role)) {
    throw createError({ statusCode: 403, message: 'Insufficient permissions' })
  }

  // Read body
  const body = await readBody(event)
  const { user_id, reason } = body

  if (!user_id) {
    throw createError({
      statusCode: 400,
      message: 'Missing required field: user_id'
    })
  }

  // Verify target user belongs to same tenant
  const { data: targetUser } = await supabase
    .from('users')
    .select('id, tenant_id')
    .eq('id', user_id)
    .single()

  if (!targetUser || targetUser.tenant_id !== userProfile.tenant_id) {
    throw createError({
      statusCode: 403,
      message: 'Cannot deactivate user from different tenant'
    })
  }

  // Deactivate user
  const { error: updateError } = await supabase
    .from('users')
    .update({
      is_active: false,
      deleted_at: toLocalTimeString(new Date()),
      deletion_reason: reason || 'Deaktiviert'
    })
    .eq('id', user_id)

  if (updateError) {
    console.error('Error deactivating user:', updateError)
    throw createError({
      statusCode: 500,
      message: 'Failed to deactivate user'
    })
  }

  return {
    success: true,
    message: 'User deactivated successfully'
  }
})
