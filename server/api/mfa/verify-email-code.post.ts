import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

/**
 * Verify email MFA code
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

    // Find and verify email code
    const now = new Date().toISOString()
    const { data: emailCode, error: codeError } = await adminSupabase
      .from('mfa_email_codes')
      .select('id')
      .eq('user_id', userId)
      .eq('code', code)
      .gt('expires_at', now)
      .single()

    if (codeError || !emailCode) {
      logger.debug('❌ Invalid or expired email code')
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid or expired code'
      })
    }

    // Mark code as used (soft delete)
    const { error: updateError } = await adminSupabase
      .from('mfa_email_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', emailCode.id)

    if (updateError) {
      logger.debug('❌ Error marking code as used:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to use code'
      })
    }

    // Log MFA verification
    await adminSupabase
      .from('mfa_verifications')
      .insert({
        user_id: userId,
        verification_type: 'email_code',
        success: true
      })

    logger.debug('✅ Email code verified successfully')

    return {
      success: true,
      message: 'MFA verification successful'
    }
  } catch (error: any) {
    console.error('Error in verify-email-code:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'MFA verification failed'
    })
  }
})

