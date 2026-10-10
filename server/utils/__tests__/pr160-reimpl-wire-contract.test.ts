import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8')
}

describe('PR #160 reimplementation wire contract', () => {
  it('keeps #308 course fulfillment and identity block on webhook + recovery', () => {
    const webhook = read('server/api/wallee/webhook.post.ts')
    const recovery = read('server/api/cron/recover-pending-wallee-payments.get.ts')
    expect(webhook).toContain('fulfillCourseWalleePayment')
    expect(webhook).toContain('identity_blocked')
    expect(recovery).toContain('fulfillCourseWalleePayment')
    expect(recovery).toContain('identity_blocked')
  })

  it('wires DB checkout claim into all Wallee create entry points', () => {
    const paths = [
      'server/api/wallee/create-transaction.post.ts',
      'server/api/payments/process.post.ts',
      'server/api/payments/process-public.post.ts',
      'server/utils/wallee-appointment-checkout.ts',
      'server/api/customer/create-topup-session.post.ts',
    ]
    for (const path of paths) {
      const src = read(path)
      expect(src).toContain('runPaymentCheckoutCreate')
      expect(src).toContain('livePaymentCheckoutDeps')
    }
  })

  it('never deletes a payment after an unknown Wallee create in create-transaction', () => {
    const src = read('server/api/wallee/create-transaction.post.ts')
    expect(src).toContain('runPaymentCheckoutCreate')
    expect(src).not.toMatch(/\.from\('payments'\)\s*\.delete\(/)
  })

  it('never deletes a topup payment after an unknown Wallee create', () => {
    const src = read('server/api/customer/create-topup-session.post.ts')
    expect(src).toContain('runPaymentCheckoutCreate')
    expect(src).not.toMatch(/\.from\('payments'\)\s*\.delete\(/)
  })

  it('uses atomic slot claim RPC in reserve-slot', () => {
    const src = read('server/api/booking/reserve-slot.post.ts')
    expect(src).toContain('claim_availability_slot_hold')
  })

  it('uses bookOnlineAppointment for guest and authenticated online booking', () => {
    expect(read('server/api/booking/guest-book.post.ts')).toContain('bookOnlineAppointment')
    expect(read('server/api/booking/create-appointment.post.ts')).toContain('bookOnlineAppointment')
  })

  it('protects unpaid holds while creating or recovery_pending', () => {
    const src = read('server/utils/pay-before-confirm.ts')
    expect(src).toContain("checkout_status === 'creating'")
    expect(src).toContain("checkout_status === 'recovery_pending'")
  })

  it('recovery reconciles recovery_pending and stale creating without create', () => {
    const src = read('server/api/cron/recover-pending-wallee-payments.get.ts')
    expect(src).toContain('CHECKOUT_STATUS.recovery_pending')
    expect(src).toContain('CHECKOUT_STATUS.creating')
    expect(src).toContain('checkout_claimed_at')
    expect(src).toContain('recoverPaymentCheckout')
    expect(src).toContain('filterPaymentsEligibleForAbandonment')
    expect(src).toContain(".not('checkout_status', 'in'")
    expect(src).toContain('CHECKOUT_STATUS.creating')
    expect(src).toContain('CHECKOUT_STATUS.recovery_pending')
    // Must not use the old Phase 4 predicate that only excluded recovery_pending.
    expect(src).not.toContain(".neq('checkout_status', 'recovery_pending')")
  })

  it('webhook attaches transaction id only when null and marks claim created', () => {
    const src = read('server/api/wallee/webhook.post.ts')
    expect(src).toContain("checkout_status: 'created'")
    expect(src).toContain(".is('wallee_transaction_id', null)")
    expect(src).toContain('not overwriting')
  })
})

describe('slot claim migration contract', () => {
  const sql = read('migrations/20261007_occupancy_and_booking_concurrency.sql')

  it('exposes conditional claim_availability_slot_hold to service_role only', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.claim_availability_slot_hold(')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.claim_availability_slot_hold')
    expect(sql).toContain('TO service_role')
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.claim_availability_slot_hold')
  })

  it('claims only when free, expired, or same session', () => {
    expect(sql).toContain('reserved_by_session IS NULL')
    expect(sql).toContain('reserved_until < now()')
    expect(sql).toContain('reserved_by_session = p_session_id')
    expect(sql).toContain('appointment_id IS NULL')
  })

  it('scopes the hold claim by tenant when provided', () => {
    expect(sql).toContain('p_tenant_id uuid DEFAULT NULL')
    expect(sql).toContain('(p_tenant_id IS NULL OR tenant_id = p_tenant_id)')
  })
})

describe('wallee claim tenant isolation contract', () => {
  const sql = read('migrations/20261007_wallee_checkout_claim.sql')

  it('scopes every claim RPC by payment_id AND tenant_id', () => {
    expect(sql).toContain('AND tenant_id = p_tenant_id')
    expect(sql.match(/tenant_id = p_tenant_id/g)?.length || 0).toBeGreaterThanOrEqual(4)
  })

  it('never allows create from recovery_pending', () => {
    expect(sql).toContain("checkout_status = 'recovery_pending'")
    expect(sql).toContain("'allow_create', false")
    expect(sql).not.toMatch(/recovery_pending[\s\S]{0,120}allow_create',\s*true/)
  })
})
