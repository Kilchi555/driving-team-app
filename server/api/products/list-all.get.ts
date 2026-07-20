import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

  // Get authenticated user — Bearer header with HTTP-only-cookie fallback +
  // token refresh, instead of a raw Bearer-only check that would 401 whenever
  // the client's access token had just expired.
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // User profile already resolved by getAuthenticatedUser
  const userProfile = authUser.db_user_id
    ? { id: authUser.db_user_id, tenant_id: authUser.tenant_id }
    : null

  if (!userProfile) {
    throw createError({ statusCode: 403, message: 'User profile not found' })
  }

  // Fetch active products for tenant
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .eq('tenant_id', userProfile.tenant_id)
    .order('display_order')
    .order('name')

  if (error) {
    console.error('Error fetching products:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch products'
    })
  }

  return {
    success: true,
    data: products || []
  }
})
