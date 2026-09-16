/**
 * Course seat occupancy helpers.
 *
 * Production guarantee is the BEFORE INSERT/UPDATE trigger
 * `enforce_course_registration_capacity` (migrations/20260909_course_rls_and_atomic_capacity.sql).
 * Seat-consuming rows match recount_course_participants / adminEnrollInCourse:
 *   deleted_at IS NULL AND status IS DISTINCT FROM 'cancelled'
 *
 * ADMIN CAPACITY OVERRIDE: DOES NOT EXIST
 */
import { createError } from 'h3'

export const COURSE_CAPACITY_HINT = 'COURSE_FULL'
export const COURSE_CAPACITY_MESSAGE = 'course_capacity_exceeded'
export const COURSE_CAPACITY_HTTP_MESSAGE = 'Kurs ist bereits ausgebucht'

export function isCourseCapacityExceeded(err: unknown): boolean {
  if (err == null) return false
  if (typeof err === 'string') {
    return err.includes(COURSE_CAPACITY_MESSAGE) || err.includes(COURSE_CAPACITY_HINT)
  }
  const e = err as {
    message?: string
    hint?: string
    code?: string
    details?: string
    statusMessage?: string
  }
  const blob = [e.message, e.hint, e.code, e.details, e.statusMessage].filter(Boolean).join(' ')
  return blob.includes(COURSE_CAPACITY_MESSAGE) || blob.includes(COURSE_CAPACITY_HINT)
}

export function throwIfCourseCapacityExceeded(err: unknown): void {
  if (isCourseCapacityExceeded(err)) {
    throw createError({
      statusCode: 409,
      statusMessage: COURSE_CAPACITY_HTTP_MESSAGE,
    })
  }
}

export function registrationConsumesSeat(row: {
  status?: string | null
  deleted_at?: string | null
}): boolean {
  return row.deleted_at == null && row.status !== 'cancelled'
}

/** In-memory twin of the SQL FOR UPDATE + count + insert. Tests only. */
export type SimulatedRegistration = {
  id: string
  course_id: string
  status: string
  deleted_at: string | null
}

export class SimulatedCourseSeatLock {
  private tail = new Map<string, Promise<void>>()

  constructor(
    private readonly courses: Map<string, { max_participants: number }>,
    private readonly registrations: SimulatedRegistration[],
  ) {}

  private withCourseLock<T>(courseId: string, fn: () => T | Promise<T>): Promise<T> {
    const prev = this.tail.get(courseId) ?? Promise.resolve()
    let release!: () => void
    const next = new Promise<void>((resolve) => {
      release = resolve
    })
    this.tail.set(courseId, prev.then(() => next))
    return prev.then(async () => {
      try {
        return await fn()
      } finally {
        release()
      }
    })
  }

  claim(row: SimulatedRegistration): Promise<'claimed' | 'full'> {
    return this.withCourseLock(row.course_id, () => {
      const course = this.courses.get(row.course_id)
      if (!course) throw new Error('course_not_found')
      const occupying = this.registrations.filter(
        (r) => r.course_id === row.course_id && registrationConsumesSeat(r) && r.id !== row.id,
      ).length
      if (registrationConsumesSeat(row) && occupying >= course.max_participants) {
        return 'full'
      }
      this.registrations.push(row)
      return 'claimed'
    })
  }

  occupyingCount(courseId: string): number {
    return this.registrations.filter((r) => r.course_id === courseId && registrationConsumesSeat(r)).length
  }
}
