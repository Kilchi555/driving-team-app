// server/api/admin/send-device-verification.post.ts
// Sendet Magic Link per E-Mail zur Geräte-Verifikation

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail } from '~/server/utils/email'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { userId, deviceId, userEmail, deviceName } = body

    if (!userId || !deviceId || !userEmail) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: userId, deviceId, userEmail'
      })
    }

    const supabase = getSupabaseAdmin()

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
    
    <p>Ein neues Gerät wurde für Ihr Konto erkannt: <strong>${deviceName || 'Unbekanntes Gerät'}</strong></p>
    
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

      return {
        success: true,
        message: 'Verification email sent',
        verificationLink, // Für Testing/Debugging
        expiresAt: expiresAt.toISOString()
      }
    } catch (emailError: any) {
      console.error('❌ Error sending device verification email:', emailError)
      
      // Auch wenn E-Mail fehlschlägt, geben wir den Token zurück
      // Der User kann den Link manuell aufrufen
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
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to send verification email'
    })
  }
})

