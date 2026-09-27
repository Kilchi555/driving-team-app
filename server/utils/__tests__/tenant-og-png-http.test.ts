import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, createRouter, toNodeListener } from 'h3'
import { TENANT_OG_PNG_CACHE_CONTROL, isSharedCdnCacheable, tenantOgImagePath } from '../tenant-og'

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const mocks = vi.hoisted(() => ({
  loadTenantOgSource: vi.fn(),
  renderWebsiteOgCard: vi.fn(),
}))

vi.mock('~/server/utils/tenant-og', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../tenant-og')>()
  return {
    ...actual,
    loadTenantOgSource: mocks.loadTenantOgSource,
  }
})

vi.mock('~/server/utils/website-og-card', () => ({
  renderWebsiteOgCard: mocks.renderWebsiteOgCard,
}))

const pngSrc = readFileSync(
  resolve(process.cwd(), 'server/api/public/tenant/[slug]/og.png.get.ts'),
  'utf8',
)

function listen(app: ReturnType<typeof createApp>): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const server = createServer(toNodeListener(app))
  return new Promise((resolveListen, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as AddressInfo
      resolveListen({
        baseUrl: `http://127.0.0.1:${addr.port}`,
        close: () =>
          new Promise((res, rej) => {
            server.close((err) => (err ? rej(err) : res()))
          }),
      })
    })
    server.on('error', reject)
  })
}

describe('tenant OG PNG HTTP', () => {
  let baseUrl = ''
  let close: () => Promise<void> = async () => {}

  beforeAll(async () => {
    const handler = (await import('~/server/api/public/tenant/[slug]/og.png.get')).default
    const app = createApp()
    const router = createRouter()
    router.get('/api/public/tenant/:slug/og.png', handler)
    app.use(router)
    const listening = await listen(app)
    baseUrl = listening.baseUrl
    close = listening.close
  })

  afterAll(async () => {
    await close()
  })

  beforeEach(() => {
    mocks.loadTenantOgSource.mockReset()
    mocks.renderWebsiteOgCard.mockReset()
    mocks.renderWebsiteOgCard.mockResolvedValue(PNG_MAGIC)
    mocks.loadTenantOgSource.mockImplementation(async (slug: string) => {
      if (slug === 'hakuco') {
        return { name: 'Hakuco', slug: 'hakuco', brand_name: 'Hakuco', business_type: 'dog_training' }
      }
      if (slug === 'fahrschule-gemperli') {
        return {
          name: 'Fahrschule Gemperli',
          slug: 'fahrschule-gemperli',
          brand_name: 'Fahrschule Gemperli',
          business_type: 'driving_school',
        }
      }
      return null
    })
  })

  it('source contract: PNG cache stays public and slug-scoped', () => {
    expect(pngSrc).toContain('TENANT_OG_PNG_CACHE_CONTROL')
    expect(pngSrc).toContain("source.slug.toLowerCase() !== slug")
    expect(tenantOgImagePath('hakuco')).toBe('/api/public/tenant/hakuco/og.png')
    expect(isSharedCdnCacheable(TENANT_OG_PNG_CACHE_CONTROL)).toBe(true)
  })

  it('H: returns image/png for the requested tenant slug only', async () => {
    const res = await fetch(`${baseUrl}/api/public/tenant/hakuco/og.png`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/png')
    expect(res.headers.get('cache-control')).toBe(TENANT_OG_PNG_CACHE_CONTROL)
    const body = Buffer.from(await res.arrayBuffer())
    expect(body.subarray(0, 8).equals(PNG_MAGIC)).toBe(true)
    expect(mocks.loadTenantOgSource).toHaveBeenCalledWith('hakuco')
    expect(mocks.loadTenantOgSource).not.toHaveBeenCalledWith('fahrschule-gemperli')
    expect(mocks.renderWebsiteOgCard).toHaveBeenCalledTimes(1)
    expect(mocks.renderWebsiteOgCard.mock.calls[0][0].brand).toBe('Hakuco')
  })

  it('does not serve tenant B bytes for tenant A URL', async () => {
    await fetch(`${baseUrl}/api/public/tenant/fahrschule-gemperli/og.png`)
    expect(mocks.loadTenantOgSource).toHaveBeenCalledWith('fahrschule-gemperli')
    expect(mocks.renderWebsiteOgCard.mock.calls[0][0].brand).toBe('Fahrschule Gemperli')
    expect(mocks.renderWebsiteOgCard.mock.calls[0][0].brand).not.toBe('Hakuco')
  })

  it('unknown tenant is 404, not another tenant image', async () => {
    const res = await fetch(`${baseUrl}/api/public/tenant/missing-school/og.png`)
    expect(res.status).toBe(404)
    expect(mocks.renderWebsiteOgCard).not.toHaveBeenCalled()
  })
})
