/**
 * Website-only shell. No user, claim, trial, subscription, payment, or publish.
 * is_trial and subscription_plan are set explicitly because the tenants table
 * defaults those columns to a trial.
 */
import { randomUUID } from 'node:crypto'
import { buildLandingPage, slugifySubdomain } from '~/server/utils/website-landing-builder'
import { issueWebsitePreviewToken, previewUrlForPath } from '~/server/utils/website-preview-access'
import { defaultVatRateForBusinessType } from '~/server/utils/invoice-vat'
import { WEBSITE_TEMPLATE_ID } from '~/utils/website-slot-schema'
import type { FactoryProfile } from '~/server/utils/website-factory-profile'

type QueryResult = { data?: unknown; error?: { message?: string } | null }
type Query = {
  select: (...args: unknown[]) => Query
  eq: (...args: unknown[]) => Query
  insert: (row: unknown) => Query
  update: (row: unknown) => Query
  delete: () => Query
  maybeSingle: () => Promise<QueryResult>
  single: () => Promise<QueryResult>
}
export type FactorySupabase = {
  from: (table: string) => Query
  rpc?: (fn: string) => Promise<QueryResult>
}

function rowWithId(value: unknown): { id: string; subdomain?: string } | null {
  if (!value || typeof value !== 'object') return null
  const row = value as { id?: unknown; subdomain?: unknown }
  if (typeof row.id !== 'string' || !row.id) return null
  return { id: row.id, subdomain: typeof row.subdomain === 'string' ? row.subdomain : undefined }
}

async function uniqueSlug(supabase: FactorySupabase, raw: string) {
  const base = slugifySubdomain(raw) || `betrieb-${Date.now().toString(36)}`
  let slug = base
  for (let i = 0; i < 8; i++) {
    const [tenantRes, siteRes] = await Promise.all([
      supabase.from('tenants').select('id').eq('slug', slug).maybeSingle(),
      supabase.from('website_tenants').select('id').eq('subdomain', slug).maybeSingle(),
    ])
    if (!tenantRes?.data && !siteRes?.data) return slug
    slug = `${base}-${i + 2}`
  }
  return `${base}-${Date.now().toString(36).slice(-4)}`
}

async function customerNumber(supabase: FactorySupabase) {
  try {
    const result = await supabase.rpc?.('generate_next_customer_number')
    if (result && !result.error && result.data) return String(result.data)
  } catch {
    /* local fallback */
  }
  return `WF-${Date.now().toString(36)}`
}

export async function rollbackFactoryShell(supabase: FactorySupabase, ids: { tenantId?: string | null; websiteId?: string | null }) {
  if (ids.websiteId) {
    await supabase.from('website_pages').delete().eq('website_id', ids.websiteId)
    await supabase.from('website_tenants').delete().eq('id', ids.websiteId)
  }
  if (ids.tenantId) await supabase.from('tenants').delete().eq('id', ids.tenantId)
}

export async function generateFactoryPreview(opts: {
  supabase: FactorySupabase
  profile: FactoryProfile
  baseUrl: string
  now?: string
}) {
  const { supabase, profile } = opts
  const now = opts.now || new Date().toISOString()
  const baseUrl = opts.baseUrl.replace(/\/$/, '')
  const slug = await uniqueSlug(supabase, profile.businessName)
  const tenantId = randomUUID()
  const primary = '#0F766E'

  const tenantInsert = {
    id: tenantId,
    name: profile.businessName,
    slug,
    domain: `simy.ch/${slug}`,
    customer_number: await customerNumber(supabase),
    contact_email: profile.email,
    contact_phone: profile.phone,
    whatsapp_phone: profile.phone,
    address: profile.address,
    invoice_city: profile.city,
    invoice_zip: profile.postalCode,
    business_type: profile.businessType,
    default_vat_rate: defaultVatRateForBusinessType(profile.businessType),
    primary_color: primary,
    secondary_color: '#134E4A',
    accent_color: '#F59E0B',
    logo_url: profile.logoUrl,
    website_url: profile.websiteUrl,
    website_only: true,
    website_status: 'pending_review',
    website_notes: 'website_factory',
    is_active: true,
    is_trial: false,
    trial_ends_at: null,
    subscription_plan: null,
    website_setup_paid_at: null,
    website_hosting_plan: null,
    working_days_template: profile.openingHours,
    google_review_places: profile.googlePlaceId
      ? [{ name: profile.businessName, place_id: profile.googlePlaceId, url: profile.googleProfileUrl }]
      : [],
    timezone: 'Europe/Zurich',
    currency: 'CHF',
    language: 'de',
    created_at: now,
    updated_at: now,
  }

  const { data: tenantRow, error: tenantError } = await supabase
    .from('tenants')
    .insert(tenantInsert)
    .select('id, name, slug')
    .single()
  const tenant = rowWithId(tenantRow)
  if (tenantError || !tenant) {
    throw new Error(tenantError?.message || 'tenant insert failed')
  }

  const { data: websiteRow, error: websiteError } = await supabase
    .from('website_tenants')
    .insert({
      tenant_id: tenant.id,
      subdomain: slug,
      is_published: false,
      primary_color: primary,
      secondary_color: '#134E4A',
      accent_color: '#F59E0B',
      logo_url: profile.logoUrl,
      hero_image_url: profile.imageUrls[0] || null,
      created_at: now,
      updated_at: now,
    })
    .select('id, subdomain')
    .single()
  const website = rowWithId(websiteRow)
  if (websiteError || !website?.subdomain) {
    await rollbackFactoryShell(supabase, { tenantId: tenant.id })
    throw new Error(websiteError?.message || 'website insert failed')
  }

  const siteUrl = `${baseUrl}/s/${encodeURIComponent(website.subdomain)}`
  const landing = buildLandingPage({
    tenant: {
      id: tenant.id,
      name: profile.businessName,
      slug: website.subdomain,
      business_type: profile.businessType,
      description: profile.description,
      contact_email: profile.email,
      contact_phone: profile.phone,
      whatsapp_phone: profile.phone,
      address: profile.address,
      city: profile.city,
      invoice_city: profile.city,
      postal_code: profile.postalCode,
      invoice_zip: profile.postalCode,
      logo_url: profile.logoUrl,
      hero_image_url: profile.imageUrls[0] || null,
      primary_color: primary,
      working_days_template: profile.openingHours,
      google_review_places: tenantInsert.google_review_places,
      website_facebook: profile.facebookUrl,
      website_instagram: profile.instagramUrl,
    },
    bio: profile.description || undefined,
    formal_address: 'sie',
    services: profile.services.map((service, index) => ({
      id: `svc-${index + 1}`,
      name: service.name,
      description: service.description,
      price_cents: service.priceCents,
    })),
    testimonials: [],
    stats: profile.rating ? { avg_rating: profile.rating } : undefined,
    bookingUrl: profile.bookingUrl || '#kontakt',
    siteUrl,
    hide_powered_by: true,
    booking_policy: null,
    verified_hours_only: true,
    contact_channels: {
      phone: !!profile.phone,
      email: !!profile.email,
      whatsapp: !!profile.phone,
      form: true,
    },
    gallery: profile.imageUrls.slice(1, 6).map((url) => ({ url })),
  })
  ;(landing as { templateId?: string }).templateId = WEBSITE_TEMPLATE_ID

  const { error: pageError } = await supabase.from('website_pages').insert({
    website_id: website.id,
    title: 'Home',
    slug: 'index',
    is_home: true,
    page_type: 'home',
    is_published: false,
    blocks: landing,
    seo_title: landing.seo.title,
    seo_description: landing.seo.description,
    seo_keywords: landing.seo.keywords,
    created_at: now,
    updated_at: now,
  })
  if (pageError) {
    await rollbackFactoryShell(supabase, { tenantId: tenant.id, websiteId: website.id })
    throw new Error(pageError.message || 'page insert failed')
  }

  const issued = await issueWebsitePreviewToken(supabase, website.id)
  if (!issued) {
    await rollbackFactoryShell(supabase, { tenantId: tenant.id, websiteId: website.id })
    throw new Error('preview token failed')
  }

  return {
    previewUrl: previewUrlForPath(baseUrl, `/s/${encodeURIComponent(website.subdomain)}`, issued.token),
    tenantInsert,
    landing,
  }
}
