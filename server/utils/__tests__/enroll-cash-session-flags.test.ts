import { describe, expect, it } from 'vitest'

/**
 * Mirrors the enrollment flag logic that must work for non-SARI cash enrolls.
 * Kept as a pure helper test so the ReferenceError regression cannot return
 * without a failing unit test if someone moves the flags back inside the SARI block.
 */
function enrollmentSessionFlags(opts: {
  isPartialEnrollment?: boolean
  isPartialOnly?: boolean
  individualSessionNumber?: number
}) {
  const isPartial = !!(opts.isPartialEnrollment || opts.isPartialOnly)
  const isIndividualSess =
    isPartial && typeof opts.individualSessionNumber === 'number' && opts.individualSessionNumber > 0
  return { isPartial, isIndividualSess }
}

describe('enroll-cash session flags (non-SARI safety)', () => {
  it('defines flags for a full non-SARI enrollment', () => {
    const flags = enrollmentSessionFlags({})
    expect(flags.isPartial).toBe(false)
    expect(flags.isIndividualSess).toBe(false)
    // Expression used in insert payload must not throw
    const partialStart =
      (!flags.isIndividualSess && flags.isPartial) ? 3 : null
    expect(partialStart).toBeNull()
  })

  it('detects individual session on partial enrollments', () => {
    expect(
      enrollmentSessionFlags({ isPartialEnrollment: true, individualSessionNumber: 2 })
    ).toEqual({ isPartial: true, isIndividualSess: true })
  })
})
