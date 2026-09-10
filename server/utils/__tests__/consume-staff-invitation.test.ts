/**
 * Atomic staff-invitation consume.
 *
 * The mock applies compare-and-swap synchronously inside maybeSingle so two
 * overlapping awaits cannot both observe pending. That matches Postgres
 * UPDATE ... WHERE status = 'pending' RETURNING semantics.
 *
 * REAL DB CONCURRENCY — NOT VERIFIED
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  consumePendingStaffInvitation,
  releaseStaffInvitationClaim,
} from '../consume-staff-invitation'

const TOKEN = 'test-invite-token-aaaaaaaaaaaaaa'
const CLAIMED_AT = '2026-09-10T08:00:00.000Z'
const EXPIRES_AT = '2026-10-09T14:35:01.372Z'

type InvitationRow = {
  id: string
  tenant_id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  link_to_admin: boolean
  invited_by: string
  invitation_token: string
  status: 'pending' | 'accepted'
  expires_at: string
  accepted_at: string | null
}

function seedInvitation(overrides: Partial<InvitationRow> = {}): InvitationRow {
  return {
    id: 'inv-1',
    tenant_id: 'tenant-a',
    first_name: 'Tiago',
    last_name: 'Balli',
    email: 'staff@example.com',
    phone: '+41790000000',
    link_to_admin: false,
    invited_by: 'admin-1',
    invitation_token: TOKEN,
    status: 'pending',
    expires_at: EXPIRES_AT,
    accepted_at: null,
    ...overrides,
  }
}

function createCasClient(store: InvitationRow) {
  const from = (table: string) => {
    if (table !== 'staff_invitations') {
      throw new Error(`unexpected table ${table}`)
    }
    const patch: Record<string, unknown> = {}
    const eq: Record<string, unknown> = {}
    let gtExpiresAt: string | undefined
    const builder: Record<string, unknown> = {}
    const self = () => builder

    builder.update = (values: Record<string, unknown>) => {
      Object.assign(patch, values)
      return self()
    }
    builder.eq = (col: string, val: unknown) => {
      eq[col] = val
      return self()
    }
    builder.gt = (col: string, val: unknown) => {
      if (col === 'expires_at') gtExpiresAt = String(val)
      return self()
    }
    builder.select = () => self()
    const applyConsume = () => {
      const tokenOk = eq.invitation_token === store.invitation_token
      const pendingOk = eq.status === 'pending' && store.status === 'pending'
      const expiryOk = typeof gtExpiresAt === 'string' && store.expires_at > gtExpiresAt
      if (!tokenOk || !pendingOk || !expiryOk) {
        return { data: null, error: null }
      }
      store.status = 'accepted'
      store.accepted_at = String(patch.accepted_at || CLAIMED_AT)
      return {
        data: {
          id: store.id,
          tenant_id: store.tenant_id,
          first_name: store.first_name,
          last_name: store.last_name,
          email: store.email,
          phone: store.phone,
          link_to_admin: store.link_to_admin,
          invited_by: store.invited_by,
          accepted_at: store.accepted_at,
        },
        error: null,
      }
    }
    const applyRelease = () => {
      const idOk = eq.id === store.id
      const acceptedOk = eq.status === 'accepted' && store.status === 'accepted'
      const claimedOk = eq.accepted_at === store.accepted_at
      if (idOk && acceptedOk && claimedOk) {
        store.status = 'pending'
        store.accepted_at = null
      }
      return { data: null, error: null }
    }
    builder.maybeSingle = async () => applyConsume()
    builder.then = (
      onFulfilled: (value: { data: unknown; error: unknown }) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(applyRelease()).then(onFulfilled, onRejected)

    return builder
  }

  return { from }
}

describe('consumePendingStaffInvitation source contract', () => {
  const src = readFileSync(resolve(process.cwd(), 'server/utils/consume-staff-invitation.ts'), 'utf8')

  it('uses a guarded pending → accepted update (CAS)', () => {
    expect(src).toContain("status: 'accepted'")
    expect(src).toContain(".eq('invitation_token', token)")
    expect(src).toContain(".eq('status', 'pending')")
    expect(src).toContain(".gt('expires_at', claimedAt)")
    expect(src).toContain('.maybeSingle()')
    expect(src).not.toMatch(/\.like\s*\(/)
    expect(src).not.toMatch(/\.ilike\s*\(/)
  })

  it('does not return invitation_token from the consumed row', () => {
    expect(src).not.toMatch(/select\([^)]*invitation_token/)
  })

  it('releases only this claim (id + accepted + accepted_at)', () => {
    expect(src).toContain("status: 'pending'")
    expect(src).toContain(".eq('id', invitationId)")
    expect(src).toContain(".eq('status', 'accepted')")
    expect(src).toContain(".eq('accepted_at', claimedAt)")
  })
})

describe('consumePendingStaffInvitation CAS', () => {
  it('consumes a valid pending unexpired invitation once', async () => {
    const store = seedInvitation()
    const first = await consumePendingStaffInvitation(createCasClient(store), TOKEN, CLAIMED_AT)
    expect(first?.id).toBe('inv-1')
    expect(first?.tenant_id).toBe('tenant-a')
    expect(first).not.toHaveProperty('invitation_token')
    expect(store.status).toBe('accepted')
    expect(store.accepted_at).toBe(CLAIMED_AT)

    const replay = await consumePendingStaffInvitation(createCasClient(store), TOKEN, CLAIMED_AT)
    expect(first).toBeTruthy()
    expect(replay).toBeNull()
    expect(store.status).toBe('accepted')
  })

  it('rejects an unknown token', async () => {
    const store = seedInvitation()
    const result = await consumePendingStaffInvitation(createCasClient(store), 'not-the-token', CLAIMED_AT)
    expect(result).toBeNull()
    expect(store.status).toBe('pending')
  })

  it('rejects an expired invitation', async () => {
    const store = seedInvitation({ expires_at: '2020-01-01T00:00:00.000Z' })
    const result = await consumePendingStaffInvitation(createCasClient(store), TOKEN, CLAIMED_AT)
    expect(result).toBeNull()
    expect(store.status).toBe('pending')
  })

  it('rejects an already accepted invitation', async () => {
    const store = seedInvitation({ status: 'accepted', accepted_at: '2026-09-01T00:00:00.000Z' })
    const result = await consumePendingStaffInvitation(createCasClient(store), TOKEN, CLAIMED_AT)
    expect(result).toBeNull()
    expect(store.status).toBe('accepted')
  })

  it('allows at most one concurrent consume of the same invitation', async () => {
    const store = seedInvitation()
    const client = createCasClient(store)

    const results = await Promise.all(
      Array.from({ length: 8 }, () => consumePendingStaffInvitation(client, TOKEN, CLAIMED_AT)),
    )

    const successes = results.filter(Boolean)
    const rejected = results.filter(row => row === null)
    expect(successes).toHaveLength(1)
    expect(rejected).toHaveLength(7)
    expect(store.status).toBe('accepted')
    expect(successes[0]?.id).toBe('inv-1')
  })
})

describe('releaseStaffInvitationClaim', () => {
  it('restores pending only for this accepted_at claim', async () => {
    const store = seedInvitation({ status: 'accepted', accepted_at: CLAIMED_AT })
    await releaseStaffInvitationClaim(createCasClient(store), store.id, CLAIMED_AT)
    expect(store.status).toBe('pending')
    expect(store.accepted_at).toBeNull()
  })

  it('does not release a different claim', async () => {
    const store = seedInvitation({ status: 'accepted', accepted_at: '2026-09-10T09:00:00.000Z' })
    await releaseStaffInvitationClaim(createCasClient(store), store.id, CLAIMED_AT)
    expect(store.status).toBe('accepted')
    expect(store.accepted_at).toBe('2026-09-10T09:00:00.000Z')
  })
})
