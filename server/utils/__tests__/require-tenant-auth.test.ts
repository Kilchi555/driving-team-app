import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createError } from 'h3'
import type { H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('~/server/utils/auth', () => ({
  getAuthenticatedUser: vi.fn(),
  requireAdminProfile: vi.fn(),
}))

const emptyEvent = {} as H3Event

function statusOf(err: unknown): number | undefined {
  return (err as { statusCode?: number })?.statusCode
}

function userRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'staff-1',
    tenant_id: 'tenant-a',
    role: 'staff',
    is_active: true,
    deleted_at: null,
    ...overrides,
  }
}

function mockUserLookup(row: Record<string, unknown> | null, error: unknown = null): SupabaseClient {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: row, error }),
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient
}

describe('require-tenant-auth', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe('requireAuthenticatedUser', () => {
    it('returns 401 when there is no session', async () => {
      const auth = await import('~/server/utils/auth')
      vi.mocked(auth.getAuthenticatedUser).mockResolvedValue(null)
      const { requireAuthenticatedUser } = await import('../require-tenant-auth')
      await expect(requireAuthenticatedUser(emptyEvent)).rejects.toMatchObject({ statusCode: 401 })
    })

    it('returns the session user when authenticated', async () => {
      const auth = await import('~/server/utils/auth')
      const session = { id: 'auth-1', email: 'a@example.com' }
      vi.mocked(auth.getAuthenticatedUser).mockResolvedValue(session as never)
      const { requireAuthenticatedUser } = await import('../require-tenant-auth')
      await expect(requireAuthenticatedUser(emptyEvent)).resolves.toEqual(session)
    })
  })

  describe('requireTenantActor', () => {
    it('returns 401 when unauthenticated', async () => {
      const auth = await import('~/server/utils/auth')
      vi.mocked(auth.getAuthenticatedUser).mockResolvedValue(null)
      const { requireTenantActor } = await import('../require-tenant-auth')
      await expect(requireTenantActor(emptyEvent)).rejects.toMatchObject({ statusCode: 401 })
    })

    it('returns 403 when the session has no tenant-bound DB user', async () => {
      const auth = await import('~/server/utils/auth')
      vi.mocked(auth.getAuthenticatedUser).mockResolvedValue({
        id: 'auth-1',
        role: '',
        tenant_id: '',
      } as never)
      const { requireTenantActor } = await import('../require-tenant-auth')
      await expect(requireTenantActor(emptyEvent)).rejects.toMatchObject({ statusCode: 403 })
    })

    it('returns 403 for inactive accounts', async () => {
      const auth = await import('~/server/utils/auth')
      vi.mocked(auth.getAuthenticatedUser).mockResolvedValue({
        id: 'auth-1',
        db_user_id: 'u1',
        tenant_id: 'tenant-a',
        role: 'staff',
        is_active: false,
      } as never)
      const { requireTenantActor } = await import('../require-tenant-auth')
      await expect(requireTenantActor(emptyEvent)).rejects.toMatchObject({ statusCode: 403 })
    })

    it('returns the tenant actor for an active staff user', async () => {
      const auth = await import('~/server/utils/auth')
      vi.mocked(auth.getAuthenticatedUser).mockResolvedValue({
        id: 'auth-1',
        db_user_id: 'u1',
        tenant_id: 'tenant-a',
        role: 'staff',
        email: 'staff@example.com',
        is_active: true,
      } as never)
      const { requireTenantActor } = await import('../require-tenant-auth')
      await expect(requireTenantActor(emptyEvent)).resolves.toMatchObject({
        id: 'u1',
        tenant_id: 'tenant-a',
        role: 'staff',
        auth_user_id: 'auth-1',
      })
    })
  })

  describe('requireTenantStaff / requireTenantAdmin', () => {
    it('delegates staff access to requireAdminProfile with staff-capable roles', async () => {
      const auth = await import('~/server/utils/auth')
      const profile = { id: 'u1', tenant_id: 'tenant-a', role: 'staff', email: '', auth_user_id: 'a1' }
      vi.mocked(auth.requireAdminProfile).mockResolvedValue(profile)
      const { requireTenantStaff } = await import('../require-tenant-auth')
      await expect(requireTenantStaff(emptyEvent)).resolves.toEqual(profile)
      expect(auth.requireAdminProfile).toHaveBeenCalledWith(
        emptyEvent,
        expect.arrayContaining(['admin', 'staff', 'super_admin', 'tenant_admin']),
      )
    })

    it('delegates tenant admin access without the staff role', async () => {
      const auth = await import('~/server/utils/auth')
      const profile = { id: 'u1', tenant_id: 'tenant-a', role: 'admin', email: '', auth_user_id: 'a1' }
      vi.mocked(auth.requireAdminProfile).mockResolvedValue(profile)
      const { requireTenantAdmin } = await import('../require-tenant-auth')
      await expect(requireTenantAdmin(emptyEvent)).resolves.toEqual(profile)
      expect(auth.requireAdminProfile).toHaveBeenCalledWith(
        emptyEvent,
        ['admin', 'tenant_admin', 'super_admin'],
      )
    })
  })

  describe('assertSameTenant / assertSelfOrTenantAdmin', () => {
    it('forbids missing or foreign tenant ids', async () => {
      const { assertSameTenant } = await import('../require-tenant-auth')
      expect(() => assertSameTenant(null, 'tenant-a')).toThrow()
      expect(statusOf(createThrown(() => assertSameTenant('tenant-b', 'tenant-a')))).toBe(403)
    })

    it('allows the same tenant', async () => {
      const { assertSameTenant } = await import('../require-tenant-auth')
      expect(() => assertSameTenant('tenant-a', 'tenant-a')).not.toThrow()
    })

    it('lets staff act only on themselves', async () => {
      const { assertSelfOrTenantAdmin } = await import('../require-tenant-auth')
      const staff = { id: 's1', tenant_id: 't1', role: 'staff', email: '', auth_user_id: 'a1' }
      expect(() => assertSelfOrTenantAdmin(staff, 's1')).not.toThrow()
      expect(statusOf(createThrown(() => assertSelfOrTenantAdmin(staff, 's2')))).toBe(403)
    })

    it('lets admin and tenant_admin act on other staff in-session', async () => {
      const { assertSelfOrTenantAdmin } = await import('../require-tenant-auth')
      const admin = { id: 'a1', tenant_id: 't1', role: 'admin', email: '', auth_user_id: 'auth' }
      expect(() => assertSelfOrTenantAdmin(admin, 's2')).not.toThrow()
    })
  })

  describe('loadUserInTenant / loadStaffInTenant', () => {
    it('returns 403 when the user is in another tenant or missing', async () => {
      const { loadUserInTenant } = await import('../require-tenant-auth')
      await expect(loadUserInTenant(mockUserLookup(null), 'u1', 'tenant-a')).rejects.toMatchObject({
        statusCode: 403,
      })
    })

    it('returns 403 for inactive users unless allowInactive is set', async () => {
      const { loadUserInTenant } = await import('../require-tenant-auth')
      const inactive = userRow({ is_active: false })
      await expect(loadUserInTenant(mockUserLookup(inactive), 'staff-1', 'tenant-a')).rejects.toMatchObject({
        statusCode: 403,
      })
      await expect(
        loadUserInTenant(mockUserLookup(inactive), 'staff-1', 'tenant-a', { allowInactive: true }),
      ).resolves.toMatchObject({ id: 'staff-1' })
    })

    it('returns 403 when a client UUID is used as a staff resource', async () => {
      const { loadStaffInTenant } = await import('../require-tenant-auth')
      await expect(
        loadStaffInTenant(mockUserLookup(userRow({ role: 'client' })), 'c1', 'tenant-a'),
      ).rejects.toMatchObject({ statusCode: 403 })
    })

    it('returns the staff row when role and tenant match', async () => {
      const { loadStaffInTenant } = await import('../require-tenant-auth')
      await expect(
        loadStaffInTenant(mockUserLookup(userRow()), 'staff-1', 'tenant-a'),
      ).resolves.toMatchObject({ id: 'staff-1', role: 'staff' })
    })
  })
})

function createThrown(fn: () => void): unknown {
  try {
    fn()
    throw createError({ statusCode: 500, statusMessage: 'expected throw' })
  } catch (err) {
    return err
  }
}
