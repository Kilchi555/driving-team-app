import { ref, computed } from 'vue'
import { logger } from '~/utils/logger'

interface QueryFilter {
  column: string
  operator: 'eq' | 'neq' | 'lt' | 'lte' | 'gt' | 'gte' | 'like' | 'ilike' | 'in' | 'is' | 'contains'
  value: any
}

interface QueryOptions {
  action: 'select' | 'insert' | 'update' | 'delete'
  table: string
  select?: string
  data?: Record<string, any>
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
 * Supports SELECT, INSERT, UPDATE, DELETE operations
 * 
 * Usage:
 * 
 *   const { query, data, loading, error } = useDatabaseQuery()
 *   
 *   // SELECT
 *   await query({
 *     action: 'select',
 *     table: 'locations',
 *     select: '*',
 *     filters: [{ column: 'tenant_id', operator: 'eq', value: tenantId }],
 *     order: { column: 'name', ascending: true }
 *   })
 *   
 *   // INSERT
 *   await query({
 *     action: 'insert',
 *     table: 'locations',
 *     data: { name: 'New Location', tenant_id: tenantId }
 *   })
 *   
 *   // UPDATE
 *   await query({
 *     action: 'update',
 *     table: 'locations',
 *     data: { name: 'Updated Name' },
 *     filters: [{ column: 'id', operator: 'eq', value: locationId }]
 *   })
 *   
 *   // DELETE
 *   await query({
 *     action: 'delete',
 *     table: 'locations',
 *     filters: [{ column: 'id', operator: 'eq', value: locationId }]
 *   })
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
      logger.debug('🔍 Executing database query:', {
        action: options.action,
        table: options.table
      })

      const response = await $fetch('/api/database/query', {
        method: 'POST',
        body: {
          action: options.action,
          table: options.table,
          select: options.select,
          data: options.data,
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
        action: options.action,
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
