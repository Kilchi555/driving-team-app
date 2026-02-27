// server/api/website/pages/[[slug]].get.ts
// Fetch website page data

import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const { slug } = getRouterParams(event)
  const supabase = getSupabaseAdmin()

  // Get user profile to get tenant_id
  const { data: user } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!user?.tenant_id) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User or tenant not found'
    })
  }

  // Get website
  const { data: website } = await supabase
    .from('website_tenants')
    .select('*')
    .eq('tenant_id', user.tenant_id)
    .single()

  if (!website) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Website not found'
    })
  }

  // Get page
  const { data: page, error } = await supabase
    .from('website_pages')
    .select('*')
    .eq('website_id', website.id)
    .eq('slug', slug || 'index')
    .single()

  if (error || !page) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Page not found'
    })
  }

  return {
    success: true,
    page,
    website
  }
})
