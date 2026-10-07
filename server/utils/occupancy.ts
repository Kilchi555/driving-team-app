/**
 * Canonical staff occupancy.
 *
 * A row occupies staff time iff:
 *   deleted_at IS NULL
 *   AND status NOT IN ('cancelled', 'deleted')
 *   AND occupies_staff IS TRUE
 *
 * pending blocks. cancelled / deleted do not. status='scheduled' is not
 * an active booking semantic and must not be used as a filter.
 */

export const INACTIVE_OCCUPANCY_STATUSES = ['cancelled', 'deleted'] as const

export const POSTGREST_INACTIVE_OCCUPANCY_IN = '("cancelled","deleted")'

export function appointmentOccupiesStaff(row: {
  deleted_at?: string | null
  status?: string | null
  occupies_staff?: boolean | null
}): boolean {
  return row.deleted_at == null
    && row.status !== 'cancelled'
    && row.status !== 'deleted'
    && row.occupies_staff !== false
}

export function applyCanonicalOccupancyFilter<Q extends {
  is: (column: string, value: null) => Q
  not: (column: string, operator: string, value: string) => Q
  eq: (column: string, value: boolean) => Q
}>(query: Q): Q {
  return query
    .is('deleted_at', null)
    .not('status', 'in', POSTGREST_INACTIVE_OCCUPANCY_IN)
    .eq('occupies_staff', true)
}

/** pending (and leftover scheduled) may move to confirmed. cancelled/deleted never resurrect. */
export function appointmentMayConfirmFromPayment(row: {
  status?: string | null
  deleted_at?: string | null
}): boolean {
  if (row.deleted_at) return false
  if (row.status === 'cancelled' || row.status === 'deleted') return false
  return row.status === 'pending' || row.status === 'scheduled'
}

export function timesOverlap(
  startA: string | Date,
  endA: string | Date,
  startB: string | Date,
  endB: string | Date
): boolean {
  return new Date(startA).getTime() < new Date(endB).getTime()
    && new Date(endA).getTime() > new Date(startB).getTime()
}
