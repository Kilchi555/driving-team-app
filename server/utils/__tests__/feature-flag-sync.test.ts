import { describe, expect, it } from 'vitest'
import { resolveSyncedFeatureEnabled } from '~/utils/featureCatalog'

describe('resolveSyncedFeatureEnabled', () => {
  it('defaults evaluations on from the plan when no row exists', () => {
    expect(resolveSyncedFeatureEnabled({
      flag: 'evaluations_enabled',
      planEnables: true,
      isDrivingSchool: false,
    })).toBe(true)
  })

  it('keeps an admin off-switch for evaluations on later plan sync', () => {
    expect(resolveSyncedFeatureEnabled({
      flag: 'evaluations_enabled',
      planEnables: true,
      isDrivingSchool: false,
      existing: false,
    })).toBe(false)
    expect(resolveSyncedFeatureEnabled({
      flag: 'evaluations_enabled',
      planEnables: true,
      isDrivingSchool: true,
      existing: false,
    })).toBe(false)
  })

  it('keeps Fahrschul-only flags off for other verticals unless already on', () => {
    expect(resolveSyncedFeatureEnabled({
      flag: 'exams_enabled',
      planEnables: true,
      isDrivingSchool: false,
    })).toBe(false)
    expect(resolveSyncedFeatureEnabled({
      flag: 'exams_enabled',
      planEnables: true,
      isDrivingSchool: false,
      existing: true,
    })).toBe(true)
  })
})
