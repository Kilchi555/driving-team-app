import { expect, test, type Page } from '@playwright/test'

const password = process.env.E2E_DEMO_PASSWORD
const loginPath = '/login?tenant=apple-review'

test.beforeAll(() => {
  if (process.env.CI && !password) {
    throw new Error('E2E_DEMO_PASSWORD is not set. Add it as a GitHub Actions secret.')
  }
})

async function signIn(page: Page, email: string) {
  await page.goto(loginPath)
  await page.locator('#email').waitFor({ state: 'visible', timeout: 30_000 })
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password || '')
  await page.locator('form').getByRole('button', { name: 'Anmelden' }).click()
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 })
}

test.describe('apple-review login', () => {
  test.skip(!password, 'E2E_DEMO_PASSWORD is not set')

  test('customer reaches the dashboard', async ({ page }) => {
    await signIn(page, 'apple-review@simy.ch')
    await expect(page).toHaveURL(/customer-dashboard/)
  })

  test('admin reaches the admin area', async ({ page }) => {
    await signIn(page, 'demo-admin@simy.ch')
    await expect(page).toHaveURL(/\/admin/)
  })
})
