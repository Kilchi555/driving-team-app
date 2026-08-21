import { describe, expect, it } from 'vitest'
import { shouldAutoPublishReview } from '../gbp-automation'

describe('shouldAutoPublishReview', () => {
  it('publishes every review in auto_all', () => {
    expect(shouldAutoPublishReview('auto_all', 1)).toBe(true)
    expect(shouldAutoPublishReview('auto_all', 5)).toBe(true)
  })

  it('publishes only 4–5 stars in auto_ge_4', () => {
    expect(shouldAutoPublishReview('auto_ge_4', 3)).toBe(false)
    expect(shouldAutoPublishReview('auto_ge_4', 4)).toBe(true)
    expect(shouldAutoPublishReview('auto_ge_4', 5)).toBe(true)
  })

  it('never auto-publishes in suggest or off', () => {
    expect(shouldAutoPublishReview('suggest', 5)).toBe(false)
    expect(shouldAutoPublishReview('off', 5)).toBe(false)
    expect(shouldAutoPublishReview(null, 5)).toBe(false)
  })
})
