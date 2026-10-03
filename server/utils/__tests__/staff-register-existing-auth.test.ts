/**
 * POST /api/staff/register — existing Supabase Auth email.
 *
 * The handler claims the invitation, then checkEmailAvailableForStaff returns
 * auth_exists. The failure path must release that claim before the 409 is
 * returned. No second Auth user, no public.users row, no tenant link, and no
 * staff operational rows.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { emailConflictMessage } from '../email-availability'

const TOKEN = 'existing-auth-invite-token-aaaaaaaa'
const EXISTING_AUTH_ID = 'auth-existing'
const EMAIL = 'bea@example.com'
const FUTURE = '2099-01-01T00:00:00.000Z'
const AUTH_EXISTS_MESSAGE = emailConflictMessage({ available: false, reason: 'auth_exists' })

type InvitationRole = 'admin' | 'staff'

type InvitationRow = {
  id: string
  tenant_id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  link_to_admin: boolean
  invited_by: string
  invitation_token: string
  status: 'pending' | 'accepted'
  expires_at: string
  accepted_at: string | null
  role: InvitationRole
}

type QueryResult = { data: unknown, error: null }

type Handler = (event: object) => Promise<unknown>

type H3ErrorLike = Error & { statusCode?: number, statusMessage?: string }

function createHttpError(opts: { statusCode: number, statusMessage: string }): H3ErrorLike {
  const error = new Error(opts.statusMessage) as H3ErrorLike
  error.statusCode = opts.statusCode
  error.statusMessage = opts.statusMessage
  return error
}

function seedInvitation(role: InvitationRole): InvitationRow {
  return {
    id: 'inv-existing-auth',
    tenant_id: 'tenant-a',
    first_name: 'Bea',
    last_name: 'Admin',
    email: EMAIL,
    phone: null,
    link_to_admin: false,
    invited_by: 'auth-owner',
    invitation_token: TOKEN,
    status: 'pending',
    expires_at: FUTURE,
    accepted_at: null,
    role,
  }
}

function createRegistrationClient(invitation: InvitationRow) {
  const events: string[] = []
  const usersInserted: unknown[] = []
  const staffWrites: string[] = []
  const authUsers = [{ id: EXISTING_AUTH_ID, email: EMAIL }]
  let createUserCalls = 0
  let deleteUserCalls = 0

  const from = (table: string) => {
    const state = {
      op: 'select' as 'select' | 'update' | 'insert',
      patch: {} as Record<string, unknown>,
      eq: {} as Record<string, unknown>,
      gt: {} as Record<string, unknown>,
      selectCols: '',
    }
    let settled = false
    let cached: QueryResult = { data: null, error: null }

    const settle = (): QueryResult => {
      if (settled) return cached
      settled = true
      cached = applyQuery()
      return cached
    }

    const applyQuery = (): QueryResult => {
      if (table === 'staff_invitations' && state.op === 'select') {
        const tokenOk = state.eq.invitation_token === invitation.invitation_token
        const pendingOk = state.eq.status === 'pending' && invitation.status === 'pending'
        if (!tokenOk || !pendingOk) return { data: null, error: null }
        return {
          data: {
            email: invitation.email,
            expires_at: invitation.expires_at,
            tenant_id: invitation.tenant_id,
          },
          error: null,
        }
      }

      if (table === 'staff_invitations' && state.op === 'update' && state.patch.status === 'accepted') {
        const tokenOk = state.eq.invitation_token === invitation.invitation_token
        const pendingOk = state.eq.status === 'pending' && invitation.status === 'pending'
        const expiryOk = typeof state.gt.expires_at === 'string' && invitation.expires_at > state.gt.expires_at
        if (!tokenOk || !pendingOk || !expiryOk) return { data: null, error: null }
        invitation.status = 'accepted'
        invitation.accepted_at = String(state.patch.accepted_at)
        events.push('consume')
        return {
          data: {
            id: invitation.id,
            tenant_id: invitation.tenant_id,
            first_name: invitation.first_name,
            last_name: invitation.last_name,
            email: invitation.email,
            phone: invitation.phone,
            link_to_admin: invitation.link_to_admin,
            invited_by: invitation.invited_by,
            accepted_at: invitation.accepted_at,
            role: invitation.role,
          },
          error: null,
        }
      }

      if (table === 'staff_invitations' && state.op === 'update' && state.patch.status === 'pending') {
        const matchesClaim = state.eq.id === invitation.id
          && state.eq.status === 'accepted'
          && invitation.status === 'accepted'
          && state.eq.accepted_at === invitation.accepted_at
        if (matchesClaim) {
          invitation.status = 'pending'
          invitation.accepted_at = null
          events.push('release')
        }
        return { data: null, error: null }
      }

      if (table === 'users' && state.op === 'insert') {
        usersInserted.push(state.patch)
        events.push('users_insert')
        return { data: { id: 'user-new' }, error: null }
      }

      if (table === 'users' && state.op === 'update') {
        events.push('users_update')
        return { data: null, error: null }
      }

      if (table === 'users' && state.selectCols.includes('id, role')) {
        return { data: [], error: null }
      }

      if (table === 'users') {
        return { data: { email: 'owner-admin@example.com' }, error: null }
      }

      if (table === 'tenants') {
        return { data: { business_type: 'driving_school', slug: 'tenant-a' }, error: null }
      }

      if (table === 'business_type_presets') {
        return { data: { ui_labels: {} }, error: null }
      }

      if (state.op === 'insert') {
        staffWrites.push(table)
        events.push(`insert:${table}`)
      }
      return { data: null, error: null }
    }

    const builder: Record<string, unknown> = {}
    const self = () => builder
    builder.select = (cols?: string) => {
      state.selectCols = typeof cols === 'string' ? cols : ''
      return self()
    }
    builder.update = (patch: Record<string, unknown>) => {
      state.op = 'update'
      state.patch = patch
      return self()
    }
    builder.insert = (row: Record<string, unknown>) => {
      state.op = 'insert'
      state.patch = row
      return self()
    }
    builder.eq = (col: string, val: unknown) => {
      state.eq[col] = val
      return self()
    }
    builder.neq = () => self()
    builder.gt = (col: string, val: unknown) => {
      state.gt[col] = val
      return self()
    }
    builder.in = () => self()
    builder.is = () => self()
    builder.limit = () => self()
    builder.order = () => self()
    builder.maybeSingle = async () => settle()
    builder.single = async () => settle()
    builder.then = (
      onFulfilled: (value: QueryResult) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(settle()).then(onFulfilled, onRejected)
    return builder
  }

  const client = {
    from,
    rpc: async (name: string, args: { p_email?: string }) => {
      if (name === 'lookup_auth_user_id_by_email') {
        events.push('auth_lookup')
        const match = authUsers.find(user => user.email === args.p_email)
        return { data: match?.id ?? null, error: null }
      }
      return { data: null, error: null }
    },
    auth: {
      admin: {
        createUser: async () => {
          createUserCalls += 1
          events.push('createUser')
          authUsers.push({ id: 'auth-duplicate', email: EMAIL })
          return { data: { user: { id: 'auth-duplicate' } }, error: null }
        },
        deleteUser: async () => {
          deleteUserCalls += 1
          return { error: null }
        },
      },
    },
  }

  return {
    client,
    events,
    usersInserted,
    staffWrites,
    authUsers,
    counts: () => ({ createUserCalls, deleteUserCalls }),
  }
}

async function loadRegisterHandler(client: ReturnType<typeof createRegistrationClient>['client']): Promise<Handler> {
  vi.resetModules()
  vi.stubGlobal('defineEventHandler', (fn: Handler) => fn)
  vi.stubGlobal('createError', createHttpError)
  vi.stubGlobal('getHeader', () => null)
  vi.stubGlobal('useRuntimeConfig', () => ({
    public: { supabaseUrl: 'http://localhost:54321' },
    supabaseServiceRoleKey: 'test-service-key',
  }))

  vi.doMock('@supabase/supabase-js', () => ({
    createClient: () => client,
  }))
  vi.doMock('~/utils/logger', () => ({
    logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  }))
  vi.doMock('~/server/utils/rate-limiter', () => ({
    checkRateLimit: async () => ({ allowed: true, remaining: 4, retryAfter: 0 }),
  }))
  vi.doMock('~/server/utils/audit', () => ({
    logAudit: async () => undefined,
  }))
  vi.doMock('~/server/utils/send-welcome-email', () => ({
    sendWelcomeEmail: vi.fn(),
  }))
  vi.doMock('~/server/utils/queue-availability-recalc', () => ({
    enqueueStaffAvailabilityRecalc: vi.fn(),
  }))
  vi.doMock('~/server/utils/ip-utils', () => ({
    getClientIP: () => '127.0.0.1',
  }))
  vi.doMock('~/server/utils/email-validator', () => ({
    validateRegistrationEmail: async () => ({ valid: true }),
  }))

  const mod = await import('../../api/staff/register.post')
  return mod.default as Handler
}

describe('POST /api/staff/register existing auth email', () => {
  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it.each(['staff', 'admin'] as const)(
    'rejects a pending %s invitation when the email already belongs to an auth user',
    async (role) => {
      const invitation = seedInvitation(role)
      const harness = createRegistrationClient(invitation)
      const requestBody = {
        invitationToken: TOKEN,
        email: EMAIL,
        firstName: 'Bea',
        lastName: 'Admin',
        password: 'CorrectHorse1',
        role: 'admin',
        tenant_id: 'tenant-b',
        is_primary_admin: true,
        selectedLocationIds: [],
        selectedExamLocationIds: [],
      }
      vi.stubGlobal('readBody', async () => requestBody)

      const handler = await loadRegisterHandler(harness.client)
      await expect(handler({})).rejects.toMatchObject({
        statusCode: 409,
        statusMessage: AUTH_EXISTS_MESSAGE,
      })

      const lookupAt = harness.events.indexOf('auth_lookup')
      const consumeAt = harness.events.indexOf('consume')
      const releaseAt = harness.events.indexOf('release')
      expect(lookupAt).toBeGreaterThan(-1)
      expect(harness.events.filter(event => event === 'release')).toHaveLength(
        harness.events.filter(event => event === 'consume').length,
      )
      if (consumeAt !== -1) {
        expect(releaseAt).toBeGreaterThan(lookupAt)
      }
      expect(invitation.status).toBe('pending')
      expect(invitation.accepted_at).toBeNull()
      expect(harness.counts().createUserCalls).toBe(0)
      expect(harness.counts().deleteUserCalls).toBe(0)
      expect(harness.authUsers).toEqual([{ id: EXISTING_AUTH_ID, email: EMAIL }])
      expect(harness.usersInserted).toEqual([])
      expect(harness.staffWrites).toEqual([])
      expect(harness.events).not.toContain('users_insert')
      expect(harness.events).not.toContain('users_update')
      expect(harness.events).not.toContain('createUser')
    },
  )

  it('checks auth availability before creating an auth user or a users row', () => {
    const src = readFileSync(resolve(process.cwd(), 'server/api/staff/register.post.ts'), 'utf8')
    const availability = src.indexOf('await checkEmailAvailableForStaff')
    const createUser = src.indexOf('auth.admin.createUser')
    const profileRole = src.indexOf('role: registeredRole')
    const profileCreated = src.indexOf('staffProfileCreated = true')
    const failureRelease = src.indexOf('if (!staffProfileCreated && serviceSupabase)')
    expect(availability).toBeGreaterThan(-1)
    expect(createUser).toBeGreaterThan(availability)
    expect(profileRole).toBeGreaterThan(availability)
    expect(profileCreated).toBeGreaterThan(createUser)
    expect(failureRelease).toBeGreaterThan(profileCreated)
    expect(src).toContain('releaseStaffInvitationClaim')
    expect(src).toContain('statusCode: 409')
    expect(src.slice(availability, createUser)).toContain('emailConflictMessage(availability')
  })
})
