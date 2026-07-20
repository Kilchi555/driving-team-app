import { defineEventHandler, createError } from 'h3'
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
