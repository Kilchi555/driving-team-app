import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  activeCategoryRows,
  decideCategoryCleanup,
  FLEXIBLE_SESSION_PRODUCTION_E2E_ENV,
  FLEXIBLE_SESSION_SPEC_BASENAME,
  FLEXIBLE_SESSION_SPEC_FILE,
  formatCombinedTestFailure,
  interpretCourseCategoriesListResponse,
  isActiveCategoryRow,
  matchesCourseCategoriesListRequest,
  playwrightTestIgnoreForFlexibleSession,
  requireUiMatchForApiDeleteDecision,
} from '../e2e-flexible-session-safety'

const readRepo = (relativeFromUtilsTests: string) =>
  readFileSync(new URL(relativeFromUtilsTests, import.meta.url), 'utf8')

describe('dedicated Production flexible-session E2E workflow', () => {
  const workflow = readRepo('../../.github/workflows/e2e-flexible-session-production.yml')
  const spec = readRepo('../../e2e/flexible-session-category.spec.ts')
  const ci = readRepo('../../.github/workflows/ci.yml')
  const playwrightConfig = readRepo('../../playwright.config.ts')
  const packageJson = JSON.parse(readRepo('../../package.json'))

  it('excludes the production flex spec from general Playwright discovery by default', () => {
    expect(playwrightTestIgnoreForFlexibleSession({})).toEqual([
      `**/${FLEXIBLE_SESSION_SPEC_BASENAME}`,
    ])
    expect(playwrightTestIgnoreForFlexibleSession({ CI: 'true' })).toEqual([
      `**/${FLEXIBLE_SESSION_SPEC_BASENAME}`,
    ])
    expect(
      playwrightTestIgnoreForFlexibleSession({ [FLEXIBLE_SESSION_PRODUCTION_E2E_ENV]: '1' }),
    ).toEqual([])

    expect(playwrightConfig).toContain('playwrightTestIgnoreForFlexibleSession')
    expect(playwrightConfig).toContain('testIgnore: productionFlexIgnore')
    expect(packageJson.scripts['test:e2e']).toContain('playwright test')
    expect(packageJson.scripts['test:e2e']).not.toContain(FLEXIBLE_SESSION_SPEC_BASENAME)
    expect(packageJson.scripts['test:e2e']).not.toContain(FLEXIBLE_SESSION_PRODUCTION_E2E_ENV)
    expect(ci).toContain('npm run test:e2e')
    expect(ci).not.toContain(FLEXIBLE_SESSION_SPEC_BASENAME)
    expect(ci).not.toContain(FLEXIBLE_SESSION_PRODUCTION_E2E_ENV)
  })

  it('dedicated workflow explicitly selects the flex spec and opts into discovery', () => {
    expect(workflow).toMatch(/^\s*workflow_dispatch:\s*$/m)
    expect(workflow).not.toMatch(/^\s*pull_request:/m)
    expect(workflow).not.toMatch(/^\s*push:/m)
    expect(workflow).toContain('E2E_BASE_URL: https://app.simy.ch')
    expect(workflow).toContain('E2E_ISOLATION_PASSWORD: ${{ secrets.E2E_ISOLATION_PASSWORD }}')
    expect(workflow).toContain(`${FLEXIBLE_SESSION_PRODUCTION_E2E_ENV}: '1'`)
    expect(workflow).toContain(
      `npx playwright test ${FLEXIBLE_SESSION_SPEC_FILE} --retries=0`,
    )
    expect(workflow).not.toContain('npm run test:e2e')
    expect(workflow).not.toContain('demo:e2e-isolation:setup')
    expect(workflow).not.toContain('E2E_DEMO_PASSWORD')
    expect(workflow).not.toMatch(/^\s*inputs:/m)
    expect(workflow).toMatch(/permissions:\s*\n\s*contents:\s*read/)
  })

  it('refuses non-main workflow_dispatch before Playwright', () => {
    expect(workflow).toContain('Enforce main branch only')
    expect(workflow).toContain('refs/heads/main')
    expect(workflow).toContain('ref: main')
    expect(workflow).toContain('origin/main')
    expect(workflow).toContain('Merge the PR first, then dispatch from main')
  })

  it('encodes tenant identity and exact-match cleanup guards in the spec', () => {
    expect(spec).toContain('52510467-f3db-4846-938b-7395df308144')
    expect(spec).toContain('e2e-isolation@simy.ch')
    expect(spec).toContain('E2E-FlexSess-')
    expect(spec).toContain('exact: true')
    expect(spec).toContain('decideCategoryCleanup')
    expect(spec).toContain('formatCombinedTestFailure')
    expect(spec).toContain('waitForCategoryListReady')
    expect(spec).toContain('matchesCourseCategoriesListRequest')
    expect(spec).toContain('interpretCourseCategoriesListResponse')
    expect(spec).toContain('beginCategoryListFetch')
    expect(spec).toContain('requireUiMatchForApiDeleteDecision')
    expect(spec).toContain('categoryId === identity.id')
    expect(spec).toContain('is_active === false')
    expect(spec).toContain('deleteBody?.data?.tenant_id')
    expect(spec).toContain('EXPECTED_TENANT_ID')
    // Delete must fail closed on HTTP failure and re-confirm via successful GET decision.
    expect(spec).toContain('delete save failed:')
    expect(spec).toContain('post-delete confirmation')
    expect(spec).toContain('formatCombinedTestFailure({')
    expect(spec).toContain('originalError:')
    expect(spec).toContain('cleanupError:')
    expect(spec).not.toContain('E2E_DEMO_PASSWORD')
    expect(spec).not.toContain('updateUserById')
    expect(spec).not.toMatch(/ilike|startsWith\(['"]E2E/)
    // Former fail-open: UI matchCount===0 must not return success after API delete decision.
    expect(spec).not.toMatch(/if \(matchCount === 0\) \{\s*\/\/ List GET already succeeded[\s\S]*?return\s*\}/)
  })
})

describe('isActiveCategoryRow / activeCategoryRows', () => {
  it('matches UI truthy is_active filtering (not merely !== false)', () => {
    expect(isActiveCategoryRow({ is_active: true })).toBe(true)
    expect(isActiveCategoryRow({ is_active: false })).toBe(false)
    expect(isActiveCategoryRow({ is_active: null })).toBe(false)
    expect(isActiveCategoryRow({ is_active: undefined })).toBe(false)
    expect(
      activeCategoryRows([
        { id: '1', name: 'a', is_active: true },
        { id: '2', name: 'b', is_active: false },
        { id: '3', name: 'c', is_active: null },
        { id: '4', name: 'd' },
      ]).map((c) => c.id),
    ).toEqual(['1'])
  })
})

describe('requireUiMatchForApiDeleteDecision', () => {
  const id = '11111111-1111-4111-8111-111111111111'
  const name = 'E2E-FlexSess-abc'

  it('fails closed when API required delete but UI matchCount is 0', () => {
    expect(() =>
      requireUiMatchForApiDeleteDecision({
        uiExactNameMatchCount: 0,
        categoryName: name,
        categoryId: id,
      }),
    ).toThrow(/CLEANUP_FAILED[\s\S]*matchCount=0[\s\S]*refusing silent cleanup success/)
  })

  it('fails closed on ambiguous UI match counts', () => {
    expect(() =>
      requireUiMatchForApiDeleteDecision({
        uiExactNameMatchCount: 2,
        categoryName: name,
        categoryId: id,
      }),
    ).toThrow(/CLEANUP_FAILED[\s\S]*found 2/)
  })

  it('allows exactly one UI match to proceed toward delete', () => {
    expect(() =>
      requireUiMatchForApiDeleteDecision({
        uiExactNameMatchCount: 1,
        categoryName: name,
        categoryId: id,
      }),
    ).not.toThrow()
  })

  it('preserves original failure alongside UI zero-match cleanup failure', () => {
    let cleanupError: unknown
    try {
      requireUiMatchForApiDeleteDecision({
        uiExactNameMatchCount: 0,
        categoryName: name,
        categoryId: id,
      })
    } catch (err) {
      cleanupError = err
    }
    const combined = formatCombinedTestFailure({
      originalError: new Error('bounds assertion failed'),
      cleanupError,
      categoryName: name,
      categoryId: id,
    })
    expect(combined.message).toContain('ORIGINAL_FAILURE: bounds assertion failed')
    expect(combined.message).toContain('CLEANUP_FAILURE')
    expect(combined.message).toContain('matchCount=0')
    expect(combined.message).toContain(`categoryId=${id}`)
  })
})

describe('matchesCourseCategoriesListRequest', () => {
  it('accepts only GET /api/admin/course-categories', () => {
    expect(
      matchesCourseCategoriesListRequest({
        method: 'GET',
        url: 'https://app.simy.ch/api/admin/course-categories',
      }),
    ).toBe(true)
    expect(
      matchesCourseCategoriesListRequest({
        method: 'GET',
        url: 'https://app.simy.ch/api/admin/course-categories/',
      }),
    ).toBe(true)
  })

  it('rejects unrelated successful GETs and category mutations', () => {
    expect(
      matchesCourseCategoriesListRequest({
        method: 'GET',
        url: 'https://app.simy.ch/api/admin/courses/full-list',
      }),
    ).toBe(false)
    expect(
      matchesCourseCategoriesListRequest({
        method: 'GET',
        url: 'https://app.simy.ch/api/auth/current-user',
      }),
    ).toBe(false)
    expect(
      matchesCourseCategoriesListRequest({
        method: 'POST',
        url: 'https://app.simy.ch/api/admin/course-categories/save',
      }),
    ).toBe(false)
    expect(
      matchesCourseCategoriesListRequest({
        method: 'GET',
        url: 'https://app.simy.ch/api/admin/course-categories/save',
      }),
    ).toBe(false)
  })
})

describe('interpretCourseCategoriesListResponse', () => {
  it('requires ok status and a categories array', () => {
    expect(
      interpretCourseCategoriesListResponse({
        ok: false,
        status: 500,
        body: { categories: [] },
      }),
    ).toEqual({ status: 'failed', reason: 'HTTP 500' })

    expect(
      interpretCourseCategoriesListResponse({
        ok: true,
        status: 200,
        body: { items: [] },
      }),
    ).toMatchObject({ status: 'failed' })

    expect(
      interpretCourseCategoriesListResponse({
        ok: true,
        status: 200,
        body: { categories: [{ id: 'a', name: 'n', is_active: true }] },
      }),
    ).toEqual({
      status: 'ok',
      categories: [{ id: 'a', name: 'n', is_active: true }],
    })
  })
})

describe('decideCategoryCleanup', () => {
  const createdId = '11111111-1111-4111-8111-111111111111'
  const categoryName = 'E2E-FlexSess-abc'
  const base = {
    createdId,
    creationConfirmed: true,
    categoryName,
  }

  it('fails closed when category GET fails even if UI looks empty', () => {
    expect(
      decideCategoryCleanup({
        ...base,
        categoryFetch: { status: 'failed', reason: 'HTTP 500' },
        listState: 'ready_empty',
        exactNameMatchCount: 0,
      }),
    ).toMatchObject({ action: 'fail', code: 'FETCH_FAILED' })
  })

  it('fails closed when category GET times out', () => {
    expect(
      decideCategoryCleanup({
        ...base,
        categoryFetch: { status: 'timeout', reason: 'Timeout 30000ms exceeded' },
        listState: 'ready_empty',
        exactNameMatchCount: 0,
      }),
    ).toMatchObject({ action: 'fail', code: 'FETCH_FAILED' })
  })

  it('fails closed while the list UI is still loading after a successful GET', () => {
    expect(
      decideCategoryCleanup({
        ...base,
        categoryFetch: { status: 'ok', categories: [] },
        listState: 'loading',
        exactNameMatchCount: 0,
      }),
    ).toMatchObject({ action: 'fail', code: 'LIST_NOT_READY' })
  })

  it('fails closed when list UI state is unknown after a successful GET', () => {
    expect(
      decideCategoryCleanup({
        ...base,
        categoryFetch: { status: 'ok', categories: [] },
        listState: 'unknown',
        exactNameMatchCount: 0,
      }),
    ).toMatchObject({ action: 'fail', code: 'LIST_NOT_READY' })
  })

  it('allows already_gone only after successful GET and exact identity absence', () => {
    expect(
      decideCategoryCleanup({
        ...base,
        categoryFetch: {
          status: 'ok',
          categories: [
            { id: 'other', name: 'Other', is_active: true },
            { id: createdId, name: categoryName, is_active: false },
          ],
        },
        listState: 'ready_populated',
        exactNameMatchCount: 0,
      }),
    ).toEqual({
      action: 'already_gone',
      reason: 'exact_identity_absent_after_successful_fetch',
    })

    expect(
      decideCategoryCleanup({
        ...base,
        categoryFetch: { status: 'ok', categories: [] },
        listState: 'ready_empty',
        exactNameMatchCount: 0,
      }),
    ).toEqual({
      action: 'already_gone',
      reason: 'exact_identity_absent_after_successful_fetch',
    })
  })

  it('does not invent cleanup success when creation was never confirmed', () => {
    expect(
      decideCategoryCleanup({
        ...base,
        creationConfirmed: false,
        createdId: null,
        categoryFetch: { status: 'ok', categories: [] },
        listState: 'ready_empty',
        exactNameMatchCount: 0,
      }),
    ).toMatchObject({ action: 'noop' })
  })

  it('deletes only an exact single match with confirmed id after successful GET', () => {
    expect(
      decideCategoryCleanup({
        ...base,
        categoryFetch: {
          status: 'ok',
          categories: [{ id: createdId, name: categoryName, is_active: true }],
        },
        listState: 'ready_populated',
        exactNameMatchCount: 1,
      }),
    ).toEqual({ action: 'delete', reason: 'exact_single_match', matchId: createdId })
  })

  it('refuses ambiguous identity from API or UI', () => {
    expect(
      decideCategoryCleanup({
        ...base,
        categoryFetch: {
          status: 'ok',
          categories: [
            { id: createdId, name: categoryName, is_active: true },
            { id: '22222222-2222-4222-8222-222222222222', name: categoryName, is_active: true },
          ],
        },
        listState: 'ready_populated',
        exactNameMatchCount: 2,
      }),
    ).toMatchObject({ action: 'fail', code: 'AMBIGUOUS' })
  })

  it('refuses unconfirmed single match without create id', () => {
    expect(
      decideCategoryCleanup({
        ...base,
        createdId: null,
        creationConfirmed: false,
        categoryFetch: {
          status: 'ok',
          categories: [{ id: 'x', name: categoryName, is_active: true }],
        },
        listState: 'ready_populated',
        exactNameMatchCount: 1,
      }),
    ).toMatchObject({ action: 'fail', code: 'UNCONFIRMED' })
  })

  it('refuses name match whose id differs from the confirmed create id', () => {
    expect(
      decideCategoryCleanup({
        ...base,
        categoryFetch: {
          status: 'ok',
          categories: [{ id: 'other-id', name: categoryName, is_active: true }],
        },
        listState: 'ready_populated',
        exactNameMatchCount: 1,
      }),
    ).toMatchObject({ action: 'fail', code: 'IDENTITY_MISMATCH' })
  })
})

describe('formatCombinedTestFailure', () => {
  it('preserves original and cleanup errors together', () => {
    const err = formatCombinedTestFailure({
      originalError: new Error('create timed out'),
      cleanupError: new Error('CLEANUP_FAILED ORPHAN_UNCONFIRMED category list GET failed'),
      categoryName: 'E2E-FlexSess-x',
      categoryId: 'abc',
    })
    expect(err.message).toContain('ORIGINAL_FAILURE: create timed out')
    expect(err.message).toContain('CLEANUP_FAILURE')
    expect(err.message).toContain('categoryName=E2E-FlexSess-x')
    expect(err.message).toContain('categoryId=abc')
    expect(err.message).toContain('CLEANUP_FAILED ORPHAN_UNCONFIRMED')
  })

  it('surfaces cleanup-only failures', () => {
    const err = formatCombinedTestFailure({
      cleanupError: new Error('delete save failed: 500'),
      categoryName: 'E2E-FlexSess-y',
      categoryId: 'def',
    })
    expect(err.message).not.toContain('ORIGINAL_FAILURE')
    expect(err.message).toContain('CLEANUP_FAILURE')
    expect(err.message).toContain('delete save failed: 500')
  })

  it('surfaces original-only failures', () => {
    const err = formatCombinedTestFailure({
      originalError: new Error('tenant mismatch'),
    })
    expect(err.message).toContain('ORIGINAL_FAILURE: tenant mismatch')
    expect(err.message).not.toContain('CLEANUP_FAILURE')
  })

  it('does not suppress the original failure when cleanup also fails closed on GET', () => {
    const err = formatCombinedTestFailure({
      originalError: new Error('bounds assertion failed'),
      cleanupError: new Error(
        'CLEANUP_FAILED ORPHAN_UNCONFIRMED categoryName=E2E-FlexSess-z: category list GET failed (HTTP 500); empty UI is not proof of absence',
      ),
      categoryName: 'E2E-FlexSess-z',
      categoryId: 'zzz',
    })
    expect(err.message).toContain('ORIGINAL_FAILURE: bounds assertion failed')
    expect(err.message).toContain('CLEANUP_FAILURE')
    expect(err.message).toContain('empty UI is not proof of absence')
  })
})
