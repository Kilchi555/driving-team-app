import type { H3Event } from 'h3'
import { describe, expect, it } from 'vitest'
import {
  canSwitchToStaff,
  isActiveTenantAdmin,
  isEligibleSwitchActor,
  isPrimaryTenantAdmin,
  isSwitchableStaff,
  preferredImpersonationActorId,
} from '../account-switch'

describe('account switch helpers', () => {
  it('treats linked staff and switch-all staff as eligible actors', () => {
    expect(isEligibleSwitchActor({
      role: 'staff',
      admin_level: null,
      linked_admin_user_id: 'admin-1',
      can_switch_all_staff: false,
      is_active: true,
      deleted_at: null,
    })).toBe(true)

    expect(isEligibleSwitchActor({
      role: 'staff',
      admin_level: null,
      linked_admin_user_id: null,
      can_switch_all_staff: true,
      is_active: true,
      deleted_at: null,
    })).toBe(true)

    expect(isEligibleSwitchActor({
      role: 'staff',
      admin_level: null,
      linked_admin_user_id: null,
      can_switch_all_staff: false,
      is_active: true,
      deleted_at: null,
    })).toBe(false)

    expect(isEligibleSwitchActor({
      role: 'admin',
      admin_level: null,
      linked_admin_user_id: null,
      can_switch_all_staff: false,
      is_active: true,
      deleted_at: null,
    })).toBe(true)
  })

  it('promotes linked staff to the admin for the impersonation cookie', () => {
    expect(preferredImpersonationActorId(
      { id: 'staff-1', role: 'staff', linked_admin_user_id: 'admin-1' },
      'admin-1',
    )).toBe('admin-1')

    expect(preferredImpersonationActorId(
      { id: 'admin-1', role: 'admin', linked_admin_user_id: null },
      null,
    )).toBe('admin-1')

    expect(preferredImpersonationActorId(
      { id: 'staff-2', role: 'staff', linked_admin_user_id: null },
      null,
    )).toBe('staff-2')
  })

  it('recognizes only an active primary flag as the primary admin', () => {
    const base = {
      role: 'admin' as const,
      is_primary_admin: true,
      is_active: true,
      deleted_at: null,
    }
    expect(isPrimaryTenantAdmin(base)).toBe(true)
    expect(isPrimaryTenantAdmin({ ...base, is_primary_admin: false })).toBe(false)
    expect(isPrimaryTenantAdmin({ ...base, admin_level: 'sub_admin' })).toBe(true)
    expect(isPrimaryTenantAdmin({ ...base, is_primary_admin: false, admin_level: 'primary_admin' })).toBe(false)
    expect(isPrimaryTenantAdmin({ ...base, is_active: false })).toBe(false)
    expect(isPrimaryTenantAdmin({ ...base, deleted_at: '2026-01-01' })).toBe(false)
    expect(isPrimaryTenantAdmin({ ...base, role: 'staff' })).toBe(false)
    expect(isPrimaryTenantAdmin({ ...base, role: 'superadmin' })).toBe(false)
  })

  it('lets every active admin switch toward staff, not only the primary', () => {
    expect(isActiveTenantAdmin({
      role: 'admin',
      is_active: true,
      deleted_at: null,
    })).toBe(true)
    expect(isActiveTenantAdmin({
      role: 'admin',
      is_active: false,
      deleted_at: null,
    })).toBe(false)
    expect(isActiveTenantAdmin({
      role: 'superadmin',
      is_active: true,
      deleted_at: null,
    })).toBe(false)
  })

  it('does not switch across tenants', async () => {
    const current = {
      id: 'admin-1',
      tenant_id: 'tenant-a',
      auth_user_id: 'auth-1',
      role: 'admin',
      email: 'admin@example.com',
      first_name: 'Ada',
      last_name: 'Admin',
      is_active: true,
      deleted_at: null,
      is_primary_admin: false,
    }
    const target = {
      ...current,
      id: 'staff-1',
      tenant_id: 'tenant-b',
      role: 'staff' as const,
      email: 'staff@example.com',
    }
    await expect(canSwitchToStaff({} as H3Event, current, target)).resolves.toBe(false)
  })

  it('does not treat inactive users as switchable staff', () => {
    expect(isSwitchableStaff({
      id: 's1',
      tenant_id: 't1',
      auth_user_id: 'a1',
      role: 'staff',
      email: 's@example.com',
      first_name: 'A',
      last_name: 'B',
      is_active: false,
      deleted_at: null,
    })).toBe(false)
  })
})
