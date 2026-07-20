import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

  // Bearer header with HTTP-only-cookie fallback + token refresh, instead of
  // a raw Bearer-only check that would 401 whenever the client's access
  // token had just expired.
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // User profile and permissions (already resolved by getAuthenticatedUser)
  const userProfile = authUser.db_user_id
    ? { id: authUser.db_user_id, tenant_id: authUser.tenant_id, role: authUser.role }
    : null

  if (!userProfile) {
    throw createError({ statusCode: 403, message: 'User profile not found' })
  }

  // Only admins/staff can reactivate users
  if (!['admin', 'staff'].includes(userProfile.role)) {
    throw createError({ statusCode: 403, message: 'Insufficient permissions' })
  }

  // Read body
  const body = await readBody(event)
  const { user_id } = body

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
      message: 'Cannot reactivate user from different tenant'
    })
  }

  // Reactivate user
  const { error: updateError } = await supabase
    .from('users')
    .update({
      is_active: true,
      deleted_at: null,
      deletion_reason: null
    })
    .eq('id', user_id)

  if (updateError) {
    console.error('Error reactivating user:', updateError)
    throw createError({
      statusCode: 500,
      message: 'Failed to reactivate user'
    })
  }

  return {
    success: true,
    message: 'User reactivated successfully'
  }
})
