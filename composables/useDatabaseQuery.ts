import { ref, computed } from 'vue'
import { logger } from '~/utils/logger'

interface QueryFilter {
  column: string
  operator: 'eq' | 'neq' | 'lt' | 'lte' | 'gt' | 'gte' | 'like' | 'ilike' | 'in' | 'is' | 'contains'
  value: any
}

interface QueryOptions {
  table: string
  select?: string
  filters?: QueryFilter[]
  order?: { column: string; ascending?: boolean }
  limit?: number
  offset?: number
  single?: boolean
}

/**
 * Safe database query composable
 * 
 * Replaces direct Supabase calls with secure server-side queries
 * 
 * Usage:
 * 
 *   const { query, data, loading, error } = useDatabaseQuery()
 *   
 *   await query({
 *     table: 'locations',
 *     select: '*',
 *     filters: [
 *       { column: 'tenant_id', operator: 'eq', value: tenantId },
 *       { column: 'is_active', operator: 'eq', value: true }
 *     ],
 *     order: { column: 'name', ascending: true }
 *   })
 *   
 *   console.log(data.value) // Array of locations
 */

export const useDatabaseQuery = () => {
  const data = ref<any>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const query = async (options: QueryOptions) => {
    loading.value = true
    error.value = null
    data.value = null

    try {
      logger.debug('🔍 Executing safe database query:', {
        table: options.table,
        filters: options.filters?.length || 0
      })

      const response = await $fetch('/api/database/query', {
        method: 'POST',
        body: {
          table: options.table,
          select: options.select || '*',
          filters: options.filters,
          order: options.order,
          limit: options.limit,
          offset: options.offset,
          single: options.single
        }
      }) as any

      if (!response?.success) {
        throw new Error('Query failed')
      }

      data.value = response.data
      logger.debug('✅ Database query successful:', {
        table: options.table,
        rowCount: Array.isArray(response.data) ? response.data.length : (response.data ? 1 : 0)
      })

      return response.data
    } catch (err: any) {
      const errorMessage = err?.message || 'Database query failed'
      error.value = errorMessage
      logger.error('❌ Database query error:', errorMessage)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    query,
    data: computed(() => data.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value)
  }
}
