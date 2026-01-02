import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const { email, mfaMethodId, mfaType } = await readBody(event)

    if (!email || !mfaMethodId || !mfaType) {
      throw createError({
        statusCode: 400,
        statusMessage: 'E-Mail, MFA-Methode und Typ erforderlich'
      })
    }

    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey)

    // Get user
    const { data: user, error: userError } = await adminSupabase
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase().trim())
      .eq('is_active', true)
      .single()

    if (userError || !user) {
      logger.debug('❌ User not found for MFA:', email)
      throw createError({
        statusCode: 401,
        statusMessage: 'Benutzer nicht gefunden'
      })
    }

    // Verify MFA method belongs to user
    const { data: mfaMethod, error: methodError } = await adminSupabase
      .from('mfa_methods')
      .select('id, type, destination')
      .eq('id', mfaMethodId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (methodError || !mfaMethod || mfaMethod.type !== mfaType) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Ungültige MFA-Methode'
      })
    }

    logger.debug('📤 Sending MFA code via', mfaType, 'to user:', user.id)

    // Generate and send code based on type
    const code = generateSecureCode()
    const codeExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Store the code in a temporary table
    const { error: storeError } = await adminSupabase
      .from('mfa_login_codes')
      .insert({
        user_id: user.id,
        method_id: mfaMethodId,
        code: code,
        code_hash: await hashCode(code),
        expires_at: codeExpires.toISOString(),
        created_at: new Date().toISOString()
      })

    if (storeError) {
      console.warn('⚠️ Failed to store MFA code:', storeError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Fehler beim Versenden des Codes'
      })
    }

    // Send code based on method type
    if (mfaType === 'sms') {
      const sendResult = await sendSMSCode(mfaMethod.destination, code)
      if (!sendResult.success) {
        throw createError({
          statusCode: 500,
          statusMessage: sendResult.error || 'SMS konnte nicht versendet werden'
        })
      }
    } else if (mfaType === 'email') {
      const sendResult = await sendEmailCode(user.email, code)
      if (!sendResult.success) {
        throw createError({
          statusCode: 500,
          statusMessage: sendResult.error || 'E-Mail konnte nicht versendet werden'
        })
      }
    } else if (mfaType === 'totp') {
      // TOTP codes are generated client-side, so nothing to send
      logger.debug('✅ TOTP requested, user should use their authenticator app')
    } else {
      throw createError({
        statusCode: 400,
        statusMessage: 'Ungültiger MFA-Typ'
      })
    }

    logger.debug('✅ MFA code sent successfully')

    return {
      success: true,
      message: `Code versendet an ${getMFADestinationDisplay(mfaType, mfaMethod.destination)}`
    }
  } catch (error: any) {
    console.error('Send MFA code error:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Fehler beim Versenden des Codes'
    })
  }
})

function generateSecureCode(): string {
  // Generate 6-digit code
  return Math.floor(100000 + Math.random() * 900000).toString()
}

async function hashCode(code: string): Promise<string> {
  // In production, use a proper hashing library
  // For now, use a simple hash
  const encoder = new TextEncoder()
  const data = encoder.encode(code)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function sendSMSCode(phoneNumber: string, code: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Implement SMS sending logic here (e.g., using Twilio, AWS SNS, etc.)
    logger.debug('📱 SMS code to', phoneNumber.slice(-4), ':', code)
    // TODO: Implement actual SMS sending
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

async function sendEmailCode(email: string, code: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Implement email sending logic here
    logger.debug('📧 Email code to', email.substring(0, 3) + '***:', code)
    // TODO: Implement actual email sending
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

function getMFADestinationDisplay(type: string, destination: string): string {
  if (type === 'sms') {
    return `***-***-${destination.slice(-4)}`
  }
  if (type === 'email') {
    return destination.substring(0, 3) + '***'
  }
  return 'Ihrer MFA-Methode'
}



