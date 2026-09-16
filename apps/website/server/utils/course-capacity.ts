/** Mirrors server/utils/course-capacity.ts — website app cannot alias the Simy root. */
const COURSE_CAPACITY_HINT = 'COURSE_FULL'
const COURSE_CAPACITY_MESSAGE = 'course_capacity_exceeded'

export function isCourseCapacityExceeded(err: unknown): boolean {
  if (err == null) return false
  if (typeof err === 'string') {
    return err.includes(COURSE_CAPACITY_MESSAGE) || err.includes(COURSE_CAPACITY_HINT)
  }
  const e = err as { message?: string; hint?: string; code?: string; details?: string; statusMessage?: string }
  const blob = [e.message, e.hint, e.code, e.details, e.statusMessage].filter(Boolean).join(' ')
  return blob.includes(COURSE_CAPACITY_MESSAGE) || blob.includes(COURSE_CAPACITY_HINT)
}
