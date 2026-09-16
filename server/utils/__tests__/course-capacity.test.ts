import { describe, expect, it } from 'vitest'
import { createError } from 'h3'
import {
  isCourseCapacityExceeded,
  registrationConsumesSeat,
  SimulatedCourseSeatLock,
  throwIfCourseCapacityExceeded,
  type SimulatedRegistration,
} from '../course-capacity'

describe('isCourseCapacityExceeded', () => {
  it('detects the trigger message and hint', () => {
    expect(isCourseCapacityExceeded({ message: 'course_capacity_exceeded', hint: 'COURSE_FULL' })).toBe(true)
    expect(isCourseCapacityExceeded({ hint: 'COURSE_FULL' })).toBe(true)
    expect(isCourseCapacityExceeded('course_capacity_exceeded')).toBe(true)
  })

  it('does not treat unique violations as capacity errors', () => {
    expect(isCourseCapacityExceeded({
      code: '23505',
      message: 'duplicate key value violates unique constraint "idx_course_registrations_unique_email"',
    })).toBe(false)
    expect(isCourseCapacityExceeded(null)).toBe(false)
  })
})

describe('throwIfCourseCapacityExceeded', () => {
  it('maps capacity errors to HTTP 409', () => {
    try {
      throwIfCourseCapacityExceeded({ message: 'course_capacity_exceeded', hint: 'COURSE_FULL' })
      throw new Error('expected throw')
    } catch (err: unknown) {
      expect(err).toMatchObject({ statusCode: 409, statusMessage: 'Kurs ist bereits ausgebucht' })
    }
  })

  it('does not throw for other errors', () => {
    expect(() => throwIfCourseCapacityExceeded({ message: 'duplicate key' })).not.toThrow()
  })
})

describe('registrationConsumesSeat', () => {
  it('matches recount_course_participants / adminEnrollInCourse', () => {
    expect(registrationConsumesSeat({ status: 'confirmed', deleted_at: null })).toBe(true)
    expect(registrationConsumesSeat({ status: 'pending', deleted_at: null })).toBe(true)
    expect(registrationConsumesSeat({ status: 'waitlist', deleted_at: null })).toBe(true)
    expect(registrationConsumesSeat({ status: 'completed', deleted_at: null })).toBe(true)
    expect(registrationConsumesSeat({ status: 'cancelled', deleted_at: null })).toBe(false)
    expect(registrationConsumesSeat({ status: 'confirmed', deleted_at: '2026-09-09T00:00:00Z' })).toBe(false)
  })
})

describe('concurrent last-seat claim (FOR UPDATE twin)', () => {
  it('exactly one of two overlapping claims succeeds when max_participants = 1', async () => {
    const regs: SimulatedRegistration[] = []
    const lock = new SimulatedCourseSeatLock(
      new Map([['course-1', { max_participants: 1 }]]),
      regs,
    )

    const started: number[] = []
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })

    const claim = (id: string) => {
      started.push(1)
      return gate.then(() => lock.claim({
        id,
        course_id: 'course-1',
        status: 'confirmed',
        deleted_at: null,
      }))
    }

    const p1 = claim('a')
    const p2 = claim('b')
    expect(started).toHaveLength(2)
    release()

    const results = await Promise.all([p1, p2])
    const claimed = results.filter((r) => r === 'claimed')
    const full = results.filter((r) => r === 'full')
    expect(claimed).toHaveLength(1)
    expect(full).toHaveLength(1)
    expect(lock.occupyingCount('course-1')).toBe(1)
  })

  it('cancel then restore is rejected when the course is already full', async () => {
    const regs: SimulatedRegistration[] = [
      { id: 'kept', course_id: 'course-1', status: 'confirmed', deleted_at: null },
      { id: 'removed', course_id: 'course-1', status: 'confirmed', deleted_at: '2026-09-01T00:00:00Z' },
    ]
    const lock = new SimulatedCourseSeatLock(
      new Map([['course-1', { max_participants: 1 }]]),
      regs,
    )

    const restore = await lock.claim({
      id: 'removed',
      course_id: 'course-1',
      status: 'confirmed',
      deleted_at: null,
    })
    expect(restore).toBe('full')
    expect(lock.occupyingCount('course-1')).toBe(1)
  })

  it('cancel/remove frees the seat for a new claim', async () => {
    const regs: SimulatedRegistration[] = [
      { id: 'removed', course_id: 'course-1', status: 'confirmed', deleted_at: '2026-09-01T00:00:00Z' },
    ]
    const lock = new SimulatedCourseSeatLock(
      new Map([['course-1', { max_participants: 1 }]]),
      regs,
    )
    const result = await lock.claim({
      id: 'new',
      course_id: 'course-1',
      status: 'confirmed',
      deleted_at: null,
    })
    expect(result).toBe('claimed')
    expect(lock.occupyingCount('course-1')).toBe(1)
  })
})

describe('createError shape used by enroll APIs', () => {
  it('409 capacity errors are distinguishable from 500s', () => {
    const err = createError({ statusCode: 409, statusMessage: 'Kurs ist bereits ausgebucht' })
    expect(err.statusCode).toBe(409)
  })
})
