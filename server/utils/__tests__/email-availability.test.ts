import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  checkEmailAvailableForStaff,
  emailConflictMessage,
} from '../email-availability'
import { findAuthUserByEmail } from '../auth-email-claim'

function mockStaffAvailabilityClient(opts: {
  existingRows?: Array<{ id: string; role: string }>
  rpcData?: string | null
  rpcError?: { message: string; code?: string } | null
}): SupabaseClient {
  const chain = {
    select: () => chain,
    eq: () => chain,
    limit: async () => ({ data: opts.existingRows ?? [], error: null }),
  }
  return {
    from: () => chain,
    rpc: async () => ({
      data: opts.rpcError ? null : (opts.rpcData ?? null),
      error: opts.rpcError ?? null,
    }),
  } as unknown as SupabaseClient
}

describe('emailConflictMessage', () => {
  it('explains lookup failures without claiming the email is taken', () => {
    expect(emailConflictMessage({ available: false, reason: 'lookup_failed' })).toMatch(/nicht geprüft/)
    expect(emailConflictMessage({ available: false, reason: 'auth_exists' })).toMatch(/Login verknüpft/)
    expect(emailConflictMessage({ available: false, reason: 'auth_exists' })).not.toMatch(/\bAuth\b/)
  })
})

describe('checkEmailAvailableForStaff', () => {
  it('does not map auth lookup failure to auth_exists', async () => {
    const result = await checkEmailAvailableForStaff({
      supabase: mockStaffAvailabilityClient({
        rpcError: { message: 'boom', code: '57014' },
      }),
      email: 'staff@example.com',
      tenantId: 'tenant-1',
    })
    expect(result).toEqual({ available: false, reason: 'lookup_failed' })
  })
})

describe('findAuthUserByEmail', () => {
  it('uses the lookup RPC instead of getUserByEmail', async () => {
    const rpc = vi.fn(async () => ({ data: 'auth-123', error: null }))
    const getUserByEmail = vi.fn(async () => {
      throw new Error('getUserByEmail must not be called')
    })
    const supabase = {
      auth: { admin: { getUserByEmail } },
      rpc,
    } as unknown as SupabaseClient

    await expect(findAuthUserByEmail(supabase, 'Info@Example.com')).resolves.toEqual({
      ok: true,
      user: { id: 'auth-123' },
    })
    expect(rpc).toHaveBeenCalledWith('lookup_auth_user_id_by_email', { p_email: 'info@example.com' })
    expect(getUserByEmail).not.toHaveBeenCalled()
  })

  it('returns null user when RPC finds nothing', async () => {
    const supabase = {
      auth: { admin: { getUserByEmail: vi.fn() } },
      rpc: async () => ({ data: null, error: null }),
    } as unknown as SupabaseClient

    await expect(findAuthUserByEmail(supabase, 'free@example.com')).resolves.toEqual({
      ok: true,
      user: null,
    })
  })

  it('fails closed when the RPC errors', async () => {
    const supabase = {
      rpc: async () => ({ data: null, error: { message: 'timeout', code: '57014' } }),
    } as unknown as SupabaseClient

    await expect(findAuthUserByEmail(supabase, 'x@example.com')).resolves.toEqual({ ok: false })
  })
})
