import { expect, type Page } from '@playwright/test'

export const demoPassword = process.env.E2E_DEMO_PASSWORD

export async function signIn(page: Page, email: string, tenantSlug: string) {
  await page.goto(`/login?tenant=${tenantSlug}`)
  await page.locator('#email').waitFor({ state: 'visible', timeout: 30_000 })
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(demoPassword || '')
  await page.locator('form').getByRole('button', { name: 'Anmelden' }).click()
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 })
}
