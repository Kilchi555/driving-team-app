import { describe, expect, it } from 'vitest'
import {
  evaluateWebsiteEvidenceOwnership,
  reconcileWebsiteHostingEvidence,
  reconcileWebsiteLiveEntitlement,
  reconcileWebsiteSetupEvidence,
  WEBSITE_ENTITLEMENT_ENFORCEMENT_WIRED,
  type WebsiteEntitlementObservations,
} from '../website-entitlement-reconcile'
import {
  assertWebsiteLiveEntitlementOrThrow,
  prepareWebsiteLiveEntitlementDecision,
} from '~/server/utils/website-entitlement-gate'

const TENANT = 'tenant-aaa-111'
const OTHER = 'tenant-bbb-222'

function baseObs(
  overrides: Partial<WebsiteEntitlementObservations> = {},
): WebsiteEntitlementObservations {
  return {
    expected_tenant_id: TENANT,
    stripe_customer_bound_tenant_id: TENANT,
    local: {
      website_only: false,
      website_setup_paid_at: null,
      website_hosting_plan: null,
      saas_subscription_active: false,
    },
    ...overrides,
  }
}

describe('evaluateWebsiteEvidenceOwnership', () => {
  it('matches when metadata tenant equals expected', () => {
    expect(
      evaluateWebsiteEvidenceOwnership({
        expected_tenant_id: TENANT,
        metadata_tenant_id: TENANT,
      }),
    ).toBe('matched')
  })

  it('matches when bound customer tenant equals expected', () => {
    expect(
      evaluateWebsiteEvidenceOwnership({
        expected_tenant_id: TENANT,
        stripe_customer_bound_tenant_id: TENANT,
      }),
    ).toBe('matched')
  })

  it('conflicts on metadata tenant mismatch (isolation)', () => {
    expect(
      evaluateWebsiteEvidenceOwnership({
        expected_tenant_id: TENANT,
        metadata_tenant_id: OTHER,
        stripe_customer_bound_tenant_id: TENANT,
      }),
    ).toBe('conflict')
  })

  it('conflicts on bound customer tenant mismatch', () => {
    expect(
      evaluateWebsiteEvidenceOwnership({
        expected_tenant_id: TENANT,
        stripe_customer_bound_tenant_id: OTHER,
      }),
    ).toBe('conflict')
  })

  it('unverified when no ownership anchors exist', () => {
    expect(
      evaluateWebsiteEvidenceOwnership({
        expected_tenant_id: TENANT,
      }),
    ).toBe('unverified')
  })
})

describe('reconcileWebsiteSetupEvidence', () => {
  it('local timestamp alone never confirms payment', () => {
    const evidence = reconcileWebsiteSetupEvidence(
      baseObs({
        local: { website_setup_paid_at: '2026-01-01T00:00:00.000Z' },
        setup_checkout: null,
      }),
    )
    expect(evidence).toEqual({ state: 'unknown' })
  })

  it('authoritative paid website checkout with matching tenant → confirmed_paid', () => {
    const evidence = reconcileWebsiteSetupEvidence(
      baseObs({
        setup_checkout: {
          payment_status: 'paid',
          metadata_product: 'website',
          metadata_tenant_id: TENANT,
          include_setup: true,
        },
      }),
    )
    expect(evidence.state).toBe('confirmed_paid')
  })

  it('explicit unpaid checkout → confirmed_unpaid', () => {
    const evidence = reconcileWebsiteSetupEvidence(
      baseObs({
        setup_checkout: {
          payment_status: 'unpaid',
          metadata_product: 'website',
          metadata_tenant_id: TENANT,
          include_setup: true,
        },
      }),
    )
    expect(evidence).toEqual({ state: 'confirmed_unpaid' })
  })

  it('local paid + stripe unpaid → conflicting', () => {
    const evidence = reconcileWebsiteSetupEvidence(
      baseObs({
        local: { website_setup_paid_at: '2026-01-01T00:00:00.000Z' },
        setup_checkout: {
          payment_status: 'unpaid',
          metadata_product: 'website',
          metadata_tenant_id: TENANT,
          include_setup: true,
        },
      }),
    )
    expect(evidence).toEqual({ state: 'conflicting' })
  })

  it('succeeded refund → refunded', () => {
    const evidence = reconcileWebsiteSetupEvidence(
      baseObs({
        setup_checkout: {
          payment_status: 'paid',
          metadata_product: 'website',
          metadata_tenant_id: TENANT,
          include_setup: true,
        },
        refunds: [{ status: 'succeeded' }],
      }),
    )
    expect(evidence).toEqual({ state: 'refunded' })
  })

  it('open dispute → disputed', () => {
    const evidence = reconcileWebsiteSetupEvidence(
      baseObs({
        setup_checkout: {
          payment_status: 'paid',
          metadata_product: 'website',
          metadata_tenant_id: TENANT,
          include_setup: true,
        },
        disputes: [{ status: 'needs_response' }],
      }),
    )
    expect(evidence).toEqual({ state: 'disputed' })
  })

  it('lost dispute → chargeback', () => {
    const evidence = reconcileWebsiteSetupEvidence(
      baseObs({
        setup_checkout: {
          payment_status: 'paid',
          metadata_product: 'website',
          metadata_tenant_id: TENANT,
          include_setup: true,
        },
        disputes: [{ status: 'lost' }],
      }),
    )
    expect(evidence).toEqual({ state: 'chargeback' })
  })

  it('cross-tenant metadata → conflicting', () => {
    const evidence = reconcileWebsiteSetupEvidence(
      baseObs({
        setup_checkout: {
          payment_status: 'paid',
          metadata_product: 'website',
          metadata_tenant_id: OTHER,
          include_setup: true,
        },
      }),
    )
    expect(evidence).toEqual({ state: 'conflicting' })
  })

  it('missing expected tenant id → malformed', () => {
    const evidence = reconcileWebsiteSetupEvidence({
      expected_tenant_id: '',
      setup_checkout: {
        payment_status: 'paid',
        metadata_product: 'website',
        metadata_tenant_id: TENANT,
        include_setup: true,
      },
    })
    expect(evidence).toEqual({ state: 'malformed' })
  })
})

describe('reconcileWebsiteHostingEvidence', () => {
  it('local hosting plan alone never yields active', () => {
    const evidence = reconcileWebsiteHostingEvidence(
      baseObs({
        local: { website_hosting_plan: 'host' },
        hosting_subscription: null,
      }),
    )
    expect(evidence).toEqual({ state: 'unknown' })
  })

  it('active host subscription with ownership → active host', () => {
    const evidence = reconcileWebsiteHostingEvidence(
      baseObs({
        hosting_subscription: {
          status: 'active',
          metadata_product: 'website',
          metadata_tenant_id: TENANT,
          hosting_plan: 'host',
        },
      }),
    )
    expect(evidence).toEqual({ state: 'active', plan: 'host' })
  })

  it('active care subscription (alternative plan model) → active care', () => {
    const evidence = reconcileWebsiteHostingEvidence(
      baseObs({
        hosting_subscription: {
          status: 'active',
          metadata_product: 'website',
          metadata_tenant_id: TENANT,
          hosting_plan: 'care',
        },
      }),
    )
    expect(evidence).toEqual({ state: 'active', plan: 'care' })
  })

  it('canceled subscription → canceled', () => {
    const evidence = reconcileWebsiteHostingEvidence(
      baseObs({
        hosting_subscription: {
          status: 'canceled',
          metadata_product: 'website',
          metadata_tenant_id: TENANT,
          hosting_plan: 'host',
        },
      }),
    )
    expect(evidence).toEqual({ state: 'canceled' })
  })

  it('past_due / unpaid → inactive', () => {
    expect(
      reconcileWebsiteHostingEvidence(
        baseObs({
          hosting_subscription: {
            status: 'past_due',
            metadata_product: 'website',
            metadata_tenant_id: TENANT,
            hosting_plan: 'host',
          },
        }),
      ),
    ).toEqual({ state: 'inactive' })
  })

  it('unsupported plan → unknown_plan', () => {
    const evidence = reconcileWebsiteHostingEvidence(
      baseObs({
        hosting_subscription: {
          status: 'active',
          metadata_product: 'website',
          metadata_tenant_id: TENANT,
          hosting_plan: 'premium_plus',
        },
      }),
    )
    expect(evidence).toEqual({ state: 'unknown_plan', plan: 'premium_plus' })
  })

  it('trialing hosting is not treated as entitled (product unresolved)', () => {
    const evidence = reconcileWebsiteHostingEvidence(
      baseObs({
        hosting_subscription: {
          status: 'trialing',
          metadata_product: 'website',
          metadata_tenant_id: TENANT,
          hosting_plan: 'host',
        },
      }),
    )
    expect(evidence.state).toBe('conflicting')
  })
})

describe('reconcileWebsiteLiveEntitlement', () => {
  it('maps complete authoritative observations → ENTITLED', () => {
    const result = reconcileWebsiteLiveEntitlement(
      baseObs({
        setup_checkout: {
          payment_status: 'paid',
          metadata_product: 'website',
          metadata_tenant_id: TENANT,
          include_setup: true,
        },
        hosting_subscription: {
          status: 'active',
          metadata_product: 'website',
          metadata_tenant_id: TENANT,
          hosting_plan: 'host',
        },
      }),
    )
    expect(result.decision.status).toBe('ENTITLED')
    expect(result.decision.mayPublishLive).toBe(true)
    expect(result.enforcement_wired).toBe(false)
  })

  it('SaaS-only local signals never yield ENTITLED', () => {
    const result = reconcileWebsiteLiveEntitlement(
      baseObs({
        local: {
          website_only: false,
          saas_subscription_active: true,
          saas_subscription_plan: 'starter',
          website_setup_paid_at: null,
          website_hosting_plan: null,
        },
      }),
    )
    expect(result.decision.status).not.toBe('ENTITLED')
    expect(result.decision.mayPublishLive).toBe(false)
    expect(result.setup_evidence).toEqual({ state: 'unknown' })
    expect(result.hosting_evidence).toEqual({ state: 'unknown' })
  })

  it('missing payment records → UNVERIFIED (not PAYMENT_REQUIRED)', () => {
    const result = reconcileWebsiteLiveEntitlement(baseObs())
    expect(result.decision.status).toBe('UNVERIFIED')
    expect(result.decision.reasons).toContain('setup_unverified')
    expect(result.decision.reasons).toContain('hosting_unverified')
  })

  it('contradictory local vs stripe setup → MANUAL_REVIEW', () => {
    const result = reconcileWebsiteLiveEntitlement(
      baseObs({
        local: { website_setup_paid_at: '2026-01-01T00:00:00.000Z' },
        setup_checkout: {
          payment_status: 'unpaid',
          metadata_product: 'website',
          metadata_tenant_id: TENANT,
          include_setup: true,
        },
        hosting_subscription: {
          status: 'active',
          metadata_product: 'website',
          metadata_tenant_id: TENANT,
          hosting_plan: 'host',
        },
      }),
    )
    expect(result.setup_evidence).toEqual({ state: 'conflicting' })
    expect(result.decision.status).toBe('MANUAL_REVIEW')
  })

  it('refunds fail closed to MANUAL_REVIEW', () => {
    const result = reconcileWebsiteLiveEntitlement(
      baseObs({
        setup_checkout: {
          payment_status: 'paid',
          metadata_product: 'website',
          metadata_tenant_id: TENANT,
          include_setup: true,
        },
        hosting_subscription: {
          status: 'active',
          metadata_product: 'website',
          metadata_tenant_id: TENANT,
          hosting_plan: 'host',
        },
        refunds: [{ status: 'succeeded' }],
      }),
    )
    expect(result.decision.status).toBe('MANUAL_REVIEW')
    expect(result.decision.mayPublishLive).toBe(false)
  })

  it('chargebacks / lost disputes fail closed', () => {
    const result = reconcileWebsiteLiveEntitlement(
      baseObs({
        setup_checkout: {
          payment_status: 'paid',
          metadata_product: 'website',
          metadata_tenant_id: TENANT,
          include_setup: true,
        },
        hosting_subscription: {
          status: 'active',
          metadata_product: 'website',
          metadata_tenant_id: TENANT,
          hosting_plan: 'host',
        },
        disputes: [{ status: 'lost' }],
      }),
    )
    expect(result.decision.status).toBe('MANUAL_REVIEW')
  })

  it('replayed webhook event is flagged but does not grant entitlement', () => {
    const result = reconcileWebsiteLiveEntitlement(
      baseObs({
        webhook_event_id: 'evt_1',
        previously_processed_event_ids: ['evt_1', 'evt_0'],
      }),
    )
    expect(result.replayed_event).toBe(true)
    expect(result.decision.status).toBe('UNVERIFIED')
    expect(result.decision.mayPublishLive).toBe(false)
  })

  it('idempotent: identical observations → identical decisions', () => {
    const obs = baseObs({
      setup_checkout: {
        payment_status: 'paid',
        metadata_product: 'website',
        metadata_tenant_id: TENANT,
        include_setup: true,
      },
      hosting_subscription: {
        status: 'canceled',
        metadata_product: 'website',
        metadata_tenant_id: TENANT,
        hosting_plan: 'host',
      },
    })
    const a = reconcileWebsiteLiveEntitlement(obs)
    const b = reconcileWebsiteLiveEntitlement(obs)
    expect(a.decision).toEqual(b.decision)
    expect(a.setup_evidence).toEqual(b.setup_evidence)
    expect(a.hosting_evidence).toEqual(b.hosting_evidence)
  })

  it('enforcement remains unwired', () => {
    expect(WEBSITE_ENTITLEMENT_ENFORCEMENT_WIRED).toBe(false)
    const result = reconcileWebsiteLiveEntitlement(baseObs())
    expect(result.enforcement_wired).toBe(false)
  })
})

describe('fail-closed hardening: include_setup + hosting product', () => {
  it('include_setup missing → unknown (not confirmed_paid)', () => {
    expect(
      reconcileWebsiteSetupEvidence(
        baseObs({
          setup_checkout: {
            payment_status: 'paid',
            metadata_product: 'website',
            metadata_tenant_id: TENANT,
          },
        }),
      ),
    ).toEqual({ state: 'unknown' })
  })

  it('include_setup null → unknown', () => {
    expect(
      reconcileWebsiteSetupEvidence(
        baseObs({
          setup_checkout: {
            payment_status: 'paid',
            metadata_product: 'website',
            metadata_tenant_id: TENANT,
            include_setup: null,
          },
        }),
      ),
    ).toEqual({ state: 'unknown' })
  })

  it('include_setup false → unknown', () => {
    expect(
      reconcileWebsiteSetupEvidence(
        baseObs({
          setup_checkout: {
            payment_status: 'paid',
            metadata_product: 'website',
            metadata_tenant_id: TENANT,
            include_setup: false,
          },
        }),
      ),
    ).toEqual({ state: 'unknown' })
  })

  it('include_setup true + paid → confirmed_paid', () => {
    expect(
      reconcileWebsiteSetupEvidence(
        baseObs({
          setup_checkout: {
            payment_status: 'paid',
            metadata_product: 'website',
            metadata_tenant_id: TENANT,
            include_setup: true,
          },
        }),
      ).state,
    ).toBe('confirmed_paid')
  })

  it('no_payment_required never confirms CHF-490 setup without explicit product rule', () => {
    expect(
      reconcileWebsiteSetupEvidence(
        baseObs({
          setup_checkout: {
            payment_status: 'no_payment_required',
            metadata_product: 'website',
            metadata_tenant_id: TENANT,
            include_setup: true,
          },
        }),
      ),
    ).toEqual({ state: 'unknown' })
  })

  it('hosting metadata_product missing → unknown (not active)', () => {
    expect(
      reconcileWebsiteHostingEvidence(
        baseObs({
          hosting_subscription: {
            status: 'active',
            metadata_tenant_id: TENANT,
            hosting_plan: 'host',
          },
        }),
      ),
    ).toEqual({ state: 'unknown' })
  })

  it('hosting metadata_product empty → unknown', () => {
    expect(
      reconcileWebsiteHostingEvidence(
        baseObs({
          hosting_subscription: {
            status: 'active',
            metadata_product: '',
            metadata_tenant_id: TENANT,
            hosting_plan: 'host',
          },
        }),
      ),
    ).toEqual({ state: 'unknown' })
  })

  it('hosting metadata_product unknown → unknown (or conflicting with local plan)', () => {
    expect(
      reconcileWebsiteHostingEvidence(
        baseObs({
          hosting_subscription: {
            status: 'active',
            metadata_product: 'saas_starter',
            metadata_tenant_id: TENANT,
            hosting_plan: 'host',
          },
        }),
      ),
    ).toEqual({ state: 'unknown' })

    expect(
      reconcileWebsiteHostingEvidence(
        baseObs({
          local: { website_hosting_plan: 'host' },
          hosting_subscription: {
            status: 'active',
            metadata_product: 'saas_starter',
            metadata_tenant_id: TENANT,
            hosting_plan: 'host',
          },
        }),
      ),
    ).toEqual({ state: 'conflicting' })
  })

  it('hosting metadata_product website + active host/care remains valid', () => {
    expect(
      reconcileWebsiteHostingEvidence(
        baseObs({
          hosting_subscription: {
            status: 'active',
            metadata_product: 'website',
            metadata_tenant_id: TENANT,
            hosting_plan: 'host',
          },
        }),
      ),
    ).toEqual({ state: 'active', plan: 'host' })

    expect(
      reconcileWebsiteHostingEvidence(
        baseObs({
          hosting_subscription: {
            status: 'active',
            metadata_product: 'website',
            metadata_tenant_id: TENANT,
            hosting_plan: 'care',
          },
        }),
      ),
    ).toEqual({ state: 'active', plan: 'care' })
  })

  it('cross-tenant mismatch remains MANUAL_REVIEW', () => {
    const result = reconcileWebsiteLiveEntitlement(
      baseObs({
        setup_checkout: {
          payment_status: 'paid',
          metadata_product: 'website',
          metadata_tenant_id: OTHER,
          include_setup: true,
        },
        hosting_subscription: {
          status: 'active',
          metadata_product: 'website',
          metadata_tenant_id: TENANT,
          hosting_plan: 'host',
        },
      }),
    )
    expect(result.decision.status).toBe('MANUAL_REVIEW')
    expect(result.setup_evidence).toEqual({ state: 'conflicting' })
  })

  it('refunds and disputes remain fail-closed after hardening', () => {
    const refunded = reconcileWebsiteLiveEntitlement(
      baseObs({
        setup_checkout: {
          payment_status: 'paid',
          metadata_product: 'website',
          metadata_tenant_id: TENANT,
          include_setup: true,
        },
        hosting_subscription: {
          status: 'active',
          metadata_product: 'website',
          metadata_tenant_id: TENANT,
          hosting_plan: 'host',
        },
        refunds: [{ status: 'succeeded' }],
      }),
    )
    expect(refunded.decision.status).toBe('MANUAL_REVIEW')

    const disputed = reconcileWebsiteLiveEntitlement(
      baseObs({
        setup_checkout: {
          payment_status: 'paid',
          metadata_product: 'website',
          metadata_tenant_id: TENANT,
          include_setup: true,
        },
        hosting_subscription: {
          status: 'active',
          metadata_product: 'website',
          metadata_tenant_id: TENANT,
          hosting_plan: 'host',
        },
        disputes: [{ status: 'needs_response' }],
      }),
    )
    expect(disputed.decision.status).toBe('MANUAL_REVIEW')
  })

  it('WEBSITE_ENTITLEMENT_ENFORCEMENT_WIRED remains immutable false', () => {
    expect(WEBSITE_ENTITLEMENT_ENFORCEMENT_WIRED).toBe(false)
    const injected = {
      ...baseObs(),
      WEBSITE_ENTITLEMENT_ENFORCEMENT_WIRED: true,
      enforcement_wired: true,
    } as WebsiteEntitlementObservations
    const { enforced } = assertWebsiteLiveEntitlementOrThrow(injected)
    expect(enforced).toBe(false)
    expect(WEBSITE_ENTITLEMENT_ENFORCEMENT_WIRED).toBe(false)
  })
})

describe('server entitlement gate preparation (not wired)', () => {
  it('prepareWebsiteLiveEntitlementDecision delegates to reconciler', () => {
    const prepared = prepareWebsiteLiveEntitlementDecision(
      baseObs({
        setup_checkout: {
          payment_status: 'paid',
          metadata_product: 'website',
          metadata_tenant_id: TENANT,
          include_setup: true,
        },
        hosting_subscription: {
          status: 'active',
          metadata_product: 'website',
          metadata_tenant_id: TENANT,
          hosting_plan: 'care',
        },
      }),
    )
    expect(prepared.decision.status).toBe('ENTITLED')
    expect(prepared.enforcement_wired).toBe(false)
  })

  it('assertWebsiteLiveEntitlementOrThrow does not throw while unwired', () => {
    const { enforced, decision } = assertWebsiteLiveEntitlementOrThrow(baseObs())
    expect(enforced).toBe(false)
    expect(decision.status).toBe('UNVERIFIED')
  })
})
