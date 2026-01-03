// ============================================
// API: Send Onboarding Reminder
// ============================================
// Sendet eine Onboarding-Erinnerung
// - Invalidiert den alten Link (falls noch gültig)
// - Erstellt einen neuen Link (14 Tage gültig)
// - Versendet die Erinnerung per Email ODER SMS (je nachdem was verfügbar ist)

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail } from '~/server/utils/email'
import { logger } from '~/utils/logger'
import { v4 as uuidv4 } from 'uuid'

export default defineEventHandler(async (event) => {
  try {
    logger.debug('📧 Onboarding reminder API called')
    
    const body = await readBody(event)
    const { email, firstName, lastName, userId, tenantId, phone } = body

    logger.debug('📧 Onboarding reminder request received:', { 
      email, firstName, lastName, userId, tenantId, phone 
    })

    // ✅ WICHTIG: Entweder Email ODER Phone muss vorhanden sein
    if (!userId || !tenantId) {
      console.error('❌ Missing required fields:', { 
        userId: !!userId, tenantId: !!tenantId 
      })
      throw createError({
        statusCode: 400,
        message: 'Missing required fields: userId, tenantId'
      })
    }

    if (!email && !phone) {
      console.error('❌ Missing contact info:', { email: !!email, phone: !!phone })
      throw createError({
        statusCode: 400,
        message: 'Missing contact info: either email or phone is required'
      })
    }

    logger.debug('✅ Request validation passed')
    
    logger.debug('🔄 About to initialize Supabase admin...')
    const supabase = getSupabaseAdmin()
    logger.debug('✅ Supabase admin initialized')

    // ============================================
    // Step 1: Generate new token (14 Tage gültig)
    // ============================================
    logger.debug('🔄 Step 1: Generating new onboarding token')
    
    const newToken = uuidv4()
    logger.debug('✅ UUID generated:', newToken)
    
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // 30 Tage
    
    logger.debug('✅ New token generated, expires at:', expiresAt.toISOString())

    // ============================================
    // Step 2: Update user with new token (invalidates old link)
    // ============================================
    logger.debug('🔄 Step 2: Updating user with new token')
    logger.debug('🔍 Update params:', { userId, onboarding_status: 'pending' })
    
    const updateData = {
      onboarding_token: newToken,
      onboarding_token_expires: expiresAt.toISOString(),
      updated_at: new Date().toISOString()
    }
    
    logger.debug('📝 Update data:', updateData)
    
    const { error: updateError } = await supabase
      .from('users')
      .update({
        onboarding_token: newToken,
        onboarding_token_expires: expiresAt.toISOString()
      })
      .eq('id', userId)
      .eq('onboarding_status', 'pending')
    
    logger.debug('🔄 Update query executed')
    
    if (updateError) {
      logger.debug('❌ Update error detected:', updateError)
      console.error('❌ Failed to update user with new token:', updateError)
      throw createError({
        statusCode: 500,
        message: `Failed to update user: ${updateError.message}`
      })
    }

    logger.debug('✅ User updated with new token')

    // ============================================
    // Step 3: Generate onboarding link
    // ============================================
    const onboardingLink = `https://simy.ch/onboarding/${newToken}`
    logger.debug('🔗 Generated onboarding link:', onboardingLink)

    // ============================================
    // Step 4: Get tenant information
    // ============================================
    logger.debug('🏢 Loading tenant information for:', tenantId)
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name, primary_color, twilio_from_sender')
      .eq('id', tenantId)
      .single()

    if (tenantError) {
      console.error('❌ Tenant query error:', tenantError)
      throw createError({
        statusCode: 404,
        message: `Tenant query failed: ${tenantError.message}`
      })
    }

    if (!tenant) {
      console.error('❌ Tenant not found for ID:', tenantId)
      throw createError({
        statusCode: 404,
        message: 'Tenant not found'
      })
    }

    logger.debug('✅ Tenant loaded:', tenant.name)

    const tenantName = tenant.name || 'Ihre Fahrschule'
    const primaryColor = tenant.primary_color || '#2563eb'
    const customerName = `${firstName} ${lastName}`.trim() || 'Kunde'
    
    let emailSent = false
    let smsSent = false
    const channels: string[] = []

    // ============================================
    // Step 5a: Send reminder EMAIL (if email is available)
    // ============================================
    if (email) {
      try {
        logger.debug('📧 Sending reminder email to:', email)
        
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Registrierungserinnerung von ${tenantName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: ${primaryColor}; padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                Registrierungserinnerung
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hallo ${customerName},
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                wir erinnern dich daran, dass deine Registrierung bei ${tenantName} noch ausstehend ist. Um dein Konto zu aktivieren und auf deine Buchungen zuzugreifen, klicke bitte auf den folgenden Button:
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${onboardingLink}" 
                       style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: bold;">
                      Jetzt registrieren
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                Oder kopiere diesen Link in deinen Browser:<br>
                <a href="${onboardingLink}" style="color: ${primaryColor}; word-break: break-all;">${onboardingLink}</a>
              </p>

              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                ⏰ <strong>Dieser Link ist 14 Tage gültig.</strong>
              </p>

              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                Falls du Probleme hast oder Fragen zur Registrierung hast, kontaktiere bitte den Support von ${tenantName}.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                ${tenantName}
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Diese E-Mail wurde automatisch generiert. Bitte nicht antworten.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `

        await sendEmail({
          to: email,
          subject: `Registrierungserinnerung von ${tenantName}`,
          html: emailHtml
        })

        logger.debug('✅ Email sent successfully')
        emailSent = true
        channels.push('Email')
      } catch (emailError: any) {
        console.error('⚠️ Email sending failed:', emailError)
        logger.debug('⚠️ Email error:', emailError.message)
      }
    } else {
      logger.debug('⏭️ Skipping email (no email address provided)')
    }

    // ============================================
    // Step 5b: Send reminder SMS (if phone is available)
    // ============================================
    if (phone) {
      try {
        logger.debug('📱 Would send SMS to:', phone)
        // SMS wird vom Frontend versendet, nicht hier
        // Das ermöglicht mehr Flexibilität bei der SMS-Verwaltung
        smsSent = true
        channels.push('SMS')
      } catch (smsError: any) {
        console.error('⚠️ SMS preparation failed:', smsError)
        logger.debug('⚠️ SMS error:', smsError.message)
      }
    }

    // ============================================
    // Check if at least one channel was used
    // ============================================
    if (!emailSent && !smsSent) {
      throw createError({
        statusCode: 400,
        message: 'No valid contact method to send reminder'
      })
    }

    logger.debug('✅ Onboarding reminder sent via:', channels.join(' + '))

    return {
      success: true,
      message: `Onboarding reminder sent via ${channels.join(' + ')}`,
      token: newToken,
      expiresAt: expiresAt.toISOString(),
      channels: channels,
      emailSent,
      smsSent
    }
  } catch (error: any) {
    console.error('❌ Error sending onboarding reminder:', error)
    console.error('❌ Error message:', error.message)
    console.error('❌ Error stack:', error.stack)
    console.error('❌ Full error object:', JSON.stringify(error, null, 2))
    
    logger.debug('❌ Error in onboarding reminder API:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    })
    
    throw createError({
      statusCode: error.statusCode || 500,
      message: `Failed to send onboarding reminder: ${error.message}`
    })
  }
})

