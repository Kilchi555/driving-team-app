/**
 * Interval overlap for appointments and external busy times.
 *
 * A multi-day block (e.g. Ferien Aug 25 → Sep 6) must still match a query
 * window that starts later (Sep 1). Filtering only on start_time >= windowStart
 * drops those events and leaves online-booking slots open.
 *
 * Overlap: existing.start < rangeEnd AND existing.end > rangeStart
 */

export function toIso(value: Date | string): string {
  return typeof value === 'string' ? value : value.toISOString()
}

export function intervalsOverlap(
  aStart: Date | string,
  aEnd: Date | string,
  bStart: Date | string,
  bEnd: Date | string,
): boolean {
  return new Date(aStart).getTime() < new Date(bEnd).getTime()
    && new Date(aEnd).getTime() > new Date(bStart).getTime()
}

export function applyTimeRangeOverlap<
  Q extends {
    lt: (column: string, value: string) => Q
    gt: (column: string, value: string) => Q
  },
>(query: Q, rangeStart: Date | string, rangeEnd: Date | string): Q {
  return query
    .lt('start_time', toIso(rangeEnd))
    .gt('end_time', toIso(rangeStart))
}

export function slotOverlapsAnyBusy(
  slot: { staff_id: string; start_time: string; end_time: string },
  busyTimes: Array<{ staff_id: string; start_time: string; end_time: string }>,
): boolean {
  return busyTimes.some(
    (bt) =>
      bt.staff_id === slot.staff_id
      && intervalsOverlap(slot.start_time, slot.end_time, bt.start_time, bt.end_time),
  )
}

export async function findStaffBusyOverlap(
  supabase: { from: (table: string) => any },
  opts: {
    staffId: string
    startTime: string
    endTime: string
    tenantId?: string
  },
): Promise<{ id: string; start_time: string; end_time: string } | null> {
  let query = supabase
    .from('external_busy_times')
    .select('id, start_time, end_time')
    .eq('staff_id', opts.staffId)
    .lt('start_time', opts.endTime)
    .gt('end_time', opts.startTime)
    .limit(1)

  if (opts.tenantId) {
    query = query.eq('tenant_id', opts.tenantId)
  }

  const { data, error } = await query.maybeSingle()
  if (error) return null
  return data ?? null
}
