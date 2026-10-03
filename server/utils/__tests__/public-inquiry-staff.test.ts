import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  resolveAssignableInquiryStaff,
  type InquiryStaffLookup,
} from '../public-inquiry-staff'

const TENANT = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const STAFF = '33333333-3333-4333-8333-333333333333'
const OTHER_STAFF = '44444444-4444-4444-8444-444444444444'
const LOCATION = '55555555-5555-4555-8555-555555555555'
const OTHER_LOCATION = '66666666-6666-4666-8666-666666666666'

type UserRow = {
  id: string
  tenant_id: string
  role: string
  is_active: boolean
  deleted_at: string | null
}

type AssignmentRow = {
  staff_id: string
  location_id: string
  tenant_id: string
  is_active: boolean
}

function user(partial: Partial<UserRow> & Pick<UserRow, 'id' | 'tenant_id'>): UserRow {
  return {
    role: 'staff',
    is_active: true,
    deleted_at: null,
    ...partial,
  }
}

function createLookup(users: UserRow[], assignments: AssignmentRow[]): InquiryStaffLookup & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    from(table) {
      calls.push(table)
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
            ? users.map((row) => ({ ...row }))
            : assignments.flatMap((assignment) => {
              const owner = users.find((row) => row.id === assignment.staff_id)
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

          const matched = rows.filter((row) => filters.every((filter) => {
            const current = (row as Record<string, unknown>)[filter.column]
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

const sameTenantStaff = user({ id: STAFF, tenant_id: TENANT })
const foreignStaff = user({ id: OTHER_STAFF, tenant_id: OTHER })

describe('public inquiry staff assignment', () => {
  it('stores an active staff user of the same tenant when no location is sent', async () => {
    const lookup = createLookup([sameTenantStaff], [])
    await expect(resolveAssignableInquiryStaff(lookup, {
      tenantId: TENANT,
      staffId: STAFF,
      locationId: null,
    })).resolves.toBe(STAFF)
    expect(lookup.calls).toEqual(['users'])

    const admin = createLookup([user({ id: STAFF, tenant_id: TENANT, role: 'admin' })], [])
    await expect(resolveAssignableInquiryStaff(admin, {
      tenantId: TENANT,
      staffId: STAFF,
      locationId: null,
    })).resolves.toBe(STAFF)
  })

  it('does not store a staff user from another tenant', async () => {
    const lookup = createLookup([foreignStaff], [])
    await expect(resolveAssignableInquiryStaff(lookup, {
      tenantId: TENANT,
      staffId: OTHER_STAFF,
      locationId: null,
    })).resolves.toBeNull()
  })

  it('does not store an unknown staff id', async () => {
    const lookup = createLookup([sameTenantStaff], [])
    await expect(resolveAssignableInquiryStaff(lookup, {
      tenantId: TENANT,
      staffId: OTHER_STAFF,
      locationId: null,
    })).resolves.toBeNull()
  })

  it('does not store a same-tenant staff user who is not assigned to the location', async () => {
    const lookup = createLookup(
      [sameTenantStaff],
      [{ staff_id: STAFF, location_id: OTHER_LOCATION, tenant_id: TENANT, is_active: true }],
    )
    await expect(resolveAssignableInquiryStaff(lookup, {
      tenantId: TENANT,
      staffId: STAFF,
      locationId: LOCATION,
    })).resolves.toBeNull()

    const inactiveAssignment = createLookup(
      [sameTenantStaff],
      [{ staff_id: STAFF, location_id: LOCATION, tenant_id: TENANT, is_active: false }],
    )
    await expect(resolveAssignableInquiryStaff(inactiveAssignment, {
      tenantId: TENANT,
      staffId: STAFF,
      locationId: LOCATION,
    })).resolves.toBeNull()
  })

  it('stores a same-tenant staff user who is actively assigned to the location', async () => {
    const lookup = createLookup(
      [sameTenantStaff],
      [{ staff_id: STAFF, location_id: LOCATION, tenant_id: TENANT, is_active: true }],
    )
    await expect(resolveAssignableInquiryStaff(lookup, {
      tenantId: TENANT,
      staffId: STAFF,
      locationId: LOCATION,
    })).resolves.toBe(STAFF)
    expect(lookup.calls).toEqual(['staff_locations'])
  })

  it('keeps a missing staff id as null and does not look up a user', async () => {
    const lookup = createLookup([sameTenantStaff], [])
    await expect(resolveAssignableInquiryStaff(lookup, {
      tenantId: TENANT,
      staffId: null,
      locationId: null,
    })).resolves.toBeNull()
    await expect(resolveAssignableInquiryStaff(lookup, {
      tenantId: TENANT,
      staffId: '   ',
      locationId: LOCATION,
    })).resolves.toBeNull()
    expect(lookup.calls).toEqual([])
  })

  it('still allows a same-tenant staff assignment when the inquiry has no location', async () => {
    const lookup = createLookup([sameTenantStaff], [])
    await expect(resolveAssignableInquiryStaff(lookup, {
      tenantId: TENANT,
      staffId: STAFF.toUpperCase(),
      locationId: undefined,
    })).resolves.toBe(STAFF)
  })

  it('rejects a client, an inactive user, a deleted user, and a foreign location assignment', async () => {
    const client = user({ id: STAFF, tenant_id: TENANT, role: 'client' })
    const inactive = user({ id: STAFF, tenant_id: TENANT, is_active: false })
    const deleted = user({ id: STAFF, tenant_id: TENANT, deleted_at: '2026-01-01T00:00:00.000Z' })
    const foreignAssignment = createLookup(
      [foreignStaff],
      [{ staff_id: OTHER_STAFF, location_id: LOCATION, tenant_id: TENANT, is_active: true }],
    )

    await expect(resolveAssignableInquiryStaff(createLookup([client], []), {
      tenantId: TENANT, staffId: STAFF, locationId: null,
    })).resolves.toBeNull()
    await expect(resolveAssignableInquiryStaff(createLookup([inactive], []), {
      tenantId: TENANT, staffId: STAFF, locationId: null,
    })).resolves.toBeNull()
    await expect(resolveAssignableInquiryStaff(createLookup([deleted], []), {
      tenantId: TENANT, staffId: STAFF, locationId: null,
    })).resolves.toBeNull()
    await expect(resolveAssignableInquiryStaff(foreignAssignment, {
      tenantId: TENANT, staffId: OTHER_STAFF, locationId: LOCATION,
    })).resolves.toBeNull()
    await expect(resolveAssignableInquiryStaff(createLookup([sameTenantStaff], []), {
      tenantId: TENANT, staffId: 'not-a-uuid', locationId: null,
    })).resolves.toBeNull()
  })

  it('regression: a valid same-tenant staff assignment stays assignable', async () => {
    const lookup = createLookup(
      [sameTenantStaff],
      [{ staff_id: STAFF, location_id: LOCATION, tenant_id: TENANT, is_active: true }],
    )
    await expect(resolveAssignableInquiryStaff(lookup, {
      tenantId: TENANT,
      staffId: STAFF,
      locationId: LOCATION,
    })).resolves.toBe(STAFF)
  })

  it('regression: a foreign-tenant staff id is stored as null', async () => {
    const lookup = createLookup(
      [foreignStaff],
      [{ staff_id: OTHER_STAFF, location_id: LOCATION, tenant_id: OTHER, is_active: true }],
    )
    await expect(resolveAssignableInquiryStaff(lookup, {
      tenantId: TENANT,
      staffId: OTHER_STAFF,
      locationId: LOCATION,
    })).resolves.toBeNull()
  })

  it('regression: a staff user on another or inactive location assignment is stored as null', async () => {
    const otherLocation = createLookup(
      [sameTenantStaff],
      [{ staff_id: STAFF, location_id: OTHER_LOCATION, tenant_id: TENANT, is_active: true }],
    )
    const inactiveAssignment = createLookup(
      [sameTenantStaff],
      [{ staff_id: STAFF, location_id: LOCATION, tenant_id: TENANT, is_active: false }],
    )
    await expect(resolveAssignableInquiryStaff(otherLocation, {
      tenantId: TENANT,
      staffId: STAFF,
      locationId: LOCATION,
    })).resolves.toBeNull()
    await expect(resolveAssignableInquiryStaff(inactiveAssignment, {
      tenantId: TENANT,
      staffId: STAFF,
      locationId: LOCATION,
    })).resolves.toBeNull()
  })

  it('keeps the public inquiry insert on the resolved staff id', () => {
    const src = readFileSync(resolve(process.cwd(), 'server/api/booking/submit-general-inquiry.post.ts'), 'utf8')
    expect(src).toContain('resolveAssignableInquiryStaff')
    expect(src).toContain('staff_id: assignableStaffId')
    expect(src).not.toContain('staff_id: staff_id || null')
    expect(src).toContain("status: 'pending'")
    expect(src).toContain('insertInquiryProposal')
  })
})
