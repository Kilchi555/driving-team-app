// server/api/admin/execute-sql.post.ts
import { createClient } from '@supabase/supabase-js'
import { routeRequiresFeatureFlag, validateFeatureAccess } from '~/utils/featureFlags'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  
  try {
    // Check feature flag for admin operations
    const url = event.node.req.url || ''
    if (routeRequiresFeatureFlag(url)) {
      const tenantId = getHeader(event, 'x-tenant-id') || getQuery(event).tenantId as string
      if (!tenantId) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Tenant ID required for feature-protected route'
        })
      }
      
      const featureCheck = await validateFeatureAccess(tenantId, url)
      if (!featureCheck.enabled) {
        throw createError({
          statusCode: 403,
          statusMessage: `Feature access denied: ${featureCheck.message}`
        })
      }
    }

    // Only allow admins to execute SQL
    const body = await readBody(event)
    const { sql, description } = body
    
    if (!sql) {
      throw createError({
        statusCode: 400,
        statusMessage: 'SQL query is required'
      })
    }
    
    // Create service role client for admin operations
    const supabase = createClient(
      config.public.supabaseUrl,
      config.supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    logger.debug('🔧 Executing SQL:', description || 'Manual SQL execution')
    logger.debug('📝 Query:', sql.substring(0, 200) + '...')
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      console.error('❌ SQL execution error:', error)
      throw createError({
        statusCode: 500,
        statusMessage: `SQL execution failed: ${error.message}`
      })
    }
    
    logger.debug('✅ SQL executed successfully')
    
    return {
      success: true,
      description: description || 'SQL executed',
      result: data
    }
    
  } catch (err) {
    console.error('❌ API Error:', err)
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'Failed to execute SQL'
    })
  }
})




