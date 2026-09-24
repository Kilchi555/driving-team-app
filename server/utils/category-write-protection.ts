import { logger } from '~/utils/logger'

/** Student/customer roles whose category this editor may replace. */
export const CUSTOMER_CATEGORY_EDIT_ROLES = new Set(['client', 'customer', 'student'])

export const CATEGORY_CHANGE_ACTION = 'category_change'

export function isCustomerCategoryEditRole(role: unknown): boolean {
  return typeof role === 'string' && CUSTOMER_CATEGORY_EDIT_ROLES.has(role)
}

export function isStringCategoryArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

export function categoryListsEqual(left: unknown, right: unknown): boolean {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false
  return left.every((item, index) => item === right[index])
}

export function categoryChangeAuditPayload(input: {
  performerId: string
  targetUserId: string
  source: string
  oldCategory: unknown
  newCategory: string[]
}) {
  return {
    action_type: CATEGORY_CHANGE_ACTION,
    target_id: input.targetUserId,
    performer_id: input.performerId,
    reason_text: input.source,
    old_vals: { category: input.oldCategory ?? null },
    new_vals: { category: input.newCategory },
  }
}

type AuditClient = {
  rpc: (
    fn: string,
    args: ReturnType<typeof categoryChangeAuditPayload>
  ) => Promise<{ error: { message?: string } | null }>
}

/**
 * Records old and new category arrays. Tenant is taken from the performer
 * inside log_user_management_action. Skips identical lists. Never throws.
 */
export async function auditCategoryChange(
  supabase: AuditClient,
  input: Parameters<typeof categoryChangeAuditPayload>[0]
): Promise<void> {
  if (categoryListsEqual(input.oldCategory, input.newCategory)) return
  try {
    const { error } = await supabase.rpc(
      'log_user_management_action',
      categoryChangeAuditPayload(input)
    )
    if (error) {
      logger.error('category change audit failed:', error.message || 'unknown')
    }
  } catch (err: any) {
    logger.error('category change audit failed:', err?.message || 'unknown')
  }
}
