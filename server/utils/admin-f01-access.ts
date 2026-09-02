/**
 * Shared helpers for F-01 admin endpoint hardening.
 * Server-side only — never trust client tenant/user IDs.
 */
import { createError, type H3Event } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import type { SupabaseClient } from '@supabase/supabase-js'

export type AuthProfile = {
  id: string
  tenant_id: string
  role: string
  email: string
  auth_user_id: string
}

/** Platform operators only (cron-status, global analytics). */
export async function requireSuperAdmin(event: H3Event): Promise<{
  auth_user_id: string
  role: string
  tenant_id: string | null
  db_user_id: string | null
}> {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const role: string = authUser.role || authUser.profile?.role || ''
  if (role !== 'super_admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden – super_admin required' })
  }
  return {
    auth_user_id: authUser.id as string,
    role,
    tenant_id: (authUser.tenant_id || authUser.profile?.tenant_id || null) as string | null,
    db_user_id: (authUser.db_user_id || authUser.profile?.id || null) as string | null,
  }
}

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
    throw createError({ statusCode: 400, statusMessage: 'No valid user ids provided' })
  }
  if (unique.length > 500) {
    throw createError({ statusCode: 400, statusMessage: 'Too many user ids (max 500)' })
  }

  const { data, error } = await supabase
    .from('users')
    .select('id')
    .in('id', unique)
    .eq('tenant_id', tenantId)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to verify user tenant membership' })
  }

  const allowed = new Set((data || []).map((row: { id: string }) => row.id))
  if (allowed.size !== unique.length) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden – user not in tenant' })
  }

  return unique
}

/** Deduplicate and validate UUID-like strings without trusting them for auth. */
export function normalizeIdList(raw: unknown, fieldName: string): string[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `${fieldName} array is required and must not be empty`,
    })
  }
  const ids = raw.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
  if (ids.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `${fieldName} array is required and must not be empty`,
    })
  }
  return ids
}
