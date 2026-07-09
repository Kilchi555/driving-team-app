// server/api/students/request-onboarding-link.post.ts
// Allow users to request a new onboarding link via SMS or email

import { v4 as uuidv4 } from 'uuid'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { sendSMS } from '~/server/utils/sms'
import { sendEmail } from '~/server/utils/email'
import { checkRateLimit } from '~/server/utils/rate-limiter'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { email, method = 'sms' } = body

    if (!email) {
      throw createError({
        statusCode: 400,
        statusMessage: 'E-Mail-Adresse erforderlich'
      })
    }

    // Rate limit: max 5 requests per email per hour
    const rateLimitKey = `request_onboarding_${email.toLowerCase()}`
    const rateLimitResult = await checkRateLimit(rateLimitKey, 5, 3600)

    if (!rateLimitResult.allowed) {
      logger.warn('⚠️ Request onboarding link: Rate limit exceeded', { email })
      throw createError({
        statusCode: 429,
        statusMessage: `Zu viele Anfragen. Bitte versuche es in ${rateLimitResult.retryAfter} Sekunden erneut.`
      })
    }

    const supabase = getSupabaseAdmin()

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, first_name, phone, tenant_id, onboarding_status')
      .eq('email', email.toLowerCase().trim())
      .eq('onboarding_status', 'pending')
      .single()

    if (userError || !user) {
      logger.warn('⚠️ Request onboarding link: User not found or not in pending status', { email })
      // Don't reveal if user exists for security
      return {
        success: true,
        message: 'Falls der Account existiert, wird ein neuer Link versendet.'
      }
    }

    // Get tenant info
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name, slug, booking_policy')
      .eq('id', user.tenant_id)
      .single()

    if (tenantError || !tenant) {
      logger.error('❌ Tenant not found:', user.tenant_id)
      throw createError({ statusCode: 500, statusMessage: 'Fahrschule nicht gefunden' })
    }

    // Generate new onboarding token
    const newToken = uuidv4()
    const tokenExpiry = new Date()
    tokenExpiry.setDate(tokenExpiry.getDate() + 30)

    // Update user with new token
    const { error: updateError } = await supabase
      .from('users')
      .update({
        onboarding_token: newToken,
        onboarding_token_expires: tokenExpiry.toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      logger.error('❌ Failed to update onboarding token:', updateError)
      throw createError({ statusCode: 500, statusMessage: 'Fehler beim Generieren des Links' })
    }

    const onboardingLink = `https://app.simy.ch/onboarding/${newToken}`
    const tenantName = tenant.name || 'Deine Fahrschule'
    const policy = (tenant.booking_policy as any) || {}
    const smsEnabled = policy.onboarding_sms_enabled !== false
    const emailEnabled = policy.onboarding_email_enabled === true

    // Send via SMS if enabled and phone available
    if ((method === 'sms' || !emailEnabled) && user.phone && smsEnabled) {
      const loginLink = `https://app.simy.ch/${tenant.slug}`
      const message = `Hallo ${user.first_name}!\n\nHier ist dein neuer Onboarding-Link:\n${onboardingLink}\n\nAnmeldung: ${loginLink}\n\n(Link 30 Tage gültig)\n${tenantName}`

      await sendSMS({
        to: user.phone,
        message,
        senderName: tenantName
      })

      logger.debug('✅ Onboarding link sent via SMS:', user.id)
      return {
        success: true,
        message: 'Der Link wurde per SMS versendet.'
      }
    }

    // Send via email if enabled or as fallback
    if ((method === 'email' || !smsEnabled) && emailEnabled) {
      const primaryColor = (tenant as any).primary_color || '#2563eb'
      const displayTenantName = tenant.name || 'Deine Fahrschule'

      const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
        <tr><td style="background-color:${primaryColor};padding:40px 30px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:bold;">Konto-Aktivierungslink</h1>
        </td></tr>
        <tr><td style="padding:40px 30px;">
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">Hallo ${user.first_name},</p>
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">
            hier ist dein neuer Link zur Konto-Aktivierung bei <strong>${displayTenantName}</strong>:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0;">
            <tr><td align="center">
              <a href="${onboardingLink}" style="display:inline-block;background-color:${primaryColor};color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:8px;font-size:16px;font-weight:bold;">
                Konto aktivieren
              </a>
            </td></tr>
          </table>
          <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:20px 0 0 0;">
            Oder kopiere diesen Link:<br>
            <a href="${onboardingLink}" style="color:${primaryColor};word-break:break-all;">${onboardingLink}</a>
          </p>
          <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:20px 0 0 0;">⏰ Dieser Link ist 30 Tage gültig.</p>
        </td></tr>
        <tr><td style="background-color:#f9fafb;padding:30px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#6b7280;font-size:14px;margin:0 0 10px 0;">${displayTenantName}</p>
          <p style="color:#9ca3af;font-size:12px;margin:0;">Diese E-Mail wurde automatisch generiert. Bitte nicht antworten.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

      await sendEmail({
        to: email,
        subject: `Dein Konto-Aktivierungslink bei ${displayTenantName}`,
        html: emailHtml,
        senderName: displayTenantName
      })

      logger.debug('✅ Onboarding link sent via email:', user.id)
      return {
        success: true,
        message: 'Der Link wurde per E-Mail versendet.'
      }
    }

    // Fallback: no method available
    logger.warn('⚠️ Request onboarding link: No valid method available', { userId: user.id })
    return {
      success: false,
      message: 'Fahrschule hat keine Kontaktmethode aktiviert. Bitte kontaktiere die Fahrschule direkt.'
    }

  } catch (error: any) {
    logger.error('❌ Request onboarding link error:', error)
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, statusMessage: 'Fehler beim Verarbeiten der Anfrage' })
  }
})
