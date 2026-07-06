/**
 * GET /api/admin/resources/availability
 * Returns availability status + conflict details for requested vehicles and/or rooms
 * within a given time window.
 *
 * Query params:
 *   start_time (ISO)        – required
 *   end_time   (ISO)        – required
 *   vehicle_ids             – optional, comma-separated UUIDs
 *   room_ids                – optional, comma-separated UUIDs
 *   exclude_appointment_id  – optional UUID, existing appointment to exclude from conflicts
 *
 * Security: requireAdminProfile (staff/admin/super_admin)
 */
import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'

interface Conflict {
  start: string
  end: string
  source: 'lesson' | 'rental' | 'course' | 'room_booking'
  label: string
}

interface VehicleAvailability {
  id: string
  name: string
  is_available: boolean
  conflicts: Conflict[]
}

interface RoomAvailability {
  id: string
  name: string
  is_available: boolean
  conflicts: Conflict[]
}

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'staff', 'super_admin', 'superadmin'])
  const supabase = getSupabaseAdmin()

  const query = getQuery(event) as Record<string, string>
  const { start_time, end_time, vehicle_ids, room_ids, exclude_appointment_id } = query

  if (!start_time || !end_time) {
    throw createError({ statusCode: 400, statusMessage: 'start_time and end_time are required' })
  }

  const vehicleIdList = vehicle_ids ? vehicle_ids.split(',').map(s => s.trim()).filter(Boolean) : []
  const roomIdList = room_ids ? room_ids.split(',').map(s => s.trim()).filter(Boolean) : []

  if (vehicleIdList.length === 0 && roomIdList.length === 0) {
    return { vehicles: [], rooms: [] }
  }

  // ── Vehicles ────────────────────────────────────────────────────────────────
  const vehicleResults: VehicleAvailability[] = []

  if (vehicleIdList.length > 0) {
    // Fetch vehicle names (scoped to tenant for security)
    const { data: vehicleRows } = await supabase
      .from('vehicles')
      .select('id, name, marke, modell, farbe')
      .in('id', vehicleIdList)
      .eq('tenant_id', profile.tenant_id)

    const vehicleMap: Record<string, string> = {}
    for (const v of vehicleRows || []) {
      vehicleMap[v.id] = v.name || `${v.marke ?? ''} ${v.modell ?? ''}`.trim()
    }

    for (const vehicleId of vehicleIdList) {
      const vehicleName = vehicleMap[vehicleId] ?? vehicleId

      // Fetch conflicts from vehicle_bookings (lessons + course bookings)
      let vbQuery = supabase
        .from('vehicle_bookings')
        .select('id, start_time, end_time, purpose, appointment_id, course_id')
        .eq('vehicle_id', vehicleId)
        .neq('status', 'cancelled')
        .lt('start_time', end_time)
        .gt('end_time', start_time)

      if (exclude_appointment_id) {
        vbQuery = vbQuery.neq('appointment_id', exclude_appointment_id)
      }

      const { data: vbRows } = await vbQuery

      // Also check vehicle_rentals table
      const { data: vrRows } = await supabase
        .from('vehicle_rentals')
        .select('id, start_time, end_time, status')
        .eq('vehicle_id', vehicleId)
        .neq('status', 'cancelled')
        .lt('start_time', end_time)
        .gt('end_time', start_time)

      const conflicts: Conflict[] = []

      for (const row of vbRows || []) {
        const source = row.course_id ? 'course' : row.appointment_id ? 'lesson' : 'lesson'
        conflicts.push({
          start: row.start_time,
          end: row.end_time,
          source,
          label: source === 'course' ? 'Kurs' : 'Fahrstunde',
        })
      }

      for (const row of vrRows || []) {
        conflicts.push({
          start: row.start_time,
          end: row.end_time,
          source: 'rental',
          label: 'Vermietung',
        })
      }

      vehicleResults.push({
        id: vehicleId,
        name: vehicleName,
        is_available: conflicts.length === 0,
        conflicts,
      })
    }
  }

  // ── Rooms ────────────────────────────────────────────────────────────────────
  const roomResults: RoomAvailability[] = []

  if (roomIdList.length > 0) {
    // Fetch room names (own tenant or is_public rooms)
    const { data: roomRows } = await supabase
      .from('rooms')
      .select('id, name')
      .in('id', roomIdList)
      .or(`tenant_id.eq.${profile.tenant_id},is_public.eq.true`)

    const roomMap: Record<string, string> = {}
    for (const r of roomRows || []) {
      roomMap[r.id] = r.name
    }

    for (const roomId of roomIdList) {
      const roomName = roomMap[roomId] ?? roomId

      let rbQuery = supabase
        .from('room_bookings')
        .select('id, start_time, end_time, purpose, appointment_id')
        .eq('room_id', roomId)
        .neq('status', 'cancelled')
        .lt('start_time', end_time)
        .gt('end_time', start_time)

      if (exclude_appointment_id) {
        rbQuery = rbQuery.neq('appointment_id', exclude_appointment_id)
      }

      const { data: rbRows } = await rbQuery

      const conflicts: Conflict[] = (rbRows || []).map((row: any) => ({
        start: row.start_time,
        end: row.end_time,
        source: 'room_booking' as const,
        label: row.purpose === 'lesson' ? 'Fahrstunde'
          : row.purpose === 'course' ? 'Kurs'
          : row.purpose === 'rental' ? 'Vermietung'
          : 'Reserviert',
      }))

      roomResults.push({
        id: roomId,
        name: roomName,
        is_available: conflicts.length === 0,
        conflicts,
      })
    }
  }

  return {
    vehicles: vehicleResults,
    rooms: roomResults,
  }
})
