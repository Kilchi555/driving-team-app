import { createClient, type Session } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

/**
 * Single-flight + short-lived cache around Supabase `refreshSession`,
 * coordinated both WITHIN a serverless instance (in-memory) and ACROSS
 * instances (via a short-lived row in `auth_refresh_locks`).
 *
 * WHY: Supabase rotates refresh tokens (single-use). When several parallel
 * requests hit an expired access token at (nearly) the same time, they may
 * be handled by DIFFERENT Vercel function instances. A purely in-memory
 * dedup only protects a single warm instance — every other instance still
 * independently calls `refreshSession` with the SAME refresh token. Only the
 * first wins; every other gets "refresh token already used" → returns null
 * → the request 401s, even though the session was actually still valid.
 * (Classic symptom: one endpoint OK, a parallel endpoint 401 with the very
 * same token — see the burst of 401s across get-products/get-working-hours/
 * get-appointments/etc. that happens whenever a dashboard mounts many
 * parallel API calls right as the access token expires.)
 *
 * This helper deduplicates in two layers:
 *  1. In-memory (fast path): if a refresh for this token is already
 *     in-flight or was completed very recently on THIS instance, reuse it.
 *  2. Cross-instance (DB row, `auth_refresh_locks`): the first instance to
 *     insert a row for hash(refreshToken) "wins" and performs the real
 *     Supabase refresh, then publishes the result to the row. Every other
 *     instance loses the insert race and instead polls the row until the
 *     winner publishes the rotated session (or fails).
 */

interface CachedSession {
  session: Session
  expiresAt: number
}

const CACHE_TTL_MS = 60_000
const LOCK_POLL_INTERVAL_MS = 150
const LOCK_MAX_POLL_ATTEMPTS = 20 // ~3s max wait for another instance to finish
const LOCK_STALE_MS = 30_000 // rows older than this are cleaned up opportunistically

const inFlight = new Map<string, Promise<Session | null>>()
const cache = new Map<string, CachedSession>()

function pruneCache() {
  const now = Date.now()
  for (const [key, value] of cache.entries()) {
    if (value.expiresAt <= now) cache.delete(key)
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Best-effort cleanup of old lock rows so the table doesn't grow unbounded. Never throws. */
async function cleanupStaleLocks(): Promise<void> {
  try {
    const admin = getSupabaseAdmin()
    await admin
      .from('auth_refresh_locks')
      .delete()
      .lt('created_at', new Date(Date.now() - LOCK_STALE_MS).toISOString())
  } catch {
    // non-fatal
  }
}

/**
 * Cross-instance coordinated refresh. Exactly one instance actually calls
 * Supabase; all others (on any instance) wait for and reuse its result.
 */
async function refreshWithDbLock(refreshToken: string): Promise<Session | null> {
  const tokenHash = hashToken(refreshToken)
  const admin = getSupabaseAdmin()

  const { error: insertError } = await admin
    .from('auth_refresh_locks')
    .insert({ token_hash: tokenHash })

  const wonRace = !insertError

  if (wonRace) {
    try {
      const supabaseUrl = process.env.SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!supabaseUrl || !supabaseKey) {
        logger.error('❌ Supabase credentials not configured for token refresh')
        await admin.from('auth_refresh_locks').update({ status: 'failed', error: 'missing credentials' }).eq('token_hash', tokenHash)
        return null
      }

      const supabase = createClient(supabaseUrl, supabaseKey)
      const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken })

      if (error || !data.session) {
        logger.warn('❌ Token refresh failed (lock owner):', error?.message)
        await admin.from('auth_refresh_locks').update({ status: 'failed', error: error?.message || 'no session' }).eq('token_hash', tokenHash)
        return null
      }

      await admin
        .from('auth_refresh_locks')
        .update({
          status: 'done',
          session: {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at,
            expires_in: data.session.expires_in,
            token_type: data.session.token_type,
            user: data.session.user,
          },
        })
        .eq('token_hash', tokenHash)

      // Best-effort, non-blocking cleanup of old rows.
      cleanupStaleLocks().catch(() => {})

      return data.session
    } catch (e) {
      const message = e instanceof Error ? e.message : 'exception'
      logger.warn('❌ Token refresh threw (lock owner):', message)
      await admin.from('auth_refresh_locks').update({ status: 'failed', error: message }).eq('token_hash', tokenHash).catch(() => {})
      return null
    }
  }

  // Lost the race — another instance (or the same one, moments ago) owns this
  // refresh. Poll the row until it publishes the rotated session or fails.
  logger.debug('⏳ Lost refresh-token race, polling for winning instance result')
  for (let i = 0; i < LOCK_MAX_POLL_ATTEMPTS; i++) {
    await sleep(LOCK_POLL_INTERVAL_MS)
    const { data: row } = await admin
      .from('auth_refresh_locks')
      .select('status, session, error')
      .eq('token_hash', tokenHash)
      .maybeSingle()

    if (row?.status === 'done' && row.session) {
      return row.session as unknown as Session
    }
    if (row?.status === 'failed') {
      logger.warn('❌ Token refresh failed (per winning instance):', row.error)
      return null
    }
  }

  logger.warn('⏰ Timed out waiting for cross-instance token refresh')
  return null
}

/**
 * Refresh a Supabase session, deduplicating concurrent/repeated calls that use
 * the same refresh token — both within this instance and across instances.
 * Returns the new session or null if the refresh truly failed (e.g.
 * expired/revoked refresh token).
 */
export async function refreshSessionDeduped(refreshToken: string): Promise<Session | null> {
  const now = Date.now()
  pruneCache()

  // 1. Reuse a recently-minted session for this token (rotation race window).
  const cached = cache.get(refreshToken)
  if (cached && cached.expiresAt > now) {
    logger.debug('♻️ Reusing cached refreshed session (token rotation race avoided, same instance)')
    return cached.session
  }

  // 2. Join an in-flight refresh for the same token on this instance.
  const pending = inFlight.get(refreshToken)
  if (pending) {
    logger.debug('⏳ Joining in-flight token refresh (single-flight, same instance)')
    return pending
  }

  // 3. Perform the actual refresh, coordinated across instances via DB lock.
  const promise = (async (): Promise<Session | null> => {
    const session = await refreshWithDbLock(refreshToken)
    if (session) {
      const entry: CachedSession = { session, expiresAt: Date.now() + CACHE_TTL_MS }
      cache.set(refreshToken, entry)
      if (session.refresh_token) {
        cache.set(session.refresh_token, entry)
      }
      pruneCache()
    }
    return session
  })()

  inFlight.set(refreshToken, promise)
  try {
    return await promise
  } finally {
    inFlight.delete(refreshToken)
  }
}
