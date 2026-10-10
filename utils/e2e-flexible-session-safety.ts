/**
 * Pure decision helpers for the Production flexible-session Playwright spec.
 * Kept free of Playwright imports so Vitest can exercise fail-closed cleanup.
 */

export const FLEXIBLE_SESSION_SPEC_FILE = 'e2e/flexible-session-category.spec.ts'
export const FLEXIBLE_SESSION_SPEC_BASENAME = 'flexible-session-category.spec.ts'
/** Env flag that opts the dedicated Production workflow into discovering this spec. */
export const FLEXIBLE_SESSION_PRODUCTION_E2E_ENV = 'SIMY_E2E_PRODUCTION_FLEX'

/** Exact admin API path that populates the Kursarten list (not /save or /delete). */
export const COURSE_CATEGORIES_LIST_PATH = '/api/admin/course-categories'

export type CategoryListLoadState = 'loading' | 'ready_empty' | 'ready_populated' | 'unknown'

export type CategoryListItem = {
  id?: string
  name?: string
  is_active?: boolean | null
  tenant_id?: string | null
}

export type CategoryFetchOutcome =
  | { status: 'ok'; categories: CategoryListItem[] }
  | { status: 'failed'; reason: string }
  | { status: 'timeout'; reason: string }

export type CleanupDecision =
  | { action: 'delete'; reason: 'exact_single_match'; matchId: string }
  | { action: 'already_gone'; reason: 'exact_identity_absent_after_successful_fetch' }
  | { action: 'fail'; code: 'FETCH_FAILED'; reason: string }
  | { action: 'fail'; code: 'LIST_NOT_READY'; reason: string }
  | { action: 'fail'; code: 'AMBIGUOUS'; reason: string }
  | { action: 'fail'; code: 'UNCONFIRMED'; reason: string }
  | { action: 'fail'; code: 'IDENTITY_MISMATCH'; reason: string }
  | { action: 'noop'; reason: string }

export function playwrightTestIgnoreForFlexibleSession(
  env: NodeJS.Dict<string | undefined> = process.env,
): string[] {
  if (env[FLEXIBLE_SESSION_PRODUCTION_E2E_ENV] === '1') return []
  return [`**/${FLEXIBLE_SESSION_SPEC_BASENAME}`]
}

/**
 * True only for GET /api/admin/course-categories (exact path).
 * Unrelated successful GETs (e.g. courses/full-list) and /save must not match.
 */
export function matchesCourseCategoriesListRequest(input: {
  method: string
  url: string
}): boolean {
  if (String(input.method || '').toUpperCase() !== 'GET') return false
  let pathname: string
  try {
    pathname = new URL(input.url, 'https://example.invalid').pathname
  } catch {
    return false
  }
  pathname = pathname.replace(/\/+$/, '') || '/'
  return pathname === COURSE_CATEGORIES_LIST_PATH
}

/**
 * Interpret a candidate list-GET response body. HTTP failure or missing
 * `categories` array is not a successful load (UI may still look empty).
 */
export function interpretCourseCategoriesListResponse(input: {
  ok: boolean
  status: number
  body: unknown
}): CategoryFetchOutcome {
  if (!input.ok) {
    return { status: 'failed', reason: `HTTP ${input.status}` }
  }
  if (!input.body || typeof input.body !== 'object') {
    return { status: 'failed', reason: 'response body is not an object' }
  }
  const categories = (input.body as { categories?: unknown }).categories
  if (!Array.isArray(categories)) {
    return { status: 'failed', reason: 'response missing categories array' }
  }
  return { status: 'ok', categories: categories as CategoryListItem[] }
}

/** Active rows only — matches UI `activeCategories` (soft-deleted excluded). */
export function activeCategoryRows(categories: CategoryListItem[]): CategoryListItem[] {
  return categories.filter((c) => c.is_active !== false)
}

/**
 * Exact identity matches among active categories: confirmed id and/or exact name.
 * Dedupes by id so id+name of the same row counts once.
 */
export function findActiveExactCategoryMatches(
  categories: CategoryListItem[],
  identity: { createdId: string | null; categoryName: string },
): CategoryListItem[] {
  const active = activeCategoryRows(categories)
  const matched = active.filter((c) => {
    if (identity.createdId && c.id === identity.createdId) return true
    if (c.name === identity.categoryName) return true
    return false
  })
  const byId = new Map<string, CategoryListItem>()
  const withoutId: CategoryListItem[] = []
  for (const row of matched) {
    if (row.id) byId.set(String(row.id), row)
    else withoutId.push(row)
  }
  return [...byId.values(), ...withoutId]
}

/**
 * Decide cleanup only after category-list GET outcome is known.
 * Never treats an ambiguous empty UI (fetch failed/timeout) as already_gone.
 */
export function decideCategoryCleanup(input: {
  categoryFetch: CategoryFetchOutcome
  listState: CategoryListLoadState
  createdId: string | null
  creationConfirmed: boolean
  categoryName: string
  /** Optional UI heading count; used only as a cross-check when fetch succeeded. */
  exactNameMatchCount?: number
}): CleanupDecision {
  const { categoryFetch, listState, createdId, creationConfirmed, categoryName } = input

  if (categoryFetch.status === 'timeout') {
    return {
      action: 'fail',
      code: 'FETCH_FAILED',
      reason:
        `CLEANUP_FAILED ORPHAN_UNCONFIRMED categoryName=${categoryName}`
        + (createdId ? ` categoryId=${createdId}` : '')
        + `: category list GET timed out (${categoryFetch.reason}); refusing already_gone`,
    }
  }

  if (categoryFetch.status === 'failed') {
    return {
      action: 'fail',
      code: 'FETCH_FAILED',
      reason:
        `CLEANUP_FAILED ORPHAN_UNCONFIRMED categoryName=${categoryName}`
        + (createdId ? ` categoryId=${createdId}` : '')
        + `: category list GET failed (${categoryFetch.reason}); empty UI is not proof of absence`,
    }
  }

  // Fetch succeeded — UI loading/unknown still refuse absence inference.
  if (listState === 'loading' || listState === 'unknown') {
    return {
      action: 'fail',
      code: 'LIST_NOT_READY',
      reason: `Category list state is ${listState} after successful GET; refusing to treat absence as cleanup success`,
    }
  }

  const matches = findActiveExactCategoryMatches(categoryFetch.categories, {
    createdId,
    categoryName,
  })

  if (
    typeof input.exactNameMatchCount === 'number'
    && input.exactNameMatchCount > 1
  ) {
    return {
      action: 'fail',
      code: 'AMBIGUOUS',
      reason: `ORPHAN_AMBIGUOUS categoryName=${categoryName}: ${input.exactNameMatchCount} UI matches; refusing cleanup`,
    }
  }

  if (matches.length > 1) {
    return {
      action: 'fail',
      code: 'AMBIGUOUS',
      reason: `ORPHAN_AMBIGUOUS categoryName=${categoryName}: ${matches.length} active API matches; refusing cleanup`,
    }
  }

  if (matches.length === 1) {
    const match = matches[0]
    if (!createdId) {
      return {
        action: 'fail',
        code: 'UNCONFIRMED',
        reason: `ORPHAN_UNCONFIRMED categoryName=${categoryName}: list shows one match but create id was not confirmed; manual follow-up required`,
      }
    }
    if (match.id && match.id !== createdId) {
      return {
        action: 'fail',
        code: 'IDENTITY_MISMATCH',
        reason:
          `ORPHAN_AMBIGUOUS categoryName=${categoryName}: active row id=${match.id} does not match createdId=${createdId}; refusing cleanup`,
      }
    }
    if (match.name && match.name !== categoryName) {
      return {
        action: 'fail',
        code: 'IDENTITY_MISMATCH',
        reason:
          `ORPHAN_AMBIGUOUS categoryId=${createdId}: active row name=${match.name} does not match categoryName=${categoryName}; refusing cleanup`,
      }
    }
    return { action: 'delete', reason: 'exact_single_match', matchId: createdId }
  }

  // matches.length === 0 and fetch ok + list ready
  if (creationConfirmed && createdId) {
    return {
      action: 'already_gone',
      reason: 'exact_identity_absent_after_successful_fetch',
    }
  }

  return {
    action: 'noop',
    reason: 'no confirmed creation and exact identity absent after successful fetch',
  }
}

export function formatCombinedTestFailure(input: {
  originalError?: unknown
  cleanupError?: unknown
  categoryName?: string
  categoryId?: string | null
}): Error {
  const parts: string[] = []
  if (input.originalError !== undefined && input.originalError !== null) {
    parts.push(`ORIGINAL_FAILURE: ${errorText(input.originalError)}`)
  }
  if (input.cleanupError !== undefined && input.cleanupError !== null) {
    const orphanBits = [
      input.categoryName ? `categoryName=${input.categoryName}` : null,
      input.categoryId ? `categoryId=${input.categoryId}` : null,
    ].filter(Boolean).join(' ')
    parts.push(
      `CLEANUP_FAILURE${orphanBits ? ` ${orphanBits}` : ''}: ${errorText(input.cleanupError)}`,
    )
  }
  if (parts.length === 0) {
    return new Error('Test failed without an error payload')
  }
  return new Error(parts.join('\n'))
}

function errorText(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}
