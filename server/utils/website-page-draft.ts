/**
 * Live-site draft writes without touching website_pages.blocks.
 * Public renderer stays on Strategy B (live blocks). No new table/column.
 * Draft payload lives under the existing website_pages.addon_inputs jsonb.
 */

export const WEBSITE_PAGE_DRAFT_BLOCKS_KEY = 'draft_blocks'
export const WEBSITE_PAGE_DRAFT_SEO_TITLE_KEY = 'draft_seo_title'
export const WEBSITE_PAGE_DRAFT_SEO_DESCRIPTION_KEY = 'draft_seo_description'
export const WEBSITE_PAGE_DRAFT_SEO_KEYWORDS_KEY = 'draft_seo_keywords'
export const WEBSITE_PAGE_DRAFT_TITLE_KEY = 'draft_title'
export const WEBSITE_PAGE_DRAFT_OG_IMAGE_KEY = 'draft_og_image'

export type WebsitePageDraftSource = {
  blocks?: unknown
  addon_inputs?: unknown
  title?: string | null
  seo_title?: string | null
  seo_description?: string | null
  seo_keywords?: string | null
  og_image?: string | null
  is_published?: boolean | null
  published_at?: string | null
}

export function publishedWebsiteProtectsLiveBlocks(website: { is_published?: boolean | null } | null | undefined) {
  return website?.is_published === true
}

export function readAddonInputs(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return { ...(value as Record<string, unknown>) }
}

export function readPageDraftBlocks(page: { addon_inputs?: unknown } | null | undefined): unknown {
  const draft = readAddonInputs(page?.addon_inputs)[WEBSITE_PAGE_DRAFT_BLOCKS_KEY]
  return draft === undefined ? null : draft
}

export function editorSourceBlocks(
  page: { blocks?: unknown; addon_inputs?: unknown },
  websiteIsPublished: boolean,
) {
  if (!websiteIsPublished) return page.blocks
  const draft = readPageDraftBlocks(page)
  return draft == null ? page.blocks : draft
}

export function overlayEditorDraftPage<T extends WebsitePageDraftSource>(
  page: T,
  websiteIsPublished: boolean,
): T {
  if (!websiteIsPublished) return page
  const inputs = readAddonInputs(page.addon_inputs)
  const draft = inputs[WEBSITE_PAGE_DRAFT_BLOCKS_KEY]
  if (draft == null) return page
  return {
    ...page,
    blocks: draft,
    title: typeof inputs[WEBSITE_PAGE_DRAFT_TITLE_KEY] === 'string'
      ? String(inputs[WEBSITE_PAGE_DRAFT_TITLE_KEY])
      : page.title,
    seo_title: typeof inputs[WEBSITE_PAGE_DRAFT_SEO_TITLE_KEY] === 'string'
      ? String(inputs[WEBSITE_PAGE_DRAFT_SEO_TITLE_KEY])
      : page.seo_title,
    seo_description: typeof inputs[WEBSITE_PAGE_DRAFT_SEO_DESCRIPTION_KEY] === 'string'
      ? String(inputs[WEBSITE_PAGE_DRAFT_SEO_DESCRIPTION_KEY])
      : page.seo_description,
    seo_keywords: typeof inputs[WEBSITE_PAGE_DRAFT_SEO_KEYWORDS_KEY] === 'string'
      ? String(inputs[WEBSITE_PAGE_DRAFT_SEO_KEYWORDS_KEY])
      : page.seo_keywords,
    og_image: typeof inputs[WEBSITE_PAGE_DRAFT_OG_IMAGE_KEY] === 'string'
      ? String(inputs[WEBSITE_PAGE_DRAFT_OG_IMAGE_KEY])
      : page.og_image,
  }
}

export function buildWebsitePageContentWrite(opts: {
  websiteIsPublished: boolean
  currentPage: WebsitePageDraftSource
  nextBlocks: unknown
  nextTitle?: string | null
  nextSeoTitle?: string | null
  nextSeoDescription?: string | null
  nextSeoKeywords?: string | null
  nextOgImage?: string | null
  nextIsPublished?: boolean | null
  nextPublishedAt?: string | null
  extraLiveFields?: Record<string, unknown>
  now: string
}): {
  pageUpdate: Record<string, unknown>
  touchesLiveBlocks: boolean
  allowWebsitePublicSync: boolean
} {
  if (!opts.websiteIsPublished) {
    return {
      pageUpdate: {
        ...(opts.extraLiveFields || {}),
        blocks: opts.nextBlocks,
        title: opts.nextTitle ?? opts.currentPage.title,
        seo_title: opts.nextSeoTitle ?? opts.currentPage.seo_title,
        seo_description: opts.nextSeoDescription ?? opts.currentPage.seo_description,
        seo_keywords: opts.nextSeoKeywords ?? opts.currentPage.seo_keywords,
        og_image: opts.nextOgImage ?? opts.currentPage.og_image,
        is_published: opts.nextIsPublished ?? opts.currentPage.is_published,
        published_at: opts.nextPublishedAt ?? opts.currentPage.published_at,
        updated_at: opts.now,
      },
      touchesLiveBlocks: true,
      allowWebsitePublicSync: true,
    }
  }

  const inputs = readAddonInputs(opts.currentPage.addon_inputs)
  inputs[WEBSITE_PAGE_DRAFT_BLOCKS_KEY] = opts.nextBlocks
  if (opts.nextTitle != null) inputs[WEBSITE_PAGE_DRAFT_TITLE_KEY] = opts.nextTitle
  if (opts.nextSeoTitle != null) inputs[WEBSITE_PAGE_DRAFT_SEO_TITLE_KEY] = opts.nextSeoTitle
  if (opts.nextSeoDescription != null) inputs[WEBSITE_PAGE_DRAFT_SEO_DESCRIPTION_KEY] = opts.nextSeoDescription
  if (opts.nextSeoKeywords != null) inputs[WEBSITE_PAGE_DRAFT_SEO_KEYWORDS_KEY] = opts.nextSeoKeywords
  if (opts.nextOgImage != null) inputs[WEBSITE_PAGE_DRAFT_OG_IMAGE_KEY] = opts.nextOgImage

  return {
    pageUpdate: {
      addon_inputs: inputs,
      updated_at: opts.now,
    },
    touchesLiveBlocks: false,
    allowWebsitePublicSync: false,
  }
}
