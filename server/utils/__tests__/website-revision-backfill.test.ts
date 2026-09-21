import { describe, expect, it } from 'vitest'
import { jsonEqual } from '../website-revision'
import {
  WEBSITE_REVISION_IMMUTABILITY,
  assertLosslessHomepageSnapshot,
  backfillPublishedWebsiteRevision,
  backfillPublishedWebsiteRevisions,
  buildLosslessWebsiteRevisionSnapshot,
  formatWebsiteBackfillVerificationMatrix,
  isDeterministicHomepage,
  selectDeterministicHomepage,
  sourceBlocksAreSnapshotable,
  type WebsiteBackfillHomepage,
  type WebsiteBackfillResult,
} from '../website-revision-backfill'

const tenantA = '11111111-1111-1111-1111-111111111111'
const tenantB = '22222222-2222-2222-2222-222222222222'
const publishedA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const publishedCustom = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const unpublishedC = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const pageHomeA = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
const pageLegalA = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
const pageHomeCustom = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
const pageHomeUnpub = '99999999-9999-9999-9999-999999999999'

function landing(label: string, extra?: Record<string, unknown>) {
  return {
    seo: { title: `${label} SEO`, description: `${label} desc`, keywords: 'fixture' },
    brand: { name: `${label} Brand`, primary: '#112233', nested: { tokenHint: 'not-a-secret' } },
    blocks: [
      { type: 'hero', content: { headline: `${label} headline`, extra: { nested: true, order: 1 } } },
      { type: 'cta', content: { label: 'Buchen', href: '/booking' } },
    ],
    custom_field: { keep: label, unused_by_renderer: true },
    ...extra,
  }
}

function homePage(opts: {
  id: string
  websiteId: string
  blocks?: unknown
  is_home?: boolean
  slug?: string
  page_type?: string
  is_published?: boolean
}): Record<string, unknown> {
  return {
    id: opts.id,
    website_id: opts.websiteId,
    slug: opts.slug ?? 'index',
    title: 'Home',
    is_home: opts.is_home ?? true,
    page_type: opts.page_type ?? 'home',
    seo_title: 'Home SEO',
    seo_description: 'Home desc',
    seo_keywords: 'home',
    og_image: null,
    blocks: opts.blocks === undefined ? landing(opts.websiteId) : opts.blocks,
    is_published: opts.is_published ?? true,
  }
}

function site(opts: {
  id: string
  tenantId: string
  published?: boolean
  customDomain?: string | null
  pointer?: string | null
  subdomain?: string
}) {
  return {
    id: opts.id,
    tenant_id: opts.tenantId,
    subdomain: opts.subdomain || `fixture-${opts.id.slice(0, 8)}`,
    custom_domain: opts.customDomain ?? null,
    is_published: opts.published ?? false,
    published_revision_id: opts.pointer ?? null,
    seo_title: 'Fixture site',
    seo_description: 'Fixture desc',
    seo_keywords: 'fixture',
    primary_color: '#000000',
    secondary_color: '#111111',
    accent_color: '#222222',
    logo_url: null,
    hero_image_url: null,
  }
}

type StoreRow = Record<string, unknown>

function createBackfillStore(seed?: {
  websites?: StoreRow[]
  pages?: StoreRow[]
  revisions?: StoreRow[]
}) {
  const websites = [...(seed?.websites || [])]
  const pages = [...(seed?.pages || [])]
  const revisions = [...(seed?.revisions || [])]
  const events: StoreRow[] = []
  const errors: Record<string, { code?: string; message?: string } | null> = {}
  const revisionUpdates: Array<Record<string, unknown>> = []
  let nextRevision = 1
  let corruptInsertedSnapshot = false

  const rowsFor = (table: string) => {
    if (table === 'website_tenants') return websites
    if (table === 'website_pages') return pages
    if (table === 'website_revisions') return revisions
    if (table === 'website_lifecycle_events') return events
    return []
  }

  const apiFor = (table: string) => {
    const filters: Record<string, unknown> = {}
    let pendingInsert: StoreRow | null = null
    let pendingUpdate: StoreRow | null = null
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
      insert(row: StoreRow) {
        pendingInsert = row
        return api
      },
      update(patch: StoreRow) {
        pendingUpdate = patch
        return api
      },
      maybeSingle() {
        return settle('single')
      },
      then(
        onFulfilled: (value: { data: unknown; error: unknown }) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) {
        return settle('list').then(onFulfilled, onRejected)
      },
    }

    function matching(rows: StoreRow[]) {
      let found = rows.filter((row) => Object.entries(filters).every(([key, value]) => row[key] === value))
      if (orderDesc) found = [...found].sort((a, b) => Number(b.version_number || 0) - Number(a.version_number || 0))
      if (limitCount != null) found = found.slice(0, limitCount)
      return found
    }

    function settle(mode: 'single' | 'list') {
      if (errors[table]) return Promise.resolve({ data: mode === 'list' ? null : null, error: errors[table] })
      if (pendingInsert) {
        if (table === 'website_revisions') {
          const publishedClash = revisions.some((row) =>
            row.website_id === pendingInsert!.website_id && row.status === 'published' && pendingInsert!.status === 'published',
          )
          const versionClash = revisions.some((row) =>
            row.website_id === pendingInsert!.website_id && row.version_number === pendingInsert!.version_number,
          )
          if (publishedClash || versionClash) {
            pendingInsert = null
            return Promise.resolve({ data: null, error: { code: '23505', message: 'duplicate key' } })
          }
          const created: StoreRow = { id: `rev-${nextRevision++}`, ...pendingInsert }
          if (corruptInsertedSnapshot && created.snapshot && typeof created.snapshot === 'object') {
            created.snapshot = {
              ...(created.snapshot as Record<string, unknown>),
              pages: [],
            }
          }
          revisions.push(created)
          pendingInsert = null
          return Promise.resolve({ data: created, error: null })
        }
        if (table === 'website_lifecycle_events') {
          const created = { id: `evt-${events.length + 1}`, ...pendingInsert }
          events.push(created)
          pendingInsert = null
          return Promise.resolve({ data: created, error: null })
        }
        pendingInsert = null
        return Promise.resolve({ data: null, error: null })
      }
      if (pendingUpdate) {
        if (table === 'website_revisions') revisionUpdates.push({ ...pendingUpdate, ...filters })
        const found = matching(rowsFor(table))[0]
        if (found) Object.assign(found, pendingUpdate)
        const updated = found ? { ...found } : null
        pendingUpdate = null
        return Promise.resolve({ data: updated, error: null })
      }
      const found = matching(rowsFor(table))
      if (mode === 'single') return Promise.resolve({ data: found[0] || null, error: null })
      return Promise.resolve({ data: found, error: null })
    }

    return api
  }

  return {
    websites,
    pages,
    revisions,
    events,
    errors,
    revisionUpdates,
    setCorruptInsertedSnapshot(value: boolean) { corruptInsertedSnapshot = value },
    from(table: string) { return apiFor(table) },
  }
}

function defaultFixtures() {
  return {
    websites: [
      site({ id: publishedA, tenantId: tenantA, published: true }),
      site({ id: publishedCustom, tenantId: tenantB, published: true, customDomain: 'fixture-custom.example' }),
      site({ id: unpublishedC, tenantId: tenantA, published: false }),
    ],
    pages: [
      homePage({ id: pageHomeA, websiteId: publishedA, blocks: landing('published-a') }),
      {
        id: pageLegalA,
        website_id: publishedA,
        slug: 'impressum',
        title: 'Impressum',
        is_home: false,
        page_type: 'legal',
        seo_title: null,
        seo_description: null,
        seo_keywords: null,
        og_image: null,
        blocks: landing('legal-a'),
        is_published: true,
      },
      homePage({ id: pageHomeCustom, websiteId: publishedCustom, blocks: landing('custom-domain') }),
      homePage({ id: pageHomeUnpub, websiteId: unpublishedC, blocks: landing('unpublished'), is_published: false }),
    ],
  }
}

describe('deterministic homepage selection', () => {
  it('accepts only is_home + slug index + page_type home', () => {
    expect(isDeterministicHomepage({ is_home: true, slug: 'index', page_type: 'home' })).toBe(true)
    expect(isDeterministicHomepage({ is_home: true, slug: 'home', page_type: 'home' })).toBe(false)
    expect(isDeterministicHomepage({ is_home: false, slug: 'index', page_type: 'home' })).toBe(false)
    expect(isDeterministicHomepage({ is_home: true, slug: 'index', page_type: 'landing' })).toBe(false)
  })

  it('stops when the homepage is missing or ambiguous', () => {
    expect(() => selectDeterministicHomepage([])).toThrowError()
    expect(() => selectDeterministicHomepage([
      { is_home: true, slug: 'index', page_type: 'home' },
      { is_home: true, slug: 'index', page_type: 'home' },
    ])).toThrowError()
    expect(selectDeterministicHomepage([
      { id: 'other', is_home: false, slug: 'about', page_type: 'page' },
      { id: 'home', is_home: true, slug: 'index', page_type: 'home' },
    ]).homepage).toMatchObject({ id: 'home' })
  })
})

describe('lossless snapshot copy', () => {
  it('copies homepage blocks by reference equality and keeps custom fields', () => {
    const source = landing('nested', { weird: [1, { z: true, a: false }] })
    const snapshot = buildLosslessWebsiteRevisionSnapshot({
      website: { id: publishedA, subdomain: 'fixture' },
      pages: [homePage({ id: pageHomeA, websiteId: publishedA, blocks: source }) as WebsiteBackfillHomepage],
      now: '2026-09-21T00:00:00.000Z',
    })
    assertLosslessHomepageSnapshot(source, snapshot)
    expect(snapshot.pages[0].blocks).toBe(source)
    expect(jsonEqual(source, snapshot.pages[0].blocks)).toBe(true)
    expect(sourceBlocksAreSnapshotable(null)).toBe(false)
    expect(sourceBlocksAreSnapshotable('scalar')).toBe(false)
    expect(sourceBlocksAreSnapshotable({ seo: {}, brand: {}, blocks: [] })).toBe(false)
  })

  it('treats jsonb key-order differences as equal', () => {
    expect(jsonEqual({ seo: { b: 2, a: 1 }, brand: { x: 1 }, blocks: [1] }, { brand: { x: 1 }, seo: { a: 1, b: 2 }, blocks: [1] })).toBe(true)
    expect(jsonEqual({ blocks: [1, 2] }, { blocks: [2, 1] })).toBe(false)
  })
})

describe('strategy B verified backfill', () => {
  it('skips when revision tables are not provisioned', async () => {
    const store = createBackfillStore(defaultFixtures())
    store.errors.website_tenants = { code: '42P01', message: 'relation website_tenants published_revision_id does not exist' }
    const result = await backfillPublishedWebsiteRevision({
      supabase: store,
      websiteId: publishedA,
      tenantId: tenantA,
    })
    expect(result).toMatchObject({ status: 'skipped', reason: 'unprovisioned', pointerSet: false })
    const batch = await backfillPublishedWebsiteRevisions({ supabase: store })
    expect(batch.unprovisioned).toBe(true)
    expect(batch.results).toEqual([])
  })

  it('backfills only published sites and leaves unpublished pointers null', async () => {
    const store = createBackfillStore(defaultFixtures())
    const batch = await backfillPublishedWebsiteRevisions({
      supabase: store,
      actorId: tenantA,
      now: '2026-09-21T08:00:00.000Z',
    })
    expect(batch.results).toHaveLength(2)
    expect(batch.results.every((row) => row.status === 'created' && row.pointerSet)).toBe(true)
    const unpublished = await backfillPublishedWebsiteRevision({
      supabase: store,
      websiteId: unpublishedC,
      tenantId: tenantA,
    })
    expect(unpublished).toMatchObject({
      status: 'skipped',
      reason: 'unpublished',
      pointerSet: false,
      verification: { unpublishedPreserved: true, pointerValid: false },
    })
    expect(store.websites.find((row) => row.id === unpublishedC)?.published_revision_id).toBeNull()
    expect(store.revisions.filter((row) => row.website_id === unpublishedC)).toHaveLength(0)
  })

  it('does not promote an existing unpublished-site snapshot', async () => {
    const store = createBackfillStore({
      ...defaultFixtures(),
      revisions: [{
        id: 'orphan-rev',
        website_id: unpublishedC,
        tenant_id: tenantA,
        version_number: 1,
        status: 'published',
        snapshot: { schema_version: 1, pages: [] },
      }],
    })
    store.websites.find((row) => row.id === unpublishedC)!.published_revision_id = null
    const result = await backfillPublishedWebsiteRevision({
      supabase: store,
      websiteId: unpublishedC,
      tenantId: tenantA,
    })
    expect(result.status).toBe('skipped')
    expect(store.websites.find((row) => row.id === unpublishedC)?.published_revision_id).toBeNull()
  })

  it('creates a tenant-bound pointer only after snapshot verification', async () => {
    const store = createBackfillStore(defaultFixtures())
    const result = await backfillPublishedWebsiteRevision({
      supabase: store,
      websiteId: publishedA,
      tenantId: tenantA,
      now: '2026-09-21T08:00:00.000Z',
    })
    expect(result.status).toBe('created')
    expect(result.verification).toMatchObject({
      website: publishedA,
      sourcePage: pageHomeA,
      jsonEqual: true,
      tenantMatch: true,
      pointerValid: true,
    })
    expect(result.revision?.tenant_id).toBe(tenantA)
    expect(result.revision?.website_id).toBe(publishedA)
    expect(result.revision?.version_number).toBe(1)
    const home = result.revision?.snapshot.pages.find(isDeterministicHomepage)
    expect(jsonEqual(home?.blocks, landing('published-a'))).toBe(true)
    expect(store.websites.find((row) => row.id === publishedA)?.published_revision_id).toBe(result.revision?.id)
    expect(store.events[0]).toMatchObject({
      event: 'published',
      website_id: publishedA,
      tenant_id: tenantA,
      revision_id: result.revision?.id,
      metadata: { source: 'strategy_b_backfill', version_number: 1 },
    })
  })

  it('treats a second identical backfill as idempotent', async () => {
    const store = createBackfillStore(defaultFixtures())
    const first = await backfillPublishedWebsiteRevision({
      supabase: store,
      websiteId: publishedA,
      tenantId: tenantA,
    })
    const second = await backfillPublishedWebsiteRevision({
      supabase: store,
      websiteId: publishedA,
      tenantId: tenantA,
    })
    expect(second.status).toBe('idempotent')
    expect(second.revision?.id).toBe(first.revision?.id)
    expect(store.revisions.filter((row) => row.website_id === publishedA)).toHaveLength(1)
    expect(second.verification.jsonEqual).toBe(true)
    expect(second.pointerSet).toBe(true)
  })

  it('repairs a missing pointer on an already-created matching revision', async () => {
    const store = createBackfillStore(defaultFixtures())
    const first = await backfillPublishedWebsiteRevision({
      supabase: store,
      websiteId: publishedA,
      tenantId: tenantA,
    })
    store.websites.find((row) => row.id === publishedA)!.published_revision_id = null
    const repaired = await backfillPublishedWebsiteRevision({
      supabase: store,
      websiteId: publishedA,
      tenantId: tenantA,
    })
    expect(repaired.status).toBe('idempotent')
    expect(repaired.pointerSet).toBe(true)
    expect(store.websites.find((row) => row.id === publishedA)?.published_revision_id).toBe(first.revision?.id)
    expect(store.revisions).toHaveLength(1)
  })

  it('stops when an existing published revision does not match source blocks', async () => {
    const store = createBackfillStore(defaultFixtures())
    const created = await backfillPublishedWebsiteRevision({
      supabase: store,
      websiteId: publishedA,
      tenantId: tenantA,
    })
    store.pages.find((row) => row.id === pageHomeA)!.blocks = landing('changed-after-backfill')
    const again = await backfillPublishedWebsiteRevision({
      supabase: store,
      websiteId: publishedA,
      tenantId: tenantA,
    })
    expect(again.status).toBe('stopped')
    expect(again.reason).toBe('snapshot_mismatch')
    expect(again.pointerSet).toBe(false)
    expect(store.revisions).toHaveLength(1)
    expect(store.websites.find((row) => row.id === publishedA)?.published_revision_id).toBe(created.revision?.id)
  })

  it('stops concurrent backfills from creating two published revisions', async () => {
    const store = createBackfillStore(defaultFixtures())
    const [left, right] = await Promise.all([
      backfillPublishedWebsiteRevision({ supabase: store, websiteId: publishedA, tenantId: tenantA }),
      backfillPublishedWebsiteRevision({ supabase: store, websiteId: publishedA, tenantId: tenantA }),
    ])
    const statuses = [left.status, right.status].sort()
    expect(statuses).toEqual(['created', 'idempotent'])
    expect(store.revisions.filter((row) => row.website_id === publishedA && row.status === 'published')).toHaveLength(1)
    expect(left.revision?.version_number || right.revision?.version_number).toBe(1)
  })

  it('never assigns a client-supplied version number', async () => {
    const store = createBackfillStore(defaultFixtures())
    const result = await backfillPublishedWebsiteRevision({
      supabase: store,
      websiteId: publishedA,
      tenantId: tenantA,
    })
    expect(result.revision?.version_number).toBe(1)
    expect(result.revision).not.toHaveProperty('clientVersion')
  })

  it('stops on missing homepage, multiple homepages, and invalid source JSON', async () => {
    const missing = createBackfillStore({
      websites: [site({ id: publishedA, tenantId: tenantA, published: true })],
      pages: [{
        id: pageLegalA,
        website_id: publishedA,
        slug: 'impressum',
        is_home: false,
        page_type: 'legal',
        blocks: landing('legal'),
      }],
    })
    expect(await backfillPublishedWebsiteRevision({
      supabase: missing,
      websiteId: publishedA,
      tenantId: tenantA,
    })).toMatchObject({ status: 'stopped', reason: 'homepage_missing', pointerSet: false })

    const ambiguous = createBackfillStore({
      websites: [site({ id: publishedA, tenantId: tenantA, published: true })],
      pages: [
        homePage({ id: pageHomeA, websiteId: publishedA }),
        homePage({ id: pageHomeCustom, websiteId: publishedA }),
      ],
    })
    expect(await backfillPublishedWebsiteRevision({
      supabase: ambiguous,
      websiteId: publishedA,
      tenantId: tenantA,
    })).toMatchObject({ status: 'stopped', reason: 'homepage_ambiguous', pointerSet: false })

    const invalid = createBackfillStore({
      websites: [site({ id: publishedA, tenantId: tenantA, published: true })],
      pages: [homePage({ id: pageHomeA, websiteId: publishedA, blocks: 'not-json' })],
    })
    expect(await backfillPublishedWebsiteRevision({
      supabase: invalid,
      websiteId: publishedA,
      tenantId: tenantA,
    })).toMatchObject({ status: 'stopped', reason: 'invalid_source_json', pointerSet: false })
    expect(invalid.revisions).toHaveLength(0)
  })

  it('fail-closes tenant A asking for tenant B website or revision', async () => {
    const store = createBackfillStore(defaultFixtures())
    const foreign = await backfillPublishedWebsiteRevision({
      supabase: store,
      websiteId: publishedCustom,
      tenantId: tenantA,
    })
    expect(foreign).toMatchObject({ status: 'stopped', reason: 'foreign_website', pointerSet: false })
    expect(store.revisions).toHaveLength(0)

    const created = await backfillPublishedWebsiteRevision({
      supabase: store,
      websiteId: publishedCustom,
      tenantId: tenantB,
    })
    expect(created.revision?.tenant_id).toBe(tenantB)
    expect(store.websites.find((row) => row.id === publishedA)?.published_revision_id).toBeNull()
  })

  it('backfills a custom-domain site with the same tenant-bound path', async () => {
    const store = createBackfillStore(defaultFixtures())
    const result = await backfillPublishedWebsiteRevision({
      supabase: store,
      websiteId: publishedCustom,
      tenantId: tenantB,
    })
    expect(result.status).toBe('created')
    expect(result.verification.tenantMatch).toBe(true)
    expect(store.websites.find((row) => row.id === publishedCustom)?.custom_domain).toBe('fixture-custom.example')
    expect(result.revision?.tenant_id).toBe(tenantB)
    expect(jsonEqual(
      result.revision?.snapshot.pages.find(isDeterministicHomepage)?.blocks,
      landing('custom-domain'),
    )).toBe(true)
  })

  it('does not update revision snapshots after insert', async () => {
    const store = createBackfillStore(defaultFixtures())
    const result = await backfillPublishedWebsiteRevision({
      supabase: store,
      websiteId: publishedA,
      tenantId: tenantA,
    })
    const snapshot = structuredClone(result.revision?.snapshot)
    await backfillPublishedWebsiteRevision({
      supabase: store,
      websiteId: publishedA,
      tenantId: tenantA,
    })
    expect(store.revisionUpdates).toEqual([])
    expect(jsonEqual(store.revisions[0].snapshot, snapshot)).toBe(true)
    expect(WEBSITE_REVISION_IMMUTABILITY).toEqual({
      APPLICATION_ENFORCED_IMMUTABILITY: 'YES',
      DATABASE_ENFORCED_IMMUTABILITY: 'NO',
    })
  })

  it('does not set a pointer when the inserted snapshot fails verification', async () => {
    const store = createBackfillStore(defaultFixtures())
    store.setCorruptInsertedSnapshot(true)
    const result = await backfillPublishedWebsiteRevision({
      supabase: store,
      websiteId: publishedA,
      tenantId: tenantA,
    })
    expect(result.status).toBe('stopped')
    expect(result.reason).toBe('snapshot_mismatch')
    expect(result.pointerSet).toBe(false)
    expect(store.websites.find((row) => row.id === publishedA)?.published_revision_id).toBeNull()
  })

  it('property: source homepage blocks equal backfilled snapshot for every fixture site', async () => {
    const store = createBackfillStore(defaultFixtures())
    const batch = await backfillPublishedWebsiteRevisions({ supabase: store })
    const matrixRows: WebsiteBackfillResult[] = [...batch.results]
    const unpublished = await backfillPublishedWebsiteRevision({
      supabase: store,
      websiteId: unpublishedC,
      tenantId: tenantA,
    })
    matrixRows.push(unpublished)

    for (const result of batch.results) {
      const source = store.pages.find((page) => (
        page.website_id === result.verification.website && isDeterministicHomepage(page)
      ))
      const snapHome = result.revision?.snapshot.pages.find(isDeterministicHomepage)
      expect(source).toBeTruthy()
      expect(jsonEqual(source?.blocks, snapHome?.blocks)).toBe(true)
      expect(result.verification.jsonEqual).toBe(true)
      expect(result.verification.tenantMatch).toBe(true)
      expect(result.verification.pointerValid).toBe(true)
    }

    const matrix = formatWebsiteBackfillVerificationMatrix(matrixRows)
    expect(matrix).toContain('| Website | Source Page | Revision | JSON Equal | Tenant Match | Pointer Valid |')
    expect(matrix).toContain(publishedA)
    expect(matrix).toContain(unpublishedC)
  })
})
