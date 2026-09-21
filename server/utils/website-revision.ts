import { createError } from 'h3'
import { isMissingWebsiteRelation } from '~/server/utils/website-lifecycle-audit'

export const WEBSITE_REVISION_STATUSES = ['draft', 'published', 'superseded'] as const
export type WebsiteRevisionStatus = (typeof WEBSITE_REVISION_STATUSES)[number]

export type WebsiteRevisionRow = {
  id: string
  website_id: string
  tenant_id: string
  version_number: number
  status: WebsiteRevisionStatus
  snapshot: WebsiteRevisionSnapshot
  source_revision_id: string | null
  created_at: string
  created_by: string | null
  published_at: string | null
  published_by: string | null
}

export type WebsiteRevisionPageSnapshot = {
  id: string
  slug: string
  title: string | null
  is_home: boolean
  page_type: string | null
  seo_title: string | null
  seo_description: string | null
  seo_keywords: string | null
  og_image: string | null
  blocks: unknown
  is_published: boolean
}

export type WebsiteRevisionSnapshot = {
  schema_version: 1
  captured_at: string
  website: {
    id: string
    subdomain: string
    seo_title: string | null
    seo_description: string | null
    seo_keywords: string | null
    primary_color: string | null
    secondary_color: string | null
    accent_color: string | null
    logo_url: string | null
    hero_image_url: string | null
  }
  pages: WebsiteRevisionPageSnapshot[]
}

type RevisionClient = { from: (table: string) => any }

export function assertOwnedWebsiteRevision(
  revision: { website_id?: string | null; tenant_id?: string | null } | null | undefined,
  opts: { websiteId: string; tenantId: string },
) {
  if (!revision?.website_id || !revision.tenant_id) return false
  return revision.website_id === opts.websiteId && revision.tenant_id === opts.tenantId
}

export function nextWebsiteVersionNumber(currentMax: number | null | undefined): number {
  const n = Number(currentMax || 0)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) + 1 : 1
}

export function buildWebsiteRevisionSnapshot(input: {
  website: {
    id: string
    subdomain: string
    seo_title?: string | null
    seo_description?: string | null
    seo_keywords?: string | null
    primary_color?: string | null
    secondary_color?: string | null
    accent_color?: string | null
    logo_url?: string | null
    hero_image_url?: string | null
  }
  pages: Array<Partial<WebsiteRevisionPageSnapshot> & { id?: string | null; slug?: string | null; blocks?: unknown }>
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
    pages: (input.pages || [])
      .filter((page) => page.id && page.slug)
      .map((page) => ({
        id: String(page.id),
        slug: String(page.slug),
        title: page.title ?? null,
        is_home: !!page.is_home,
        page_type: page.page_type ?? null,
        seo_title: page.seo_title ?? null,
        seo_description: page.seo_description ?? null,
        seo_keywords: page.seo_keywords ?? null,
        og_image: page.og_image ?? null,
        blocks: page.blocks ?? null,
        is_published: page.is_published !== false,
      })),
  }
}

export async function allocateWebsiteVersionNumber(
  supabase: RevisionClient,
  websiteId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from('website_revisions')
    .select('version_number')
    .eq('website_id', websiteId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error && !isMissingWebsiteRelation(error)) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
  if (error && isMissingWebsiteRelation(error)) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Website-Versionierung ist noch nicht provisioniert',
      data: { code: 'website_revisions_unprovisioned' },
    })
  }
  return nextWebsiteVersionNumber(data?.version_number)
}

export async function persistPublishedWebsiteRevision(opts: {
  supabase: RevisionClient
  websiteId: string
  tenantId: string
  snapshot: WebsiteRevisionSnapshot
  actorId?: string | null
  now?: string
  sourceRevisionId?: string | null
  attempt?: number
}): Promise<{ revision: WebsiteRevisionRow | null; skipped: boolean; idempotent: boolean }> {
  const attempt = opts.attempt || 1
  if (attempt > 4) {
    throw createError({ statusCode: 409, statusMessage: 'Revision konnte wegen eines Konflikts nicht gespeichert werden' })
  }
  const now = opts.now || new Date().toISOString()

  const { data: existingPublished, error: existingError } = await opts.supabase
    .from('website_revisions')
    .select('id, website_id, tenant_id, version_number, status, snapshot, source_revision_id, created_at, created_by, published_at, published_by')
    .eq('website_id', opts.websiteId)
    .eq('status', 'published')
    .maybeSingle()
  if (existingError && isMissingWebsiteRelation(existingError)) {
    return { revision: null, skipped: true, idempotent: false }
  }

  if (existingPublished && jsonEqual(existingPublished.snapshot, opts.snapshot)) {
    return { revision: existingPublished as WebsiteRevisionRow, skipped: false, idempotent: true }
  }

  let version = 1
  try {
    version = await allocateWebsiteVersionNumber(opts.supabase, opts.websiteId)
  } catch (err: any) {
    if (err?.statusCode === 503 || isMissingWebsiteRelation(err?.data) || isMissingWebsiteRelation(err)) {
      return { revision: null, skipped: true, idempotent: false }
    }
    throw err
  }

  if (existingPublished?.id) {
    const { error: supersedeError } = await opts.supabase
      .from('website_revisions')
      .update({ status: 'superseded' })
      .eq('id', existingPublished.id)
      .eq('website_id', opts.websiteId)
      .eq('tenant_id', opts.tenantId)
      .eq('status', 'published')
    if (supersedeError && !isMissingWebsiteRelation(supersedeError)) {
      throw createError({ statusCode: 500, statusMessage: supersedeError.message })
    }
  }

  const row = {
    website_id: opts.websiteId,
    tenant_id: opts.tenantId,
    version_number: version,
    status: 'published' as const,
    snapshot: opts.snapshot,
    source_revision_id: opts.sourceRevisionId || null,
    created_at: now,
    created_by: opts.actorId || null,
    published_at: now,
    published_by: opts.actorId || null,
  }

  const { data: inserted, error } = await opts.supabase
    .from('website_revisions')
    .insert(row)
    .select('id, website_id, tenant_id, version_number, status, snapshot, source_revision_id, created_at, created_by, published_at, published_by')
    .maybeSingle()

  if (error && isMissingWebsiteRelation(error)) {
    return { revision: null, skipped: true, idempotent: false }
  }
  if (error && (error.code === '23505' || /duplicate|unique/i.test(String(error.message || '')))) {
    return persistPublishedWebsiteRevision({ ...opts, attempt: attempt + 1 })
  }
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!inserted) throw createError({ statusCode: 500, statusMessage: 'Revision konnte nicht gespeichert werden' })

  await opts.supabase
    .from('website_tenants')
    .update({ published_revision_id: inserted.id })
    .eq('id', opts.websiteId)
    .eq('tenant_id', opts.tenantId)

  return { revision: inserted as WebsiteRevisionRow, skipped: false, idempotent: false }
}

export async function loadOwnedWebsiteRevision(opts: {
  supabase: RevisionClient
  revisionId: string
  websiteId: string
  tenantId: string
}): Promise<WebsiteRevisionRow> {
  const { data, error } = await opts.supabase
    .from('website_revisions')
    .select('id, website_id, tenant_id, version_number, status, snapshot, source_revision_id, created_at, created_by, published_at, published_by')
    .eq('id', opts.revisionId)
    .maybeSingle()
  if (error && isMissingWebsiteRelation(error)) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Website-Versionierung ist noch nicht provisioniert',
      data: { code: 'website_revisions_unprovisioned' },
    })
  }
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!assertOwnedWebsiteRevision(data, { websiteId: opts.websiteId, tenantId: opts.tenantId })) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Revision gehört nicht zu dieser Website',
      data: { code: 'website_revision_forbidden' },
    })
  }
  return data as WebsiteRevisionRow
}

export async function restoreWebsiteRevisionSnapshot(opts: {
  supabase: RevisionClient
  tenantId: string
  websiteId: string
  snapshot: WebsiteRevisionSnapshot
}) {
  if (opts.snapshot.website.id !== opts.websiteId) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Revision-Snapshot gehört nicht zu dieser Website',
      data: { code: 'website_revision_foreign_snapshot' },
    })
  }
  for (const page of opts.snapshot.pages) {
    const { error } = await opts.supabase
      .from('website_pages')
      .update({
        title: page.title,
        seo_title: page.seo_title,
        seo_description: page.seo_description,
        seo_keywords: page.seo_keywords,
        og_image: page.og_image,
        blocks: page.blocks,
        is_published: true,
      })
      .eq('id', page.id)
      .eq('website_id', opts.websiteId)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  }
  await opts.supabase
    .from('website_tenants')
    .update({
      seo_title: opts.snapshot.website.seo_title,
      seo_description: opts.snapshot.website.seo_description,
      seo_keywords: opts.snapshot.website.seo_keywords,
      last_published_at: new Date().toISOString(),
    })
    .eq('id', opts.websiteId)
    .eq('tenant_id', opts.tenantId)
}

export async function rollbackWebsiteRevision(opts: {
  supabase: RevisionClient
  tenantId: string
  websiteId: string
  targetRevisionId: string
  actorId?: string | null
}) {
  const target = await loadOwnedWebsiteRevision({
    supabase: opts.supabase,
    revisionId: opts.targetRevisionId,
    websiteId: opts.websiteId,
    tenantId: opts.tenantId,
  })
  await restoreWebsiteRevisionSnapshot({
    supabase: opts.supabase,
    tenantId: opts.tenantId,
    websiteId: opts.websiteId,
    snapshot: target.snapshot,
  })
  return persistPublishedWebsiteRevision({
    supabase: opts.supabase,
    websiteId: opts.websiteId,
    tenantId: opts.tenantId,
    snapshot: target.snapshot,
    actorId: opts.actorId,
    sourceRevisionId: target.id,
  })
}

function jsonEqual(left: unknown, right: unknown) {
  try {
    return JSON.stringify(left) === JSON.stringify(right)
  } catch {
    return false
  }
}
