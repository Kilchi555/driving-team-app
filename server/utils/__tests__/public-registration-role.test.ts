/**
 * AUTH-P0-01 — Public register-client must never mint a privileged role.
 *
 * Fail-closed: client-supplied isAdmin / role (body, query, header) is ignored.
 * First-tenant bootstrap remains POST /api/tenants/create-admin (HMAC token).
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  isPrivilegedUserRole,
  PUBLIC_REGISTRATION_ROLE,
  resolvePublicRegistrationRole,
} from '../public-registration-role'

const registerClientPath = resolve(process.cwd(), 'server/api/auth/register-client.post.ts')
const registerPagePath = resolve(process.cwd(), 'pages/register/[tenant].vue')
const createAdminPath = resolve(process.cwd(), 'server/api/tenants/create-admin.post.ts')

describe('AUTH-P0-01 — resolvePublicRegistrationRole is fail-closed', () => {
  it('always returns client, ignoring isAdmin / privileged role strings', () => {
    expect(resolvePublicRegistrationRole()).toBe('client')
    expect(resolvePublicRegistrationRole(undefined)).toBe('client')
    expect(resolvePublicRegistrationRole(null)).toBe('client')
    expect(resolvePublicRegistrationRole(true)).toBe('client')
    expect(resolvePublicRegistrationRole(false)).toBe('client')
    expect(resolvePublicRegistrationRole('tenant_admin')).toBe('client')
    expect(resolvePublicRegistrationRole('admin')).toBe('client')
    expect(resolvePublicRegistrationRole('staff')).toBe('client')
    expect(resolvePublicRegistrationRole('super_admin')).toBe('client')
    expect(resolvePublicRegistrationRole('client')).toBe('client')
    expect(PUBLIC_REGISTRATION_ROLE).toBe('client')
  })

  it('never returns a privileged role for any requested value', () => {
    const payloads = [
      { isAdmin: true },
      { isAdmin: 'true' },
      { isAdmin: 1 },
      { role: 'tenant_admin' },
      { role: 'admin' },
      { role: 'staff' },
      { role: 'super_admin' },
      { role: 'tenant_admin', isAdmin: true },
    ]
    for (const body of payloads) {
      const role = resolvePublicRegistrationRole(body.role ?? body.isAdmin)
      expect(isPrivilegedUserRole(role)).toBe(false)
      expect(role).toBe('client')
    }
  })

  it('classifies privileged role strings', () => {
    expect(isPrivilegedUserRole('tenant_admin')).toBe(true)
    expect(isPrivilegedUserRole('admin')).toBe(true)
    expect(isPrivilegedUserRole('staff')).toBe(true)
    expect(isPrivilegedUserRole('super_admin')).toBe(true)
    expect(isPrivilegedUserRole('client')).toBe(false)
    expect(isPrivilegedUserRole('student')).toBe(false)
  })
})

describe('AUTH-P0-01 — register-client.source contract', () => {
  const src = readFileSync(registerClientPath, 'utf8')

  it('assigns role via resolvePublicRegistrationRole, not body.isAdmin', () => {
    expect(src).toContain("from '~/server/utils/public-registration-role'")
    expect(src).toContain('resolvePublicRegistrationRole')
    expect(src).not.toMatch(/isAdmin\s*\?\s*['"]tenant_admin['"]/)
    expect(src).not.toMatch(/userRole\s*=\s*isAdmin/)
    expect(src).not.toMatch(/role:\s*isAdmin\s*\?/)
  })

  it('does not skip pendingOnly or hidden-account policy based on isAdmin', () => {
    expect(src).not.toMatch(/pendingOnly\s*&&\s*!isAdmin/)
    expect(src).not.toMatch(/!isAdmin\s*&&\s*normalizeRegistrationAccountMode/)
  })

  it('does not destructure isAdmin as an authorization gate', () => {
    expect(src).not.toMatch(/isAdmin\s*=\s*false/)
    expect(src).toContain('ignoredClientIsAdmin')
  })
})

describe('AUTH-P0-01 — public register page does not send isAdmin', () => {
  it('register-client fetch body has no isAdmin flag', () => {
    const src = readFileSync(registerPagePath, 'utf8')
    expect(src).toContain("/api/auth/register-client")
    expect(src).not.toMatch(/isAdmin:\s*isAdminRegistration/)
    expect(src).not.toMatch(/isAdmin:\s*true/)
  })
})

describe('AUTH-P0-01 — tenant bootstrap path is unchanged', () => {
  it('create-admin still assigns admin via HMAC registration_token, not public register-client', () => {
    const src = readFileSync(createAdminPath, 'utf8')
    expect(src).toContain('verifyRegistrationToken')
    expect(src).toContain("role: 'admin'")
    expect(src).not.toContain('register-client')
  })
})
