/**
 * Atomic availability_slots reservation.
 * Compare-and-swap: the row is claimed only when it is free or the hold expired.
 * Callers must use getSupabaseAdmin() — this is not a Data-API / anon path.
 */

export type ClaimAvailabilitySlotParams = {
  slotId: string
  sessionId: string
  reservedUntil: string
  isPrimaryReservation: boolean
  extra?: Record<string, unknown>
}

export type ClaimedAvailabilitySlot = {
  id: string
  tenant_id: string
  staff_id: string
  location_id: string | null
  start_time: string
  end_time: string
  duration_minutes: number
  reserved_until: string
  reserved_by_session: string
}

export function stillFreeOrFilter(nowIso: string): string {
  return `reserved_by_session.is.null,reserved_until.lt.${nowIso}`
}

const CLAIM_SELECT =
  'id, tenant_id, staff_id, location_id, start_time, end_time, duration_minutes, reserved_until, reserved_by_session'

export async function claimAvailabilitySlot(
  supabase: any,
  params: ClaimAvailabilitySlotParams,
  now: Date = new Date(),
): Promise<{ data: ClaimedAvailabilitySlot | null; error: any }> {
  const nowIso = now.toISOString()
  const { data, error } = await supabase
    .from('availability_slots')
    .update({
      reserved_until: params.reservedUntil,
      reserved_by_session: params.sessionId,
      is_primary_reservation: params.isPrimaryReservation,
      ...(params.extra || {}),
    })
    .eq('id', params.slotId)
    .or(stillFreeOrFilter(nowIso))
    .select(CLAIM_SELECT)
    .maybeSingle()

  return { data: data || null, error }
}

export async function claimOverlappingAvailabilitySlots(
  supabase: any,
  params: {
    slotIds: string[]
    sessionId: string
    reservedUntil: string
  },
  now: Date = new Date(),
): Promise<{ error: any }> {
  if (params.slotIds.length === 0) return { error: null }
  const nowIso = now.toISOString()
  const { error } = await supabase
    .from('availability_slots')
    .update({
      reserved_until: params.reservedUntil,
      reserved_by_session: params.sessionId,
      is_primary_reservation: false,
    })
    .in('id', params.slotIds)
    .or(stillFreeOrFilter(nowIso))

  return { error }
}
