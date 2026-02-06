/**
 * POST /api/admin/encrypt-secrets-migration
 * 
 * ⚠️ ADMIN ONLY - Triggers encryption of all plaintext secrets in tenant_secrets table
 * 
 * This endpoint should ONLY be called ONCE after ENCRYPTION_KEY is deployed to production.
 * 
 * Usage:
 * POST /api/admin/encrypt-secrets-migration
 * Authorization: Bearer [admin-token]
 */

import { defineEventHandler, createError, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { encryptAllPlaintextSecrets, checkEncryptionStatus } from '~/server/utils/encrypt-secrets-migration'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // ✅ AUTHENTICATION - Admin only
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - Bearer token required'
      })
    }

    const token = authHeader.substring(7)
    const supabaseAdmin = getSupabaseAdmin()
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - Invalid token'
      })
    }

    // Get user profile and check if admin
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, role, tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !userProfile) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden - User profile not found'
      })
    }

    // Only super_admin can run this migration
    if (userProfile.role !== 'super_admin') {
      logger.warn(`⚠️ Unauthorized encryption migration attempt by ${userProfile.role}:`, user.id)
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden - Only super_admin can run this migration'
      })
    }

    logger.info(`🔒 Starting encryption migration by admin: ${user.id}`)

    // Check current status first
    const statusBefore = await checkEncryptionStatus()
    logger.info('📊 Encryption status before migration:', statusBefore)

    // Run encryption migration
    const result = await encryptAllPlaintextSecrets()

    // Check status after
    const statusAfter = await checkEncryptionStatus()
    logger.info('📊 Encryption status after migration:', statusAfter)

    logger.info(`✅ Encryption migration completed by admin: ${user.id}`)

    return {
      success: true,
      message: 'Encryption migration completed successfully',
      migration: result,
      statusBefore,
      statusAfter
    }
  } catch (error: any) {
    logger.error('❌ Encryption migration failed:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Encryption migration failed'
    })
  }
})
