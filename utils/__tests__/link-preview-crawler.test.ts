import { describe, expect, it } from 'vitest'
import { isLinkPreviewCrawler, isSkippedTenantOgPath } from '../link-preview-crawler'

describe('isLinkPreviewCrawler', () => {
  it('detects WhatsApp and Facebook scrapers', () => {
    expect(isLinkPreviewCrawler('WhatsApp/2.25.8.76')).toBe(true)
    expect(
      isLinkPreviewCrawler('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'),
    ).toBe(true)
    expect(isLinkPreviewCrawler('Twitterbot/1.0')).toBe(true)
    expect(isLinkPreviewCrawler('Slackbot-LinkExpanding 1.0')).toBe(true)
  })

  it('does not treat in-app browsers as preview crawlers', () => {
    expect(
      isLinkPreviewCrawler(
        'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 WhatsApp/2.25.8.76',
      ),
    ).toBe(false)
    expect(
      isLinkPreviewCrawler(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 [FBAN/FBIOS;FBAV/1.0]',
      ),
    ).toBe(false)
  })

  it('does not treat browsers or Googlebot as preview crawlers', () => {
    expect(isLinkPreviewCrawler('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(false)
    expect(isLinkPreviewCrawler('Mozilla/5.0 (compatible; Googlebot/2.1; +http://google.com/bot.html)')).toBe(
      false,
    )
    expect(isLinkPreviewCrawler('')).toBe(false)
  })
})

describe('isSkippedTenantOgPath', () => {
  it('skips APIs, assets and nuxt internals', () => {
    expect(isSkippedTenantOgPath('/api/public/tenant/acme/og.png')).toBe(true)
    expect(isSkippedTenantOgPath('/_nuxt/entry.js')).toBe(true)
    expect(isSkippedTenantOgPath('/simy-logo.png')).toBe(true)
    expect(isSkippedTenantOgPath('/acme-fahrschule')).toBe(false)
    expect(isSkippedTenantOgPath('/booking/availability/acme')).toBe(false)
  })
})
