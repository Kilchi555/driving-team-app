/**
 * Staff invitation public lookup hotfix.
 *
 * Production break: after anon SELECT on staff_invitations was revoked,
 * POST /api/staff/get-invitation still used the anon client → valid tokens 404.
 *
 * Fix: service_role equality lookup + minimal public response.
 * Do not restore anon SELECT / staff_invitations_token_read.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const handlerPath = resolve(process.cwd(), 'server/api/staff/get-invitation.post.ts')
const staffRegisterPage = resolve(process.cwd(), 'pages/register/staff.vue')
const legacyRegisterPage = resolve(process.cwd(), 'pages/register-staff.vue')
const registerApiPath = resolve(process.cwd(), 'server/api/staff/register.post.ts')
const resendApiPath = resolve(process.cwd(), 'server/api/staff/resend-invite.post.ts')
const inviteApiPath = resolve(process.cwd(), 'server/api/staff/invite.post.ts')

const VALID_TOKEN = 'test-invite-token-aaaaaaaaaaaaaa'
const OTHER_TOKEN = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
const TENANT_A = 'tenant-a'
const TENANT_B = 'tenant-b'

type QueryResult = { data: unknown; error: unknown; count?: number | null }

type EventHandler = (event: object) => Promise<unknown>

type H3ErrorLike = Error & { statusCode: number }

function mockCreateError(opts: { statusCode: number; statusMessage: string }): H3ErrorLike {
  const err = new Error(opts.statusMessage) as H3ErrorLike
  err.statusCode = opts.statusCode
  return err
}

function createThenable(result: QueryResult) {
  const eqs: Array<[string, unknown]> = []
  const likes: Array<[string, unknown]> = []
  const filters: Record<string, unknown> = {}
  let selectCols = ''

  const builder: Record<string, unknown> = {}
  const self = () => builder

  builder.select = (cols?: string) => {
    selectCols = typeof cols === 'string' ? cols : selectCols
    return self()
  }
  builder.eq = (col: string, val: unknown) => {
    eqs.push([col, val])
    filters[col] = val
    return self()
  }
  builder.in = () => self()
  builder.neq = () => self()
  builder.is = (col: string, val: unknown) => {
    filters[col] = val
    return self()
  }
  builder.order = () => self()
  builder.limit = () => self()
  builder.like = (col: string, val: unknown) => {
    likes.push([col, val])
    return self()
  }
  builder.ilike = (col: string, val: unknown) => {
    likes.push([col, val])
    return self()
  }
  builder.maybeSingle = async () => result
  builder.single = async () => result
  builder.then = (onFulfilled: (value: QueryResult) => unknown, onRejected?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled, onRejected)

  return { builder, eqs, likes, filters, getSelect: () => selectCols }
}

describe('staff get-invitation source contract', () => {
  const src = readFileSync(handlerPath, 'utf8')

  it('uses service_role via getSupabaseAdmin, not the anon client', () => {
    expect(src).toContain('getSupabaseAdmin()')
    expect(src).not.toMatch(/SUPABASE_ANON_KEY/)
    expect(src).not.toMatch(/getSupabaseAnon/)
    expect(src).not.toMatch(/createClient\s*\(\s*supabaseUrl\s*,\s*supabaseAnonKey/)
    expect(src).not.toMatch(/createClient\s*\(\s*process\.env\.SUPABASE_URL/)
  })

  it('looks up the invitation by exact token equality only', () => {
    expect(src).toContain(".eq('invitation_token', token)")
    expect(src).not.toMatch(/\.like\s*\(/)
    expect(src).not.toMatch(/\.ilike\s*\(/)
    expect(src).not.toMatch(/\.filter\s*\(\s*['"]invitation_token['"]/)
    expect(src).not.toMatch(/LIKE/)
  })

  it('does not use caller tenant_id, invitation_id, or email as the lookup key', () => {
    expect(src).not.toMatch(/\.eq\(\s*['"]tenant_id['"]\s*,\s*body/)
    expect(src).not.toMatch(/\.eq\(\s*['"]id['"]\s*,\s*body/)
    expect(src).not.toMatch(/\.eq\(\s*['"]email['"]\s*,\s*body/)
  })

  it('does not select or return the stored invitation_token', () => {
    expect(src).not.toMatch(/select\([^)]*invitation_token/)
    expect(src).not.toMatch(/invitation_token:/)
  })

  it('does not log the invitation token', () => {
    expect(src).not.toMatch(/logger\.[a-z]+\([^)]*token/)
    expect(src).not.toMatch(/substring\(0,\s*10\)/)
    expect(src).not.toMatch(/console\.(log|debug|info|warn|error)\([^)]*token/)
  })

  it('does not recreate anon SELECT on staff_invitations', () => {
    expect(src).not.toMatch(/staff_invitations_token_read/)
    expect(src).not.toMatch(/CREATE POLICY/i)
    expect(src).not.toMatch(/GRANT[^\n]+staff_invitations/)
  })

  it('is a public POST endpoint (no session required to look up a token)', () => {
    expect(src).not.toMatch(/getAuthenticatedUser/)
    expect(src).not.toMatch(/requireAdmin/)
    expect(src).not.toMatch(/requireStaff/)
  })
})

describe('staff invitation public callers', () => {
  it('register/staff.vue loads invitations only via POST /api/staff/get-invitation', () => {
    const src = readFileSync(staffRegisterPage, 'utf8')
    expect(src).toContain("'/api/staff/get-invitation'")
    expect(src).toContain('method: \'POST\'')
    expect(src).not.toMatch(/from\(\s*['"]staff_invitations['"]\s*\)/)
  })

  it('legacy /register-staff with a token redirects to /register/staff', () => {
    const src = readFileSync(legacyRegisterPage, 'utf8')
    expect(src).toContain('/register/staff?token=')
    expect(src).toContain('encodeURIComponent')
  })

  it('staff register, invite, and resend keep service-role invitation access', () => {
    const registerSrc = readFileSync(registerApiPath, 'utf8')
    const inviteSrc = readFileSync(inviteApiPath, 'utf8')
    const resendSrc = readFileSync(resendApiPath, 'utf8')
    expect(registerSrc).toContain('SUPABASE_SERVICE_ROLE_KEY')
    expect(registerSrc).toContain('consumePendingStaffInvitation')
    expect(inviteSrc).toContain('/register/staff?token=')
    expect(resendSrc).toContain('/register/staff?token=')
  })
})

describe('staff get-invitation handler', () => {
  const logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }

  let invitationEqs: Array<[string, unknown]>
  let invitationLikes: Array<[string, unknown]>
  let invitationSelect = ''
  let tenantEqs: Array<[string, unknown]>
  let lastBody: Record<string, unknown>

  const pendingInvitation = {
    id: 'inv-tiago',
    tenant_id: TENANT_A,
    first_name: 'Tiago',
    last_name: '',
    email: 'staff@example.com',
    phone: '+41790000000',
    status: 'pending',
    expires_at: '2026-10-09T14:35:01.372Z',
    invitation_token: VALID_TOKEN,
    invited_by: 'auth-admin',
    accepted_at: null,
  }

  const tenantA = {
    id: TENANT_A,
    name: 'Example Driving School',
    slug: 'example-school',
    primary_color: '#123456',
    business_type: 'driving_school',
    working_days_template: { 1: { start: '07:00', end: '18:00' } },
    stripe_secret: 'sk_live_should_not_leak',
    wallee_space_id: 'secret-space',
  }

  function invitationResultFor(filters: Record<string, unknown>): QueryResult {
    const token = filters.invitation_token
    const status = filters.status
    if (token === VALID_TOKEN && status === 'pending') {
      return { data: pendingInvitation, error: null }
    }
    if (token === 'expired-token' && status === 'pending') {
      return {
        data: {
          ...pendingInvitation,
          id: 'inv-expired',
          expires_at: '2020-01-01T00:00:00.000Z',
        },
        error: null,
      }
    }
    if (token === 'accepted-token') {
      return { data: null, error: null }
    }
    return { data: null, error: null }
  }

  async function loadHandler(body: Record<string, unknown>) {
    lastBody = body
    invitationEqs = []
    invitationLikes = []
    invitationSelect = ''
    tenantEqs = []
    vi.resetModules()

    vi.doMock('h3', () => ({
      defineEventHandler: (fn: EventHandler) => fn,
      createError: mockCreateError,
      readBody: vi.fn(async () => lastBody),
    }))
    vi.doMock('~/utils/logger', () => ({ logger }))
    vi.doMock('~/server/utils/staff-invite-email', () => ({
      isPlaceholderStaffInviteEmail: (email: string | null | undefined) => {
        if (!email) return true
        const e = email.toLowerCase()
        return e.includes('@onboarding.simy.ch') || (e.startsWith('pending_') && e.includes('@invite.simy.ch'))
      },
      isFirstStaffOnboarding: vi.fn().mockResolvedValue(false),
    }))
    vi.doMock('~/server/utils/supabase-admin', () => ({
      getSupabaseAdmin: () => ({
        from(table: string) {
          const result = (() => {
            if (table === 'staff_invitations') {
              const recorded = createThenable({ data: null, error: null })
              invitationEqs = recorded.eqs
              invitationLikes = recorded.likes
              const originalEq = recorded.builder.eq as (col: string, val: unknown) => unknown
              recorded.builder.eq = (col: string, val: unknown) => {
                originalEq(col, val)
                return recorded.builder
              }
              const resolve = () => {
                invitationSelect = recorded.getSelect()
                return invitationResultFor(recorded.filters)
              }
              recorded.builder.maybeSingle = async () => resolve()
              recorded.builder.single = async () => resolve()
              recorded.builder.then = (
                onFulfilled: (value: QueryResult) => unknown,
                onRejected?: (reason: unknown) => unknown,
              ) => Promise.resolve(resolve()).then(onFulfilled, onRejected)
              return recorded.builder
            }
            if (table === 'tenants') {
              const recorded = createThenable({ data: tenantA, error: null })
              tenantEqs = recorded.eqs
              recorded.builder.maybeSingle = async () => ({ data: tenantA, error: null })
              recorded.builder.single = async () => ({ data: tenantA, error: null })
              return recorded.builder
            }
            if (table === 'categories') {
              return createThenable({
                data: [
                  { id: 'cat-1', code: 'B', name: 'Auto', parent_category_id: null, color: '#000' },
                ],
                error: null,
              }).builder
            }
            if (table === 'locations') {
              return createThenable({
                data: [
                  {
                    id: 'loc-1',
                    name: 'Wangen',
                    address: 'Leuholz 24',
                    location_type: 'standard',
                    public_bookable: true,
                    city: null,
                    canton: null,
                    postal_code: null,
                  },
                ],
                error: null,
              }).builder
            }
            if (table === 'business_type_presets') {
              return createThenable({
                data: { ui_labels: { staff: 'Fahrlehrer' }, defaults: { working_days_template: null } },
                error: null,
              }).builder
            }
            if (table === 'tenant_settings') {
              return createThenable({ data: { setting_value: 'false' }, error: null }).builder
            }
            if (table === 'users') {
              return createThenable({ data: { email: 'admin@example.com' }, error: null }).builder
            }
            return createThenable({ data: null, error: null }).builder
          })()
          return result
        },
      }),
      getSupabaseAnon: () => {
        throw new Error('anon client must not be used for invitation lookup')
      },
    }))

    const mod = await import('../../api/staff/get-invitation.post')
    return mod.default as EventHandler
  }

  beforeEach(() => {
    vi.clearAllMocks()
    logger.debug.mockClear()
    logger.info.mockClear()
    logger.warn.mockClear()
    logger.error.mockClear()
  })

  it('valid pending unexpired token returns 200 for a public request', async () => {
    const handler = await loadHandler({ token: VALID_TOKEN })
    const result = await handler({}) as {
      success: boolean
      invitation: Record<string, unknown>
      tenant: Record<string, unknown>
      admin_email: string | null
      email_locked: boolean
    }

    expect(result.success).toBe(true)
    expect(result.invitation.first_name).toBe('Tiago')
    expect(result.invitation.email).toBe('staff@example.com')
    expect(result.invitation.phone).toBe('+41790000000')
    expect(result.invitation.tenant_id).toBe(TENANT_A)
    expect(result.tenant.name).toBe('Example Driving School')
    expect(result.tenant.slug).toBe('example-school')
    expect(result.admin_email).toBe('admin@example.com')
    expect(result.email_locked).toBe(true)
    expect(invitationEqs).toEqual([
      ['invitation_token', VALID_TOKEN],
      ['status', 'pending'],
    ])
    expect(invitationLikes).toEqual([])
    expect(invitationSelect).not.toContain('invitation_token')
  })

  it('does not leak invitation_token, invited_by, secrets, or unused ids', async () => {
    const handler = await loadHandler({ token: VALID_TOKEN })
    const result = await handler({}) as {
      success: boolean
      invitation: Record<string, unknown>
      tenant: Record<string, unknown>
      admin_email: string | null
      email_locked: boolean
    }
    const json = JSON.stringify(result)

    expect(json).not.toContain(VALID_TOKEN)
    expect(json).not.toContain('invited_by')
    expect(json).not.toContain('sk_live_should_not_leak')
    expect(json).not.toContain('secret-space')
    expect(result.invitation).not.toHaveProperty('id')
    expect(result.invitation).not.toHaveProperty('invitation_token')
    expect(result.invitation).not.toHaveProperty('invited_by')
    expect(result.invitation).not.toHaveProperty('accepted_at')
    expect(result.tenant).not.toHaveProperty('stripe_secret')
    expect(result.tenant).not.toHaveProperty('wallee_space_id')
  })

  it('does not write the token to logs', async () => {
    const handler = await loadHandler({ token: VALID_TOKEN })
    await handler({})
    const dumped = JSON.stringify([
      logger.debug.mock.calls,
      logger.info.mock.calls,
      logger.warn.mock.calls,
      logger.error.mock.calls,
    ])
    expect(dumped).not.toContain(VALID_TOKEN)
  })

  it('random token returns 404', async () => {
    const handler = await loadHandler({ token: OTHER_TOKEN })
    await expect(handler({})).rejects.toMatchObject({ statusCode: 404 })
    expect(invitationEqs[0]).toEqual(['invitation_token', OTHER_TOKEN])
  })

  it('expired pending token returns 404 without payload', async () => {
    const handler = await loadHandler({ token: 'expired-token' })
    await expect(handler({})).rejects.toMatchObject({ statusCode: 404 })
  })

  it('accepted invitation token returns 404', async () => {
    const handler = await loadHandler({ token: 'accepted-token' })
    await expect(handler({})).rejects.toMatchObject({ statusCode: 404 })
  })

  it('ignores attacker-supplied tenant_id, invitation_id, and email', async () => {
    const handler = await loadHandler({
      token: VALID_TOKEN,
      tenant_id: TENANT_B,
      invitation_id: 'inv-from-other-tenant',
      email: 'attacker@example.com',
    })
    const result = await handler({}) as {
      success: boolean
      invitation: Record<string, unknown>
      tenant: Record<string, unknown>
      admin_email: string | null
      email_locked: boolean
    }

    expect(result.invitation.tenant_id).toBe(TENANT_A)
    expect(result.tenant.id).toBe(TENANT_A)
    expect(invitationEqs.map(([col]) => col)).toEqual(['invitation_token', 'status'])
    expect(invitationEqs).not.toContainEqual(['tenant_id', TENANT_B])
    expect(invitationEqs).not.toContainEqual(['id', 'inv-from-other-tenant'])
    expect(invitationEqs).not.toContainEqual(['email', 'attacker@example.com'])
    expect(tenantEqs).toContainEqual(['id', TENANT_A])
    expect(tenantEqs).not.toContainEqual(['id', TENANT_B])
  })

  it('does not treat a LIKE-style token as a partial match', async () => {
    const handler = await loadHandler({ token: `${VALID_TOKEN.slice(0, 8)}%` })
    await expect(handler({})).rejects.toMatchObject({ statusCode: 404 })
    expect(invitationLikes).toEqual([])
    expect(invitationEqs[0]?.[1]).toBe(`${VALID_TOKEN.slice(0, 8)}%`)
  })

  it('empty token is rejected without a lookup', async () => {
    const handler = await loadHandler({ token: '   ' })
    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 })
  })

  it('malformed non-string token is rejected', async () => {
    const handler = await loadHandler({ token: ['not-a-string'] })
    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 })
  })

  it('oversized token is rejected', async () => {
    const handler = await loadHandler({ token: 'a'.repeat(129) })
    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('staff register authorization contracts', () => {
  const src = readFileSync(registerApiPath, 'utf8')

  it('hardcodes role staff from the server, not from the request body', () => {
    expect(src).toContain("role: 'staff'")
    expect(src).not.toMatch(/role:\s*body\.role/)
    expect(src).not.toMatch(/role:\s*\(body/)
  })

  it('binds tenant_id from the invitation row, not from the client', () => {
    expect(src).toContain('tenant_id: invitation.tenant_id')
    expect(src).not.toMatch(/tenant_id:\s*body\.tenant_id/)
    expect(src).not.toMatch(/tenant_id:\s*body\.tenantId/)
  })

  it('rejects a different email when the invitation is email-bound', () => {
    expect(src).toContain('isPlaceholderStaffInviteEmail')
    expect(src).toContain('Bitte die eingeladene E-Mail verwenden')
  })

  it('claims the invitation atomically by exact token equality before Auth/profile creation', () => {
    const consumeCall = src.indexOf('const invitation = await consumePendingStaffInvitation')
    const createUser = src.indexOf('auth.admin.createUser')
    const emailBound = src.indexOf('Bitte die eingeladene E-Mail verwenden')
    expect(src).toContain('consumePendingStaffInvitation')
    expect(src).toContain('releaseStaffInvitationClaim')
    expect(consumeCall).toBeGreaterThan(-1)
    expect(consumeCall).toBeLessThan(createUser)
    expect(emailBound).toBeGreaterThan(-1)
    expect(emailBound).toBeLessThan(consumeCall)
    expect(src).not.toMatch(/\.like\s*\(/)
    expect(src).not.toMatch(/\.ilike\s*\(/)
  })

  it('does not persist invitation tokens into audit failure logs', () => {
    expect(src).not.toMatch(/invitation_token:\s*\(error/)
    expect(src).not.toMatch(/invitationToken\?\.substring/)
  })
})

describe('legacy register-staff.vue without token', () => {
  it('only runs the client staff_invitations select when no token is present', () => {
    const src = readFileSync(legacyRegisterPage, 'utf8')
    const mountIdx = src.indexOf('onMounted')
    const redirectIdx = src.indexOf('navigateTo(`/register/staff?token=')
    const loadIdx = src.indexOf('loadInvitation()')
    expect(mountIdx).toBeGreaterThan(-1)
    expect(redirectIdx).toBeGreaterThan(mountIdx)
    expect(loadIdx).toBeGreaterThan(redirectIdx)
    expect(src).toContain("from('staff_invitations')")
  })
})
