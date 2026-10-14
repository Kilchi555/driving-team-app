/**
 * Rate limiter using Supabase for persistent, cross-instance enforcement.
 *
 * Abuse-sensitive operations FAIL CLOSED when the backing store is unavailable
 * or when persistence fails. Inserts are awaited (no fire-and-forget).
 * Prefer the SQL function `consume_rate_limit` for atomic check+insert when
 * the migration `20261014_tenant_registration_abuse_protection.sql` is applied.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const requestCache = new Map<string, { count: number; resetTime: number; backoffLevel?: number }>()
const CACHE_TTL = 5 * 60 * 1000

const LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
  register: { maxRequests: 5, windowMs: 60 * 1000 },
  password_reset: { maxRequests: 5, windowMs: 15 * 60 * 1000 },
  login: { maxRequests: 10, windowMs: 60 * 1000 },
  process_payment: { maxRequests: 20, windowMs: 60 * 1000 },
  customer_get_payment_page_data: { maxRequests: 30, windowMs: 60 * 1000 },
  settle_and_email_payment: { maxRequests: 10, windowMs: 60 * 1000 },
  confirm_cash_payment: { maxRequests: 30, windowMs: 60 * 1000 },
  save_discount: { maxRequests: 1000, windowMs: 60 * 1000 },
  cancel_appointment: { maxRequests: 100, windowMs: 60 * 60 * 1000 },
  cancel_staff: { maxRequests: 100, windowMs: 60 * 60 * 1000 },
  cancel_customer: { maxRequests: 50, windowMs: 60 * 60 * 1000 },
  use_credit_for_appointment: { maxRequests: 50, windowMs: 60 * 60 * 1000 },
  booking_proposal: { maxRequests: 5, windowMs: 60 * 60 * 1000 },
  booking_inquiry: { maxRequests: 5, windowMs: 60 * 60 * 1000 },
  tenant_register: { maxRequests: 3, windowMs: 60 * 60 * 1000 },
  tenant_register_email: { maxRequests: 3, windowMs: 60 * 60 * 1000 },
  create_admin: { maxRequests: 5, windowMs: 60 * 60 * 1000 },
  verify_registration_email: { maxRequests: 20, windowMs: 60 * 60 * 1000 },
  resend_registration_verification: { maxRequests: 5, windowMs: 60 * 60 * 1000 },
}

/** Operations that must not silently bypass protection on store failure. */
export const FAIL_CLOSED_OPERATIONS = new Set([
  'tenant_register',
  'tenant_register_email',
  'create_admin',
  'verify_registration_email',
  'resend_registration_verification',
  'login',
  'register',
  'password_reset',
  'rollback_registration',
])

const BACKOFF_MULTIPLIERS = [1, 2, 5, 15, 60, 240]

let supabaseClient: SupabaseClient | null = null

/** Test helper — clears process-local cache between cases. */
export function __resetRateLimitCacheForTests() {
  requestCache.clear()
  supabaseClient = null
}

function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      console.warn('⚠️ Supabase credentials not configured for rate limiter')
      return null
    }
    supabaseClient = createClient(supabaseUrl, serviceRoleKey)
  }
  return supabaseClient
}

function getBackoffMultiplier(blockCount: number): number {
  if (blockCount <= 0) return 1
  if (blockCount > BACKOFF_MULTIPLIERS.length) {
    return BACKOFF_MULTIPLIERS[BACKOFF_MULTIPLIERS.length - 1]
  }
  return BACKOFF_MULTIPLIERS[blockCount - 1]
}

async function getConsecutiveBlockCount(
  supabase: SupabaseClient,
  operation: string,
  ipAddress: string
): Promise<number> {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recentLogs, error } = await supabase
      .from('rate_limit_logs')
      .select('status, created_at')
      .eq('operation', operation)
      .eq('ip_address', ipAddress)
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error || !recentLogs) return 0

    let consecutiveBlocks = 0
    for (const log of recentLogs) {
      if (log.status === 'blocked') consecutiveBlocks++
      else break
    }
    return consecutiveBlocks
  } catch {
    return 0
  }
}

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  limit: number
  reset: number
  retryAfter: number
  /** Present when the limiter denied because the backing store failed (fail-closed). */
  storeUnavailable?: boolean
}

function withRetry(result: Omit<RateLimitResult, 'retryAfter'>): RateLimitResult {
  return {
    ...result,
    retryAfter: Math.max(1, Math.ceil((result.reset || 0) / 1000)),
  }
}

function denyStoreUnavailable(max: number): RateLimitResult {
  return withRetry({
    allowed: false,
    remaining: 0,
    limit: max,
    reset: 60_000,
    storeUnavailable: true,
  })
}

function memoryOnlyAllow(
  key: string,
  max: number,
  baseWindow: number,
  now: number,
  failClosed: boolean
): RateLimitResult {
  const cached = requestCache.get(key)
  if (cached && cached.resetTime > now) {
    const allowed = cached.count < max
    if (allowed) cached.count++
    return withRetry({
      allowed,
      remaining: Math.max(0, max - cached.count),
      limit: max,
      reset: cached.resetTime - now,
    })
  }

  if (failClosed) {
    // No durable store and abuse-sensitive: deny rather than open the floodgates.
    return denyStoreUnavailable(max)
  }

  requestCache.set(key, { count: 1, resetTime: now + baseWindow })
  return withRetry({
    allowed: true,
    remaining: Math.max(0, max - 1),
    limit: max,
    reset: baseWindow,
  })
}

/**
 * Persistent rate limit check.
 *
 * Signature: checkRateLimit(key, operation, maxRequests?, windowMs?, email?, tenantId?)
 * `windowMs` is milliseconds.
 */
export async function checkRateLimit(
  ipAddress: string,
  operation: keyof typeof LIMITS | string = 'register',
  maxRequests?: number,
  windowMs?: number,
  email?: string,
  tenantId?: string
): Promise<RateLimitResult> {
  if (typeof operation === 'number') {
    const legacyMax = operation
    const legacyWindow = typeof maxRequests === 'number' ? maxRequests : undefined
    console.warn(
      `⚠️ checkRateLimit called without operation name (key=${String(ipAddress).slice(0, 48)}). ` +
        'Use checkRateLimit(key, operation, max, windowMs).',
    )
    operation = 'legacy_unscoped'
    maxRequests = legacyMax
    windowMs = legacyWindow
  }

  const now = Date.now()
  const config = LIMITS[operation as string] || {
    maxRequests: maxRequests || 10,
    windowMs: windowMs || 60_000,
  }
  const max = maxRequests ?? config.maxRequests
  const baseWindow = windowMs ?? config.windowMs
  const key = `${operation}:${ipAddress}`
  const failClosed = FAIL_CLOSED_OPERATIONS.has(String(operation))

  if (typeof baseWindow === 'number' && baseWindow > 0 && baseWindow < 1000) {
    console.warn(
      `⚠️ checkRateLimit windowMs=${baseWindow} for ${operation} looks like seconds; expected milliseconds`,
    )
  }

  // Fast path: process-local cache already over limit → deny without DB round-trip.
  const cached = requestCache.get(key)
  if (cached && cached.resetTime > now && cached.count >= max) {
    return withRetry({
      allowed: false,
      remaining: 0,
      limit: max,
      reset: cached.resetTime - now,
    })
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return memoryOnlyAllow(key, max, baseWindow, now, failClosed)
  }

  const windowSeconds = Math.max(1, Math.floor(baseWindow / 1000))

  try {
    // Prefer atomic SQL function (migration 20261014).
    const { data: rpcRows, error: rpcError } = await supabase.rpc('consume_rate_limit', {
      p_operation: operation,
      p_ip_address: ipAddress,
      p_max_requests: max,
      p_window_seconds: windowSeconds,
      p_email: email || null,
      p_tenant_id: tenantId || null,
    })

    if (!rpcError && Array.isArray(rpcRows) && rpcRows[0]) {
      const row = rpcRows[0] as {
        allowed: boolean
        request_count: number
        retry_after_seconds: number
      }
      const resetMs = Math.max(1000, (row.retry_after_seconds || windowSeconds) * 1000)
      requestCache.set(key, {
        count: row.request_count,
        resetTime: now + resetMs,
      })
      return withRetry({
        allowed: !!row.allowed,
        remaining: Math.max(0, max - row.request_count),
        limit: max,
        reset: resetMs,
      })
    }

    // RPC missing / not migrated yet → insert-then-count fallback (still awaited).
    if (rpcError) {
      console.warn('⚠️ consume_rate_limit RPC unavailable, using insert-then-count:', rpcError.message)
    }

    const windowStart = new Date(now - baseWindow).toISOString()
    const blockCount = await getConsecutiveBlockCount(supabase, String(operation), ipAddress)
    const backoffMultiplier = getBackoffMultiplier(blockCount)
    const effectiveWindow = baseWindow * backoffMultiplier

    const { data: existing, error: selectError } = await supabase
      .from('rate_limit_logs')
      .select('created_at')
      .eq('operation', operation)
      .eq('ip_address', ipAddress)
      .gte('created_at', windowStart)
      .order('created_at', { ascending: true })

    if (selectError) {
      console.warn('⚠️ Failed to query rate limit logs:', selectError.message)
      return failClosed ? denyStoreUnavailable(max) : memoryOnlyAllow(key, max, baseWindow, now, false)
    }

    const priorCount = existing?.length || 0
    const isAllowed = priorCount < max
    const nextCount = priorCount + 1

    let resetTime = now + effectiveWindow
    if (existing && existing.length > 0 && existing[0].created_at) {
      resetTime = new Date(existing[0].created_at).getTime() + effectiveWindow
    }

    const { error: insertError } = await supabase.from('rate_limit_logs').insert({
      operation,
      ip_address: ipAddress,
      email: email || null,
      status: isAllowed ? 'allowed' : 'blocked',
      request_count: nextCount,
      max_requests: max,
      window_seconds: windowSeconds,
      tenant_id: tenantId || null,
    })

    if (insertError) {
      console.warn('⚠️ Failed to persist rate limit log:', insertError.message)
      return failClosed ? denyStoreUnavailable(max) : memoryOnlyAllow(key, max, baseWindow, now, false)
    }

    requestCache.set(key, {
      count: nextCount,
      resetTime,
      backoffLevel: blockCount,
    })

    if (!isAllowed) {
      console.warn(`⛔ Rate limit exceeded for ${operation} from ${ipAddress}`)
    }

    return withRetry({
      allowed: isAllowed,
      remaining: Math.max(0, max - nextCount),
      limit: max,
      reset: Math.max(0, resetTime - now),
    })
  } catch (err: any) {
    console.warn('⚠️ Rate limit check error:', err?.message || err)
    return failClosed ? denyStoreUnavailable(max) : memoryOnlyAllow(key, max, baseWindow, now, false)
  }
}
