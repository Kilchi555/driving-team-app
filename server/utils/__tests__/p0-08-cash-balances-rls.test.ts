/**
 * P0-08 cash_balances RLS.
 * LIMITATION: this repository has no live JWT/RLS database in CI.
 * Contract tests pin live production policy names and the SELECT-only model.
 * JWT write denial is also asserted via REVOKE + absence of write policies.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { policiesForTable } from '../rls-policy-parser'

const sql = readFileSync(
  resolve(process.cwd(), 'migrations/20260909_p0_08_cash_balances_rls.sql'),
  'utf8',
)
const policies = policiesForTable(sql, 'cash_balances')

describe('P0-08 cash_balances RLS', () => {
  it('drops the live production write policies by exact name', () => {
    expect(sql).toContain('DROP POLICY IF EXISTS cash_balances_tenant_access')
    expect(sql).toContain('DROP POLICY IF EXISTS cash_balances_select_policy')
    expect(sql).toContain('DROP POLICY IF EXISTS cash_balances_insert_policy')
    expect(sql).toContain('DROP POLICY IF EXISTS cash_balances_update_policy')
    expect(sql).toContain('DROP POLICY IF EXISTS cash_balances_staff_insert')
    expect(sql).toContain('DROP POLICY IF EXISTS cash_balances_staff_update')
  })

  it('allows staff SELECT in the session tenant and no JWT writes', () => {
    expect(policies).toHaveLength(1)
    expect(policies[0]).toMatchObject({
      name: 'cash_balances_staff_select',
      command: 'SELECT',
      roles: ['authenticated'],
    })
    expect(policies[0].using).toContain('u.auth_user_id = auth.uid()')
    expect(policies[0].using).toContain("role IN ('admin', 'staff', 'tenant_admin', 'super_admin')")
    expect(policies.some((policy) => ['INSERT', 'UPDATE', 'DELETE', 'ALL'].includes(policy.command))).toBe(false)
  })

  it('revokes INSERT/UPDATE/DELETE from anon and authenticated and SELECT from anon', () => {
    expect(sql).toMatch(/REVOKE INSERT, UPDATE, DELETE ON TABLE public\.cash_balances FROM authenticated/)
    expect(sql).toMatch(/REVOKE INSERT, UPDATE, DELETE ON TABLE public\.cash_balances FROM anon/)
    expect(sql).toMatch(/REVOKE SELECT ON TABLE public\.cash_balances FROM anon/)
    expect(sql).toContain('GRANT SELECT ON TABLE public.cash_balances TO authenticated')
  })

  it('keeps application writes on the service-role API, not the JWT client', () => {
    const cashBalanceApi = readFileSync(
      resolve(process.cwd(), 'server/api/staff/cash-balance.post.ts'),
      'utf8',
    )
    const officeUi = readFileSync(
      resolve(process.cwd(), 'composables/useOfficeCashRegisters.ts'),
      'utf8',
    )
    expect(cashBalanceApi).toContain('getSupabaseAdmin()')
    expect(cashBalanceApi).toContain('requireTenantStaff')
    expect(officeUi).toContain(".from('cash_balances')")
    expect(officeUi).toContain('.select(')
    expect(officeUi).not.toMatch(/\.from\(['"]cash_balances['"]\)[\s\S]{0,80}\.(insert|update|delete)/)
  })
})
