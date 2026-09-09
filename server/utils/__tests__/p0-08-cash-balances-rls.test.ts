/**
 * Contract tests for P0-08 cash_balances RLS.
 * Migration is not applied to production by the remediation agent.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const sql = readFileSync(
  resolve(process.cwd(), 'migrations/20260909_p0_08_cash_balances_rls.sql'),
  'utf8',
)

describe('P0-08 cash_balances RLS', () => {
  it('drops the permissive FOR ALL tenant policy', () => {
    expect(sql).toContain('DROP POLICY IF EXISTS cash_balances_tenant_access')
    expect(sql).not.toMatch(/CREATE POLICY[\s\S]{0,80}cash_balances_tenant_access[\s\S]{0,80}FOR ALL/i)
  })

  it('does not create a client DELETE policy and keeps UPDATE WITH CHECK', () => {
    expect(sql).toContain('DROP POLICY IF EXISTS cash_balances_delete_policy')
    expect(sql).not.toMatch(/CREATE POLICY[\s\S]{0,80}cash_balances[\s\S]{0,40}FOR DELETE/i)
    expect(sql).toContain('WITH CHECK')
    expect(sql).toContain("role IN ('admin', 'staff', 'tenant_admin', 'super_admin')")
  })

  it('restricts SELECT/INSERT/UPDATE to staff/admin roles in the session tenant', () => {
    expect(sql).toContain('cash_balances_staff_select')
    expect(sql).toContain('cash_balances_staff_insert')
    expect(sql).toContain('cash_balances_staff_update')
    expect(sql).toContain('u.auth_user_id = auth.uid()')
  })
})
