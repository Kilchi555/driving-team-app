/**
 * API Endpoint: Migrate postal codes for pickup locations
 * Admin-only endpoint to populate postal_code for existing pickup locations
 */

import { defineEventHandler, createError, getHeader, getQuery } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { migratePickupLocationPostalCodes } from '~/server/utils/migrations/migrate-postal-codes'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // For development/admin use only - check for simple token
    // This is a one-time migration task, not a regular API endpoint
    const query = getQuery(event)
    const adminToken = (query.token as string) || getHeader(event, 'x-admin-token')
    
    // Accept a simple hardcoded token for development
    // In production, this should be done differently or removed after migration
    if (adminToken !== 'migrate-postal-codes-admin-2026') {
      logger.warn('⚠️ Migration attempt without valid token')
      throw createError({ statusCode: 401, message: 'Admin token required' })
    }
    
    logger.debug(`🔄 Starting postal code migration`)
    
    const result = await migratePickupLocationPostalCodes()
    
    logger.debug(`✅ Migration completed:`, result)
    
    return {
      success: true,
      message: `Migration complete: ${result.updated}/${result.processed} locations updated`,
      ...result
    }
    
  } catch (error: any) {
    logger.error('❌ Migration failed:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      message: error.message || 'Migration failed'
    })
  }
})
