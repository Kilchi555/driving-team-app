import { describe, expect, it, vi } from 'vitest'
import {
  claimAvailabilitySlot,
  stillFreeOrFilter,
  type ClaimedAvailabilitySlot,
} from '~/server/utils/claim-availability-slot'

type ClaimResult = {
  data: ClaimedAvailabilitySlot | null
  error: { code: string; message: string } | null
}

function mockAdmin(result: ClaimResult) {
  const maybeSingle = vi.fn().mockResolvedValue(result)
  const select = vi.fn(() => ({ maybeSingle }))
  const or = vi.fn(() => ({ select }))
  const eq = vi.fn(() => ({ or }))
  const update = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ update }))
  return { supabase: { from }, update, eq, or, select, maybeSingle }
}

describe('claimAvailabilitySlot', () => {
  const now = new Date('2026-09-08T10:00:00.000Z')

  it('claims only when the row is still free or the hold expired', async () => {
    const claimed = {
      id: 'slot-1',
      tenant_id: 't1',
      staff_id: 's1',
      location_id: 'l1',
      start_time: '2026-09-08T12:00:00.000Z',
      end_time: '2026-09-08T13:00:00.000Z',
      duration_minutes: 60,
      reserved_until: '2026-09-08T10:05:00.000Z',
      reserved_by_session: 'sess-a',
    }
    const { supabase, update, eq, or } = mockAdmin({ data: claimed, error: null })

    const { data, error } = await claimAvailabilitySlot(supabase, {
      slotId: 'slot-1',
      sessionId: 'sess-a',
      reservedUntil: claimed.reserved_until,
      isPrimaryReservation: true,
    }, now)

    expect(error).toBeNull()
    expect(data?.id).toBe('slot-1')
    expect(update).toHaveBeenCalledWith({
      reserved_until: claimed.reserved_until,
      reserved_by_session: 'sess-a',
      is_primary_reservation: true,
    })
    expect(eq).toHaveBeenCalledWith('id', 'slot-1')
    expect(or).toHaveBeenCalledWith(stillFreeOrFilter(now.toISOString()))
  })

  it('returns no row when another session already holds the slot', async () => {
    const { supabase } = mockAdmin({ data: null, error: null })
    const { data, error } = await claimAvailabilitySlot(supabase, {
      slotId: 'slot-1',
      sessionId: 'sess-b',
      reservedUntil: '2026-09-08T10:05:00.000Z',
      isPrimaryReservation: true,
    }, now)

    expect(error).toBeNull()
    expect(data).toBeNull()
  })
})
