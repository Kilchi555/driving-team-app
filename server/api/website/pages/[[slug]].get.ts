// server/api/website/pages/[[slug]].get.ts
// Fetch website page data

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { slug } = getRouterParams(event)

  const supabase = getSupabaseAdmin()

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
