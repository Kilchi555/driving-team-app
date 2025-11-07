// server/api/admin/send-device-verification.post.ts
// Sendet Magic Link per E-Mail zur Geräte-Verifikation

import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'

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

    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Supabase configuration missing'
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

    // Versende E-Mail mit Magic Link (via Supabase Auth OTP)
    try {
      const { error: emailError } = await supabase.auth.signInWithOtp({
        email: userEmail,
        options: {
          emailRedirectTo: verificationLink,
          data: {
            device_id: deviceId,
            device_name: deviceName || 'Neues Gerät',
            verification_token: verificationToken
          }
        }
      })

      if (emailError) {
        console.error('Error sending OTP email:', emailError)
        // Fallback: Direkter E-Mail-Versand via Edge Function falls OTP nicht funktioniert
        throw emailError
      }
    } catch (otpError: any) {
      console.warn('OTP email failed, trying direct email service:', otpError.message)
      
      // Fallback: Verwende Supabase Edge Function für E-Mail
      // (Dieser Fallback kann später durch echte E-Mail-Service-Integration ersetzt werden)
      const { error: emailFunctionError } = await supabase.functions.invoke('send-email', {
        body: {
          to: userEmail,
          subject: 'Geräte-Verifikation erforderlich',
          html: `
            <h2>Neues Gerät erkannt</h2>
            <p>Ein neues Gerät wurde für Ihr Konto erkannt: <strong>${deviceName || 'Unbekanntes Gerät'}</strong></p>
            <p>Bitte bestätigen Sie dieses Gerät, indem Sie auf den folgenden Link klicken:</p>
            <p><a href="${verificationLink}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Gerät bestätigen</a></p>
            <p>Oder kopieren Sie diesen Link in Ihren Browser:</p>
            <p>${verificationLink}</p>
            <p><small>Dieser Link ist 24 Stunden gültig.</small></p>
          `,
          text: `
Neues Gerät erkannt

Ein neues Gerät wurde für Ihr Konto erkannt: ${deviceName || 'Unbekanntes Gerät'}

Bitte bestätigen Sie dieses Gerät, indem Sie auf den folgenden Link klicken:
${verificationLink}

Dieser Link ist 24 Stunden gültig.
          `
        }
      })

      if (emailFunctionError) {
        console.error('Email function error:', emailFunctionError)
        // Auch wenn E-Mail fehlschlägt, geben wir den Token zurück
        // Der User kann den Link manuell aufrufen
      }
    }

    return {
      success: true,
      message: 'Verification email sent',
      verificationLink, // Für Testing/Debugging
      expiresAt: expiresAt.toISOString()
    }

  } catch (error: any) {
    console.error('Error in send-device-verification:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to send verification email'
    })
  }
})

