import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  decideCategoryCleanup,
  FLEXIBLE_SESSION_PRODUCTION_E2E_ENV,
  FLEXIBLE_SESSION_SPEC_BASENAME,
  FLEXIBLE_SESSION_SPEC_FILE,
  formatCombinedTestFailure,
  playwrightTestIgnoreForFlexibleSession,
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
    expect(spec).toContain('categoryId === identity.id')
    expect(spec).toContain('is_active === false')
    // Delete must fail closed on HTTP failure and re-confirm absence from a settled list.
    expect(spec).toContain('delete save failed:')
    expect(spec).toMatch(/waitForCategoryListReady\(page\)[\s\S]*toHaveCount\(0/)
    expect(spec).toContain('formatCombinedTestFailure({')
    expect(spec).toContain('originalError:')
    expect(spec).toContain('cleanupError:')
    expect(spec).not.toContain('E2E_DEMO_PASSWORD')
    expect(spec).not.toContain('updateUserById')
    expect(spec).not.toMatch(/ilike|startsWith\(['"]E2E/)
  })
})

describe('decideCategoryCleanup', () => {
  const base = {
    createdId: '11111111-1111-4111-8111-111111111111',
    creationConfirmed: true,
    categoryName: 'E2E-FlexSess-abc',
  }

  it('fails closed while the list is still loading (empty-looking)', () => {
    expect(
      decideCategoryCleanup({
        ...base,
        listState: 'loading',
        exactNameMatchCount: 0,
      }),
    ).toMatchObject({ action: 'fail', code: 'LIST_NOT_READY' })
  })

  it('fails closed when list state is unknown', () => {
    expect(
      decideCategoryCleanup({
        ...base,
        listState: 'unknown',
        exactNameMatchCount: 0,
      }),
    ).toMatchObject({ action: 'fail', code: 'LIST_NOT_READY' })
  })

  it('treats ready empty list as already_gone only after confirmed creation', () => {
    expect(
      decideCategoryCleanup({
        ...base,
        listState: 'ready_empty',
        exactNameMatchCount: 0,
      }),
    ).toEqual({
      action: 'already_gone',
      reason: 'exact_name_absent_after_ready_list',
    })
  })

  it('does not invent cleanup success when creation was never confirmed', () => {
    expect(
      decideCategoryCleanup({
        ...base,
        creationConfirmed: false,
        createdId: null,
        listState: 'ready_empty',
        exactNameMatchCount: 0,
      }),
    ).toMatchObject({ action: 'noop' })
  })

  it('deletes only an exact single match with confirmed id', () => {
    expect(
      decideCategoryCleanup({
        ...base,
        listState: 'ready_populated',
        exactNameMatchCount: 1,
      }),
    ).toEqual({ action: 'delete', reason: 'exact_single_match' })
  })

  it('refuses ambiguous identity', () => {
    expect(
      decideCategoryCleanup({
        ...base,
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
        listState: 'ready_populated',
        exactNameMatchCount: 1,
      }),
    ).toMatchObject({ action: 'fail', code: 'UNCONFIRMED' })
  })
})

describe('formatCombinedTestFailure', () => {
  it('preserves original and cleanup errors together', () => {
    const err = formatCombinedTestFailure({
      originalError: new Error('create timed out'),
      cleanupError: new Error('LIST_NOT_READY'),
      categoryName: 'E2E-FlexSess-x',
      categoryId: 'abc',
    })
    expect(err.message).toContain('ORIGINAL_FAILURE: create timed out')
    expect(err.message).toContain('CLEANUP_FAILURE')
    expect(err.message).toContain('categoryName=E2E-FlexSess-x')
    expect(err.message).toContain('categoryId=abc')
    expect(err.message).toContain('LIST_NOT_READY')
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
})
