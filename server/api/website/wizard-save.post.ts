// server/api/website/wizard-save.post.ts
// Build + save + optionally publish a high-converting tenant landing page

import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { buildLandingPage, type LandingService, type LandingTestimonial } from '~/server/utils/website-landing-builder'
import { loadWebsiteServices } from '~/server/utils/website-services'
import {
  extraProductsToLanding,
  extraServicesToLanding,
  normalizeExtraProducts,
  normalizeExtraServices,
  normalizeTeamMembers,
  normalizeUsps,
  websitePublishContentMissing,
} from '~/utils/website-wizard-content'
import { hasUsableGoogleReviews } from '~/utils/website-google-reviews'
import { loadWebsitePickupOffer } from '~/server/utils/website-pickup'
import { mapStaffToTeam } from '~/server/utils/website-premium'

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

  const body = await readBody(event)
  let publish = body?.publish !== false
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

  if (!tenant) {
    throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })
  }

  const { websitePublishBlockedReason } = await import('~/server/utils/website-billing')
  const publishBlock = publish ? websitePublishBlockedReason(tenant) : null
  if (publishBlock) {
    // Keep the draft; live requires checkout first.
    publish = false
  }

  let { data: website } = await supabase
    .from('website_tenants')
    .select('*')
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  if (!website) {
    const subdomain = (tenant.slug || tenant.id.slice(0, 8)).toLowerCase().replace(/[^a-z0-9-]/g, '-')
    const { data: created, error: websiteCreateError } = await supabase
      .from('website_tenants')
      .insert({
        tenant_id: user.tenant_id,
        subdomain,
        primary_color: tenant.primary_color || '#0F766E',
        secondary_color: tenant.secondary_color || '#134E4A',
        accent_color: tenant.accent_color || '#F59E0B',
        logo_url: tenant.logo_url || tenant.logo_square_url || null,
        favicon_url: tenant.logo_square_url || tenant.logo_url || null,
      })
      .select()
      .single()
    if (websiteCreateError || !created) {
      throw createError({ statusCode: 500, statusMessage: websiteCreateError?.message || 'Failed to create website' })
    }
    website = created

    await supabase.from('website_pages').insert({
      website_id: website.id,
      title: 'Home',
      slug: 'index',
      is_home: true,
      page_type: 'home',
      blocks: [],
    })
  }

  const { data: homePage } = await supabase
    .from('website_pages')
    .select('id')
    .eq('website_id', website.id)
    .eq('is_home', true)
    .maybeSingle()

  if (!homePage) {
    throw createError({ statusCode: 404, statusMessage: 'Home page not found' })
  }

  // Services: prefer wizard payload, else load pricing + categories
  let services: LandingService[] = []
  const serviceDescriptions: Record<string, string> = body.serviceDescriptions || {}

  if (Array.isArray(body.services) && body.services.length) {
    services = body.services.map((s: any) => ({
      id: String(s.id),
      name: s.name || s.category || 'Angebot',
      description: serviceDescriptions[s.id] || s.description || '',
      duration_minutes: s.duration_minutes,
      price_cents: s.price,
      category: s.category,
    }))
  } else {
    const pricing = await loadWebsiteServices(supabase, user.tenant_id)
    services = pricing.slice(0, 20).map((p) => ({
      id: String(p.id),
      name: p.name,
      description: serviceDescriptions[p.id] || '',
      duration_minutes: p.duration_minutes,
      price_cents: p.price,
      category: p.category,
    }))
  }

  const extraServices = normalizeExtraServices(body.extraServices || body.extra_services)
  const extraProducts = normalizeExtraProducts(body.extraProducts || body.extra_products)
  const extraIds = new Set(extraServices.map((s) => s.id))
  services = [
    ...services.filter((s) => !extraIds.has(s.id) && !String(s.id).startsWith('extra-')),
    ...extraServicesToLanding(extraServices).map((s) => ({
      ...s,
      description: serviceDescriptions[s.id] || s.description || '',
    })),
  ].slice(0, 12)

  const usps = normalizeUsps(body.usps)
  const teamMembers = normalizeTeamMembers(body.teamMembers || body.team)
  const meetingPoints: Array<{ id: string; name: string; address?: string }> = []

  // Testimonials: prefer explicit payload (manual wizard entries). No app-rating fallback.
  let testimonials: LandingTestimonial[] = []
  const selectedIds: string[] = Array.isArray(body.selectedTestimonials) ? body.selectedTestimonials : []
  let testimonialsSource: 'manual' | 'app' | 'google_or_app' = 'manual'

  if (Array.isArray(body.testimonials) && body.testimonials.length) {
    testimonials = body.testimonials
      .filter((t: any) => {
        if (!String(t?.text || t?.rating_text || '').trim()) return false
        if (!selectedIds.length) return true
        return selectedIds.includes(String(t.id))
      })
      .map((t: any) => ({
        id: String(t.id || `manual-${Math.random().toString(36).slice(2, 9)}`),
        author: String(t.author || 'Kunde').trim() || 'Kunde',
        text: String(t.text || t.rating_text || '').trim(),
        rating: Number(t.rating) || 5,
      }))
      .slice(0, 8)
    testimonialsSource = body.testimonials_source === 'app' ? 'app' : 'manual'
  }

  if (publish) {
    const missing = websitePublishContentMissing({
      name: body.name || tenant.name,
      bio: body.bio,
      address: body.address || tenant.address,
      phone: body.phone || tenant.contact_phone || tenant.phone,
      email: body.email || tenant.contact_email || tenant.email,
      seo_title: body.seo_title,
      seo_description: body.seo_description,
      specializations: Array.isArray(body.specializations) ? body.specializations : [],
      usps,
      dbServiceCount: services.filter((s) => !String(s.id).startsWith('extra-')).length,
      extraServices,
      hasGoogleReviews: hasUsableGoogleReviews(tenant.google_review_places, {
        subdomain: tenant.slug || website.subdomain,
        name: tenant.name,
      }),
      testimonials: testimonials.map((t) => ({ text: t.text, selected: true })),
      teamMembers,
    })
    if (missing.length) {
      throw createError({
        statusCode: 400,
        statusMessage: missing.join(' '),
      })
    }
  }

  const base = appBaseUrl(event)
  const slug = tenant.slug || website.subdomain
  const bookingUrl = `${base}/booking/availability/${encodeURIComponent(slug)}`
  // Canonical site URL: verified custom domain wins (schema + OG + absolute links)
  const siteUrl =
    website.custom_domain_verified && website.custom_domain
      ? `https://${String(website.custom_domain).replace(/\/$/, '')}`
      : `${base}/s/${encodeURIComponent(website.subdomain)}`

  const landing = buildLandingPage({
    tenant: {
      ...tenant,
      contact_email: body.email || tenant.contact_email,
      contact_phone: body.phone || tenant.contact_phone,
      address: body.address || tenant.address,
      city: tenant.invoice_city || tenant.city || null,
      invoice_city: tenant.invoice_city || null,
      postal_code: tenant.invoice_zip || tenant.postal_code || null,
      invoice_zip: tenant.invoice_zip || null,
      name: body.name || tenant.name,
      logo_url: body.logo_url || tenant.logo_url || tenant.logo_square_url || null,
      hero_image_url: body.hero_image_url || website.hero_image_url || null,
      primary_color: body.primary_color || tenant.primary_color,
      secondary_color: body.secondary_color || tenant.secondary_color,
      accent_color: body.accent_color || tenant.accent_color,
    },
    bio: body.bio,
    seo_title: body.seo_title,
    seo_description: body.seo_description,
    seo_keywords: body.seo_keywords,
    formal_address: body.formal_address === 'du' ? 'du' : 'sie',
    booking_policy: (tenant as any).booking_policy || null,
    hero_image_source:
      body.hero_image_source === 'stock' || body.hero_image_source === 'ai' || body.hero_image_source === 'own'
        ? body.hero_image_source
        : null,
    hero_attribution:
      body.hero_image_source === 'stock' && body.hero_attribution
        ? {
            photographer: body.hero_attribution.photographer || null,
            photographer_url: body.hero_attribution.photographer_url || null,
            unsplash_url: body.hero_attribution.unsplash_url || null,
          }
        : null,
    services,
    testimonials,
    testimonials_source: testimonialsSource,
    stats: body.stats || undefined,
    bookingUrl,
    siteUrl,
    hide_powered_by: true,
    contact_channels: body.contact_channels || undefined,
    usps,
    team: await (async () => {
      let liveById = new Map<string, ReturnType<typeof mapStaffToTeam>[number]>()
      try {
        const { data: staffRows } = await supabase
          .from('users')
          .select('id, first_name, last_name, role, language, category, profession, metadata, is_active')
          .eq('tenant_id', tenant.id)
          .eq('is_active', true)
          .in('role', ['staff', 'admin'])
          .limit(12)
        liveById = new Map(mapStaffToTeam(staffRows || [], tenant.business_type).map((m) => [m.id, m]))
      } catch {
        liveById = new Map()
      }
      return teamMembers
        .filter((m) => m.visible)
        .map((m) => {
          const live = liveById.get(m.id)
          return {
            id: m.id,
            name: m.name,
            role_label: m.role_label || live?.role_label || 'Team',
            languages: live?.languages || [],
            categories: live?.categories || [],
            photo_url: live?.photo_url || null,
          }
        })
    })(),
    meeting_points: meetingPoints.map((p) => ({
      id: p.id,
      name: p.name,
      address: p.address || '',
    })),
    pickup: (await loadWebsitePickupOffer(supabase, tenant.id)).enabled,
    products: extraProductsToLanding(extraProducts),
  })

  // Source of truth for the public renderer is website_pages.blocks (JSON payload).
  // website_content_blocks is legacy/unused by /s/[subdomain] — do not dual-write.

  const now = new Date().toISOString()
  const alreadyLive = !!(website.is_published || tenant.website_status === 'live')
  const stayPublished = publish || alreadyLive
  const pageUpdate: Record<string, unknown> = {
    title: 'Home',
    blocks: landing,
    seo_title: landing.seo.title,
    seo_description: landing.seo.description,
    seo_keywords: landing.seo.keywords,
    is_published: stayPublished,
    updated_at: now,
  }
  if (publish) pageUpdate.published_at = now
  else if (!alreadyLive) pageUpdate.published_at = null
  const { error: pageError } = await supabase
    .from('website_pages')
    .update(pageUpdate)
    .eq('id', homePage.id)

  if (pageError) {
    throw createError({ statusCode: 500, statusMessage: pageError.message })
  }

  const { error: websiteError } = await supabase
    .from('website_tenants')
    .update({
      seo_title: landing.seo.title,
      seo_description: landing.seo.description,
      seo_keywords: landing.seo.keywords,
      primary_color: landing.brand.primary,
      secondary_color: landing.brand.secondary,
      accent_color: landing.brand.accent,
      logo_url: landing.brand.logo_url,
      hero_image_url: landing.brand.hero_image_url,
      is_published: stayPublished,
      last_published_at: publish ? now : website.last_published_at,
      // Premium SKU: SEO add-on pages unlocked on publish
      ...(publish ? { addon_pages_enabled: true } : {}),
      // Draft fields are now in the published/saved page — clear scratchpad
      wizard_draft: {},
      updated_at: now,
    })
    .eq('id', website.id)

  if (websiteError) {
    throw createError({ statusCode: 500, statusMessage: websiteError.message })
  }

  if (landing.brand.primary) {
    const { applyTenantBrandColors } = await import('~/server/utils/apply-tenant-brand-colors')
    await applyTenantBrandColors(supabase, user.tenant_id, {
      primary: landing.brand.primary,
      secondary: landing.brand.secondary || landing.brand.primary,
      accent: landing.brand.accent || landing.brand.primary,
    }, {
      previousColors: [tenant.primary_color, tenant.secondary_color, tenant.accent_color],
    })
  }

  const previewUrl = `${siteUrl}?preview=1`
  const liveUrl =
    website.custom_domain_verified && website.custom_domain
      ? `https://${website.custom_domain}`
      : siteUrl

  if (publish) {
    await supabase
      .from('tenants')
      .update({ website_status: 'live' })
      .eq('id', user.tenant_id)

    try {
      const { ensureWebsiteSeoPages } = await import('~/server/utils/website-ensure-seo-pages')
      await ensureWebsiteSeoPages(supabase, {
        website: { ...website, addon_pages_enabled: true },
        tenant,
        baseUrl: appBaseUrl(event),
        publish: true,
      })
    } catch (err: any) {
      console.warn('[wizard-save] seo pages skipped:', err?.message)
    }

    const { notifySuperadminsWebsitePublished } = await import('~/server/utils/website-publish-notify')
    await notifySuperadminsWebsitePublished({
      tenantId: user.tenant_id,
      tenantName: tenant.name || website.subdomain,
      tenantSlug: tenant.slug || website.subdomain,
      subdomain: website.subdomain,
      liveUrl,
      previewUrl,
    })
  } else if (alreadyLive) {
    await supabase
      .from('tenants')
      .update({ website_status: 'live' })
      .eq('id', user.tenant_id)
  } else {
    await supabase
      .from('tenants')
      .update({ website_status: 'none' })
      .eq('id', user.tenant_id)
  }

  return {
    success: true,
    message: publish ? 'Website veröffentlicht' : alreadyLive ? 'Live-Seite aktualisiert' : 'Website gespeichert',
    website_id: website.id,
    subdomain: website.subdomain,
    preview_url: previewUrl,
    live_url: liveUrl,
    published: stayPublished,
    payment_required: publishBlock || null,
  }
})
