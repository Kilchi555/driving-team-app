import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { sendTenantSMS } from '~/server/utils/sms'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getClientIP } from '~/server/utils/ip-utils'
import { logger } from '~/utils/logger'
import { v4 as uuidv4 } from 'uuid'
import { getTenantTerminology } from '~/server/utils/tenant-terminology'

export default defineEventHandler(async (event) => {
  const ipAddress = getClientIP(event)

  try {
    const body = await readBody(event)
    const { phone, tenantId } = body

    if (!phone || !tenantId) {
      throw createError({ statusCode: 400, statusMessage: 'phone und tenantId erforderlich' })
    }

    // Rate limit: max 3 SMS per phone per hour (keyed by phone+tenantId)
    const canProceed = await checkRateLimit(
      `${phone}_${tenantId}`,
      'resend_onboarding_self',
      3,
      60 * 60 * 1000 // 1 hour window
    )
    if (!canProceed) {
      throw createError({ statusCode: 429, statusMessage: 'Zu viele Anfragen. Bitte warten Sie eine Stunde.' })
    }

    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return { ok: true } // Silently skip in local dev
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Find the pending user by phone in this tenant
    const { data: student, error: studentError } = await supabase
      .from('users')
      .select('id, email, phone, first_name, onboarding_token, onboarding_token_expires, tenant_id, auth_user_id')
      .eq('phone', phone.trim())
      .eq('tenant_id', tenantId)
      .eq('role', 'client')
      .single()

    if (studentError || !student) {
      // Don't reveal if phone exists — return success either way (security)
      logger.debug('resend-onboarding-by-phone: phone not found or error, returning success silently')
      return { ok: true }
    }

    // Only resend if account is still pending
    if (student.auth_user_id) {
      // Already active — suggest login instead (but keep message generic for security)
      return { ok: true, alreadyActive: true }
    }

    if (!student.onboarding_token) {
      let bn = 'Unternehmen'
      try {
        bn = (await getTenantTerminology(supabase, tenantId)).businessNoun || bn
      } catch { /* keep default */ }
      throw createError({ statusCode: 400, statusMessage: `Kein Onboarding-Token vorhanden. Bitte kontaktieren Sie ${bn}.` })
    }

    // Renew token if expired
    let token = student.onboarding_token
    const expires = student.onboarding_token_expires ? new Date(student.onboarding_token_expires) : null
    if (!expires || expires < new Date()) {
      token = uuidv4()
      const newExpires = new Date()
      newExpires.setDate(newExpires.getDate() + 30)
      await supabase
        .from('users')
        .update({ onboarding_token: token, onboarding_token_expires: newExpires.toISOString() })
        .eq('id', student.id)
    }

    // Get tenant info for SMS
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, slug, twilio_from_sender')
      .eq('id', tenantId)
      .single()

    const terms = await getTenantTerminology(supabase, tenantId)
    const tenantName = tenant?.name || terms.businessNoun || 'Ihr Unternehmen'
    const senderName = tenant?.twilio_from_sender || tenantName
    const baseUrl = process.env.NUXT_PUBLIC_APP_URL || 'https://app.simy.ch'
    const onboardingUrl = `${baseUrl}/onboarding/${token}`

    // Login link lives in the welcome email after registration — keep SMS short
    const smsMessage = `Hallo ${student.first_name}, bitte Registrierung abschliessen (30 Tage): ${onboardingUrl}`

    const smsResult = await sendTenantSMS({
      tenantId,
      to: student.phone,
      message: smsMessage,
      purpose: 'student_onboarding',
      senderName,
    })

    if (!smsResult.success) {
      logger.error('resend-onboarding-by-phone: SMS failed')
      throw createError({ statusCode: 500, statusMessage: `SMS konnte nicht gesendet werden. Bitte kontaktieren Sie ${tenantName}.` })
    }

    logger.debug('✅ Onboarding SMS resent to:', student.phone)
    return { ok: true }

  } catch (err: any) {
    logger.error('resend-onboarding-by-phone error:', err)
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, statusMessage: 'Fehler beim Senden der SMS' })
  }
})
