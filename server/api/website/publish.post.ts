// server/api/website/publish.post.ts
// Publish website landing page (SSR on /s/[subdomain])

import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { notifySuperadminsWebsitePublished } from '~/server/utils/website-publish-notify'

function appBaseUrl(event: any) {
  const fromEnv = process.env.NUXT_PUBLIC_APP_URL || process.env.NUXT_PUBLIC_BASE_URL || process.env.APP_BASE_URL
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  const host = getRequestHeader(event, 'x-forwarded-host') || getRequestHeader(event, 'host')
  const proto = getRequestHeader(event, 'x-forwarded-proto') || 'https'
  return host ? `${proto}://${host}` : 'https://app.simy.ch'
}

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
    .select('*')
    .eq('tenant_id', user.tenant_id)
    .single()

  if (!website) {
    throw createError({ statusCode: 404, statusMessage: 'Website not found' })
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, slug')
    .eq('id', user.tenant_id)
    .maybeSingle()

  const now = new Date().toISOString()

  await supabase
    .from('website_pages')
    .update({ is_published: true, published_at: now })
    .eq('website_id', website.id)

  const { data: updatedWebsite, error } = await supabase
    .from('website_tenants')
    .update({
      is_published: true,
      last_published_at: now,
    })
    .eq('id', website.id)
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  await supabase
    .from('tenants')
    .update({ website_status: 'live' })
    .eq('id', user.tenant_id)

  const base = appBaseUrl(event)
  const liveUrl =
    website.custom_domain_verified && website.custom_domain
      ? `https://${website.custom_domain}`
      : `${base}/s/${encodeURIComponent(website.subdomain)}`
  const previewUrl = `${base}/s/${encodeURIComponent(website.subdomain)}?preview=1`

  await notifySuperadminsWebsitePublished({
    tenantId: user.tenant_id,
    tenantName: tenant?.name || website.subdomain,
    tenantSlug: tenant?.slug || website.subdomain,
    subdomain: website.subdomain,
    liveUrl,
    previewUrl,
  })

  return {
    success: true,
    website: updatedWebsite,
    message: 'Website published successfully',
    live_url: liveUrl,
    preview_url: previewUrl,
  }
})
