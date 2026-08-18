import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
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

  const { data: tenant } = await supabase.from('tenants').select('*').eq('id', user.tenant_id).single()
  if (!tenant) {
    throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })
  }

  let { data: website } = await supabase
    .from('website_tenants')
    .select('*')
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  if (!website) {
    const { data: created, error } = await supabase
      .from('website_tenants')
      .insert({
        tenant_id: user.tenant_id,
        subdomain: (tenant.slug || tenant.id.slice(0, 8)).toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        primary_color: tenant.primary_color || '#0F766E',
        secondary_color: tenant.secondary_color || '#134E4A',
        accent_color: tenant.accent_color || '#F59E0B',
        logo_url: tenant.logo_url || tenant.logo_square_url || null,
        favicon_url: tenant.logo_square_url || tenant.logo_url || null,
      })
      .select()
      .single()
    if (error || !created) {
      throw createError({ statusCode: 500, statusMessage: error?.message || 'Website anlegen fehlgeschlagen' })
    }
    website = created
  }

  const page = await ensureWebsiteHomeLanding(supabase, {
    tenant,
    website,
    baseUrl: appBaseUrl(event),
  })

  return { success: true, website, page }
})
