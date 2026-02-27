// server/api/website/pages/[[slug]].put.ts
// Update website page

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { slug } = getRouterParams(event)
  const body = await readBody(event)

  const supabase = getSupabaseAdmin()

  // Get website
  const { data: website } = await supabase
    .from('website_tenants')
    .select('id')
    .eq('tenant_id', user.tenant_id)
    .single()

  if (!website) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Website not found'
    })
  }

  // Update page
  const { data: page, error } = await supabase
    .from('website_pages')
    .update({
      title: body.title,
      seo_title: body.seo_title,
      seo_description: body.seo_description,
      seo_keywords: body.seo_keywords,
      og_image: body.og_image,
      blocks: body.blocks || [],
      updated_at: new Date().toISOString()
    })
    .eq('website_id', website.id)
    .eq('slug', slug)
    .select()
    .single()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  return {
    success: true,
    page
  }
})
