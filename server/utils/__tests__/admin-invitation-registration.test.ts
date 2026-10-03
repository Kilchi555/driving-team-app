import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  consumePendingStaffInvitation,
  type ConsumedStaffInvitation,
} from '../consume-staff-invitation'
import {
  createsStaffOperationalRecords,
  legacyAcceptsInvitationRole,
  roleFromInvitation,
} from '../invitation-role'

const TOKEN = 'admin-invite-token-aaaaaaaaaaaa'
const CLAIMED_AT = '2026-10-03T08:00:00.000Z'
const FUTURE = '2026-11-03T08:00:00.000Z'

type InvitationRow = {
  id: string
  tenant_id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  link_to_admin: boolean
  invited_by: string
  invitation_token: string
  status: 'pending' | 'accepted'
  expires_at: string
  accepted_at: string | null
  role: 'admin' | 'staff'
}

type UserRow = {
  role: 'admin' | 'staff'
  tenant_id: string
  is_primary_admin: boolean
  auth_user_id: string
}

function seed(role: 'admin' | 'staff', overrides: Partial<InvitationRow> = {}): InvitationRow {
  return {
    id: 'inv-1',
    tenant_id: 'tenant-a',
    first_name: 'Bea',
    last_name: 'Admin',
    email: 'bea@example.com',
    phone: '+41790000000',
    link_to_admin: false,
    invited_by: 'auth-admin',
    invitation_token: TOKEN,
    status: 'pending',
    expires_at: FUTURE,
    accepted_at: null,
    role,
    ...overrides,
  }
}

function createCasClient(store: InvitationRow) {
  const from = (table: string) => {
    if (table !== 'staff_invitations') throw new Error(`unexpected table ${table}`)
    const patch: Record<string, unknown> = {}
    const eq: Record<string, unknown> = {}
    let gtExpiresAt: string | undefined
    const builder: Record<string, unknown> = {}
    const self = () => builder
    builder.update = (values: Record<string, unknown>) => {
      Object.assign(patch, values)
      return self()
    }
    builder.eq = (col: string, val: unknown) => {
      eq[col] = val
      return self()
    }
    builder.gt = (col: string, val: unknown) => {
      if (col === 'expires_at') gtExpiresAt = String(val)
      return self()
    }
    builder.select = () => self()
    builder.maybeSingle = async () => {
      const tokenOk = eq.invitation_token === store.invitation_token
      const pendingOk = eq.status === 'pending' && store.status === 'pending'
      const expiryOk = typeof gtExpiresAt === 'string' && store.expires_at > gtExpiresAt
      if (!tokenOk || !pendingOk || !expiryOk) return { data: null, error: null }
      store.status = 'accepted'
      store.accepted_at = String(patch.accepted_at || CLAIMED_AT)
      const data: ConsumedStaffInvitation = {
        id: store.id,
        tenant_id: store.tenant_id,
        first_name: store.first_name,
        last_name: store.last_name,
        email: store.email,
        phone: store.phone,
        link_to_admin: store.link_to_admin,
        invited_by: store.invited_by,
        accepted_at: store.accepted_at,
        role: store.role,
      }
      return { data, error: null }
    }
    return builder
  }
  return { from }
}

function acceptInvitation(store: InvitationRow, body: { role?: unknown, tenant_id?: unknown }) {
  const users: UserRow[] = []
  const writes: string[] = []
  const authUsers: string[] = []

  return consumePendingStaffInvitation(createCasClient(store), TOKEN, CLAIMED_AT).then((invitation) => {
    if (!invitation) {
      return { users, writes, authUsers, invitation: store }
    }
    const registeredRole = roleFromInvitation(invitation.role)
    void body.role
    void body.tenant_id
    authUsers.push('auth-1')
    users.push({
      role: registeredRole,
      tenant_id: invitation.tenant_id,
      is_primary_admin: false,
      auth_user_id: 'auth-1',
    })
    if (createsStaffOperationalRecords(registeredRole)) {
      writes.push('staff_working_hours', 'staff_locations', 'locations', 'calendar_tokens', 'availability_recalc')
    }
    return { users, writes, authUsers, invitation: store }
  })
}

function sliceFunction(src: string, startName: string, endName: string): string {
  const start = src.indexOf(startName)
  const end = src.indexOf(endName, start + startName.length)
  expect(start).toBeGreaterThan(-1)
  expect(end).toBeGreaterThan(start)
  return src.slice(start, end)
}

function guardedSpans(src: string, guard: string): Array<{ start: number, end: number, body: string }> {
  const spans: Array<{ start: number, end: number, body: string }> = []
  let from = 0
  while (from < src.length) {
    const at = src.indexOf(guard, from)
    if (at === -1) break
    const open = src.indexOf('{', at)
    let depth = 0
    let end = open
    for (; end < src.length; end += 1) {
      if (src[end] === '{') depth += 1
      else if (src[end] === '}') {
        depth -= 1
        if (depth === 0) {
          spans.push({ start: at, end: end + 1, body: src.slice(open, end + 1) })
          break
        }
      }
    }
    from = end + 1
  }
  return spans
}

function withoutSpans(src: string, spans: Array<{ start: number, end: number }>): string {
  let out = src
  for (const span of [...spans].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, span.start) + out.slice(span.end)
  }
  return out
}

describe('TEST 1 — staff invite keeps staff records', () => {
  it('creates one staff user in the invitation tenant and consumes the token', async () => {
    const store = seed('staff')
    const result = await acceptInvitation(store, {})
    expect(result.authUsers).toHaveLength(1)
    expect(result.users).toEqual([{
      role: 'staff',
      tenant_id: 'tenant-a',
      is_primary_admin: false,
      auth_user_id: 'auth-1',
    }])
    expect(result.writes).toEqual([
      'staff_working_hours',
      'staff_locations',
      'locations',
      'calendar_tokens',
      'availability_recalc',
    ])
    expect(store.status).toBe('accepted')
    expect(createsStaffOperationalRecords('staff')).toBe(true)
  })
})

describe('TEST 2 — admin invite does not create staff operational records', () => {
  it('creates one admin user and consumes the token', async () => {
    const store = seed('admin')
    const result = await acceptInvitation(store, {})
    expect(result.users).toEqual([{
      role: 'admin',
      tenant_id: 'tenant-a',
      is_primary_admin: false,
      auth_user_id: 'auth-1',
    }])
    expect(result.writes).toEqual([])
    expect(store.status).toBe('accepted')
    expect(createsStaffOperationalRecords('admin')).toBe(false)
  })
})

describe('TEST 3 and 4 — client role and tenant injection', () => {
  it('keeps staff and the invitation tenant when the body asks for admin in another tenant', async () => {
    const store = seed('staff')
    const result = await acceptInvitation(store, { role: 'admin', tenant_id: 'tenant-b' })
    expect(result.users[0]?.role).toBe('staff')
    expect(result.users[0]?.tenant_id).toBe('tenant-a')
    expect(result.users[0]?.is_primary_admin).toBe(false)
  })
})

describe('TEST 5 and 6 — legacy register-staff role gate', () => {
  it('rejects an admin invitation and accepts only an exact staff role', () => {
    expect(legacyAcceptsInvitationRole('admin')).toBe(false)
    expect(legacyAcceptsInvitationRole('staff')).toBe(true)
    expect(legacyAcceptsInvitationRole('super_admin')).toBe(false)
    expect(legacyAcceptsInvitationRole(undefined)).toBe(false)
    expect(legacyAcceptsInvitationRole(null)).toBe(false)
  })

  it('refuses admin invitations before Auth, users insert, and consumption', () => {
    const src = readFileSync(resolve(process.cwd(), 'server/api/auth/register.post.ts'), 'utf8')
    const fn = sliceFunction(src, 'async function registerStaff', 'async function getTenantFromSlug')
    const gate = fn.indexOf('legacyAcceptsInvitationRole(invitation.role)')
    const createUser = fn.indexOf('auth.admin.createUser')
    const insertUser = fn.indexOf(".from('users')")
    const consume = fn.indexOf("status: 'accepted'")
    expect(gate).toBeGreaterThan(-1)
    expect(createUser).toBeGreaterThan(gate)
    expect(insertUser).toBeGreaterThan(gate)
    expect(consume).toBeGreaterThan(gate)
    expect(fn).toContain("select('id, email, tenant_id, expires_at, status, role')")
    expect(fn).toContain("role: 'staff'")
  })
})

describe('TEST 7 — expired admin token', () => {
  it('rejects the token and leaves it pending', async () => {
    const store = seed('admin', { expires_at: '2020-01-01T00:00:00.000Z' })
    const result = await acceptInvitation(store, {})
    expect(result.authUsers).toEqual([])
    expect(result.users).toEqual([])
    expect(store.status).toBe('pending')
  })
})

describe('TEST 8 — replay', () => {
  it('accepts an admin token once and rejects the second submit', async () => {
    const store = seed('admin')
    const first = await acceptInvitation(store, {})
    const second = await acceptInvitation(store, {})
    expect(first.users).toHaveLength(1)
    expect(second.users).toEqual([])
    expect(second.authUsers).toEqual([])
    expect(store.status).toBe('accepted')
  })
})

describe('TEST 9 — parallel accept', () => {
  it('lets one request create the admin user', async () => {
    const store = seed('admin')
    const client = createCasClient(store)
    const results = await Promise.all(
      Array.from({ length: 8 }, () => consumePendingStaffInvitation(client, TOKEN, CLAIMED_AT)),
    )
    const winners = results.filter((row): row is ConsumedStaffInvitation => row !== null)
    expect(winners).toHaveLength(1)
    expect(roleFromInvitation(winners[0]?.role)).toBe('admin')
    expect(winners[0]?.tenant_id).toBe('tenant-a')
    expect(store.status).toBe('accepted')
  })
})

describe('POST /api/staff/register wiring', () => {
  const src = readFileSync(resolve(process.cwd(), 'server/api/staff/register.post.ts'), 'utf8')

  it('assigns role and tenant from the invitation and returns that role', () => {
    expect(src).toContain('const registeredRole = roleFromInvitation(invitation.role)')
    expect(src).toContain('role: registeredRole')
    expect(src).toContain('is_primary_admin: false')
    expect(src).toContain('tenant_id: invitation.tenant_id')
    expect(src).not.toMatch(/role:\s*body\.role/)
    expect(src).not.toMatch(/tenant_id:\s*body\.tenant_id/)
    expect(src).toContain('role: registeredRole,')
  })

  it('keeps staff operational writes inside the staff gate', () => {
    const spans = guardedSpans(src, 'if (createsStaffOperationalRecords(registeredRole))')
    expect(spans.length).toBe(3)
    const guarded = spans.map(span => span.body).join('\n')
    expect(guarded).toContain("from('staff_working_hours')")
    expect(guarded).toContain("from('staff_locations')")
    expect(guarded).toContain("from('locations')")
    expect(guarded).toContain("from('calendar_tokens')")
    expect(guarded).toContain('enqueueStaffAvailabilityRecalc({')
    expect(guarded).toContain('staff_ids:')

    const unguarded = withoutSpans(src, spans)
    expect(unguarded).not.toContain("from('staff_working_hours')")
    expect(unguarded).not.toContain("from('staff_locations')")
    expect(unguarded).not.toContain("from('locations')")
    expect(unguarded).not.toContain("from('calendar_tokens')")
    expect(unguarded).not.toContain('enqueueStaffAvailabilityRecalc({')
    expect(src.indexOf('auth.admin.createUser')).toBeLessThan(src.indexOf('createsStaffOperationalRecords(registeredRole)'))
    expect(src.indexOf(".from('users')")).toBeLessThan(src.indexOf('createsStaffOperationalRecords(registeredRole)'))
  })
})
