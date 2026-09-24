import { createRequire } from 'node:module'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { transformSync } from 'esbuild'
import { beforeEach, describe, expect, test } from 'vitest'
import type { H3Event } from 'h3'

const TENANT_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const TENANT_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const sourcePath = path.resolve('apps/website/server/utils/website-tenant.ts')

const state = {
  lookups: [] as string[],
  rows: {} as Record<string, string>,
  failNext: false,
  client: true,
}

const require = createRequire(path.resolve('package.json'))
const dir = mkdtempSync(path.join(tmpdir(), 'website-tenant-'))
const mockUrl = pathToFileURL(path.join(dir, 'client.mjs')).href
writeFileSync(path.join(dir, 'client.mjs'), `
export function createWebsiteSupabaseClient() {
  const state = globalThis.__websiteTenantState
  if (!state.client) return null
  return {
    from() {
      return {
        select() {
          return {
            ilike(_column, pattern) {
              return {
                async maybeSingle() {
                  state.lookups.push(pattern)
                  if (state.failNext) {
                    state.failNext = false
                    throw new Error('lookup failed')
                  }
                  const host = pattern.slice(1, -1)
                  const id = state.rows[host]
                  return { data: id ? { id } : null, error: null }
                },
              }
            },
          }
        },
      }
    },
  }
}
`)

const transformed = transformSync(readFileSync(sourcePath, 'utf8'), {
  loader: 'ts',
  format: 'esm',
  sourcefile: sourcePath,
}).code
  .replaceAll("~/server/utils/supabase-service-env", mockUrl)
  .replaceAll("'h3'", JSON.stringify(pathToFileURL(require.resolve('h3')).href))

const moduleUrl = pathToFileURL(path.join(dir, 'website-tenant.mjs')).href
writeFileSync(path.join(dir, 'website-tenant.mjs'), transformed)
;(globalThis as { __websiteTenantState?: typeof state }).__websiteTenantState = state

const { getWebsiteTenantId } = await import(moduleUrl) as {
  getWebsiteTenantId: (event: H3Event) => Promise<string | null>
}

function eventFor(host?: string, forwarded?: string): H3Event {
  const headers: Record<string, string | undefined> = {}
  if (host !== undefined) headers.host = host
  if (forwarded !== undefined) headers['x-forwarded-host'] = forwarded
  return { node: { req: { headers } } } as H3Event
}

beforeEach(() => {
  state.lookups = []
  state.rows = {
    'tenant-a.test': TENANT_A,
    'tenant-b.test': TENANT_B,
  }
  state.failNext = false
  state.client = true
  delete process.env.NUXT_TENANT_ID
  delete process.env.MARKETING_TENANT_ID
})

describe('website tenant resolution', () => {
  test('does not keep a process-wide tenant cache', () => {
    expect(readFileSync(sourcePath, 'utf8')).not.toContain('cachedTenantId')
  })

  test('resolves each host in one process, including alternation and the reverse order', async () => {
    await expect(getWebsiteTenantId(eventFor('tenant-a.test'))).resolves.toBe(TENANT_A)
    await expect(getWebsiteTenantId(eventFor('tenant-b.test'))).resolves.toBe(TENANT_B)
    await expect(getWebsiteTenantId(eventFor('tenant-a.test'))).resolves.toBe(TENANT_A)
    await expect(getWebsiteTenantId(eventFor('tenant-b.test'))).resolves.toBe(TENANT_B)

    const reverse = [
      await getWebsiteTenantId(eventFor('tenant-b.test')),
      await getWebsiteTenantId(eventFor('tenant-a.test')),
    ]
    expect(reverse).toEqual([TENANT_B, TENANT_A])
    expect(state.lookups).toEqual([
      '%tenant-a.test%',
      '%tenant-b.test%',
      '%tenant-a.test%',
      '%tenant-b.test%',
      '%tenant-b.test%',
      '%tenant-a.test%',
    ])
  })

  test('resolves parallel mixed hosts without cross-tenant leakage', async () => {
    const hosts = [
      'tenant-a.test',
      'tenant-b.test',
      'tenant-a.test',
      'tenant-b.test',
      'tenant-a.test',
      'tenant-b.test',
      'tenant-a.test',
      'tenant-b.test',
    ]
    const ids = await Promise.all(hosts.map((host) => getWebsiteTenantId(eventFor(host))))
    expect(ids).toEqual(hosts.map((host) => (host === 'tenant-a.test' ? TENANT_A : TENANT_B)))
    expect(state.lookups).toHaveLength(8)
  })

  test('an unknown host or a failed lookup does not poison the next host', async () => {
    await expect(getWebsiteTenantId(eventFor('unknown.test'))).resolves.toBeNull()
    await expect(getWebsiteTenantId(eventFor('tenant-b.test'))).resolves.toBe(TENANT_B)

    state.failNext = true
    await expect(getWebsiteTenantId(eventFor('tenant-a.test'))).resolves.toBeNull()
    await expect(getWebsiteTenantId(eventFor('tenant-a.test'))).resolves.toBe(TENANT_A)
  })

  test('uses x-forwarded-host for that request only', async () => {
    await expect(
      getWebsiteTenantId(eventFor('tenant-a.test', 'tenant-b.test')),
    ).resolves.toBe(TENANT_B)
    await expect(getWebsiteTenantId(eventFor('tenant-a.test'))).resolves.toBe(TENANT_A)
    expect(state.lookups).toEqual(['%tenant-b.test%', '%tenant-a.test%'])
  })

  test('ignores MARKETING_TENANT_ID and does not keep NUXT_TENANT_ID after it is unset', async () => {
    process.env.MARKETING_TENANT_ID = TENANT_B
    await expect(getWebsiteTenantId(eventFor('tenant-a.test'))).resolves.toBe(TENANT_A)

    process.env.NUXT_TENANT_ID = TENANT_B
    await expect(getWebsiteTenantId(eventFor('tenant-a.test'))).resolves.toBe(TENANT_B)
    expect(state.lookups).toEqual(['%tenant-a.test%'])

    delete process.env.NUXT_TENANT_ID
    await expect(getWebsiteTenantId(eventFor('tenant-a.test'))).resolves.toBe(TENANT_A)
  })

  test('returns null when the website client is unavailable and still resolves the next request', async () => {
    state.client = false
    await expect(getWebsiteTenantId(eventFor('tenant-a.test'))).resolves.toBeNull()
    state.client = true
    await expect(getWebsiteTenantId(eventFor('tenant-b.test'))).resolves.toBe(TENANT_B)
  })
})
