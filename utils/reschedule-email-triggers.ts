/** Customer-visible appointment fields that can trigger a change notification. */
export const VALID_RESCHEDULE_EMAIL_TRIGGERS = [
  'datetime',
  'duration',
  'staff',
  'location',
  'resource',
] as const

export type RescheduleEmailTrigger = (typeof VALID_RESCHEDULE_EMAIL_TRIGGERS)[number]

/** Default: notify only when date or start time changes. */
export const DEFAULT_RESCHEDULE_EMAIL_TRIGGERS: RescheduleEmailTrigger[] = ['datetime']

export function isRescheduleEmailTrigger(value: unknown): value is RescheduleEmailTrigger {
  return typeof value === 'string' && (VALID_RESCHEDULE_EMAIL_TRIGGERS as readonly string[]).includes(value)
}

/**
 * Missing / invalid policy values fall back to the default.
 * An explicit empty array means “never notify on edits”.
 */
export function normalizeRescheduleEmailTriggers(value: unknown): RescheduleEmailTrigger[] {
  if (!Array.isArray(value)) return [...DEFAULT_RESCHEDULE_EMAIL_TRIGGERS]
  return value.filter(isRescheduleEmailTrigger)
}

/**
 * Omitted / non-array = legacy callers that only meant “time moved”.
 * An explicit array (including empty) is taken as-is after filtering.
 */
export function parseRescheduleChangedFields(value: unknown): RescheduleEmailTrigger[] {
  if (!Array.isArray(value)) return [...DEFAULT_RESCHEDULE_EMAIL_TRIGGERS]
  return value.filter(isRescheduleEmailTrigger)
}

export function shouldNotifyRescheduleChange(
  policyTriggers: unknown,
  changedFields: unknown,
): boolean {
  const enabled = normalizeRescheduleEmailTriggers(policyTriggers)
  const changed = parseRescheduleChangedFields(changedFields)
  return changed.some((field) => enabled.includes(field))
}

export type AppointmentChangeSnapshot = {
  startDate?: string | null
  startTime?: string | null
  duration_minutes?: number | null
  staff_id?: string | null
  location_id?: string | null
  custom_location_name?: string | null
  vehicle_id?: string | null
  vehicle_mode?: string | null
  room_id?: string | null
}

function normalizeId(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizeTime(value: unknown): string {
  return String(value ?? '').trim().substring(0, 5)
}

export function detectRescheduleChanges(
  before: AppointmentChangeSnapshot,
  after: AppointmentChangeSnapshot,
): RescheduleEmailTrigger[] {
  const changed: RescheduleEmailTrigger[] = []

  const beforeDate = String(before.startDate || '').trim()
  const afterDate = String(after.startDate || '').trim()
  const beforeTime = normalizeTime(before.startTime)
  const afterTime = normalizeTime(after.startTime)
  if (beforeDate && afterDate && (beforeDate !== afterDate || beforeTime !== afterTime)) {
    changed.push('datetime')
  }

  const beforeDuration = Number(before.duration_minutes)
  const afterDuration = Number(after.duration_minutes)
  if (
    Number.isFinite(beforeDuration) &&
    Number.isFinite(afterDuration) &&
    beforeDuration !== afterDuration
  ) {
    changed.push('duration')
  }

  const beforeStaff = normalizeId(before.staff_id)
  const afterStaff = normalizeId(after.staff_id)
  if (beforeStaff && afterStaff && beforeStaff !== afterStaff) {
    changed.push('staff')
  }

  if (
    normalizeId(before.location_id) !== normalizeId(after.location_id) ||
    String(before.custom_location_name || '').trim() !== String(after.custom_location_name || '').trim()
  ) {
    changed.push('location')
  }

  if (
    normalizeId(before.vehicle_id) !== normalizeId(after.vehicle_id) ||
    normalizeId(before.room_id) !== normalizeId(after.room_id) ||
    normalizeId(before.vehicle_mode) !== normalizeId(after.vehicle_mode)
  ) {
    changed.push('resource')
  }

  return changed
}
