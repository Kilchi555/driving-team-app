import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { confirmTenantInquiryUserId, resolveInquiryUserId, type InquiryUserAdmin } from '../resolve-inquiry-user'
import { resolveAssignableInquiryStaff, type InquiryStaffLookup } from '../public-inquiry-staff'

type UserRow = {
  id: string
  tenant_id: string
  email: string | null
  phone: string | null
  first_name: string
  last_name: string
  onboarding_status: string | null
  category: string[] | null
  role?: string
  street?: string | null
  street_nr?: string | null
  zip?: string | null
  city?: string | null
  is_active?: boolean
}

type Filter =
  | { type: 'eq'; col: string; val: unknown }
  | { type: 'ilike'; col: string; val: string }
  | { type: 'in'; col: string; val: unknown[] }

function fieldValue(user: UserRow, col: string): unknown {
  return user[col as keyof UserRow]
}

function matches(user: UserRow, filters: Filter[]) {
  return filters.every((filter) => {
    const value = fieldValue(user, filter.col)
    if (filter.type === 'eq') return value === filter.val
    if (filter.type === 'ilike') return String(value ?? '').toLowerCase() === filter.val.toLowerCase()
    return filter.val.includes(value)
  })
}

function createAdmin(initial: UserRow[], options?: { revealAfterFailedInsert?: boolean }) {
  const users = initial.map(row => ({ ...row }))
  const updates: Array<Record<string, unknown>> = []
  let hidden = options?.revealAfterFailedInsert === true

  const admin: InquiryUserAdmin = {
    from(table: string) {
      if (table !== 'users') throw new Error(`unexpected table ${table}`)
      const filters: Filter[] = []
      const state: { op: 'select' | 'insert' | 'update'; payload: Record<string, unknown> | null } = { op: 'select', payload: null }
      const builder = {
        select() { return builder },
        insert(row: Record<string, unknown>) { state.op = 'insert'; state.payload = row; return builder },
        update(row: Record<string, unknown>) { state.op = 'update'; state.payload = row; return builder },
        eq(col: string, val: unknown) { filters.push({ type: 'eq', col, val }); return builder },
        ilike(col: string, val: string) { filters.push({ type: 'ilike', col, val }); return builder },
        in(col: string, val: unknown[]) { filters.push({ type: 'in', col, val }); return builder },
        limit() { return builder },
        maybeSingle: async () => ({
          data: hidden ? null : (users.find(user => matches(user, filters)) ?? null),
          error: null,
        }),
        then(onFulfilled: (value: { error: { message?: string; code?: string } | null }) => unknown, onRejected?: (reason: unknown) => unknown) {
          return Promise.resolve(exec()).then(onFulfilled, onRejected)
        },
      }

      function exec() {
        if (state.op === 'update') {
          const target = users.find(user => matches(user, filters))
          if (!target) return { error: { message: 'missing user' } }
          Object.assign(target, state.payload)
          updates.push(state.payload)
          return { error: null }
        }
        if (state.op === 'insert') {
          if (hidden) {
            hidden = false
            return { error: { code: '23505', message: 'duplicate' } }
          }
          users.push(state.payload)
          return { error: null }
        }
        return { data: null, error: null }
      }

      return builder
    },
  }

  return { admin, users, updates }
}

const TENANT_A = 'tenant-driving-team'
const TENANT_B = 'tenant-other'
const fields = {
  first_name: 'Mischa',
  last_name: 'Hotz',
  email: 'mischa.hotz@hotmail.com',
  phone: '+41 76 721 94 15',
  street: 'Burgerrietstrasse',
  street_nr: '1B',
  zip: '8730',
  city: 'Uznach',
}

describe('resolveInquiryUserId', () => {
  it('creates one pending client when nothing matches', async () => {
    const store = createAdmin([])
    const id = await resolveInquiryUserId({
      tenantId: TENANT_A,
      categoryCode: 'B Automatik',
      fields,
      admin: store.admin,
    })

    expect(store.users).toHaveLength(1)
    expect(store.users[0]).toMatchObject({
      id,
      role: 'client',
      onboarding_status: 'pending',
      tenant_id: TENANT_A,
      email: 'mischa.hotz@hotmail.com',
      phone: '+41767219415',
      first_name: 'Mischa',
      last_name: 'Hotz',
      category: ['B Automatik'],
      is_active: true,
    })
    expect(store.users[0]).not.toHaveProperty('auth_user_id')
  })

  it('reuses a pending user found by email and merges contact fields', async () => {
    const store = createAdmin([{
      id: 'pending-1',
      tenant_id: TENANT_A,
      email: 'mischa.hotz@hotmail.com',
      phone: '+41760000000',
      first_name: 'Alt',
      last_name: 'Name',
      onboarding_status: 'pending',
      category: ['B'],
    }])

    const id = await resolveInquiryUserId({
      tenantId: TENANT_A,
      categoryCode: 'B Automatik',
      fields,
      admin: store.admin,
    })

    expect(id).toBe('pending-1')
    expect(store.users).toHaveLength(1)
    expect(store.users[0].first_name).toBe('Mischa')
    expect(store.users[0].phone).toBe('+41767219415')
    expect(store.users[0].category).toEqual(['B', 'B Automatik'])
    expect(store.updates).toHaveLength(1)
  })

  it('links a completed user without overwriting the profile', async () => {
    const store = createAdmin([{
      id: 'done-1',
      tenant_id: TENANT_A,
      email: 'Mischa.Hotz@hotmail.com',
      phone: '+41767219415',
      first_name: 'Bestehend',
      last_name: 'Hotz',
      onboarding_status: 'completed',
      category: ['B'],
    }])

    const id = await resolveInquiryUserId({
      tenantId: TENANT_A,
      categoryCode: 'B Automatik',
      fields: { ...fields, first_name: 'Neu' },
      admin: store.admin,
    })

    expect(id).toBe('done-1')
    expect(store.users).toHaveLength(1)
    expect(store.users[0].first_name).toBe('Bestehend')
    expect(store.updates).toHaveLength(0)
  })

  it('uses a phone match inside the tenant when the email misses', async () => {
    const store = createAdmin([{
      id: 'phone-1',
      tenant_id: TENANT_A,
      email: 'andere@example.com',
      phone: '0767219415',
      first_name: 'Telefon',
      last_name: 'Treffer',
      onboarding_status: 'completed',
      category: [],
    }])

    const id = await resolveInquiryUserId({
      tenantId: TENANT_A,
      fields,
      admin: store.admin,
    })

    expect(id).toBe('phone-1')
    expect(store.users).toHaveLength(1)
    expect(store.users[0].first_name).toBe('Telefon')
  })

  it('reuses the winner of a parallel insert instead of creating a second user', async () => {
    const store = createAdmin([{
      id: 'race-winner',
      tenant_id: TENANT_A,
      email: 'mischa.hotz@hotmail.com',
      phone: '+41767219415',
      first_name: 'Mischa',
      last_name: 'Hotz',
      onboarding_status: 'pending',
      category: [],
    }], { revealAfterFailedInsert: true })

    const id = await resolveInquiryUserId({
      tenantId: TENANT_A,
      fields: { ...fields, email: 'MISCHA.HOTZ@hotmail.com' },
      admin: store.admin,
    })

    expect(id).toBe('race-winner')
    expect(store.users).toHaveLength(1)
  })

  it('does not link a user from another tenant', async () => {
    const store = createAdmin([{
      id: 'foreign-user',
      tenant_id: TENANT_B,
      email: 'mischa.hotz@hotmail.com',
      phone: '+41767219415',
      first_name: 'Fremd',
      last_name: 'Hotz',
      onboarding_status: 'completed',
      category: ['B'],
    }])

    const id = await resolveInquiryUserId({
      tenantId: TENANT_A,
      createdByUserId: 'foreign-user',
      fields,
      admin: store.admin,
    })

    expect(id).not.toBe('foreign-user')
    expect(store.users).toHaveLength(2)
    expect(store.users.find(user => user.id === id)?.tenant_id).toBe(TENANT_A)
    expect(store.users.find(user => user.id === 'foreign-user')?.first_name).toBe('Fremd')
  })

  it('accepts a created_by_user_id only inside the current tenant', async () => {
    const store = createAdmin([{
      id: 'local-user',
      tenant_id: TENANT_A,
      email: 'local@example.com',
      phone: '+41790000000',
      first_name: 'Lokal',
      last_name: 'Kunde',
      onboarding_status: 'completed',
      category: [],
    }])

    const id = await resolveInquiryUserId({
      tenantId: TENANT_A,
      createdByUserId: 'local-user',
      fields,
      admin: store.admin,
    })

    expect(id).toBe('local-user')
    expect(store.users).toHaveLength(1)
    expect(store.updates).toHaveLength(0)
  })
})

describe('inquiry user wiring', () => {
  const proposalApi = readFileSync(resolve(process.cwd(), 'server/api/booking/submit-proposal.post.ts'), 'utf8')
  const inquiryApi = readFileSync(resolve(process.cwd(), 'server/api/booking/submit-general-inquiry.post.ts'), 'utf8')
  const guestBook = readFileSync(resolve(process.cwd(), 'server/api/booking/guest-book.post.ts'), 'utf8')

  it('stores the resolved user on the proposal and still writes the marketing lead', () => {
    expect(proposalApi).toContain("import { confirmTenantInquiryUserId, resolveInquiryUserId } from '~/server/utils/resolve-inquiry-user'")
    expect(proposalApi).toContain('created_by_user_id: resolvedUserId')
    expect(proposalApi).toContain('createdByUserId: null')
    expect(proposalApi).toContain('confirmTenantInquiryUserId(')
    expect(proposalApi).not.toContain('const isLoggedInUser = !!created_by_user_id')
    expect(proposalApi).not.toContain('created_by_user_id: created_by_user_id')
    expect(proposalApi).toContain('upsertMarketingLeadSafe(')
    expect(proposalApi).not.toContain('auth.admin')
    expect(proposalApi).not.toContain('sendSMS')
  })

  it('keeps general inquiry on the shared resolver and the separate lead upsert', () => {
    expect(inquiryApi).toContain("import { resolveInquiryUserId } from '~/server/utils/resolve-inquiry-user'")
    expect(inquiryApi).not.toContain('async function resolveInquiryUserId')
    expect(inquiryApi).toContain('created_by_user_id: resolvedUserId')
    expect(inquiryApi).toContain('upsertMarketingLeadSafe(')
    expect(inquiryApi).toContain('stampFirstTouchAcquisition')
    expect(inquiryApi).toContain('resolveAssignableInquiryStaff')
    expect(inquiryApi).toContain('staff_id: assignableStaffId')
    expect(inquiryApi).not.toContain('staff_id: staff_id || null')
  })

  it('leaves guest booking on its own account rules', () => {
    expect(guestBook).not.toContain('resolve-inquiry-user')
    expect(guestBook).toContain("code: 'DUPLICATE_PHONE'")
    expect(guestBook).toContain("onboarding_status: 'pending'")
  })
})

/**
 * Mirrors submit-proposal: a body id skips contact requirements only after
 * confirmTenantInquiryUserId. The stored id is never the raw body value.
 */
async function applyProposalIdentityGate(
  admin: InquiryUserAdmin,
  createdByUserId: string | null,
  contact: Record<string, string> | null,
) {
  const claimedTenantUserId = await confirmTenantInquiryUserId({
    tenantId: TENANT_A,
    createdByUserId,
    admin,
  })
  if (!claimedTenantUserId && !contact) {
    return { guestContactRequired: true, storedUserId: null as string | null }
  }
  const resolvedUserId = claimedTenantUserId ?? await resolveInquiryUserId({
    tenantId: TENANT_A,
    createdByUserId: null,
    fields: contact ?? {},
    admin,
  })
  return {
    guestContactRequired: claimedTenantUserId == null,
    storedUserId: resolvedUserId,
  }
}

describe('proposal identity gating', () => {
  it('uses a same-tenant user when created_by_user_id resolves there', async () => {
    const store = createAdmin([{
      id: 'local-user',
      tenant_id: TENANT_A,
      email: 'local@example.com',
      phone: '+41790000000',
      first_name: 'Lokal',
      last_name: 'Kunde',
      onboarding_status: 'completed',
      category: [],
    }])

    const result = await applyProposalIdentityGate(store.admin, 'local-user', null)

    expect(result.guestContactRequired).toBe(false)
    expect(result.storedUserId).toBe('local-user')
    expect(store.users).toHaveLength(1)
  })

  it('does not treat a foreign-tenant created_by_user_id as a logged-in identity', async () => {
    const store = createAdmin([{
      id: 'foreign-user',
      tenant_id: TENANT_B,
      email: 'fremd@example.com',
      phone: '+41761111111',
      first_name: 'Fremd',
      last_name: 'User',
      onboarding_status: 'completed',
      category: [],
    }])

    const result = await applyProposalIdentityGate(store.admin, 'foreign-user', null)

    expect(result.guestContactRequired).toBe(true)
    expect(result.storedUserId).toBeNull()
    expect(result.storedUserId).not.toBe('foreign-user')
    expect(store.users).toHaveLength(1)
  })

  it('does not treat an unknown created_by_user_id as a logged-in identity', async () => {
    const store = createAdmin([])

    const result = await applyProposalIdentityGate(store.admin, 'missing-user', null)

    expect(result.guestContactRequired).toBe(true)
    expect(result.storedUserId).toBeNull()
    expect(store.users).toHaveLength(0)
  })

  it('keeps guest contact required when created_by_user_id is absent', async () => {
    const store = createAdmin([])

    const blocked = await applyProposalIdentityGate(store.admin, null, null)
    expect(blocked.guestContactRequired).toBe(true)
    expect(blocked.storedUserId).toBeNull()
    expect(store.users).toHaveLength(0)

    const created = await applyProposalIdentityGate(store.admin, null, fields)
    expect(created.guestContactRequired).toBe(true)
    expect(created.storedUserId).toBeTruthy()
    expect(store.users).toHaveLength(1)
    expect(store.users[0].tenant_id).toBe(TENANT_A)
    expect(store.users[0].role).toBe('client')
    expect(store.users[0].onboarding_status).toBe('pending')
  })

  it('resolves the request-tenant user when a foreign id is paired with that user email', async () => {
    const store = createAdmin([
      {
        id: 'foreign-user',
        tenant_id: TENANT_B,
        email: 'mischa.hotz@hotmail.com',
        phone: '+41767219415',
        first_name: 'Fremd',
        last_name: 'Hotz',
        onboarding_status: 'completed',
        category: [],
      },
      {
        id: 'local-email',
        tenant_id: TENANT_A,
        email: 'mischa.hotz@hotmail.com',
        phone: '+41760000000',
        first_name: 'Lokal',
        last_name: 'Mail',
        onboarding_status: 'completed',
        category: [],
      },
    ])

    const result = await applyProposalIdentityGate(store.admin, 'foreign-user', fields)

    expect(result.guestContactRequired).toBe(true)
    expect(result.storedUserId).toBe('local-email')
    expect(result.storedUserId).not.toBe('foreign-user')
    expect(store.users).toHaveLength(2)
    expect(store.users.find(user => user.id === 'foreign-user')?.first_name).toBe('Fremd')
  })

  it('never stores the raw body id when no user resolves', async () => {
    const store = createAdmin([{
      id: 'foreign-user',
      tenant_id: TENANT_B,
      email: 'fremd@example.com',
      phone: '+41761111111',
      first_name: 'Fremd',
      last_name: 'User',
      onboarding_status: 'completed',
      category: [],
    }])

    const foreign = await applyProposalIdentityGate(store.admin, 'foreign-user', null)
    const unknown = await applyProposalIdentityGate(store.admin, 'missing-user', null)

    expect(foreign.storedUserId).toBeNull()
    expect(unknown.storedUserId).toBeNull()
    expect(foreign.storedUserId).not.toBe('foreign-user')
    expect(unknown.storedUserId).not.toBe('missing-user')
  })
})

describe('public inquiry staff regression', () => {
  const TENANT = '11111111-1111-4111-8111-111111111111'
  const OTHER = '22222222-2222-4222-8222-222222222222'
  const STAFF = '33333333-3333-4333-8333-333333333333'
  const OTHER_STAFF = '44444444-4444-4444-8444-444444444444'
  const LOCATION = '55555555-5555-4555-8555-555555555555'
  const OTHER_LOCATION = '66666666-6666-4666-8666-666666666666'

  function lookup(users: Array<Record<string, unknown>>, assignments: Array<Record<string, unknown>>): InquiryStaffLookup {
    return {
      from(table) {
        const filters: Array<{ op: 'eq' | 'is' | 'in'; column: string; value: unknown }> = []
        const api = {
          select() { return api },
          eq(column: string, value: unknown) {
            filters.push({ op: 'eq', column, value })
            return api
          },
          is(column: string, value: null) {
            filters.push({ op: 'is', column, value })
            return api
          },
          in(column: string, value: readonly string[]) {
            filters.push({ op: 'in', column, value })
            return api
          },
          async maybeSingle() {
            const rows = table === 'users'
              ? users
              : assignments.flatMap((assignment) => {
                const owner = users.find(row => row.id === assignment.staff_id)
                if (!owner) return []
                return [{
                  staff_id: assignment.staff_id,
                  location_id: assignment.location_id,
                  tenant_id: assignment.tenant_id,
                  is_active: assignment.is_active,
                  'users.id': owner.id,
                  'users.tenant_id': owner.tenant_id,
                  'users.role': owner.role,
                  'users.is_active': owner.is_active,
                  'users.deleted_at': owner.deleted_at,
                }]
              })
            const matched = rows.filter(row => filters.every((filter) => {
              const current = row[filter.column]
              if (filter.op === 'eq') return current === filter.value
              if (filter.op === 'is') return current == null
              return Array.isArray(filter.value) && filter.value.includes(String(current))
            }))
            const first = matched[0] as { id?: string; staff_id?: string } | undefined
            return { data: first ? { id: first.id, staff_id: first.staff_id } : null, error: null }
          },
        }
        return api
      },
    }
  }

  const staff = {
    id: STAFF,
    tenant_id: TENANT,
    role: 'staff',
    is_active: true,
    deleted_at: null,
  }

  it('keeps a valid same-tenant staff assignment', async () => {
    await expect(resolveAssignableInquiryStaff(lookup([staff], [{
      staff_id: STAFF,
      location_id: LOCATION,
      tenant_id: TENANT,
      is_active: true,
    }]), {
      tenantId: TENANT,
      staffId: STAFF,
      locationId: LOCATION,
    })).resolves.toBe(STAFF)
  })

  it('drops a foreign-tenant staff id', async () => {
    await expect(resolveAssignableInquiryStaff(lookup([{
      ...staff,
      id: OTHER_STAFF,
      tenant_id: OTHER,
    }], []), {
      tenantId: TENANT,
      staffId: OTHER_STAFF,
      locationId: null,
    })).resolves.toBeNull()
  })

  it('drops a staff user assigned to another or inactive location', async () => {
    await expect(resolveAssignableInquiryStaff(lookup([staff], [{
      staff_id: STAFF,
      location_id: OTHER_LOCATION,
      tenant_id: TENANT,
      is_active: true,
    }]), {
      tenantId: TENANT,
      staffId: STAFF,
      locationId: LOCATION,
    })).resolves.toBeNull()

    await expect(resolveAssignableInquiryStaff(lookup([staff], [{
      staff_id: STAFF,
      location_id: LOCATION,
      tenant_id: TENANT,
      is_active: false,
    }]), {
      tenantId: TENANT,
      staffId: STAFF,
      locationId: LOCATION,
    })).resolves.toBeNull()
  })
})
