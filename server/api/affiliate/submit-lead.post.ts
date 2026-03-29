/**
 * POST /api/affiliate/submit-lead
 *
 * Unauthenticated endpoint: captures a lightweight affiliate lead
 * (name + phone) and immediately triggers an onboarding SMS.
 *
 * SECURITY:
 * ✅ Rate-limited — max 3 per IP per hour
 * ✅ No auth required — public endpoint
 * ✅ Tenant + affiliate code validated before any insert
 * ✅ Phone normalised to +41 before uniqueness check
 * ✅ Generic responses — does not confirm whether phone already exists
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { sendSMS } from '~/server/utils/sms'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getClientIP } from '~/server/utils/ip-utils'
import { logger } from '~/utils/logger'
import { v4 as uuidv4 } from 'uuid'

export default defineEventHandler(async (event) => {
  const ipAddress = getClientIP(event)

  // Rate limit: max 3 leads per IP per hour
  const canProceed = await checkRateLimit(
    `affiliate_lead_${ipAddress}`,
    'affiliate_lead_submit',
    3,
    60 * 60 * 1000
  )
  if (!canProceed) {
    throw createError({ statusCode: 429, message: 'Zu viele Anfragen. Bitte versuche es später erneut.' })
  }

  const body = await readBody(event)
  const { tenantSlug, refCode, firstName, lastName, phone, email } = body

  if (!tenantSlug || !refCode || !firstName || !lastName || !phone) {
    throw createError({ statusCode: 400, message: 'Fehlende Pflichtfelder.' })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw createError({ statusCode: 500, message: 'Server-Konfigurationsfehler.' })
  }

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // 1. Resolve tenant by slug
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, name, slug, twilio_from_sender')
    .eq('slug', tenantSlug)
    .single()

  if (tenantError || !tenant) {
    throw createError({ statusCode: 404, message: 'Fahrschule nicht gefunden.' })
  }

  // 2. Resolve affiliate code
  const { data: affiliateCode } = await supabase
    .from('affiliate_codes')
    .select('id, user_id, is_active')
    .eq('tenant_id', tenant.id)
    .eq('code', refCode.trim().toUpperCase())
    .eq('is_active', true)
    .maybeSingle()

  if (!affiliateCode) {
    // Invalid / inactive code — still create the lead but without attribution
    logger.warn(`[submit-lead] Unknown ref code: ${refCode} for tenant ${tenantSlug}`)
  }

  // 3. Normalise phone to +41 format
  const normalisePhone = (raw: string): string => {
    let p = raw.replace(/\s+/g, '').replace(/-/g, '')
    if (p.startsWith('00')) p = '+' + p.slice(2)
    if (p.startsWith('0') && !p.startsWith('00')) p = '+41' + p.slice(1)
    if (!p.startsWith('+')) p = '+41' + p
    return p
  }
  const normalisedPhone = normalisePhone(phone.trim())

  // 4. Check if phone already exists in users (silently reuse pending user)
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, auth_user_id, onboarding_status, onboarding_token, onboarding_token_expires, first_name')
    .eq('phone', normalisedPhone)
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  // 5. Check for existing affiliate_lead (idempotency — resend SMS if still pending)
  const { data: existingLead } = await supabase
    .from('affiliate_leads')
    .select('id, status, pending_user_id')
    .eq('tenant_id', tenant.id)
    .eq('phone', normalisedPhone)
    .maybeSingle()

  if (existingLead && existingLead.status === 'converted') {
    // Already converted — return success without leaking info
    return { ok: true }
  }

  if (existingUser?.auth_user_id) {
    // Phone belongs to an active account — return special flag for UX
    return { ok: true, alreadyActive: true }
  }

  const tenantName = tenant.twilio_from_sender || tenant.name || 'Fahrschule'
  const tenantSlugResolved = tenant.slug
  const baseUrl = process.env.NUXT_PUBLIC_APP_URL || 'https://simy.ch'

  // 6. Reuse or create pending user
  let pendingUserId: string
  let onboardingToken: string

  if (existingUser && !existingUser.auth_user_id) {
    // Reuse existing pending user — renew token if expired
    pendingUserId = existingUser.id
    const expires = existingUser.onboarding_token_expires
      ? new Date(existingUser.onboarding_token_expires)
      : null
    if (!expires || expires < new Date() || !existingUser.onboarding_token) {
      onboardingToken = uuidv4()
      const newExpires = new Date()
      newExpires.setDate(newExpires.getDate() + 30)
      await supabase
        .from('users')
        .update({ onboarding_token: onboardingToken, onboarding_token_expires: newExpires.toISOString() })
        .eq('id', pendingUserId)
    } else {
      onboardingToken = existingUser.onboarding_token
    }
  } else {
    // Create a new pending user
    pendingUserId = uuidv4()
    onboardingToken = uuidv4()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const { error: insertError } = await supabase.from('users').insert({
      id: pendingUserId,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: normalisedPhone,
      email: email?.trim() || null,
      role: 'client',
      tenant_id: tenant.id,
      is_active: true,
      onboarding_status: 'pending',
      onboarding_token: onboardingToken,
      onboarding_token_expires: expiresAt.toISOString(),
      referred_by_code: affiliateCode?.id ? refCode.trim().toUpperCase() : null,
    })

    if (insertError) {
      // Duplicate email or phone → existing active account
      if (insertError.code === '23505') {
        return { ok: true, alreadyActive: true }
      }
      logger.error('[submit-lead] Error creating pending user:', insertError)
      throw createError({ statusCode: 500, message: 'Registrierung fehlgeschlagen.' })
    }
  }

  // 7. Upsert affiliate_lead record
  const leadPayload: Record<string, any> = {
    tenant_id: tenant.id,
    affiliate_code_id: affiliateCode?.id ?? null,
    affiliate_user_id: affiliateCode?.user_id ?? null,
    first_name: firstName.trim(),
    last_name: lastName.trim(),
    phone: normalisedPhone,
    email: email?.trim() || null,
    status: 'sms_sent',
    pending_user_id: pendingUserId,
    ip_address: ipAddress,
  }

  if (existingLead) {
    await supabase
      .from('affiliate_leads')
      .update({ ...leadPayload, status: 'sms_sent' })
      .eq('id', existingLead.id)
  } else {
    await supabase.from('affiliate_leads').insert(leadPayload)
  }

  // 8. Send onboarding SMS
  const onboardingUrl = `${baseUrl}/onboarding/${onboardingToken}`
  const loginLink = `${baseUrl}/${tenantSlugResolved}`
  const smsMessage = `Hallo ${firstName.trim()}!

Deine Anmeldung bei ${tenantName} wurde gestartet. Vervollständige deine Registrierung unter:

${onboardingUrl}

Nach der Registrierung kannst du dich hier anmelden:
${loginLink}

(Link 30 Tage gültig)

Freundliche Grüsse
${tenantName}`

  try {
    await sendSMS({ to: normalisedPhone, message: smsMessage, senderName: tenantName })
    logger.debug(`[submit-lead] Onboarding SMS sent to ${normalisedPhone} for tenant ${tenantSlugResolved}`)
  } catch (smsErr: any) {
    logger.error('[submit-lead] SMS send failed:', smsErr.message)
    // Don't fail the request — lead is saved, staff can resend manually
  }

  return { ok: true }
})
