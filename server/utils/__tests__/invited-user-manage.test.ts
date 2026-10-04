import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { AuthEmailClaimCode, type AuthEmailClaim } from '../auth-email-claim'
import {
  assertClientInviteEmailFree,
  assertInvitationAdmin,
  buildStaffInvitationRenewal,
  clientOnboardingAcceptsToken,
  renewPendingClientInvitation,
  staffInvitationAcceptsToken,
  updatePendingClientInvitation,
  updatePendingStaffInvitation,
  type PendingClientRow,
  type StaffInvitationRow,
} from '../invited-user-manage'

const NOW = new Date('2026-10-04T09:00:00.000Z')
const FUTURE = '2026-11-04T09:00:00.000Z'
const TENANT = '11111111-1111-1111-1111-111111111111'
const OTHER_TENANT = '22222222-2222-2222-2222-222222222222'
const STAFF_ID = '33333333-3333-3333-3333-333333333333'
const ADMIN_ID = '44444444-4444-4444-4444-444444444444'
const CLIENT_ID = '55555555-5555-5555-5555-555555555555'

const adminCaller = {
  role: 'admin' as const,
  tenantId: TENANT,
  isActive: true,
  deletedAt: null,
}

function staffRow(overrides: Partial<StaffInvitationRow> = {}): StaffInvitationRow {
  return {
    id: STAFF_ID,
    tenant_id: TENANT,
    first_name: 'John',
    last_name: 'Example',
    email: 'old@example.com',
    status: 'pending',
    role: 'staff',
    invitation_token: 'old-staff-token',
    expires_at: FUTURE,
    ...overrides,
  }
}

function clientRow(overrides: Partial<PendingClientRow> = {}): PendingClientRow {
  return {
    id: CLIENT_ID,
    tenant_id: TENANT,
    role: 'client',
    first_name: 'Jane',
    last_name: 'Example',
    email: 'jane@example.com',
    onboarding_status: 'pending',
    onboarding_token: 'old-client-token',
    onboarding_token_expires: FUTURE,
    auth_user_id: null,
    ...overrides,
  }
}

function claim(code: AuthEmailClaim['code'], availableForAccount: boolean, message = 'taken'): AuthEmailClaim {
  return {
    code,
    availableForAccount,
    availableForGuestBooking: false,
    authUserId: code === AuthEmailClaimCode.AVAILABLE ? null : 'auth-1',
    message,
  }
}

async function expectStatus(promise: Promise<unknown>, statusCode: number) {
  await expect(promise).rejects.toMatchObject({ statusCode })
}

describe('invited user edit and resend', () => {
  it('admin edits an invited client name and keeps the invitation pending', async () => {
    const rows = [clientRow()]
    let saved: Record<string, unknown> | null = null
    const result = await updatePendingClientInvitation({
      caller: adminCaller,
      userId: CLIENT_ID,
      firstName: 'Janet',
      lastName: 'Sample',
      email: 'jane@example.com',
      now: NOW,
      load: async (id, tenantId) => rows.find(row => row.id === id && row.tenant_id === tenantId) || null,
      save: async (id, tenantId, patch) => {
        saved = patch
        const row = rows.find(item => item.id === id && item.tenant_id === tenantId)
        if (!row || row.onboarding_status !== 'pending' || row.auth_user_id) return false
        Object.assign(row, patch)
        return true
      },
      ensureEmailAvailable: async () => {
        throw new Error('email check should not run')
      },
    })

    expect(result.role).toBe('client')
    expect(result.onboarding_status).toBe('pending')
    expect(result.emailChanged).toBe(false)
    expect(result.tokenRotated).toBe(false)
    expect(saved).toEqual({ first_name: 'Janet', last_name: 'Sample' })
    expect(rows).toHaveLength(1)
    expect(rows[0].onboarding_status).toBe('pending')
    expect(rows[0].onboarding_token).toBe('old-client-token')
    expect(rows[0].role).toBe('client')
    expect(clientOnboardingAcceptsToken(rows[0], 'old-client-token', NOW)).toBe(true)
  })

  it('admin edits an invited staff name without rotating the token or the role', async () => {
    const rows = [staffRow()]
    let saved: Record<string, unknown> | null = null
    const result = await updatePendingStaffInvitation({
      caller: adminCaller,
      invitationId: STAFF_ID,
      firstName: 'Johann',
      lastName: 'Beispiel',
      email: 'old@example.com',
      now: NOW,
      load: async (id, tenantId) => rows.find(row => row.id === id && row.tenant_id === tenantId) || null,
      save: async (id, tenantId, patch) => {
        saved = patch
        const row = rows.find(item => item.id === id && item.tenant_id === tenantId)
        if (!row || !['pending', 'expired'].includes(row.status)) return false
        Object.assign(row, patch)
        return true
      },
      ensureEmailAvailable: async () => {
        throw new Error('email check should not run')
      },
    })

    expect(result.role).toBe('staff')
    expect(result.status).toBe('pending')
    expect(result.tokenRotated).toBe(false)
    expect(saved).toEqual({ first_name: 'Johann', last_name: 'Beispiel' })
    expect(saved).not.toHaveProperty('role')
    expect(saved).not.toHaveProperty('tenant_id')
    expect(rows).toHaveLength(1)
    expect(rows[0].invitation_token).toBe('old-staff-token')
    expect(staffInvitationAcceptsToken(rows[0], 'old-staff-token', NOW)).toBe(true)
  })

  it('admin edits an invited admin name and the role stays admin', async () => {
    const rows = [staffRow({ id: ADMIN_ID, role: 'admin', email: 'admin-invite@example.com' })]
    const result = await updatePendingStaffInvitation({
      caller: adminCaller,
      invitationId: ADMIN_ID,
      firstName: 'Ada',
      lastName: 'Admin',
      email: 'admin-invite@example.com',
      now: NOW,
      load: async (id, tenantId) => rows.find(row => row.id === id && row.tenant_id === tenantId) || null,
      save: async (id, tenantId, patch) => {
        const row = rows.find(item => item.id === id && item.tenant_id === tenantId)
        if (!row) return false
        Object.assign(row, patch)
        return true
      },
      ensureEmailAvailable: async () => undefined,
    })

    expect(result.role).toBe('admin')
    expect(rows[0].role).toBe('admin')
    expect(rows[0].status).toBe('pending')
    expect(rows).toHaveLength(1)
  })

  it('admin email change rotates the staff token and rejects the previous one', async () => {
    const rows = [staffRow()]
    const result = await updatePendingStaffInvitation({
      caller: adminCaller,
      invitationId: STAFF_ID,
      firstName: 'John',
      lastName: 'Example',
      email: 'new@example.com',
      now: NOW,
      createToken: () => 'new-staff-token',
      load: async (id, tenantId) => rows.find(row => row.id === id && row.tenant_id === tenantId) || null,
      save: async (id, tenantId, patch) => {
        const row = rows.find(item => item.id === id && item.tenant_id === tenantId)
        if (!row) return false
        Object.assign(row, patch)
        return true
      },
      ensureEmailAvailable: async () => undefined,
    })

    expect(result.email).toBe('new@example.com')
    expect(result.emailChanged).toBe(true)
    expect(result.tokenRotated).toBe(true)
    expect(result.status).toBe('pending')
    expect(result.role).toBe('staff')
    expect(rows).toHaveLength(1)
    expect(rows[0].email).toBe('new@example.com')
    expect(rows[0].invitation_token).toBe('new-staff-token')
    expect(staffInvitationAcceptsToken(rows[0], 'old-staff-token', NOW)).toBe(false)
    expect(staffInvitationAcceptsToken(rows[0], 'new-staff-token', NOW)).toBe(true)
  })

  it('resend without an email change keeps the address and issues a fresh token', async () => {
    const renewal = buildStaffInvitationRenewal({
      email: 'old@example.com',
      now: NOW,
      token: 'resent-staff-token',
    })
    const row = staffRow()
    Object.assign(row, renewal)

    expect(renewal.email).toBe('old@example.com')
    expect(renewal.status).toBe('pending')
    expect(renewal.invitation_token).not.toBe('old-staff-token')
    expect(staffInvitationAcceptsToken(row, 'old-staff-token', NOW)).toBe(false)
    expect(staffInvitationAcceptsToken(row, 'resent-staff-token', NOW)).toBe(true)

    const clients = [clientRow()]
    const resent = await renewPendingClientInvitation({
      caller: adminCaller,
      userId: CLIENT_ID,
      now: NOW,
      createToken: () => 'resent-client-token',
      load: async (id, tenantId) => clients.find(row => row.id === id && row.tenant_id === tenantId) || null,
      save: async (id, tenantId, patch) => {
        const target = clients.find(row => row.id === id && row.tenant_id === tenantId)
        if (!target || target.onboarding_status !== 'pending') return false
        Object.assign(target, patch)
        return true
      },
    })

    expect(resent.email).toBe('jane@example.com')
    expect(resent.role).toBe('client')
    expect(resent.onboarding_status).toBe('pending')
    expect(resent.previousToken).toBe('old-client-token')
    expect(clients).toHaveLength(1)
    expect(clientOnboardingAcceptsToken(clients[0], 'old-client-token', NOW)).toBe(false)
    expect(clientOnboardingAcceptsToken(clients[0], 'resent-client-token', NOW)).toBe(true)
  })

  it('email change then resend sends the new address and kills the old token', async () => {
    const rows = [staffRow()]
    const save = async (id: string, tenantId: string, patch: Record<string, unknown>) => {
      const row = rows.find(item => item.id === id && item.tenant_id === tenantId)
      if (!row || row.status === 'accepted') return false
      Object.assign(row, patch)
      return true
    }

    await updatePendingStaffInvitation({
      caller: adminCaller,
      invitationId: STAFF_ID,
      firstName: 'John',
      lastName: 'Example',
      email: 'new@example.com',
      now: NOW,
      createToken: () => 'after-edit-token',
      load: async (id, tenantId) => rows.find(row => row.id === id && row.tenant_id === tenantId) || null,
      save,
      ensureEmailAvailable: async () => undefined,
    })

    expect(staffInvitationAcceptsToken(rows[0], 'old-staff-token', NOW)).toBe(false)

    const renewal = buildStaffInvitationRenewal({
      email: rows[0].email || '',
      now: NOW,
      token: 'after-resend-token',
    })
    await save(STAFF_ID, TENANT, renewal)

    expect(rows).toHaveLength(1)
    expect(rows[0].email).toBe('new@example.com')
    expect(rows[0].role).toBe('staff')
    expect(rows[0].tenant_id).toBe(TENANT)
    expect(rows[0].status).toBe('pending')
    expect(staffInvitationAcceptsToken(rows[0], 'old-staff-token', NOW)).toBe(false)
    expect(staffInvitationAcceptsToken(rows[0], 'after-edit-token', NOW)).toBe(false)
    expect(staffInvitationAcceptsToken(rows[0], 'after-resend-token', NOW)).toBe(true)
  })

  it('client email change then resend keeps one pending user and the new email', async () => {
    const rows = [clientRow({ email: 'old@example.com' })]
    const save = async (id: string, tenantId: string, patch: Record<string, unknown>) => {
      const row = rows.find(item => item.id === id && item.tenant_id === tenantId)
      if (!row || row.onboarding_status !== 'pending' || row.auth_user_id) return false
      Object.assign(row, patch)
      return true
    }

    await updatePendingClientInvitation({
      caller: adminCaller,
      userId: CLIENT_ID,
      firstName: 'John',
      lastName: 'Example',
      email: 'new@example.com',
      now: NOW,
      createToken: () => 'after-edit-client',
      load: async (id, tenantId) => rows.find(row => row.id === id && row.tenant_id === tenantId) || null,
      save,
      ensureEmailAvailable: async () => undefined,
    })

    const resent = await renewPendingClientInvitation({
      caller: adminCaller,
      userId: CLIENT_ID,
      now: NOW,
      createToken: () => 'after-resend-client',
      load: async (id, tenantId) => rows.find(row => row.id === id && row.tenant_id === tenantId) || null,
      save,
    })

    expect(rows).toHaveLength(1)
    expect(resent.email).toBe('new@example.com')
    expect(rows[0].email).toBe('new@example.com')
    expect(rows[0].role).toBe('client')
    expect(rows[0].onboarding_status).toBe('pending')
    expect(rows[0].auth_user_id).toBeNull()
    expect(clientOnboardingAcceptsToken(rows[0], 'old-client-token', NOW)).toBe(false)
    expect(clientOnboardingAcceptsToken(rows[0], 'after-edit-client', NOW)).toBe(false)
    expect(clientOnboardingAcceptsToken(rows[0], 'after-resend-client', NOW)).toBe(true)
  })

  it('another tenant cannot edit or resend an invitation', async () => {
    const staff = [staffRow()]
    const clients = [clientRow()]
    let staffSaves = 0
    let clientSaves = 0
    const otherAdmin = { ...adminCaller, tenantId: OTHER_TENANT }

    await expectStatus(updatePendingStaffInvitation({
      caller: otherAdmin,
      invitationId: STAFF_ID,
      firstName: 'Nope',
      lastName: 'Nope',
      email: 'new@example.com',
      load: async (id, tenantId) => staff.find(row => row.id === id && row.tenant_id === tenantId) || null,
      save: async () => {
        staffSaves += 1
        return true
      },
      ensureEmailAvailable: async () => undefined,
    }), 404)

    await expectStatus(renewPendingClientInvitation({
      caller: otherAdmin,
      userId: CLIENT_ID,
      load: async (id, tenantId) => clients.find(row => row.id === id && row.tenant_id === tenantId) || null,
      save: async () => {
        clientSaves += 1
        return true
      },
    }), 404)

    expect(staffSaves).toBe(0)
    expect(clientSaves).toBe(0)
    expect(staff[0].email).toBe('old@example.com')
    expect(clients[0].email).toBe('jane@example.com')
  })

  it('staff and clients cannot edit or resend invitations', async () => {
    let loads = 0
    await expectStatus(updatePendingStaffInvitation({
      caller: { role: 'staff', tenantId: TENANT, isActive: true },
      invitationId: STAFF_ID,
      firstName: 'A',
      lastName: 'B',
      email: 'a@example.com',
      load: async () => {
        loads += 1
        return staffRow()
      },
      save: async () => true,
      ensureEmailAvailable: async () => undefined,
    }), 403)

    await expectStatus(renewPendingClientInvitation({
      caller: { role: 'client', tenantId: TENANT, isActive: true },
      userId: CLIENT_ID,
      load: async () => {
        loads += 1
        return clientRow()
      },
      save: async () => true,
    }), 403)

    expect(loads).toBe(0)
    expect(() => assertInvitationAdmin({ role: 'staff', tenantId: TENANT })).toThrow()
  })

  it('rejects an email that already belongs to an active account', () => {
    expect(() => assertClientInviteEmailFree({
      claim: claim(AuthEmailClaimCode.TENANT_CLIENT_EXISTS, false, 'Diese E-Mail-Adresse ist bereits mit einem Konto verbunden. Bitte melde dich an.'),
      otherUserInTenant: true,
      pendingStaffInvite: false,
    })).toThrow(/bereits mit einem Konto/)

    expect(() => assertClientInviteEmailFree({
      claim: claim(AuthEmailClaimCode.AUTH_LINKED_ELSEWHERE, false, 'Diese E-Mail-Adresse ist bereits mit einem anderen Konto verknüpft. Bitte verwende eine andere E-Mail-Adresse oder melde dich direkt an.'),
      otherUserInTenant: false,
      pendingStaffInvite: false,
    })).toThrow(/anderen Konto/)
  })

  it('rejects a duplicate email inside the tenant and does not save', async () => {
    let saves = 0
    await expectStatus(updatePendingClientInvitation({
      caller: adminCaller,
      userId: CLIENT_ID,
      firstName: 'Jane',
      lastName: 'Example',
      email: 'taken@example.com',
      load: async () => clientRow(),
      save: async () => {
        saves += 1
        return true
      },
      ensureEmailAvailable: async () => {
        assertClientInviteEmailFree({
          claim: claim(AuthEmailClaimCode.AVAILABLE, true, 'E-Mail verfügbar'),
          otherUserInTenant: true,
          pendingStaffInvite: false,
        })
      },
    }), 409)
    expect(saves).toBe(0)
  })

  it('does not edit an accepted staff invitation or an active client', async () => {
    let saves = 0
    await expectStatus(updatePendingStaffInvitation({
      caller: adminCaller,
      invitationId: STAFF_ID,
      firstName: 'John',
      lastName: 'Example',
      email: 'old@example.com',
      load: async () => staffRow({ status: 'accepted' }),
      save: async () => {
        saves += 1
        return true
      },
      ensureEmailAvailable: async () => undefined,
    }), 400)

    await expectStatus(updatePendingClientInvitation({
      caller: adminCaller,
      userId: CLIENT_ID,
      firstName: 'Jane',
      lastName: 'Example',
      email: 'jane@example.com',
      load: async () => clientRow({ onboarding_status: 'completed', auth_user_id: 'auth-user' }),
      save: async () => {
        saves += 1
        return true
      },
      ensureEmailAvailable: async () => undefined,
    }), 400)

    await expectStatus(renewPendingClientInvitation({
      caller: adminCaller,
      userId: CLIENT_ID,
      load: async () => clientRow({ onboarding_status: 'completed', auth_user_id: 'auth-user', onboarding_token: null }),
      save: async () => {
        saves += 1
        return true
      },
    }), 400)

    expect(saves).toBe(0)
  })

  it('normalizes email case without rotating the token', async () => {
    const rows = [staffRow({ email: 'old@example.com' })]
    const result = await updatePendingStaffInvitation({
      caller: adminCaller,
      invitationId: STAFF_ID,
      firstName: 'John',
      lastName: 'Example',
      email: '  OLD@Example.com ',
      load: async (id, tenantId) => rows.find(row => row.id === id && row.tenant_id === tenantId) || null,
      save: async (id, tenantId, patch) => {
        Object.assign(rows.find(row => row.id === id && row.tenant_id === tenantId)!, patch)
        return true
      },
      ensureEmailAvailable: async () => {
        throw new Error('unchanged email')
      },
    })
    expect(result.emailChanged).toBe(false)
    expect(rows[0].invitation_token).toBe('old-staff-token')
  })
})

describe('invitation endpoint contracts', () => {
  const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

  it('staff update ignores role, tenant and token from the request', () => {
    const src = read('server/api/staff/update-invite.post.ts')
    expect(src).toContain('invitationId: body?.invitationId')
    expect(src).toContain('firstName: body?.first_name')
    expect(src).not.toMatch(/body\?\.role/)
    expect(src).not.toMatch(/body\?\.tenant_id/)
    expect(src).not.toMatch(/body\?\.invitation_token/)
    expect(src).toContain(".eq('tenant_id', tenantId)")
    expect(src).not.toContain('.insert(')
  })

  it('staff resend renews the same row with a fresh token', () => {
    const src = read('server/api/staff/resend-invite.post.ts')
    expect(src).toContain('buildStaffInvitationRenewal')
    expect(src).toContain(".eq('tenant_id', userProfile.tenant_id)")
    expect(src).toContain("userProfile.role !== 'admin'")
    expect(src).toContain(".in('status', ['pending', 'expired'])")
    expect(src).not.toContain('.insert(')
    expect(src).toContain('to: sendToEmail')
  })

  it('client resend is admin-scoped and emails the stored address', () => {
    const src = read('server/api/admin/invited-clients/resend.post.ts')
    expect(src).toContain('userId: body?.userId')
    expect(src).not.toMatch(/body\?\.email/)
    expect(src).not.toMatch(/body\?\.tenant_id/)
    expect(src).not.toMatch(/body\?\.role/)
    expect(src).toContain('to: renewed.email')
    expect(src).toContain(".eq('onboarding_status', 'pending')")
    expect(src).toContain(".is('auth_user_id', null)")
    expect(src).not.toContain('token: renewed.token')
    expect(src).not.toContain('.insert(')
  })

  it('client update cannot change role or onboarding state from the payload', () => {
    const src = read('server/api/admin/invited-clients/update.post.ts')
    expect(src).toContain('userId: body?.userId')
    expect(src).not.toMatch(/body\?\.role/)
    expect(src).not.toMatch(/body\?\.tenant_id/)
    expect(src).not.toMatch(/body\?\.onboarding_status/)
    expect(src).toContain(".eq('role', 'client')")
    expect(src).toContain(".eq('onboarding_status', 'pending')")
    expect(src).not.toContain('.insert(')
  })
})
