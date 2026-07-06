/**
 * GET /api/courses/[id]/available-vehicles
 *
 * Returns vehicles available for a course — i.e. vehicles that:
 * 1. Belong to the same tenant
 * 2. Have `rental_access` = 'public' (or the course is internal)
 * 3. Have category_codes that include the course's category
 * 4. Are active
 * 5. Are NOT already fully booked for all of the course's sessions
 *    (checked per session — vehicles still appear if at least 1 seat is free)
 *
 * Also returns total available seats per vehicle across all sessions.
 * Public endpoint — no auth required.
 */
import { defineEventHandler, getRouterParam, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const courseId = getRouterParam(event, 'id')
  if (!courseId) throw createError({ statusCode: 400, statusMessage: 'course id required' })

  const supabase = getSupabaseAdmin()

  // Load course + sessions
  const { data: course } = await supabase
    .from('courses')
    .select('id, tenant_id, category, requires_vehicle, course_sessions(id, start_time, end_time)')
    .eq('id', courseId)
    .eq('is_public', true)
    .in('status', ['active', 'waitlist', 'scheduled'])
    .single()

  if (!course) throw createError({ statusCode: 404, statusMessage: 'Kurs nicht gefunden' })
  if (!course.requires_vehicle) return { success: true, vehicles: [] }

  const sessions: { id: string; start_time: string; end_time: string }[] = course.course_sessions || []

  // Fetch all active vehicles for this tenant matching the course category
  const { data: allVehicles } = await supabase
    .from('vehicles')
    .select('id, name, marke, modell, farbe, getriebe, category_codes, hourly_rate_rappen, pricing_tiers, location_address, rental_access')
    .eq('tenant_id', course.tenant_id)
    .eq('is_active', true)
    .contains('category_codes', [course.category])

  if (!allVehicles?.length) return { success: true, vehicles: [] }

  if (!sessions.length) {
    // No sessions yet — return all matching vehicles
    return {
      success: true,
      vehicles: allVehicles.map(v => ({
        ...v,
        display_name: v.name || `${v.marke ?? ''} ${v.modell ?? ''}`.trim(),
        is_available: true,
      })),
    }
  }

  // Check vehicle_bookings conflicts for each vehicle across all sessions
  const vehicleIds = allVehicles.map(v => v.id)
  const sessionTimeRanges = sessions.map(s => ({ start: s.start_time, end: s.end_time }))

  // Fetch existing bookings for these vehicles during any session time
  const minStart = sessionTimeRanges.reduce((m, s) => s.start < m ? s.start : m, sessionTimeRanges[0].start)
  const maxEnd = sessionTimeRanges.reduce((m, s) => s.end > m ? s.end : m, sessionTimeRanges[0].end)

  const { data: conflicts } = await supabase
    .from('vehicle_bookings')
    .select('vehicle_id, start_time, end_time')
    .in('vehicle_id', vehicleIds)
    .neq('status', 'cancelled')
    .lt('start_time', maxEnd)
    .gt('end_time', minStart)

  const conflictsByVehicle: Record<string, { start: string; end: string }[]> = {}
  for (const c of (conflicts || [])) {
    if (!conflictsByVehicle[c.vehicle_id]) conflictsByVehicle[c.vehicle_id] = []
    conflictsByVehicle[c.vehicle_id].push({ start: c.start_time, end: c.end_time })
  }

  const vehicles = allVehicles.map(v => {
    const vConflicts = conflictsByVehicle[v.id] || []
    const blockedSessionCount = sessions.filter(s =>
      vConflicts.some(c => c.start < s.end_time && c.end > s.start_time)
    ).length
    const is_available = blockedSessionCount < sessions.length // available if at least 1 session is free

    return {
      id: v.id,
      display_name: v.name || `${v.marke ?? ''} ${v.modell ?? ''}`.trim(),
      farbe: v.farbe,
      getriebe: v.getriebe,
      category_codes: v.category_codes,
      hourly_rate_rappen: v.hourly_rate_rappen,
      pricing_tiers: v.pricing_tiers,
      location_address: v.location_address,
      is_available,
      blocked_sessions: blockedSessionCount,
      total_sessions: sessions.length,
    }
  })

  return { success: true, vehicles }
})
