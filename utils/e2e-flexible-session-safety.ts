/**
 * Pure decision helpers for the Production flexible-session Playwright spec.
 * Kept free of Playwright imports so Vitest can exercise fail-closed cleanup.
 */

export const FLEXIBLE_SESSION_SPEC_FILE = 'e2e/flexible-session-category.spec.ts'
export const FLEXIBLE_SESSION_SPEC_BASENAME = 'flexible-session-category.spec.ts'
/** Env flag that opts the dedicated Production workflow into discovering this spec. */
export const FLEXIBLE_SESSION_PRODUCTION_E2E_ENV = 'SIMY_E2E_PRODUCTION_FLEX'

export type CategoryListLoadState = 'loading' | 'ready_empty' | 'ready_populated' | 'unknown'

export type CleanupDecision =
  | { action: 'delete'; reason: 'exact_single_match' }
  | { action: 'already_gone'; reason: 'exact_name_absent_after_ready_list' }
  | { action: 'fail'; code: 'LIST_NOT_READY'; reason: string }
  | { action: 'fail'; code: 'AMBIGUOUS'; reason: string }
  | { action: 'fail'; code: 'UNCONFIRMED'; reason: string }
  | { action: 'noop'; reason: string }

export function playwrightTestIgnoreForFlexibleSession(
  env: NodeJS.Dict<string | undefined> = process.env,
): string[] {
  if (env[FLEXIBLE_SESSION_PRODUCTION_E2E_ENV] === '1') return []
  return [`**/${FLEXIBLE_SESSION_SPEC_BASENAME}`]
}

/**
 * Decide cleanup after the category list load state and exact-name match count
 * are known. Never treats an unresolved/loading list as successful deletion.
 */
export function decideCategoryCleanup(input: {
  listState: CategoryListLoadState
  exactNameMatchCount: number
  createdId: string | null
  creationConfirmed: boolean
  categoryName: string
}): CleanupDecision {
  const { listState, exactNameMatchCount, createdId, creationConfirmed, categoryName } = input

  if (listState === 'loading' || listState === 'unknown') {
    return {
      action: 'fail',
      code: 'LIST_NOT_READY',
      reason: `Category list state is ${listState}; refusing to treat absence as cleanup success`,
    }
  }

  if (exactNameMatchCount > 1) {
    return {
      action: 'fail',
      code: 'AMBIGUOUS',
      reason: `ORPHAN_AMBIGUOUS categoryName=${categoryName}: ${exactNameMatchCount} UI matches; refusing cleanup`,
    }
  }

  if (exactNameMatchCount === 1) {
    if (!createdId) {
      return {
        action: 'fail',
        code: 'UNCONFIRMED',
        reason: `ORPHAN_UNCONFIRMED categoryName=${categoryName}: UI shows one match but create id was not confirmed; manual follow-up required`,
      }
    }
    return { action: 'delete', reason: 'exact_single_match' }
  }

  // exactNameMatchCount === 0 and list is ready
  if (creationConfirmed && createdId) {
    return {
      action: 'already_gone',
      reason: 'exact_name_absent_after_ready_list',
    }
  }

  return {
    action: 'noop',
    reason: 'no confirmed creation and exact name absent from ready list',
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
