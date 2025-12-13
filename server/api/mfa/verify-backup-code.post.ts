import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

/**
 * Verify backup code for MFA
 * One-time use codes that can be used if the passkey is lost
 */
export default defineEventHandler(async (event) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const { userId, code } = await readBody(event)

    if (!userId || !code) {
      throw createError({
        statusCode: 400,
        statusMessage: 'User ID and code are required'
      })
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey)

    // Find and verify backup code
    const { data: backupCode, error: codeError } = await adminSupabase
      .from('mfa_backup_codes')
      .select('id')
      .eq('user_id', userId)
      .eq('code', code.toUpperCase())
      .is('used_at', null)
      .single()

    if (codeError || !backupCode) {
      logger.debug('❌ Invalid or used backup code')
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid backup code'
      })
    }

    // Mark code as used
    const { error: updateError } = await adminSupabase
      .from('mfa_backup_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', backupCode.id)

    if (updateError) {
      logger.debug('❌ Error marking backup code as used:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to use backup code'
      })
    }

    // Log MFA verification
    await adminSupabase
      .from('mfa_verifications')
      .insert({
        user_id: userId,
        verification_type: 'backup_code',
        success: true
      })

    logger.debug('✅ Backup code verified successfully')

    return {
      success: true,
      message: 'MFA verification successful'
    }
  } catch (error: any) {
    console.error('Error in verify-backup-code:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'MFA verification failed'
    })
  }
})

