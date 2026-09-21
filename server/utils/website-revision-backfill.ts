import { createError } from 'h3'
import { isMissingWebsiteRelation, recordWebsiteLifecycleEvent } from '~/server/utils/website-lifecycle-audit'
import {
  allocateWebsiteVersionNumber,
  jsonEqual,
  revisionSnapshotContentEqual,
  type WebsiteRevisionPageSnapshot,
  type WebsiteRevisionRow,
  type WebsiteRevisionSnapshot,
} from '~/server/utils/website-revision'

type BackfillClient = { from: (table: string) => any }

export type WebsiteBackfillHomepage = {
  id: string
  slug: string
  title?: string | null
  is_home?: boolean | null
  page_type?: string | null
  seo_title?: string | null
  seo_description?: string | null
  seo_keywords?: string | null
  og_image?: string | null
  blocks: unknown
  is_published?: boolean | null
}

export type WebsiteBackfillVerification = {
  website: string
  sourcePage: string | null
  revision: string | null
  jsonEqual: boolean
  tenantMatch: boolean
  pointerValid: boolean
  unpublishedPreserved: boolean
}

export type WebsiteBackfillResult = {
  status: 'created' | 'idempotent' | 'skipped' | 'stopped'
  reason?:
    | 'unpublished'
    | 'unprovisioned'
    | 'homepage_missing'
    | 'homepage_ambiguous'
    | 'invalid_source_json'
    | 'tenant_mismatch'
    | 'snapshot_mismatch'
    | 'foreign_website'
  revision: WebsiteRevisionRow | null
  pointerSet: boolean
  verification: WebsiteBackfillVerification
}

const PAGE_COLUMNS = 'id, slug, title, is_home, page_type, seo_title, seo_description, seo_keywords, og_image, blocks, is_published'

export function isDeterministicHomepage(page: {
  is_home?: boolean | null
  slug?: string | null
  page_type?: string | null
}) {
  return page.is_home === true && String(page.slug || '') === 'index' && page.page_type === 'home'
}

export function selectDeterministicHomepage<T extends {
  is_home?: boolean | null
  slug?: string | null
  page_type?: string | null
}>(pages: T[]): { homepage: T } {
  const matches = (pages || []).filter(isDeterministicHomepage)
  if (matches.length === 0) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Homepage nicht eindeutig bestimmbar',
      data: { code: 'website_backfill_homepage_missing' },
    })
  }
  if (matches.length > 1) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Mehrere Homepages — Backfill gestoppt',
      data: { code: 'website_backfill_homepage_ambiguous' },
    })
  }
  return { homepage: matches[0] }
}

export function assertLosslessHomepageSnapshot(sourceBlocks: unknown, snapshot: WebsiteRevisionSnapshot) {
  const home = snapshot.pages.find((page) => isDeterministicHomepage(page))
  if (!home) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Snapshot enthält keine deterministische Homepage',
      data: { code: 'website_backfill_snapshot_home_missing' },
    })
  }
  if (!jsonEqual(sourceBlocks, home.blocks)) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Snapshot weicht von website_pages.blocks ab',
      data: { code: 'website_backfill_snapshot_mismatch' },
    })
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export function sourceBlocksAreSnapshotable(blocks: unknown) {
  if (!isPlainObject(blocks)) return false
  const landing = blocks as { seo?: unknown; brand?: unknown; blocks?: unknown }
  return isPlainObject(landing.seo)
    && isPlainObject(landing.brand)
    && Array.isArray(landing.blocks)
    && landing.blocks.length > 0
}

export const WEBSITE_REVISION_IMMUTABILITY = {
  APPLICATION_ENFORCED_IMMUTABILITY: 'YES',
  DATABASE_ENFORCED_IMMUTABILITY: 'NO',
} as const

export function formatWebsiteBackfillVerificationMatrix(results: WebsiteBackfillResult[]) {
  const header = '| Website | Source Page | Revision | JSON Equal | Tenant Match | Pointer Valid |'
  const sep = '| ------- | ----------- | -------- | ---------: | -----------: | ------------: |'
  const rows = results.map((result) => {
    const v = result.verification
    return `| ${v.website} | ${v.sourcePage || '—'} | ${v.revision || '—'} | ${v.jsonEqual ? 'yes' : 'no'} | ${v.tenantMatch ? 'yes' : 'no'} | ${v.pointerValid ? 'yes' : 'no'} |`
  })
  return [header, sep, ...rows].join('\n')
}

export function buildLosslessWebsiteRevisionSnapshot(input: {
  website: {
    id: string
    subdomain: string
    custom_domain?: string | null
    seo_title?: string | null
    seo_description?: string | null
    seo_keywords?: string | null
    primary_color?: string | null
    secondary_color?: string | null
    accent_color?: string | null
    logo_url?: string | null
    hero_image_url?: string | null
  }
  pages: WebsiteBackfillHomepage[]
  now?: string
}): WebsiteRevisionSnapshot {
  return {
    schema_version: 1,
    captured_at: input.now || new Date().toISOString(),
    website: {
      id: input.website.id,
      subdomain: input.website.subdomain,
      seo_title: input.website.seo_title ?? null,
      seo_description: input.website.seo_description ?? null,
      seo_keywords: input.website.seo_keywords ?? null,
      primary_color: input.website.primary_color ?? null,
      secondary_color: input.website.secondary_color ?? null,
      accent_color: input.website.accent_color ?? null,
      logo_url: input.website.logo_url ?? null,
      hero_image_url: input.website.hero_image_url ?? null,
    },
    pages: input.pages
      .filter((page) => page.id && page.slug)
      .map((page): WebsiteRevisionPageSnapshot => ({
        id: String(page.id),
        slug: String(page.slug),
        title: page.title ?? null,
        is_home: page.is_home === true,
        page_type: page.page_type ?? null,
        seo_title: page.seo_title ?? null,
        seo_description: page.seo_description ?? null,
        seo_keywords: page.seo_keywords ?? null,
        og_image: page.og_image ?? null,
        blocks: page.blocks,
        is_published: page.is_published === true,
      })),
  }
}

function emptyVerification(website: string): WebsiteBackfillVerification {
  return {
    website,
    sourcePage: null,
    revision: null,
    jsonEqual: false,
    tenantMatch: false,
    pointerValid: false,
    unpublishedPreserved: true,
  }
}

/**
 * Strategy B backfill for one website. Never called against production by this PR.
 * Does not change public read paths. Sets published_revision_id only after snapshot verify.
 */
export async function backfillPublishedWebsiteRevision(opts: {
  supabase: BackfillClient
  websiteId: string
  tenantId: string
  actorId?: string | null
  now?: string
  attempt?: number
}): Promise<WebsiteBackfillResult> {
  const attempt = opts.attempt || 1
  if (attempt > 4) {
    throw createError({ statusCode: 409, statusMessage: 'Backfill-Konflikt — gestoppt' })
  }

  const { data: website, error: websiteError } = await opts.supabase
    .from('website_tenants')
    .select('id, tenant_id, subdomain, custom_domain, is_published, published_revision_id, seo_title, seo_description, seo_keywords, primary_color, secondary_color, accent_color, logo_url, hero_image_url')
    .eq('id', opts.websiteId)
    .eq('tenant_id', opts.tenantId)
    .maybeSingle()

  if (websiteError && isMissingWebsiteRelation(websiteError)) {
    return {
      status: 'skipped',
      reason: 'unprovisioned',
      revision: null,
      pointerSet: false,
      verification: emptyVerification(opts.websiteId),
    }
  }
  if (websiteError) throw createError({ statusCode: 500, statusMessage: websiteError.message })
  if (!website) {
    return {
      status: 'stopped',
      reason: 'foreign_website',
      revision: null,
      pointerSet: false,
      verification: emptyVerification(opts.websiteId),
    }
  }
  if (website.tenant_id !== opts.tenantId || website.id !== opts.websiteId) {
    return {
      status: 'stopped',
      reason: 'tenant_mismatch',
      revision: null,
      pointerSet: false,
      verification: emptyVerification(opts.websiteId),
    }
  }
  if (website.is_published !== true) {
    return {
      status: 'skipped',
      reason: 'unpublished',
      revision: null,
      pointerSet: false,
      verification: {
        ...emptyVerification(website.id),
        unpublishedPreserved: website.published_revision_id == null,
      },
    }
  }

  const { data: pages, error: pageError } = await opts.supabase
    .from('website_pages')
    .select(PAGE_COLUMNS)
    .eq('website_id', website.id)
  if (pageError) throw createError({ statusCode: 500, statusMessage: pageError.message })

  let homepage: WebsiteBackfillHomepage
  try {
    homepage = selectDeterministicHomepage((pages || []) as WebsiteBackfillHomepage[]).homepage
  } catch (err: any) {
    const code = err?.data?.code
    return {
      status: 'stopped',
      reason: code === 'website_backfill_homepage_ambiguous' ? 'homepage_ambiguous' : 'homepage_missing',
      revision: null,
      pointerSet: false,
      verification: emptyVerification(website.id),
    }
  }

  if (!sourceBlocksAreSnapshotable(homepage.blocks)) {
    return {
      status: 'stopped',
      reason: 'invalid_source_json',
      revision: null,
      pointerSet: false,
      verification: { ...emptyVerification(website.id), sourcePage: homepage.id },
    }
  }

  const snapshot = buildLosslessWebsiteRevisionSnapshot({
    website,
    pages: (pages || []) as WebsiteBackfillHomepage[],
    now: opts.now,
  })
  assertLosslessHomepageSnapshot(homepage.blocks, snapshot)

  const { data: existingPublished, error: existingError } = await opts.supabase
    .from('website_revisions')
    .select('id, website_id, tenant_id, version_number, status, snapshot, source_revision_id, created_at, created_by, published_at, published_by')
    .eq('website_id', website.id)
    .eq('tenant_id', opts.tenantId)
    .eq('status', 'published')
    .maybeSingle()

  if (existingError && isMissingWebsiteRelation(existingError)) {
    return {
      status: 'skipped',
      reason: 'unprovisioned',
      revision: null,
      pointerSet: false,
      verification: { ...emptyVerification(website.id), sourcePage: homepage.id },
    }
  }
  if (existingError) throw createError({ statusCode: 500, statusMessage: existingError.message })

  if (existingPublished) {
    if (existingPublished.tenant_id !== opts.tenantId || existingPublished.website_id !== website.id) {
      return {
        status: 'stopped',
        reason: 'tenant_mismatch',
        revision: null,
        pointerSet: false,
        verification: { ...emptyVerification(website.id), sourcePage: homepage.id },
      }
    }
    const homeFromExisting = (existingPublished.snapshot as WebsiteRevisionSnapshot)?.pages?.find(isDeterministicHomepage)
    const sameSource = homeFromExisting ? jsonEqual(homeFromExisting.blocks, homepage.blocks) : false
    if (!sameSource) {
      return {
        status: 'stopped',
        reason: 'snapshot_mismatch',
        revision: existingPublished as WebsiteRevisionRow,
        pointerSet: false,
        verification: {
          website: website.id,
          sourcePage: homepage.id,
          revision: existingPublished.id,
          jsonEqual: false,
          tenantMatch: true,
          pointerValid: website.published_revision_id === existingPublished.id,
          unpublishedPreserved: true,
        },
      }
    }
    const pointerSet = await setPublishedRevisionPointer({
      supabase: opts.supabase,
      websiteId: website.id,
      tenantId: opts.tenantId,
      revisionId: existingPublished.id,
    })
    return {
      status: 'idempotent',
      revision: existingPublished as WebsiteRevisionRow,
      pointerSet,
      verification: {
        website: website.id,
        sourcePage: homepage.id,
        revision: existingPublished.id,
        jsonEqual: true,
        tenantMatch: true,
        pointerValid: pointerSet,
        unpublishedPreserved: true,
      },
    }
  }

  let version = 1
  try {
    version = await allocateWebsiteVersionNumber(opts.supabase, website.id)
  } catch (err: any) {
    if (err?.statusCode === 503) {
      return {
        status: 'skipped',
        reason: 'unprovisioned',
        revision: null,
        pointerSet: false,
        verification: { ...emptyVerification(website.id), sourcePage: homepage.id },
      }
    }
    throw err
  }

  const row = {
    website_id: website.id,
    tenant_id: opts.tenantId,
    version_number: version,
    status: 'published' as const,
    snapshot,
    source_revision_id: null,
    created_at: opts.now || new Date().toISOString(),
    created_by: opts.actorId || null,
    published_at: opts.now || new Date().toISOString(),
    published_by: opts.actorId || null,
  }

  const { data: inserted, error: insertError } = await opts.supabase
    .from('website_revisions')
    .insert(row)
    .select('id, website_id, tenant_id, version_number, status, snapshot, source_revision_id, created_at, created_by, published_at, published_by')
    .maybeSingle()

  if (insertError && isMissingWebsiteRelation(insertError)) {
    return {
      status: 'skipped',
      reason: 'unprovisioned',
      revision: null,
      pointerSet: false,
      verification: { ...emptyVerification(website.id), sourcePage: homepage.id },
    }
  }
  if (insertError && (insertError.code === '23505' || /duplicate|unique/i.test(String(insertError.message || '')))) {
    return backfillPublishedWebsiteRevision({ ...opts, attempt: attempt + 1 })
  }
  if (insertError) throw createError({ statusCode: 500, statusMessage: insertError.message })
  if (!inserted) throw createError({ statusCode: 500, statusMessage: 'Revision konnte nicht gespeichert werden' })

  const created = inserted as WebsiteRevisionRow
  if (created.tenant_id !== opts.tenantId || created.website_id !== website.id) {
    return {
      status: 'stopped',
      reason: 'tenant_mismatch',
      revision: created,
      pointerSet: false,
      verification: { ...emptyVerification(website.id), sourcePage: homepage.id, revision: created.id },
    }
  }
  try {
    assertLosslessHomepageSnapshot(homepage.blocks, created.snapshot)
  } catch {
    return {
      status: 'stopped',
      reason: 'snapshot_mismatch',
      revision: created,
      pointerSet: false,
      verification: {
        website: website.id,
        sourcePage: homepage.id,
        revision: created.id,
        jsonEqual: false,
        tenantMatch: true,
        pointerValid: false,
        unpublishedPreserved: true,
      },
    }
  }
  if (!revisionSnapshotContentEqual(created.snapshot, snapshot)) {
    return {
      status: 'stopped',
      reason: 'snapshot_mismatch',
      revision: created,
      pointerSet: false,
      verification: {
        website: website.id,
        sourcePage: homepage.id,
        revision: created.id,
        jsonEqual: false,
        tenantMatch: true,
        pointerValid: false,
        unpublishedPreserved: true,
      },
    }
  }

  const pointerSet = await setPublishedRevisionPointer({
    supabase: opts.supabase,
    websiteId: website.id,
    tenantId: opts.tenantId,
    revisionId: created.id,
  })

  await recordWebsiteLifecycleEvent({
    supabase: opts.supabase,
    event: 'published',
    websiteId: website.id,
    tenantId: opts.tenantId,
    revisionId: created.id,
    actorId: opts.actorId,
    metadata: { source: 'strategy_b_backfill', version_number: created.version_number },
  }).catch(() => undefined)

  return {
    status: 'created',
    revision: created,
    pointerSet,
    verification: {
      website: website.id,
      sourcePage: homepage.id,
      revision: created.id,
      jsonEqual: true,
      tenantMatch: true,
      pointerValid: pointerSet,
      unpublishedPreserved: true,
    },
  }
}

export async function backfillPublishedWebsiteRevisions(opts: {
  supabase: BackfillClient
  actorId?: string | null
  now?: string
}) {
  const { data: published, error } = await opts.supabase
    .from('website_tenants')
    .select('id, tenant_id, is_published, custom_domain')
    .eq('is_published', true)
  if (error && isMissingWebsiteRelation(error)) {
    return { results: [] as WebsiteBackfillResult[], unprovisioned: true }
  }
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const results: WebsiteBackfillResult[] = []
  for (const site of published || []) {
    results.push(await backfillPublishedWebsiteRevision({
      supabase: opts.supabase,
      websiteId: site.id,
      tenantId: site.tenant_id,
      actorId: opts.actorId,
      now: opts.now,
    }))
  }
  return { results, unprovisioned: false }
}

async function setPublishedRevisionPointer(opts: {
  supabase: BackfillClient
  websiteId: string
  tenantId: string
  revisionId: string
}) {
  const { data, error } = await opts.supabase
    .from('website_tenants')
    .update({ published_revision_id: opts.revisionId })
    .eq('id', opts.websiteId)
    .eq('tenant_id', opts.tenantId)
    .eq('is_published', true)
    .select('id, published_revision_id')
    .maybeSingle()
  if (error && isMissingWebsiteRelation(error)) return false
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data?.published_revision_id === opts.revisionId
}
