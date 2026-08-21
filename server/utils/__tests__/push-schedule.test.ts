import { describe, expect, it } from 'vitest'
import { daytimePushSendAt, SCHEDULED_PUSH_HOUR_UTC } from '../push'

describe('daytimePushSendAt', () => {
  it('holds a 03:00 UTC reminder until 07:00 UTC', () => {
    const now = new Date('2026-08-19T03:00:00.000Z')
    expect(daytimePushSendAt(now).toISOString()).toBe('2026-08-19T07:00:00.000Z')
  })

  it('does not delay once the quiet window has passed', () => {
    const now = new Date('2026-08-19T07:02:00.000Z')
    expect(daytimePushSendAt(now).toISOString()).toBe(now.toISOString())
  })

  it('uses 07:00 UTC as the morning cutoff', () => {
    expect(SCHEDULED_PUSH_HOUR_UTC).toBe(7)
  })
})
