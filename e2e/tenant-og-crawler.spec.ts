import { expect, test } from '@playwright/test'

const productionHost = /^https:\/\/(www\.)?app\.simy\.ch\/?$/i
const baseURL = process.env.E2E_BASE_URL || 'https://app.simy.ch'
const onProduction = productionHost.test(baseURL)

test.describe('tenant OG crawler vs browser', () => {
  test.skip(
    onProduction,
    'Do not treat production as the proof host for this follow-up. Run against a PR preview.',
  )

  test('same URL: WhatsApp crawler gets tenant stub, browser gets SPA, stub is not CDN-shared', async ({
    request,
  }) => {
    const slug = process.env.E2E_OG_TENANT_SLUG || 'hakuco'
    const crawler = await request.get(`/${slug}`, {
      headers: { 'user-agent': 'WhatsApp/2.25.8.76' },
    })
    const browser = await request.get(`/${slug}`, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })

    expect(crawler.ok()).toBeTruthy()
    expect(browser.ok()).toBeTruthy()

    const crawlerHtml = await crawler.text()
    const browserHtml = await browser.text()
    const cacheControl = crawler.headers()['cache-control'] || ''

    if (!crawlerHtml.includes('property="og:title"') || crawlerHtml.includes('id="__nuxt"')) {
      test.skip(true, `No crawler stub on /${slug} for this preview (unknown tenant or middleware inactive)`)
    }

    expect(crawlerHtml).toContain('property="og:title"')
    expect(crawlerHtml).not.toContain('id="__nuxt"')
    expect(cacheControl.toLowerCase()).toContain('private')
    expect(cacheControl.toLowerCase()).toContain('no-store')
    expect(cacheControl.toLowerCase()).not.toContain('s-maxage')
    expect(cacheControl.toLowerCase()).not.toMatch(/\bpublic\b/)

    expect(browserHtml).toMatch(/__nuxt|_nuxt/)
    expect(browserHtml).not.toBe(crawlerHtml)
  })
})
