import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

// Safe columns returned to staff/admin — no auth tokens, no onboarding secrets, no PII beyond what staff needs
const SAFE_COLUMNS = 'id, first_name, last_name, email, phone, role, is_active, category, tenant_id, created_at'

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

  // Only staff and admins may list all users — students have no legitimate reason
  if (!['admin', 'tenant_admin', 'staff'].includes(userProfile.role)) {
    throw createError({ statusCode: 403, message: 'Insufficient permissions' })
  }

  const { data: users, error } = await supabase
    .from('users')
    .select(SAFE_COLUMNS)
    .eq('is_active', true)
    .eq('tenant_id', userProfile.tenant_id)
    .order('last_name')
    .order('first_name')

  if (error) {
    console.error('Error fetching active users:', error)
    throw createError({ statusCode: 500, message: 'Failed to fetch active users' })
  }

  return {
    success: true,
    data: users || []
  }
})
