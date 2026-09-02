import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('~/server/utils/auth', () => ({
  getAuthenticatedUser: vi.fn(),
}))

type QueryResult = { data: Array<{ id: string }> | null; error: null }

function mockSupabaseReturning(rows: Array<{ id: string }>): SupabaseClient {
  const byId = new Map(rows.map((row) => [row.id, row]))
  return {
    from: () => ({
      select: () => ({
        in: (_column: string, ids: string[]) => ({
          eq: async () => {
            const data = ids.map((id) => byId.get(id)).filter(Boolean) as Array<{ id: string }>
            const result: QueryResult = { data, error: null }
            return result
          },
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

  describe('chunkIds', () => {
    it('splits lists into fixed-size chunks', async () => {
      const { chunkIds } = await import('../admin-f01-access')
      expect(chunkIds(['a', 'b', 'c', 'd', 'e'], 2)).toEqual([
        ['a', 'b'],
        ['c', 'd'],
        ['e'],
      ])
      expect(chunkIds(['a'], 200)).toEqual([['a']])
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

    it('accepts more than 500 ids by chunking membership checks', async () => {
      const { assertUsersBelongToTenant, IN_QUERY_CHUNK } = await import('../admin-f01-access')
      const ids = Array.from({ length: 501 }, (_, i) => `u${i}`)
      const rows = ids.map((id) => ({ id }))
      await expect(
        assertUsersBelongToTenant(mockSupabaseReturning(rows), ids, 'tenant-a')
      ).resolves.toEqual(ids)
      expect(ids.length).toBeGreaterThan(IN_QUERY_CHUNK)
    })

    it('rejects payloads above the absolute max', async () => {
      const { assertUsersBelongToTenant, MAX_USER_IDS } = await import('../admin-f01-access')
      const ids = Array.from({ length: MAX_USER_IDS + 1 }, (_, i) => `u${i}`)
      await expect(
        assertUsersBelongToTenant(mockSupabaseReturning([]), ids, 'tenant-a')
      ).rejects.toMatchObject({ statusCode: 400 })
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
