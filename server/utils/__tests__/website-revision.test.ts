import { describe, expect, it } from 'vitest'
import { sanitizeWebsiteAuditMetadata } from '../website-lifecycle-audit'
import {
  assertOwnedWebsiteRevision,
  buildWebsiteRevisionSnapshot,
  loadOwnedWebsiteRevision,
  nextWebsiteVersionNumber,
  persistPublishedWebsiteRevision,
  rollbackWebsiteRevision,
} from '../website-revision'

const tenantA = '11111111-1111-1111-1111-111111111111'
const tenantB = '22222222-2222-2222-2222-222222222222'
const websiteA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const websiteB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const revisionA = 'cccccccc-cccc-cccc-cccc-cccccccccccc'

function snapshotFor(websiteId = websiteA) {
  return buildWebsiteRevisionSnapshot({
    website: { id: websiteId, subdomain: 'demo', seo_title: 'Demo' },
    pages: [{ id: 'page-1', slug: 'index', is_home: true, blocks: { blocks: [{ type: 'hero' }] } }],
    now: '2026-09-21T00:00:00.000Z',
  })
}

type RevisionRow = Record<string, unknown>

function createRevisionStore(seed: RevisionRow[] = []) {
  const revisions = [...seed]
  const pages: Array<Record<string, unknown>> = [
    { id: 'page-1', website_id: websiteA, blocks: { dirty: true } },
  ]
  const websites = [{ id: websiteA, tenant_id: tenantA, published_revision_id: null as string | null }]
  const errors: Record<string, { code?: string; message?: string } | null> = {}

  const apiFor = (table: string) => {
    const filters: Record<string, unknown> = {}
    let pendingInsert: Record<string, unknown> | null = null
    let pendingUpdate: Record<string, unknown> | null = null
    let orderDesc = false
    let limitCount: number | null = null
    const api = {
      select() { return api },
      eq(key: string, value: unknown) {
        filters[key] = value
        return api
      },
      order(_col: string, opts?: { ascending?: boolean }) {
        orderDesc = opts?.ascending === false
        return api
      },
      limit(n: number) {
        limitCount = n
        return api
      },
      insert(row: Record<string, unknown>) {
        pendingInsert = row
        return api
      },
      update(patch: Record<string, unknown>) {
        pendingUpdate = patch
        return api
      },
        maybeSingle() {
          return settle()
        },
        then(
          onFulfilled: (value: { data: unknown; error: unknown }) => unknown,
          onRejected?: (reason: unknown) => unknown,
        ) {
          return settle().then(onFulfilled, onRejected)
        },
      }
      function settle() {
        if (errors[table]) return Promise.resolve({ data: null, error: errors[table] })
        if (pendingInsert) {
          if (table === 'website_revisions') {
            const publishedClash = revisions.some((row) =>
              row.website_id === pendingInsert!.website_id && row.status === 'published' && pendingInsert!.status === 'published',
            )
            const versionClash = revisions.some((row) =>
              row.website_id === pendingInsert!.website_id && row.version_number === pendingInsert!.version_number,
            )
            if (publishedClash || versionClash) {
              return Promise.resolve({ data: null, error: { code: '23505', message: 'duplicate key' } })
            }
            const created = { id: `rev-${revisions.length + 1}`, ...pendingInsert }
            revisions.push(created)
            pendingInsert = null
            return Promise.resolve({ data: created, error: null })
          }
        }
        if (pendingUpdate && table === 'website_revisions') {
          const found = revisions.find((row) => Object.entries(filters).every(([key, value]) => row[key] === value))
          if (found) Object.assign(found, pendingUpdate)
          pendingUpdate = null
          return Promise.resolve({ data: found || null, error: null })
        }
        if (pendingUpdate && table === 'website_pages') {
          const found = pages.find((row) => Object.entries(filters).every(([key, value]) => row[key] === value))
          if (found) Object.assign(found, pendingUpdate)
          pendingUpdate = null
          return Promise.resolve({ data: found || null, error: null })
        }
        if (pendingUpdate && table === 'website_tenants') {
          const found = websites.find((row) => Object.entries(filters).every(([key, value]) => row[key] === value))
          if (found) Object.assign(found, pendingUpdate)
          pendingUpdate = null
          return Promise.resolve({ data: found || null, error: null })
        }
        let rows = (table === 'website_revisions' ? revisions : table === 'website_pages' ? pages : websites)
          .filter((row) => Object.entries(filters).every(([key, value]) => row[key] === value))
        if (orderDesc) rows = [...rows].sort((a, b) => Number(b.version_number || 0) - Number(a.version_number || 0))
        if (limitCount != null) rows = rows.slice(0, limitCount)
        return Promise.resolve({ data: rows[0] || null, error: null })
      }
      return api
  }

  return {
    revisions,
    pages,
    websites,
    errors,
    from(table: string) { return apiFor(table) },
  }
}

describe('website version numbering', () => {
  it('assigns server-side monotonic versions and starts at 1', () => {
    expect(nextWebsiteVersionNumber(null)).toBe(1)
    expect(nextWebsiteVersionNumber(7)).toBe(8)
    expect(nextWebsiteVersionNumber(Number.NaN)).toBe(1)
  })

  it('does not accept a client-provided version on persist', async () => {
    const store = createRevisionStore()
    const result = await persistPublishedWebsiteRevision({
      supabase: store,
      websiteId: websiteA,
      tenantId: tenantA,
      snapshot: snapshotFor(),
    })
    expect(result.revision?.version_number).toBe(1)
    expect(result.revision).not.toHaveProperty('clientVersion')
  })
})

describe('website revision ownership', () => {
  it('rejects foreign tenant and foreign website ids', () => {
    expect(assertOwnedWebsiteRevision(
      { website_id: websiteA, tenant_id: tenantA },
      { websiteId: websiteA, tenantId: tenantA },
    )).toBe(true)
    expect(assertOwnedWebsiteRevision(
      { website_id: websiteA, tenant_id: tenantA },
      { websiteId: websiteA, tenantId: tenantB },
    )).toBe(false)
    expect(assertOwnedWebsiteRevision(
      { website_id: websiteB, tenant_id: tenantA },
      { websiteId: websiteA, tenantId: tenantA },
    )).toBe(false)
  })

  it('denies tenant A reading tenant B revisions', async () => {
    const store = createRevisionStore([{
      id: revisionA,
      website_id: websiteB,
      tenant_id: tenantB,
      version_number: 3,
      status: 'published',
      snapshot: snapshotFor(websiteB),
    }])
    await expect(loadOwnedWebsiteRevision({
      supabase: store,
      revisionId: revisionA,
      websiteId: websiteA,
      tenantId: tenantA,
    })).rejects.toMatchObject({ statusCode: 403 })
  })
})

describe('publish + rollback revisions', () => {
  it('creates v1 then a rollback copy as v2 instead of destroying history', async () => {
    const store = createRevisionStore()
    const first = await persistPublishedWebsiteRevision({
      supabase: store,
      websiteId: websiteA,
      tenantId: tenantA,
      snapshot: snapshotFor(),
    })
    expect(first.revision?.status).toBe('published')
    expect(first.revision?.version_number).toBe(1)

    const dirty = snapshotFor()
    dirty.pages[0].blocks = { blocks: [{ type: 'hero', content: { headline: 'v2 draft' } }] }
    const second = await persistPublishedWebsiteRevision({
      supabase: store,
      websiteId: websiteA,
      tenantId: tenantA,
      snapshot: dirty,
    })
    expect(second.revision?.version_number).toBe(2)
    expect(store.revisions.find((row) => row.version_number === 1)?.status).toBe('superseded')
    expect(store.revisions.filter((row) => row.status === 'published')).toHaveLength(1)

    const rolled = await rollbackWebsiteRevision({
      supabase: store,
      tenantId: tenantA,
      websiteId: websiteA,
      targetRevisionId: String(first.revision?.id),
    })
    expect(rolled.revision?.version_number).toBe(3)
    expect(rolled.revision?.source_revision_id).toBe(first.revision?.id)
    expect(store.pages[0].blocks).toEqual(snapshotFor().pages[0].blocks)
  })

  it('treats a duplicate identical publish as idempotent', async () => {
    const store = createRevisionStore()
    const snap = snapshotFor()
    const first = await persistPublishedWebsiteRevision({
      supabase: store,
      websiteId: websiteA,
      tenantId: tenantA,
      snapshot: snap,
    })
    const second = await persistPublishedWebsiteRevision({
      supabase: store,
      websiteId: websiteA,
      tenantId: tenantA,
      snapshot: snap,
    })
    expect(second.idempotent).toBe(true)
    expect(second.revision?.id).toBe(first.revision?.id)
    expect(store.revisions).toHaveLength(1)
  })

  it('retries a unique-constraint race instead of writing two live versions', async () => {
    const store = createRevisionStore()
    await persistPublishedWebsiteRevision({
      supabase: store,
      websiteId: websiteA,
      tenantId: tenantA,
      snapshot: snapshotFor(),
    })
    store.revisions.push({
      id: 'ghost',
      website_id: websiteA,
      tenant_id: tenantA,
      version_number: 2,
      status: 'draft',
      snapshot: snapshotFor(),
    })
    const next = await persistPublishedWebsiteRevision({
      supabase: store,
      websiteId: websiteA,
      tenantId: tenantA,
      snapshot: { ...snapshotFor(), captured_at: '2026-09-21T01:00:00.000Z' },
    })
    expect(next.revision?.version_number).toBe(3)
    expect(store.revisions.filter((row) => row.status === 'published')).toHaveLength(1)
  })

  it('skips persist when the revisions table is not provisioned', async () => {
    const store = createRevisionStore()
    store.errors.website_revisions = { code: '42P01', message: 'relation website_revisions does not exist' }
    const result = await persistPublishedWebsiteRevision({
      supabase: store,
      websiteId: websiteA,
      tenantId: tenantA,
      snapshot: snapshotFor(),
    })
    expect(result).toEqual({ revision: null, skipped: true, idempotent: false })
  })

  it('refuses rollback of a foreign snapshot website_id', async () => {
    const store = createRevisionStore([{
      id: revisionA,
      website_id: websiteA,
      tenant_id: tenantA,
      version_number: 1,
      status: 'published',
      snapshot: snapshotFor(websiteB),
    }])
    await expect(rollbackWebsiteRevision({
      supabase: store,
      tenantId: tenantA,
      websiteId: websiteA,
      targetRevisionId: revisionA,
    })).rejects.toMatchObject({ statusCode: 403, data: { code: 'website_revision_foreign_snapshot' } })
  })
})

describe('audit sanitization', () => {
  it('strips token and secret keys', () => {
    expect(sanitizeWebsiteAuditMetadata({
      event: 'published',
      claim_token: 'should-never-log',
      preview_token: 'also-secret',
      nested: { password: 'x', version_number: 3 },
    })).toEqual({ event: 'published', nested: { version_number: 3 } })
  })
})
