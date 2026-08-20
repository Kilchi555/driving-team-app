import { isStudentCompleted, type StudentExamInfo } from '~/utils/student-exam'

export const UPCOMING_APPOINTMENT_STATUSES = [
  'scheduled',
  'confirmed',
  'pending_confirmation',
  'booked'
] as const

export const IGNORED_LAST_APPOINTMENT_STATUSES = ['cancelled', 'rescheduled'] as const

export type StudentIdleFilter = 'all' | 'no_upcoming' | '14' | '30' | '60' | '90' | 'never'

export const STUDENT_IDLE_FILTER_OPTIONS: { value: StudentIdleFilter, label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'no_upcoming', label: 'Kein nächster' },
  { value: '14', label: '≥ 2 Wo' },
  { value: '30', label: '≥ 1 Mo' },
  { value: '60', label: '≥ 2 Mo' },
  { value: '90', label: '≥ 3 Mo' },
  { value: 'never', label: 'Nie' }
]

export interface StudentAppointmentActivity {
  lastStartTime: string | null
  hasUpcoming: boolean
}

export interface AppointmentActivityRow {
  user_id: string | null
  start_time: string | null
  status: string | null
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function isUpcomingAppointmentStatus(status: string | null | undefined): boolean {
  return !!status && (UPCOMING_APPOINTMENT_STATUSES as readonly string[]).includes(status)
}

export function countsTowardLastAppointment(status: string | null | undefined): boolean {
  return !!status && !(IGNORED_LAST_APPOINTMENT_STATUSES as readonly string[]).includes(status)
}

export function aggregateStudentAppointmentActivity(
  rows: AppointmentActivityRow[],
  studentIds: string[],
  now: Date = new Date()
): Record<string, StudentAppointmentActivity> {
  const nowMs = now.getTime()
  const result: Record<string, StudentAppointmentActivity> = {}

  for (const id of studentIds) {
    result[id] = { lastStartTime: null, hasUpcoming: false }
  }

  for (const row of rows) {
    const userId = row.user_id
    if (!userId || !result[userId] || !row.start_time) continue

    const startMs = new Date(row.start_time).getTime()
    if (Number.isNaN(startMs)) continue

    if (countsTowardLastAppointment(row.status)) {
      const current = result[userId].lastStartTime
      if (!current || startMs > new Date(current).getTime()) {
        result[userId].lastStartTime = row.start_time
      }
    }

    if (startMs > nowMs && isUpcomingAppointmentStatus(row.status)) {
      result[userId].hasUpcoming = true
    }
  }

  return result
}

export function matchesIdleFilter(
  activity: StudentAppointmentActivity | undefined,
  filter: StudentIdleFilter | number,
  now: Date = new Date()
): boolean {
  if (filter === 'all') return true

  const hasUpcoming = activity?.hasUpcoming === true
  const lastStartTime = activity?.lastStartTime ?? null

  if (filter === 'no_upcoming') return !hasUpcoming
  if (hasUpcoming) return false
  if (filter === 'never') return !lastStartTime

  const minDays = Number(filter)
  if (!Number.isFinite(minDays) || minDays <= 0) return !hasUpcoming
  if (!lastStartTime) return true

  return new Date(lastStartTime).getTime() <= now.getTime() - minDays * MS_PER_DAY
}

export function compareByLastAppointmentOldestFirst(
  a: StudentAppointmentActivity | undefined,
  b: StudentAppointmentActivity | undefined
): number {
  const aTime = a?.lastStartTime ? new Date(a.lastStartTime).getTime() : null
  const bTime = b?.lastStartTime ? new Date(b.lastStartTime).getTime() : null
  if (aTime === null && bTime === null) return 0
  if (aTime === null) return -1
  if (bTime === null) return 1
  return aTime - bTime
}

export function filterIdleStudents<T extends StudentExamInfo & { id: string }>(
  students: T[],
  activityById: Record<string, StudentAppointmentActivity>,
  filter: StudentIdleFilter | number,
  now: Date = new Date()
): T[] {
  if (filter === 'all') return students

  return students.filter((student) => {
    if (isStudentCompleted(student)) return false
    return matchesIdleFilter(activityById[student.id], filter, now)
  })
}
