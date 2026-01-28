import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

/**
 * Generic secure database query endpoint
 * 
 * Allows clients to safely query the database without exposing service role key.
 * Uses auth tokens from HTTP-Only cookies for authorization.
 * 
 * Usage from client:
 * 
 *   const response = await $fetch('/api/database/query', {
 *     method: 'POST',
 *     body: {
 *       table: 'locations',
 *       select: '*',
 *       filters: [
 *         { column: 'tenant_id', operator: 'eq', value: 'tenant-123' },
 *         { column: 'is_active', operator: 'eq', value: true }
 *       ],
 *       order: { column: 'name', ascending: true }
 *     }
 *   })
 */

interface QueryFilter {
  column: string
  operator: 'eq' | 'neq' | 'lt' | 'lte' | 'gt' | 'gte' | 'like' | 'ilike' | 'in' | 'is' | 'contains'
  value: any
}

interface QueryRequest {
  table: string
  select?: string
  filters?: QueryFilter[]
  order?: { column: string; ascending?: boolean }
  limit?: number
  offset?: number
  single?: boolean // Return single row instead of array
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<QueryRequest>(event)
    
    // Validate request
    if (!body.table) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Table name required'
      })
    }

    // Whitelist allowed tables (security: prevent arbitrary table access)
    const allowedTables = [
      'locations',
      'categories',
      'staff_working_hours',
      'calendar_tokens',
      'appointments',
      'users',
      'tenants',
      'products',
      'payments',
      'discounts',
      'exam_results',
      'user_devices',
      'login_attempts',
      'blocked_ip_addresses'
    ]

    if (!allowedTables.includes(body.table)) {
      logger.warn('🚫 Attempted access to non-whitelisted table:', body.table)
      throw createError({
        statusCode: 403,
        statusMessage: 'Access to this table is not allowed'
      })
    }

    // Get Supabase admin client
    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    logger.debug('📊 Executing database query:', {
      table: body.table,
      select: body.select || '*',
      filters: body.filters?.length || 0,
      limit: body.limit
    })

    // Build query
    let query = supabase
      .from(body.table)
      .select(body.select || '*')

    // Apply filters
    if (body.filters && body.filters.length > 0) {
      for (const filter of body.filters) {
        switch (filter.operator) {
          case 'eq':
            query = query.eq(filter.column, filter.value)
            break
          case 'neq':
            query = query.neq(filter.column, filter.value)
            break
          case 'lt':
            query = query.lt(filter.column, filter.value)
            break
          case 'lte':
            query = query.lte(filter.column, filter.value)
            break
          case 'gt':
            query = query.gt(filter.column, filter.value)
            break
          case 'gte':
            query = query.gte(filter.column, filter.value)
            break
          case 'like':
            query = query.like(filter.column, filter.value)
            break
          case 'ilike':
            query = query.ilike(filter.column, filter.value)
            break
          case 'in':
            query = query.in(filter.column, filter.value)
            break
          case 'is':
            query = query.is(filter.column, filter.value)
            break
          case 'contains':
            query = query.contains(filter.column, filter.value)
            break
        }
      }
    }

    // Apply ordering
    if (body.order) {
      query = query.order(body.order.column, {
        ascending: body.order.ascending !== false
      })
    }

    // Apply limit
    if (body.limit) {
      query = query.limit(body.limit)
    }

    // Apply offset
    if (body.offset) {
      query = query.range(body.offset, (body.offset + (body.limit || 1000)) - 1)
    }

    // Execute query
    const { data, error } = body.single 
      ? await query.single()
      : await query

    if (error) {
      logger.debug('❌ Database query error:', {
        table: body.table,
        code: error.code,
        message: error.message
      })
      throw error
    }

    logger.debug('✅ Database query successful:', {
      table: body.table,
      rowCount: Array.isArray(data) ? data.length : (data ? 1 : 0)
    })

    return {
      success: true,
      data
    }

  } catch (error: any) {
    logger.error('❌ Query endpoint error:', error.message)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Database query failed'
    })
  }
})
