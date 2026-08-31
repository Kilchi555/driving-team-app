// server/api/website/init.post.ts
// Initialize website for a tenant (idempotent if already exists)

import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { slugifySubdomain } from '~/server/utils/website-landing-builder'
import { ensureWebsiteHomeLanding } from '~/server/utils/website-ensure-home'

function appBaseUrl(event: any) {
  const fromEnv =
    process.env.NUXT_PUBLIC_APP_URL || process.env.NUXT_PUBLIC_BASE_URL || process.env.APP_BASE_URL
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

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', user.tenant_id)
    .single()

  const { data: existing } = await supabase
    .from('website_tenants')
    .select('*')
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  if (existing) {
    try {
      await ensureWebsiteHomeLanding(supabase, {
        tenant,
        website: existing,
        baseUrl: appBaseUrl(event),
      })
    } catch (err: any) {
      console.warn('[website-init] home seed skipped:', err?.message)
    }
    return {
      success: true,
      website: existing,
      subdomain: existing.subdomain,
      message: 'Website already initialized',
      existing: true,
    }
  }

  const baseSlug = slugifySubdomain(tenant?.slug || tenant?.name || user.tenant_id.slice(0, 8))
  let subdomain = baseSlug || user.tenant_id.slice(0, 8)
  // Ensure uniqueness
  const { data: clash } = await supabase
    .from('website_tenants')
    .select('id')
    .eq('subdomain', subdomain)
    .maybeSingle()
  if (clash) subdomain = `${subdomain}-${Date.now().toString(36).slice(-4)}`

  const { data: website, error: websiteError } = await supabase
    .from('website_tenants')
    .insert({
      tenant_id: user.tenant_id,
      subdomain,
      primary_color: tenant?.primary_color || '#0F766E',
      secondary_color: tenant?.secondary_color || '#134E4A',
      accent_color: tenant?.accent_color || '#F59E0B',
      logo_url: tenant?.logo_url || null,
    })
    .select()
    .single()

  if (websiteError) {
    throw createError({ statusCode: 500, statusMessage: websiteError.message })
  }

  try {
    await ensureWebsiteHomeLanding(supabase, {
      tenant,
      website,
      baseUrl: appBaseUrl(event),
    })
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: err?.message || 'Home-Seite anlegen fehlgeschlagen' })
  }

  return {
    success: true,
    website,
    subdomain,
    message: 'Website initialized successfully',
    existing: false,
  }
})
