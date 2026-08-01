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
import { getTenantTerminology } from '~/server/utils/tenant-terminology'
import { buildOnboardingEmailHtml } from '~/server/utils/onboarding-email'

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
    const onboardingLink = `https://app.simy.ch/onboarding/${newToken}`
    logger.debug('🔗 Generated onboarding link:', onboardingLink)

    // ============================================
    // Step 4: Get tenant information
    // ============================================
    logger.debug('🏢 Loading tenant information for:', tenantId)
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name, slug, primary_color, twilio_from_sender, business_type, logo_wide_url, logo_url, logo_square_url')
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
    
    let emailSent = false
    let smsSent = false
    const channels: string[] = []

    // ============================================
    // Step 5a: Send reminder EMAIL (if email is available)
    // ============================================
    if (email) {
      try {
        logger.debug('📧 Sending reminder email to:', email)
        
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

