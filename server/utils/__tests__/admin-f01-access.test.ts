import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('~/server/utils/auth', () => ({
  getAuthenticatedUser: vi.fn(),
}))

type QueryResult = { data: Array<{ id: string }> | null; error: null }

function mockSupabaseReturning(rows: Array<{ id: string }>): SupabaseClient {
  const result: QueryResult = { data: rows, error: null }
  return {
    from: () => ({
      select: () => ({
        in: () => ({
          eq: async () => result,
        }),
      }),
    }),
  } as unknown as SupabaseClient
}

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
      await expect(
        assertUsersBelongToTenant(mockSupabaseReturning([{ id: 'u1' }]), ['u1', 'u2'], 'tenant-a')
      ).rejects.toMatchObject({ statusCode: 403 })
    })

    it('returns verified ids when all belong to tenant', async () => {
      const { assertUsersBelongToTenant } = await import('../admin-f01-access')
      await expect(
        assertUsersBelongToTenant(
          mockSupabaseReturning([{ id: 'u1' }, { id: 'u2' }]),
          ['u1', 'u2', 'u1'],
          'tenant-a'
        )
      ).resolves.toEqual(['u1', 'u2'])
    })
  })
})

describe('requireSuperAdmin (existing helper used by F-01)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    const auth = await import('~/server/utils/auth')
    vi.mocked(auth.getAuthenticatedUser).mockResolvedValue(null)
    const { requireSuperAdmin } = await import('../require-super-admin')
    await expect(requireSuperAdmin({} as never)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('returns 403 for non-super_admin roles', async () => {
    const auth = await import('~/server/utils/auth')
    vi.mocked(auth.getAuthenticatedUser).mockResolvedValue({
      id: 'auth-1',
      role: 'admin',
      tenant_id: 't1',
    } as never)
    const { requireSuperAdmin } = await import('../require-super-admin')
    await expect(requireSuperAdmin({} as never)).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('allows super_admin', async () => {
    const auth = await import('~/server/utils/auth')
    vi.mocked(auth.getAuthenticatedUser).mockResolvedValue({
      id: 'auth-1',
      role: 'super_admin',
    } as never)
    const { requireSuperAdmin } = await import('../require-super-admin')
    await expect(requireSuperAdmin({} as never)).resolves.toMatchObject({
      role: 'super_admin',
      id: 'auth-1',
    })
  })
})
