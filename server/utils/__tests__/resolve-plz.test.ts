import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveLocationPostalCode } from '../resolve-plz'
import { resolvePLZForExternalBusyTime } from '~/utils/postalCodeUtils'

const TENANT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const TENANT_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

type Filter = [string, unknown]
type Call = { table: string; op: string; payload?: unknown; filters: Filter[] }

function googleResponse() {
  return {
    ok: true,
    json: async () => ({
      status: 'OK',
      results: [
        {
          geometry: { location: { lat: 47.35, lng: 8.72 } },
          address_components: [
            { types: ['postal_code'], short_name: '8610' },
            { types: ['locality'], long_name: 'Uster' },
          ],
        },
      ],
    }),
  }
}

function createMockSupabase(options?: { cache?: Record<string, unknown> | null; location?: { id: string } | null }) {
  const calls: Call[] = []

  function from(table: string) {
    const filters: Filter[] = []
    let op = 'select'
    let payload: unknown
    const finish = () => {
      calls.push({ table, op, payload, filters: [...filters] })
    }
    const api: Record<string, (...args: never[]) => unknown> = {}
    Object.assign(api, {
      select() {
        op = 'select'
        return api
      },
      eq(col: string, val: unknown) {
        filters.push([col, val])
        return api
      },
      or() {
        return api
      },
      limit() {
        return api
      },
      insert(row: unknown) {
        op = 'insert'
        payload = row
        return api
      },
      update(row: unknown) {
        op = 'update'
        payload = row
        return api
      },
      single() {
        finish()
        if (table === 'plz_distance_cache') {
          return Promise.resolve({
            data: options?.cache ?? null,
            error: options?.cache ? null : { code: 'PGRST116' },
          })
        }
        if (table === 'locations') {
          return Promise.resolve({
            data: options?.location ?? null,
            error: options?.location ? null : { code: 'PGRST116' },
          })
        }
        return Promise.resolve({ data: null, error: null })
      },
      then(onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) {
        finish()
        const value = table === 'locations' && op === 'select'
          ? { data: [], error: null }
          : { error: null }
        return Promise.resolve(value).then(onFulfilled, onRejected)
      },
    })
    return api
  }

  return { calls, from }
}

function locationWrites(calls: Call[]) {
  return calls.filter((call) => call.table === 'locations' && call.op === 'update')
}

function locationReads(calls: Call[]) {
  return calls.filter((call) => call.table === 'locations' && call.op === 'select' && call.filters.some(([col]) => col === 'name'))
}

describe('resolveLocationPostalCode tenant isolation', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.GOOGLE_GEOCODING_API_KEY
  })

  it('updates only the tenant id passed by the server caller', async () => {
    process.env.GOOGLE_GEOCODING_API_KEY = 'test-geocode-key'
    const fetchImpl = vi.fn(async () => googleResponse()) as unknown as typeof fetch
    const supabase = createMockSupabase({ location: { id: 'loc-a' } })

    const result = await resolveLocationPostalCode({
      locationName: 'Uster',
      tenantId: TENANT_A,
      supabase,
      fetchImpl,
    })

    expect(result.postal_code).toBe('8610')
    expect(result.cached).toBe(false)
    const reads = locationReads(supabase.calls)
    expect(reads).toHaveLength(1)
    expect(reads[0].filters).toContainEqual(['tenant_id', TENANT_A])
    expect(reads[0].filters).not.toContainEqual(['tenant_id', TENANT_B])
    const writes = locationWrites(supabase.calls)
    expect(writes).toHaveLength(1)
    expect(writes[0].filters).toContainEqual(['id', 'loc-a'])
    expect(writes[0].filters).toContainEqual(['tenant_id', TENANT_A])
    expect(writes[0].filters).not.toContainEqual(['tenant_id', TENANT_B])
    expect(JSON.stringify(writes[0].payload)).not.toContain(TENANT_B)
  })

  it('scopes a different server tenant to that tenant only', async () => {
    process.env.GOOGLE_GEOCODING_API_KEY = 'test-geocode-key'
    const fetchImpl = vi.fn(async () => googleResponse()) as unknown as typeof fetch
    const supabase = createMockSupabase({ location: { id: 'loc-b' } })

    await resolveLocationPostalCode({
      locationName: 'Uster',
      tenantId: TENANT_B,
      supabase,
      fetchImpl,
    })

    const writes = locationWrites(supabase.calls)
    expect(writes).toHaveLength(1)
    expect(writes[0].filters).toContainEqual(['tenant_id', TENANT_B])
    expect(writes[0].filters).not.toContainEqual(['tenant_id', TENANT_A])
  })

  it('does not write locations when tenant id is missing, blank, or not a string', async () => {
    process.env.GOOGLE_GEOCODING_API_KEY = 'test-geocode-key'
    const fetchImpl = vi.fn(async () => googleResponse()) as unknown as typeof fetch

    for (const tenantId of [undefined, null, '', '   ', 42 as unknown as string]) {
      const supabase = createMockSupabase({ location: { id: 'loc-a' } })
      const result = await resolveLocationPostalCode({
        locationName: 'Uster',
        tenantId,
        supabase,
        fetchImpl,
      })
      expect(result.postal_code).toBe('8610')
      expect(locationReads(supabase.calls)).toEqual([])
      expect(locationWrites(supabase.calls)).toEqual([])
    }
  })

  it('does not write locations on a cache hit', async () => {
    process.env.GOOGLE_GEOCODING_API_KEY = 'test-geocode-key'
    const fetchImpl = vi.fn(async () => googleResponse()) as unknown as typeof fetch
    const supabase = createMockSupabase({
      cache: { postal_code: '8000', city: 'Zürich', latitude: 1, longitude: 2 },
      location: { id: 'loc-a' },
    })

    const result = await resolveLocationPostalCode({
      locationName: 'Uster',
      tenantId: TENANT_A,
      supabase,
      fetchImpl,
    })

    expect(result).toMatchObject({ postal_code: '8000', cached: true })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(locationWrites(supabase.calls)).toEqual([])
  })

  it('does not read request headers or a public tenant id', () => {
    const src = readFileSync(resolve(process.cwd(), 'server/utils/resolve-plz.ts'), 'utf8')
    expect(src).not.toMatch(/readBody|getHeader|getQuery|x-tenant-id|x-user-id|defineEventHandler/)
    const helper = readFileSync(resolve(process.cwd(), 'utils/postalCodeUtils.ts'), 'utf8')
    expect(helper).not.toContain('/api/geocoding/resolve-plz')
    expect(helper).toContain('resolveLocationPostalCode')
  })
})

describe('resolvePLZForExternalBusyTime internal flow', () => {
  afterEach(() => {
    delete process.env.GOOGLE_GEOCODING_API_KEY
  })

  it('returns a postal code embedded in the address without geocoding', async () => {
    const supabase = createMockSupabase()
    const plz = await resolvePLZForExternalBusyTime('Bahnhof, 8610 Uster', TENANT_A, supabase)
    expect(plz).toBe('8610')
    expect(supabase.calls).toEqual([])
  })

  it('geocodes through the internal helper and keeps the caller tenant', async () => {
    process.env.GOOGLE_GEOCODING_API_KEY = 'test-geocode-key'
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(googleResponse() as Response)
    const supabase = createMockSupabase({ location: { id: 'loc-a' } })

    const plz = await resolvePLZForExternalBusyTime('Uster', TENANT_A, supabase)

    expect(plz).toBe('8610')
    const writes = locationWrites(supabase.calls)
    expect(writes).toHaveLength(1)
    expect(writes[0].filters).toContainEqual(['tenant_id', TENANT_A])
    expect(writes[0].filters).not.toContainEqual(['tenant_id', TENANT_B])
    fetchSpy.mockRestore()
  })

  it('does not write a location for a foreign tenant id when no matching row exists', async () => {
    process.env.GOOGLE_GEOCODING_API_KEY = 'test-geocode-key'
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(googleResponse() as Response)
    const supabase = createMockSupabase({ location: null })

    const plz = await resolvePLZForExternalBusyTime('Uster', TENANT_B, supabase)

    expect(plz).toBe('8610')
    expect(locationWrites(supabase.calls)).toEqual([])
    const reads = locationReads(supabase.calls)
    expect(reads.some((call) => call.filters.some((filter) => filter[0] === 'tenant_id' && filter[1] === TENANT_A))).toBe(false)
    expect(reads.some((call) => call.filters.some((filter) => filter[0] === 'tenant_id' && filter[1] === TENANT_B))).toBe(true)
    fetchSpy.mockRestore()
  })
})
