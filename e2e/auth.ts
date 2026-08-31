import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test'

export const demoPassword = process.env.E2E_DEMO_PASSWORD

export function previewBypassHeaders(): Record<string, string> | undefined {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  if (!secret) return undefined
  return {
    'x-vercel-protection-bypass': secret,
    'x-vercel-set-bypass-cookie': 'true',
  }
}

export async function newE2EContext(browser: Browser): Promise<BrowserContext> {
  const extraHTTPHeaders = previewBypassHeaders()
  return extraHTTPHeaders ? browser.newContext({ extraHTTPHeaders }) : browser.newContext()
}

/**
 * Vercel Deployment Protection answers the first bypass request with a
 * same-URL 307 plus `_vercel_jwt`. Seed that cookie before Chromium
 * navigates so page.goto / page.request do not loop.
 */
async function unlockPreview(page: Page) {
  const headers = previewBypassHeaders()
  if (!headers) return
  await page.request.get('/api/health', {
    headers,
    maxRedirects: 0,
    failOnStatusCode: false,
  })
}

export async function signIn(page: Page, email: string, tenantSlug: string, password = demoPassword) {
  await unlockPreview(page)
  await page.goto(`/login?tenant=${tenantSlug}`)
  await page.locator('#email').waitFor({ state: 'visible', timeout: 30_000 })
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password || '')
  await page.locator('form').getByRole('button', { name: 'Anmelden' }).click()
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 })
}
