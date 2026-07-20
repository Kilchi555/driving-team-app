import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthenticatedUser } from '~/server/utils/auth'

const SAFE_COLUMNS = 'id, first_name, last_name, email, phone, role, is_active, category, tenant_id, created_at, updated_at'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

  // Bearer header with HTTP-only-cookie fallback + token refresh, instead of
  // a raw Bearer-only check that would 401 whenever the client's access
  // token had just expired.
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const userProfile = authUser.db_user_id
    ? { id: authUser.db_user_id, tenant_id: authUser.tenant_id, role: authUser.role }
    : null

  if (!userProfile) {
    throw createError({ statusCode: 403, message: 'User profile not found' })
  }

  const query = getQuery(event)
  const { user_id } = query

  if (!user_id) {
    throw createError({ statusCode: 400, message: 'Missing required parameter: user_id' })
  }

  // Students may only fetch their own profile
  const isStaffOrAdmin = ['admin', 'tenant_admin', 'staff'].includes(userProfile.role)
  if (!isStaffOrAdmin && user_id !== userProfile.id) {
    throw createError({ statusCode: 403, message: 'Insufficient permissions' })
  }

  const { data: user, error } = await supabase
    .from('users')
    .select(SAFE_COLUMNS)
    .eq('id', user_id)
    .eq('tenant_id', userProfile.tenant_id)
    .single()

  if (error || !user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  return {
    success: true,
    data: user
  }
})
