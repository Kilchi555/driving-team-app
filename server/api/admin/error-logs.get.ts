/**
 * GET /api/admin/error-logs
 * 
 * Fetch error logs for admin dashboard
 * Query params:
 * - hours: number (default 24)
 * - component: string (optional filter)
 * - limit: number (default 100)
 */

export default defineEventHandler(async (event) => {
  try {
    // Check admin authentication
    const user = await requireAuth(event)

    if (user?.role !== 'admin') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Admin access required'
      })
    }

    // Get query parameters
    const query = getQuery(event)
    const hours = parseInt(query.hours as string) || 24
    const component = query.component as string
    const limit = parseInt(query.limit as string) || 100

    const supabase = getSupabase()

    // Calculate date range
    const sinceDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

    // Build query
    let dbQuery = supabase
      .from('error_logs')
      .select('*')
      .eq('tenant_id', user.tenant_id)
      .eq('level', 'error')
      .gte('created_at', sinceDate)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Filter by component if provided
    if (component) {
      dbQuery = dbQuery.eq('component', component)
    }

    const { data: errorLogs, error: fetchError } = await dbQuery

    if (fetchError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch error logs'
      })
    }

    // Get statistics by component
    const byComponent: Record<string, number> = {}
    errorLogs?.forEach((log) => {
      byComponent[log.component] = (byComponent[log.component] || 0) + 1
    })

    return {
      success: true,
      data: {
        errorLogs,
        statistics: {
          totalErrors: errorLogs?.length || 0,
          byComponent,
          timeRange: `Last ${hours} hours`,
          fetchedAt: new Date().toISOString()
        }
      }
    }
  } catch (err: any) {
    console.error('❌ Error in /api/admin/error-logs:', err)

    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to fetch error logs'
    })
  }
})

