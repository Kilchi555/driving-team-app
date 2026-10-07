import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  isAuthBackedCustomer,
  isReusableGuestCustomer,
  pickReusableGuestCustomer,
} from '../guest-customer-identity'
import {
  pendingUserNotificationPlan,
  upsertPendingRegistrationUser,
  type PendingUserAdmin,
  type PendingUserProfile,
} from '../pending-registration-user'

const GEMPERLI = 'tenant-gemperli'
const OTHER = 'tenant-other'
const COURSE_EMAIL = 'vku.customer@example.com'

function shadow(overrides: Partial<{
  id: string
  auth_user_id: string | null
  onboarding_status: string | null
  email: string | null
  phone: string | null
  category: string[]
}> = {}) {
  return {
    id: overrides.id ?? 'user-course-1',
    auth_user_id: overrides.auth_user_id ?? null,
    onboarding_status: overrides.onboarding_status ?? 'completed',
    email: overrides.email ?? COURSE_EMAIL,
    phone: overrides.phone ?? '+41791112233',
    category: overrides.category ?? ['VKU'],
    onboarding_token: null as string | null,
    onboarding_token_expires: null as string | null,
  }
}

describe('guest-customer-identity helpers', () => {
  it('TEST 1: completed no-Auth course/VKU customer is reusable (not login-required)', () => {
    const courseUser = shadow({ onboarding_status: 'completed', auth_user_id: null })
    expect(isAuthBackedCustomer(courseUser)).toBe(false)
    expect(isReusableGuestCustomer(courseUser)).toBe(true)
    expect(pickReusableGuestCustomer({
      emailMatch: courseUser,
      phoneMatch: null,
    })).toEqual(courseUser)
  })

  it('TEST 2: Auth-backed completed customer remains login-required', () => {
    const authUser = shadow({
      onboarding_status: 'completed',
      auth_user_id: 'auth-uuid-1',
    })
    expect(isAuthBackedCustomer(authUser)).toBe(true)
    expect(isReusableGuestCustomer(authUser)).toBe(false)
    expect(pickReusableGuestCustomer({
      emailMatch: authUser,
      phoneMatch: null,
    })).toBeNull()
  })

  it('TEST 3: pending guest shadow remains reusable', () => {
    const pending = shadow({
      id: 'pending-1',
      onboarding_status: 'pending',
      auth_user_id: null,
    })
    expect(isReusableGuestCustomer(pending)).toBe(true)
    expect(pickReusableGuestCustomer({
      emailMatch: pending,
      phoneMatch: null,
    })).toEqual(pending)
  })

  it('TEST 4: prefers email match over phone when both are reusable', () => {
    const byEmail = shadow({ id: 'email-user', email: COURSE_EMAIL })
    const byPhone = shadow({ id: 'phone-user', phone: '+41790000000' })
    expect(pickReusableGuestCustomer({
      emailMatch: byEmail,
      phoneMatch: byPhone,
    })?.id).toBe('email-user')
  })

  it('TEST 7: Auth-backed customer cannot be claimed via the reusable picker', () => {
    const authUser = shadow({ auth_user_id: 'auth-owned' })
    const pendingOther = shadow({ id: 'other', auth_user_id: null, onboarding_status: 'pending' })
    expect(pickReusableGuestCustomer({
      emailMatch: authUser,
      phoneMatch: pendingOther,
    })?.id).toBe('other')
    expect(pickReusableGuestCustomer({
      emailMatch: authUser,
      phoneMatch: authUser,
    })).toBeNull()
  })
})

describe('guest-book / register-client wiring (source contracts)', () => {
  const guestBook = readFileSync(resolve(process.cwd(), 'server/api/booking/guest-book.post.ts'), 'utf8')
  const registerClient = readFileSync(resolve(process.cwd(), 'server/api/auth/register-client.post.ts'), 'utf8')
  const pendingUtil = readFileSync(resolve(process.cwd(), 'server/utils/pending-registration-user.ts'), 'utf8')

  it('guest-book keys login block on auth_user_id via shared helpers', () => {
    expect(guestBook).toContain("from '~/server/utils/guest-customer-identity'")
    expect(guestBook).toContain('isAuthBackedCustomer')
    expect(guestBook).toContain('pickReusableGuestCustomer')
    expect(guestBook).toContain('auth_user_id')
    expect(guestBook).not.toMatch(/onboarding_status === ['"]completed['"].*Bitte melde dich an/s)
    expect(guestBook).not.toContain("onboarding_status === 'completed'")
  })

  it('TEST 5: login-required tenants still short-circuit before identity reuse', () => {
    expect(guestBook).toContain('if (policy.registration_required)')
    expect(guestBook).toContain('statusCode: 403')
  })

  it('TEST 6: register-client pendingOnly blocks Auth only, not completed-without-auth', () => {
    const pendingBlock = registerClient.indexOf('// Block only Auth-backed customers')
    expect(pendingBlock).toBeGreaterThan(-1)
    const pendingSection = registerClient.slice(pendingBlock, pendingBlock + 1200)
    expect(pendingSection).toContain('existingEmail?.auth_user_id')
    expect(pendingSection).toContain('existingPhone?.auth_user_id')
    expect(pendingSection).not.toContain("onboarding_status === 'completed'")
  })

  it('pending registration util treats Auth as the active-account boundary', () => {
    expect(pendingUtil).toContain('isAuthBackedCustomer')
    expect(pendingUtil).toContain('findReusableNoAuthUser')
    expect(pendingUtil).not.toContain("onboarding_status === 'completed'")
  })
})

type MemUser = Record<string, unknown> & {
  id: string
  tenant_id: string
  email: string | null
  phone: string | null
  onboarding_status: string | null
  auth_user_id: string | null
}

function createMemoryDb(seed: MemUser[] = []) {
  const users: MemUser[] = [...seed]
  const usersAdmin = {
    from: (): ReturnType<PendingUserAdmin['from']> => ({
      select: () => {
        const filters: Record<string, string> = {}
        const chain = {
          eq(column: string, value: string) {
            filters[column] = value
            return chain
          },
          async maybeSingle() {
            const found = users.find((row) =>
              Object.entries(filters).every(([key, value]) => row[key] === value),
            )
            return {
              data: found
                ? {
                    id: found.id,
                    onboarding_status: found.onboarding_status,
                    auth_user_id: found.auth_user_id,
                  }
                : null,
              error: null,
            }
          },
        }
        return chain
      },
      update: (payload: PendingUserProfile) => ({
        async eq(column: string, value: string) {
          const row = users.find((item) => item[column] === value)
          if (row) Object.assign(row, payload)
          return { error: null }
        },
      }),
      async insert(payload: PendingUserProfile & { id: string }) {
        const email = typeof payload.email === 'string' ? payload.email : null
        const phone = typeof payload.phone === 'string' ? payload.phone : null
        const tenantId = String(payload.tenant_id)
        const emailClash = email
          ? users.find((row) => row.email === email && row.tenant_id === tenantId)
          : undefined
        const phoneClash = phone
          ? users.find((row) => row.phone === phone && row.tenant_id === tenantId)
          : undefined
        if (emailClash || phoneClash) {
          return { error: { code: '23505', message: 'users_email_tenant_unique' } }
        }
        users.push({
          onboarding_status: 'pending',
          auth_user_id: null,
          email: null,
          phone: null,
          ...payload,
          id: String(payload.id),
          tenant_id: tenantId,
        })
        return { error: null }
      },
    }),
  } as PendingUserAdmin
  return { users, usersAdmin }
}

describe('register-client / pending upsert with course shadows', () => {
  it('TEST 1+6: reuses completed no-Auth course customer instead of conflicting', async () => {
    const db = createMemoryDb([{
      id: 'course-user',
      tenant_id: GEMPERLI,
      email: COURSE_EMAIL,
      phone: '+41791112233',
      onboarding_status: 'completed',
      auth_user_id: null,
    }])

    const write = await upsertPendingRegistrationUser(db.usersAdmin, {
      tenantId: GEMPERLI,
      email: COURSE_EMAIL,
      phone: '+41791112233',
      profile: {
        first_name: 'VKU',
        last_name: 'Customer',
        email: COURSE_EMAIL,
        phone: '+41791112233',
        tenant_id: GEMPERLI,
        role: 'client',
        onboarding_status: 'pending',
        is_active: true,
      },
      newUserId: 'should-not-insert',
    })

    expect(write).toEqual({ ok: true, userId: 'course-user', created: false })
    expect(pendingUserNotificationPlan(write.ok && write.created)).toEqual({
      notifyAdminNewUser: false,
      sendCustomerRegistrationReceipt: false,
    })
    expect(db.users).toHaveLength(1)
    expect(db.users[0]?.id).toBe('course-user')
    expect(db.users[0]?.onboarding_status).toBe('pending')
    expect(db.users[0]?.auth_user_id).toBeNull()
  })

  it('TEST 2+7: Auth-backed customer still conflicts', async () => {
    const db = createMemoryDb([{
      id: 'auth-user',
      tenant_id: GEMPERLI,
      email: COURSE_EMAIL,
      phone: '+41791112233',
      onboarding_status: 'completed',
      auth_user_id: 'auth-1',
    }])

    const write = await upsertPendingRegistrationUser(db.usersAdmin, {
      tenantId: GEMPERLI,
      email: COURSE_EMAIL,
      phone: '+41791112233',
      profile: {
        first_name: 'Taken',
        email: COURSE_EMAIL,
        phone: '+41791112233',
        tenant_id: GEMPERLI,
        onboarding_status: 'pending',
      },
      newUserId: 'new',
    })

    expect(write).toEqual({ ok: false, conflict: 'email' })
    expect(db.users).toHaveLength(1)
    expect(db.users[0]?.auth_user_id).toBe('auth-1')
  })

  it('TEST 3: pending guest remains updatable without a second create', async () => {
    const db = createMemoryDb([{
      id: 'pending-user',
      tenant_id: GEMPERLI,
      email: COURSE_EMAIL,
      phone: '+41791112233',
      onboarding_status: 'pending',
      auth_user_id: null,
    }])

    const write = await upsertPendingRegistrationUser(db.usersAdmin, {
      tenantId: GEMPERLI,
      email: COURSE_EMAIL,
      phone: '+41791112233',
      profile: {
        first_name: 'Updated',
        email: COURSE_EMAIL,
        phone: '+41791112233',
        tenant_id: GEMPERLI,
        onboarding_status: 'pending',
      },
      newUserId: 'new',
    })

    expect(write).toEqual({ ok: true, userId: 'pending-user', created: false })
    expect(db.users[0]?.first_name).toBe('Updated')
  })

  it('TEST 4: same email in another tenant does not attach', async () => {
    const db = createMemoryDb([{
      id: 'foreign',
      tenant_id: OTHER,
      email: COURSE_EMAIL,
      phone: '+41791112233',
      onboarding_status: 'completed',
      auth_user_id: null,
    }])

    const write = await upsertPendingRegistrationUser(db.usersAdmin, {
      tenantId: GEMPERLI,
      email: COURSE_EMAIL,
      phone: '+41799999999',
      profile: {
        first_name: 'Local',
        email: COURSE_EMAIL,
        phone: '+41799999999',
        tenant_id: GEMPERLI,
        onboarding_status: 'pending',
      },
      newUserId: 'local-new',
    })

    expect(write).toEqual({ ok: true, userId: 'local-new', created: true })
    expect(db.users).toHaveLength(2)
    expect(db.users.map((u) => u.tenant_id).sort()).toEqual([GEMPERLI, OTHER].sort())
  })
})
