import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Static contract tests for settle idempotency request hashing.
 * Live PG hash equality is verified after the remediation migration is applied
 * on staging (not in this unit suite).
 */
const sql = readFileSync(
  resolve(__dirname, '../../../migrations/20261011_invoice_create_with_settlement.sql'),
  'utf8',
)

describe('invoice settle request_hash contract', () => {
  it('hashes invoice total and customer identity', () => {
    expect(sql).toMatch(/'total_amount_rappen'/)
    expect(sql).toMatch(/'user_id'/)
    expect(sql).toMatch(/'billing_email'/)
  })

  it('hashes line items including amounts and names', () => {
    expect(sql).toMatch(/'product_name'/)
    expect(sql).toMatch(/'unit_price_rappen'/)
    expect(sql).toMatch(/'total_price_rappen'/)
    expect(sql).toMatch(/'sort_order'/)
  })

  it('hashes settlement method and amount', () => {
    expect(sql).toMatch(/lower\(NULLIF\(v_elem->>'payment_method'/)
    expect(sql).toMatch(/'amount_rappen'/)
    expect(sql).toMatch(/'item_index'/)
  })

  it('treats omitted and empty as equivalent via strip_nulls', () => {
    expect(sql).toContain('jsonb_strip_nulls')
    expect(sql).toContain("NULLIF(p_invoice->>'billing_email', '')")
  })

  it('replays identical hash and conflicts on mismatch under advisory lock', () => {
    expect(sql).toContain('pg_advisory_xact_lock')
    expect(sql).toContain('v_existing_hash IS DISTINCT FROM v_request_hash')
    expect(sql).toContain("'idempotency_conflict'")
    expect(sql).toContain("'replayed', true")
    expect(sql).toContain('request_hash')
  })

  it('does not overwrite existing idempotency rows on conflict path', () => {
    // Conflict raises before any invoice insert when key already exists
    const conflictIdx = sql.indexOf("RAISE EXCEPTION 'idempotency_conflict'")
    const insertIdx = sql.indexOf('INSERT INTO public.invoices (')
    expect(conflictIdx).toBeGreaterThan(-1)
    expect(insertIdx).toBeGreaterThan(conflictIdx)
  })
})
