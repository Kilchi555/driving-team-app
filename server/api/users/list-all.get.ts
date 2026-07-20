import { defineEventHandler, createError } from 'h3'
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

  // User profile (already resolved by getAuthenticatedUser)
  const userProfile = authUser.db_user_id
    ? { id: authUser.db_user_id, tenant_id: authUser.tenant_id, role: authUser.role }
    : null

  if (!userProfile) {
    throw createError({ statusCode: 403, message: 'User profile not found' })
  }

  // Only admins can see all users
  if (userProfile.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Only admins can view all users' })
  }

  // Fetch all users (including inactive) for this tenant
  const { data: users, error } = await supabase
    .from('users')
    .select('*, deleted_at')
    .eq('tenant_id', userProfile.tenant_id)
    .order('is_active', { ascending: false })
    .order('last_name')
    .order('first_name')

  if (error) {
    console.error('Error fetching all users:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch all users'
    })
  }

  return {
    success: true,
    data: users || []
  }
})
