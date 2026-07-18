import { createError, isError } from 'h3'
import type { H3Error } from 'h3'

interface SupabaselikeError {
  code?: string
  message?: string
  details?: string
  hint?: string
  statusCode?: number
}

/**
 * Maps a raw Supabase / PostgREST error to an H3Error with a proper HTTP
 * status code. Pass the error from any Supabase query; it is returned as a
 * typed H3Error that Nitro / H3 can serialize correctly (no accidental 500s).
 *
 * If the value is already an H3Error it is returned as-is so callers can
 * safely wrap any error without double-wrapping.
 */
export function mapSupabaseError(error: unknown, context?: string): H3Error {
  // Already a proper H3 error — pass through unchanged (e.g. a deliberate
  // createError({ statusCode: 401, ... }) thrown earlier in the same
  // try/catch must never be re-mapped into a generic 503 "Database error").
  if (isError(error)) {
    return error as H3Error
  }

  const err = error as SupabaselikeError
  const code = err?.code
  const message = err?.message ?? 'Unknown database error'
  const prefix = context ? `[${context}] ` : ''

  // PostgREST / Supabase error code mappings
  if (code === 'PGRST116') {
    // "The result contains 0 rows" — treat as not found
    return createError({ statusCode: 404, statusMessage: `${prefix}Not found` })
  }

  if (code === '23505') {
    // unique_violation — duplicate entry
    return createError({ statusCode: 409, statusMessage: `${prefix}Conflict: duplicate entry` })
  }

  if (code === '23503') {
    // foreign_key_violation
    return createError({ statusCode: 400, statusMessage: `${prefix}Bad request: referenced record not found` })
  }

  if (code === '23502') {
    // not_null_violation
    return createError({ statusCode: 400, statusMessage: `${prefix}Bad request: required field missing` })
  }

  if (code === '42501' || code === 'PGRST301') {
    // insufficient_privilege / RLS violation
    return createError({ statusCode: 403, statusMessage: `${prefix}Forbidden` })
  }

  if (code === 'PGRST200') {
    // Ambiguous or missing foreign table
    return createError({ statusCode: 400, statusMessage: `${prefix}Bad request: invalid query` })
  }

  // Auth errors
  if (message.includes('JWT') || message.includes('token') || code === 'invalid_token') {
    return createError({ statusCode: 401, statusMessage: `${prefix}Unauthorized` })
  }

  // Connectivity / legacy key errors — surface as 503 so retries make sense
  if (
    message.includes('Legacy API keys') ||
    message.includes('Database unavailable') ||
    message.includes('connection') ||
    message.includes('timeout')
  ) {
    return createError({ statusCode: 503, statusMessage: `${prefix}Database unavailable` })
  }

  // Default: 503 for any unknown database error (prefer over 500 to signal transient issue)
  return createError({
    statusCode: 503,
    statusMessage: `${prefix}Database error`,
    data: process.dev ? { code, message } : undefined
  })
}
