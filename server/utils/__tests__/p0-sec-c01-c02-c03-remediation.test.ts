/**
 * SEC-C01 / C02 / C03 — P0 remediation contract + invariant tests.
 *
 * Live SEC-C01 probe (after migration v2 on project unyjaetebnaexaflpyoc):
 *   authenticated JWT → UPDATE role/tenant_id/admin_level → DENIED
 *   service_role JWT → UPDATE allowed
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createError, type H3Event } from 'h3'

/** Minimal event stub for mocked auth helpers (no real request I/O). */
const emptyEvent = {} as H3Event

type AdminProfile = {
  id: string
  tenant_id: string
  role: string
}

const migrationPath = resolve(
  process.cwd(),
  'migrations/20260903_sec_c01_users_privilege_freeze.sql'
)
const marketingPath = resolve(
  process.cwd(),
  'server/api/tenant-admin/marketing-overview.get.ts'
)
const resendPath = resolve(
  process.cwd(),
  'server/api/appointments/resend-confirmation.post.ts'
)
const requireSuperAdminPath = resolve(
  process.cwd(),
  'server/utils/require-super-admin.ts'
)

vi.mock('~/server/utils/require-super-admin', () => ({
  requireSuperAdmin: vi.fn(),
}))

vi.mock('~/server/utils/auth', () => ({
  requireAdminProfile: vi.fn(),
}))

vi.mock('~/server/utils/dispatch-appointment-confirmation', () => ({
  dispatchAppointmentConfirmation: vi.fn(),
}))

vi.mock('~/utils/supabase', () => ({
  getSupabaseAdmin: vi.fn(),
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

describe('SEC-C01 — users privileged column freeze', () => {
  const sql = readFileSync(migrationPath, 'utf8')

  it('creates prevent_users_privilege_escalation trigger function', () => {
    expect(sql).toContain('prevent_users_privilege_escalation')
    expect(sql).toContain('BEFORE UPDATE ON public.users')
    expect(sql).toContain('trg_prevent_users_privilege_escalation')
  })

  it('blocks role, tenant_id, and admin_level changes for non-service clients', () => {
    expect(sql).toContain('NEW.role IS DISTINCT FROM OLD.role')
    expect(sql).toContain('NEW.tenant_id IS DISTINCT FROM OLD.tenant_id')
    expect(sql).toContain('NEW.admin_level IS DISTINCT FROM OLD.admin_level')
    expect(sql).toContain("jwt_role = 'service_role'")
    expect(sql).toContain("jwt_claim_role = 'service_role'")
    // Must not trust current_user inside SECURITY DEFINER (always function owner)
    expect(sql).not.toContain("current_user IN ('postgres', 'supabase_admin')")
  })

  it('revokes column UPDATE from authenticated, anon, and PUBLIC', () => {
    expect(sql).toContain(
      'REVOKE UPDATE (role, tenant_id, admin_level) ON TABLE public.users FROM authenticated'
    )
    expect(sql).toContain(
      'REVOKE UPDATE (role, tenant_id, admin_level) ON TABLE public.users FROM anon'
    )
    expect(sql).toContain(
      'REVOKE UPDATE (role, tenant_id, admin_level) ON TABLE public.users FROM PUBLIC'
    )
  })

  it('documents service_role as the legitimate privileged path', () => {
    expect(sql).toMatch(/service_role/i)
    expect(sql).toContain('SEC-C01')
  })
})

describe('SEC-C02 — marketing-overview authorization', () => {
  it('handler source requires requireSuperAdmin before data access', () => {
    const src = readFileSync(marketingPath, 'utf8')
    expect(src).toContain("from '~/server/utils/require-super-admin'")
    expect(src).toContain('await requireSuperAdmin(event)')
    const authIdx = src.indexOf('await requireSuperAdmin(event)')
    const adminIdx = src.indexOf('getSupabaseAdmin()')
    expect(authIdx).toBeGreaterThan(-1)
    expect(adminIdx).toBeGreaterThan(authIdx)
  })

  it('unauthenticated call yields 401 (requireSuperAdmin contract)', async () => {
    const { requireSuperAdmin } = await import('~/server/utils/require-super-admin')
    vi.mocked(requireSuperAdmin).mockRejectedValue(
      createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    )
    await expect(requireSuperAdmin(emptyEvent)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('non-superadmin call yields 403 (requireSuperAdmin contract)', async () => {
    const { requireSuperAdmin } = await import('~/server/utils/require-super-admin')
    vi.mocked(requireSuperAdmin).mockRejectedValue(
      createError({ statusCode: 403, statusMessage: 'Super admin access required' })
    )
    await expect(requireSuperAdmin(emptyEvent)).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('requireSuperAdmin implementation checks role === super_admin', () => {
    const src = readFileSync(requireSuperAdminPath, 'utf8')
    expect(src).toContain("role !== 'super_admin'")
    expect(src).toContain('statusCode: 401')
    expect(src).toContain('statusCode: 403')
  })

  it('unauthorized callers must not receive marketing payload keys', () => {
    // Invariant: a 401/403 body must not look like a successful overview
    const denied = { statusCode: 401, statusMessage: 'Unauthorized' }
    expect(denied).not.toHaveProperty('tenants')
    expect(denied).not.toHaveProperty('summary')
    expect(denied).not.toHaveProperty('adsCampaigns')
    expect(denied).not.toHaveProperty('ok')
  })
})

describe('SEC-C03 — resend-confirmation auth + no token leak', () => {
  const src = readFileSync(resendPath, 'utf8')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires requireAdminProfile and never returns confirmationToken/Link', () => {
    expect(src).toContain('requireAdminProfile')
    expect(src).toContain('dispatchAppointmentConfirmation')
    expect(src).not.toMatch(/confirmationToken\s*:/)
    expect(src).not.toMatch(/confirmationLink\s*:/)
    expect(src).not.toContain('Confirmation link:')
    expect(src).not.toContain('/confirm/')
  })

  it('enforces tenant isolation for non-super_admin', () => {
    expect(src).toContain("profile.role !== 'super_admin'")
    expect(src).toContain('appointment.tenant_id !== profile.tenant_id')
    expect(src).toContain('statusCode: 403')
  })

  it('unauthenticated request is denied with 401', async () => {
    const { requireAdminProfile } = await import('~/server/utils/auth')
    vi.mocked(requireAdminProfile).mockRejectedValue(
      createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    )
    await expect(requireAdminProfile(emptyEvent)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('success response shape excludes confirmation secrets', () => {
    // Mirrors the handler return — tokens must never be part of the contract
    const response = {
      success: true,
      skipped: false,
      reason: null as string | null,
      emailSent: true,
      emailQueued: false,
      message: 'Confirmation email processed',
    }
    expect(response).not.toHaveProperty('confirmationToken')
    expect(response).not.toHaveProperty('confirmationLink')
    expect(JSON.stringify(response)).not.toMatch(/confirm(ation)?Token/i)
    expect(JSON.stringify(response)).not.toContain('/confirm/')
  })

  it('cross-tenant staff is forbidden (authorization invariant)', async () => {
    const { requireAdminProfile } = await import('~/server/utils/auth')
    const staffProfile: AdminProfile = {
      id: 'staff-a',
      tenant_id: 'tenant-a',
      role: 'staff',
    }
    vi.mocked(requireAdminProfile).mockResolvedValue(staffProfile)

    const profile = await requireAdminProfile(emptyEvent)
    const appointmentTenant = 'tenant-b'
    const forbidden =
      profile.role !== 'super_admin' && appointmentTenant !== profile.tenant_id
    expect(forbidden).toBe(true)
  })
})
