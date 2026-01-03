// server/api/admin/send-device-verification.post.ts
// Sendet Magic Link per E-Mail zur Geräte-Verifikation

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail } from '~/server/utils/email'
import { logger } from '~/utils/logger'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logAudit } from '~/server/utils/audit'
import { getClientIP } from '~/server/utils/ip-utils'
import sanitize from 'isomorphic-dompurify'

export default defineEventHandler(async (event) => {
  let user: any = null
  let ip: string = ''
  
  try {
    // 1. AUTHENTICATION
    user = await getAuthenticatedUser(event)
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - Authentication required'
      })
    }

    // 2. AUTHORIZATION (Admin/Super Admin)
    if (!['admin', 'super_admin', 'tenant_admin'].includes(user.role)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden - Admin role required'
      })
    }

    // 3. RATE LIMITING
    ip = getClientIP(event)
    
    // Dual rate limiting: Per IP (20/min) AND Per User (50/hour)
    const rateLimitIP = await checkRateLimit(
      ip,
      'send_verification_ip',
      20,
      60000
    )

    if (!rateLimitIP.allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: `Rate limit exceeded (IP). Retry after ${rateLimitIP.retryAfter}ms`
      })
    }

    const rateLimitUser = await checkRateLimit(
      user.id,
      'send_verification_user',
      50,
      3600000
    )

    if (!rateLimitUser.allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: `Rate limit exceeded (User). Retry after ${rateLimitUser.retryAfter}ms`
      })
    }

    // 4. INPUT VALIDATION
    const body = await readBody(event)
    const { userId, deviceId, userEmail, deviceName } = body

    if (!userId || !deviceId || !userEmail) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: userId, deviceId, userEmail'
      })
    }

    // Validate UUID format
    if (!/^[a-f0-9-]{36}$/.test(userId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid userId format (must be UUID)'
      })
    }

    if (!/^[a-f0-9-]{36}$/.test(deviceId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid deviceId format (must be UUID)'
      })
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid email format'
      })
    }

    // 5. INPUT SANITIZATION
    const sanitizedDeviceName = deviceName ? sanitize(deviceName) : 'Unbekanntes Gerät'

    const supabase = getSupabaseAdmin()

    // 6. AUTHORIZATION - Verify user owns the device (ownership check)
    const { data: device, error: deviceError } = await supabase
      .from('user_devices')
      .select('id, user_id')
      .eq('id', deviceId)
      .eq('user_id', userId)
      .single()

    if (deviceError || !device) {
      // AUDIT LOGGING (Authorization failure)
      await logAudit({
        user_id: user.id,
        action: 'admin_send_verification_unauthorized',
        resource_type: 'device',
        resource_id: deviceId,
        status: 'failed',
        details: { reason: 'device_not_owned_by_user' },
        ip_address: ip
      }).catch(() => {})

      throw createError({
        statusCode: 403,
        statusMessage: 'Device not found or does not belong to this user'
      })
    }

    // Generiere Verifikations-Token
    const verificationToken = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // Token gültig für 24h

    // Speichere Token im Gerät
    const { error: updateError } = await supabase
      .from('user_devices')
      .update({
        verification_token: verificationToken,
        verification_expires_at: expiresAt.toISOString()
      })
      .eq('id', deviceId)
      .eq('user_id', userId)

    if (updateError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to store verification token: ${updateError.message}`
      })
    }

    // Erstelle Magic Link
    const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'https://www.simy.ch'
    const verificationLink = `${baseUrl}/verify-device/${verificationToken}`

    // E-Mail HTML Template
    const emailHtml = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Geräte-Verifikation erforderlich</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; margin-bottom: 20px;">
    <h1 style="color: #2563eb; margin-top: 0;">Neues Gerät erkannt</h1>
    
    <p>Hallo,</p>
    
    <p>Ein neues Gerät wurde für Ihr Konto erkannt: <strong>${sanitizedDeviceName}</strong></p>
    
    <div style="background-color: white; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 5px;">
      <p style="margin: 5px 0;">Aus Sicherheitsgründen müssen Sie dieses Gerät bestätigen, bevor Sie sich anmelden können.</p>
    </div>
    
    <p>Bitte bestätigen Sie dieses Gerät, indem Sie auf den folgenden Button klicken:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationLink}" 
         style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        Gerät jetzt bestätigen
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666;">
      Oder kopieren Sie diesen Link in Ihren Browser:<br>
      <a href="${verificationLink}" style="color: #2563eb; word-break: break-all;">${verificationLink}</a>
    </p>
    
    <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #856404;">
        <strong>⏰ Wichtig:</strong> Dieser Link ist 24 Stunden gültig.
      </p>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #999;">
      Wenn Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail bitte. Ihr Konto bleibt sicher.
    </p>
  </div>
</body>
</html>
    `

    // Versende E-Mail via Resend
    try {
      const emailResult = await sendEmail({
        to: userEmail,
        subject: 'Geräte-Verifikation erforderlich',
        html: emailHtml
      })

      logger.debug('✅ Device verification email sent:', emailResult.messageId)

      // AUDIT LOGGING (SUCCESS)
      await logAudit({
        user_id: user.id,
        action: 'admin_send_verification_success',
        resource_type: 'device',
        resource_id: deviceId,
        status: 'success',
        details: {
          device_name: sanitizedDeviceName,
          email: userEmail,
          message_id: emailResult.messageId
        },
        ip_address: ip
      }).catch(() => {})

      return {
        success: true,
        message: 'Verification email sent',
        verificationLink, // Für Testing/Debugging
        expiresAt: expiresAt.toISOString()
      }
    } catch (emailError: any) {
      console.error('❌ Error sending device verification email:', emailError)
      
      // AUDIT LOGGING (Email failure)
      await logAudit({
        user_id: user.id,
        action: 'admin_send_verification_email_failed',
        resource_type: 'device',
        resource_id: deviceId,
        status: 'partial',
        details: { error_message: emailError.message },
        ip_address: ip
      }).catch(() => {})

      // Token wurde erstellt, aber E-Mail fehlgeschlagen
      return {
        success: true,
        message: 'Token created but email failed',
        verificationLink,
        expiresAt: expiresAt.toISOString(),
        emailError: emailError.message
      }
    }

  } catch (error: any) {
    console.error('❌ Error in send-device-verification:', error)

    // AUDIT LOGGING (ERROR)
    if (user) {
      await logAudit({
        user_id: user.id,
        action: 'admin_send_verification_error',
        status: 'error',
        error_message: error.message || 'Failed to send verification',
        ip_address: ip
      }).catch(() => {})
    }

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to send verification email'
    })
  }
})

