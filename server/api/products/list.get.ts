import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

  // Auth is optional for products — but still resolve it via the shared
  // helper (Bearer header + HTTP-only-cookie fallback + refresh) instead of
  // a raw Bearer-only check, so a logged-in user with an expired-but-
  // refreshable token still gets tenant-scoped results instead of silently
  // falling back to the "no tenant" branch below.
  const authUser = await getAuthenticatedUser(event)
  const userProfile = authUser?.db_user_id
    ? { id: authUser.db_user_id, tenant_id: authUser.tenant_id }
    : null

  // Get query parameters
  const query = getQuery(event)
  const { category } = query

  // Build query
  let q = supabase
    .from('products')
    .select('*')
    .eq('is_active', true)

  if (category && category !== 'all') {
    q = q.eq('category', category)
  }

  // If user has tenant, filter by tenant
  if (userProfile?.tenant_id) {
    q = q.eq('tenant_id', userProfile.tenant_id)
  }

  const { data: products, error } = await q

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
