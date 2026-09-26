// POST /api/website/preview-link
// Mints a draft preview URL for the signed-in user's own tenant.
// Body tenant_id is ignored.

import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { issueWebsitePreviewToken, previewUrlForPath } from '~/server/utils/website-preview-access'

function appBaseUrl(event: any) {
  const fromEnv = process.env.NUXT_PUBLIC_APP_URL || process.env.NUXT_PUBLIC_BASE_URL || process.env.APP_BASE_URL
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  const host = getRequestHeader(event, 'x-forwarded-host') || getRequestHeader(event, 'host')
  const proto = getRequestHeader(event, 'x-forwarded-proto') || 'https'
  return host ? `${proto}://${String(host).split(',')[0]}` : 'https://app.simy.ch'
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

  const body = await readBody(event).catch(() => ({} as Record<string, unknown>))
  const slug = String((body as { slug?: unknown })?.slug || '').trim().toLowerCase()

  const { data: website } = await supabase
    .from('website_tenants')
    .select('id, subdomain')
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  if (!website?.id || !website.subdomain) {
    throw createError({ statusCode: 404, statusMessage: 'Website not found' })
  }

  const issued = await issueWebsitePreviewToken(supabase, website.id)
  if (!issued) {
    throw createError({ statusCode: 503, statusMessage: 'Preview link unavailable' })
  }

  const path =
    slug && slug !== 'index'
      ? `/s/${encodeURIComponent(website.subdomain)}/${encodeURIComponent(slug)}`
      : `/s/${encodeURIComponent(website.subdomain)}`

  return {
    preview_url: previewUrlForPath(appBaseUrl(event), path, issued.token),
    expires_at: issued.expiresAt,
  }
})
