// server/api/website/publish.post.ts
// Publish website landing page (SSR on /s/[subdomain])

import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  homepageHasContent,
  loadWebsiteHomePage,
  publishWebsiteForTenant,
  websitePublishBlockedMessage,
  websitePublishBlockedReason,
} from '~/server/utils/website-billing'

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
    .select('id, subdomain')
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  if (!website) {
    throw createError({ statusCode: 404, statusMessage: 'Website not found' })
  }

  const home = await loadWebsiteHomePage(supabase, website.id)
  if (!home || !homepageHasContent(home.blocks)) {
    throw createError({ statusCode: 400, statusMessage: 'Homepage ist noch nicht bereit' })
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('website_only, website_setup_paid_at, website_hosting_plan, trial_ends_at')
    .eq('id', user.tenant_id)
    .maybeSingle()

  const blocked = websitePublishBlockedReason(tenant)
  if (blocked) {
    throw createError({
      statusCode: 402,
      statusMessage: websitePublishBlockedMessage(blocked),
      data: { code: 'website_payment_required', reason: blocked },
    })
  }

  const published = await publishWebsiteForTenant(supabase, user.tenant_id, appBaseUrl(event))

  return {
    success: true,
    website: published.website,
    message: 'Website published successfully',
    live_url: published.liveUrl,
    preview_url: published.previewUrl,
  }
})
