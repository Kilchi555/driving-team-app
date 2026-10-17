import { describe, expect, it } from 'vitest'
import { landingScrollBehavior } from '../website-landing-scroll'

describe('landingScrollBehavior', () => {
  it('keeps the smooth scroll used by the pickup check', () => {
    expect(landingScrollBehavior(false)).toBe('smooth')
  })

  it('jumps immediately when reduced motion is requested', () => {
    expect(landingScrollBehavior(true)).toBe('auto')
  })
})
