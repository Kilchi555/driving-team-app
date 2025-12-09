// ============================================
// API: Send Onboarding Email
// ============================================
// Sendet eine Onboarding-E-Mail mit Link zur Registrierung

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail } from '~/server/utils/email'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { email, firstName, lastName, onboardingLink, tenantId } = body

    logger.debug('📧 Onboarding email request received:', { email, firstName, lastName, tenantId })

    if (!email || !onboardingLink || !tenantId) {
      console.error('❌ Missing required fields:', { email: !!email, onboardingLink: !!onboardingLink, tenantId: !!tenantId })
      throw createError({
        statusCode: 400,
        message: 'Missing required fields: email, onboardingLink, tenantId'
      })
    }

    logger.debug('✅ All required fields present')
    logger.debug('🔗 Onboarding link:', onboardingLink)

    const supabase = getSupabaseAdmin()

    // Get tenant information
    logger.debug('🏢 Loading tenant information for:', tenantId)
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name, primary_color')
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

    // Generate email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Willkommen bei ${tenantName}</title>
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
                Willkommen bei ${tenantName}!
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
                Schön, dass du dich für uns entschieden hast! Um deine Registrierung abzuschließen, klicke bitte auf den folgenden Button:
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${onboardingLink}" 
                       style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: bold;">
                      Registrierung abschließen
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                Oder kopiere diesen Link in deinen Browser:<br>
                <a href="${onboardingLink}" style="color: ${primaryColor}; word-break: break-all;">${onboardingLink}</a>
              </p>

              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                ⏰ Dieser Link ist 7 Tage gültig.
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

    // Send email
    logger.debug('📧 Attempting to send email via Resend...')
    logger.debug('📧 Email config:', {
      to: email,
      subject: `Willkommen bei ${tenantName} - Registrierung abschließen`,
      from: process.env.RESEND_FROM_EMAIL || 'noreply@drivingteam.ch'
    })
    
    await sendEmail({
      to: email,
      subject: `Willkommen bei ${tenantName} - Registrierung abschließen`,
      html: emailHtml
    })

    logger.debug('✅ Onboarding email sent successfully to:', email)

    return {
      success: true,
      message: 'Onboarding email sent successfully'
    }
  } catch (error: any) {
    console.error('❌ Error sending onboarding email:', error)
    console.error('❌ Error stack:', error.stack)
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode
    })
    throw createError({
      statusCode: error.statusCode || 500,
      message: `Failed to send onboarding email: ${error.message}`
    })
  }
})

