import { describe, test } from 'vitest'
import { runBookingContextSecurityChecks } from './booking-context-security-checks'

describe('booking tenant context', () => {
  test('binds marketing touch tenant to the signed booking context', () => {
    runBookingContextSecurityChecks()
  })
})
