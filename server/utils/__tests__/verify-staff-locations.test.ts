import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { verifyStaffRegistrationLocations } from '~/server/utils/verify-staff-locations'

const TENANT_A = '11111111-1111-4111-8111-111111111111'
const TENANT_B = '22222222-2222-4222-8222-222222222222'

const LOC_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
const LOC_A2 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
const LOC_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'
const EXAM = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1'
const MISSING = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1'

type Row = { id: string; tenant_id: string | null; location_type: string }

type QueryResult = { data: Array<{ id: string }> | null; error: { message: string } | null }

type QueryBuilder = {
  select: () => QueryBuilder
  in: (column: string, values: string[]) => QueryBuilder
  eq: (column: string, value: unknown) => QueryBuilder
  is: (column: string, value: unknown) => QueryBuilder
  then: (
    onFulfilled: (value: QueryResult) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise<unknown>
}

const ROWS: Row[] = [
  { id: LOC_A, tenant_id: TENANT_A, location_type: 'standard' },
  { id: LOC_A2, tenant_id: TENANT_A, location_type: 'standard' },
  { id: LOC_B, tenant_id: TENANT_B, location_type: 'standard' },
  { id: EXAM, tenant_id: null, location_type: 'exam' },
]

/** Minimal PostgREST-shaped stub that applies the chained filters it is given. */
function makeSupabase(opts: { rows?: Row[]; failQuery?: boolean } = {}) {
  const rows = opts.rows ?? ROWS
  const queries: Array<{ table: string; ids: string[]; filters: Record<string, unknown> }> = []

  const client = {
    queries,
    from(table: string) {
      const state = { table, ids: [] as string[], filters: {} as Record<string, unknown> }
      const builder: QueryBuilder = {
        select: () => builder,
        in: (_col: string, values: string[]) => {
          state.ids = values
          return builder
        },
        eq: (col: string, value: unknown) => {
          state.filters[col] = value
          return builder
        },
        is: (col: string, value: unknown) => {
          state.filters[col] = value
          return builder
        },
        then: (onFulfilled, onRejected) => {
          queries.push(state)
          if (opts.failQuery) {
            return Promise.resolve({ data: null, error: { message: 'query failed' } })
              .then(onFulfilled, onRejected)
          }
          const data = rows
            .filter((row) => state.ids.includes(row.id))
            .filter((row) =>
              !('tenant_id' in state.filters) || row.tenant_id === state.filters.tenant_id)
            .filter((row) =>
              !('location_type' in state.filters) || row.location_type === state.filters.location_type)
            .map((row) => ({ id: row.id }))
          return Promise.resolve({ data, error: null }).then(onFulfilled, onRejected)
        },
      }
      return builder
    },
  }
  return client
}

describe('verifyStaffRegistrationLocations', () => {
  it('Test 1 — accepts a location owned by the invitation tenant', async () => {
    const result = await verifyStaffRegistrationLocations(
      makeSupabase(), TENANT_A, [LOC_A], [],
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.standardLocationIds).toEqual([LOC_A])
      expect(result.examLocationIds).toEqual([])
    }
  })

  it('Test 2 — rejects a location owned by another tenant', async () => {
    const supabase = makeSupabase()
    const result = await verifyStaffRegistrationLocations(supabase, TENANT_A, [LOC_B], [])
    expect(result).toEqual({ ok: false, scope: 'standard', reason: 'not_owned' })
    // ownership was decided by the query, not in JS afterwards
    expect(supabase.queries[0].filters.tenant_id).toBe(TENANT_A)
  })

  it('Test 3 — rejects the whole request when tenants are mixed (no partial set)', async () => {
    const result = await verifyStaffRegistrationLocations(
      makeSupabase(), TENANT_A, [LOC_A, LOC_B], [],
    )
    expect(result.ok).toBe(false)
    // the owned id must not leak through as a partial assignment
    expect('standardLocationIds' in result).toBe(false)
  })

  it('Test 4 — tenant argument is authoritative; a foreign tenant id grants nothing', async () => {
    // Caller passes the invitation tenant; a body-supplied TENANT_B cannot widen it.
    const result = await verifyStaffRegistrationLocations(
      makeSupabase(), TENANT_A, [LOC_B], [],
    )
    expect(result.ok).toBe(false)

    // Same location verified against its real owner succeeds, proving the
    // rejection above is tenant scoping and not an unrelated failure.
    const owner = await verifyStaffRegistrationLocations(
      makeSupabase(), TENANT_B, [LOC_B], [],
    )
    expect(owner.ok).toBe(true)
  })

  it('Test 5 — rejects an unknown location uuid', async () => {
    const result = await verifyStaffRegistrationLocations(
      makeSupabase(), TENANT_A, [MISSING], [],
    )
    expect(result).toEqual({ ok: false, scope: 'standard', reason: 'not_owned' })
  })

  it('Test 6 — accepts shared exam locations (tenant_id IS NULL, type exam)', async () => {
    const supabase = makeSupabase()
    const result = await verifyStaffRegistrationLocations(supabase, TENANT_A, [], [EXAM])
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.examLocationIds).toEqual([EXAM])
    expect(supabase.queries[0].filters).toMatchObject({
      tenant_id: null,
      location_type: 'exam',
    })
  })

  it('Test 6b — a tenant-owned location cannot be smuggled in as an exam location', async () => {
    for (const candidate of [LOC_A, LOC_B]) {
      const result = await verifyStaffRegistrationLocations(
        makeSupabase(), TENANT_A, [], [candidate],
      )
      expect(result).toEqual({ ok: false, scope: 'exam', reason: 'not_owned' })
    }
  })

  it('rejects malformed input instead of silently dropping entries', async () => {
    const cases: unknown[] = [
      ['not-a-uuid'],
      [LOC_A, 'not-a-uuid'],
      [{ id: LOC_A }],
      [null],
      'string-instead-of-array',
      42,
    ]
    for (const value of cases) {
      const result = await verifyStaffRegistrationLocations(
        makeSupabase(), TENANT_A, value, [],
      )
      expect(result.ok).toBe(false)
    }
  })

  it('rejects an oversized location array', async () => {
    const many = Array.from({ length: 201 }, (_unused, i) =>
      `aaaaaaaa-aaaa-4aaa-8aaa-${String(i).padStart(12, '0')}`)
    const standard = await verifyStaffRegistrationLocations(
      makeSupabase(), TENANT_A, many, [],
    )
    expect(standard).toEqual({ ok: false, scope: 'standard', reason: 'malformed' })

    const exam = await verifyStaffRegistrationLocations(
      makeSupabase(), TENANT_A, [], many,
    )
    expect(exam).toEqual({ ok: false, scope: 'exam', reason: 'malformed' })
  })

  it('still accepts a selection at the size limit', async () => {
    const atLimit = Array.from({ length: 200 }, (_unused, i) =>
      `aaaaaaaa-aaaa-4aaa-8aaa-${String(i).padStart(12, '0')}`)
    // none of these exist, so it must reject on ownership — not on size
    const result = await verifyStaffRegistrationLocations(
      makeSupabase(), TENANT_A, atLimit, [],
    )
    expect(result).toEqual({ ok: false, scope: 'standard', reason: 'not_owned' })
  })

  it('treats an empty or absent selection as nothing to assign', async () => {
    for (const value of [[], undefined, null]) {
      const result = await verifyStaffRegistrationLocations(
        makeSupabase(), TENANT_A, value, value,
      )
      expect(result.ok).toBe(true)
    }
  })

  it('fails closed when the ownership query errors', async () => {
    const result = await verifyStaffRegistrationLocations(
      makeSupabase({ failQuery: true }), TENANT_A, [LOC_A], [],
    )
    expect(result.ok).toBe(false)
  })

  it('deduplicates repeated ids', async () => {
    const result = await verifyStaffRegistrationLocations(
      makeSupabase(), TENANT_A, [LOC_A, LOC_A, LOC_A2], [],
    )
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.standardLocationIds).toEqual([LOC_A, LOC_A2])
  })

  it('rejects an empty tenant id', async () => {
    const result = await verifyStaffRegistrationLocations(makeSupabase(), '', [LOC_A], [])
    expect(result.ok).toBe(false)
  })
})

describe('staff register endpoint enforces tenant ownership at the query level', () => {
  const src = readFileSync(
    resolve(process.cwd(), 'server/api/staff/register.post.ts'),
    'utf8',
  )

  it('verifies locations before the invitation is consumed', () => {
    const verifyAt = src.indexOf('verifyStaffRegistrationLocations(')
    const consumeAt = src.indexOf('consumePendingStaffInvitation(serviceSupabase')
    expect(verifyAt).toBeGreaterThan(-1)
    expect(consumeAt).toBeGreaterThan(-1)
    // rejection must leave no Auth user, staff row or consumed invitation behind
    expect(verifyAt).toBeLessThan(consumeAt)
    expect(src.indexOf('auth.admin.createUser')).toBeGreaterThan(verifyAt)
  })

  it('derives the tenant from the invitation, never from the request body', () => {
    expect(src).toContain('invitationPreview.tenant_id as string')
    expect(src).not.toMatch(/tenant_id:\s*(body|tenantId)\b/)
    expect(src).not.toMatch(/const\s*\{[^}]*\btenant_id\b[^}]*\}\s*=\s*body/)
  })

  it('constrains every standard-location read and write by tenant', () => {
    const writes = src.match(/\.from\('locations'\)[\s\S]{0,400}?(?=\n\s*(?:\}|const|await|if|logger|for))/g) || []
    expect(writes.length).toBeGreaterThan(0)
    for (const block of writes) {
      if (!/staff_ids/.test(block)) continue
      const scoped = /\.eq\('tenant_id', invitation\.tenant_id\)/.test(block)
        || (/\.is\('tenant_id', null\)/.test(block) && /\.eq\('location_type', 'exam'\)/.test(block))
      expect(scoped, `unscoped location access:\n${block}`).toBe(true)
    }
  })

  it('iterates verified ids rather than the raw client arrays', () => {
    expect(src).toContain('for (const locId of verifiedLocationIds)')
    expect(src).toContain('for (const locId of verifiedExamLocationIds)')
    expect(src).not.toContain('for (const locId of selectedLocationIds)')
    expect(src).not.toContain('for (const locId of selectedExamLocationIds)')
  })

  it('keeps staff_locations tenant_id server-derived', () => {
    expect(src).toContain('tenant_id: invitation.tenant_id')
  })
})
