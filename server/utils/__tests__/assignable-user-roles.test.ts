import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { H3Error } from 'h3'
import { sanitizeRoleChange, staffCreatePayload } from '../assignable-user-roles'

function statusOf(run: () => void): number | undefined {
  try {
    run()
  } catch (err: unknown) {
    const code = (err as H3Error).statusCode
    return typeof code === 'number' ? code : undefined
  }
}

describe('sanitizeRoleChange', () => {
  it('lets a super_admin assign roles the application already stores', () => {
    for (const role of ['client', 'staff', 'admin', 'tenant_admin', 'super_admin', 'accountant', 'customer', 'affiliate']) {
      expect(sanitizeRoleChange('super_admin', role)).toBe(role)
    }
  })

  it('rejects student for a super_admin with 400 and does not return a role', () => {
    expect(statusOf(() => sanitizeRoleChange('super_admin', 'student'))).toBe(400)
  })

  it('rejects an arbitrary role string for a super_admin', () => {
    expect(statusOf(() => sanitizeRoleChange('super_admin', 'owner'))).toBe(400)
  })

  it('keeps the tenant-admin allowlist and rejects student with 403', () => {
    expect(sanitizeRoleChange('admin', 'client')).toBe('client')
    expect(sanitizeRoleChange('admin', 'staff')).toBe('staff')
    expect(sanitizeRoleChange('admin', 'admin')).toBe('admin')
    expect(sanitizeRoleChange('admin', 'customer')).toBe('customer')
    expect(statusOf(() => sanitizeRoleChange('admin', 'student'))).toBe(403)
    expect(statusOf(() => sanitizeRoleChange('admin', 'super_admin'))).toBe(403)
    expect(statusOf(() => sanitizeRoleChange('admin', 'accountant'))).toBe(403)
    expect(statusOf(() => sanitizeRoleChange('admin', 'tenant_admin'))).toBe(403)
    expect(statusOf(() => sanitizeRoleChange('admin', 'affiliate'))).toBe(403)
  })

  it('treats an omitted role as no change', () => {
    expect(sanitizeRoleChange('super_admin', undefined)).toBeUndefined()
    expect(sanitizeRoleChange('admin', '')).toBeUndefined()
    expect(sanitizeRoleChange('admin', null)).toBeUndefined()
  })
})

describe('staffCreatePayload', () => {
  it('forces staff in the caller tenant and drops a caller-supplied student role', () => {
    expect(staffCreatePayload({
      first_name: 'Ada',
      role: 'student',
      tenant_id: 'tenant-a',
      is_primary_admin: true,
      auth_user_id: 'auth-injected',
      admin_level: 'sub_admin',
      is_active: false,
      deleted_at: '2020-01-01',
      user_data: { tenant_id: 'nested-tenant', role: 'admin' },
    }, 'caller-tenant')).toEqual({
      first_name: 'Ada',
      role: 'staff',
      tenant_id: 'caller-tenant',
      is_primary_admin: false,
    })
  })

  it('still forces staff when the body has no role', () => {
    const payload = staffCreatePayload({ email: 'ada@example.com' }, 'caller-tenant')
    expect(payload.role).toBe('staff')
    expect(payload.tenant_id).toBe('caller-tenant')
    expect(payload.is_primary_admin).toBe(false)
  })
})

describe('public.users.role student write/read contract', () => {
  const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

  it('cash enrollment inserts a client and matches only clients', () => {
    const src = read('server/api/courses/enroll-cash.post.ts')
    expect(src).toContain("role: 'client'")
    expect(src).toContain("roles: ['client']")
    expect(src).not.toMatch(/role:\s*['"]student['"]/)
    expect(src).not.toContain("'student'")
  })

  it('admin participant and create-user insert a client', () => {
    expect(read('server/api/admin/courses/add-participant.post.ts')).toContain("role: 'client'")
    expect(read('server/api/admin/courses/add-participant.post.ts')).not.toMatch(/role:\s*['"]student['"]/)
    expect(read('server/api/admin/create-user.post.ts')).toContain("role: 'client'")
    expect(read('server/api/admin/create-user.post.ts')).not.toMatch(/role:\s*['"]student['"]/)
  })

  it('SARI user creation inserts a client', () => {
    const src = read('server/utils/sari-sync-engine.ts')
    expect(src).toContain("role: 'client'")
    expect(src).not.toMatch(/role:\s*['"]student['"]/)
  })

  it('customer search and marketing queries read client', () => {
    expect(read('server/api/admin/users/search.get.ts')).toContain(".eq('role', 'client')")
    expect(read('server/api/admin/users/search.get.ts')).not.toContain("'student'")
    expect(read('server/api/admin/marketing-ltv.get.ts')).toContain(".eq('role', 'client')")
    expect(read('server/api/admin/marketing-ltv.get.ts')).not.toMatch(/role',\s*'student'/)
    expect(read('server/api/admin/marketing-ads-keywords.get.ts')).toContain(".eq('role', 'client')")
    expect(read('server/api/admin/marketing-ads-keywords.get.ts')).not.toMatch(/role',\s*'student'/)
  })

  it('course session binding accepts only client', () => {
    const src = read('server/utils/fulfill-course-wallee-payment.ts')
    expect(src).toContain("new Set(['client'])")
    expect(src).not.toContain("'student'")
  })
})
