import { randomUUID } from 'node:crypto'
import { SAAS_TRIAL_DAYS } from '~/utils/saas-trial'
import { WEBSITE_TEMPLATE_ID } from '~/utils/website-slot-schema'
import { getAppUrl } from '~/server/utils/app-url'
import { defaultVatRateForBusinessType } from '~/server/utils/invoice-vat'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { buildLandingPage, slugifySubdomain } from '~/server/utils/website-landing-builder'
import { buildProspectEmailDraft } from '~/server/utils/website-prospect-email'
import {
  applyProspectArchitecture,
  decideProspectArchitecture,
} from '~/server/utils/website-prospect-architecture'
import { ingestProspectMedia } from '~/server/utils/website-prospect-media'
import { fillProspectSectionPhotos } from '~/server/utils/website-prospect-stock'
import type { ProspectArchitecture, WebsiteProspectRow } from '~/server/utils/website-prospect-types'

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>

async function uniqueSlug(supabase: SupabaseAdmin, raw: string) {
  const base = slugifySubdomain(raw) || `betrieb-${Date.now().toString(36)}`
  let slug = base
  for (let i = 0; i < 8; i++) {
    const [{ data: tenant }, { data: site }] = await Promise.all([
      supabase.from('tenants').select('id').eq('slug', slug).maybeSingle(),
      supabase.from('website_tenants').select('id').eq('subdomain', slug).maybeSingle(),
    ])
    if (!tenant && !site) return slug
    slug = `${base}-${(i + 2).toString()}`
  }
  return `${base}-${Date.now().toString(36).slice(-4)}`
}

async function nextCustomerNumber(supabase: SupabaseAdmin) {
  try {
    const { data, error } = await supabase.rpc('generate_next_customer_number')
    if (!error && data) return String(data)
  } catch {
    /* fallback */
  }
  return `WP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString(36).slice(-4)}`
}

export async function generateWebsiteProspectSite(prospectId: string) {
  const supabase = getSupabaseAdmin()
  const { data: prospect, error } = await supabase
    .from('website_prospects')
    .select('*')
    .eq('id', prospectId)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!prospect) throw createError({ statusCode: 404, statusMessage: 'Prospect nicht gefunden' })
  const scrape = prospect.scrape || {}
  const place = prospect.place || {}
  const now = new Date().toISOString()
  const primary = scrape.theme_color && scrape.theme_color !== '#FFFFFF' ? scrape.theme_color : '#0F766E'

  if (prospect.tenant_id) {
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id, name, slug')
      .eq('id', prospect.tenant_id)
      .maybeSingle()
    const { data: existingWebsite } = await supabase
      .from('website_tenants')
      .select('id, subdomain, primary_color, secondary_color, accent_color, logo_url, hero_image_url')
      .eq('tenant_id', prospect.tenant_id)
      .maybeSingle()
    if (existingTenant && existingWebsite) {
      return await finishProspectSite({
        supabase,
        prospect,
        tenant: existingTenant,
        website: existingWebsite,
        scrape,
        place,
        primary,
        now,
        created: false,
      })
    }
  }

  const { data: leftover } = await supabase
    .from('tenants')
    .select('id, name, slug')
    .eq('website_notes', `website_prospect:${prospect.id}`)
    .maybeSingle()

  if (leftover?.id) {
    await supabase.from('website_tenants').delete().eq('tenant_id', leftover.id)
    await supabase.from('tenants').delete().eq('id', leftover.id)
  }

  const slug = await uniqueSlug(supabase, prospect.name || prospect.hostname || prospect.id)
  const tenantId = randomUUID()
  const trialEnds = new Date()
  trialEnds.setDate(trialEnds.getDate() + SAAS_TRIAL_DAYS)

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      id: tenantId,
      name: prospect.name,
      slug,
      domain: `simy.ch/${slug}`,
      customer_number: await nextCustomerNumber(supabase),
      contact_email: prospect.email || null,
      contact_phone: prospect.phone || null,
      whatsapp_phone: prospect.phone || null,
      address: prospect.address || null,
      invoice_city: prospect.city || null,
      invoice_zip: prospect.postal_code || null,
      business_type: prospect.business_type || 'driving_school',
      default_vat_rate: defaultVatRateForBusinessType(prospect.business_type),
      primary_color: primary,
      secondary_color: '#134E4A',
      accent_color: '#F59E0B',
      logo_url: scrape.logo_url || null,
      website_url: prospect.existing_url || null,
      website_only: true,
      website_status: 'pending_review',
      website_notes: `website_prospect:${prospect.id}`,
      is_active: true,
      is_trial: true,
      trial_ends_at: trialEnds.toISOString(),
      subscription_plan: 'trial',
      timezone: 'Europe/Zurich',
      currency: 'CHF',
      language: 'de',
      google_review_places: prospect.place_id
        ? [{ name: prospect.name, place_id: prospect.place_id, url: place.maps_url }]
        : [],
      created_at: now,
      updated_at: now,
    })
    .select('id, name, slug')
    .single()

  if (tenantError || !tenant) {
    throw createError({
      statusCode: 500,
      statusMessage: tenantError?.message || 'Tenant konnte nicht angelegt werden',
    })
  }

  const { data: website, error: websiteError } = await supabase
    .from('website_tenants')
    .insert({
      tenant_id: tenant.id,
      subdomain: slug,
      is_published: false,
      primary_color: primary,
      secondary_color: '#134E4A',
      accent_color: '#F59E0B',
      logo_url: scrape.logo_url || null,
      hero_image_url: scrape.hero_image_url || null,
    })
      .select('id, subdomain, primary_color, secondary_color, accent_color, logo_url, hero_image_url')
      .single()

  if (websiteError || !website) {
    await supabase.from('tenants').delete().eq('id', tenant.id)
    throw createError({
      statusCode: 500,
      statusMessage: websiteError?.message || 'Website konnte nicht angelegt werden',
    })
  }

  return await finishProspectSite({
    supabase,
    prospect,
    tenant,
    website,
    scrape,
    place,
    primary,
    now,
    created: true,
  })
}

async function finishProspectSite(opts: {
  supabase: SupabaseAdmin
  prospect: any
  tenant: { id: string; name?: string; slug: string }
  website: {
    id: string
    subdomain: string
    primary_color?: string | null
    secondary_color?: string | null
    accent_color?: string | null
    logo_url?: string | null
    hero_image_url?: string | null
  }
  scrape: any
  place: any
  primary: string
  now: string
  created: boolean
}) {
  const { supabase, prospect, tenant, website, scrape, place, primary, now } = opts
  const media = await ingestProspectMedia({
    tenantId: tenant.id,
    name: prospect.name,
    scrape,
    place,
    placeId: prospect.place_id,
  })

  await supabase
    .from('tenants')
    .update({
      logo_url: media.logo_url || scrape.logo_url || null,
      updated_at: now,
    })
    .eq('id', tenant.id)
  await supabase
    .from('website_tenants')
    .update({
      logo_url: media.logo_url || scrape.logo_url || null,
      hero_image_url: media.hero_url || scrape.hero_image_url || null,
      updated_at: now,
    })
    .eq('id', website.id)

  const baseUrl = getAppUrl().replace(/\/$/, '')
  const previewUrl = `${baseUrl}/s/${encodeURIComponent(website.subdomain)}?preview=1`
  const siteUrl = `${baseUrl}/s/${encodeURIComponent(website.subdomain)}`
  const services = (scrape.services || []).map((s: any, i: number) => ({
    id: `svc-${i + 1}`,
    name: String(s.name || '').trim(),
    description: '',
  })).filter((s: { name: string }) => s.name)

  if (!services.length && prospect.business_type === 'driving_school') {
    services.push(
      { id: 'svc-b', name: 'Autofahren Kat. B', description: '' },
      { id: 'svc-a', name: 'Motorrad', description: '' },
    )
  }

  const stock = await fillProspectSectionPhotos({
    businessType: prospect.business_type,
    city: prospect.city,
    name: prospect.name,
    services,
    ownHero: media.hero_url || scrape.hero_image_url || null,
    ownGallery: media.gallery,
  })

  await supabase
    .from('website_tenants')
    .update({
      hero_image_url: stock.hero_url,
      updated_at: now,
    })
    .eq('id', website.id)

  const testimonials = (place.reviews || []).map((r: any, i: number) => ({
    id: `rev-${i + 1}`,
    author: r.author || 'Google',
    text: r.text || '',
    rating: r.rating || 5,
  }))

  const usps = [
    place.rating ? `${place.rating}★ auf Google` : '',
    prospect.city ? `Lokal in ${prospect.city}` : '',
    'Transparente Preise',
    'Persönliche Betreuung',
  ].filter(Boolean)

  const landing = buildLandingPage({
    tenant: {
      id: tenant.id,
      name: prospect.name,
      slug: website.subdomain,
      business_type: prospect.business_type,
      description: scrape.description || scrape.title || null,
      contact_email: prospect.email,
      contact_phone: prospect.phone,
      whatsapp_phone: prospect.phone,
      address: prospect.address,
      city: prospect.city,
      invoice_city: prospect.city,
      postal_code: prospect.postal_code,
      invoice_zip: prospect.postal_code,
      primary_color: primary,
      logo_url: media.logo_url || scrape.logo_url || null,
      hero_image_url: stock.hero_url,
      google_review_places: prospect.place_id
        ? [{ name: prospect.name, place_id: prospect.place_id }]
        : [],
    },
    bio: scrape.description || undefined,
    formal_address: 'sie',
    hero_image_source: stock.hero_source,
    hero_attribution: stock.hero_attribution,
    services: stock.services,
    testimonials,
    testimonials_source: testimonials.length ? 'google_or_app' : 'manual',
    stats: place.rating
      ? { avg_rating: place.rating, total_testimonials: place.user_ratings_total || testimonials.length }
      : undefined,
    bookingUrl: '#kontakt',
    siteUrl,
    hide_powered_by: true,
    booking_policy: null,
    usps,
    gallery: stock.gallery,
    contact_channels: { phone: !!prospect.phone, email: !!prospect.email, whatsapp: !!prospect.phone, form: true },
  })
  ;(landing as any).templateId = WEBSITE_TEMPLATE_ID
  if (landing.brand) {
    ;(landing.brand as any).stock_credits = stock.credits
  }

  const { data: existingPage } = await supabase
    .from('website_pages')
    .select('id')
    .eq('website_id', website.id)
    .eq('is_home', true)
    .maybeSingle()

  const pagePayload = {
    blocks: landing,
    seo_title: landing.seo.title,
    seo_description: landing.seo.description,
    seo_keywords: landing.seo.keywords,
    updated_at: now,
  }

  if (existingPage?.id) {
    await supabase.from('website_pages').update(pagePayload).eq('id', existingPage.id)
  } else {
    const { error: pageError } = await supabase.from('website_pages').insert({
      website_id: website.id,
      title: 'Home',
      slug: 'index',
      is_home: true,
      page_type: 'home',
      is_published: false,
      ...pagePayload,
      created_at: now,
    })
    if (pageError) {
      if (opts.created) {
        await supabase.from('website_tenants').delete().eq('id', website.id)
        await supabase.from('tenants').delete().eq('id', tenant.id)
      }
      throw createError({
        statusCode: 500,
        statusMessage: pageError.message || 'Homepage konnte nicht gebaut werden',
      })
    }
  }

  const architecture: ProspectArchitecture =
    prospect.analysis?.architecture ||
    decideProspectArchitecture({
      businessType: prospect.business_type,
      services: scrape.services,
      city: prospect.city,
      internalPaths: scrape.internal_paths,
    })
  const addon = await applyProspectArchitecture({
    supabase,
    website: {
      id: website.id,
      subdomain: website.subdomain,
      primary_color: website.primary_color || primary,
      secondary_color: website.secondary_color || '#134E4A',
      accent_color: website.accent_color || '#F59E0B',
      logo_url: media.logo_url || scrape.logo_url || website.logo_url || null,
      hero_image_url: stock.hero_url || website.hero_image_url || null,
    },
    tenant: {
      id: tenant.id,
      name: prospect.name,
      slug: website.subdomain,
      business_type: prospect.business_type,
      contact_email: prospect.email,
      contact_phone: prospect.phone,
      address: prospect.address,
    },
    city: prospect.city,
    architecture,
    photosByTitle: stock.photos_by_title,
    replaceExisting: !opts.created,
  })
  const analysis = {
    ...(prospect.analysis || { findings: [], recommend_generate: true }),
    architecture,
    summary: [
      prospect.analysis?.summary ||
        (architecture.mode === 'multi'
          ? `Architektur: Multipager (${architecture.intents.map((i) => i.title).join(', ')}).`
          : 'Architektur: One-Pager.'),
      addon.created.length ? `Neue Seiten: ${addon.created.join(', ')}.` : '',
      stock.filled.length ? `Stockfotos: ${stock.filled.join(', ')}.` : '',
    ]
      .filter(Boolean)
      .join(' '),
  }

  const emailDraft = buildProspectEmailDraft({
    name: prospect.name,
    city: prospect.city,
    existingUrl: prospect.existing_url,
    previewUrl,
    revenue: prospect.revenue_model,
    findings: prospect.analysis?.findings || [],
  })

  const { data: updated, error: updateError } = await supabase
    .from('website_prospects')
    .update({
      tenant_id: tenant.id,
      website_id: website.id,
      preview_url: previewUrl,
      analysis,
      email_draft: emailDraft,
      place: place?.photos ? place : prospect.place,
      status: 'review',
      updated_at: now,
    })
    .eq('id', prospect.id)
    .select('*')
    .single()

  if (updateError || !updated) {
    throw createError({ statusCode: 500, statusMessage: updateError?.message || 'Prospect-Update fehlgeschlagen' })
  }

  return updated as WebsiteProspectRow
}
