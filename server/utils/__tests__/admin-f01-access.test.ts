import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createError } from 'h3'

vi.mock('~/server/utils/auth', () => ({
  getAuthenticatedUser: vi.fn(),
}))

describe('admin-f01-access', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe('normalizeIdList', () => {
    it('rejects empty or non-array input', async () => {
      const { normalizeIdList } = await import('../admin-f01-access')
      expect(() => normalizeIdList(null, 'studentIds')).toThrow()
      expect(() => normalizeIdList([], 'studentIds')).toThrow()
      expect(() => normalizeIdList(['', '  '], 'studentIds')).toThrow()
    })

    it('returns non-empty string ids', async () => {
      const { normalizeIdList } = await import('../admin-f01-access')
      expect(normalizeIdList(['a', 'b', 1, ''], 'studentIds')).toEqual(['a', 'b'])
    })
  })

  describe('assertUsersBelongToTenant', () => {
    it('throws 403 when any user is outside the tenant', async () => {
      const { assertUsersBelongToTenant } = await import('../admin-f01-access')
      const supabase = {
        from: () => ({
          select: () => ({
            in: () => ({
              eq: async () => ({ data: [{ id: 'u1' }], error: null }),
            }),
          }),
        }),
      } as any

      await expect(
        assertUsersBelongToTenant(supabase, ['u1', 'u2'], 'tenant-a')
      ).rejects.toMatchObject({ statusCode: 403 })
    })

    it('returns verified ids when all belong to tenant', async () => {
      const { assertUsersBelongToTenant } = await import('../admin-f01-access')
      const supabase = {
        from: () => ({
          select: () => ({
            in: () => ({
              eq: async () => ({
                data: [{ id: 'u1' }, { id: 'u2' }],
                error: null,
              }),
            }),
          }),
        }),
      } as any

      await expect(
        assertUsersBelongToTenant(supabase, ['u1', 'u2', 'u1'], 'tenant-a')
      ).resolves.toEqual(['u1', 'u2'])
    })
  })

  describe('requireSuperAdmin', () => {
    it('returns 401 when unauthenticated', async () => {
      const { getAuthenticatedUser } = await import('~/server/utils/auth')
      vi.mocked(getAuthenticatedUser).mockResolvedValue(null as any)
      const { requireSuperAdmin } = await import('../admin-f01-access')
      await expect(requireSuperAdmin({} as any)).rejects.toMatchObject({
        statusCode: 401,
      })
    })

    it('returns 403 for non-super_admin roles', async () => {
      const { getAuthenticatedUser } = await import('~/server/utils/auth')
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        id: 'auth-1',
        role: 'admin',
        tenant_id: 't1',
        db_user_id: 'u1',
      } as any)
      const { requireSuperAdmin } = await import('../admin-f01-access')
      await expect(requireSuperAdmin({} as any)).rejects.toMatchObject({
        statusCode: 403,
      })
    })

    it('allows super_admin', async () => {
      const { getAuthenticatedUser } = await import('~/server/utils/auth')
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        id: 'auth-1',
        role: 'super_admin',
        tenant_id: null,
        db_user_id: 'u1',
      } as any)
      const { requireSuperAdmin } = await import('../admin-f01-access')
      await expect(requireSuperAdmin({} as any)).resolves.toMatchObject({
        role: 'super_admin',
        auth_user_id: 'auth-1',
      })
    })
  })
})

// silence unused import lint in some setups
void createError
