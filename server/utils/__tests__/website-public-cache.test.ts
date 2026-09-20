import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WEBSITE_NO_STORE_HEADERS } from '~/utils/website-ssr-route-policy'

const setHeader = vi.fn()

vi.mock('h3', () => ({
  setHeader: (...args: unknown[]) => setHeader(...args),
}))

describe('setWebsitePublicCache', () => {
  beforeEach(() => {
    setHeader.mockReset()
  })

  it('sets private no-store on preview/unpublished API responses', async () => {
    const { setWebsitePublicCache } = await import('../website-public-cache')
    const event = { id: 'preview' }
    setWebsitePublicCache(event, { preview: true })
    expect(setHeader).toHaveBeenCalledWith(event, 'Cache-Control', WEBSITE_NO_STORE_HEADERS['Cache-Control'])
    expect(setHeader).toHaveBeenCalledWith(
      event,
      'CDN-Cache-Control',
      WEBSITE_NO_STORE_HEADERS['CDN-Cache-Control'],
    )
    expect(setHeader).toHaveBeenCalledWith(
      event,
      'Vercel-CDN-Cache-Control',
      WEBSITE_NO_STORE_HEADERS['Vercel-CDN-Cache-Control'],
    )
    expect(setHeader).toHaveBeenCalledWith(event, 'Cache-Control', 'private, no-store')
  })

  it('keeps public edge cache headers for published API responses', async () => {
    const { setWebsitePublicCache } = await import('../website-public-cache')
    const event = { id: 'published' }
    setWebsitePublicCache(event, { preview: false, sMaxAge: 120, swr: 600 })
    expect(setHeader).toHaveBeenCalledWith(
      event,
      'Cache-Control',
      'public, max-age=0, s-maxage=120, stale-while-revalidate=600',
    )
    const cacheControlCalls = setHeader.mock.calls.filter((call) => call[1] === 'Cache-Control')
    expect(cacheControlCalls[0]?.[2]).not.toContain('no-store')
  })
})
