import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { logger } from '~/utils/logger'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUserWithDbId } from '~/server/utils/auth'

/**
 * Generic secure database query endpoint
 * 
 * Allows clients to safely query and modify the database without exposing service role key.
 * Uses auth tokens from HTTP-Only cookies for authorization.
 * 
 * Usage from client:
 * 
 *   // READ
 *   const response = await $fetch('/api/database/query', {
 *     method: 'POST',
 *     body: {
 *       action: 'select',
 *       table: 'locations',
 *       select: '*',
 *       filters: [{ column: 'tenant_id', operator: 'eq', value: 'tenant-123' }]
 *     }
 *   })
 *   
 *   // INSERT
 *   const response = await $fetch('/api/database/query', {
 *     method: 'POST',
 *     body: {
 *       action: 'insert',
 *       table: 'locations',
 *       data: { name: 'Location 1', tenant_id: 'tenant-123' }
 *     }
 *   })
 *   
 *   // UPDATE
 *   const response = await $fetch('/api/database/query', {
 *     method: 'POST',
 *     body: {
 *       action: 'update',
 *       table: 'locations',
 *       data: { name: 'Updated Name' },
 *       filters: [{ column: 'id', operator: 'eq', value: 'loc-123' }]
 *     }
 *   })
 *   
 *   // DELETE
 *   const response = await $fetch('/api/database/query', {
 *     method: 'POST',
 *     body: {
 *       action: 'delete',
 *       table: 'locations',
 *       filters: [{ column: 'id', operator: 'eq', value: 'loc-123' }]
 *     }
 *   })
 */

interface QueryFilter {
  column: string
  operator: 'eq' | 'neq' | 'lt' | 'lte' | 'gt' | 'gte' | 'like' | 'ilike' | 'in' | 'is' | 'contains'
  value: any
}

interface QueryRequest {
  action: 'select' | 'insert' | 'update' | 'delete'
  table: string
  select?: string
  data?: Record<string, any>
  filters?: QueryFilter[]
  order?: { column: string; ascending?: boolean }
  limit?: number
  offset?: number
  single?: boolean // Return single row instead of array
}

export default defineEventHandler(async (event) => {
  try {
    // ✅ AUTHENTIFIZIERUNG - nur eingeloggte User dürfen Queries machen
    const authUser = await getAuthenticatedUserWithDbId(event)
    if (!authUser) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    const body = await readBody<QueryRequest>(event)
    
    // Validate request
    if (!body.table) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Table name required'
      })
    }

    if (!body.action) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Action required (select, insert, update, delete)'
      })
    }

    // Whitelist: table → allowed columns for select/filter/order
    // ⚠️  Never expose auth, secrets, keys, or PII columns via this generic endpoint.
    const TABLE_COLUMN_WHITELIST: Record<string, string[]> = {
      locations: ['id', 'name', 'address', 'city', 'postal_code', 'canton', 'formatted_address', 'tenant_id', 'is_active', 'latitude', 'longitude', 'created_at', 'updated_at', 'staff_ids', 'available_categories', 'location_type', 'user_id'],
      categories: ['id', 'name', 'code', 'parent_category_id', 'tenant_id', 'is_active', 'sort_order'],
      staff_working_hours: ['id', 'staff_id', 'tenant_id', 'day_of_week', 'start_time', 'end_time', 'is_active'],
      calendar_tokens: ['id', 'staff_id', 'tenant_id', 'token', 'expires_at', 'created_at'],
      appointments: ['id', 'tenant_id', 'staff_id', 'user_id', 'start_time', 'end_time', 'status', 'type', 'created_at'],
      products: ['id', 'name', 'price_rappen', 'tenant_id', 'is_active', 'category', 'description'],
      discounts: ['id', 'code', 'discount_amount_rappen', 'tenant_id', 'is_active', 'valid_until'],
      exam_results: ['id', 'user_id', 'tenant_id', 'category', 'passed', 'exam_date', 'examiner_id'],
      user_devices: ['id', 'user_id', 'tenant_id', 'device_name', 'last_seen', 'is_active'],
    }

    const allowedColumns = TABLE_COLUMN_WHITELIST[body.table]
    if (!allowedColumns) {
      logger.warn('🚫 Attempted access to non-whitelisted table:', body.table)
      throw createError({
        statusCode: 403,
        statusMessage: 'Access to this table is not allowed'
      })
    }

    // Validate all column references in filters and order
    const allRequestedColumns = [
      ...(body.filters?.map(f => f.column) ?? []),
      ...(body.order ? [body.order.column] : []),
    ]
    for (const col of allRequestedColumns) {
      if (!allowedColumns.includes(col)) {
        logger.warn('🚫 Disallowed column access attempt:', { table: body.table, column: col })
        throw createError({ statusCode: 403, statusMessage: `Column '${col}' is not accessible` })
      }
    }

    // Restrict select to whitelisted columns only — never allow '*' or arbitrary expressions
    const safeSelect = allowedColumns.join(', ')

    // ✅ Create a user-scoped Supabase client using the user's JWT (for SELECT → RLS applies)
    const authHeader = getHeader(event, 'authorization')
    let userToken = authHeader?.replace('Bearer ', '') || null

    // If no Authorization header, try to extract from cookies (same logic as getAuthenticatedUser)
    if (!userToken) {
      const cookies = event.node.req.headers.cookie || ''
      for (const cookie of cookies.split(';').map(c => c.trim())) {
        if (!cookie.includes('=')) continue
        const [name, ...valueParts] = cookie.split('=')
        const cookieName = name.trim()
        const value = valueParts.join('=')
        if (cookieName === 'sb-session' || cookieName === 'sb-auth-token' ||
            (cookieName.startsWith('sb-') && (cookieName.includes('session') || cookieName.includes('auth')))) {
          try {
            const decoded = decodeURIComponent(value)
            const sessionData = JSON.parse(decoded)
            if (sessionData?.access_token) {
              userToken = sessionData.access_token
              break
            }
          } catch { /* continue */ }
        }
      }
    }

    if (!userToken) {
      throw createError({ statusCode: 401, statusMessage: 'No auth token provided' })
    }

    // For SELECT: use user JWT + ANON key → RLS applies
    // For INSERT/UPDATE/DELETE: use service_role key → bypasses RLS (we enforce tenant isolation below)
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: `Bearer ${userToken}` }
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Service-role client for writes (INSERT/UPDATE/DELETE) — bypasses RLS
    // Safe because: auth is validated above, tenant isolation enforced below
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    logger.debug('📊 Executing database query:', {
      action: body.action,
      table: body.table,
      filters: body.filters?.length || 0
    })

    let query: any
    let data: any
    let error: any

    // HANDLE SELECT
    if (body.action === 'select') {
      query = supabase
        .from(body.table)
        .select(safeSelect)

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
      const result = body.single 
        ? await query.single()
        : await query

      data = result.data
      error = result.error
    }

    // HANDLE INSERT — uses service_role to bypass RLS (auth already validated above)
    else if (body.action === 'insert') {
      if (!body.data) {
        throw createError({ statusCode: 400, statusMessage: 'Data required for insert' })
      }
      // Strip any fields not in the whitelist
      const safeData = Object.fromEntries(
        Object.entries(body.data).filter(([k]) => allowedColumns.includes(k))
      )
      if (Object.keys(safeData).length === 0) {
        throw createError({ statusCode: 400, statusMessage: 'No valid columns provided for insert' })
      }
      // Enforce tenant isolation: if the table has a tenant_id column, it must match the auth user's tenant
      if (allowedColumns.includes('tenant_id') && safeData.tenant_id && safeData.tenant_id !== authUser.tenant_id) {
        throw createError({ statusCode: 403, statusMessage: 'Tenant mismatch: cannot insert data for another tenant' })
      }
      const result = await supabaseAdmin.from(body.table).insert(safeData).select(safeSelect)
      data = result.data
      error = result.error
    }

    // HANDLE UPDATE — uses service_role to bypass RLS (auth already validated above)
    else if (body.action === 'update') {
      if (!body.data) {
        throw createError({ statusCode: 400, statusMessage: 'Data required for update' })
      }
      if (!body.filters || body.filters.length === 0) {
        throw createError({ statusCode: 400, statusMessage: 'Filters required for update' })
      }
      // Strip any fields not in the whitelist
      const safeData = Object.fromEntries(
        Object.entries(body.data).filter(([k]) => allowedColumns.includes(k))
      )
      if (Object.keys(safeData).length === 0) {
        throw createError({ statusCode: 400, statusMessage: 'No valid columns provided for update' })
      }
      query = supabaseAdmin.from(body.table).update(safeData)
      for (const filter of body.filters) {
        switch (filter.operator) {
          case 'eq': query = query.eq(filter.column, filter.value); break
          case 'neq': query = query.neq(filter.column, filter.value); break
        }
      }
      // Enforce tenant isolation: always filter by auth user's tenant_id for tables that have it
      if (allowedColumns.includes('tenant_id')) {
        query = query.eq('tenant_id', authUser.tenant_id)
      }
      const result = await query.select(safeSelect)
      data = result.data
      error = result.error
    }

    // HANDLE DELETE — uses service_role to bypass RLS (auth already validated above)
    else if (body.action === 'delete') {
      if (!body.filters || body.filters.length === 0) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Filters required for delete'
        })
      }

      query = supabaseAdmin.from(body.table).delete()

      // Apply filters
      for (const filter of body.filters) {
        switch (filter.operator) {
          case 'eq':
            query = query.eq(filter.column, filter.value)
            break
          case 'neq':
            query = query.neq(filter.column, filter.value)
            break
          // ... other operators
        }
      }

      // Enforce tenant isolation: always filter by auth user's tenant_id for tables that have it
      if (allowedColumns.includes('tenant_id')) {
        query = query.eq('tenant_id', authUser.tenant_id)
      }

      const result = await query.select()
      data = result.data
      error = result.error
    }

    if (error) {
      logger.error('❌ Database query error:', {
        table: body.table,
        action: body.action,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      throw createError({
        statusCode: 500,
        statusMessage: `Query failed: ${error.message}`
      })
    }

    logger.debug('✅ Database query successful:', {
      table: body.table,
      action: body.action,
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
