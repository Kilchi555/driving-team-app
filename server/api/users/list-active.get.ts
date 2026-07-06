import { defineEventHandler, createError, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

// Safe columns returned to staff/admin — no auth tokens, no onboarding secrets, no PII beyond what staff needs
const SAFE_COLUMNS = 'id, first_name, last_name, email, phone, role, is_active, category, tenant_id, created_at'

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
    .maybeSingle()

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
