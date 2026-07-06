/**
 * GET /api/rentals/portal-init?slug=<tenant_slug>
 *
 * Public endpoint — returns tenant branding + rental portal settings.
 * Used by /partners/[slug] page on load (before auth check).
 * Does NOT return vehicles (those require authentication via /api/rentals/vehicles).
 */
import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const { slug } = getQuery(event) as { slug?: string }
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'slug is required' })

  const supabase = getSupabaseAdmin()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, slug, primary_color, logo_url, logo_square_url, vehicle_rental_settings')
    .or(`slug.eq.${slug},rental_portal_slug.eq.${slug}`)
    .maybeSingle()

  if (!tenant) throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })

  const settings = (tenant.vehicle_rental_settings ?? {}) as Record<string, any>

  return {
    success: true,
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      primary_color: tenant.primary_color,
      logo_square_url: tenant.logo_square_url,
    },
    settings: {
      booking_requires_approval: settings.booking_requires_approval ?? true,
    },
  }
})
