// server/api/website/init.post.ts
// Initialize website for a tenant

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const supabase = getSupabaseAdmin()

  // Check if website already exists
  const { data: existing } = await supabase
    .from('website_tenants')
    .select('id')
    .eq('tenant_id', user.tenant_id)
    .single()

  if (existing) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Website already initialized for this tenant'
    })
  }

  // Generate subdomain
  const subdomain = `${user.tenant_id.slice(0, 8)}-${Date.now().toString(36)}`

  // Create website tenant
  const { data: website, error: websiteError } = await supabase
    .from('website_tenants')
    .insert({
      tenant_id: user.tenant_id,
      subdomain,
      primary_color: '#2563eb',
      secondary_color: '#ffffff',
      accent_color: '#f59e0b'
    })
    .select()
    .single()

  if (websiteError) {
    throw createError({
      statusCode: 500,
      statusMessage: websiteError.message
    })
  }

  // Create home page
  const { error: pageError } = await supabase
    .from('website_pages')
    .insert({
      website_id: website.id,
      title: 'Home',
      slug: 'index',
      is_home: true,
      blocks: []
    })

  if (pageError) {
    throw createError({
      statusCode: 500,
      statusMessage: pageError.message
    })
  }

  return {
    success: true,
    website,
    subdomain,
    message: 'Website initialized successfully'
  }
})
