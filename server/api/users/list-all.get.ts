import { defineEventHandler, createError, getHeader } from 'h3'
import { getSupabase } from '~/utils/supabase'

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

  // Get user profile
  const { data: userProfile } = await supabase
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

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
