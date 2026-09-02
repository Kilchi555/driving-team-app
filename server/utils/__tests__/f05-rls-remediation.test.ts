/**
 * F-05 RLS contract tests (policy inventory expectations).
 * Live negative probes were executed against production via authenticated role
 * simulation (see audits/2026-09-02-f05-remediation.md).
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const migrationPath = resolve(
  process.cwd(),
  'migrations/20260902_f05_payments_reminder_logs_rls.sql'
)

describe('F-05 RLS migration contract', () => {
  const sql = readFileSync(migrationPath, 'utf8')

  it('drops customer payment UPDATE policies', () => {
    expect(sql).toContain('DROP POLICY IF EXISTS "customer_update_own" ON public.payments')
    expect(sql).toContain(
      'DROP POLICY IF EXISTS "Authenticated users can update their own payments" ON public.payments'
    )
  })

  it('does not recreate customer_update_own', () => {
    expect(sql).not.toMatch(/CREATE POLICY\s+"customer_update_own"/i)
  })

  it('replaces open reminder_logs authenticated SELECT/INSERT', () => {
    expect(sql).toContain(
      'DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.reminder_logs'
    )
    expect(sql).toContain(
      'DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.reminder_logs'
    )
    expect(sql).toContain('reminder_logs_staff_select_tenant')
    expect(sql).toContain('reminder_logs_super_admin_select_all')
    expect(sql).toContain('reminder_logs_service_role_all')
  })

  it('keeps reminder_logs writes service-role oriented (no authenticated INSERT policy)', () => {
    expect(sql).not.toMatch(
      /CREATE POLICY[\s\S]{0,80}reminder_logs[\s\S]{0,40}FOR INSERT[\s\S]{0,40}TO authenticated/i
    )
  })
})
