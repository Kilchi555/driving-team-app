/**
 * API Endpoint: Migrate postal codes for pickup locations
 * Admin-only endpoint to populate postal_code for existing pickup locations
 */

import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { migratePickupLocationPostalCodes } from '~/server/utils/migrations/migrate-postal-codes'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // Only admins can run this migration
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }
    
    // Verify admin status
    const supabase = getSupabaseAdmin()
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role, is_primary_admin')
      .eq('auth_user_id', authUser.id)
      .single()
    
    if (userError || !user) {
      throw createError({ statusCode: 401, message: 'User not found' })
    }
    
    // Allow admins and primary admins
    if (user.role !== 'admin' && !user.is_primary_admin) {
      throw createError({ statusCode: 403, message: 'Admin access required' })
    }
    
    logger.debug(`🔄 Starting postal code migration for user: ${user.id}`)
    
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
