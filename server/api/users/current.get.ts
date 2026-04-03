import { defineEventHandler, createError, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

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

  // Use admin client to bypass RLS for the users table lookup
  const adminSupabase = getSupabaseAdmin()
  const { data: userProfile, error: profileError } = await adminSupabase
    .from('users')
    .select('id, auth_user_id, tenant_id, first_name, last_name, email, role, phone, street, street_number, zip, city')
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
