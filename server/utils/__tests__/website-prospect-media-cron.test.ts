import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ingestProspectMedia } from '../website-prospect-media'

const mocks = vi.hoisted(() => ({
  fetchProspectPlaceDetails: vi.fn(),
  upload: vi.fn(async () => ({ error: null })),
  safeFetchImage: vi.fn(),
}))

vi.mock('~/server/utils/website-prospect-place', () => ({
  fetchProspectPlaceDetails: mocks.fetchProspectPlaceDetails,
}))

vi.mock('~/server/utils/ssrf-guard', () => ({
  PROSPECT_IMAGE_MAX_BYTES: 12 * 1024 * 1024,
  safeFetchImage: mocks.safeFetchImage,
}))

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: () => ({
    storage: {
      from: () => ({
        upload: mocks.upload,
        getPublicUrl: () => ({ data: { publicUrl: 'https://cdn.example/stored.webp' } }),
      }),
    },
  }),
}))

vi.mock('~/server/utils/website-media-normalize', () => ({
  normalizeWebsiteMedia: async (input: Buffer) => ({ primary: input, webp: input }),
}))

const scrape = {
  hero_image_url: null,
  logo_url: null,
  images: [],
} as never

describe('prospect media place-photo policy', () => {
  afterEach(() => {
    mocks.fetchProspectPlaceDetails.mockReset()
    mocks.upload.mockClear()
    mocks.safeFetchImage.mockReset()
    vi.unstubAllGlobals()
    delete process.env.GOOGLE_MAPS_API_KEY
  })

  it('does not refetch Place Details or Place Photos for a places_cron shell', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-key'
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 500 }))
    const place = {
      place_id: 'place-cron',
      name: 'Fahrschule Cron',
      photos: [],
      reviews: [],
      opening_hours: [],
    }
    await ingestProspectMedia({
      tenantId: 'tenant-1',
      name: 'Fahrschule Cron',
      scrape,
      place: place as never,
      placeId: 'place-cron',
      refetchPlacePhotos: false,
    })
    expect(mocks.fetchProspectPlaceDetails).not.toHaveBeenCalled()
    const urls = fetchSpy.mock.calls.map((call) => String(call[0]))
    expect(urls.some((url) => url.includes('/place/photo'))).toBe(false)
    expect(urls.some((url) => url.includes('/place/details'))).toBe(false)
    expect(urls.some((url) => /reviews|opening_hours|photos/.test(url))).toBe(false)
    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it('still refetches Place Details and downloads Place Photos for a manual prospect', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-key'
    mocks.fetchProspectPlaceDetails.mockResolvedValue({
      place_id: 'place-manual',
      name: 'Fahrschule Manual',
      photos: [{ ref: 'photo-ref', width: 800, height: 600 }],
      reviews: [],
      opening_hours: [],
    })
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 404 }))
    await ingestProspectMedia({
      tenantId: 'tenant-1',
      name: 'Fahrschule Manual',
      scrape,
      place: {
        place_id: 'place-manual',
        name: 'Fahrschule Manual',
        photos: [],
      } as never,
      placeId: 'place-manual',
    })
    expect(mocks.fetchProspectPlaceDetails).toHaveBeenCalledTimes(1)
    expect(mocks.fetchProspectPlaceDetails).toHaveBeenCalledWith('place-manual')
    const photoCall = fetchSpy.mock.calls.find((call) => String(call[0]).includes('/place/photo'))
    expect(photoCall).toBeTruthy()
    expect(String(photoCall?.[0])).toContain('photo_reference=photo-ref')
  })

  it('does not store a non-image response', async () => {
    mocks.safeFetchImage.mockRejectedValue(new Error('content-type'))
    const media = await ingestProspectMedia({
      tenantId: 'tenant-1',
      name: 'Fahrschule Bild',
      scrape: {
        hero_image_url: 'https://cdn.example/not-an-image',
        logo_url: null,
        images: [],
      } as never,
      place: { photos: [] } as never,
      refetchPlacePhotos: false,
    })
    expect(media.hero_url).toBeNull()
    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it('wires places_cron generate to skip the Place Photo refill', () => {
    const src = readFileSync(resolve(process.cwd(), 'server/utils/website-prospect-generate.ts'), 'utf8')
    expect(src).toContain("refetchPlacePhotos: prospect.source !== 'places_cron'")
  })
})
