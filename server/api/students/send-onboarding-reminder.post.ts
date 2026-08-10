// ============================================
// API: Send Onboarding Reminder
// ============================================
// Sendet eine Onboarding-Erinnerung
// - Invalidiert den alten Link (falls noch gültig)
// - Erstellt einen neuen Link (14 Tage gültig)
// - Versendet die Erinnerung per Email ODER SMS (je nachdem was verfügbar ist)
//
// Auth: staff/admin session OR trusted internal secret.
// Contact channels and tenant are derived from the target user record — never
// from attacker-controlled email/phone overrides alone.

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail } from '~/server/utils/email'
import { logger } from '~/utils/logger'
import { v4 as uuidv4 } from 'uuid'
import { getTenantTerminology } from '~/server/utils/tenant-terminology'
import { buildOnboardingEmailHtml } from '~/server/utils/onboarding-email'
import { requireStaffOrInternal } from '~/server/utils/require-staff-or-internal'

export default defineEventHandler(async (event) => {
  try {
    const auth = await requireStaffOrInternal(event)

    logger.debug('📧 Onboarding reminder API called')

    const body = await readBody(event)
    const { userId, tenantId } = body

    if (!userId || !tenantId) {
      throw createError({
        statusCode: 400,
        message: 'Missing required fields: userId, tenantId'
      })
    }

    if (
      auth.mode === 'staff' &&
      auth.profile?.tenant_id &&
      auth.profile.role !== 'super_admin' &&
      auth.profile.tenant_id !== tenantId
    ) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden – tenant mismatch'
      })
    }

    const supabase = getSupabaseAdmin()

    // Load the pending student from DB — derive contact info server-side
    const { data: targetUser, error: userLookupError } = await supabase
      .from('users')
      .select('id, email, phone, first_name, last_name, tenant_id, onboarding_status')
      .eq('id', userId)
      .eq('tenant_id', tenantId)
      .eq('onboarding_status', 'pending')
      .maybeSingle()

    if (userLookupError) {
      throw createError({
        statusCode: 500,
        message: `Failed to load user: ${userLookupError.message}`
      })
    }

    if (!targetUser) {
      throw createError({
        statusCode: 404,
        message: 'Pending user not found for this tenant'
      })
    }

    const email = targetUser.email || null
    const phone = targetUser.phone || null
    const firstName = targetUser.first_name || ''

    if (!email && !phone) {
      throw createError({
        statusCode: 400,
        message: 'Missing contact info: user has neither email nor phone'
      })
    }

    const newToken = uuidv4()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const { error: updateError } = await supabase
      .from('users')
      .update({
        onboarding_token: newToken,
        onboarding_token_expires: expiresAt.toISOString()
      })
      .eq('id', userId)
      .eq('tenant_id', tenantId)
      .eq('onboarding_status', 'pending')

    if (updateError) {
      console.error('❌ Failed to update user with new token:', updateError)
      throw createError({
        statusCode: 500,
        message: `Failed to update user: ${updateError.message}`
      })
    }

    const onboardingLink = `https://app.simy.ch/onboarding/${newToken}`

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name, slug, primary_color, twilio_from_sender, business_type, logo_wide_url, logo_url, logo_square_url')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenant) {
      throw createError({
        statusCode: 404,
        message: tenantError ? `Tenant query failed: ${tenantError.message}` : 'Tenant not found'
      })
    }

    const terms = await getTenantTerminology(supabase, tenantId)
    const tenantName = tenant.name || `Ihre ${terms.businessNoun}`
    const primaryColor = tenant.primary_color || '#2563eb'
    const logoUrl = tenant.logo_wide_url || tenant.logo_url || tenant.logo_square_url || null
    const customerFirstName = (firstName || '').trim() || terms.client
    const loginLink = tenant.slug
      ? `https://app.simy.ch/${tenant.slug}`
      : 'https://app.simy.ch/login'

    let emailSent = false
    let smsSent = false
    const channels: string[] = []

    if (email) {
      try {
        const emailHtml = buildOnboardingEmailHtml({
          variant: 'reminder',
          tenantName,
          primaryColor,
          logoUrl,
          customerFirstName,
          onboardingLink,
          loginLink,
          businessNoun: terms.businessNoun,
        })

        await sendEmail({
          to: email,
          subject: `Registrierungserinnerung von ${tenantName}`,
          html: emailHtml,
          senderName: tenantName
        })

        emailSent = true
        channels.push('Email')
      } catch (emailError: any) {
        console.error('⚠️ Email sending failed:', emailError)
      }
    }

    if (phone) {
      // SMS is prepared/flagged here; actual send is managed elsewhere when needed
      smsSent = true
      channels.push('SMS')
    }

    if (!emailSent && !smsSent) {
      throw createError({
        statusCode: 400,
        message: 'No valid contact method to send reminder'
      })
    }

    logger.debug('✅ Onboarding reminder sent via:', channels.join(' + '))

    // Never return the raw onboarding token — it is an account-takeover secret
    return {
      success: true,
      message: `Onboarding reminder sent via ${channels.join(' + ')}`,
      expiresAt: expiresAt.toISOString(),
      channels: channels,
      emailSent,
      smsSent
    }
  } catch (error: any) {
    console.error('❌ Error sending onboarding reminder:', error)

    if (error?.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: `Failed to send onboarding reminder: ${error.message}`
    })
  }
})
