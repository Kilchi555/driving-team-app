/**
 * Shared helpers for F-01 admin endpoint hardening.
 * Server-side only — never trust client tenant/user IDs.
 */
import { createError } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'

/** Absolute ceiling for enrichment payloads (abuse / DoS bound). */
export const MAX_USER_IDS = 5000

/**
 * Chunk size for PostgREST `.in()` filters (URL / request size safety).
 * customers.vue may post the full student list; tenants can exceed 500.
 */
export const IN_QUERY_CHUNK = 200

/** Split an id list into fixed-size chunks for safe `.in()` queries. */
export function chunkIds(ids: string[], size: number = IN_QUERY_CHUNK): string[][] {
  if (size <= 0) return [ids]
  const chunks: string[][] = []
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size))
  }
  return chunks
}

/**
 * Ensure every user id belongs to the caller's tenant.
 * Returns the verified ids (deduped). Throws 403 if any id is foreign/missing.
 * Membership checks are chunked so large tenant lists do not break enrichment.
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
  if (unique.length > MAX_USER_IDS) {
    throw createError({
      statusCode: 400,
      message: `Too many user ids (max ${MAX_USER_IDS})`,
    })
  }

  const allowed = new Set<string>()
  for (const chunk of chunkIds(unique)) {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .in('id', chunk)
      .eq('tenant_id', tenantId)

    if (error) {
      throw createError({ statusCode: 500, message: 'Failed to verify user tenant membership' })
    }

    for (const row of data || []) {
      if (row?.id) allowed.add(row.id)
    }
  }

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
