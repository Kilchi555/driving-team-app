import { randomBytes } from 'node:crypto'
import { expect, test, type Page, type Response } from '@playwright/test'
import {
  evaluateEnrollmentFieldsE2EGate,
  ENROLLMENT_FIELDS_E2E_ENV,
} from '../utils/e2e-enrollment-fields-safety'
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
 * Isolated browser E2E for category enrollment_fields admin save/reload +
 * public form visibility. Opt-in only (SIMY_E2E_ENROLLMENT_FIELDS=1).
 * Hard-refuses Production app.simy.ch.
 *
 * Does not submit real enrollments, payments, or emails.
 */

const isolationPassword = process.env.E2E_ISOLATION_PASSWORD
const EXPECTED_EMAIL = 'e2e-isolation@simy.ch'
const EXPECTED_TENANT_SLUG = 'e2e-isolation'
const gate = evaluateEnrollmentFieldsE2EGate(process.env)
const optedIn = process.env[ENROLLMENT_FIELDS_E2E_ENV] === '1'

// Fail closed when someone opts in against Production / missing isolation password.
if (optedIn && !gate.ok) {
  throw new Error(`Enrollment-fields E2E gate failed: ${gate.reason}`)
}

test.describe('enrollment fields admin + public form (isolated)', () => {
  test.skip(!gate.ok, gate.ok ? '' : gate.reason)

  test('admin save/reload enrollment_fields and public form modes', async ({ page }) => {
    test.setTimeout(180_000)

    const unique = `${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`
    const categoryName = `E2E-EnrollFields-${unique}`
    const categoryCode = `EF${unique.replace(/-/g, '').slice(0, 12)}`.toUpperCase()

    let createdId: string | null = null
    let creationConfirmed = false
    let originalError: unknown = null
    let cleanupError: unknown = null

    try {
      await signIn(page, EXPECTED_EMAIL, EXPECTED_TENANT_SLUG, isolationPassword)

      const me = await page.request.get('/api/auth/current-user')
      expect(me.ok(), `current-user failed: ${me.status()}`).toBeTruthy()
      const meBody = await me.json()
      expect(String(meBody?.profile?.email || '').toLowerCase()).toBe(EXPECTED_EMAIL)
      expect(meBody?.profile?.role).toBe('admin')
      expect(meBody?.profile?.tenant_id, 'isolation tenant_id missing').toBeTruthy()

      await openCoursesCategoriesTab(page)
      await page.getByRole('button', { name: 'Neue Kursart' }).click()
      await expect(page.getByRole('heading', { name: 'Neue Kursart erstellen' })).toBeVisible()

      await page.getByPlaceholder('z.B. VKU').fill(categoryCode)
      await page.getByPlaceholder('z.B. Verkehrskunde').fill(categoryName)

      await expect(page.getByText('Anmeldefelder (öffentliche Anmeldung)')).toBeVisible()
      await setEnrollmentFieldMode(page, 'Führerausweis-Nr.', 'Ausgeblendet')
      await setEnrollmentFieldMode(page, 'Geburtsdatum', 'Optional')

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
      createdId = String(created.id)
      creationConfirmed = true
      expect(created?.enrollment_fields?.license_number).toBe('hidden')
      expect(created?.enrollment_fields?.birthdate).toBe('optional')
      expect(created?.enrollment_fields?.street).toBe('required')

      await expect(page.getByRole('heading', { name: 'Neue Kursart erstellen' })).toHaveCount(0, {
        timeout: 30_000,
      })

      // Full reload + reopen — modes must persist
      await reloadCoursesCategoriesTab(page)
      await openCategoryByExactName(page, categoryName)
      await expectEnrollmentFieldMode(page, 'Führerausweis-Nr.', 'hidden')
      await expectEnrollmentFieldMode(page, 'Geburtsdatum', 'optional')
      await expectEnrollmentFieldMode(page, 'Strasse', 'required')

      // Restore all-required baseline before cleanup
      await setEnrollmentFieldMode(page, 'Führerausweis-Nr.', 'Pflicht')
      await setEnrollmentFieldMode(page, 'Geburtsdatum', 'Pflicht')
      await saveCategoryEdit(page, createdId)
      await reloadCoursesCategoriesTab(page)
      await openCategoryByExactName(page, categoryName)
      await expectEnrollmentFieldMode(page, 'Führerausweis-Nr.', 'required')
      await expectEnrollmentFieldMode(page, 'Geburtsdatum', 'required')
      await page.getByRole('button', { name: 'Abbrechen' }).click()

      // Invalid mode via authenticated API (not browser select — UI only allows valid options)
      const bad = await page.request.post('/api/admin/course-categories/save', {
        data: {
          categoryId: createdId,
          name: categoryName,
          code: categoryCode,
          enrollment_fields: {
            street: 'maybe',
            street_nr: 'required',
            zip: 'required',
            city: 'required',
            license_number: 'required',
            birthdate: 'required',
          },
          session_structure: { sessions: [{ duration_hours: 8 }] },
        },
      })
      expect(bad.status(), 'invalid mode must be rejected').toBe(400)

      // Cross-tenant update attempt (foreign UUID) must not succeed
      const foreign = await page.request.post('/api/admin/course-categories/save', {
        data: {
          categoryId: '00000000-0000-4000-8000-000000000099',
          name: 'Hijack',
          code: 'HJK',
          enrollment_fields: {
            street: 'hidden',
            street_nr: 'required',
            zip: 'required',
            city: 'required',
            license_number: 'required',
            birthdate: 'required',
          },
          session_structure: { sessions: [{ duration_hours: 8 }] },
        },
      })
      expect([403, 404]).toContain(foreign.status())
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

  test('public enrollment modal honors required/optional/hidden (no submit)', async ({ page }) => {
    test.setTimeout(180_000)

    // This case needs an isolated public non-SARI course whose category modes are
    // preconfigured. Without E2E_ENROLLMENT_FIELDS_COURSE_PATH we cannot invent one
    // on Production; skip rather than write fixtures to the wrong tenant.
    const coursePath = process.env.E2E_ENROLLMENT_FIELDS_COURSE_PATH
    test.skip(
      !coursePath,
      'Set E2E_ENROLLMENT_FIELDS_COURSE_PATH to an isolated public course URL path (e.g. /customer/courses/e2e-isolation?course=<id>).',
    )

    await page.goto(String(coursePath))
    // Open enrollment UI if a dedicated CTA exists; otherwise assume modal already available.
    const enrollCta = page.getByRole('button', { name: /Anmelden|Jetzt anmelden|Buchen/i }).first()
    if (await enrollCta.isVisible().catch(() => false)) {
      await enrollCta.click()
    }

    // Defaults: when path points at all-required course, all six inputs exist.
    // When env marks mixed modes, assert visibility by id.
    const mode = process.env.E2E_ENROLLMENT_FIELDS_EXPECTED_MODES || 'all-required'
    if (mode === 'all-required') {
      await expect(page.locator('#ce-street')).toBeVisible()
      await expect(page.locator('#ce-street-nr')).toBeVisible()
      await expect(page.locator('#ce-zip')).toBeVisible()
      await expect(page.locator('#ce-city')).toBeVisible()
      await expect(page.locator('#ce-license')).toBeVisible()
      await expect(page.locator('#ce-birthdate')).toBeVisible()
    } else if (mode === 'mixed') {
      // Contract: street required, birthdate optional, license hidden
      await expect(page.locator('#ce-street')).toBeVisible()
      await expect(page.locator('#ce-birthdate')).toBeVisible()
      await expect(page.locator('#ce-license')).toHaveCount(0)
    }

    // Do not click submit / enroll — no registrations.
  })
})

function enrollmentSelect(page: Page, label: string) {
  return page
    .locator('div.flex')
    .filter({ has: page.locator('span', { hasText: label }) })
    .locator('select')
    .first()
}

async function setEnrollmentFieldMode(page: Page, label: string, optionLabel: string) {
  const select = enrollmentSelect(page, label)
  await expect(select).toBeVisible()
  await select.selectOption({ label: optionLabel })
}

async function expectEnrollmentFieldMode(
  page: Page,
  label: string,
  mode: 'required' | 'optional' | 'hidden',
) {
  const select = enrollmentSelect(page, label)
  await expect(select).toHaveValue(mode)
}

async function runCleanupDecision(
  page: Page,
  identity: {
    categoryName: string
    createdId: string | null
    creationConfirmed: boolean
  },
) {
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
    throw new Error(`CLEANUP_FAILED categoryName=${identity.categoryName}: missing createdId`)
  }
  await cleanupCreatedCategory(page, {
    name: identity.categoryName,
    id: identity.createdId,
  })
}

function beginCategoryListFetch(page: Page): Promise<CategoryFetchOutcome> {
  return page
    .waitForResponse(
      (response) => {
        if (
          !matchesCourseCategoriesListRequest({
            method: response.request().method(),
            url: response.url(),
          })
        ) {
          return false
        }
        try {
          return response.frame() === page.mainFrame()
        } catch {
          return false
        }
      },
      { timeout: 30_000 },
    )
    .then(async (response: Response) => {
      const body = await response.json().catch(() => null)
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
  const listState: CategoryListLoadState = await waitForCategoryListUiSettled(page).catch(
    () => 'unknown' as const,
  )
  if (options.requireFetchOk && categoryFetch.status !== 'ok') {
    throw new Error(
      `Category list GET did not succeed (${categoryFetch.status}: ${categoryFetch.reason})`,
    )
  }
  return { categoryFetch, listState }
}

async function openCoursesCategoriesTab(page: Page) {
  return navigateCoursesCategoriesTab(page, { mode: 'goto', requireFetchOk: true })
}

async function reloadCoursesCategoriesTab(page: Page) {
  return navigateCoursesCategoriesTab(page, { mode: 'reload', requireFetchOk: true })
}

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
    message: 'Category list UI did not settle',
  }).not.toBe('loading')

  if (await empty.isVisible().catch(() => false)) return 'ready_empty'
  if ((await cards.count().catch(() => 0)) > 0) return 'ready_populated'
  throw new Error('Category list UI state unknown after wait')
}

async function openCategoryByExactName(page: Page, name: string) {
  const heading = page.getByRole('heading', { name, exact: true })
  await expect(heading).toHaveCount(1)
  await heading.click()
  await expect(page.getByRole('heading', { name: 'Kursart bearbeiten' })).toBeVisible()
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
  expect(response.ok(), `save failed: ${response.status()}`).toBeTruthy()
}

async function cleanupCreatedCategory(
  page: Page,
  identity: { name: string; id: string },
) {
  await openCoursesCategoriesTab(page)
  await openCategoryByExactName(page, identity.name)
  const deleteBtn = page.getByRole('button', { name: /Löschen|Entfernen/i }).first()
  if (await deleteBtn.isVisible().catch(() => false)) {
    page.once('dialog', (dialog) => dialog.accept())
    await deleteBtn.click()
  } else {
    const del = await page.request.post('/api/admin/course-categories/delete', {
      data: { categoryId: identity.id },
    })
    expect(del.ok() || del.status() === 404, `cleanup delete status ${del.status()}`).toBeTruthy()
  }
}
