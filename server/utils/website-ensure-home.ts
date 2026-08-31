/**
 * First editor open: create a real home landing from tenant + Simy data
 * so the wizard is not required.
 */
import { buildLandingPage } from '~/server/utils/website-landing-builder'
import { loadWebsiteServices } from '~/server/utils/website-services'
import { resolveWebsiteCity } from '~/server/utils/website-local-seo'
import { loadWebsitePickupOffer } from '~/server/utils/website-pickup'
import { mapStaffToTeam } from '~/server/utils/website-premium'
import { shouldHideStaffOnWebsite } from '~/utils/website-wizard-content'
import { isLandingPayload, WEBSITE_TEMPLATE_ID } from '~/utils/website-slot-schema'

type SupabaseLike = { from: (table: string) => any }

export async function ensureWebsiteHomeLanding(
  supabase: SupabaseLike,
  opts: {
    tenant: Record<string, any>
    website: Record<string, any>
    baseUrl: string
  },
) {
  const { tenant, website, baseUrl } = opts
  const { data: home } = await supabase
    .from('website_pages')
    .select('id, blocks, slug, is_home, page_type')
    .eq('website_id', website.id)
    .eq('is_home', true)
    .maybeSingle()

  if (home && isLandingPayload(home.blocks)) return home

  const slug = tenant.slug || website.subdomain
  const bookingUrl = `${baseUrl.replace(/\/$/, '')}/booking/availability/${encodeURIComponent(slug)}`
  const siteUrl =
    website.custom_domain_verified && website.custom_domain
      ? `https://${String(website.custom_domain).replace(/\/$/, '')}`
      : `${baseUrl.replace(/\/$/, '')}/s/${encodeURIComponent(website.subdomain)}`

  const pricing = await loadWebsiteServices(supabase as any, tenant.id)
  const services = pricing.slice(0, 12).map((p) => ({
    id: String(p.id),
    name: p.name,
    description: '',
    duration_minutes: p.duration_minutes,
    price_cents: p.price,
    category: p.category,
  }))

  let team: ReturnType<typeof mapStaffToTeam> = []
  try {
    const { data: staffRows } = await supabase
      .from('users')
      .select('id, first_name, last_name, role, language, category, profession, metadata, is_active')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .in('role', ['staff', 'admin'])
      .limit(12)
    team = mapStaffToTeam(staffRows || [], tenant.business_type).filter(
      (m) => !shouldHideStaffOnWebsite(m.name, tenant),
    )
  } catch {
    team = []
  }

  const city = resolveWebsiteCity(tenant)
  const pickup = await loadWebsitePickupOffer(supabase, tenant.id)

  const landing = buildLandingPage({
    tenant: {
      ...tenant,
      city: city || tenant.invoice_city || null,
      invoice_city: tenant.invoice_city || null,
      postal_code: tenant.invoice_zip || tenant.postal_code || null,
      invoice_zip: tenant.invoice_zip || null,
      logo_url: website.logo_url || tenant.logo_url || tenant.logo_square_url || null,
      hero_image_url: website.hero_image_url || tenant.hero_image_url || null,
      primary_color: website.primary_color || tenant.primary_color,
      secondary_color: website.secondary_color || tenant.secondary_color,
      accent_color: website.accent_color || tenant.accent_color,
    },
    formal_address: 'sie',
    booking_policy: tenant.booking_policy || null,
    services,
    testimonials: [],
    bookingUrl,
    siteUrl,
    hide_powered_by: true,
    team,
    meeting_points: [],
    pickup: pickup.enabled,
    products: [],
  })
  ;(landing as any).templateId = WEBSITE_TEMPLATE_ID

  const now = new Date().toISOString()
  if (home?.id) {
    await supabase
      .from('website_pages')
      .update({
        blocks: landing,
        seo_title: landing.seo.title,
        seo_description: landing.seo.description,
        seo_keywords: landing.seo.keywords,
        updated_at: now,
      })
      .eq('id', home.id)
    return { ...home, blocks: landing }
  }

  const { data: created, error } = await supabase
    .from('website_pages')
    .insert({
      website_id: website.id,
      title: 'Home',
      slug: 'index',
      is_home: true,
      page_type: 'home',
      blocks: landing,
      seo_title: landing.seo.title,
      seo_description: landing.seo.description,
      seo_keywords: landing.seo.keywords,
      created_at: now,
      updated_at: now,
    })
    .select('id, blocks, slug, is_home, page_type')
    .single()

  if (error || !created) {
    throw new Error(error?.message || 'Home-Seite konnte nicht angelegt werden')
  }
  return created
}
