import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const backfillSql = readFileSync(
  resolve(process.cwd(), 'migrations/20261009_backfill_null_tenant_appointment_children.sql'),
  'utf8'
)
const hardDeleteSql = readFileSync(
  resolve(process.cwd(), 'migrations/20261007_tenant_hard_delete.sql'),
  'utf8'
)

describe('NULL-tenant appointment children backfill (SQL contract)', () => {
  it('backfills cash_transactions only via JOIN to appointments.tenant_id', () => {
    expect(backfillSql).toMatch(
      /UPDATE public\.cash_transactions ct[\s\S]*?SET tenant_id = a\.tenant_id[\s\S]*?FROM public\.appointments a/
    )
    expect(backfillSql).toMatch(
      /ct\.tenant_id IS NULL[\s\S]*?ct\.appointment_id IS NOT NULL[\s\S]*?a\.id = ct\.appointment_id[\s\S]*?a\.tenant_id IS NOT NULL/
    )
  })

  it('backfills discount_sales only via JOIN to appointments.tenant_id', () => {
    expect(backfillSql).toMatch(
      /UPDATE public\.discount_sales ds[\s\S]*?SET tenant_id = a\.tenant_id[\s\S]*?FROM public\.appointments a/
    )
    expect(backfillSql).toMatch(
      /ds\.tenant_id IS NULL[\s\S]*?ds\.appointment_id IS NOT NULL[\s\S]*?a\.id = ds\.appointment_id[\s\S]*?a\.tenant_id IS NOT NULL/
    )
  })

  it('does not infer ownership from user_id, staff_id, amounts, or Wallee heuristics', () => {
    expect(backfillSql).not.toMatch(/SET tenant_id = .*user_id/i)
    expect(backfillSql).not.toMatch(/SET tenant_id = .*staff_id/i)
    expect(backfillSql).not.toMatch(/wallee/i)
    expect(backfillSql).not.toMatch(/amount_rappen/)
  })

  it('fails closed when candidates lack unambiguous appointment.tenant_id', () => {
    expect(backfillSql).toContain('backfill aborted')
    expect(backfillSql).toMatch(/RAISE EXCEPTION/)
    expect(backfillSql).toMatch(/a\.tenant_id IS NOT NULL/)
  })

  it('postcondition fails if SAFE-pattern leftovers remain', () => {
    expect(backfillSql).toContain('backfill incomplete')
    expect(backfillSql).toMatch(
      /ct\.tenant_id IS NULL[\s\S]*?JOIN public\.appointments a[\s\S]*?a\.tenant_id IS NOT NULL/
    )
    expect(backfillSql).toMatch(
      /ds\.tenant_id IS NULL[\s\S]*?JOIN public\.appointments a[\s\S]*?a\.tenant_id IS NOT NULL/
    )
  })

  it('never performs global NULL-tenant DELETE', () => {
    expect(backfillSql).not.toMatch(/DELETE FROM public\.cash_transactions/i)
    expect(backfillSql).not.toMatch(/DELETE FROM public\.discount_sales/i)
    expect(backfillSql).not.toMatch(/WHERE tenant_id IS NULL\s*;/)
  })

  it('does not change FK ON DELETE behavior', () => {
    expect(backfillSql).not.toMatch(/DROP CONSTRAINT/i)
    expect(backfillSql).not.toMatch(/ON DELETE CASCADE/i)
    expect(backfillSql).not.toMatch(/ON DELETE SET NULL/i)
  })

  it('is wrapped in a transaction', () => {
    expect(backfillSql).toMatch(/^BEGIN;/m)
    expect(backfillSql).toMatch(/^COMMIT;/m)
  })
})

describe('NULL-tenant appointment children hard-delete RPC hardening (SQL contract)', () => {
  it('adopts NULL-tenant cash_transactions only via target-tenant appointments', () => {
    expect(hardDeleteSql).toMatch(
      /UPDATE public\.cash_transactions ct[\s\S]*?SET tenant_id = a\.tenant_id[\s\S]*?FROM public\.appointments a[\s\S]*?ct\.tenant_id IS NULL[\s\S]*?a\.tenant_id = p_tenant_id/
    )
  })

  it('adopts NULL-tenant discount_sales only via target-tenant appointments', () => {
    expect(hardDeleteSql).toMatch(
      /UPDATE public\.discount_sales ds[\s\S]*?SET tenant_id = a\.tenant_id[\s\S]*?FROM public\.appointments a[\s\S]*?ds\.tenant_id IS NULL[\s\S]*?a\.tenant_id = p_tenant_id/
    )
  })

  it('never deletes all NULL-tenant cash_transactions or discount_sales globally', () => {
    expect(hardDeleteSql).not.toMatch(
      /DELETE FROM public\.cash_transactions\s+WHERE\s+tenant_id\s+IS\s+NULL/i
    )
    expect(hardDeleteSql).not.toMatch(
      /DELETE FROM public\.discount_sales\s+WHERE\s+tenant_id\s+IS\s+NULL/i
    )
  })

  it('adopts before tenant_id-scoped appointment clears and before DELETE tenants', () => {
    const adoptCash = hardDeleteSql.indexOf('UPDATE public.cash_transactions ct')
    const tenantScopedCash = hardDeleteSql.indexOf(
      'UPDATE public.cash_transactions\n  SET appointment_id = NULL\n  WHERE tenant_id = p_tenant_id'
    )
    const deleteTenants = hardDeleteSql.lastIndexOf('DELETE FROM public.tenants WHERE id = p_tenant_id')
    expect(adoptCash).toBeGreaterThanOrEqual(0)
    expect(tenantScopedCash).toBeGreaterThan(adoptCash)
    expect(deleteTenants).toBeGreaterThan(tenantScopedCash)
  })

  it('preserves fail-closed transactional delete of tenant root', () => {
    expect(hardDeleteSql).toContain('expected to delete 1 tenant row')
    expect(hardDeleteSql).toContain('SECURITY DEFINER')
  })
})
