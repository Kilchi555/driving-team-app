// POST /api/tenant-admin/websites/:id/preview-link
// :id is the tenant id. Superadmin only. Token is bound to that tenant's website.

import { requireSuperAdmin } from '~/server/utils/require-super-admin'
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
  await requireSuperAdmin(event)
  const tenantId = String(getRouterParam(event, 'id') || '').trim()
  if (!tenantId) {
    throw createError({ statusCode: 400, statusMessage: 'tenant id required' })
  }

  const body = await readBody(event).catch(() => ({} as Record<string, unknown>))
  const slug = String((body as { slug?: unknown })?.slug || '').trim().toLowerCase()
  const supabase = getSupabaseAdmin()

  const { data: website } = await supabase
    .from('website_tenants')
    .select('id, subdomain, tenant_id')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!website?.id || !website.subdomain || website.tenant_id !== tenantId) {
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
