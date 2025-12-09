/**
 * Composable to work with error logs
 */

export const useErrorLogs = () => {
  const supabase = useSupabaseClient()
  const errorLogs = ref([])
  const loading = ref(false)
  const error = ref(null)

  /**
   * Fetch error logs for current tenant/user
   */
  const fetchErrorLogs = async (options: {
    hours?: number
    component?: string
    level?: string
    limit?: number
  } = {}) => {
    loading.value = true
    error.value = null

    try {
      const { hours = 24, component, level = 'error', limit = 100 } = options

      // Calculate date range
      const sinceDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

      // Build query
      let query = supabase
        .from('error_logs')
        .select('*')
        .eq('level', level)
        .gte('created_at', sinceDate)
        .order('created_at', { ascending: false })
        .limit(limit)

      // Filter by component if provided
      if (component) {
        query = query.eq('component', component)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        error.value = fetchError.message
        return
      }

      errorLogs.value = data || []
    } catch (err: any) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  /**
   * Get error statistics
   */
  const getStatistics = async (hours: number = 24) => {
    try {
      const sinceDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

      const { data, error: fetchError } = await supabase
        .from('error_logs')
        .select('component, level')
        .eq('level', 'error')
        .gte('created_at', sinceDate)

      if (fetchError) {
        console.error('Error fetching statistics:', fetchError)
        return null
      }

      // Group by component
      const byComponent: Record<string, number> = {}
      data?.forEach((log) => {
        byComponent[log.component] = (byComponent[log.component] || 0) + 1
      })

      return {
        totalErrors: data?.length || 0,
        byComponent,
        timeRange: `Last ${hours} hours`
      }
    } catch (err) {
      console.error('Error calculating statistics:', err)
      return null
    }
  }

  /**
   * Clear old error logs (older than X days)
   */
  const clearOldLogs = async (olderThanDays: number = 30) => {
    try {
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString()

      const { error: deleteError } = await supabase
        .from('error_logs')
        .delete()
        .lt('created_at', cutoffDate)

      if (deleteError) {
        console.error('Error clearing old logs:', deleteError)
        return false
      }

      return true
    } catch (err) {
      console.error('Error in clearOldLogs:', err)
      return false
    }
  }

  return {
    errorLogs,
    loading,
    error,
    fetchErrorLogs,
    getStatistics,
    clearOldLogs
  }
}

