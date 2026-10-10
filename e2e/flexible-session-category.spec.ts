import { randomBytes } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'
import { signIn } from './auth'

/**
 * Isolated Production UI E2E for flexible Kursart session templates.
 * Intended for the dedicated workflow_dispatch workflow only.
 *
 * Cleanup deletes only the exact category created in this run
 * (unique name + confirmed create response id). Never prefix-sweeps.
 */

const isolationPassword = process.env.E2E_ISOLATION_PASSWORD
const EXPECTED_TENANT_ID = '52510467-f3db-4846-938b-7395df308144'
const EXPECTED_EMAIL = 'e2e-isolation@simy.ch'
const EXPECTED_TENANT_SLUG = 'e2e-isolation'

test.beforeAll(() => {
  if (!isolationPassword) {
    throw new Error('E2E_ISOLATION_PASSWORD is not set.')
  }
})

test.describe('flexible course-category session template', () => {
  test.skip(!isolationPassword, 'E2E_ISOLATION_PASSWORD is not set')

  test('create, edit, validate bounds, and delete only this category', async ({ page }) => {
    test.setTimeout(180_000)

    const unique = `${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`
    const categoryName = `E2E-FlexSess-${unique}`
    // code: alphanumeric, unique per run, fits maxlength 50
    const categoryCode = `FX${unique.replace(/-/g, '').slice(0, 12)}`.toUpperCase()

    let createdId: string | null = null
    let creationConfirmed = false
    let cleanupCompleted = false

    try {
      await signIn(page, EXPECTED_EMAIL, EXPECTED_TENANT_SLUG, isolationPassword)

      const me = await page.request.get('/api/auth/current-user')
      expect(me.ok(), `current-user failed: ${me.status()}`).toBeTruthy()
      const meBody = await me.json()
      expect(meBody?.profile?.tenant_id, 'tenant_id mismatch').toBe(EXPECTED_TENANT_ID)
      expect(String(meBody?.profile?.email || '').toLowerCase()).toBe(EXPECTED_EMAIL)
      expect(meBody?.profile?.role).toBe('admin')

      await page.goto('/admin/courses')
      await page.getByRole('button', { name: 'Kursarten' }).click()
      await page.getByRole('button', { name: 'Neue Kursart' }).click()
      await expect(page.getByRole('heading', { name: 'Neue Kursart erstellen' })).toBeVisible()

      await page.getByPlaceholder('z.B. VKU').fill(categoryCode)
      await page.getByPlaceholder('z.B. Verkehrskunde').fill(categoryName)

      await ensureSessionCount(page, 3)
      await setSessionDurations(page, [2, 3.5, 1])
      await expectTotalSummary(page, /2h \+ 3\.5h \+ 1h \(6\.5h\)/)

      const createResponsePromise = page.waitForResponse((response) => {
        if (!response.url().includes('/api/admin/course-categories/save')) return false
        if (response.request().method() !== 'POST') return false
        try {
          const body = response.request().postDataJSON() as {
            categoryId?: string
            name?: string
            code?: string
          } | null
          return !body?.categoryId && body?.name === categoryName && body?.code === categoryCode
        } catch {
          return false
        }
      }, { timeout: 60_000 })

      await page.getByRole('button', { name: 'Erstellen' }).click()
      const createResponse = await createResponsePromise
      expect(createResponse.ok(), `create save failed: ${createResponse.status()}`).toBeTruthy()
      const createBody = await createResponse.json()
      const created = createBody?.data
      expect(created?.id, 'create response missing id').toBeTruthy()
      expect(created?.name).toBe(categoryName)
      expect(created?.code).toBe(categoryCode)
      expect(created?.tenant_id).toBe(EXPECTED_TENANT_ID)
      createdId = String(created.id)
      creationConfirmed = true

      await expect(page.getByRole('heading', { name: 'Neue Kursart erstellen' })).toHaveCount(0, {
        timeout: 30_000,
      })

      await page.reload()
      await page.getByRole('button', { name: 'Kursarten' }).click()
      await openCategoryByExactName(page, categoryName)
      await expectSessionDurations(page, [2, 3.5, 1])
      await expectTotalSummary(page, /2h \+ 3\.5h \+ 1h \(6\.5h\)/)

      await setSessionDurations(page, [2, 4, 1])
      await expectTotalSummary(page, /2h \+ 4h \+ 1h \(7h\)/)
      await saveCategoryEdit(page, createdId)
      await page.reload()
      await page.getByRole('button', { name: 'Kursarten' }).click()
      await openCategoryByExactName(page, categoryName)
      await expectSessionDurations(page, [2, 4, 1])
      await expectTotalSummary(page, /2h \+ 4h \+ 1h \(7h\)/)

      await assertInvalidDurationRejected(page, 0)
      await assertInvalidDurationRejected(page, -1)
      // Restore known-good values after rejection probes
      await setSessionDurations(page, [2, 4, 1])

      await applyUniformInitializer(page, 10, 12)
      await expect(sessionDurationInputs(page)).toHaveCount(10)
      await expectSessionDurations(page, Array(10).fill(12))
      await expectTotalSummary(page, /10 × 12h \(120h total\)|120h/)
      await expect(page.getByRole('button', { name: '+ Termin' })).toBeDisabled()

      await saveCategoryEdit(page, createdId)
      await page.reload()
      await page.getByRole('button', { name: 'Kursarten' }).click()
      await openCategoryByExactName(page, categoryName)
      await expect(sessionDurationInputs(page)).toHaveCount(10)
      await expectSessionDurations(page, Array(10).fill(12))
      await expectTotalSummary(page, /10 × 12h \(120h total\)|120h/)
      await expect(page.getByRole('button', { name: '+ Termin' })).toBeDisabled()

      await page.getByRole('button', { name: 'Abbrechen' }).click()
      await expect(page.getByRole('heading', { name: 'Kursart bearbeiten' })).toHaveCount(0)
    } finally {
      if (creationConfirmed && createdId) {
        try {
          await cleanupCreatedCategory(page, { name: categoryName, id: createdId })
          cleanupCompleted = true
        } catch (cleanupErr) {
          // Fail the test with an actionable orphan marker (no secrets).
          const message = cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr)
          throw new Error(
            `CLEANUP_FAILED categoryName=${categoryName} categoryId=${createdId}: ${message}`,
          )
        }
      } else {
        // Creation unclear — read-only inspect; delete only on exact single match.
        await page.goto('/admin/courses').catch(() => {})
        await page.getByRole('button', { name: 'Kursarten' }).click().catch(() => {})
        const matches = page.getByRole('heading', { name: categoryName, exact: true })
        const count = await matches.count().catch(() => 0)
        if (count === 1 && createdId) {
          await cleanupCreatedCategory(page, { name: categoryName, id: createdId })
          cleanupCompleted = true
        } else if (count === 1 && !createdId) {
          throw new Error(
            `ORPHAN_UNCONFIRMED categoryName=${categoryName}: UI shows one match but create id was not confirmed; manual follow-up required`,
          )
        } else if (count > 1) {
          throw new Error(
            `ORPHAN_AMBIGUOUS categoryName=${categoryName}: ${count} UI matches; refusing cleanup`,
          )
        }
      }

      if (creationConfirmed && !cleanupCompleted) {
        throw new Error(`CLEANUP_INCOMPLETE categoryName=${categoryName} categoryId=${createdId}`)
      }
    }
  })
})

function sessionDurationInputs(page: Page) {
  return page.locator('span', { hasText: /^Termin \d+$/ }).locator('xpath=..').locator('input[type="number"]')
}

async function ensureSessionCount(page: Page, count: number) {
  const inputs = sessionDurationInputs(page)
  let current = await inputs.count()
  while (current < count) {
    await page.getByRole('button', { name: '+ Termin' }).click()
    current = await inputs.count()
  }
  while (current > count) {
    await page.getByRole('button', { name: 'Entfernen' }).last().click()
    current = await inputs.count()
  }
  await expect(inputs).toHaveCount(count)
}

async function setSessionDurations(page: Page, durations: number[]) {
  await ensureSessionCount(page, durations.length)
  const inputs = sessionDurationInputs(page)
  for (let i = 0; i < durations.length; i += 1) {
    await inputs.nth(i).fill(String(durations[i]))
  }
}

async function expectSessionDurations(page: Page, durations: number[]) {
  const inputs = sessionDurationInputs(page)
  await expect(inputs).toHaveCount(durations.length)
  for (let i = 0; i < durations.length; i += 1) {
    await expect(inputs.nth(i)).toHaveValue(String(durations[i]))
  }
}

async function expectTotalSummary(page: Page, pattern: RegExp) {
  const summary = page.locator('strong', { hasText: 'Gesamtdauer:' }).locator('xpath=..')
  await expect(summary).toContainText(pattern)
}

async function openCategoryByExactName(page: Page, name: string) {
  const heading = page.getByRole('heading', { name, exact: true })
  await expect(heading).toHaveCount(1)
  await heading.click()
  await expect(page.getByRole('heading', { name: 'Kursart bearbeiten' })).toBeVisible()
  await expect(page.getByPlaceholder('z.B. Verkehrskunde')).toHaveValue(name)
}

async function saveCategoryEdit(page: Page, expectedId?: string | null) {
  const responsePromise = page.waitForResponse((response) => {
    if (!response.url().includes('/api/admin/course-categories/save')) return false
    if (response.request().method() !== 'POST') return false
    try {
      const body = response.request().postDataJSON() as { categoryId?: string } | null
      if (!body?.categoryId) return false
      if (expectedId) return body.categoryId === expectedId
      return true
    } catch {
      return false
    }
  }, { timeout: 60_000 })
  await page.getByRole('button', { name: 'Speichern' }).click()
  const response = await responsePromise
  expect(response.ok(), `edit save failed: ${response.status()}`).toBeTruthy()
  if (expectedId) {
    const body = await response.json()
    expect(body?.data?.id).toBe(expectedId)
  }
  await expect(page.getByRole('heading', { name: 'Kursart bearbeiten' })).toHaveCount(0, {
    timeout: 30_000,
  })
}

async function assertInvalidDurationRejected(page: Page, invalidValue: number) {
  const inputs = sessionDurationInputs(page)
  const original = await inputs.nth(0).inputValue()
  await inputs.nth(0).fill(String(invalidValue))
  await page.getByRole('button', { name: 'Speichern' }).click()
  const toast = page.locator('div.fixed.bottom-4.right-4.bg-red-600')
  await expect(toast).toBeVisible({ timeout: 15_000 })
  await expect(toast).toContainText(/Fehler beim Speichern|Dauer|grösser als 0|Ungültige/i)
  // Modal must remain open (save rejected)
  await expect(page.getByRole('heading', { name: 'Kursart bearbeiten' })).toBeVisible()
  await inputs.nth(0).fill(original)
}

async function applyUniformInitializer(page: Page, count: number, hours: number) {
  // Labels are not html-for associated; locate by adjacent label text.
  const initializerCount = page
    .locator('label', { hasText: 'Anzahl Termine (Initial)' })
    .locator('xpath=..')
    .locator('input[type="number"]')
  const initializerHours = page
    .locator('label', { hasText: 'Dauer pro Termin (Initial)' })
    .locator('xpath=..')
    .locator('input[type="number"]')

  await initializerCount.fill(String(count))
  await initializerHours.fill(String(hours))

  const acceptReplace = async (dialog: { message: () => string; accept: () => Promise<void>; dismiss: () => Promise<void> }) => {
    const message = dialog.message()
    if (message.includes(`${count} × ${hours}h`)) {
      await dialog.accept()
      return
    }
    await dialog.dismiss()
    throw new Error(`Unexpected confirm dialog during initializer: ${message.slice(0, 120)}`)
  }
  page.once('dialog', acceptReplace)
  await page.getByRole('button', { name: new RegExp(`Auf ${count} × ${hours}h setzen`) }).click()
}

async function cleanupCreatedCategory(
  page: Page,
  identity: { name: string; id: string },
) {
  await page.goto('/admin/courses')
  await page.getByRole('button', { name: 'Kursarten' }).click()

  const heading = page.getByRole('heading', { name: identity.name, exact: true })
  const matchCount = await heading.count()
  if (matchCount === 0) {
    // Already gone — treat as cleaned.
    return
  }
  if (matchCount !== 1) {
    throw new Error(`Expected exactly one card for ${identity.name}, found ${matchCount}`)
  }

  const card = page.locator('div.group').filter({
    has: page.getByRole('heading', { name: identity.name, exact: true }),
  })
  await expect(card).toHaveCount(1)

  // Soft-delete goes through save with categoryId + is_active:false.
  const deleteResponsePromise = page.waitForResponse(
    async (response) => {
      if (!response.url().includes('/api/admin/course-categories/save')) return false
      if (response.request().method() !== 'POST') return false
      let body: { categoryId?: string; is_active?: boolean } | null = null
      try {
        body = response.request().postDataJSON()
      } catch {
        return false
      }
      return body?.categoryId === identity.id && body?.is_active === false
    },
    { timeout: 60_000 },
  )

  page.once('dialog', async (dialog) => {
    const message = dialog.message()
    if (!message.includes(identity.name) || !message.includes('löschen')) {
      await dialog.dismiss()
      throw new Error(`Refusing unexpected delete dialog: ${message.slice(0, 120)}`)
    }
    await dialog.accept()
  })

  await card.hover()
  await card.getByTitle('Löschen').click()

  const deleteResponse = await deleteResponsePromise
  expect(deleteResponse.ok(), `delete save failed: ${deleteResponse.status()}`).toBeTruthy()
  const deleteBody = await deleteResponse.json()
  expect(deleteBody?.data?.id).toBe(identity.id)
  expect(deleteBody?.data?.name).toBe(identity.name)
  expect(deleteBody?.data?.is_active).toBe(false)

  await expect(page.getByRole('heading', { name: identity.name, exact: true })).toHaveCount(0, {
    timeout: 30_000,
  })
}
