/**
 * Server-side helper to record when the application had to fall back to a
 * hardcoded/offline value instead of the tenant's real data from the
 * database (e.g. pricing_rules or categories could not be loaded).
 *
 * Writes into the same `error_logs` table used by the client-side error
 * logger (see plugins/sentry.client.ts), tagged with a `fallback:<source>`
 * component prefix so it shows up in the "Error Monitoring" dashboard
 * (pages/tenant-admin/errors.vue) without needing a dedicated UI.
 *
 * This is intentionally best-effort: a failure to log must never break the
 * calling request.
 */
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

export type FallbackSource =
  | 'pricing'
  | 'tenant-slug'
  | 'category-lookup'
  | 'category-group'
  | (string & {})

export interface LogFallbackUsedOptions {
  /** Short machine-readable label, e.g. 'pricing', 'tenant-slug'. */
  source: FallbackSource
  /** Human-readable summary of what happened. */
  message: string
  tenantId?: string | null
  userId?: string | null
  /** Arbitrary extra context (category code, endpoint, reason, ...). */
  details?: Record<string, any>
  /** Defaults to 'warn'. Use 'error' for cases with real business impact (e.g. wrong tenant). */
  level?: 'warn' | 'error'
}

export async function logFallbackUsed(opts: LogFallbackUsedOptions): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from('error_logs').insert({
      level: opts.level || 'warn',
      component: `fallback:${opts.source}`,
      message: opts.message,
      data: opts.details || null,
      tenant_id: opts.tenantId || null,
      user_id: opts.userId || null,
      status: 'open'
    })

    if (error) {
      logger.warn('⚠️ Could not persist fallback-usage log:', error.message)
    }
  } catch (err: any) {
    logger.warn('⚠️ Error logging fallback usage:', err?.message || err)
  }
}
