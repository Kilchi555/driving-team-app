import { expect, test } from '@playwright/test'
import { demoPassword, signIn } from './auth'

/**
 * These flows write real exception rows and enqueue a slot recalculation.
 * They stay opt-in so the regular login job does not change a shared tenant.
 *
 * E2E_DEMO_PASSWORD and E2E_WORKING_HOUR_EXCEPTIONS=1 are both required.
 *
 * The profile test uses Dashboard → Profil → Arbeitszeiten → weekday pencil.
 * The calendar stays on the appointment modal.
 */
const enabled = Boolean(demoPassword) && process.env.E2E_WORKING_HOUR_EXCEPTIONS === '1'
const staffEmail = process.env.E2E_STAFF_EMAIL || 'demo-admin@simy.ch'
const friday = '2099-01-09'
const nextFriday = '2099-01-16'
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

  test('manages a Friday exception from the staff profile and leaves calendar clicks on the appointment modal', async ({ page }) => {
  await signIn(page, staffEmail, 'apple-review')
  const me = await (await page.request.get('/api/auth/current-user')).json()
  const staffId = me?.profile?.id as string
  expect(staffId).toBeTruthy()
  await deleteException(page, staffId, friday)
  await deleteException(page, staffId, nextFriday)

  try {
    await page.getByRole('button', { name: 'Profil' }).click()
    await page.getByRole('button', { name: 'Arbeitszeiten' }).click()
    await page.getByRole('button', { name: 'Ausnahmen für Freitag bearbeiten' }).click()

    const sheet = page.getByTestId('working-hour-exception-sheet')
    await expect(sheet.getByRole('heading', { name: 'Arbeitszeit-Ausnahme' })).toBeVisible()
    await expect(sheet.locator('#exception-start-date')).toBeVisible()
    await sheet.locator('#exception-start-date').fill(friday)
    await expect(sheet.getByText('Laden…')).toBeHidden()
    await expect(sheet.getByText('Freitag, 09.01.2099')).toBeVisible()
    await expect(sheet.getByRole('radio', { name: 'Normale Arbeitszeit' })).toBeChecked()
    await expect(sheet.getByRole('button', { name: 'Speichern' })).toBeDisabled()

    await sheet.getByRole('radio', { name: 'Eigene Arbeitszeit' }).check()
    await sheet.getByLabel('Von').nth(0).fill('10:00')
    await sheet.getByLabel('Bis').nth(0).fill('14:00')
    await sheet.getByRole('button', { name: '+ Block hinzufügen' }).click()
    await sheet.getByLabel('Von').nth(1).fill('15:00')
    await sheet.getByLabel('Bis').nth(1).fill('16:00')
    await sheet.getByRole('button', { name: 'Speichern' }).click()
    await expect(sheet).toBeHidden()

    await page.getByRole('button', { name: 'Ausnahmen für Freitag bearbeiten' }).click()
    await sheet.locator('#exception-start-date').fill(friday)
    await expect(sheet.getByText('Laden…')).toBeHidden()
    await expect(sheet.getByLabel('Von').nth(0)).toHaveValue('10:00')
    await expect(sheet.getByLabel('Bis').nth(0)).toHaveValue('14:00')
    await expect(sheet.getByLabel('Von').nth(1)).toHaveValue('15:00')

    await sheet.getByRole('radio', { name: 'Ganzer Tag geschlossen' }).check()
    await sheet.getByRole('button', { name: 'Speichern' }).click()
    await expect(sheet).toBeHidden()

    await page.getByRole('button', { name: 'Ausnahmen für Freitag bearbeiten' }).click()
    await sheet.locator('#exception-start-date').fill(friday)
    await expect(sheet.getByText('Laden…')).toBeHidden()
    await expect(sheet.getByRole('radio', { name: 'Ganzer Tag geschlossen' })).toBeChecked()
    await sheet.getByRole('radio', { name: 'Normale Arbeitszeit' }).check()
    await sheet.getByRole('button', { name: 'Normale Arbeitszeit wiederherstellen' }).click()
    const confirm = page.getByTestId('working-hour-exception-restore-confirm')
    await expect(confirm).toContainText('Diese Ausnahme wird gelöscht. Danach gelten wieder die normalen Wochenarbeitszeiten.')
    await confirm.getByRole('button', { name: 'Abbrechen' }).click()
    await expect(confirm).toBeHidden()
    await expect(sheet.getByRole('radio', { name: 'Normale Arbeitszeit' })).toBeChecked()
    await sheet.getByRole('button', { name: 'Normale Arbeitszeit wiederherstellen' }).click()
    await page.getByTestId('confirm-restore-weekly-hours').click()
    await expect(sheet).toBeHidden()

    await page.getByRole('button', { name: 'Ausnahmen für Freitag bearbeiten' }).click()
    await sheet.locator('#exception-start-date').fill(friday)
    await expect(sheet.getByText('Laden…')).toBeHidden()
    await expect(sheet.getByRole('radio', { name: 'Normale Arbeitszeit' })).toBeChecked()
    await expect(sheet.getByRole('button', { name: 'Speichern' })).toBeDisabled()
    await sheet.getByRole('button', { name: 'Schliessen' }).click()

    await sheet.getByRole('checkbox', { name: 'Auf mehrere Tage anwenden' }).waitFor({ state: 'hidden' })
    await page.getByRole('button', { name: 'Ausnahmen für Freitag bearbeiten' }).click()
    await sheet.locator('#exception-start-date').fill(friday)
    await expect(sheet.getByText('Laden…')).toBeHidden()
    await sheet.getByRole('radio', { name: 'Eigene Arbeitszeit' }).check()
    await sheet.getByLabel('Von').nth(0).fill('08:00')
    await sheet.getByLabel('Bis').nth(0).fill('12:00')
    await sheet.getByRole('checkbox', { name: 'Auf mehrere Tage anwenden' }).check()
    await sheet.locator('#exception-range-end').fill(nextFriday)
    await sheet.getByRole('button', { name: 'Tage laden' }).click()
    await expect(sheet.getByText('Freitag, 09.01.2099')).toBeVisible()
    await expect(sheet.getByText('Freitag, 16.01.2099')).toBeVisible()
    await expect(sheet.getByText('Samstag, 10.01.2099')).toHaveCount(0)
    await sheet.getByRole('button', { name: 'Speichern' }).click()
    await expect(sheet).toBeHidden()

    const listed = await page.request.post('/api/staff/working-hour-exceptions', {
      data: { action: 'list', staffId, startDate: friday, endDate: nextFriday },
    })
    const rows = (await listed.json()).exceptions as Array<{ date: string; blocks: Array<{ start_time: string }> }>
    expect(rows.map((row) => row.date)).toEqual([friday, nextFriday])
    expect(rows.every((row) => row.blocks[0]?.start_time === '08:00')).toBeTruthy()

    await page.getByRole('button', { name: 'Arbeitszeiten schliessen' }).click()
    await page.getByRole('button', { name: 'Profil schliessen' }).click()
    await expect(page.getByRole('button', { name: 'Abweichende Arbeitszeit' })).toHaveCount(0)

    await page.locator('.fc-timegrid-slot-lane').nth(12).click({ force: true })
    await expect(page.getByTestId('working-hour-exception-sheet')).toHaveCount(0)
    await expect(page.getByPlaceholder(/suchen \(Name/)).toBeVisible()
    await page.getByRole('button', { name: 'Abbrechen' }).click()

    await page.locator('.fc-timegrid-event').first().click()
    await expect(page.getByRole('button', { name: 'Termin kopieren' })).toBeVisible()
    await expect(page.getByTestId('working-hour-exception-sheet')).toHaveCount(0)
  } finally {
    await deleteException(page, staffId, friday)
    await deleteException(page, staffId, nextFriday)
  }
})
})

async function deleteException(page: import('@playwright/test').Page, staffId: string, date: string) {
  await page.request.post('/api/staff/working-hour-exceptions', {
    data: { action: 'delete', staffId, date },
    failOnStatusCode: false,
  })
}

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
