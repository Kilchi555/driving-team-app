import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { sendSMS } from '~/server/utils/sms'
import { sendEmail } from '~/server/utils/email'
import { logger } from '~/utils/logger'

/**
 * Send MFA code via SMS or Email
 * Used as fallback when passkey is not available
 */
export default defineEventHandler(async (event) => {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server configuration error'
    })
  }

  const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    const { email, method } = await readBody(event) // method: 'sms' or 'email'

    if (!email || !method || !['sms', 'email'].includes(method)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Email and method (sms/email) required'
      })
    }

    logger.debug(`📱 MFA Code Request: ${method} for ${email}`)

    // 1. Find user by email
    const { data: userProfile, error: userError } = await serviceSupabase
      .from('users')
      .select('id, email, phone, mfa_enabled')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (userError || !userProfile) {
      logger.warn(`⚠️ User not found for MFA code: ${email}`)
      // Don't reveal if user exists (security)
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid email or user not found'
      })
    }

    // 2. Check if MFA is enabled
    if (!userProfile.mfa_enabled) {
      logger.warn(`⚠️ MFA not enabled for user: ${email}`)
      throw createError({
        statusCode: 400,
        statusMessage: 'MFA not enabled for this account'
      })
    }

    // 3. Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    logger.debug(`🔐 Generated code for ${method}: ${code}`)

    // 4. Store code in database
    if (method === 'sms') {
      if (!userProfile.phone) {
        throw createError({
          statusCode: 400,
          statusMessage: 'No phone number on file for SMS'
        })
      }

      const { error: codeError } = await serviceSupabase
        .from('mfa_sms_codes')
        .insert({
          user_id: userProfile.id,
          code: code,
          phone_number: userProfile.phone,
          expires_at: expiresAt.toISOString()
        })

      if (codeError) {
        logger.error('❌ Error storing SMS code:', codeError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to generate code'
        })
      }

      // 5. Send SMS
      try {
        await sendSMS({
          to: userProfile.phone,
          message: `Dein MFA-Code: ${code}\nGültig für 10 Minuten.\nDiesen Code niemandem mitteilen!`,
          senderName: 'DRIVING TEAM' // Your brand name
        })
        logger.info(`✅ SMS code sent to ${userProfile.phone}`)
      } catch (smsError) {
        logger.error('❌ Error sending SMS:', smsError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to send SMS code'
        })
      }
    } else if (method === 'email') {
      const { error: codeError } = await serviceSupabase
        .from('mfa_email_codes')
        .insert({
          user_id: userProfile.id,
          code: code,
          expires_at: expiresAt.toISOString()
        })

      if (codeError) {
        logger.error('❌ Error storing email code:', codeError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to generate code'
        })
      }

      // 5. Send Email
      try {
        await sendEmail({
          to: userProfile.email,
          subject: 'Dein MFA-Verifizierungscode',
          html: `
            <h2>MFA-Verifizierungscode</h2>
            <p>Dein Sicherheitscode:</p>
            <h1 style="font-size: 48px; letter-spacing: 10px; font-weight: bold;">
              ${code}
            </h1>
            <p style="color: #666;">
              Dieser Code ist 10 Minuten gültig.
            </p>
            <p style="color: #999; font-size: 12px;">
              Wenn du diesen Code nicht angefordert hast, ignoriere diese E-Mail.
            </p>
          `
        })
        logger.info(`✅ Email code sent to ${userProfile.email}`)
      } catch (emailError) {
        logger.error('❌ Error sending email:', emailError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to send email code'
        })
      }
    }

    return {
      success: true,
      message: `Code sent via ${method}`,
      method: method,
      maskedPhone: method === 'sms' ? userProfile.phone?.replace(/(?<=.{2})./g, '*') : undefined,
      maskedEmail: method === 'email' ? userProfile.email?.replace(/(.{2})(.*)(@.*)/, '$1***$3') : undefined
    }
  } catch (error: any) {
    console.error('❌ Error in send-code endpoint:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to send MFA code'
    })
  }
})

