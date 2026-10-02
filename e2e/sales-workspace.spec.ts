import { expect, test } from '@playwright/test'

test.describe('manual sales workspace authorization', () => {
  test('unauthenticated sales API is not public', async ({ request }) => {
    const response = await request.get('/api/tenant-admin/sales')
    expect(response.ok(), 'prospect data must not be publicly readable').toBeFalsy()
    expect([401, 403, 404]).toContain(response.status())
    const body = await response.text()
    expect(body).not.toContain('@mueller-fahrschule.ch')
    expect(body).not.toContain('CONTACTABILITY REVIEW REQUIRED')
  })

  test('unauthenticated sales page does not render the workspace', async ({ page }) => {
    await page.goto('/tenant-admin/sales')
    await expect(page.getByRole('heading', { name: 'Manueller Sales-Sprint' })).toHaveCount(0)
  })
})
