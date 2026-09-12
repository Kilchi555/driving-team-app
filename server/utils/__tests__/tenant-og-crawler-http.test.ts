import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, eventHandler, setHeader, toNodeListener } from 'h3'
import {
  isCrawlerStubCacheSafe,
  isSharedCdnCacheable,
} from '../tenant-og'

const mocks = vi.hoisted(() => ({
  loadTenantOgSource: vi.fn(),
}))

vi.mock('~/server/utils/tenant-og', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../tenant-og')>()
  return {
    ...actual,
    loadTenantOgSource: mocks.loadTenantOgSource,
  }
})

const SPA_HTML =
  '<!DOCTYPE html><html><head><title>Simy</title></head><body><div id="__nuxt"></div><script src="/_nuxt/entry.js"></script></body></html>'

const WHATSAPP_CRAWLER = 'WhatsApp/2.25.8.76'
const CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const WHATSAPP_IN_APP =
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 WhatsApp/2.25.8.76'

const hakuco = {
  id: 'tenant-a',
  name: 'Hakuco',
  slug: 'hakuco',
  brand_name: 'Hakuco',
  business_type: 'dog_training',
}

const gemperli = {
  id: 'tenant-b',
  name: 'Fahrschule Gemperli',
  slug: 'fahrschule-gemperli',
  brand_name: 'Fahrschule Gemperli',
  business_type: 'driving_school',
}

const middlewareSrc = readFileSync(
  resolve(process.cwd(), 'server/middleware/03.tenant-og-crawler.ts'),
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

describe('tenant OG crawler middleware HTTP', () => {
  let baseUrl = ''
  let close: () => Promise<void> = async () => {}

  beforeAll(async () => {
    const crawler = (await import('~/server/middleware/03.tenant-og-crawler')).default
    const app = createApp()
    app.use(crawler)
    app.use(
      eventHandler((event) => {
        setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
        setHeader(event, 'Cache-Control', 'no-cache')
        return SPA_HTML
      }),
    )
    const listening = await listen(app)
    baseUrl = listening.baseUrl
    close = listening.close
  })

  afterAll(async () => {
    await close()
  })

  beforeEach(() => {
    mocks.loadTenantOgSource.mockReset()
    mocks.loadTenantOgSource.mockImplementation(async (slug: string) => {
      if (slug === 'hakuco') return hakuco
      if (slug === 'fahrschule-gemperli') return gemperli
      return null
    })
  })

  it('source contract: stub is not publicly CDN-cacheable', () => {
    expect(middlewareSrc).toContain('tenantOgCrawlerStubHeaders')
    expect(middlewareSrc).not.toMatch(/s-maxage\s*=/)
    expect(middlewareSrc).not.toContain('"public,')
    expect(middlewareSrc).not.toContain("'public,")
    expect(middlewareSrc).not.toContain('stale-while-revalidate')
    expect(middlewareSrc).not.toContain('requireAuthenticatedUser')
    expect(middlewareSrc).not.toContain('ssr: true')
  })

  async function get(path: string, ua: string) {
    return fetch(`${baseUrl}${path}`, { headers: { 'user-agent': ua } })
  }

  it('A: crawler request receives the tenant OG stub', async () => {
    const res = await get('/hakuco', WHATSAPP_CRAWLER)
    const html = await res.text()
    expect(res.status).toBe(200)
    expect(html).toContain('property="og:title"')
    expect(html).toContain('content="Hakuco')
    expect(html).toContain('Training buchen')
    expect(html).toContain('/api/public/tenant/hakuco/og.png')
    expect(html).not.toContain('id="__nuxt"')
    expect(html).not.toContain('Driving Team')
    expect(mocks.loadTenantOgSource).toHaveBeenCalledWith('hakuco')
  })

  it('B: browser request falls through to the SPA', async () => {
    const res = await get('/hakuco', CHROME)
    const html = await res.text()
    expect(html).toBe(SPA_HTML)
    expect(html).toContain('id="__nuxt"')
    expect(html).not.toContain('property="og:title"')
    expect(mocks.loadTenantOgSource).not.toHaveBeenCalled()
  })

  it('WhatsApp in-app browser still receives the SPA, not the stub', async () => {
    const res = await get('/hakuco', WHATSAPP_IN_APP)
    const html = await res.text()
    expect(html).toBe(SPA_HTML)
    expect(mocks.loadTenantOgSource).not.toHaveBeenCalled()
  })

  it('C: unknown / inactive tenant falls through to the SPA', async () => {
    const res = await get('/does-not-exist-tenant', WHATSAPP_CRAWLER)
    const html = await res.text()
    expect(html).toBe(SPA_HTML)
    expect(mocks.loadTenantOgSource).toHaveBeenCalledWith('does-not-exist-tenant')
  })

  it('D/E: tenant A never receives tenant B branding', async () => {
    const a = await (await get('/hakuco', WHATSAPP_CRAWLER)).text()
    const b = await (await get('/fahrschule-gemperli', WHATSAPP_CRAWLER)).text()
    expect(a).toContain('Hakuco')
    expect(a).not.toContain('Gemperli')
    expect(b).toContain('Fahrschule Gemperli')
    expect(b).not.toContain('Hakuco')
    expect(a).toContain('/api/public/tenant/hakuco/og.png')
    expect(b).toContain('/api/public/tenant/fahrschule-gemperli/og.png')
  })

  it('F: crawler response cache headers are not shared-CDN cacheable', async () => {
    const res = await get('/hakuco', WHATSAPP_CRAWLER)
    const cacheControl = res.headers.get('cache-control')
    const cdn = res.headers.get('cdn-cache-control')
    const vercelCdn = res.headers.get('vercel-cdn-cache-control')
    expect(cacheControl).toBe('private, no-store')
    expect(cdn).toBe('private, no-store')
    expect(vercelCdn).toBe('private, no-store')
    expect(isCrawlerStubCacheSafe(cacheControl)).toBe(true)
    expect(isSharedCdnCacheable(cacheControl)).toBe(false)
    expect(isSharedCdnCacheable(cdn)).toBe(false)
  })

  it('G: a URL-only CDN cannot reuse the crawler stub for a later browser hit', async () => {
    const shared = new Map<string, string>()
    const crawler = await get('/hakuco', WHATSAPP_CRAWLER)
    const crawlerHtml = await crawler.text()
    const cacheControl = crawler.headers.get('cache-control') || ''
    if (isSharedCdnCacheable(cacheControl)) {
      shared.set('/hakuco', crawlerHtml)
    }

    expect(shared.has('/hakuco')).toBe(false)

    const browser = await get('/hakuco', CHROME)
    const browserHtml = await browser.text()
    const served = shared.get('/hakuco') || browserHtml
    expect(served).toBe(SPA_HTML)
    expect(served).not.toContain('property="og:title"')
    expect(crawlerHtml).toContain('property="og:title"')
  })

  it('does not intercept /s/** website SSR, login browsers, or booking browsers', async () => {
    const website = await (await get('/s/hakuco', WHATSAPP_CRAWLER)).text()
    const login = await (await get('/login/hakuco', CHROME)).text()
    const booking = await (await get('/booking/availability/hakuco', CHROME)).text()
    expect(website).toBe(SPA_HTML)
    expect(login).toBe(SPA_HTML)
    expect(booking).toBe(SPA_HTML)
    expect(mocks.loadTenantOgSource).not.toHaveBeenCalled()
  })

  it('still serves a crawler stub on public booking availability URLs', async () => {
    const html = await (await get('/booking/availability/hakuco', WHATSAPP_CRAWLER)).text()
    expect(html).toContain('Hakuco')
    expect(html).toContain('property="og:title"')
  })
})
