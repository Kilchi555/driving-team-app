/**
 * POST /api/admin/test-db-connection
 * 
 * Test Supabase connection without authentication
 * Useful for debugging connection issues
 */

import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    logger.info('🔌 Testing Supabase connection...')
    
    const supabase = getSupabaseAdmin()
    logger.info('✅ Supabase admin client created')
    
    // Try a simple query with timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout after 5 seconds')), 5000)
    )
    
    const queryPromise = supabase
      .from('tenant_secrets')
      .select('count', { count: 'exact', head: true })
    
    const result = await Promise.race([queryPromise, timeoutPromise])
    
    logger.info('✅ Database connection successful')
    
    return {
      success: true,
      message: 'Database connection working',
      timestamp: new Date().toISOString()
    }
  } catch (error: any) {
    logger.error('❌ Database connection failed:', error.message)
    
    throw createError({
      statusCode: 500,
      statusMessage: `Database connection failed: ${error.message}`
    })
  }
})
