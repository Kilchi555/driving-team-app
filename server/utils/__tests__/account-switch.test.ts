import { describe, expect, it } from 'vitest'
import {
  isEligibleSwitchActor,
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
