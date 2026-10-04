/**
 * POST /api/staff/register — email normalization and spam heuristic.
 *
 * A birth-date local part must not fail as spam. The value stored and sent
 * to Auth is the trimmed, lowercased address. Disposable lookups are stubbed.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { REGISTRATION_SPAM_EMAIL_REASON } from '../email-validator'

const NORMALIZED = 'hans.19850312@bluewin.ch'
const SUBMITTED = '  HANS.19850312@BLUEWIN.CH  '
const FUTURE = '2099-01-01T00:00:00.000Z'
const TOKEN = 'staff-email-normalization-token'

type Handler = (event: object) => Promise<unknown>
type H3ErrorLike = Error & { statusCode?: number, statusMessage?: string }

function createHttpError(opts: { statusCode: number, statusMessage?: string, message?: string }): H3ErrorLike {
  const error = new Error(opts.statusMessage || opts.message || 'error') as H3ErrorLike
  error.statusCode = opts.statusCode
  error.statusMessage = opts.statusMessage
  return error
}

function createRegistrationClient() {
  const lookedUpEmails: string[] = []
  const createdEmails: string[] = []
  const insertedEmails: string[] = []

  const from = (table: string) => {
    const state = {
      op: 'select' as 'select' | 'update' | 'insert',
      negated: false,
    }

    const result = () => {
      if (table === 'staff_invitations' && state.op === 'select' && state.negated) {
        return { data: null, error: null }
      }
      if (table === 'staff_invitations' && state.op === 'select') {
        return {
          data: {
            id: 'inv-1',
            email: NORMALIZED,
            expires_at: FUTURE,
            tenant_id: 'tenant-a',
          },
          error: null,
        }
      }
      if (table === 'staff_invitations' && state.op === 'update') {
        return {
          data: {
            id: 'inv-1',
            tenant_id: 'tenant-a',
            first_name: 'Hans',
            last_name: 'Meier',
            email: NORMALIZED,
            phone: null,
            link_to_admin: false,
            invited_by: null,
            accepted_at: '2026-10-03T00:00:00.000Z',
            role: 'staff',
          },
          error: null,
        }
      }
      if (table === 'users' && state.op === 'insert') {
        return { data: null, error: { message: 'stop after auth', code: 'TEST_STOP' } }
      }
      return { data: null, error: null }
    }

    const builder: Record<string, unknown> = {}
    for (const method of ['select', 'eq', 'gt', 'in', 'is', 'limit', 'order']) {
      builder[method] = (...args: unknown[]) => {
        if (method === 'eq' && args[0] === 'email') lookedUpEmails.push(String(args[1]))
        return builder
      }
    }
    builder.neq = () => {
      state.negated = true
      return builder
    }
    builder.update = () => {
      state.op = 'update'
      return builder
    }
    builder.insert = (row: { email?: string }) => {
      state.op = 'insert'
      if (row?.email) insertedEmails.push(row.email)
      return builder
    }
    builder.maybeSingle = async () => result()
    builder.single = async () => result()
    builder.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result()).then(resolve, reject)

    return builder
  }

  const client = {
    from,
    rpc: async (_name: string, args: { p_email: string }) => {
      lookedUpEmails.push(args.p_email)
      return { data: null, error: null }
    },
    auth: {
      admin: {
        createUser: async (payload: { email: string }) => {
          createdEmails.push(payload.email)
          return { data: { user: { id: 'auth-new' } }, error: null }
        },
        deleteUser: async () => ({ error: null }),
      },
    },
  }

  return { client, lookedUpEmails, createdEmails, insertedEmails }
}

describe('POST /api/staff/register email validation', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('normalizes whitespace and case before validation and downstream use', async () => {
    const harness = createRegistrationClient()
    vi.resetModules()
    vi.stubGlobal('defineEventHandler', (fn: Handler) => fn)
    vi.stubGlobal('createError', createHttpError)
    vi.stubGlobal('getHeader', () => null)
    vi.stubGlobal('useRuntimeConfig', () => ({
      public: { supabaseUrl: 'http://localhost:54321' },
      supabaseServiceRoleKey: 'test-service-key',
    }))
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ disposable: false }),
    }))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('readBody', async () => ({
      invitationToken: TOKEN,
      email: SUBMITTED,
      firstName: 'Hans',
      lastName: 'Meier',
      password: 'CorrectHorse1',
      selectedLocationIds: [],
      selectedExamLocationIds: [],
    }))

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: () => harness.client,
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

    const mod = await import('../../api/staff/register.post')
    const handler = mod.default as Handler

    await expect(handler({})).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Fehler beim Erstellen des Profils',
    })

    expect(harness.createdEmails).toEqual([NORMALIZED])
    expect(harness.insertedEmails).toEqual([NORMALIZED])
    expect(harness.lookedUpEmails.length).toBeGreaterThan(0)
    expect(harness.lookedUpEmails.every(email => email === NORMALIZED)).toBe(true)
    expect(fetchMock).toHaveBeenCalled()
  })

  it('still rejects an exact spam local part before Auth user creation', async () => {
    const harness = createRegistrationClient()
    vi.resetModules()
    vi.stubGlobal('defineEventHandler', (fn: Handler) => fn)
    vi.stubGlobal('createError', createHttpError)
    vi.stubGlobal('getHeader', () => null)
    vi.stubGlobal('useRuntimeConfig', () => ({
      public: { supabaseUrl: 'http://localhost:54321' },
      supabaseServiceRoleKey: 'test-service-key',
    }))
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ disposable: false }),
    })))
    vi.stubGlobal('readBody', async () => ({
      invitationToken: TOKEN,
      email: 'test@example.com',
      firstName: 'Hans',
      lastName: 'Meier',
      password: 'CorrectHorse1',
    }))
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: () => harness.client,
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

    const mod = await import('../../api/staff/register.post')
    const handler = mod.default as Handler

    await expect(handler({})).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: REGISTRATION_SPAM_EMAIL_REASON,
    })
    expect(harness.createdEmails).toEqual([])
    expect(harness.insertedEmails).toEqual([])
  })

  it('validates the normalized address before the old post-check trim', () => {
    const src = readFileSync(resolve(process.cwd(), 'server/api/staff/register.post.ts'), 'utf8')
    const normalizedAt = src.indexOf('const normalizedEmail = email.trim().toLowerCase()')
    const formatAt = src.indexOf('if (!validateEmail(normalizedEmail).valid)')
    const registrationAt = src.indexOf('validateRegistrationEmail(normalizedEmail)')
    expect(normalizedAt).toBeGreaterThan(-1)
    expect(formatAt).toBeGreaterThan(normalizedAt)
    expect(registrationAt).toBeGreaterThan(formatAt)
    expect(src).not.toContain('if (!validateEmail(email))')
    expect(src).toContain('invitationPreview.email.toLowerCase().trim() !== normalizedEmail')
    expect(src).not.toContain('email: email.toLowerCase()')
    expect(src).toContain('email: normalizedEmail')
    expect(src).toContain('to: normalizedEmail')
  })
})

describe('public availability uses the local spam heuristic only', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  function availabilityEvent(email: string) {
    return {
      path: `/?email=${encodeURIComponent(email)}`,
      node: {
        req: {
          headers: {},
          socket: { remoteAddress: '127.0.0.1' },
        },
      },
    }
  }

  async function loadAvailability() {
    const queried: string[] = []
    vi.resetModules()
    vi.stubGlobal('defineEventHandler', (fn: Handler) => fn)
    vi.stubGlobal('createError', createHttpError)
    vi.doMock('~/server/utils/rate-limiter', () => ({
      checkRateLimit: async () => ({ allowed: true, remaining: 1, retryAfter: 0 }),
    }))
    vi.doMock('~/server/utils/supabase-admin', () => ({
      getSupabaseAdmin: () => ({
        from: () => {
          const builder: Record<string, unknown> = {}
          builder.select = () => builder
          builder.eq = (column: string, value: string) => {
            if (column === 'email' || column === 'contact_email') queried.push(value)
            return builder
          }
          builder.maybeSingle = async () => ({ data: null, error: null })
          return builder
        },
      }),
    }))
    const mod = await import('../../api/tenants/check-availability.get')
    return { handler: mod.default as Handler, queried }
  }

  it('does not treat a numeric local part as unavailable', async () => {
    const { handler, queried } = await loadAvailability()
    await expect(handler(availabilityEvent('Hans.19850312@Bluewin.ch'))).resolves.toEqual({
      email: { available: true },
    })
    expect(queried).toEqual([NORMALIZED, NORMALIZED])
  })

  it('marks an exact spam local part invalid before the database lookup', async () => {
    const { handler, queried } = await loadAvailability()
    await expect(handler(availabilityEvent('test@example.com'))).resolves.toEqual({
      email: { available: false, reason: 'invalid' },
    })
    expect(queried).toEqual([])
  })
})
