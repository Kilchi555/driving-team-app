import { defineEventHandler, getQuery, createError, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'

const SAFE_COLUMNS = 'id, first_name, last_name, email, phone, role, is_active, category, tenant_id, created_at, updated_at'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Missing or invalid authorization header' })
  }

  const token = authHeader.replace('Bearer ', '')

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const { data: userProfile } = await supabase
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

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
