import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  CHECKOUT_STATUS,
  CHECKOUT_STALE_AFTER_MS,
  checkoutBlocksAbandonment,
  filterPaymentsEligibleForAbandonment,
  isUnknownOutcomeCheckoutStatus,
  runPaymentCheckoutCreate,
  type PaymentCheckoutDeps,
} from '../wallee-checkout-claim'
import { BOOKING_ERROR } from '../booking-errors'

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8')
}

function baseDeps(overrides: Partial<PaymentCheckoutDeps>): PaymentCheckoutDeps {
  return {
    claim: async () => ({ outcome: 'recovery', allow_create: false, payment_status: 'pending' }),
    persist: async ({ transactionId }) => ({ outcome: 'created', wallee_transaction_id: transactionId }),
    markRecovery: vi.fn(async () => {}),
    releaseIdle: vi.fn(async () => {}),
    search: async () => [],
    create: vi.fn(),
    ...overrides,
  }
}

describe('unknown-outcome checkout abandonment guards', () => {
  it('treats creating and recovery_pending as unknown-outcome', () => {
    expect(isUnknownOutcomeCheckoutStatus(CHECKOUT_STATUS.creating)).toBe(true)
    expect(isUnknownOutcomeCheckoutStatus(CHECKOUT_STATUS.recovery_pending)).toBe(true)
    expect(isUnknownOutcomeCheckoutStatus(CHECKOUT_STATUS.idle)).toBe(false)
    expect(isUnknownOutcomeCheckoutStatus(CHECKOUT_STATUS.created)).toBe(false)
    expect(isUnknownOutcomeCheckoutStatus(null)).toBe(false)
  })

  it('blocks Phase 4 abandonment for creating and recovery_pending', () => {
    expect(checkoutBlocksAbandonment({ checkout_status: CHECKOUT_STATUS.creating })).toBe(true)
    expect(checkoutBlocksAbandonment({ checkout_status: CHECKOUT_STATUS.recovery_pending })).toBe(true)
    expect(checkoutBlocksAbandonment({ checkout_status: CHECKOUT_STATUS.idle })).toBe(false)
    expect(checkoutBlocksAbandonment({ checkout_status: CHECKOUT_STATUS.created })).toBe(false)
  })

  it('filters public-course user_id=NULL candidates so creating/recovery_pending never reach cancel', () => {
    const rows = [
      { id: 'idle-null-user', checkout_status: CHECKOUT_STATUS.idle },
      { id: 'creating-null-user', checkout_status: CHECKOUT_STATUS.creating },
      { id: 'recovery-null-user', checkout_status: CHECKOUT_STATUS.recovery_pending },
      { id: 'created-null-user', checkout_status: CHECKOUT_STATUS.created },
    ]
    const eligible = filterPaymentsEligibleForAbandonment(rows)
    expect(eligible.map(r => r.id)).toEqual(['idle-null-user', 'created-null-user'])
  })

  it('uses a 90s stale window aligned with the claim RPC', () => {
    expect(CHECKOUT_STALE_AFTER_MS).toBe(90_000)
  })
})

describe('cron predicates for stale creating recovery', () => {
  const cron = read('server/api/cron/recover-pending-wallee-payments.get.ts')

  it('Phase 0 selects recovery_pending and stale creating with null transaction id', () => {
    expect(cron).toContain('CHECKOUT_STATUS.recovery_pending')
    expect(cron).toContain('CHECKOUT_STATUS.creating')
    expect(cron).toContain(".is('wallee_transaction_id', null)")
    expect(cron).toContain(".lt('checkout_claimed_at', staleBefore)")
    expect(cron).toContain('recoverPaymentCheckout')
    expect(cron).toContain('CHECKOUT_STALE_AFTER_MS')
  })

  it('Phase 4 SQL excludes creating and recovery_pending, with JS defense-in-depth', () => {
    expect(cron).toContain(".not('checkout_status', 'in'")
    expect(cron).toContain('filterPaymentsEligibleForAbandonment')
    expect(cron).not.toContain(".neq('checkout_status', 'recovery_pending')")
  })

  it('keeps #308 identity_blocked Phase 4 carve-out', () => {
    expect(cron).toContain('partitionStalePendingWalleePayments')
    expect(cron).toContain('identityBlocked')
    expect(cron).toContain('cancelStalePendingWalleePaymentIds')
  })
})

describe('recovery orchestration never calls Wallee create', () => {
  it('attaches an existing transaction for recovery/creating without create', async () => {
    const create = vi.fn()
    const result = await runPaymentCheckoutCreate(
      { paymentId: 'p-public', tenantId: 't1' },
      baseDeps({
        claim: async () => ({
          outcome: 'recovery',
          allow_create: false,
          payment_status: 'pending',
          checkout_status: CHECKOUT_STATUS.recovery_pending,
          checkout_merchant_reference: 'payment-p-public',
        }),
        search: async () => [{ id: 'tx-external', state: 'PENDING' }],
        create,
      }),
    )
    expect(result.transactionId).toBe('tx-external')
    expect(result.recovered).toBe(true)
    expect(create).not.toHaveBeenCalled()
  })

  it('does not create when recovery search misses (public-course unknown outcome)', async () => {
    const create = vi.fn()
    await expect(runPaymentCheckoutCreate(
      { paymentId: 'p-null-user', tenantId: 't1' },
      baseDeps({
        claim: async () => ({
          outcome: 'recovery',
          allow_create: false,
          payment_status: 'pending',
          checkout_status: CHECKOUT_STATUS.creating,
        }),
        search: async () => [],
        create,
      }),
    )).rejects.toMatchObject({ data: { error: BOOKING_ERROR.CHECKOUT_RECOVERY_PENDING } })
    expect(create).not.toHaveBeenCalled()
  })

  it('still creates only for a fresh allow_create claim (normal path unchanged)', async () => {
    const create = vi.fn(async () => ({ id: 'tx-new', paymentPageUrl: 'https://pay.example/new' }))
    const result = await runPaymentCheckoutCreate(
      { paymentId: 'p-fresh', tenantId: 't1' },
      baseDeps({
        claim: async () => ({
          outcome: 'allow_create',
          allow_create: true,
          payment_status: 'pending',
          checkout_claim_token: 'tok',
          checkout_merchant_reference: 'payment-p-fresh',
        }),
        create,
      }),
    )
    expect(result.transactionId).toBe('tx-new')
    expect(result.reused).toBe(false)
    expect(create).toHaveBeenCalledTimes(1)
  })
})

describe('webhook overwrite protection unchanged', () => {
  it('still attaches only when wallee_transaction_id is null', () => {
    const src = read('server/api/wallee/webhook.post.ts')
    expect(src).toContain("checkout_status: 'created'")
    expect(src).toContain(".is('wallee_transaction_id', null)")
    expect(src).toContain('not overwriting')
  })
})
