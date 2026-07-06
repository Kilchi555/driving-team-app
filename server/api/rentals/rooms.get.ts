/**
 * GET /api/rentals/rooms?tenant_slug=<slug>
 * Returns public rooms for a tenant.
 * Requires an active Simy session.
 */
import { defineEventHandler, getQuery, createError } from 'h3'
import { getRentalUser } from '~/server/utils/rental-auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  await getRentalUser(event)

  const { tenant_slug } = getQuery(event) as { tenant_slug?: string }
  if (!tenant_slug) throw createError({ statusCode: 400, statusMessage: 'tenant_slug required' })

  const supabase = getSupabaseAdmin()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .or(`slug.eq.${tenant_slug},rental_portal_slug.eq.${tenant_slug}`)
    .maybeSingle()

  if (!tenant) throw createError({ statusCode: 404, statusMessage: 'Fahrschule nicht gefunden' })

  const { data: rooms, error } = await supabase
    .from('rooms')
    .select('id, name, location, capacity, description, hourly_rate_rappen, pricing_tiers, visibility')
    .eq('tenant_id', tenant.id)
    .eq('is_active', true)
    .in('visibility', ['public', 'link'])
    .order('name', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to load rooms' })

  return {
    success: true,
    rooms: (rooms || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      location: r.location ?? null,
      capacity: r.capacity ?? null,
      description: r.description ?? null,
      hourly_rate_rappen: r.hourly_rate_rappen,
      hourly_rate_chf: (r.hourly_rate_rappen / 100).toFixed(2),
      pricing_tiers: r.pricing_tiers ?? [],
    })),
  }
})
