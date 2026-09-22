import { expect, test } from '@playwright/test'
import { demoPassword, signIn } from './auth'

/**
 * These flows write real exception rows and enqueue a slot recalculation.
 * They stay opt-in so the regular login job does not change a shared tenant.
 *
 * E2E_DEMO_PASSWORD and E2E_WORKING_HOUR_EXCEPTIONS=1 are both required.
 */
const enabled = Boolean(demoPassword) && process.env.E2E_WORKING_HOUR_EXCEPTIONS === '1'
const staffEmail = process.env.E2E_STAFF_EMAIL || 'demo-admin@simy.ch'
const closedMonday = '2099-01-05'
const otherMonday = '2099-01-12'
const shortenDay = '2099-01-06'
const closeDay = '2099-01-07'
const rangeStart = '2099-10-05'
const rangeEnd = '2099-10-18'

test.describe('working-hour exceptions', () => {
  test.skip(!enabled, 'Set E2E_DEMO_PASSWORD and E2E_WORKING_HOUR_EXCEPTIONS=1')

  test('opens one Monday, leaves the next Monday unchanged, then restores it', async ({ page }) => {
    await signIn(page, staffEmail, 'apple-review')
    const me = await page.request.get('/api/auth/current-user')
    expect(me.ok()).toBeTruthy()
    const meBody = await me.json()
    const staffId = meBody?.profile?.id as string
    expect(staffId).toBeTruthy()

    const opened = await page.request.post('/api/staff/working-hour-exceptions', {
      data: {
        action: 'upsert',
        staffId,
        date: closedMonday,
        isClosed: false,
        blocks: [{ start_time: '10:00', end_time: '16:00' }],
        tenant_id: 'not-the-actor-tenant',
      },
    })
    expect(opened.ok(), await opened.text()).toBeTruthy()

    const listed = await page.request.post('/api/staff/working-hour-exceptions', {
      data: { action: 'list', staffId, startDate: closedMonday, endDate: otherMonday },
    })
    const body = await listed.json()
    const dates = (body.exceptions || []).map((row: { date: string }) => row.date)
    expect(dates).toContain(closedMonday)
    expect(dates).not.toContain(otherMonday)

    const removed = await page.request.post('/api/staff/working-hour-exceptions', {
      data: { action: 'delete', staffId, date: closedMonday },
    })
    expect(removed.ok()).toBeTruthy()
  })

  test('shortens a day, closes another, and keeps an existing appointment untouched by the API', async ({ page }) => {
    await signIn(page, staffEmail, 'apple-review')
    const me = await (await page.request.get('/api/auth/current-user')).json()
    const staffId = me?.profile?.id as string

    const before = await page.request.get('/api/calendar/get-appointments')
    const beforeIds = new Set(
      ((await before.json())?.data || []).map((row: { id?: string }) => row.id).filter(Boolean),
    )

    const shortened = await page.request.post('/api/staff/working-hour-exceptions', {
      data: {
        action: 'upsert',
        staffId,
        date: shortenDay,
        isClosed: false,
        blocks: [{ start_time: '10:00', end_time: '12:00' }],
      },
    })
    expect(shortened.ok()).toBeTruthy()

    const closed = await page.request.post('/api/staff/working-hour-exceptions', {
      data: { action: 'upsert', staffId, date: closeDay, isClosed: true, blocks: [] },
    })
    expect(closed.ok()).toBeTruthy()

    const after = await page.request.get('/api/calendar/get-appointments')
    const afterIds = ((await after.json())?.data || []).map((row: { id?: string }) => row.id).filter(Boolean)
    for (const id of beforeIds) {
      expect(afterIds).toContain(id)
    }

    await page.request.post('/api/staff/working-hour-exceptions', {
      data: { action: 'delete', staffId, date: shortenDay },
    })
    await page.request.post('/api/staff/working-hour-exceptions', {
      data: { action: 'delete', staffId, date: closeDay },
    })
  })

  test('saves a multi-day range with different days and rolls back when one day is invalid', async ({ page }) => {
    await signIn(page, staffEmail, 'apple-review')
    const me = await (await page.request.get('/api/auth/current-user')).json()
    const staffId = me?.profile?.id as string

    const days = eachDate(rangeStart, rangeEnd).map((date, index) => {
      if (index === 0) {
        return { date, isClosed: false, blocks: [{ start_time: '08:00', end_time: '12:00' }] }
      }
      if (index === 1) {
        return { date, isClosed: false, blocks: [{ start_time: '09:00', end_time: '13:00' }] }
      }
      if (index === 2) return { date, isClosed: true, blocks: [] }
      return { date, isClosed: false, blocks: [{ start_time: '10:00', end_time: '16:00' }] }
    })

    const saved = await page.request.post('/api/staff/working-hour-exceptions', {
      data: { action: 'upsert_many', staffId, days },
    })
    expect(saved.ok(), await saved.text()).toBeTruthy()

    const listed = await page.request.post('/api/staff/working-hour-exceptions', {
      data: { action: 'list', staffId, startDate: rangeStart, endDate: rangeEnd },
    })
    const rows = (await listed.json()).exceptions as Array<{ date: string; isClosed: boolean; blocks: Array<{ start_time: string }> }>
    expect(rows).toHaveLength(days.length)
    expect(rows[0].blocks[0].start_time).toBe('08:00')
    expect(rows[1].blocks[0].start_time).toBe('09:00')
    expect(rows[2].isClosed).toBe(true)

    const rejected = await page.request.post('/api/staff/working-hour-exceptions', {
      data: {
        action: 'upsert_many',
        staffId,
        days: [
          { date: rangeStart, isClosed: false, blocks: [{ start_time: '07:00', end_time: '08:00' }] },
          { date: '2099-02-31', isClosed: true, blocks: [] },
        ],
      },
    })
    expect(rejected.ok()).toBeFalsy()

    const afterReject = await page.request.post('/api/staff/working-hour-exceptions', {
      data: { action: 'list', staffId, startDate: rangeStart, endDate: rangeStart },
    })
    const still = (await afterReject.json()).exceptions[0]
    expect(still.blocks[0].start_time).toBe('08:00')

    for (const day of days) {
      await page.request.post('/api/staff/working-hour-exceptions', {
        data: { action: 'delete', staffId, date: day.date },
      })
    }
  })
})

function eachDate(start: string, end: string): string[] {
  const dates: string[] = []
  const cursor = new Date(`${start}T12:00:00Z`)
  const last = new Date(`${end}T12:00:00Z`)
  while (cursor.getTime() <= last.getTime()) {
    const year = cursor.getUTCFullYear()
    const month = String(cursor.getUTCMonth() + 1).padStart(2, '0')
    const day = String(cursor.getUTCDate()).padStart(2, '0')
    dates.push(`${year}-${month}-${day}`)
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}
