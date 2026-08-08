// ============================================
// API: Send Onboarding Email
// ============================================
// Sendet eine Onboarding-E-Mail mit Link zur Registrierung

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail } from '~/server/utils/email'
import { logger } from '~/utils/logger'
import { getTenantTerminology } from '~/server/utils/tenant-terminology'
import { buildOnboardingEmailHtml } from '~/server/utils/onboarding-email'
import { requireStaffOrInternal } from '~/server/utils/require-staff-or-internal'

export default defineEventHandler(async (event) => {
  try {
    const auth = await requireStaffOrInternal(event)

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

    logger.debug('✅ All required fields present')
    logger.debug('🔗 Onboarding link:', onboardingLink)

    const supabase = getSupabaseAdmin()

    logger.debug('🏢 Loading tenant information for:', tenantId)
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name, slug, primary_color, business_type, logo_wide_url, logo_url, logo_square_url')
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

    const terms = await getTenantTerminology(supabase, tenantId)
    const tenantName = tenant.name || `Ihre ${terms.businessNoun}`
    const primaryColor = tenant.primary_color || '#2563eb'
    const logoUrl = tenant.logo_wide_url || tenant.logo_url || tenant.logo_square_url || null
    const customerFirstName = (firstName || '').trim() || terms.client
    const loginLink = tenant.slug
      ? `https://app.simy.ch/${tenant.slug}`
      : 'https://app.simy.ch/login'

    const emailHtml = buildOnboardingEmailHtml({
      variant: 'welcome',
      tenantName,
      primaryColor,
      logoUrl,
      customerFirstName,
      onboardingLink,
      loginLink,
      businessNoun: terms.businessNoun,
    })

    logger.debug('📧 Attempting to send email via Resend...')
    await sendEmail({
      to: email,
      subject: `Willkommen bei ${tenantName} — Registrierung abschliessen`,
      html: emailHtml,
      senderName: tenantName
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
