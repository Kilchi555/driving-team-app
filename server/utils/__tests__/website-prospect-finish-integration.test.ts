/**
 * Integration coverage for finishProspectSite orchestration.
 *
 * Executed path: finishProspectSite (exported) with injectable supabase.
 * Mocked only at unavoidable external boundaries:
 *   - ingestProspectMedia (storage + SSRF + sharp pipeline entry)
 *   - fillProspectSectionPhotos (Unsplash network)
 *   - applyProspectArchitecture (addon page builder side effects)
 *   - getAppUrl / landing builder / email draft (pure presentation)
 *
 * Real code under test: token ensure/reuse, VAT merge into analysis, publish
 * flags, rollback/orphan cleanup on created failures, prospect persistence.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createError } from 'h3'
import {
  ensureWebsitePreviewToken,
  hashPreviewToken,
  issueWebsitePreviewToken,
  previewUrlForPath,
} from '../website-preview-access'
import { finishProspectSite } from '../website-prospect-generate'
import { isProspectIngestStoragePath } from '../website-prospect-media'
import { resolveProspectVatRate } from '../website-prospect-vat'

vi.stubGlobal('createError', createError)

const mediaMocks = vi.hoisted(() => ({
  ingestProspectMedia: vi.fn(),
  removeProspectUploadedPaths: vi.fn(async (_sb: unknown, paths: string[]) => ({
    removed: paths,
    skipped: [],
  })),
}))

const stockMocks = vi.hoisted(() => ({
  fillProspectSectionPhotos: vi.fn(),
}))

const archMocks = vi.hoisted(() => ({
  applyProspectArchitecture: vi.fn(),
  decideProspectArchitecture: vi.fn(() => ({
    mode: 'one' as const,
    reason: 'test',
    intents: [],
  })),
}))

vi.mock('~/server/utils/website-prospect-media', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../website-prospect-media')>()
  return {
    ...actual,
    ingestProspectMedia: mediaMocks.ingestProspectMedia,
    removeProspectUploadedPaths: mediaMocks.removeProspectUploadedPaths,
  }
})

vi.mock('~/server/utils/website-prospect-stock', () => ({
  fillProspectSectionPhotos: stockMocks.fillProspectSectionPhotos,
}))

vi.mock('~/server/utils/website-prospect-architecture', () => ({
  applyProspectArchitecture: archMocks.applyProspectArchitecture,
  decideProspectArchitecture: archMocks.decideProspectArchitecture,
}))

vi.mock('~/server/utils/app-url', () => ({
  getAppUrl: () => 'https://app.simy.ch',
}))

vi.mock('~/server/utils/website-landing-builder', () => ({
  buildLandingPage: () => ({
    seo: { title: 'T', description: 'D', keywords: [] },
    brand: {},
  }),
  slugifySubdomain: (s: string) => String(s || 'x').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
}))

vi.mock('~/server/utils/website-prospect-email', () => ({
  buildProspectEmailDraft: () => ({ subject: 'S', text: 'T', html: 'H' }),
}))

type Row = Record<string, unknown>

function createMemoryDb(opts?: { failTokenUpdate?: boolean; failProspectPersist?: boolean }) {
  const tables = new Map<string, Map<string, Row>>()
  const deleted: Array<{ table: string; id: string }> = []
  const ensure = (name: string) => {
    if (!tables.has(name)) tables.set(name, new Map())
    return tables.get(name)!
  }

  const api = {
    deleted,
    tables,
    seed(table: string, id: string, row: Row) {
      ensure(table).set(id, { id, ...row })
    },
    from(table: string) {
      const store = ensure(table)
      const state = { filters: [] as Array<{ col: string; val: unknown }> }

      const matched = () =>
        [...store.values()].filter((r) => state.filters.every((f) => r[f.col] === f.val))

      const selectChain = {
        eq(col: string, val: unknown) {
          state.filters.push({ col, val })
          return selectChain
        },
        maybeSingle: async () => ({ data: matched()[0] || null, error: null }),
        single: async () => {
          const row = matched()[0]
          return row
            ? { data: row, error: null }
            : { data: null, error: { message: 'not found' } }
        },
      }

      return {
        select(_cols?: string) {
          state.filters = []
          return selectChain
        },
        insert(payload: Row | Row[]) {
          const rows = Array.isArray(payload) ? payload : [payload]
          const inserted = rows.map((p) => {
            const id = String(p.id || `${table}-${store.size + 1}`)
            const row = { ...p, id }
            store.set(id, row)
            return row
          })
          const insertChain = {
            select() {
              return {
                single: async () => ({ data: inserted[0] || null, error: null }),
                maybeSingle: async () => ({ data: inserted[0] || null, error: null }),
              }
            },
          }
          // Support bare insert without select (website_pages path uses select after insert via error check)
          return Object.assign(
            Promise.resolve({ data: inserted, error: null }),
            insertChain,
          )
        },
        update(patch: Row) {
          state.filters = []
          const updateEq = (col: string, val: unknown) => {
            state.filters.push({ col, val })
            const apply = () => {
              if (
                opts?.failTokenUpdate &&
                table === 'website_tenants' &&
                patch.preview_token_hash
              ) {
                return { rows: [] as Row[], error: { message: 'token write failed' } }
              }
              if (opts?.failProspectPersist && table === 'website_prospects') {
                return { rows: [] as Row[], error: { message: 'persist failed' } }
              }
              const rows = matched()
              for (const r of rows) Object.assign(r, patch)
              return { rows, error: null as null | { message: string } }
            }
            const run = async () => {
              const { rows, error } = apply()
              return { data: rows, error }
            }
            return {
              then: (
                onFulfilled: (value: unknown) => unknown,
                onRejected?: (reason: unknown) => unknown,
              ) => run().then(onFulfilled, onRejected),
              select(_c?: string) {
                return {
                  single: async () => {
                    const { rows, error } = apply()
                    if (error) return { data: null, error }
                    return {
                      data: rows[0] || null,
                      error: rows[0] ? null : { message: 'missing' },
                    }
                  },
                }
              },
              eq: updateEq,
            }
          }
          return { eq: updateEq }
        },
        delete() {
          state.filters = []
          return {
            eq: async (col: string, val: unknown) => {
              for (const [id, row] of [...store.entries()]) {
                if (row[col] === val || id === val) {
                  store.delete(id)
                  deleted.push({ table, id })
                }
              }
              return { error: null }
            },
          }
        },
      }
    },
  }
  return api
}

function baseProspect(over: Row = {}): Row {
  return {
    id: 'prospect-1',
    name: 'Demo Betrieb',
    business_type: 'generic',
    city: 'Bern',
    email: 'a@b.ch',
    phone: null,
    address: null,
    postal_code: null,
    place_id: null,
    existing_url: null,
    source: 'manual',
    scrape: { description: 'Bio', title: 'Demo', services: [], images: [] },
    place: { rating: null, photos: [], reviews: [] },
    analysis: {
      findings: [],
      recommend_generate: true,
      summary: 'ok',
      vat_selection: { rate_percent: 8.1, source: 'explicit_selection' },
    },
    revenue_model: null,
    preview_url: null,
    ...over,
  }
}

function baseOpts(
  db: ReturnType<typeof createMemoryDb>,
  over: Partial<Parameters<typeof finishProspectSite>[0]> = {},
) {
  const prospect = (over.prospect as Row) || baseProspect()
  if (!db.tables.get('website_prospects')?.has(prospect.id)) {
    db.seed('website_prospects', prospect.id, prospect)
  }
  if (!db.tables.get('tenants')?.has('tenant-1')) {
    db.seed('tenants', 'tenant-1', {
      id: 'tenant-1',
      name: 'Demo',
      slug: 'demo',
      default_vat_rate: 8.1,
      business_type: 'generic',
    })
  }
  if (!db.tables.get('website_tenants')?.has('website-1')) {
    db.seed('website_tenants', 'website-1', {
      id: 'website-1',
      subdomain: 'demo',
      is_published: false,
      primary_color: '#0F766E',
      secondary_color: '#134E4A',
      accent_color: '#F59E0B',
      logo_url: null,
      hero_image_url: null,
    })
  }
  return {
    // Memory DB implements the subset of Supabase used by finishProspectSite.
    supabase: db as unknown as Parameters<typeof finishProspectSite>[0]['supabase'],
    prospect,
    tenant: {
      id: 'tenant-1',
      name: 'Demo',
      slug: 'demo',
      default_vat_rate: 8.1,
      business_type: 'generic',
    },
    website: {
      id: 'website-1',
      subdomain: 'demo',
      primary_color: '#0F766E',
      secondary_color: '#134E4A',
      accent_color: '#F59E0B',
      logo_url: null,
      hero_image_url: null,
      is_published: false,
    },
    scrape: prospect.scrape,
    place: prospect.place,
    primary: '#0F766E',
    now: '2026-10-16T12:00:00.000Z',
    created: true,
    vatSelection: { rate_percent: 8.1 as const, source: 'explicit_selection' as const },
    ...over,
  }
}

describe('finishProspectSite integration', () => {
  beforeEach(() => {
    mediaMocks.ingestProspectMedia.mockReset()
    mediaMocks.removeProspectUploadedPaths.mockClear()
    stockMocks.fillProspectSectionPhotos.mockReset()
    archMocks.applyProspectArchitecture.mockReset()

    mediaMocks.ingestProspectMedia.mockResolvedValue({
      hero_url:
        'https://cdn.example/object/public/tenant-logos/tenant-1/website/prospect-hero-abc.webp',
      logo_url:
        'https://cdn.example/object/public/tenant-logos/tenant-1/website/prospect-logo-def.webp',
      gallery: [],
      uploaded_paths: [
        'tenant-1/website/prospect-hero-abc.webp',
        'tenant-1/website/prospect-logo-def.webp',
      ],
    })
    stockMocks.fillProspectSectionPhotos.mockResolvedValue({
      hero_url: 'https://cdn.example/hero.webp',
      hero_source: 'own',
      hero_attribution: null,
      services: [],
      gallery: [],
      photos_by_title: {},
      credits: [],
      filled: [],
    })
    archMocks.applyProspectArchitecture.mockResolvedValue({ created: [] })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('completes successfully, persists preview token URL, VAT selection, and never publishes', async () => {
    const db = createMemoryDb()
    const updated = await finishProspectSite(baseOpts(db))
    expect(updated.status).toBe('review')
    expect(updated.preview_url).toContain('/s/demo')
    expect(updated.preview_url).toContain('preview_token=')
    expect(updated.analysis?.vat_selection?.rate_percent).toBe(8.1)
    const site = db.tables.get('website_tenants')!.get('website-1')
    expect(site?.is_published).toBeFalsy()
    expect(site?.preview_token_hash).toBeTruthy()
    expect(mediaMocks.removeProspectUploadedPaths).not.toHaveBeenCalled()
  })

  it('reuses compression via ingestProspectMedia (uploaded_paths from normalize pipeline)', async () => {
    const db = createMemoryDb()
    await finishProspectSite(baseOpts(db))
    expect(mediaMocks.ingestProspectMedia).toHaveBeenCalledTimes(1)
    const arg = mediaMocks.ingestProspectMedia.mock.calls[0][0]
    expect(arg.tenantId).toBe('tenant-1')
    expect(arg).not.toHaveProperty('compress')
  })

  it('on token creation failure after upload: rolls back created shell and cleans orphan paths', async () => {
    const db = createMemoryDb({ failTokenUpdate: true })
    await expect(finishProspectSite(baseOpts(db))).rejects.toMatchObject({
      statusCode: 503,
      statusMessage: 'Preview link unavailable',
    })
    expect(mediaMocks.removeProspectUploadedPaths).toHaveBeenCalled()
    const cleaned = mediaMocks.removeProspectUploadedPaths.mock.calls[0]
    expect(cleaned[1]).toEqual(
      expect.arrayContaining([
        'tenant-1/website/prospect-hero-abc.webp',
        'tenant-1/website/prospect-logo-def.webp',
      ]),
    )
    expect(db.tables.get('tenants')!.has('tenant-1')).toBe(false)
    expect(db.tables.get('website_tenants')!.has('website-1')).toBe(false)
  })

  it('on persistence failure: cleans orphans for created shells and does not leave a published site', async () => {
    const db = createMemoryDb({ failProspectPersist: true })
    await expect(finishProspectSite(baseOpts(db))).rejects.toMatchObject({ statusCode: 500 })
    expect(mediaMocks.removeProspectUploadedPaths).toHaveBeenCalled()
    expect(db.tables.get('tenants')!.has('tenant-1')).toBe(false)
  })

  it('keeps preview token stable across regeneration and rotates only when forced', async () => {
    const db = createMemoryDb()
    const first = await finishProspectSite(baseOpts(db, { created: true }))
    const token1 = new URL(first.preview_url!).searchParams.get('preview_token')
    expect(token1).toBeTruthy()

    db.seed('tenants', 'tenant-1', {
      id: 'tenant-1',
      name: 'Demo',
      slug: 'demo',
      default_vat_rate: 8.1,
      business_type: 'generic',
    })
    const site = db.tables.get('website_tenants')!.get('website-1')!
    db.seed('website_tenants', 'website-1', {
      ...site,
      id: 'website-1',
      subdomain: 'demo',
      is_published: false,
    })
    const prospect = db.tables.get('website_prospects')!.get('prospect-1')!
    const second = await finishProspectSite(
      baseOpts(db, {
        created: false,
        prospect: { ...prospect, preview_url: first.preview_url },
      }),
    )
    const token2 = new URL(second.preview_url!).searchParams.get('preview_token')
    expect(token2).toBe(token1)

    const third = await finishProspectSite(
      baseOpts(db, {
        created: false,
        prospect: { ...prospect, preview_url: second.preview_url },
        forceRotatePreviewToken: true,
      }),
    )
    const token3 = new URL(third.preview_url!).searchParams.get('preview_token')
    expect(token3).toBeTruthy()
    expect(token3).not.toBe(token1)
  })

  it('rejects missing VAT at the resolver boundary used by generate (no silent 8.1%)', () => {
    expect(resolveProspectVatRate({ businessType: 'generic' }).ok).toBe(false)
    expect(
      resolveProspectVatRate({
        businessType: 'generic',
        selection: { vat_selection: { rate_percent: 8.1, source: 'explicit_selection' } },
      }),
    ).toMatchObject({ ok: true, rate: 8.1 })
  })

  it('tenant isolation: cleanup only allows prospect ingest paths under tenant prefix', () => {
    expect(isProspectIngestStoragePath('tenant-1/website/prospect-hero-abc.webp', 'tenant-1')).toBe(
      true,
    )
    expect(isProspectIngestStoragePath('tenant-2/website/prospect-hero-abc.webp', 'tenant-1')).toBe(
      false,
    )
    expect(isProspectIngestStoragePath('tenant-1/logo.png', 'tenant-1')).toBe(false)
    expect(isProspectIngestStoragePath('../etc/passwd', 'tenant-1')).toBe(false)
  })

  it('ensureWebsitePreviewToken: reuse vs deliberate rotation', async () => {
    const db = createMemoryDb()
    db.seed('website_tenants', 'w1', { id: 'w1' })
    const issued = await issueWebsitePreviewToken(db, 'w1')
    expect(issued).toBeTruthy()
    const url = previewUrlForPath('https://app.simy.ch', '/s/demo', issued!.token)
    const reused = await ensureWebsitePreviewToken(db, 'w1', { existingPreviewUrl: url })
    expect(reused?.reused).toBe(true)
    expect(reused?.token).toBe(issued!.token)
    const rotated = await ensureWebsitePreviewToken(db, 'w1', {
      existingPreviewUrl: url,
      forceRotate: true,
    })
    expect(rotated?.reused).toBe(false)
    expect(rotated?.token).not.toBe(issued!.token)
    expect(db.tables.get('website_tenants')!.get('w1')!.preview_token_hash).toBe(
      hashPreviewToken(rotated!.token),
    )
  })
})

describe('removeProspectUploadedPaths path policy', () => {
  it('documents allowlist via isProspectIngestStoragePath (real helper)', () => {
    // Orchestration uses the mocked remove; policy itself stays real via importOriginal.
    expect(isProspectIngestStoragePath('tenant-1/website/prospect-hero-a.webp', 'tenant-1')).toBe(true)
    expect(isProspectIngestStoragePath('evil/../x', 'tenant-1')).toBe(false)
    expect(isProspectIngestStoragePath('tenant-1/other.png', 'tenant-1')).toBe(false)
  })
})
