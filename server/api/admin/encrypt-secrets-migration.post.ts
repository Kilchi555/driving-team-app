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

import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { encryptAllPlaintextSecrets, checkEncryptionStatus } from '~/server/utils/encrypt-secrets-migration'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // ✅ AUTHENTICATION - Admin only. Bearer header with HTTP-only-cookie
    // fallback + token refresh, instead of a raw Bearer-only check that
    // would 401 whenever the client's access token had just expired.
    const authUser = await getAuthenticatedUser(event)

    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - Invalid token'
      })
    }

    // Get user profile and check if admin (already resolved by getAuthenticatedUser)
    const userProfile = authUser.db_user_id
      ? { id: authUser.db_user_id, role: authUser.role, tenant_id: authUser.tenant_id }
      : null

    if (!userProfile) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden - User profile not found'
      })
    }

    // Only super_admin can run this migration
    if (userProfile.role !== 'super_admin') {
      logger.warn(`⚠️ Unauthorized encryption migration attempt by ${userProfile.role}:`, authUser.id)
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden - Only super_admin can run this migration'
      })
    }

    logger.info(`🔒 Starting encryption migration by admin: ${authUser.id}`)

    // Check current status first
    const statusBefore = await checkEncryptionStatus()
    logger.info('📊 Encryption status before migration:', statusBefore)

    // Run encryption migration
    const result = await encryptAllPlaintextSecrets()

    // Check status after
    const statusAfter = await checkEncryptionStatus()
    logger.info('📊 Encryption status after migration:', statusAfter)

    logger.info(`✅ Encryption migration completed by admin: ${authUser.id}`)

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
