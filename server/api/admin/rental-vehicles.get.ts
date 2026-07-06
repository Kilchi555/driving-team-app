/**
 * GET /api/admin/rental-vehicles
 * Returns all vehicles for the tenant (including private ones).
 */
import { defineEventHandler } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const role: string = authUser.role || authUser.profile?.role || ''
  const tenantId: string = authUser.tenant_id || authUser.profile?.tenant_id || ''

  if (!['admin', 'staff', 'superadmin'].includes(role) || !tenantId) {
    console.warn(`🚫 rental-vehicles 403: role=${role} tenantId=${tenantId} authId=${authUser.id}`)
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const supabase = getSupabaseAdmin()
  const dbUser = { tenant_id: tenantId, role }

  const [vehiclesResult, locationsResult] = await Promise.all([
    supabase
      .from('vehicles')
      .select('id, name, marke, modell, farbe, getriebe, aufbau, category_codes, location_id, location_address, hourly_rate_rappen, pricing_tiers, rental_access, rental_requires_lesson, rental_requires_course, rental_lesson_category_codes, rental_course_category_codes, is_active')
      .eq('tenant_id', dbUser.tenant_id)
      .order('marke', { ascending: true }),
    supabase
      .from('locations')
      .select('id, name')
      .eq('tenant_id', dbUser.tenant_id)
      .eq('is_active', true)
      .order('name', { ascending: true }),
  ])

  if (vehiclesResult.error) {
    console.error('rental-vehicles GET error:', vehiclesResult.error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load vehicles' })
  }

  return {
    success: true,
    vehicles: (vehiclesResult.data || []).map((v: any) => ({
      ...v,
      hourly_rate_chf: v.hourly_rate_rappen ? (v.hourly_rate_rappen / 100).toFixed(2) : '0.00',
    })),
    locations: locationsResult.data || [],
  }
})
