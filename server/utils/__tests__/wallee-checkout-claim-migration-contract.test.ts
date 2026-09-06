import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const occupancy = readFileSync(
  resolve(process.cwd(), 'migrations/20260905_occupancy_and_booking_concurrency.sql'),
  'utf8'
)
const claim = readFileSync(
  resolve(process.cwd(), 'migrations/20260906_wallee_checkout_claim.sql'),
  'utf8'
)

describe('wallee checkout claim migration contract', () => {
  it('adds checkout columns and recovery states', () => {
    expect(claim).toContain('checkout_status')
    expect(claim).toContain('checkout_claimed_at')
    expect(claim).toContain('checkout_claim_token')
    expect(claim).toContain('checkout_merchant_reference')
    expect(claim).toContain('recovery_pending')
    expect(claim).toContain("CHECK (checkout_status IN ('idle', 'creating', 'created', 'recovery_pending'))")
  })

  it('exposes claim/persist/recovery RPCs to service_role only', () => {
    expect(claim).toContain('CREATE OR REPLACE FUNCTION public.claim_payment_checkout(')
    expect(claim).toContain('CREATE OR REPLACE FUNCTION public.persist_payment_checkout(')
    expect(claim).toContain('CREATE OR REPLACE FUNCTION public.mark_payment_checkout_recovery(')
    expect(claim).toContain('REVOKE ALL ON FUNCTION public.claim_payment_checkout')
    expect(claim).toContain('GRANT EXECUTE ON FUNCTION public.claim_payment_checkout')
    expect(claim).toContain('TO service_role')
  })

  it('never authorizes create from stale creating or recovery_pending', () => {
    expect(claim).toContain("'outcome', 'recovery'")
    expect(claim).toContain("'allow_create', false")
    expect(claim).toContain("'allow_create', true")
    expect(claim).toContain("checkout_status = 'creating' AND v_stale")
  })

  it('drops session advisory payment locks', () => {
    expect(claim).toContain('DROP FUNCTION IF EXISTS public.acquire_payment_checkout_lock')
    expect(claim).toContain('DROP FUNCTION IF EXISTS public.release_payment_checkout_lock')
    expect(occupancy).not.toContain('pg_advisory_lock(hashtextextended(p_payment_id')
    expect(occupancy).toContain('hashtextextended(sid::text, 0)')
  })

  it('does not persist a second wallee id over an existing different one', () => {
    expect(claim).toContain("'outcome', 'conflict'")
    expect(claim).toContain('wallee_transaction_id IS DISTINCT FROM p_wallee_transaction_id')
  })

  it('does not install EXCLUDE', () => {
    const executable = claim
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
    expect(executable).not.toMatch(/btree_gist/i)
    expect(executable).not.toMatch(/EXCLUDE USING/i)
  })
})
