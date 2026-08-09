// GET /api/website/addon/pages — list add-on pages for current tenant

import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()
  const { data: user } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!user?.tenant_id) {
    throw createError({ statusCode: 404, statusMessage: 'User or tenant not found' })
  }

  const { data: website } = await supabase
    .from('website_tenants')
    .select('id, subdomain, addon_pages_enabled, is_published')
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  if (!website) {
    return { success: true, enabled: false, pages: [], website: null }
  }

  const { data: pages } = await supabase
    .from('website_pages')
    .select('id, title, slug, page_type, is_home, is_published, seo_title, updated_at, published_at')
    .eq('website_id', website.id)
    .neq('page_type', 'home')
    .order('updated_at', { ascending: false })

  return {
    success: true,
    enabled: !!website.addon_pages_enabled,
    website: {
      id: website.id,
      subdomain: website.subdomain,
      is_published: website.is_published,
    },
    pages: pages || [],
  }
})
