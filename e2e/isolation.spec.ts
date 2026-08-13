import { expect, test } from '@playwright/test'
import { demoPassword, signIn } from './auth'

const isolationPassword = process.env.E2E_ISOLATION_PASSWORD || demoPassword

/**
 * Tenant A = apple-review (App Store / Play demo).
 * Tenant B = e2e-isolation (seeded by `npm run demo:e2e-isolation:setup`).
 */
test.beforeAll(() => {
  if (process.env.CI && !demoPassword) {
    throw new Error('E2E_DEMO_PASSWORD is not set. Add it as a GitHub Actions secret.')
  }
  if (process.env.CI && !isolationPassword) {
    throw new Error('E2E_ISOLATION_PASSWORD is not set. Run npm run demo:e2e-isolation:setup and store the printed password as that secret.')
  }
})

test.describe('tenant isolation', () => {
  test.skip(!demoPassword || !isolationPassword, 'E2E passwords are not set')

  test('apple-review admin cannot read e2e-isolation users or appointments', async ({ browser }) => {
    const isolation = await browser.newContext()
    const isolationPage = await isolation.newPage()
    await signIn(isolationPage, 'e2e-isolation@simy.ch', 'e2e-isolation', isolationPassword)

    const me = await isolationPage.request.get('/api/auth/current-user')
    expect(me.ok(), `current-user failed: ${me.status()}`).toBeTruthy()
    const meBody = await me.json()
    const isolationTenantId = meBody?.profile?.tenant_id as string | undefined
    expect(isolationTenantId, 'e2e-isolation tenant_id missing — run npm run demo:e2e-isolation:setup').toBeTruthy()

    const calendar = await isolationPage.request.get('/api/calendar/get-appointments')
    expect(calendar.ok(), `calendar failed: ${calendar.status()}`).toBeTruthy()
    const calendarBody = await calendar.json()
    const list = Array.isArray(calendarBody?.data) ? calendarBody.data : []
    const isolationAppointmentId = list.find((row: { id?: string }) => row?.id && !String(row.id).startsWith('reserved-'))?.id as string | undefined
    expect(isolationAppointmentId, 'e2e-isolation has no appointments — re-run demo:e2e-isolation:setup').toBeTruthy()

    await isolation.close()

    const apple = await browser.newContext()
    const applePage = await apple.newPage()
    await signIn(applePage, 'demo-admin@simy.ch', 'apple-review')

    const usersRes = await applePage.request.post('/api/admin/users', {
      data: { action: 'get-admins', tenant_id: isolationTenantId },
    })
    expect(usersRes.status(), 'listing another tenant\'s admins must be forbidden').toBe(403)
    const usersText = await usersRes.text()
    expect(usersText).not.toContain('e2e-isolation@simy.ch')

    const apptRes = await applePage.request.get(`/api/staff/get-appointment?id=${isolationAppointmentId}`)
    // Isolation holds if this is not 200 and the body does not leak the id.
    // Production currently 500s on a tenant-filtered miss (.single() without PGRST116).
    expect(apptRes.ok(), `cross-tenant get-appointment must fail, got ${apptRes.status()}`).toBeFalsy()
    expect([403, 404, 500]).toContain(apptRes.status())
    const apptText = await apptRes.text()
    expect(apptText).not.toContain(isolationAppointmentId)

    const ownCalendar = await applePage.request.get('/api/calendar/get-appointments')
    expect(ownCalendar.ok()).toBeTruthy()
    const ownBody = await ownCalendar.json()
    const ownList = JSON.stringify(ownBody)
    expect(ownList).not.toContain(isolationAppointmentId)
    expect(ownList).not.toContain('e2e-isolation@simy.ch')

    await apple.close()
  })
})
