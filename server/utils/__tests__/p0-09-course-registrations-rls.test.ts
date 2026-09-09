/**
 * Contract tests for P0-09 course_registrations RLS.
 * Migration is not applied to production by the remediation agent.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const sql = readFileSync(
  resolve(process.cwd(), 'migrations/20260909_p0_09_course_registrations_rls.sql'),
  'utf8',
)

describe('P0-09 course_registrations RLS', () => {
  it('drops the permissive ALL policy and unscoped authenticated INSERT', () => {
    expect(sql).toContain('DROP POLICY IF EXISTS course_registrations_tenant_access')
    expect(sql).toContain(
      'DROP POLICY IF EXISTS "Allow authenticated users to insert course registrations"',
    )
    expect(sql).not.toMatch(/deleted_at IS NULL\s*\)\s*;[\s\S]*Allow authenticated/i)
  })

  it('lets clients only SELECT their own rows', () => {
    expect(sql).toContain('course_registrations_select_own')
    expect(sql).toContain('u.auth_user_id = auth.uid()')
  })

  it('restricts INSERT/UPDATE/DELETE to staff/admin with tenant WITH CHECK', () => {
    expect(sql).toContain('course_registrations_staff_insert')
    expect(sql).toContain('course_registrations_staff_update')
    expect(sql).toContain('course_registrations_staff_delete')
    expect(sql).toContain('WITH CHECK')
    expect(sql).toContain("role IN ('admin', 'staff', 'tenant_admin', 'super_admin')")
  })
})
