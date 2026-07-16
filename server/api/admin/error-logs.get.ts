/**
 * GET /api/admin/error-logs
 *
 * Fetch error logs for the admin/super-admin error monitoring dashboard.
 * - `super_admin` sees error logs across ALL tenants.
 * - `admin` sees only error logs for their own tenant.
 *
 * Query params:
 * - hours: number (default 24*7 = 7 days)
 * - level: string (optional filter, e.g. 'error' | 'warn' | 'info')
 * - component: string (optional filter, supports the `fallback:*` prefix used
 *   by logFallbackUsed() to flag places where a hardcoded fallback was used
 *   instead of live data from the database)
 * - page: number (default 1)
 * - limit: number (default 100, max 200)
 */
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const profile = await requireAdminProfile(event, ['admin', 'super_admin'])

    const query = getQuery(event)
    const hours = parseInt(query.hours as string) || 24 * 7
    const level = query.level as string | undefined
    const component = query.component as string | undefined
    const limit = Math.min(parseInt(query.limit as string) || 100, 200)
    const page = Math.max(parseInt(query.page as string) || 1, 1)
    const offset = (page - 1) * limit

    const supabase = getSupabaseAdmin()
    const sinceDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

    let dbQuery = supabase
      .from('error_logs')
      .select('*', { count: 'exact' })
      .gte('created_at', sinceDate)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // super_admin sees all tenants, everyone else is scoped to their own tenant
    if (profile.role !== 'super_admin') {
      dbQuery = dbQuery.eq('tenant_id', profile.tenant_id)
    }

    if (level) dbQuery = dbQuery.eq('level', level)
    if (component) dbQuery = dbQuery.eq('component', component)

    const { data: errorLogs, error: fetchError, count } = await dbQuery

    if (fetchError) {
      logger.error('ErrorLogsAPI', 'Failed to fetch error logs:', fetchError)
      throw createError({ statusCode: 500, statusMessage: 'Failed to fetch error logs' })
    }

    const byComponent: Record<string, number> = {}
    errorLogs?.forEach((log: any) => {
      byComponent[log.component] = (byComponent[log.component] || 0) + 1
    })

    return {
      success: true,
      data: {
        errorLogs: errorLogs || [],
        statistics: {
          totalErrors: count || 0,
          byComponent,
          timeRange: `Last ${hours} hours`,
          fetchedAt: new Date().toISOString()
        }
      }
    }
  } catch (err: any) {
    if (err?.statusCode) throw err
    logger.error('ErrorLogsAPI', 'Unexpected error in /api/admin/error-logs:', err)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch error logs' })
  }
})
