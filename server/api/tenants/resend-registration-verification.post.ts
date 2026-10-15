// POST /api/tenants/resend-registration-verification
// Re-issues a verification email for a pending tenant. Requires tenant_id + contact email match.
import { defineEventHandler, createError, readBody } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getClientIP } from '~/server/utils/ip-utils'
import { logAudit } from '~/server/utils/audit'
import {
  issueRegistrationEmailToken,
  normalizeRegistrationEmail,
  REGISTRATION_STATUS_PENDING,
  sendRegistrationVerificationEmail,
} from '~/server/utils/registration-email-verification'

export default defineEventHandler(async (event) => {
  const ipAddress = getClientIP(event)
  const rateLimit = await checkRateLimit(
    ipAddress,
    'resend_registration_verification',
    5,
    3600 * 1000
  )
  if (!rateLimit.allowed) {
    throw createError({ statusCode: 429, statusMessage: 'Zu viele Anfragen. Bitte warten.' })
  }

  const body = await readBody(event)
  const tenantId = typeof body?.tenant_id === 'string' ? body.tenant_id.trim() : ''
  const email = normalizeRegistrationEmail(typeof body?.email === 'string' ? body.email : '')

  // Uniform responses avoid tenant/email enumeration
  const genericOk = { success: true, message: 'Falls die Registrierung offen ist, wurde eine E-Mail gesendet.' }

  if (!tenantId || !/^[0-9a-f-]{36}$/i.test(tenantId) || !email) {
    return genericOk
  }

  const supabase = getSupabaseAdmin()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, contact_email, registration_status, email_verified_at, is_active')
    .eq('id', tenantId)
    .maybeSingle()

  if (
    !tenant ||
    normalizeRegistrationEmail(tenant.contact_email || '') !== email ||
    tenant.email_verified_at ||
    tenant.registration_status !== REGISTRATION_STATUS_PENDING
  ) {
    await logAudit({
      action: 'tenant_registration_email_resend',
      resource_type: 'tenant',
      ip_address: ipAddress,
      status: 'failed',
      details: { failure_class: 'not_applicable_or_mismatch' },
    }).catch(() => {})
    return genericOk
  }

  try {
    const { rawToken } = await issueRegistrationEmailToken({
      supabase,
      tenantId: tenant.id,
      email,
      ipAddress,
    })
    await sendRegistrationVerificationEmail({
      to: email,
      tenantName: tenant.name,
      rawToken,
    })
    await logAudit({
      action: 'tenant_registration_email_resend',
      tenant_id: tenant.id,
      resource_type: 'tenant',
      resource_id: tenant.id,
      ip_address: ipAddress,
      status: 'success',
      details: {},
    }).catch(() => {})
  } catch (err: any) {
    console.error('❌ Resend verification email failed:', err?.message || err)
    await logAudit({
      action: 'tenant_registration_email_resend',
      tenant_id: tenant.id,
      resource_type: 'tenant',
      ip_address: ipAddress,
      status: 'failed',
      error_message: 'send_failed',
      details: { failure_class: 'send_failed' },
    }).catch(() => {})
  }

  return genericOk
})
