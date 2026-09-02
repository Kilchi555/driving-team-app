/**
 * Shared helpers for F-01 admin endpoint hardening.
 * Server-side only — never trust client tenant/user IDs.
 */
import { createError } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Ensure every user id belongs to the caller's tenant.
 * Returns the verified ids (deduped). Throws 403 if any id is foreign/missing.
 */
export async function assertUsersBelongToTenant(
  supabase: SupabaseClient,
  userIds: string[],
  tenantId: string
): Promise<string[]> {
  const unique = [...new Set(userIds.filter((id) => typeof id === 'string' && id.length > 0))]
  if (unique.length === 0) {
    throw createError({ statusCode: 400, message: 'No valid user ids provided' })
  }
  if (unique.length > 500) {
    throw createError({ statusCode: 400, message: 'Too many user ids (max 500)' })
  }

  const { data, error } = await supabase
    .from('users')
    .select('id')
    .in('id', unique)
    .eq('tenant_id', tenantId)

  if (error) {
    throw createError({ statusCode: 500, message: 'Failed to verify user tenant membership' })
  }

  const allowed = new Set((data || []).map((row: { id: string }) => row.id))
  if (allowed.size !== unique.length) {
    throw createError({ statusCode: 403, message: 'Forbidden – user not in tenant' })
  }

  return unique
}

/** Deduplicate and validate id strings without trusting them for auth. */
export function normalizeIdList(raw: unknown, fieldName: string): string[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw createError({
      statusCode: 400,
      message: `${fieldName} array is required and must not be empty`,
    })
  }
  const ids = raw.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
  if (ids.length === 0) {
    throw createError({
      statusCode: 400,
      message: `${fieldName} array is required and must not be empty`,
    })
  }
  return ids
}
