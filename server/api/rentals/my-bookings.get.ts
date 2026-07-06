/**
 * GET /api/rentals/my-bookings?tenant_slug=<slug>
 * Returns the authenticated user's rental bookings for the given tenant.
 */
import { defineEventHandler, getQuery, createError } from 'h3'
import { getRentalUser } from '~/server/utils/rental-auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const rentalUser = await getRentalUser(event)
  const { tenant_slug } = getQuery(event) as { tenant_slug?: string }

  const supabase = getSupabaseAdmin()

  let tenantId: string
  if (tenant_slug) {
    const { data: t } = await supabase
      .from('tenants')
      .select('id')
      .or(`slug.eq.${tenant_slug},rental_portal_slug.eq.${tenant_slug}`)
      .maybeSingle()
    if (!t) throw createError({ statusCode: 404, statusMessage: 'Fahrschule nicht gefunden' })
    tenantId = t.id
  } else {
    tenantId = rentalUser.tenant_id
  }

  const { data: rentals, error } = await supabase
    .from('vehicle_rentals')
    .select('id, start_time, end_time, status, payment_status, notes, vehicles(make, model, year, license_plate)')
    .eq('renter_user_id', rentalUser.id)
    .eq('tenant_id', tenantId)
    .order('start_time', { ascending: false })
    .limit(50)

  if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to load bookings' })

  return {
    success: true,
    bookings: (rentals || []).map((r: any) => ({
      id: r.id,
      vehicle: `${r.vehicles?.make} ${r.vehicles?.model}${r.vehicles?.year ? ` (${r.vehicles.year})` : ''}`,
      license_plate: r.vehicles?.license_plate ?? null,
      start_time: r.start_time,
      end_time: r.end_time,
      status: r.status,
      payment_status: r.payment_status,
      notes: r.notes,
      total_chf: (() => {
        // total_amount_rappen is a generated column — fall back if not returned
        const hours = (new Date(r.end_time).getTime() - new Date(r.start_time).getTime()) / 3_600_000
        return ((r.hourly_rate_rappen ?? 0) * hours / 100).toFixed(2)
      })(),
    })),
  }
})
