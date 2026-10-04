/**
 * Public course user linking.
 * Proves public.users resolution only. No auth.users, no production database.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ensureGuestUserForCoursePayment } from '../fulfill-course-wallee-payment'
import {
  PUBLIC_COURSE_USER_ROLE,
  PublicCourseUserAbort,
  resolvePublicCourseUser,
} from '../public-course-user'

type Row = {
  id: string
  role: string
  tenant_id: string
  email: string | null
  phone: string | null
}

const TENANT = 'tenant-course'
const OTHER = 'tenant-other'

function harness(initial: Row[], opts?: {
  failFirstInsert?: boolean
  winnerOnConflict?: Row
}) {
  const rows = initial.map((row) => ({ ...row }))
  const inserts: Record<string, unknown>[] = []
  let insertAttempts = 0
  const supabase = {
    from(table: string) {
      const filters: Array<{ op: 'eq' | 'ilike' | 'in', col: string, val: unknown }> = []
      const match = () => {
        if (table !== 'users') return []
        return rows.filter((row) => filters.every((filter) => {
          const value = (row as Record<string, unknown>)[filter.col]
          if (filter.op === 'eq') return value === filter.val
          if (filter.op === 'ilike') {
            return String(value ?? '').toLowerCase() === String(filter.val).toLowerCase()
          }
          return Array.isArray(filter.val) && filter.val.includes(value)
        }))
      }
      const q: Record<string, unknown> = {}
      q.select = () => q
      q.eq = (col: string, val: unknown) => {
        filters.push({ op: 'eq', col, val })
        return q
      }
      q.ilike = (col: string, val: unknown) => {
        filters.push({ op: 'ilike', col, val })
        return q
      }
      q.in = (col: string, val: unknown) => {
        filters.push({ op: 'in', col, val })
        return q
      }
      q.limit = (n: number) => Promise.resolve({ data: match().slice(0, n), error: null })
      q.maybeSingle = async () => {
        const found = match()
        if (found.length > 1) return { data: null, error: { code: 'PGRST116' } }
        return { data: found[0] ?? null, error: null }
      }
      q.insert = (payload: Record<string, unknown>) => {
        inserts.push(payload)
        insertAttempts += 1
        const ins: Record<string, unknown> = {}
        ins.select = () => ins
        ins.single = async () => {
          if (opts?.failFirstInsert && insertAttempts === 1) {
            if (opts.winnerOnConflict) rows.push({ ...opts.winnerOnConflict })
            return { data: null, error: { code: '23505', message: 'users_email_tenant_unique' } }
          }
          const id = `user-${rows.length + 1}`
          rows.push({
            id,
            role: String(payload.role),
            tenant_id: String(payload.tenant_id),
            email: (payload.email as string | null) ?? null,
            phone: (payload.phone as string | null) ?? null,
          })
          return { data: { id, tenant_id: payload.tenant_id }, error: null }
        }
        return ins
      }
      q.update = () => q
      q.is = () => q
      q.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => (
        Promise.resolve({ data: null, error: null }).then(resolve, reject)
      )
      return q
    },
  }
  return { supabase, rows, inserts }
}

function customer(partial: Partial<Row> & Pick<Row, 'id' | 'email'>): Row {
  return {
    role: 'client',
    tenant_id: TENANT,
    phone: null,
    ...partial,
  }
}

async function expectAbort(run: () => Promise<unknown>, reason: string) {
  await expect(run()).rejects.toMatchObject({ name: 'PublicCourseUserAbort', reason })
}

describe('resolvePublicCourseUser', () => {
  it('1. new email creates one public user with auth_user_id null', async () => {
    const db = harness([])
    const resolved = await resolvePublicCourseUser(db.supabase, {
      tenantId: TENANT,
      email: 'New.Person@Example.com',
      phone: '079 111 22 33',
      firstName: 'New',
      lastName: 'Person',
    })
    expect(db.inserts).toHaveLength(1)
    expect(db.inserts[0]).toMatchObject({
      email: 'new.person@example.com',
      tenant_id: TENANT,
      role: PUBLIC_COURSE_USER_ROLE,
      auth_user_id: null,
      is_active: true,
    })
    expect(db.inserts[0]).not.toHaveProperty('onboarding_token')
    expect(db.inserts[0]).not.toHaveProperty('onboarding_token_expires')
    expect(db.inserts[0]).not.toHaveProperty('onboarding_status')
    expect(resolved.created).toBe(true)
    expect(resolved.userId).toBe(db.rows[0].id)
    expect(db.rows[0].tenant_id).toBe(TENANT)
  })

  it('2. existing same-tenant email is reused and not modified', async () => {
    const existing = customer({ id: 'existing-1', email: 'ada@example.com', role: 'client', phone: '+41790000001' })
    const before = { ...existing }
    const db = harness([existing])
    const resolved = await resolvePublicCourseUser(db.supabase, {
      tenantId: TENANT,
      email: 'ADA@example.com',
      phone: '0790000099',
      firstName: 'Changed',
      lastName: 'Name',
    })
    expect(resolved).toEqual({ userId: 'existing-1', created: false })
    expect(db.inserts).toHaveLength(0)
    expect(db.rows[0]).toEqual(before)
  })

  it('3. same email in another tenant creates a user in the course tenant', async () => {
    const db = harness([
      customer({ id: 'foreign', email: 'ada@example.com', tenant_id: OTHER }),
    ])
    const resolved = await resolvePublicCourseUser(db.supabase, {
      tenantId: TENANT,
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Local',
    })
    expect(resolved.userId).not.toBe('foreign')
    expect(resolved.created).toBe(true)
    expect(db.inserts[0].tenant_id).toBe(TENANT)
    expect(db.inserts[0].auth_user_id).toBeNull()
    expect(db.rows.find((row) => row.id === 'foreign')?.tenant_id).toBe(OTHER)
  })

  it('4. phone only does not attach', async () => {
    const db = harness([
      customer({ id: 'phone-owner', email: 'owner@example.com', phone: '+41791112233' }),
    ])
    await expectAbort(() => resolvePublicCourseUser(db.supabase, {
      tenantId: TENANT,
      email: 'someone-else@example.com',
      phone: '079 111 22 33',
      firstName: 'Else',
      lastName: 'Person',
    }), 'phone_only')
    expect(db.inserts).toHaveLength(0)
    expect(db.rows).toHaveLength(1)
  })

  it('5. multiple email matches abort without a registration user', async () => {
    const db = harness([
      customer({ id: 'a', email: 'ada@example.com' }),
      customer({ id: 'b', email: 'ada@example.com', role: 'student' }),
    ])
    await expectAbort(() => resolvePublicCourseUser(db.supabase, {
      tenantId: TENANT,
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
    }), 'ambiguous_email')
    expect(db.inserts).toHaveLength(0)
  })

  it('6. staff email aborts', async () => {
    const db = harness([
      customer({ id: 'staff-1', email: 'staff@example.com', role: 'staff' }),
    ])
    await expectAbort(() => resolvePublicCourseUser(db.supabase, {
      tenantId: TENANT,
      email: 'staff@example.com',
      firstName: 'Staff',
      lastName: 'Member',
    }), 'staff_contact')
    expect(db.inserts).toHaveLength(0)
  })

  it('7. admin email aborts', async () => {
    const db = harness([
      customer({ id: 'admin-1', email: 'admin@example.com', role: 'admin' }),
    ])
    await expectAbort(() => resolvePublicCourseUser(db.supabase, {
      tenantId: TENANT,
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
    }), 'staff_contact')
    expect(db.inserts).toHaveLength(0)
  })

  it('8. 23505 email race reuses the winning public user', async () => {
    const db = harness([], {
      failFirstInsert: true,
      winnerOnConflict: customer({ id: 'winner', email: 'race@example.com', role: 'student' }),
    })
    const resolved = await resolvePublicCourseUser(db.supabase, {
      tenantId: TENANT,
      email: 'race@example.com',
      firstName: 'Race',
      lastName: 'Winner',
    })
    expect(resolved).toEqual({ userId: 'winner', created: false })
    expect(db.inserts).toHaveLength(1)
  })

  it('9. a second enrollment reuses the first public user', async () => {
    const db = harness([])
    const first = await resolvePublicCourseUser(db.supabase, {
      tenantId: TENANT,
      email: 'twice@example.com',
      firstName: 'Twice',
      lastName: 'Once',
    })
    const second = await resolvePublicCourseUser(db.supabase, {
      tenantId: TENANT,
      email: 'twice@example.com',
      firstName: 'Twice',
      lastName: 'Once',
    })
    expect(second.userId).toBe(first.userId)
    expect(second.created).toBe(false)
    expect(db.inserts).toHaveLength(1)
    expect(db.rows.filter((row) => row.email === 'twice@example.com')).toHaveLength(1)
  })

  it('14/15/16. forged user id and foreign tenant are ignored', async () => {
    const db = harness([
      customer({ id: 'foreign-user', email: 'ada@example.com', tenant_id: OTHER }),
    ])
    const resolved = await resolvePublicCourseUser(db.supabase, {
      tenantId: TENANT,
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Local',
      ...({ userId: 'forged-user', tenantIdFromBody: OTHER } as Record<string, unknown>),
    } as never)
    expect(resolved.userId).not.toBe('forged-user')
    expect(resolved.userId).not.toBe('foreign-user')
    expect(db.inserts[0].tenant_id).toBe(TENANT)
    expect(db.inserts[0].auth_user_id).toBeNull()
  })

  it('does not call auth provisioning', () => {
    const src = readFileSync(resolve(process.cwd(), 'server/utils/public-course-user.ts'), 'utf8')
    expect(src).not.toContain('auth.admin.createUser')
    expect(src).not.toContain('auth.signUp')
    expect(src).not.toContain('onboarding_token')
    expect(src).toContain("role: PUBLIC_COURSE_USER_ROLE")
    expect(src).toContain('auth_user_id: null')
    expect(src).toContain('.limit(2)')
    expect(src).not.toContain('.limit(1)')
  })
})

describe('cash and invoice share the resolver', () => {
  it('10/11. enroll-cash binds registration.user_id for both payment methods', () => {
    const cash = readFileSync(resolve(process.cwd(), 'server/api/courses/enroll-cash.post.ts'), 'utf8')
    expect(cash).toContain('resolvePublicCourseUser')
    expect(cash).toContain('resolveNonWalleeEnrollmentMethod')
    expect(cash).toContain('user_id: guestUserId')
    expect(cash).not.toContain('guestUserId = null')
    expect(cash).not.toContain('auth.admin.createUser')
    expect(cash).not.toContain('onboarding_token')
  })
})

describe('Wallee public user', () => {
  it('12. creates the user only inside fulfillment, with auth_user_id null', async () => {
    const enroll = readFileSync(resolve(process.cwd(), 'server/api/courses/enroll-wallee.post.ts'), 'utf8')
    expect(enroll).not.toContain('resolvePublicCourseUser')
    expect(enroll).toContain('after a successful payment')

    const db = harness([])
    const payment = {
      id: 'pay-1',
      tenant_id: TENANT,
      user_id: null as string | null,
      metadata: { email: 'paid@example.com', firstname: 'Paid', lastname: 'Person', phone: '0792223344' },
    }
    const userId = await ensureGuestUserForCoursePayment(db.supabase, payment, TENANT)
    expect(userId).toBeTruthy()
    expect(db.inserts[0]).toMatchObject({
      role: 'client',
      auth_user_id: null,
      tenant_id: TENANT,
      email: 'paid@example.com',
    })
    expect(db.inserts[0]).not.toHaveProperty('onboarding_token')
    expect(payment.user_id).toBe(userId)
  })

  it('13. retry reuses the same public user', async () => {
    const db = harness([])
    const payment = {
      id: 'pay-2',
      tenant_id: TENANT,
      user_id: null as string | null,
      metadata: { email: 'retry@example.com', firstname: 'Retry', lastname: 'User' },
    }
    const first = await ensureGuestUserForCoursePayment(db.supabase, payment, TENANT)
    const second = await ensureGuestUserForCoursePayment(db.supabase, payment, TENANT)
    expect(second).toBe(first)
    expect(db.inserts).toHaveLength(1)
  })

  it('same-tenant payment.user_id with a different email is not attached', async () => {
    const db = harness([
      customer({ id: 'session-user', email: 'session@example.com', role: 'student' }),
      customer({ id: 'email-user', email: 'form@example.com', role: 'student' }),
    ])
    const userId = await ensureGuestUserForCoursePayment(db.supabase, {
      id: 'pay-forged',
      tenant_id: TENANT,
      user_id: 'session-user',
      metadata: { email: 'form@example.com' },
    }, TENANT)
    expect(userId).toBe('email-user')
    expect(db.inserts).toHaveLength(0)
  })

  it('cross-tenant payment.user_id is ignored and the course-tenant email is reused', async () => {
    const db = harness([
      customer({ id: 'local-customer', email: 'ada@example.com', role: 'student' }),
    ])
    const userId = await ensureGuestUserForCoursePayment(db.supabase, {
      id: 'pay-3',
      tenant_id: TENANT,
      user_id: 'foreign-payment-user',
      metadata: { email: 'ada@example.com' },
    }, TENANT)
    expect(userId).toBe('local-customer')
    expect(db.inserts).toHaveLength(0)
  })

  it('identity_blocked is not a successful fulfillment', async () => {
    const db = harness([
      customer({ id: 'owner', email: 'owner@example.com', phone: '+41791112233' }),
    ])
    await expect(ensureGuestUserForCoursePayment(db.supabase, {
      id: 'pay-4',
      tenant_id: TENANT,
      metadata: { email: 'other@example.com', phone: '0791112233', firstname: 'Other', lastname: 'Person' },
    }, TENANT)).rejects.toBeInstanceOf(PublicCourseUserAbort)
  })
})
