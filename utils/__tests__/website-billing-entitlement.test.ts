import { describe, expect, it } from 'vitest'
import {
  decideWebsiteLiveEntitlement,
  websitePublishBlockedReason,
  type WebsiteLiveEntitlementDecision,
  type WebsiteLiveEntitlementInput,
} from '../website-billing'

const entitledHost: WebsiteLiveEntitlementInput = {
  website_only: false,
  setup_evidence: { state: 'confirmed_paid', paidAt: '2026-01-15T12:00:00.000Z' },
  hosting_evidence: { state: 'active', plan: 'host' },
}

function decide(input: WebsiteLiveEntitlementInput | null | undefined): WebsiteLiveEntitlementDecision {
  return decideWebsiteLiveEntitlement(input)
}

describe('decideWebsiteLiveEntitlement', () => {
  it('1. SaaS tenant with confirmed setup + active hosting → ENTITLED', () => {
    const d = decide({
      ...entitledHost,
      website_only: false,
      saas_subscription_active: true,
      saas_subscription_plan: 'starter',
    })
    expect(d.status).toBe('ENTITLED')
    expect(d.mayPublishLive).toBe(true)
    expect(d.setup).toBe('confirmed')
    expect(d.hosting).toBe('confirmed')
    expect(d.reasons).toEqual(['setup_and_hosting_confirmed'])
  })

  it('2. SaaS subscription only → never ENTITLED', () => {
    const d = decide({
      website_only: false,
      saas_subscription_active: true,
      saas_subscription_plan: 'starter',
      setup_evidence: { state: 'unknown' },
      hosting_evidence: { state: 'unknown' },
    })
    expect(d.status).toBe('UNVERIFIED')
    expect(d.mayPublishLive).toBe(false)
    expect(d.reasons).toContain('saas_subscription_not_website_entitlement')
    expect(d.reasons).toContain('setup_unverified')
    expect(d.reasons).toContain('hosting_unverified')
  })

  it('3. Website-only tenant with complete confirmed entitlement → ENTITLED', () => {
    const d = decide({
      website_only: true,
      setup_evidence: { state: 'confirmed_paid' },
      hosting_evidence: { state: 'active', plan: 'host' },
    })
    expect(d.status).toBe('ENTITLED')
    expect(d.mayPublishLive).toBe(true)
    expect(d.reasons).toEqual(['setup_and_hosting_confirmed'])
  })

  it('4. Setup paid but no hosting/Care plan → PAYMENT_REQUIRED', () => {
    const d = decide({
      setup_evidence: { state: 'confirmed_paid' },
      hosting_evidence: { state: 'inactive' },
    })
    expect(d.status).toBe('PAYMENT_REQUIRED')
    expect(d.setup).toBe('confirmed')
    expect(d.hosting).toBe('unpaid')
    expect(d.mayPublishLive).toBe(false)
    expect(d.reasons).toContain('hosting_inactive')
    expect(d.reasons).toContain('hosting_plan_required')
  })

  it('5. Hosting active but setup payment unverified → UNVERIFIED', () => {
    const d = decide({
      setup_evidence: { state: 'unknown' },
      hosting_evidence: { state: 'active', plan: 'host' },
    })
    expect(d.status).toBe('UNVERIFIED')
    expect(d.setup).toBe('unverified')
    expect(d.hosting).toBe('confirmed')
    expect(d.mayPublishLive).toBe(false)
    expect(d.reasons).toContain('setup_unverified')
  })

  it('6. Setup missing locally while external payment status unknown → UNVERIFIED', () => {
    const d = decide({
      website_setup_paid_at: null,
      website_hosting_plan: null,
      setup_evidence: { state: 'unknown' },
      hosting_evidence: { state: 'unknown' },
    })
    expect(d.status).toBe('UNVERIFIED')
    expect(d.mayPublishLive).toBe(false)
    expect(d.reasons).toContain('setup_unverified')
    expect(d.reasons).toContain('hosting_unverified')
  })

  it('7. Authoritative evidence that setup is unpaid → PAYMENT_REQUIRED', () => {
    const d = decide({
      setup_evidence: { state: 'confirmed_unpaid' },
      hosting_evidence: { state: 'active', plan: 'host' },
    })
    expect(d.status).toBe('PAYMENT_REQUIRED')
    expect(d.setup).toBe('unpaid')
    expect(d.hosting).toBe('confirmed')
    expect(d.reasons).toContain('setup_payment_required')
    expect(d.mayPublishLive).toBe(false)
  })

  it('8. Expired or canceled hosting subscription → PAYMENT_REQUIRED', () => {
    const expired = decide({
      setup_evidence: { state: 'confirmed_paid' },
      hosting_evidence: { state: 'expired' },
    })
    expect(expired.status).toBe('PAYMENT_REQUIRED')
    expect(expired.reasons).toContain('hosting_inactive')

    const canceled = decide({
      setup_evidence: { state: 'confirmed_paid' },
      hosting_evidence: { state: 'canceled' },
    })
    expect(canceled.status).toBe('PAYMENT_REQUIRED')
    expect(canceled.reasons).toContain('hosting_plan_required')
  })

  it('9. Active Care plan under existing product model (Care as alternative plan) → ENTITLED', () => {
    const d = decide({
      website_only: true,
      setup_evidence: { state: 'confirmed_paid' },
      hosting_evidence: { state: 'active', plan: 'care' },
    })
    expect(d.status).toBe('ENTITLED')
    expect(d.hosting).toBe('confirmed')
    expect(d.reasons).toEqual(['setup_and_hosting_confirmed'])
  })

  it('10. Unknown hosting-plan value → MANUAL_REVIEW', () => {
    const d = decide({
      setup_evidence: { state: 'confirmed_paid' },
      hosting_evidence: { state: 'unknown_plan', plan: 'premium_plus' },
    })
    expect(d.status).toBe('MANUAL_REVIEW')
    expect(d.hosting).toBe('review')
    expect(d.reasons).toContain('unknown_hosting_plan')
    expect(d.mayPublishLive).toBe(false)
  })

  it('11. Refund or chargeback → MANUAL_REVIEW', () => {
    const setupRefund = decide({
      setup_evidence: { state: 'refunded' },
      hosting_evidence: { state: 'active', plan: 'host' },
    })
    expect(setupRefund.status).toBe('MANUAL_REVIEW')
    expect(setupRefund.reasons).toContain('setup_refunded_or_disputed')

    const hostingChargeback = decide({
      setup_evidence: { state: 'confirmed_paid' },
      hosting_evidence: { state: 'chargeback' },
    })
    expect(hostingChargeback.status).toBe('MANUAL_REVIEW')
    expect(hostingChargeback.reasons).toContain('hosting_refunded_or_disputed')
  })

  it('12. Conflicting local and authoritative payment evidence → MANUAL_REVIEW', () => {
    const d = decide({
      website_setup_paid_at: '2026-01-01T00:00:00.000Z',
      setup_evidence: { state: 'conflicting' },
      hosting_evidence: { state: 'active', plan: 'host' },
    })
    expect(d.status).toBe('MANUAL_REVIEW')
    expect(d.reasons).toContain('conflicting_evidence')
    expect(d.mayPublishLive).toBe(false)
  })

  it('13. Missing or malformed evidence → UNVERIFIED / MANUAL_REVIEW', () => {
    const missing = decide(null)
    expect(missing.status).toBe('UNVERIFIED')
    expect(missing.reasons).toContain('setup_unverified')
    expect(missing.reasons).toContain('hosting_unverified')
    expect(missing.mayPublishLive).toBe(false)

    const malformed = decide({
      setup_evidence: { state: 'malformed' },
      hosting_evidence: { state: 'malformed' },
    })
    expect(malformed.status).toBe('MANUAL_REVIEW')
    expect(malformed.reasons).toContain('malformed_evidence')
  })

  it('14. Explicit manual-review case → MANUAL_REVIEW', () => {
    const d = decide({
      ...entitledHost,
      manual_review_required: true,
    })
    expect(d.status).toBe('MANUAL_REVIEW')
    expect(d.reasons).toEqual(['manual_review_required'])
    expect(d.mayPublishLive).toBe(false)
  })

  it('15. Regression: website_only = false does not bypass entitlement', () => {
    const d = decide({
      website_only: false,
      website_setup_paid_at: '2026-01-01T00:00:00.000Z',
      website_hosting_plan: 'host',
      setup_evidence: { state: 'unknown' },
      hosting_evidence: { state: 'unknown' },
    })
    expect(d.status).not.toBe('ENTITLED')
    expect(d.mayPublishLive).toBe(false)
  })

  it('16. Regression: SaaS subscription status alone never yields ENTITLED', () => {
    for (const plan of ['starter', 'pro', 'enterprise']) {
      const d = decide({
        website_only: false,
        saas_subscription_active: true,
        saas_subscription_plan: plan,
      })
      expect(d.status).not.toBe('ENTITLED')
      expect(d.mayPublishLive).toBe(false)
    }
  })

  it('17. Determinism: identical inputs produce identical decisions', () => {
    const input: WebsiteLiveEntitlementInput = {
      website_only: false,
      saas_subscription_active: true,
      setup_evidence: { state: 'confirmed_unpaid' },
      hosting_evidence: { state: 'expired' },
    }
    const a = decide(input)
    const b = decide(input)
    expect(a).toEqual(b)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('18. Purity: no process.env / mutation of input', () => {
    const input: WebsiteLiveEntitlementInput = {
      website_only: true,
      website_setup_paid_at: null,
      setup_evidence: { state: 'confirmed_paid' },
      hosting_evidence: { state: 'active', plan: 'host' },
    }
    const before = JSON.stringify(input)
    const envBefore = JSON.stringify(process.env)

    const d = decide(input)
    expect(d.status).toBe('ENTITLED')

    expect(JSON.stringify(input)).toBe(before)
    expect(JSON.stringify(process.env)).toBe(envBefore)
  })

  it('local cache alone never yields ENTITLED even when fields look complete', () => {
    const d = decide({
      website_only: true,
      website_setup_paid_at: '2026-01-01T00:00:00.000Z',
      website_hosting_plan: 'host',
    })
    expect(d.status).toBe('UNVERIFIED')
    expect(d.mayPublishLive).toBe(false)
  })

  it('mixed unpaid + unverified prefers UNVERIFIED over PAYMENT_REQUIRED', () => {
    const d = decide({
      setup_evidence: { state: 'confirmed_unpaid' },
      hosting_evidence: { state: 'unknown' },
    })
    expect(d.status).toBe('UNVERIFIED')
    expect(d.reasons).toContain('setup_payment_required')
    expect(d.reasons).toContain('hosting_unverified')
  })
})

describe('websitePublishBlockedReason (legacy adapter — enforcement deferred)', () => {
  it('still exempts SaaS tenants (website_only falsy) — production behaviour unchanged', () => {
    expect(
      websitePublishBlockedReason({
        website_only: false,
        website_setup_paid_at: null,
        website_hosting_plan: null,
      }),
    ).toBeNull()
  })

  it('still blocks website-only without setup', () => {
    expect(
      websitePublishBlockedReason({
        website_only: true,
        website_setup_paid_at: null,
        website_hosting_plan: 'host',
      }),
    ).toBe('setup')
  })

  it('still blocks website-only without hosting plan', () => {
    expect(
      websitePublishBlockedReason({
        website_only: true,
        website_setup_paid_at: '2026-01-01T00:00:00.000Z',
        website_hosting_plan: null,
      }),
    ).toBe('hosting')
  })
})
