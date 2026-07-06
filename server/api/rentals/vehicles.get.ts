/**
 * GET /api/rentals/vehicles?tenant_slug=<slug>
 *
 * Returns vehicles available for rental for the given tenant.
 * Requires an active Simy session.
 * Visibility: 'public' and 'invite_only' vehicles are shown to all active users.
 */
import { defineEventHandler, getQuery, createError } from 'h3'
import { getRentalUser } from '~/server/utils/rental-auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  await getRentalUser(event) // just verify active session

  const { tenant_slug } = getQuery(event) as { tenant_slug?: string }
  if (!tenant_slug) throw createError({ statusCode: 400, statusMessage: 'tenant_slug required' })

  const supabase = getSupabaseAdmin()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .or(`slug.eq.${tenant_slug},rental_portal_slug.eq.${tenant_slug}`)
    .maybeSingle()

  if (!tenant) throw createError({ statusCode: 404, statusMessage: 'Fahrschule nicht gefunden' })

  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('id, name, marke, modell, farbe, getriebe, hourly_rate_rappen, pricing_tiers, rental_access, rental_requires_lesson, rental_requires_course, rental_lesson_category_codes, rental_course_category_codes, location_address')
    .eq('tenant_id', tenant.id)
    .eq('is_active', true)
    .gt('hourly_rate_rappen', 0)
    .in('rental_access', ['public', 'invite_only'])
    .order('marke', { ascending: true })

  if (error) {
    console.error('rentals/vehicles GET error:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load vehicles' })
  }

  return {
    success: true,
    vehicles: (vehicles || []).map((v: any) => {
      const labelParts = [v.marke, v.modell].filter(Boolean)
      const label = labelParts.length ? labelParts.join(' ') : (v.name || 'Fahrzeug')
      return {
        id: v.id,
        label,
        marke: v.marke,
        modell: v.modell,
        color: v.farbe,
        getriebe: v.getriebe,
        hourly_rate_rappen: v.hourly_rate_rappen,
        hourly_rate_chf: (v.hourly_rate_rappen / 100).toFixed(2),
        pricing_tiers: v.pricing_tiers ?? [],
        location_address: v.location_address ?? null,
        rental_access: v.rental_access,
        rental_requires_lesson: v.rental_requires_lesson ?? false,
        rental_requires_course: v.rental_requires_course ?? false,
        rental_lesson_category_codes: v.rental_lesson_category_codes ?? [],
        rental_course_category_codes: v.rental_course_category_codes ?? [],
      }
    }),
  }
})
