import { expect, test } from '@playwright/test'
import { demoPassword, signIn } from './auth'

test.beforeAll(() => {
  if (process.env.CI && !demoPassword) {
    throw new Error('E2E_DEMO_PASSWORD is not set. Add it as a GitHub Actions secret.')
  }
})

test.describe('apple-review login', () => {
  test.skip(!demoPassword, 'E2E_DEMO_PASSWORD is not set')

  test('customer reaches the dashboard', async ({ page }) => {
    await signIn(page, 'apple-review@simy.ch', 'apple-review')
    await expect(page).toHaveURL(/customer-dashboard/)
  })

  test('admin reaches the admin area', async ({ page }) => {
    await signIn(page, 'demo-admin@simy.ch', 'apple-review')
    await expect(page).toHaveURL(/\/admin/)
  })
})
