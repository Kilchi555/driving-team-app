import { defineEventHandler, getQuery, createError, getHeader } from 'h3'
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

  // Get current user's profile for tenant context
  const { data: currentUserProfile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('auth_user_id', authUser.id)
    .single()

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
  const { data: targetUser, error: targetError } = await supabase
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
