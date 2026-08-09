// POST /api/website/slots-save
// Merge-save only CR/SEO-safe slots into website_pages.blocks (home or add-on by slug)

import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { notifySuperadminsWebsitePublished } from '~/server/utils/website-publish-notify'
import {
  applySlotPatch,
  getSlotValues,
  isLandingPayload,
  WEBSITE_TEMPLATE_ID,
} from '~/utils/website-slot-schema'

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

  const body = await readBody(event)
  const slots = (body?.slots || {}) as Record<string, unknown>
  const publish = body?.publish === true
  const pageSlug = body?.slug ? String(body.slug).trim() : null
  const pageId = body?.page_id ? String(body.page_id).trim() : null

  if (!slots || typeof slots !== 'object' || Array.isArray(slots)) {
    throw createError({ statusCode: 400, statusMessage: 'slots object required' })
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

  let pageQuery = supabase.from('website_pages').select('*').eq('website_id', website.id)
  if (pageId) pageQuery = pageQuery.eq('id', pageId)
  else if (pageSlug) pageQuery = pageQuery.eq('slug', pageSlug)
  else pageQuery = pageQuery.eq('is_home', true)

  const { data: page } = await pageQuery.maybeSingle()

  if (!page || !isLandingPayload(page.blocks)) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Page payload missing — bitte zuerst Wizard / Generate ausführen',
    })
  }

  const isHome = !!page.is_home || page.page_type === 'home'
  if (!isHome && !website.addon_pages_enabled) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Add-on-Seiten sind nicht freigeschaltet',
    })
  }

  let applied: string[] = []
  let nextPayload
  try {
    const result = applySlotPatch(page.blocks, slots)
    nextPayload = result.payload
    applied = result.applied
  } catch (err: any) {
    throw createError({
      statusCode: err?.statusCode || 400,
      statusMessage: err?.message || 'Slot-Patch ungültig',
    })
  }

  if (isHome) {
    ;(nextPayload as any).templateId = WEBSITE_TEMPLATE_ID
  } else if (!(nextPayload as any).templateId) {
    ;(nextPayload as any).templateId = `${page.page_type || 'addon'}@v1`
  }

  const now = new Date().toISOString()
  const { error: pageError } = await supabase
    .from('website_pages')
    .update({
      blocks: nextPayload,
      seo_title: nextPayload.seo.title,
      seo_description: nextPayload.seo.description,
      seo_keywords: nextPayload.seo.keywords,
      is_published: publish ? true : page.is_published,
      published_at: publish ? now : page.published_at,
      updated_at: now,
    })
    .eq('id', page.id)

  if (pageError) {
    throw createError({ statusCode: 500, statusMessage: pageError.message })
  }

  // Sync brand/SEO to website_tenants only for home page
  if (isHome) {
    const websiteUpdate: Record<string, any> = {
      seo_title: nextPayload.seo.title,
      seo_description: nextPayload.seo.description,
      seo_keywords: nextPayload.seo.keywords,
      primary_color: nextPayload.brand.primary,
      secondary_color: nextPayload.brand.secondary,
      accent_color: nextPayload.brand.accent,
      logo_url: nextPayload.brand.logo_url,
      hero_image_url: nextPayload.brand.hero_image_url,
      updated_at: now,
    }
    if (publish) {
      websiteUpdate.is_published = true
      websiteUpdate.last_published_at = now
    }
    await supabase.from('website_tenants').update(websiteUpdate).eq('id', website.id)
  } else if (publish && !website.is_published) {
    // Publishing an add-on implies site is live
    await supabase
      .from('website_tenants')
      .update({ is_published: true, last_published_at: now, updated_at: now })
      .eq('id', website.id)
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, slug')
    .eq('id', user.tenant_id)
    .maybeSingle()

  const base = appBaseUrl(event)
  const path =
    isHome || page.slug === 'index'
      ? `/s/${encodeURIComponent(website.subdomain)}`
      : `/s/${encodeURIComponent(website.subdomain)}/${encodeURIComponent(page.slug)}`
  const previewUrl = `${base}${path}?preview=1`
  const liveUrl =
    website.custom_domain_verified && website.custom_domain
      ? isHome || page.slug === 'index'
        ? `https://${website.custom_domain}`
        : `https://${website.custom_domain}/${encodeURIComponent(page.slug)}`
      : `${base}${path}`

  if (publish) {
    await supabase.from('tenants').update({ website_status: 'live' }).eq('id', user.tenant_id)
    await notifySuperadminsWebsitePublished({
      tenantId: user.tenant_id,
      tenantName: `${tenant?.name || website.subdomain}${isHome ? '' : ` — ${page.title}`}`,
      tenantSlug: tenant?.slug || website.subdomain,
      subdomain: website.subdomain,
      liveUrl,
      previewUrl,
    })
  }

  return {
    success: true,
    templateId: (nextPayload as any).templateId || WEBSITE_TEMPLATE_ID,
    page_id: page.id,
    slug: page.slug,
    page_type: page.page_type || (isHome ? 'home' : 'addon'),
    applied,
    slots: getSlotValues(nextPayload),
    landing: nextPayload,
    published: publish || !!page.is_published,
    preview_url: previewUrl,
    live_url: liveUrl,
  }
})
