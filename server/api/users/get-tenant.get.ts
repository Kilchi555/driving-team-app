import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  // Bearer header with HTTP-only-cookie fallback + token refresh, instead of
  // a raw Bearer-only check that would 401 whenever the client's access
  // token had just expired.
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Use admin client to bypass RLS for the target users table lookup
  const adminSupabase = getSupabaseAdmin()

  // Current user's tenant context (already resolved by getAuthenticatedUser)
  const currentUserProfile = authUser.db_user_id
    ? { tenant_id: authUser.tenant_id }
    : null

  if (!currentUserProfile) {
    throw createError({ statusCode: 403, message: 'Current user profile not found' })
  }

  // Get query parameters
  const query = getQuery(event)
  const { user_id } = query

  if (!user_id) {
    throw createError({
      statusCode: 400,
      message: 'Missing required parameter: user_id'
    })
  }

  // Get target user's tenant (ensure same tenant access)
  const { data: targetUser, error: targetError } = await adminSupabase
    .from('users')
    .select('id, tenant_id, first_name, last_name, email, role')
    .eq('id', user_id)
    .eq('tenant_id', currentUserProfile.tenant_id)
    .single()

  if (targetError || !targetUser) {
    throw createError({
      statusCode: 404,
      message: 'User not found in your tenant'
    })
  }

  return {
    success: true,
    data: targetUser
  }
})
