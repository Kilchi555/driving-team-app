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
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('id, auth_user_id, tenant_id, first_name, last_name, email, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (profileError || !userProfile) {
    throw createError({
      statusCode: 404,
      message: 'User profile not found'
    })
  }

  return {
    success: true,
    data: userProfile
  }
})
