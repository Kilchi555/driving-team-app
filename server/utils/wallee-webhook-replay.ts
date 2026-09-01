/**
 * Replay guards for Wallee webhooks.
 *
 * Wallee does not sign webhook bodies. We already re-fetch the transaction
 * from their API before mutating payments. These helpers only cut expensive
 * duplicate work and reject impossible clocks.
 *
 * A hard "older than 15 minutes → drop" would miss Wallee's own delayed
 * retries. First delivery of a new state is always processed. The same
 * entityId+state after a successful run is ignored.
 */

export const WALLEE_WEBHOOK_MAX_AGE_MS = 15 * 60 * 1000
export const WALLEE_WEBHOOK_MAX_FUTURE_MS = 5 * 60 * 1000

export type WalleeWebhookTimeClass = 'ok' | 'stale' | 'future' | 'missing'

export function parseWalleeWebhookTimestamp(raw: unknown): Date | null {
  if (raw == null || raw === '') return null
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const ms = raw < 1e12 ? raw * 1000 : raw
    const date = new Date(ms)
    return Number.isNaN(date.getTime()) ? null : date
  }
  const date = new Date(String(raw))
  return Number.isNaN(date.getTime()) ? null : date
}

export function classifyWalleeWebhookTimestamp(
  raw: unknown,
  now: Date = new Date()
): WalleeWebhookTimeClass {
  const at = parseWalleeWebhookTimestamp(raw)
  if (!at) return 'missing'
  const delta = at.getTime() - now.getTime()
  if (delta > WALLEE_WEBHOOK_MAX_FUTURE_MS) return 'future'
  if (delta < -WALLEE_WEBHOOK_MAX_AGE_MS) return 'stale'
  return 'ok'
}

/**
 * Whether to skip the expensive handler.
 * Internal callers (recovery / super-admin test) are never blocked on time.
 */
export function shouldShortCircuitWalleeWebhook(opts: {
  timeClass: WalleeWebhookTimeClass
  alreadyProcessedSameState: boolean
  isInternal: boolean
}): { skip: boolean; reason?: 'already_processed' | 'future_timestamp' } {
  if (opts.alreadyProcessedSameState) {
    return { skip: true, reason: 'already_processed' }
  }
  if (!opts.isInternal && opts.timeClass === 'future') {
    return { skip: true, reason: 'future_timestamp' }
  }
  return { skip: false }
}
