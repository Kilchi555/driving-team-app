import { defineEventHandler, getQuery, createError, getHeader } from 'h3'
import { getSupabase } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  const supabase = getSupabase()

  // Get auth token from headers (optional for products)
  const authHeader = getHeader(event, 'authorization')
  let userProfile: any = null

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: authUser } } = await supabase.auth.getUser(token)
    
    if (authUser) {
      const { data: profile } = await supabase
        .from('users')
        .select('id, tenant_id')
        .eq('auth_user_id', authUser.id)
        .single()
      userProfile = profile
    }
  }

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
