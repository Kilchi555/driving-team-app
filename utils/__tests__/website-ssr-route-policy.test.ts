import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  WEBSITE_NO_STORE_HEADERS,
  WEBSITE_PUBLIC_SSR_PATH,
  shouldApplyWebsitePreviewNoStore,
  vercelWritesIsrPrerenderConfig,
  websiteHtmlResponsesShareIsrCache,
  websitePublicSsrRouteRule,
  websiteSsrUsesSharedIsr,
} from '../website-ssr-route-policy'

const root = resolve(process.cwd())

describe('website SSR cache isolation policy', () => {
  it('disables ISR and advertises no shared HTML cache for /s/**', () => {
    expect(WEBSITE_PUBLIC_SSR_PATH).toBe('/s/**')
    expect(websitePublicSsrRouteRule.ssr).toBe(true)
    expect(websitePublicSsrRouteRule.isr).toBe(false)
    expect(websiteSsrUsesSharedIsr()).toBe(false)
    expect(vercelWritesIsrPrerenderConfig(websitePublicSsrRouteRule.isr)).toBe(false)
    expect(websitePublicSsrRouteRule.headers).toEqual(WEBSITE_NO_STORE_HEADERS)
    expect(WEBSITE_NO_STORE_HEADERS['Cache-Control']).toBe('private, no-store')
    expect(WEBSITE_NO_STORE_HEADERS['CDN-Cache-Control']).toBe('private, no-store')
    expect(WEBSITE_NO_STORE_HEADERS['Vercel-CDN-Cache-Control']).toBe('private, no-store')
  })

  it('is the route rule actually wired into nuxt.config.ts', () => {
    const src = readFileSync(resolve(root, 'nuxt.config.ts'), 'utf8')
    expect(src).toContain("import { websitePublicSsrRouteRule } from './utils/website-ssr-route-policy'")
    expect(src).toContain("'/s/**': { ...websitePublicSsrRouteRule }")
    expect(src).not.toMatch(/isr:\s*60/)
    expect(src).not.toMatch(/s-maxage=60,\s*stale-while-revalidate=300/)
  })

  it('matches Nitro 2.13.4 Vercel ISR generation: falsy isr skips prerender-config and uses FALLBACK_ROUTE', () => {
    const nitroVercel = readFileSync(
      resolve(root, 'node_modules/nitropack/dist/presets/vercel/utils.mjs'),
      'utf8',
    )
    expect(nitroVercel).toContain('if (!value.isr) {\n      continue;')
    expect(nitroVercel).toContain('value.isr === false')
    expect(nitroVercel).toContain('dest: FALLBACK_ROUTE')
    expect(nitroVercel).toContain('.prerender-config.json')
  })

  it('cannot share an ISR cache entry between anonymous and preview URLs', () => {
    expect(websiteHtmlResponsesShareIsrCache('/s/example', '/s/example?preview=TOKEN')).toBe(false)
    expect(websiteHtmlResponsesShareIsrCache('/s/example?preview=TOKEN', '/s/example')).toBe(false)
    expect(websiteHtmlResponsesShareIsrCache('/s/example', '/s/example?preview=1')).toBe(false)
    expect(websiteHtmlResponsesShareIsrCache('/s/example', '/s/example?token=TOKEN')).toBe(false)
  })

  it('applies preview no-store only on website surfaces when a preview query is present', () => {
    expect(shouldApplyWebsitePreviewNoStore('/s/example', 'TOKEN')).toBe(true)
    expect(shouldApplyWebsitePreviewNoStore('/s/example', '1')).toBe(true)
    expect(shouldApplyWebsitePreviewNoStore('/api/public/website/example', 'TOKEN')).toBe(true)
    expect(shouldApplyWebsitePreviewNoStore('/s/example', null)).toBe(false)
    expect(shouldApplyWebsitePreviewNoStore('/s/example', '')).toBe(false)
    expect(shouldApplyWebsitePreviewNoStore('/admin', 'TOKEN')).toBe(false)
  })
})
