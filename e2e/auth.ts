import { expect, type Page } from '@playwright/test'

export const demoPassword = process.env.E2E_DEMO_PASSWORD

/**
 * Vercel Deployment Protection answers the first bypass request with a
 * same-URL 307 plus `_vercel_jwt`. Seed that cookie before Chromium
 * navigates so page.goto / page.request do not loop.
 */
async function unlockPreview(page: Page) {
  if (!process.env.VERCEL_AUTOMATION_BYPASS_SECRET) return
  await page.request.get('/api/health', {
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
