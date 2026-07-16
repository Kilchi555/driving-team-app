/**
 * Room availability + auto-assignment utility.
 *
 * room_bookings is the single source of truth for room reservations
 * (lessons, courses, rentals, manual blocks).
 *
 * Rooms are never chosen manually by the customer or staff — the admin
 * configures, per category + booking service type (Fahrstunde/Theorie/
 * Beratung), whether a room is required/optional and which rooms are
 * allowed. The system then auto-picks a free room from that pool.
 */

export type RoomServiceType = 'fahrstunde' | 'theorie' | 'beratung'

export interface RoomRule {
  mode: 'none' | 'optional' | 'required'
  allowed_room_ids: string[]
}

const NO_ROOM_RULE: RoomRule = { mode: 'none', allowed_room_ids: [] }

/**
 * Resolve the effective room rule for a given location + category + service
 * type, falling back to the category-level default when the location has no
 * override configured. Mirrors resolveVehicleSettings() in
 * vehicle-availability.ts.
 */
export function resolveRoomSettings(
  locationRoomSettings: Record<string, Partial<Record<RoomServiceType, RoomRule>>> | null | undefined,
  categoryRoomSettings: Partial<Record<RoomServiceType, RoomRule>> | null | undefined,
  categoryCode: string,
  serviceType: RoomServiceType
): RoomRule {
  const locRule = locationRoomSettings?.[categoryCode]?.[serviceType]
  if (locRule?.mode === 'none') return NO_ROOM_RULE
  if (locRule?.mode && locRule.allowed_room_ids?.length) return locRule

  const catRule = categoryRoomSettings?.[serviceType]
  if (catRule?.mode && catRule.mode !== 'none' && catRule.allowed_room_ids?.length) return catRule

  return NO_ROOM_RULE
}

/**
 * Maps internal appointment event types to the booking service type used by
 * room rules. There is no internal 'beratung' appointment type (consultations
 * are only created via the online booking wizard), and exams share the same
 * room pool as regular lessons.
 */
export function eventTypeCodeToRoomServiceType(eventTypeCode: string | null | undefined): RoomServiceType {
  if (eventTypeCode === 'theory') return 'theorie'
  return 'fahrstunde'
}

/**
 * Check whether a specific room is free for the given time window.
 */
export async function isRoomAvailable(
  supabase: any,
  {
    roomId,
    startTime,
    endTime,
  }: {
    roomId: string
    startTime: string
    endTime: string
  }
): Promise<boolean> {
  const { data, error } = await supabase
    .from('room_bookings')
    .select('id')
    .eq('room_id', roomId)
    .neq('status', 'cancelled')
    .lt('start_time', endTime)
    .gt('end_time', startTime)
    .limit(1)

  if (error) return false
  return (data?.length ?? 0) === 0
}

/**
 * Given a pool of allowed room IDs, return the first one that's free for the
 * given time window (in list order — admins can order the list by priority).
 * Returns null when none of the rooms are available.
 */
export async function pickAvailableRoomId(
  supabase: any,
  {
    allowedRoomIds,
    startTime,
    endTime,
  }: {
    allowedRoomIds: string[]
    startTime: string
    endTime: string
  }
): Promise<string | null> {
  for (const roomId of allowedRoomIds) {
    const available = await isRoomAvailable(supabase, { roomId, startTime, endTime })
    if (available) return roomId
  }
  return null
}

/**
 * Whether at least one room in the pool is free for the given time window.
 * Used to filter out bookable slots when a room is required.
 */
export async function isAnyRoomAvailable(
  supabase: any,
  {
    allowedRoomIds,
    startTime,
    endTime,
  }: {
    allowedRoomIds: string[]
    startTime: string
    endTime: string
  }
): Promise<boolean> {
  const checks = await Promise.all(
    allowedRoomIds.map(roomId => isRoomAvailable(supabase, { roomId, startTime, endTime }))
  )
  return checks.some(Boolean)
}
