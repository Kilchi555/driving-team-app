// server/api/website/publish.post.ts
// Publish website landing page (SSR on /s/[subdomain])

import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

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

  const base = appBaseUrl(event)
  const liveUrl = website.custom_domain_verified && website.custom_domain
    ? `https://${website.custom_domain}`
    : website.custom_domain
      ? `https://${website.custom_domain}`
      : `${base}/s/${encodeURIComponent(website.subdomain)}`

  return {
    success: true,
    website: updatedWebsite,
    message: 'Website published successfully',
    live_url: liveUrl,
    preview_url: `${base}/s/${encodeURIComponent(website.subdomain)}?preview=1`,
  }
})
