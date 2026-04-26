/**
 * POST /api/admin/encrypt-secrets-migration-dev
 * 
 * ⚠️ DEV ONLY - Triggers encryption migration with simple secret key instead of auth
 * 
 * Use this if you're locked out of the admin account due to MFA issues.
 * 
 * Header: X-Migration-Secret: your-secret-value
 */

import { defineEventHandler, createError, getHeader } from 'h3'
import { encryptAllPlaintextSecrets, checkEncryptionStatus } from '~/server/utils/encrypt-secrets-migration'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  // ✅ Security: disabled in production
  if (process.env.NODE_ENV === 'production') {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }
  try {
    // ✅ SIMPLE AUTHENTICATION - Just check for secret key in header
    const secretKey = getHeader(event, 'x-migration-secret')
    const expectedSecret = process.env.MIGRATION_SECRET_KEY || process.env.ENCRYPTION_KEY
    
    if (!secretKey) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - X-Migration-Secret header required'
      })
    }

    if (secretKey !== expectedSecret) {
      logger.warn(`⚠️ Invalid migration secret attempted`)
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - Invalid secret key'
      })
    }

    logger.info(`🔒 Starting encryption migration via secret key`)

    try {
      // Check current status first
      logger.info('📊 Checking encryption status before migration...')
      const statusBefore = await checkEncryptionStatus()
      logger.info('📊 Encryption status before migration:', statusBefore)

      // Run encryption migration
      logger.info('🔒 Starting to encrypt plaintext secrets...')
      const result = await encryptAllPlaintextSecrets()

      // Check status after
      logger.info('📊 Checking encryption status after migration...')
      const statusAfter = await checkEncryptionStatus()
      logger.info('📊 Encryption status after migration:', statusAfter)

      logger.info(`✅ Encryption migration completed`)

      return {
        success: true,
        message: 'Encryption migration completed successfully',
        migration: result,
        statusBefore,
        statusAfter
      }
    } catch (migrationError: any) {
      logger.error('❌ Migration error during processing:', migrationError)
      throw migrationError
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
