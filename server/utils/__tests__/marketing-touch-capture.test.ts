import { describe, test } from 'vitest'
import { runMarketingTouchCaptureChecks } from './marketing-touch-capture-checks'

describe('marketing touch capture', () => {
  test('classifies signals, credits the earliest touch, and keeps legacy acquisition separate', () => {
    runMarketingTouchCaptureChecks()
  })
})
