import { describe, expect, it, vi } from 'vitest'
import {
  checkEmailAvailableForStaff,
  emailConflictMessage,
} from '../email-availability'
import { findAuthUserByEmail } from '../auth-email-claim'

describe('emailConflictMessage', () => {
  it('explains lookup failures without claiming the email is taken', () => {
    expect(emailConflictMessage({ available: false, reason: 'lookup_failed' })).toMatch(/nicht geprüft/)
    expect(emailConflictMessage({ available: false, reason: 'auth_exists' })).toMatch(/Auth registriert/)
  })
})

describe('checkEmailAvailableForStaff', () => {
  it('does not map auth lookup failure to auth_exists', async () => {
    const supabase = {
      from: () => {
        const chain: Record<string, unknown> = {}
        chain.select = () => chain
        chain.eq = () => chain
        chain.limit = async () => ({ data: [], error: null })
        return chain
      },
      rpc: async () => ({ data: null, error: { message: 'boom', code: '57014' } }),
    } as any

    const result = await checkEmailAvailableForStaff({
      supabase,
      email: 'staff@example.com',
      tenantId: 'tenant-1',
    })
    expect(result).toEqual({ available: false, reason: 'lookup_failed' })
  })
})

describe('findAuthUserByEmail', () => {
  it('uses the lookup RPC instead of getUserByEmail', async () => {
    const rpc = vi.fn(async () => ({ data: 'auth-123', error: null }))
    const supabase = {
      auth: {
        admin: {
          getUserByEmail: vi.fn(async () => {
            throw new Error('getUserByEmail must not be called')
          }),
        },
      },
      rpc,
    } as any

    await expect(findAuthUserByEmail(supabase, 'Info@Example.com')).resolves.toEqual({
      ok: true,
      user: { id: 'auth-123' },
    })
    expect(rpc).toHaveBeenCalledWith('lookup_auth_user_id_by_email', { p_email: 'info@example.com' })
    expect(supabase.auth.admin.getUserByEmail).not.toHaveBeenCalled()
  })

  it('returns null user when RPC finds nothing', async () => {
    const supabase = {
      auth: { admin: { getUserByEmail: vi.fn() } },
      rpc: async () => ({ data: null, error: null }),
    } as any

    await expect(findAuthUserByEmail(supabase, 'free@example.com')).resolves.toEqual({
      ok: true,
      user: null,
    })
  })
})
