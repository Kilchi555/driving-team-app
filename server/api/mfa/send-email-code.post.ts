import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'
import { sendEmail } from '~/server/utils/email'

/**
 * Send MFA code via email
 */
export default defineEventHandler(async (event) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const { userId } = await readBody(event)

    if (!userId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'User ID is required'
      })
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey)

    // Get user
    const { data: user, error: userError } = await adminSupabase
      .from('users')
      .select('id, email')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    // Store code in database (in a real app, hash this)
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 10)

    const { error: storeError } = await adminSupabase
      .from('mfa_email_codes')
      .insert({
        user_id: userId,
        code,
        expires_at: expiresAt.toISOString()
      })

    if (storeError) {
      logger.debug('❌ Error storing email code:', storeError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to generate code'
      })
    }

    // Send email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Ihr Bestätigungscode - Simy Driving Team',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #1f2937;">Authentifizierungscode</h2>
            <p style="color: #6b7280; font-size: 14px;">
              Jemand versucht, sich in Ihrem Konto anzumelden. Geben Sie diesen Code ein:
            </p>
            <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px; margin: 0; color: #1f2937;">
                ${code}
              </p>
            </div>
            <p style="color: #6b7280; font-size: 12px;">
              Dieser Code ist 10 Minuten gültig.
            </p>
            <p style="color: #6b7280; font-size: 12px;">
              Falls Sie dies nicht angefordert haben, ignorieren Sie diese E-Mail.
            </p>
          </div>
        `
      })

      logger.debug('✅ MFA email code sent to:', user.email)
    } catch (emailError) {
      logger.debug('⚠️ Error sending email code:', emailError)
      // Don't fail completely, code is stored
    }

    return {
      success: true,
      message: 'Code sent to your email'
    }
  } catch (error: any) {
    console.error('Error in send-email-code:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to send code'
    })
  }
})

