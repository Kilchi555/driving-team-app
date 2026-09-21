import { describe, expect, it } from 'vitest'
import {
  WEBSITE_PAGE_DRAFT_BLOCKS_KEY,
  buildWebsitePageContentWrite,
  editorSourceBlocks,
  overlayEditorDraftPage,
  publishedWebsiteProtectsLiveBlocks,
} from '../website-page-draft'

const liveBlocks = {
  seo: { title: 'Live', description: 'Public', keywords: 'live' },
  brand: { primary: '#111111' },
  blocks: [{ type: 'hero', content: { headline: 'Published hero' } }],
}

const draftBlocks = {
  seo: { title: 'Draft', description: 'Editor only', keywords: 'draft' },
  brand: { primary: '#222222' },
  blocks: [{ type: 'hero', content: { headline: 'Draft hero' } }],
}

function applyWrite(
  page: Record<string, unknown>,
  write: ReturnType<typeof buildWebsitePageContentWrite>,
) {
  return { ...page, ...write.pageUpdate }
}

describe('publishedWebsiteProtectsLiveBlocks', () => {
  it('protects only explicitly published websites', () => {
    expect(publishedWebsiteProtectsLiveBlocks({ is_published: true })).toBe(true)
    expect(publishedWebsiteProtectsLiveBlocks({ is_published: false })).toBe(false)
    expect(publishedWebsiteProtectsLiveBlocks({ is_published: null })).toBe(false)
    expect(publishedWebsiteProtectsLiveBlocks(null)).toBe(false)
  })
})

describe('draft write paths — slots-save / page PUT / wizard-save contract', () => {
  it('does not overwrite website_pages.blocks on a live website', () => {
    const page = {
      blocks: liveBlocks,
      addon_inputs: { city: 'Zürich' },
      title: 'Home',
      seo_title: 'Live',
      is_published: true,
      published_at: '2026-09-01T00:00:00.000Z',
    }
    const write = buildWebsitePageContentWrite({
      websiteIsPublished: true,
      currentPage: page,
      nextBlocks: draftBlocks,
      nextTitle: 'Home draft',
      nextSeoTitle: 'Draft',
      nextSeoDescription: 'Editor only',
      nextSeoKeywords: 'draft',
      now: '2026-09-21T08:00:00.000Z',
    })

    expect(write.touchesLiveBlocks).toBe(false)
    expect(write.allowWebsitePublicSync).toBe(false)
    expect(write.pageUpdate).not.toHaveProperty('blocks')
    expect(write.pageUpdate).not.toHaveProperty('is_published')
    expect(write.pageUpdate).not.toHaveProperty('seo_title')

    const next = applyWrite(page, write)
    expect(next.blocks).toEqual(liveBlocks)
    expect(next.is_published).toBe(true)
    expect((next.addon_inputs as Record<string, unknown>).city).toBe('Zürich')
    expect((next.addon_inputs as Record<string, unknown>)[WEBSITE_PAGE_DRAFT_BLOCKS_KEY]).toEqual(draftBlocks)
  })

  it('still writes website_pages.blocks for an unpublished website', () => {
    const page = {
      blocks: liveBlocks,
      addon_inputs: {},
      title: 'Home',
      is_published: false,
    }
    const write = buildWebsitePageContentWrite({
      websiteIsPublished: false,
      currentPage: page,
      nextBlocks: draftBlocks,
      nextTitle: 'Home',
      nextSeoTitle: 'Draft',
      nextIsPublished: false,
      nextPublishedAt: null,
      now: '2026-09-21T08:00:00.000Z',
    })
    expect(write.touchesLiveBlocks).toBe(true)
    expect(write.allowWebsitePublicSync).toBe(true)
    expect(write.pageUpdate.blocks).toEqual(draftBlocks)
    expect(applyWrite(page, write).blocks).toEqual(draftBlocks)
  })

  it('keeps public Strategy B input on the unchanged live blocks after a draft edit', () => {
    const publicPage = { blocks: structuredClone(liveBlocks), addon_inputs: {}, is_published: true }
    const write = buildWebsitePageContentWrite({
      websiteIsPublished: true,
      currentPage: publicPage,
      nextBlocks: draftBlocks,
      now: '2026-09-21T08:00:00.000Z',
    })
    const after = applyWrite(publicPage, write)
    // Public renderer still reads website_pages.blocks — this must stay the published payload.
    expect(after.blocks).toEqual(liveBlocks)
    expect(after.blocks).not.toEqual(draftBlocks)
  })

  it('lets the editor continue from the stored draft instead of the live blocks', () => {
    const page = {
      blocks: liveBlocks,
      addon_inputs: { [WEBSITE_PAGE_DRAFT_BLOCKS_KEY]: draftBlocks },
    }
    expect(editorSourceBlocks(page, true)).toEqual(draftBlocks)
    expect(editorSourceBlocks(page, false)).toEqual(liveBlocks)
    expect(overlayEditorDraftPage({
      ...page,
      seo_title: 'Live',
      addon_inputs: {
        [WEBSITE_PAGE_DRAFT_BLOCKS_KEY]: draftBlocks,
        draft_seo_title: 'Draft',
      },
    }, true)).toMatchObject({
      blocks: draftBlocks,
      seo_title: 'Draft',
    })
  })
})
