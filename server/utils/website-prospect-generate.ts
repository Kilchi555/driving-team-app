import { randomUUID } from 'node:crypto'
import { SAAS_TRIAL_DAYS } from '~/utils/saas-trial'
import { WEBSITE_TEMPLATE_ID } from '~/utils/website-slot-schema'
import { getAppUrl } from '~/server/utils/app-url'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { buildLandingPage, slugifySubdomain } from '~/server/utils/website-landing-builder'
import { buildProspectEmailDraft } from '~/server/utils/website-prospect-email'
import {
  applyProspectArchitecture,
  decideProspectArchitecture,
} from '~/server/utils/website-prospect-architecture'
import {
  ingestProspectMedia,
  removeProspectUploadedPaths,
} from '~/server/utils/website-prospect-media'
import { fillProspectSectionPhotos } from '~/server/utils/website-prospect-stock'
import {
  prospectServicesFromScrape,
  prospectTenantBusinessType,
  prospectTestimonialsFromPlace,
  prospectUspsFromSources,
  prospectVerifiedContentFlags,
} from '~/server/utils/website-prospect-landing-facts'
import {
  ensureWebsitePreviewToken,
  previewUrlForPath,
} from '~/server/utils/website-preview-access'
import {
  mergeVatSelectionIntoAnalysis,
  resolveProspectVatRate,
  type ProspectVatSelection,
} from '~/server/utils/website-prospect-vat'
import type { ProspectArchitecture, WebsiteProspectRow } from '~/server/utils/website-prospect-types'

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>

export type GenerateProspectSiteOptions = {
  /** Explicit VAT percent or selection object when business type is ambiguous. */
  vatSelection?: unknown
  /** Force mint a new preview token (deliberate invalidation). */
  forceRotatePreviewToken?: boolean
}

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

function requireProspectVat(opts: {
  businessType: string
  existingTenantVatRate?: number | null
  selection?: unknown
  analysis?: unknown
  nowIso: string
}): ProspectVatSelection {
  const resolved = resolveProspectVatRate({
    businessType: opts.businessType,
    existingTenantVatRate: opts.existingTenantVatRate,
    selection: opts.selection ?? opts.analysis,
    nowIso: opts.nowIso,
  })
  if (!resolved.ok) {
    throw createError({
      statusCode: 400,
      statusMessage:
        resolved.reason === 'invalid_rate'
          ? 'Ungültiger MwSt-Satz. Erlaubt: 0, 2.6, 3.8, 8.1.'
          : 'MwSt-Satz fehlt. Bitte einen Satz für diesen Betriebstyp wählen (kein stiller 8.1%-Default).',
      message:
        resolved.reason === 'invalid_rate'
          ? 'Ungültiger MwSt-Satz. Erlaubt: 0, 2.6, 3.8, 8.1.'
          : 'MwSt-Satz fehlt. Bitte einen Satz für diesen Betriebstyp wählen (kein stiller 8.1%-Default).',
      data: { code: 'prospect_vat_selection_required', reason: resolved.reason },
    })
  }
  return resolved.selection
}

async function rollbackCreatedShell(
  supabase: SupabaseAdmin,
  opts: {
    created: boolean
    tenantId: string
    websiteId: string
    uploadedPaths: string[]
  },
) {
  if (!opts.created) return
  if (opts.uploadedPaths.length) {
    await removeProspectUploadedPaths(supabase, opts.uploadedPaths, opts.tenantId)
  }
  await supabase.from('website_tenants').delete().eq('id', opts.websiteId)
  await supabase.from('tenants').delete().eq('id', opts.tenantId)
}

export async function generateWebsiteProspectSite(
  prospectId: string,
  options: GenerateProspectSiteOptions = {},
) {
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
  const businessType = prospectTenantBusinessType(prospect.business_type)

  if (prospect.tenant_id) {
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id, name, slug, default_vat_rate, business_type')
      .eq('id', prospect.tenant_id)
      .maybeSingle()
    const { data: existingWebsite } = await supabase
      .from('website_tenants')
      .select('id, subdomain, primary_color, secondary_color, accent_color, logo_url, hero_image_url, is_published')
      .eq('tenant_id', prospect.tenant_id)
      .maybeSingle()
    if (existingTenant && existingWebsite) {
      const vatSelection = requireProspectVat({
        businessType: existingTenant.business_type || businessType,
        existingTenantVatRate: existingTenant.default_vat_rate,
        selection: options.vatSelection,
        analysis: prospect.analysis,
        nowIso: now,
      })
      // Keep authoritative tenant VAT; persist selection on prospect analysis for reuse.
      if (
        existingTenant.default_vat_rate == null ||
        !Number.isFinite(Number(existingTenant.default_vat_rate))
      ) {
        await supabase
          .from('tenants')
          .update({ default_vat_rate: vatSelection.rate_percent, updated_at: now })
          .eq('id', existingTenant.id)
      }
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
        vatSelection,
        forceRotatePreviewToken: options.forceRotatePreviewToken === true,
      })
    }
  }

  const vatSelection = requireProspectVat({
    businessType,
    selection: options.vatSelection,
    analysis: prospect.analysis,
    nowIso: now,
  })

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
  const cronShell = prospect.source === 'places_cron'
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
      business_type: businessType,
      default_vat_rate: vatSelection.rate_percent,
      primary_color: primary,
      secondary_color: '#134E4A',
      accent_color: '#F59E0B',
      logo_url: scrape.logo_url || null,
      website_url: prospect.existing_url || null,
      website_only: true,
      website_status: 'pending_review',
      website_notes: `website_prospect:${prospect.id}`,
      is_active: true,
      is_trial: cronShell ? false : true,
      trial_ends_at: cronShell ? null : trialEnds.toISOString(),
      subscription_plan: cronShell ? null : 'trial',
      ...(cronShell
        ? { website_hosting_plan: null, website_setup_paid_at: null }
        : {}),
      timezone: 'Europe/Zurich',
      currency: 'CHF',
      language: 'de',
      google_review_places: prospect.place_id
        ? [{ name: prospect.name, place_id: prospect.place_id, url: place.maps_url }]
        : [],
      created_at: now,
      updated_at: now,
    })
    .select('id, name, slug, default_vat_rate, business_type')
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
      .select('id, subdomain, primary_color, secondary_color, accent_color, logo_url, hero_image_url, is_published')
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
    vatSelection,
    forceRotatePreviewToken: options.forceRotatePreviewToken === true,
  })
}

export async function finishProspectSite(opts: {
  supabase: SupabaseAdmin
  prospect: any
  tenant: { id: string; name?: string; slug: string; default_vat_rate?: number | null; business_type?: string | null }
  website: {
    id: string
    subdomain: string
    primary_color?: string | null
    secondary_color?: string | null
    accent_color?: string | null
    logo_url?: string | null
    hero_image_url?: string | null
    is_published?: boolean | null
  }
  scrape: any
  place: any
  primary: string
  now: string
  created: boolean
  vatSelection: ProspectVatSelection
  forceRotatePreviewToken?: boolean
}) {
  const { supabase, prospect, tenant, website, scrape, place, primary, now } = opts
  let uploadedPaths: string[] = []

  const media = await ingestProspectMedia({
    tenantId: tenant.id,
    name: prospect.name,
    scrape,
    place,
    placeId: prospect.place_id,
    refetchPlacePhotos: prospect.source !== 'places_cron',
  })
  uploadedPaths = media.uploaded_paths || []

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
  const sitePath = `/s/${encodeURIComponent(website.subdomain)}`
  const siteUrl = `${baseUrl}${sitePath}`
  // Reuse a still-valid preview token across regeneration; rotate only when
  // forceRotatePreviewToken is set or the prior token is missing/expired/unsafe.
  const issued = await ensureWebsitePreviewToken(supabase, website.id, {
    existingPreviewUrl: prospect.preview_url,
    forceRotate: opts.forceRotatePreviewToken === true,
  })
  if (!issued) {
    await rollbackCreatedShell(supabase, {
      created: opts.created,
      tenantId: tenant.id,
      websiteId: website.id,
      uploadedPaths,
    })
    throw createError({
      statusCode: 503,
      statusMessage: 'Preview link unavailable',
      message: 'Preview link unavailable',
    })
  }
  const previewUrl = previewUrlForPath(baseUrl, sitePath, issued.token)

  const businessType = prospectTenantBusinessType(prospect.business_type)
  const services = prospectServicesFromScrape(scrape)

  const stock = await fillProspectSectionPhotos({
    businessType,
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

  const testimonials = prospectTestimonialsFromPlace(place)
  const usps = prospectUspsFromSources({
    rating: typeof place?.rating === 'number' ? place.rating : null,
    city: prospect.city,
  })
  const verified = prospectVerifiedContentFlags()

  const landing = buildLandingPage({
    tenant: {
      id: tenant.id,
      name: prospect.name,
      slug: website.subdomain,
      business_type: businessType,
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
    stats: typeof place?.rating === 'number'
      ? { avg_rating: place.rating, total_testimonials: place.user_ratings_total || testimonials.length }
      : undefined,
    bookingUrl: '#kontakt',
    siteUrl,
    hide_powered_by: true,
    booking_policy: null,
    verified_hours_only: verified.verified_hours_only,
    verified_prices_only: verified.verified_prices_only,
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
      await rollbackCreatedShell(supabase, {
        created: opts.created,
        tenantId: tenant.id,
        websiteId: website.id,
        uploadedPaths,
      })
      throw createError({
        statusCode: 500,
        statusMessage: pageError.message || 'Homepage konnte nicht gebaut werden',
      })
    }
  }

  const architecture: ProspectArchitecture =
    prospect.analysis?.architecture ||
    decideProspectArchitecture({
      businessType,
      services: scrape.services,
      city: prospect.city,
      internalPaths: scrape.internal_paths,
      strict: prospect.source === 'places_cron',
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
      business_type: businessType,
      contact_email: prospect.email,
      contact_phone: prospect.phone,
      address: prospect.address,
    },
    city: prospect.city,
    architecture,
    photosByTitle: stock.photos_by_title,
    replaceExisting: !opts.created,
  })
  const analysis = mergeVatSelectionIntoAnalysis(
    {
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
    },
    opts.vatSelection,
  )

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
    await rollbackCreatedShell(supabase, {
      created: opts.created,
      tenantId: tenant.id,
      websiteId: website.id,
      uploadedPaths,
    })
    throw createError({ statusCode: 500, statusMessage: updateError?.message || 'Prospect-Update fehlgeschlagen' })
  }

  // Never publish from this path — failed or successful finish leaves is_published false.
  if (website.is_published) {
    await supabase.from('website_tenants').update({ is_published: false, updated_at: now }).eq('id', website.id)
  }

  return updated as WebsiteProspectRow
}
