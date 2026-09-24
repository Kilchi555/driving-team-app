import { describe, expect, it } from 'vitest'
import {
  WEBSITE_PAGE_DRAFT_BLOCKS_KEY,
  WEBSITE_PAGE_DRAFT_TITLE_KEY,
  applyHeroImageToLanding,
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

function applyHeroWrite(opts: {
  websiteIsPublished: boolean
  page: Record<string, unknown>
  heroUrl: string
  now?: string
}) {
  const source = editorSourceBlocks(opts.page as { blocks?: unknown; addon_inputs?: unknown }, opts.websiteIsPublished)
  const nextBlocks = applyHeroImageToLanding(source, { heroUrl: opts.heroUrl, source: 'stock' })
  const write = buildWebsitePageContentWrite({
    websiteIsPublished: opts.websiteIsPublished,
    currentPage: opts.page,
    nextBlocks,
    now: opts.now || '2026-09-21T11:00:00.000Z',
  })
  return { write, nextBlocks, after: applyWrite(opts.page, write) }
}

describe('apply-hero draft/published contract', () => {
  const oldHero = {
    seo: { title: 'Live', description: 'Public', keywords: 'live' },
    brand: { primary: '#111111', hero_image_url: 'https://cdn.example/old.jpg' },
    blocks: [{ type: 'hero', content: { headline: 'Published hero', image_url: 'https://cdn.example/old.jpg' } }],
  }
  const newHeroUrl = 'https://images.unsplash.com/new-hero.jpg'

  it('TEST A: live apply-hero writes draft hero and leaves public blocks unchanged', () => {
    const page = {
      blocks: structuredClone(oldHero),
      addon_inputs: { city: 'Zürich', photos: ['a.jpg'] },
      title: 'Home',
      is_published: true,
    }
    const { write, after } = applyHeroWrite({ websiteIsPublished: true, page, heroUrl: newHeroUrl })

    expect(write.touchesLiveBlocks).toBe(false)
    expect(write.pageUpdate).not.toHaveProperty('blocks')
    expect(after.blocks).toEqual(oldHero)
    const draft = (after.addon_inputs as Record<string, any>)[WEBSITE_PAGE_DRAFT_BLOCKS_KEY]
    expect(draft.brand.hero_image_url).toBe(newHeroUrl)
    expect(draft.blocks[0].content.image_url).toBe(newHeroUrl)
    expect((after.addon_inputs as Record<string, unknown>).city).toBe('Zürich')
    expect((after.addon_inputs as Record<string, unknown>).photos).toEqual(['a.jpg'])
  })

  it('TEST B: unpublished apply-hero still writes live blocks', () => {
    const page = {
      blocks: structuredClone(oldHero),
      addon_inputs: { city: 'Bern' },
      title: 'Home',
      is_published: false,
    }
    const { write, after } = applyHeroWrite({ websiteIsPublished: false, page, heroUrl: newHeroUrl })
    expect(write.touchesLiveBlocks).toBe(true)
    expect(write.allowWebsitePublicSync).toBe(true)
    expect((after.blocks as any).brand.hero_image_url).toBe(newHeroUrl)
    expect(write.pageUpdate).not.toHaveProperty('addon_inputs')
  })

  it('TEST C: after live apply-hero public blocks stay OLD and editor source is NEW', () => {
    const page = {
      blocks: structuredClone(oldHero),
      addon_inputs: {},
    }
    const { after } = applyHeroWrite({ websiteIsPublished: true, page, heroUrl: newHeroUrl })
    expect(after.blocks).toEqual(oldHero)
    expect(editorSourceBlocks(after as { blocks?: unknown; addon_inputs?: unknown }, true)).toMatchObject({
      brand: { hero_image_url: newHeroUrl },
    })
    expect(editorSourceBlocks(after as { blocks?: unknown; addon_inputs?: unknown }, false)).toEqual(oldHero)
  })

  it('TEST D: live apply-hero preserves sibling addon_inputs and existing draft_* keys', () => {
    const existingDraft = {
      ...structuredClone(oldHero),
      brand: { ...oldHero.brand, hero_image_url: 'https://cdn.example/draft-old.jpg' },
    }
    const page = {
      blocks: structuredClone(oldHero),
      addon_inputs: {
        city: 'Zürich',
        photos: ['keep.jpg'],
        [WEBSITE_PAGE_DRAFT_TITLE_KEY]: 'Keep this title',
        [WEBSITE_PAGE_DRAFT_BLOCKS_KEY]: existingDraft,
      },
    }
    const { after } = applyHeroWrite({ websiteIsPublished: true, page, heroUrl: newHeroUrl })
    const inputs = after.addon_inputs as Record<string, any>
    expect(inputs.city).toBe('Zürich')
    expect(inputs.photos).toEqual(['keep.jpg'])
    expect(inputs[WEBSITE_PAGE_DRAFT_TITLE_KEY]).toBe('Keep this title')
    expect(inputs[WEBSITE_PAGE_DRAFT_BLOCKS_KEY].brand.hero_image_url).toBe(newHeroUrl)
    expect(Object.keys(inputs).sort()).toEqual(['city', 'draft_blocks', 'draft_title', 'photos'].sort())
  })

  it('TEST F: live apply-hero must not sync public website_tenants.hero_image_url', () => {
    const live = applyHeroWrite({
      websiteIsPublished: true,
      page: { blocks: structuredClone(oldHero), addon_inputs: {} },
      heroUrl: newHeroUrl,
    })
    expect(live.write.allowWebsitePublicSync).toBe(false)

    const unpublished = applyHeroWrite({
      websiteIsPublished: false,
      page: { blocks: structuredClone(oldHero), addon_inputs: {} },
      heroUrl: newHeroUrl,
    })
    expect(unpublished.write.allowWebsitePublicSync).toBe(true)
  })
})
