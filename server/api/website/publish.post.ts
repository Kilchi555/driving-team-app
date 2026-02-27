// server/api/website/publish.post.ts
// Publish website changes to Vercel

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
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

  // Mark all pages as published
  await supabase
    .from('website_pages')
    .update({ is_published: true, published_at: new Date().toISOString() })
    .eq('website_id', website.id)

  // Mark website as published
  const { data: updatedWebsite, error } = await supabase
    .from('website_tenants')
    .update({
      is_published: true,
      last_published_at: new Date().toISOString()
    })
    .eq('id', website.id)
    .select()
    .single()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  // TODO: Trigger Vercel deployment
  // For now, just return success

  return {
    success: true,
    website: updatedWebsite,
    message: 'Website published successfully',
    live_url: `https://${website.subdomain}.drivingteam.app`
  }
})
