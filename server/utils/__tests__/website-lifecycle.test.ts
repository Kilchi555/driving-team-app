import { describe, expect, it } from 'vitest'
import { mintedClaimFields, mintWebsiteClaimToken } from '../website-claim-token'
import {
  applyWebsiteQaDecision,
  assertNoPlaintextLifecycleSecrets,
  claimWebsiteProspect,
  rememberWebsiteCheckoutEvent,
  resolveTrustedWebsiteCheckoutBinding,
  websiteProspectGenerateBindingFields,
  websiteStatusAfterPayment,
} from '../website-lifecycle'
import { websitePublishBlockedMessage, websitePublishBlockedReason } from '../../../utils/website-billing'

const tenantA = '11111111-1111-1111-1111-111111111111'
const tenantB = '22222222-2222-2222-2222-222222222222'
const websiteA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const prospectA = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

function createProspectStore(row: Record<string, unknown>) {
  const rows = [row]
  return {
    rows,
    from(table: string) {
      if (table !== 'website_prospects') throw new Error(`unexpected table ${table}`)
      const filters: Record<string, unknown> = {}
      let pendingUpdate: Record<string, unknown> | null = null
      const api: any = {
        select() { return api },
        eq(key: string, value: unknown) {
          filters[key] = value
          return api
        },
        update(patch: Record<string, unknown>) {
          pendingUpdate = patch
          return api
        },
        maybeSingle() {
          const found = rows.find((item) =>
            Object.entries(filters).every(([key, value]) => item[key] === value),
          )
          if (pendingUpdate && found) {
            Object.assign(found, pendingUpdate)
            pendingUpdate = null
            return Promise.resolve({ data: { ...found }, error: null })
          }
          return Promise.resolve({ data: found ? { ...found } : null, error: null })
        },
      }
      return api
    },
  }
}

describe('website publish gates', () => {
  it('blocks unpaid, unapproved, cancelled, and foreign-tenant-equivalent website-only publish', () => {
    expect(websitePublishBlockedReason({
      website_only: true,
      website_setup_paid_at: null,
      website_hosting_plan: 'host',
      website_status: 'approved',
    })).toBe('setup')
    expect(websitePublishBlockedReason({
      website_only: true,
      website_setup_paid_at: '2026-09-20T00:00:00.000Z',
      website_hosting_plan: null,
      website_status: 'approved',
    })).toBe('hosting')
    expect(websitePublishBlockedReason({
      website_only: true,
      website_setup_paid_at: '2026-09-20T00:00:00.000Z',
      website_hosting_plan: 'host',
      website_status: 'pending_review',
    })).toBe('qa')
    expect(websitePublishBlockedReason({
      website_only: true,
      website_setup_paid_at: '2026-09-20T00:00:00.000Z',
      website_hosting_plan: 'host',
      website_status: 'disabled',
    })).toBe('cancelled')
    expect(websitePublishBlockedReason({
      website_only: true,
      website_setup_paid_at: '2026-09-20T00:00:00.000Z',
      website_hosting_plan: 'care',
      website_status: 'approved',
    })).toBeNull()
    expect(websitePublishBlockedReason({
      website_only: false,
      website_status: 'none',
    })).toBeNull()
    expect(websitePublishBlockedMessage('qa')).toMatch(/Freigabe/)
  })
})

describe('payment != publication', () => {
  it('moves unpaid review tenants to QA_PENDING and never to live', () => {
    expect(websiteStatusAfterPayment('none')).toBe('pending_review')
    expect(websiteStatusAfterPayment('pending_review')).toBe('pending_review')
    expect(websiteStatusAfterPayment('approved')).toBe('approved')
    expect(websiteStatusAfterPayment('live')).toBe('live')
    expect(websiteStatusAfterPayment('disabled')).toBe('disabled')
  })
})

describe('stripe checkout binding', () => {
  it('accepts a session bound via stripe_customer_id', () => {
    expect(resolveTrustedWebsiteCheckoutBinding({
      stripeCustomerId: 'cus_1',
      tenantIdByCustomer: tenantA,
      metadataTenantId: tenantA,
      metadataProduct: 'website',
    })).toEqual({ ok: true, tenantId: tenantA })
  })

  it('rejects foreign tenant_id, prospect_id, and tampered metadata', () => {
    expect(resolveTrustedWebsiteCheckoutBinding({
      stripeCustomerId: 'cus_1',
      tenantIdByCustomer: tenantA,
      metadataTenantId: tenantB,
      metadataProduct: 'website',
    }).ok).toBe(false)
    expect(resolveTrustedWebsiteCheckoutBinding({
      stripeCustomerId: 'cus_1',
      tenantIdByCustomer: tenantA,
      metadataProspectId: prospectA,
      prospect: { id: prospectA, tenant_id: tenantB, website_id: websiteA },
      metadataProduct: 'website',
    }).reason).toBe('foreign_prospect')
    expect(resolveTrustedWebsiteCheckoutBinding({
      stripeCustomerId: null,
      tenantIdByCustomer: tenantA,
      metadataTenantId: tenantA,
      metadataProduct: 'website',
    }).reason).toBe('missing_customer')
    expect(resolveTrustedWebsiteCheckoutBinding({
      stripeCustomerId: 'cus_1',
      tenantIdByCustomer: null,
      metadataTenantId: tenantA,
      metadataProduct: 'website',
    }).reason).toBe('unbound_customer')
  })

  it('rejects expected-tenant mismatches used by sync-subscription', () => {
    expect(resolveTrustedWebsiteCheckoutBinding({
      stripeCustomerId: 'cus_1',
      tenantIdByCustomer: tenantA,
      expectedTenantId: tenantB,
      metadataProduct: 'website',
    }).reason).toBe('foreign_tenant')
  })
})

describe('claim mechanism', () => {
  it('claims a generated prospect for the owning tenant', async () => {
    const minted = mintWebsiteClaimToken()
    const store = createProspectStore({
      id: prospectA,
      tenant_id: tenantA,
      website_id: websiteA,
      claimed_at: null,
      status: 'review',
      ...mintedClaimFields(minted),
    })
    const result = await claimWebsiteProspect({
      supabase: store,
      token: minted.token,
      actorTenantId: tenantA,
    })
    expect(result).toMatchObject({ ok: true, idempotent: false, tenantId: tenantA, websiteId: websiteA })
    expect(store.rows[0].status).toBe('claimed')
    expect(store.rows[0].claimed_at).toBeTruthy()
  })

  it('is idempotent for a duplicate claim by the same tenant', async () => {
    const minted = mintWebsiteClaimToken()
    const store = createProspectStore({
      id: prospectA,
      tenant_id: tenantA,
      website_id: websiteA,
      claimed_at: '2026-09-01T00:00:00.000Z',
      status: 'claimed',
      ...mintedClaimFields(minted),
    })
    const result = await claimWebsiteProspect({
      supabase: store,
      token: minted.token,
      actorTenantId: tenantA,
    })
    expect(result).toMatchObject({ ok: true, idempotent: true, tenantId: tenantA })
  })

  it('rejects a foreign tenant, expired token, and replay of an unknown token', async () => {
    const minted = mintWebsiteClaimToken()
    const store = createProspectStore({
      id: prospectA,
      tenant_id: tenantA,
      website_id: websiteA,
      claimed_at: null,
      status: 'review',
      ...mintedClaimFields(minted),
    })
    expect((await claimWebsiteProspect({
      supabase: store,
      token: minted.token,
      actorTenantId: tenantB,
    })).reason).toBe('foreign_tenant')
    expect((await claimWebsiteProspect({
      supabase: store,
      token: 'not-a-real-claim-token-value-at-all-000000',
      actorTenantId: tenantA,
    })).reason).toBe('mismatch')
    expect((await claimWebsiteProspect({
      supabase: store,
      token: minted.token,
      actorTenantId: tenantA,
      now: new Date('2030-01-01T00:00:00.000Z'),
    })).reason).toBe('expired')
  })

  it('treats a same-tenant race as idempotent success', async () => {
    const minted = mintWebsiteClaimToken()
    const row = {
      id: prospectA,
      tenant_id: tenantA,
      website_id: websiteA,
      claimed_at: null as string | null,
      status: 'review',
      ...mintedClaimFields(minted),
    }
    let updates = 0
    const supabase = {
      from() {
        const filters: Record<string, unknown> = {}
        let updating = false
        const api: any = {
          select() { return api },
          eq(key: string, value: unknown) {
            filters[key] = value
            return api
          },
          update() {
            updating = true
            return api
          },
          maybeSingle() {
            if (updating) {
              updates += 1
              updating = false
              row.claimed_at = '2026-09-20T00:00:00.000Z'
              row.status = 'claimed'
              return Promise.resolve({ data: null, error: null })
            }
            return Promise.resolve({ data: { ...row }, error: null })
          },
        }
        return api
      },
    }
    const result = await claimWebsiteProspect({
      supabase,
      token: minted.token,
      actorTenantId: tenantA,
    })
    expect(updates).toBe(1)
    expect(result).toMatchObject({ ok: true, idempotent: true, tenantId: tenantA })
  })
})

describe('QA gate helpers', () => {
  it('approves internally and rejects without publishing', () => {
    expect(applyWebsiteQaDecision({ decision: 'approved', actorId: 'admin-1' }).website_status).toBe('approved')
    expect(applyWebsiteQaDecision({ decision: 'rejected', actorId: 'admin-1' }).website_status).toBe('pending_review')
    expect(applyWebsiteQaDecision({ decision: 'disabled', actorId: 'admin-1' }).website_status).toBe('disabled')
  })
})

describe('generate binding persistence', () => {
  it('writes hashed claim fields and never plaintext tokens', () => {
    const minted = mintWebsiteClaimToken()
    const fields = websiteProspectGenerateBindingFields({
      tenantId: tenantA,
      websiteId: websiteA,
      previewUrl: 'https://app.simy.ch/s/demo?preview=1',
      analysis: {},
      emailDraft: {},
      place: {},
      now: '2026-09-20T00:00:00.000Z',
      claim: minted,
      remintClaim: true,
    })
    expect(fields.tenant_id).toBe(tenantA)
    expect(fields.website_id).toBe(websiteA)
    expect(fields.status).toBe('review')
    expect(fields.claim_token_hash).toBe(minted.hash)
    expect(fields).not.toHaveProperty('preview_token')
    expect(fields).not.toHaveProperty('claim_token')
    expect(assertNoPlaintextLifecycleSecrets(fields)).toBeUndefined()
  })
})

describe('checkout idempotency ledger', () => {
  it('treats unique violations as duplicate webhook deliveries', async () => {
    let inserts = 0
    const supabase = {
      from() {
        return {
          insert() {
            inserts += 1
            if (inserts === 1) return Promise.resolve({ error: null })
            return Promise.resolve({ error: { code: '23505', message: 'duplicate key' } })
          },
        }
      },
    }
    expect(await rememberWebsiteCheckoutEvent({
      supabase,
      sessionId: 'cs_1',
      tenantId: tenantA,
    })).toEqual({ duplicate: false })
    expect(await rememberWebsiteCheckoutEvent({
      supabase,
      sessionId: 'cs_1',
      tenantId: tenantA,
    })).toEqual({ duplicate: true })
  })
})
