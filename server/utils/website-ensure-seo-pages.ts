/**
 * On publish: create location / category / prices pages from tenant data
 * if they do not exist yet. Uses fallback copy (fast) — editor can refine.
 */
import { getTerminologyDefaults } from '~/composables/useTerminology'
import { resolveLocationCity, resolveWebsiteCity } from '~/server/utils/website-local-seo'
import { loadWebsiteServices } from '~/server/utils/website-services'
import {
  buildAddonPage,
  fallbackAddonCopy,
  suggestAddonSlug,
  type AddonInputs,
  type AddonPageType,
} from '~/server/utils/website-addon-builder'

type SupabaseLike = { from: (table: string) => any }

async function uniqueSlug(
  supabase: SupabaseLike,
  websiteId: string,
  pageType: AddonPageType,
  inputs: AddonInputs,
) {
  let slug = suggestAddonSlug(pageType, inputs)
  for (let i = 0; i < 6; i++) {
    const { data: clash } = await supabase
      .from('website_pages')
      .select('id')
      .eq('website_id', websiteId)
      .eq('slug', slug)
      .maybeSingle()
    if (!clash) return slug
    slug = `${suggestAddonSlug(pageType, inputs)}-${i + 2}`
  }
  return `${slug}-${Date.now().toString(36)}`
}

async function insertAddonPage(opts: {
  supabase: SupabaseLike
  website: any
  tenant: any
  baseUrl: string
  pageType: AddonPageType
  inputs: AddonInputs
  formal: 'sie' | 'du'
  publish: boolean
}) {
  const { supabase, website, tenant, baseUrl, pageType, inputs, formal, publish } = opts
  const slug = await uniqueSlug(supabase, website.id, pageType, inputs)
  const bookingUrl = `${baseUrl}/booking/availability/${encodeURIComponent(tenant.slug || website.subdomain)}`
  const siteUrl =
    website.custom_domain_verified && website.custom_domain
      ? `https://${String(website.custom_domain).replace(/\/$/, '')}/${encodeURIComponent(slug)}`
      : `${baseUrl}/s/${encodeURIComponent(website.subdomain)}/${encodeURIComponent(slug)}`

  const copy = fallbackAddonCopy(pageType, tenant.name, inputs, formal)
  const landing = buildAddonPage({
    pageType,
    tenant: {
      id: tenant.id,
      name: tenant.name,
      business_type: tenant.business_type,
      primary_color: website.primary_color || tenant.primary_color,
      secondary_color: website.secondary_color || tenant.secondary_color,
      accent_color: website.accent_color || tenant.accent_color,
      logo_url: website.logo_url || tenant.logo_url || tenant.logo_square_url,
      hero_image_url: website.hero_image_url,
      contact_email: tenant.contact_email,
      contact_phone: tenant.contact_phone,
      address: tenant.address,
      city: resolveWebsiteCity(tenant) || tenant.invoice_city || tenant.city,
      postal_code: tenant.invoice_zip || tenant.postal_code,
    },
    formal_address: formal,
    bookingUrl,
    siteUrl,
    inputs,
    copy,
  })
  ;(landing as any).templateId = `${pageType}@v1`
  ;(landing as any).pageType = pageType

  const title =
    inputs.title ||
    inputs.city ||
    inputs.category_name ||
    (pageType === 'prices' ? 'Preise' : pageType === 'location' ? 'Standort' : 'Kategorie')

  const now = new Date().toISOString()
  const { error } = await supabase.from('website_pages').insert({
    website_id: website.id,
    title,
    slug,
    is_home: false,
    is_published: publish,
    published_at: publish ? now : null,
    page_type: pageType,
    source_ref: null,
    addon_inputs: inputs,
    blocks: landing,
    seo_title: landing.seo.title,
    seo_description: landing.seo.description,
    seo_keywords: landing.seo.keywords,
    created_at: now,
    updated_at: now,
  })
  if (error) {
    console.warn('[website-seo-pages] insert failed', pageType, error.message)
    return null
  }
  return slug
}

export async function ensureWebsiteSeoPages(
  supabase: SupabaseLike,
  opts: {
    website: any
    tenant: any
    baseUrl: string
    publish?: boolean
  },
): Promise<{ created: string[] }> {
  const { website, tenant, baseUrl } = opts
  const publish = opts.publish !== false
  const created: string[] = []
  if (!website?.id || !tenant?.id) return { created }

  const { data: existing } = await supabase
    .from('website_pages')
    .select('id, slug, page_type, title, addon_inputs')
    .eq('website_id', website.id)

  const pages = existing || []
  const hasPrices = pages.some((p: any) => p.page_type === 'prices')
  const locationKeys = new Set(
    pages
      .filter((p: any) => p.page_type === 'location')
      .map((p: any) => String(p.addon_inputs?.city || p.title || '').toLowerCase().trim())
      .filter(Boolean),
  )
  const categoryKeys = new Set(
    pages
      .filter((p: any) => p.page_type === 'category')
      .map((p: any) => String(p.addon_inputs?.category_name || p.title || '').toLowerCase().trim())
      .filter(Boolean),
  )

  let formal: 'sie' | 'du' = 'sie'
  const { data: homeRow } = await supabase
    .from('website_pages')
    .select('blocks')
    .eq('website_id', website.id)
    .eq('is_home', true)
    .maybeSingle()
  if (homeRow?.blocks?.brand?.formal_address === 'du') formal = 'du'

  const terms = getTerminologyDefaults(tenant.business_type)
  const tenantCity = resolveWebsiteCity(tenant)

  let locations: any[] = []
  try {
    const locRes = await supabase
      .from('locations')
      .select('id, name, address, city, postal_code, location_type, is_active')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .limit(12)
    locations = locRes.data || []
  } catch {
    locations = []
  }

  const locCities: string[] = []
  for (const loc of locations || []) {
    if (String(loc.location_type || '') === 'pickup' || String(loc.location_type || '') === 'home') continue
    const city = resolveLocationCity(loc)
    if (city && !locCities.some((c) => c.toLowerCase() === city.toLowerCase())) {
      locCities.push(city)
    }
  }
  if (tenantCity && !locCities.some((c) => c.toLowerCase() === tenantCity.toLowerCase())) {
    locCities.unshift(tenantCity)
  }

  for (const city of locCities.slice(0, 3)) {
    const key = city.toLowerCase()
    if (locationKeys.has(key)) continue
    const slug = await insertAddonPage({
      supabase,
      website,
      tenant,
      baseUrl,
      pageType: 'location',
      inputs: {
        city,
        title: city,
        keywords: `${terms.businessNoun} ${city}`,
        notes: `${tenant.name} in ${city}: ${terms.appointmentsPlural}, Anfahrt und Online-Buchung.`,
      },
      formal,
      publish,
    })
    if (slug) {
      created.push(slug)
      locationKeys.add(key)
    }
  }

  let services: Array<{ name: string; category: string }> = []
  try {
    services = await loadWebsiteServices(supabase as any, tenant.id)
  } catch {
    services = []
  }

  const seenCat = new Set<string>()
  for (const svc of services) {
    const label = String(svc.name || svc.category || '').trim()
    if (!label) continue
    const key = label.toLowerCase()
    if (seenCat.has(key) || categoryKeys.has(key)) continue
    if (seenCat.size >= 4) break
    seenCat.add(key)
    const slug = await insertAddonPage({
      supabase,
      website,
      tenant,
      baseUrl,
      pageType: 'category',
      inputs: {
        category_name: label,
        title: label,
        keywords: `${label}, ${terms.businessNoun}${tenantCity ? ` ${tenantCity}` : ''}`,
        notes: `${label} bei ${tenant.name}${tenantCity ? ` in ${tenantCity}` : ''}.`,
      },
      formal,
      publish,
    })
    if (slug) {
      created.push(slug)
      categoryKeys.add(key)
    }
  }

  if (!hasPrices) {
    const slug = await insertAddonPage({
      supabase,
      website,
      tenant,
      baseUrl,
      pageType: 'prices',
      inputs: {
        title: 'Preise',
        keywords: `Preise ${terms.businessNoun}${tenantCity ? ` ${tenantCity}` : ''}`,
        notes: `Transparente Preise bei ${tenant.name}.`,
      },
      formal,
      publish,
    })
    if (slug) created.push(slug)
  }

  if (created.length) {
    await supabase
      .from('website_tenants')
      .update({ addon_pages_enabled: true, updated_at: new Date().toISOString() })
      .eq('id', website.id)
  }

  return { created }
}
