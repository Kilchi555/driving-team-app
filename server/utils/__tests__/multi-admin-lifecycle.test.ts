import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { H3Error } from 'h3'
import { hasActiveLoginProfile, isDeactivatedOrDeleted } from '../profile-access'
import { parseInvitationRole, pickStaffInviteFields, roleFromInvitation } from '../invitation-role'
import {
  evaluateDeactivation,
  evaluateReactivation,
  isActivePrimaryAdmin,
  passesNormalAdminCheck,
  resolveScopedTenantId,
  type LifecycleUser,
} from '../admin-lifecycle'
import { staffCreatePayload } from '../assignable-user-roles'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

function statusOf(run: () => void): number | undefined {
  try {
    run()
  } catch (err: unknown) {
    const code = (err as H3Error).statusCode
    return typeof code === 'number' ? code : undefined
  }
}

function user(partial: Partial<LifecycleUser> & Pick<LifecycleUser, 'id' | 'tenant_id' | 'role'>): LifecycleUser {
  return {
    is_primary_admin: false,
    is_active: true,
    deleted_at: null,
    auth_user_id: 'auth-' + partial.id,
    ...partial,
  }
}

describe('multi-admin invitation and login', () => {
  it('primary or any admin invites a second admin, and omitted role stays staff', () => {
    expect(parseInvitationRole(undefined)).toBe('staff')
    expect(parseInvitationRole('staff')).toBe('staff')
    expect(parseInvitationRole('admin')).toBe('admin')
    expect(statusOf(() => parseInvitationRole('sub_admin'))).toBe(400)
    expect(statusOf(() => parseInvitationRole('super_admin'))).toBe(400)

    const invited = pickStaffInviteFields({
      first_name: 'Bea',
      last_name: 'Admin',
      email: 'bea@example.com',
      role: 'admin',
      tenant_id: 'tenant-b',
      is_primary_admin: true,
    })
    expect(invited).toEqual({
      first_name: 'Bea',
      last_name: 'Admin',
      email: 'bea@example.com',
      phone: '',
      role: 'admin',
    })
    expect(invited).not.toHaveProperty('tenant_id')
    expect(invited).not.toHaveProperty('is_primary_admin')
  })

  it('keeps the existing staff invite form fields and ignores a nested tenant', () => {
    const staffInvite = pickStaffInviteFields({
      firstName: 'Sam',
      email: 'sam@example.com',
      phone: '+41790000000',
      user_data: { tenant_id: 'tenant-b', role: 'admin', is_primary_admin: true },
    })
    expect(staffInvite.role).toBe('staff')
    expect(staffInvite.first_name).toBe('Sam')
    expect(staffInvite).not.toHaveProperty('tenant_id')
    expect(staffInvite).not.toHaveProperty('user_data')
  })

  it('accepts the invitation role and never promotes the new admin to primary', () => {
    expect(roleFromInvitation('admin')).toBe('admin')
    expect(roleFromInvitation('staff')).toBe('staff')
    expect(roleFromInvitation('super_admin')).toBe('staff')
    expect(roleFromInvitation(undefined)).toBe('staff')

    const register = read('server/api/staff/register.post.ts')
    expect(register).toContain('role: registeredRole')
    expect(register).toContain('is_primary_admin: false')
    expect(register).toContain('tenant_id: invitation.tenant_id')
    expect(register).toContain("registeredRole === 'staff'")
    expect(register).toContain('auth.admin.deleteUser')
    expect(register).toContain('releaseStaffInvitationClaim')
    expect(register).toContain('statusCode: 409')
    expect(register).not.toMatch(/updateUserById/)
  })

  it('lets an active second admin log in and rejects inactive, deleted, and missing profiles', () => {
    expect(hasActiveLoginProfile({ is_active: true, deleted_at: null })).toBe(true)
    expect(hasActiveLoginProfile({ is_active: false, deleted_at: null })).toBe(false)
    expect(hasActiveLoginProfile({ is_active: true, deleted_at: '2026-01-01' })).toBe(false)
    expect(hasActiveLoginProfile(null)).toBe(false)

    const login = read('server/api/auth/login.post.ts')
    const gate = login.indexOf('hasActiveLoginProfile')
    const revoke = login.indexOf('revokeAuthSessions')
    const cookies = login.indexOf('setAuthCookies(event, data.session.access_token')
    expect(gate).toBeGreaterThan(-1)
    expect(revoke).toBeGreaterThan(gate)
    expect(cookies).toBeGreaterThan(revoke)
    expect(login).toContain('statusCode: 403')
  })
})

describe('multi-admin tenant isolation and privilege injection', () => {
  it('denies a foreign tenant id and ignores a nested tenant id', () => {
    expect(resolveScopedTenantId('admin', 'tenant-a', undefined)).toBe('tenant-a')
    expect(resolveScopedTenantId('admin', 'tenant-a', 'tenant-a')).toBe('tenant-a')
    expect(statusOf(() => resolveScopedTenantId('admin', 'tenant-a', 'tenant-b'))).toBe(403)
    expect(resolveScopedTenantId('super_admin', 'tenant-a', 'tenant-b')).toBe('tenant-b')

    const created = staffCreatePayload({
      first_name: 'Sam',
      tenant_id: 'tenant-b',
      role: 'admin',
      admin_level: 'sub_admin',
      is_primary_admin: true,
      auth_user_id: 'auth-injected',
      is_active: true,
      deleted_at: null,
      profile: { tenant_id: 'tenant-b', role: 'admin' },
    }, 'tenant-a')
    expect(created.tenant_id).toBe('tenant-a')
    expect(created.role).toBe('staff')
    expect(created.is_primary_admin).toBe(false)
    expect(created).not.toHaveProperty('auth_user_id')
    expect(created).not.toHaveProperty('admin_level')
    expect(created).not.toHaveProperty('profile')
  })

  it('scopes user reads and refuses login-less admin creation', () => {
    const usersApi = read('server/api/admin/users.post.ts')
    expect(usersApi).toContain('resolveScopedTenantId')
    expect(usersApi).toContain('assertTargetInScope')
    expect(usersApi).toContain('USER_READ_COLUMNS')
    expect(usersApi).not.toContain(".select('*')")
    expect(usersApi).toContain("action === 'create-admin'")
    expect(usersApi).toContain('statusCode: 400')
    expect(usersApi).not.toContain("role: 'admin'")

    const manage = read('server/api/admin/users/manage.post.ts')
    const removed = manage.indexOf("action === 'create_sub_admin'")
    const insertAfter = manage.indexOf(".insert(", removed)
    expect(removed).toBeGreaterThan(-1)
    expect(insertAfter).toBe(-1)
    expect(manage).not.toContain("admin_level: 'sub_admin'")
    expect(manage).toContain('Cannot read audit data in other tenants')
    const auditGate = manage.indexOf('Cannot read audit data in other tenants')
    const auditRead = manage.indexOf("from('user_management_audit')")
    expect(auditGate).toBeGreaterThan(-1)
    expect(auditGate).toBeLessThan(auditRead)
  })

  it('refuses to mint a profile from client role or tenant on password completion', () => {
    const complete = read('server/api/auth/complete-registration.post.ts')
    expect(complete).not.toContain('.insert(')
    expect(complete).not.toContain('body.role')
    expect(complete).not.toContain('body.tenant_id')
    expect(complete).not.toContain('admin_level')
    expect(complete).not.toContain('is_primary_admin')
    expect(complete).toContain('statusCode: 409')
    expect(complete).toContain(".eq('auth_user_id', authUser.id)")

    const setPassword = read('pages/login/set-password.vue')
    expect(setPassword).not.toContain('role: userInfo.value.role')
    expect(setPassword).not.toContain('tenant_id: userInfo.value.tenant_id')
    expect(setPassword).not.toContain('Sub-Admin')
  })

  it('does not authorize location assignment or student staff from admin_level or sub_admin', () => {
    const assign = read('server/api/staff/assign-location.post.ts')
    expect(assign).not.toContain('admin_level')
    expect(assign).toContain("['admin', 'tenant_admin', 'super_admin'].includes(caller.role)")

    const addStudent = read('server/api/admin/add-student.post.ts')
    expect(addStudent).not.toContain("'sub_admin'")
  })

  it('does not let staff or the superadmin alias pass a normal admin check', () => {
    expect(passesNormalAdminCheck('admin')).toBe(true)
    expect(passesNormalAdminCheck('staff')).toBe(false)
    expect(passesNormalAdminCheck('superadmin')).toBe(false)
    expect(passesNormalAdminCheck('super_admin')).toBe(false)
    expect(passesNormalAdminCheck('client')).toBe(false)

    const usersApi = read('server/api/admin/users.post.ts')
    expect(usersApi).toContain("!['admin', 'super_admin'].includes(authUser.role || '')")
    expect(usersApi).not.toContain("'superadmin'")
  })
})

describe('multi-admin primary lifecycle', () => {
  const primary = user({ id: 'primary', tenant_id: 'tenant-a', role: 'admin', is_primary_admin: true })
  const second = user({ id: 'second', tenant_id: 'tenant-a', role: 'admin' })
  const staff = user({ id: 'staff', tenant_id: 'tenant-a', role: 'staff' })
  const foreign = user({ id: 'foreign', tenant_id: 'tenant-b', role: 'staff' })

  it('blocks removing the last active admin and primary self-deactivation', () => {
    expect(evaluateDeactivation({
      caller: second,
      target: primary,
      activeAdminCount: 1,
    })).toMatchObject({ ok: false, statusCode: 409 })

    expect(evaluateDeactivation({
      caller: primary,
      target: primary,
      activeAdminCount: 2,
    })).toMatchObject({ ok: false, statusCode: 403 })

    expect(evaluateDeactivation({
      caller: second,
      target: primary,
      activeAdminCount: 2,
    })).toMatchObject({ ok: false, statusCode: 403 })

    expect(evaluateDeactivation({
      caller: primary,
      target: second,
      activeAdminCount: 2,
    })).toMatchObject({ ok: true })

    expect(evaluateDeactivation({
      caller: primary,
      target: staff,
      activeAdminCount: 1,
    })).toMatchObject({ ok: true })
  })

  it('denies cross-tenant deactivation and staff reactivation', () => {
    expect(evaluateDeactivation({
      caller: primary,
      target: foreign,
      activeAdminCount: 0,
    })).toMatchObject({ ok: false, statusCode: 403 })

    expect(evaluateReactivation(staff)).toMatchObject({ ok: false, statusCode: 403 })
    expect(evaluateReactivation(second)).toMatchObject({ ok: false, statusCode: 403 })
    expect(evaluateReactivation(primary).ok).toBe(true)
    expect(evaluateReactivation(user({
      id: 'sa',
      tenant_id: null,
      role: 'super_admin',
    })).ok).toBe(true)
    expect(evaluateReactivation({ ...primary, is_primary_admin: false, role: 'admin' }).ok).toBe(false)
  })

  it('transfers primary only through the SQL function and keeps bootstrap single-primary', () => {
    expect(isActivePrimaryAdmin(primary)).toBe(true)
    expect(isActivePrimaryAdmin(second)).toBe(false)
    expect(isActivePrimaryAdmin({ ...primary, admin_level: 'sub_admin' } as LifecycleUser)).toBe(true)

    const transfer = read('server/api/admin/transfer-primary.post.ts')
    expect(transfer).toContain("rpc('transfer_primary_admin'")
    expect(transfer).toContain('p_caller_user_id: authUser.db_user_id')
    expect(transfer).toContain('p_target_user_id: targetUserId')
    expect(transfer).not.toMatch(/\.update\(\s*\{[^}]*is_primary_admin/)

    const sql = read('migrations/20261002_transfer_primary_admin.sql')
    expect(sql).toContain('v_caller.is_primary_admin IS NOT TRUE')
    expect(sql).toContain('v_target.auth_user_id IS NULL')
    expect(sql).toContain('v_caller.tenant_id IS DISTINCT FROM v_target.tenant_id')
    expect(sql).toContain('SET is_primary_admin = CASE')
    expect(sql).not.toMatch(/UPDATE public\.users[\s\S]*UPDATE public\.users/)

    const repair = read('migrations/20261002_multi_admin_primary_repair.sql')
    expect(repair).toContain('users_primary_admin_requires_admin_role')
    expect(repair).toContain('users_one_active_primary_per_tenant')
    expect(repair).toContain('CHECK (is_primary_admin = false OR role = \'admin\')')
    expect(repair).toContain('auth_user_id IS NOT NULL')
    expect(repair).not.toMatch(/auth\.users/)
    expect(repair).not.toContain('admin_level =')

    const bootstrap = read('server/api/tenants/create-admin.post.ts')
    expect(bootstrap).toContain('verifyRegistrationToken')
    expect(bootstrap).toContain(".eq('is_primary_admin', true)")
    expect(bootstrap).toContain('statusCode: 409')
  })

  it('fails closed for a deactivated profile on both auth return paths', () => {
    expect(isDeactivatedOrDeleted({ is_active: false, deleted_at: null })).toBe(true)
    expect(isDeactivatedOrDeleted({ is_active: true, deleted_at: '2026-01-01' })).toBe(true)
    expect(isDeactivatedOrDeleted({ is_active: true, deleted_at: null })).toBe(false)

    const auth = read('server/utils/auth.ts')
    const checks = auth.split('isDeactivatedOrDeleted(').length - 1
    expect(checks).toBeGreaterThanOrEqual(3)
    const refreshCheck = auth.indexOf('if (isDeactivatedOrDeleted(dbUser)) return null')
    const refreshCookies = auth.indexOf('setAuthCookies(event, session.access_token, session.refresh_token)')
    expect(refreshCheck).toBeGreaterThan(-1)
    expect(refreshCheck).toBeLessThan(refreshCookies)

    const deactivate = read('server/api/users/deactivate.post.ts')
    expect(deactivate).toContain('deactivateTenantUser')
    const lifecycle = read('server/utils/admin-lifecycle.ts')
    expect(lifecycle).toContain('revokeAuthSessions')
    expect(lifecycle).not.toContain('ban_duration')
  })
})

describe('multi-admin database contracts', () => {
  it('adds invitation role without editing historical migrations', () => {
    const sql = read('migrations/20261002_staff_invitations_role.sql')
    expect(sql).toContain("role text NOT NULL DEFAULT 'staff'")
    expect(sql).toContain("CHECK (role IN ('admin', 'staff'))")
    const historical = read('migrations/20260903_sec_c01_users_privilege_freeze.sql')
    expect(historical).not.toContain('is_primary_admin')
  })

  it('reauthorizes staff_locations admins by role instead of admin_level', () => {
    const sql = read('migrations/20261002_staff_locations_admin_role_rls.sql')
    expect(sql).toContain("u.role = 'admin'")
    expect(sql).toContain('u.is_active = true')
    expect(sql).toContain('u.deleted_at IS NULL')
    expect(sql).toContain('u.tenant_id = staff_locations.tenant_id')
    expect(sql).not.toContain('admin_level IS NOT NULL')
    expect(sql).not.toContain('staff_locations_select_own')
  })
})
