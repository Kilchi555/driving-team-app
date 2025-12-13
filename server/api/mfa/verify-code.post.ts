import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

/**
 * Verify MFA code (SMS or Email)
 * Used to complete MFA authentication during login
 */
export default defineEventHandler(async (event) => {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server configuration error'
    })
  }

  const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    const { userId, code, method, ipAddress, deviceName } = await readBody(event)

    if (!userId || !code || !method) {
      throw createError({
        statusCode: 400,
        statusMessage: 'userId, code, and method required'
      })
    }

    if (!['sms', 'email'].includes(method)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid method. Must be sms or email'
      })
    }

    logger.debug(`🔐 Verifying ${method} code for user: ${userId}`)

    // 1. Find the code in database
    const table = method === 'sms' ? 'mfa_sms_codes' : 'mfa_email_codes'
    const { data: codeData, error: codeError } = await serviceSupabase
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .eq('code', code.toString())
      .is('used_at', null) // Not yet used
      .gte('expires_at', new Date().toISOString()) // Not expired
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (codeError || !codeData) {
      logger.warn(`❌ Invalid or expired code for user ${userId}`)
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid or expired code'
      })
    }

    // 2. Mark code as used
    const { error: updateError } = await serviceSupabase
      .from(table)
      .update({ used_at: new Date().toISOString() })
      .eq('id', codeData.id)

    if (updateError) {
      logger.error('❌ Error marking code as used:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to verify code'
      })
    }

    // 3. Log the verification
    const { error: logError } = await serviceSupabase
      .from('mfa_verifications')
      .insert({
        user_id: userId,
        verification_type: method === 'sms' ? 'sms_code' : 'email_code',
        ip_address: ipAddress,
        device_name: deviceName,
        success: true
      })

    if (logError) {
      logger.warn('⚠️ Error logging MFA verification:', logError)
      // Don't fail if logging fails
    }

    // 4. Update last_mfa_verification_at in users table
    const { error: userUpdateError } = await serviceSupabase
      .from('users')
      .update({ last_mfa_verification_at: new Date().toISOString() })
      .eq('id', userId)

    if (userUpdateError) {
      logger.warn('⚠️ Error updating last_mfa_verification_at:', userUpdateError)
    }

    logger.info(`✅ ${method.toUpperCase()} code verified for user: ${userId}`)

    return {
      success: true,
      message: `${method} code verified successfully`,
      userId: userId
    }
  } catch (error: any) {
    console.error('❌ Error in verify-code endpoint:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to verify code'
    })
  }
})

