/**
 * P0-09 course_registrations RLS + payment-field freeze.
 * LIMITATION: no live JWT/RLS database in CI. Policy names and the TS replica
 * of the trigger are asserted here. Production still requires applying the SQL.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { policiesForTable } from '../rls-policy-parser'
import {
  COURSE_REGISTRATION_PAYMENT_FIELDS,
  applyCourseRegistrationPaymentGuard,
} from '../course-registration-payment-guard'

const sql = readFileSync(
  resolve(process.cwd(), 'migrations/20260909_p0_09_course_registrations_rls.sql'),
  'utf8',
)
const policies = policiesForTable(sql, 'course_registrations')
const staffUi = readFileSync(resolve(process.cwd(), 'composables/useCourseParticipants.ts'), 'utf8')

describe('P0-09 course_registrations RLS', () => {
  it('drops the live unscoped INSERT, FOR ALL, and leftover SELECT policies', () => {
    expect(sql).toContain('DROP POLICY IF EXISTS course_registrations_tenant_access')
    expect(sql).toContain(
      'DROP POLICY IF EXISTS "Allow authenticated users to insert course registrations"',
    )
    expect(sql).toContain('DROP POLICY IF EXISTS "Admins can manage all course registrations"')
    expect(sql).toContain('DROP POLICY IF EXISTS "Users can view registrations via participant"')
  })

  it('lets clients only SELECT their own rows and keeps tenant-scoped staff roster writes', () => {
    const own = policies.find((policy) => policy.name === 'course_registrations_select_own')
    expect(own?.command).toBe('SELECT')
    expect(own?.using).toContain('u.auth_user_id = auth.uid()')
    const insert = policies.find((policy) => policy.name === 'course_registrations_staff_insert')
    const update = policies.find((policy) => policy.name === 'course_registrations_staff_update')
    expect(insert?.withCheck).toContain("role IN ('admin', 'staff', 'tenant_admin', 'super_admin')")
    expect(update?.withCheck).toContain('u.auth_user_id = auth.uid()')
    expect(policies.some((policy) => policy.command === 'ALL')).toBe(false)
    expect(staffUi).toContain('.insert(registrationData)')
    expect(staffUi).toContain("status: 'cancelled'")
  })

  it('pins a search_path-safe trigger that freezes every payment/SARI field', () => {
    expect(sql).toContain('SET search_path TO pg_catalog, public')
    expect(sql).toContain("coalesce(auth.role(), '') = 'service_role'")
    expect(sql).toContain("NEW.payment_status := 'pending'")
    expect(sql).toContain('NEW.amount_paid_rappen := 0')
    for (const field of COURSE_REGISTRATION_PAYMENT_FIELDS) {
      expect(sql).toContain(`NEW.${field} := OLD.${field}`)
    }
    expect(sql).not.toMatch(/NEW\.sari_synced_by\s*:=/)
  })
})

describe('P0-09 payment field guard behavior', () => {
  const injected = {
    status: 'confirmed',
    payment_status: 'paid',
    payment_id: 'pay-1',
    amount_paid_rappen: 9900,
    payment_method: 'cash',
    discount_applied_rappen: 500,
    sari_data: { stolen: true },
    sari_synced: true,
    sari_synced_at: '2026-01-01',
    sari_faberid: 'ABC',
    sari_license_id: 'L1',
    sari_licenses: { n: 1 },
  }

  it('lets JWT roster inserts keep status but strips payment/SARI injection', () => {
    const result = applyCourseRegistrationPaymentGuard({
      role: 'authenticated',
      op: 'INSERT',
      newRow: injected,
    })
    expect(result.status).toBe('confirmed')
    expect(result.payment_status).toBe('pending')
    expect(result.payment_id).toBeNull()
    expect(result.amount_paid_rappen).toBe(0)
    expect(result.payment_method).toBeNull()
    expect(result.sari_data).toBeNull()
    expect(result.sari_faberid).toBeNull()
  })

  it('freezes payment fields on JWT UPDATE while allowing roster status changes', () => {
    const result = applyCourseRegistrationPaymentGuard({
      role: 'authenticated',
      op: 'UPDATE',
      oldRow: {
        status: 'pending',
        payment_status: 'pending',
        payment_id: null,
        amount_paid_rappen: 0,
        payment_method: null,
        discount_applied_rappen: 0,
        sari_data: null,
        sari_synced: false,
        sari_synced_at: null,
        sari_faberid: null,
        sari_license_id: null,
        sari_licenses: null,
      },
      newRow: { ...injected, status: 'cancelled' },
    })
    expect(result.status).toBe('cancelled')
    expect(result.payment_status).toBe('pending')
    expect(result.amount_paid_rappen).toBe(0)
    expect(result.sari_data).toBeNull()
  })

  it('lets service role persist a legitimate payment update', () => {
    const result = applyCourseRegistrationPaymentGuard({
      role: 'service_role',
      op: 'UPDATE',
      oldRow: { payment_status: 'pending', amount_paid_rappen: 0 },
      newRow: { payment_status: 'paid', amount_paid_rappen: 9900, payment_id: 'pay-1' },
    })
    expect(result.payment_status).toBe('paid')
    expect(result.amount_paid_rappen).toBe(9900)
    expect(result.payment_id).toBe('pay-1')
  })
})
