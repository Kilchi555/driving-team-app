import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { hashPreviewToken, generatePreviewToken } from '../website-preview-access'
import { CLAIM_REJECTION, prospectClaimBlockReason } from '../website-prospect-guard'
import { claimWebsiteProspect, prepareProspectClaim, type ClaimDb } from '../website-prospect-claim'

type Row = Record<string, unknown>
const PASSWORD = 'correct-horse-battery'
const TENANT_A = 'tenant-a'
const TENANT_B = 'tenant-b'
const NOW = new Date('2026-09-29T08:00:00.000Z')

function readRepo(rel: string) {
  return readFileSync(resolve(process.cwd(), rel), 'utf8')
}

function createAuth() {
  const users: Array<{ id: string; email: string; metadataTenant: string }> = []
  let seq = 0
  const control = {
    users,
    createCalls: 0,
    deleteCalls: 0,
    failCreate: false,
    failDelete: false,
    exists: false,
    gate: null as Promise<void> | null,
  }
  return {
    control,
    admin: {
      createUser: async (args: { email: string; password: string; user_metadata: { tenant_id: string } }) => {
        control.createCalls += 1
        if (control.gate) await control.gate
        if (control.failCreate) return { data: null, error: { message: 'auth down' } }
        if (control.exists || users.some((user) => user.email === args.email)) {
          return { data: null, error: { message: 'exists', code: 'email_exists', status: 422 } }
        }
        seq += 1
        const user = { id: `auth-${seq}`, email: args.email, metadataTenant: args.user_metadata.tenant_id }
        users.push(user)
        return { data: { user: { id: user.id } }, error: null }
      },
      deleteUser: async (id: string) => {
        control.deleteCalls += 1
        if (control.failDelete) return { error: { message: 'delete failed' } }
        const index = users.findIndex((user) => user.id === id)
        if (index >= 0) users.splice(index, 1)
        return { error: null }
      },
    },
  }
}

function createDb() {
  const tokenA = generatePreviewToken()
  const tokenB = generatePreviewToken()
  const expires = new Date(NOW.getTime() + 72 * 60 * 60 * 1000).toISOString()
  const tables: Record<string, Row[]> = {
    website_prospects: [
      {
        id: 'prospect-a',
        name: 'Fahrschule Beispiel',
        tenant_id: TENANT_A,
        website_id: 'website-a',
        claim_token_hash: hashPreviewToken(tokenA),
        claim_token_expires_at: expires,
        claim_reserved_until: null,
        claimed_at: null,
        preview_token: null,
        status: 'review',
      },
      {
        id: 'prospect-b',
        name: 'Andere Schule',
        tenant_id: TENANT_B,
        website_id: 'website-b',
        claim_token_hash: hashPreviewToken(tokenB),
        claim_token_expires_at: expires,
        claim_reserved_until: null,
        claimed_at: null,
        preview_token: null,
        status: 'review',
      },
    ],
    tenants: [
      { id: TENANT_A, website_only: true },
      { id: TENANT_B, website_only: true },
    ],
    users: [],
  }
  const auth = createAuth()
  const tenantInserts: Row[] = []
  const websiteInserts: Row[] = []

  function matches(row: Row, filters: Array<{ col: string; val: unknown; op: 'eq' | 'is' }>) {
    return filters.every((filter) => {
      if (filter.op === 'is') return row[filter.col] == null
      return row[filter.col] === filter.val
    })
  }

  function run(table: string, op: 'update' | 'insert' | 'select', payload?: Row) {
    const filters: Array<{ col: string; val: unknown; op: 'eq' | 'is' }> = []
    const finish = (single: boolean) => {
      const rows = tables[table] || []
      if (op === 'insert') {
        const row = { id: `row-${rows.length + 1}`, ...(payload || {}) }
        rows.push(row)
        if (table === 'tenants') tenantInserts.push(row)
        if (table === 'website_tenants') websiteInserts.push(row)
        return { data: single ? row : [row], error: null }
      }
      const matched = rows.filter((row) => matches(row, filters))
      if (op === 'update') {
        for (const row of matched) Object.assign(row, payload)
        return { data: matched.map((row) => ({ ...row })), error: null }
      }
      return { data: single ? (matched[0] ? { ...matched[0] } : null) : matched.map((row) => ({ ...row })), error: null }
    }
    const builder = {
      eq(col: string, val: unknown) { filters.push({ col, val, op: 'eq' }); return builder },
      is(col: string, val: null) { filters.push({ col, val, op: 'is' }); return builder },
      select() { return builder },
      limit() { return builder },
      maybeSingle() { return Promise.resolve(finish(true)) },
      single() { return Promise.resolve(finish(true)) },
      then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
        return Promise.resolve(finish(false)).then(resolve, reject)
      },
    }
    return builder
  }

  function reserve(hash: string, nowIso: string) {
    const row = tables.website_prospects.find((item) => item.claim_token_hash === hash)
    if (!row) return []
    if (row.claimed_at) return []
    if (String(row.claim_token_expires_at || '') <= nowIso) return []
    if (row.claim_reserved_until && String(row.claim_reserved_until) >= nowIso) return []
    row.claim_reserved_until = new Date(Date.parse(nowIso) + 10 * 60 * 1000).toISOString()
    return [{ id: row.id, tenant_id: row.tenant_id, website_id: row.website_id }]
  }

  const db = {
    tables,
    auth,
    tokenA,
    tokenB,
    tenantInserts,
    websiteInserts,
    rpc: async (fn: string, args: Record<string, unknown>) => {
      const nowIso = String(args.p_now || '')
      if (fn === 'reserve_website_prospect_claim') {
        return { data: reserve(String(args.p_token_hash || ''), nowIso), error: null }
      }
      const row = tables.website_prospects.find((item) => item.id === args.p_prospect_id)
      if (!row || row.claimed_at) return { data: [], error: null }
      if (fn === 'commit_website_prospect_claim') {
        if (!row.claim_reserved_until || String(row.claim_reserved_until) < nowIso) return { data: [], error: null }
        row.claimed_at = nowIso
        row.status = 'claimed'
        row.claim_reserved_until = null
        return { data: [{ id: row.id }], error: null }
      }
      if (fn === 'release_website_prospect_claim') {
        row.claim_reserved_until = null
        return { data: [{ id: row.id }], error: null }
      }
      return { data: null, error: { message: 'unknown rpc' } }
    },
    from(table: string) {
      return {
        update: (values: Row) => run(table, 'update', values),
        insert: (values: Row) => run(table, 'insert', values),
        select: () => run(table, 'select'),
      }
    },
  }
  return db
}

function claim(db: ReturnType<typeof createDb>, overrides: Record<string, unknown> = {}) {
  return claimWebsiteProspect(db as unknown as ClaimDb, {
    token: String(overrides.token ?? db.tokenA),
    email: String(overrides.email ?? 'owner@example.com'),
    password: String(overrides.password ?? PASSWORD),
    passwordConfirm: String(overrides.passwordConfirm ?? overrides.password ?? PASSWORD),
    now: (overrides.now as Date | undefined) ?? NOW,
  })
}

async function statusOf(run: Promise<unknown>) {
  try {
    await run
    return { statusCode: 200, statusMessage: '' }
  } catch (error) {
    const err = error as { statusCode?: number; statusMessage?: string; message?: string }
    return { statusCode: err.statusCode || 0, statusMessage: err.message || err.statusMessage || '' }
  }
}

describe('public prospect claim', () => {
  it('claims the existing prospect tenant once', async () => {
    const db = createDb()
    const result = await claim(db)
    expect(result).toEqual({ success: true, redirect: '/login' })
    const prospect = db.tables.website_prospects[0]
    expect(prospect.claimed_at).toBe(NOW.toISOString())
    expect(prospect.status).toBe('claimed')
    expect(prospect.claim_reserved_until).toBeNull()
    expect(db.tables.users).toHaveLength(1)
    expect(db.tables.users[0].tenant_id).toBe(TENANT_A)
    expect(db.tables.users[0].is_primary_admin).toBe(true)
    expect(db.auth.control.users[0].metadataTenant).toBe(TENANT_A)
    expect(db.tenantInserts).toHaveLength(0)
    expect(db.websiteInserts).toHaveLength(0)
    expect(db.tables.tenants).toHaveLength(2)
  })

  it('rejects a wrong token, an expired token, and a used token with the same message', async () => {
    const wrong = createDb()
    const wrongResult = await statusOf(claim(wrong, { token: generatePreviewToken() }))
    expect(wrongResult).toMatchObject({ statusCode: 400, statusMessage: CLAIM_REJECTION })
    expect(wrong.auth.control.createCalls).toBe(0)
    expect(wrong.tables.website_prospects[0].claimed_at).toBeNull()

    const expired = createDb()
    expired.tables.website_prospects[0].claim_token_expires_at = '2026-09-28T00:00:00.000Z'
    const expiredResult = await statusOf(claim(expired))
    expect(expiredResult.statusMessage).toBe(CLAIM_REJECTION)
    expect(expired.tables.users).toHaveLength(0)

    const used = createDb()
    used.tables.website_prospects[0].claimed_at = '2026-09-01T00:00:00.000Z'
    const usedResult = await statusOf(claim(used))
    expect(usedResult.statusMessage).toBe(CLAIM_REJECTION)
    expect(used.auth.control.createCalls).toBe(0)
  })

  it('lets one of two identical claims win', async () => {
    const db = createDb()
    let release = () => {}
    db.auth.control.gate = new Promise<void>((resolve) => { release = resolve })
    const first = claim(db)
    await vi.waitFor(() => {
      expect(db.tables.website_prospects[0].claim_reserved_until).toBeTruthy()
    })
    const second = await statusOf(claim(db))
    expect(second.statusMessage).toBe(CLAIM_REJECTION)
    release()
    await first
    const replay = await statusOf(claim(db))
    expect(replay.statusMessage).toBe(CLAIM_REJECTION)
    expect(db.tables.users).toHaveLength(1)
    expect(db.auth.control.users).toHaveLength(1)
    expect(db.tenantInserts).toHaveLength(0)
    expect(db.tables.website_prospects[0].status).toBe('claimed')
  })

  it('does not let prospect A claim prospect B or choose a tenant', async () => {
    const db = createDb()
    const result = await claimWebsiteProspect(db as unknown as ClaimDb, {
      token: db.tokenA,
      email: 'owner@example.com',
      password: PASSWORD,
      passwordConfirm: PASSWORD,
      now: NOW,
      prospect_id: 'prospect-b',
      tenant_id: TENANT_B,
      website_id: 'website-b',
      user_id: 'user-spoof',
    } as Parameters<typeof claimWebsiteProspect>[1])
    expect(result.redirect).toBe('/login')
    expect(db.tables.users[0].tenant_id).toBe(TENANT_A)
    expect(db.tables.website_prospects[0].status).toBe('claimed')
    expect(db.tables.website_prospects[1].claimed_at).toBeNull()
    expect(db.tables.website_prospects[1].tenant_id).toBe(TENANT_B)
  })

  it('stores only the claim token hash', async () => {
    const db = createDb()
    db.tables.website_prospects[0].claim_token_hash = null
    db.tables.website_prospects[0].preview_token = 'leave-me'
    const prepared = await prepareProspectClaim(db as unknown as ClaimDb, 'prospect-a', NOW)
    const prospect = db.tables.website_prospects[0]
    expect(prospect.claim_token_hash).toBe(hashPreviewToken(prepared.token))
    expect(prospect.claim_token_hash).not.toBe(prepared.token)
    expect(JSON.stringify(prospect)).not.toContain(prepared.token)
    expect(prospect.preview_token).toBe('leave-me')
  })

  it('keeps the logged-in website lifecycle untouched', () => {
    const route = readRepo('server/api/public/website-claim.post.ts')
    const claimSource = readRepo('server/utils/website-prospect-claim.ts')
    const sql = readRepo('sql_migrations/20260929_website_prospect_claim.sql')
    expect(route).not.toContain('website-lifecycle')
    expect(route).not.toContain('getAuthenticatedUser')
    expect(route).not.toContain('tenant_id')
    expect(claimSource).not.toContain('website-lifecycle')
    expect(claimSource).not.toContain('console.')
    expect(sql).toContain('update public.website_prospects')
    expect(sql).not.toContain('preview_token')
    expect(() => readRepo('server/api/website/claim.post.ts')).toThrow()
    expect(() => readRepo('server/utils/website-lifecycle.ts')).toThrow()
  })
})

describe('prospect claim predicates', () => {
  const now = Date.parse('2026-09-29T08:00:00.000Z')
  const token = generatePreviewToken()

  it('accepts one unclaimed unexpired target and refuses the other states', () => {
    const ok = {
      token,
      hashMatches: true,
      expiresAt: '2026-09-30T08:00:00.000Z',
      claimedAt: null,
      reservedUntil: null,
      tenantId: TENANT_A,
      websiteId: 'website-a',
      now,
    }
    expect(prospectClaimBlockReason(ok)).toBeNull()
    expect(prospectClaimBlockReason({ ...ok, hashMatches: false })).toBe('invalid')
    expect(prospectClaimBlockReason({ ...ok, token: 'short' })).toBe('invalid')
    expect(prospectClaimBlockReason({ ...ok, expiresAt: '2026-09-28T08:00:00.000Z' })).toBe('expired')
    expect(prospectClaimBlockReason({ ...ok, claimedAt: '2026-09-29T07:00:00.000Z' })).toBe('claimed')
    expect(prospectClaimBlockReason({ ...ok, reservedUntil: '2026-09-29T08:10:00.000Z' })).toBe('reserved')
    expect(prospectClaimBlockReason({ ...ok, tenantId: null })).toBe('missing_target')
    expect(prospectClaimBlockReason({ ...ok, websiteId: null })).toBe('missing_target')
  })
})
