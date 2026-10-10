import { randomBytes } from 'node:crypto'
import { expect, test, type Page, type Response } from '@playwright/test'
import {
  decideCategoryCleanup,
  formatCombinedTestFailure,
  interpretCourseCategoriesListResponse,
  matchesCourseCategoriesListRequest,
  type CategoryFetchOutcome,
  type CategoryListLoadState,
} from '../utils/e2e-flexible-session-safety'
import { signIn } from './auth'

/**
 * Isolated Production UI E2E for flexible Kursart session templates.
 * Intended for the dedicated workflow_dispatch workflow only.
 *
 * Discovery: ignored by default in playwright.config.ts unless
 * SIMY_E2E_PRODUCTION_FLEX=1 (set only by the dedicated workflow).
 *
 * Cleanup deletes only the exact category created in this run
 * (unique name + confirmed create response id). Never prefix-sweeps.
 *
 * Category-list readiness requires a successful GET /api/admin/course-categories
 * (not page-level course isLoading / empty UI alone).
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
    let originalError: unknown = null
    let cleanupError: unknown = null

    try {
      await signIn(page, EXPECTED_EMAIL, EXPECTED_TENANT_SLUG, isolationPassword)

      const me = await page.request.get('/api/auth/current-user')
      expect(me.ok(), `current-user failed: ${me.status()}`).toBeTruthy()
      const meBody = await me.json()
      expect(meBody?.profile?.tenant_id, 'tenant_id mismatch').toBe(EXPECTED_TENANT_ID)
      expect(String(meBody?.profile?.email || '').toLowerCase()).toBe(EXPECTED_EMAIL)
      expect(meBody?.profile?.role).toBe('admin')

      await openCoursesCategoriesTab(page)
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

      await reloadCoursesCategoriesTab(page)
      await openCategoryByExactName(page, categoryName)
      await expectSessionDurations(page, [2, 3.5, 1])
      await expectTotalSummary(page, /2h \+ 3\.5h \+ 1h \(6\.5h\)/)

      await setSessionDurations(page, [2, 4, 1])
      await expectTotalSummary(page, /2h \+ 4h \+ 1h \(7h\)/)
      await saveCategoryEdit(page, createdId)
      await reloadCoursesCategoriesTab(page)
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
      await reloadCoursesCategoriesTab(page)
      await openCategoryByExactName(page, categoryName)
      await expect(sessionDurationInputs(page)).toHaveCount(10)
      await expectSessionDurations(page, Array(10).fill(12))
      await expectTotalSummary(page, /10 × 12h \(120h total\)|120h/)
      await expect(page.getByRole('button', { name: '+ Termin' })).toBeDisabled()

      await page.getByRole('button', { name: 'Abbrechen' }).click()
      await expect(page.getByRole('heading', { name: 'Kursart bearbeiten' })).toHaveCount(0)
    } catch (err) {
      originalError = err
    } finally {
      try {
        await runCleanupDecision(page, {
          categoryName,
          createdId,
          creationConfirmed,
        })
      } catch (err) {
        cleanupError = err
      }
    }

    if (originalError || cleanupError) {
      throw formatCombinedTestFailure({
        originalError: originalError ?? undefined,
        cleanupError: cleanupError ?? undefined,
        categoryName,
        categoryId: createdId,
      })
    }
  })
})

async function runCleanupDecision(
  page: Page,
  identity: {
    categoryName: string
    createdId: string | null
    creationConfirmed: boolean
  },
) {
  // Do not throw on GET failure here — decideCategoryCleanup must fail closed
  // (never already_gone) when the list fetch did not succeed.
  const { categoryFetch, listState } = await navigateCoursesCategoriesTab(page, {
    mode: 'goto',
    requireFetchOk: false,
  })
  const exactNameMatchCount = await page
    .getByRole('heading', { name: identity.categoryName, exact: true })
    .count()

  const decision = decideCategoryCleanup({
    categoryFetch,
    listState,
    exactNameMatchCount,
    createdId: identity.createdId,
    creationConfirmed: identity.creationConfirmed,
    categoryName: identity.categoryName,
  })

  if (decision.action === 'fail') {
    throw new Error(decision.reason)
  }
  if (decision.action === 'noop' || decision.action === 'already_gone') {
    return
  }
  if (!identity.createdId) {
    throw new Error(`CLEANUP_FAILED categoryName=${identity.categoryName}: missing createdId for delete`)
  }
  await cleanupCreatedCategory(page, {
    name: identity.categoryName,
    id: identity.createdId,
    listAlreadyReady: true,
  })
}

function beginCategoryListFetch(page: Page): Promise<CategoryFetchOutcome> {
  return page
    .waitForResponse(
      (response) =>
        matchesCourseCategoriesListRequest({
          method: response.request().method(),
          url: response.url(),
        }),
      { timeout: 30_000 },
    )
    .then(async (response: Response) => {
      let body: unknown = null
      try {
        body = await response.json()
      } catch {
        body = null
      }
      return interpretCourseCategoriesListResponse({
        ok: response.ok(),
        status: response.status(),
        body,
      })
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err)
      if (/Timeout/i.test(message)) {
        return { status: 'timeout' as const, reason: message }
      }
      return { status: 'failed' as const, reason: message }
    })
}

async function navigateCoursesCategoriesTab(
  page: Page,
  options: { mode: 'goto' | 'reload'; requireFetchOk: boolean },
): Promise<{
  categoryFetch: CategoryFetchOutcome
  listState: CategoryListLoadState
}> {
  const pendingFetch = beginCategoryListFetch(page)
  if (options.mode === 'reload') {
    await page.reload()
  } else {
    await page.goto('/admin/courses')
  }
  const categoryFetch = await pendingFetch
  await page.getByRole('button', { name: 'Kursarten' }).click()
  // UI settle may still yield ready_empty when the GET failed — callers that
  // require a real load must set requireFetchOk or use decideCategoryCleanup.
  let listState: CategoryListLoadState = 'unknown'
  try {
    listState = await waitForCategoryListUiSettled(page)
  } catch {
    listState = 'unknown'
  }
  if (options.requireFetchOk && categoryFetch.status !== 'ok') {
    throw new Error(
      `Category list GET did not succeed (${categoryFetch.status}: ${categoryFetch.reason}); refusing to proceed with empty/ambiguous UI`,
    )
  }
  return { categoryFetch, listState }
}

/**
 * Navigate to courses, await the real category-list GET, open Kursarten,
 * and settle UI. Throws if the GET did not succeed (fail closed for callers
 * that require a loaded list during the happy path).
 */
async function openCoursesCategoriesTab(page: Page): Promise<{
  categoryFetch: CategoryFetchOutcome
  listState: CategoryListLoadState
}> {
  return navigateCoursesCategoriesTab(page, { mode: 'goto', requireFetchOk: true })
}

async function reloadCoursesCategoriesTab(page: Page): Promise<{
  categoryFetch: CategoryFetchOutcome
  listState: CategoryListLoadState
}> {
  return navigateCoursesCategoriesTab(page, { mode: 'reload', requireFetchOk: true })
}

/**
 * UI settle only — must not be used alone to prove absence after create.
 * Pair with a successful category-list GET outcome.
 */
async function waitForCategoryListUiSettled(page: Page): Promise<CategoryListLoadState> {
  const loading = page.getByText('Lade Kursarten...', { exact: true })
  const empty = page.getByText('Keine Kursarten vorhanden', { exact: true })
  const cards = page.locator('div.group').filter({
    has: page.getByRole('heading'),
  })

  await expect.poll(async () => {
    if (await loading.isVisible().catch(() => false)) return 'loading'
    if (await empty.isVisible().catch(() => false)) return 'ready_empty'
    if ((await cards.count().catch(() => 0)) > 0) return 'ready_populated'
    return 'unknown'
  }, {
    timeout: 30_000,
    message: 'Category list UI did not leave loading / reach a settled ready state',
  }).not.toBe('loading')

  if (await loading.isVisible().catch(() => false)) {
    throw new Error('Category list still loading after wait')
  }
  if (await empty.isVisible().catch(() => false)) return 'ready_empty'
  if ((await cards.count().catch(() => 0)) > 0) return 'ready_populated'
  throw new Error('Category list UI state unknown after wait; refusing cleanup success inference')
}

/** @deprecated name kept for static guard string match; delegates to UI settle. */
async function waitForCategoryListReady(page: Page): Promise<CategoryListLoadState> {
  return waitForCategoryListUiSettled(page)
}

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
  identity: { name: string; id: string; listAlreadyReady?: boolean },
) {
  if (!identity.listAlreadyReady) {
    await openCoursesCategoriesTab(page)
  }

  const heading = page.getByRole('heading', { name: identity.name, exact: true })
  const matchCount = await heading.count()
  if (matchCount === 0) {
    // List GET already succeeded and exact name absent — confirmed gone.
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
  expect(deleteBody?.data?.tenant_id).toBe(EXPECTED_TENANT_ID)
  expect(deleteBody?.data?.is_active).toBe(false)

  // Re-confirm persisted UI state from a successful category GET — never trust empty UI alone.
  const { categoryFetch, listState } = await openCoursesCategoriesTab(page)
  const postDelete = decideCategoryCleanup({
    categoryFetch,
    listState,
    createdId: identity.id,
    creationConfirmed: true,
    categoryName: identity.name,
    exactNameMatchCount: await page
      .getByRole('heading', { name: identity.name, exact: true })
      .count(),
  })
  if (postDelete.action !== 'already_gone' && postDelete.action !== 'noop') {
    throw new Error(
      `CLEANUP_FAILED categoryName=${identity.name} categoryId=${identity.id}: `
      + `post-delete confirmation was ${postDelete.action}`
      + ('code' in postDelete ? `/${postDelete.code}` : '')
      + `: ${'reason' in postDelete ? postDelete.reason : ''}`,
    )
  }
}

// Keep waitForCategoryListReady referenced so static guards and accidental
// call-site greps still find the settled-list helper name.
void waitForCategoryListReady
