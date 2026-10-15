// POST /api/tenants/verify-registration-email
// Consumes a single-use email verification token and returns a registration_token
// for create-admin. Never logs the raw token.
import { defineEventHandler, createError, readBody } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getClientIP } from '~/server/utils/ip-utils'
import { logAudit } from '~/server/utils/audit'
import { consumeRegistrationEmailToken } from '~/server/utils/registration-email-verification'
import { isRegistrationTokenSecretConfigured } from '~/server/utils/registration-token'

export default defineEventHandler(async (event) => {
  const ipAddress = getClientIP(event)

  const rateLimit = await checkRateLimit(
    ipAddress,
    'verify_registration_email',
    20,
    3600 * 1000
  )
  if (!rateLimit.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Zu viele Anfragen. Bitte warten.',
    })
  }

  if (!isRegistrationTokenSecretConfigured()) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Registrierung vorübergehend nicht verfügbar. Bitte später erneut versuchen.',
    })
  }

  const body = await readBody(event)
  const token = typeof body?.token === 'string' ? body.token.trim() : ''

  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'Token fehlt' })
  }

  const supabase = getSupabaseAdmin()
  const result = await consumeRegistrationEmailToken(supabase, token)

  if (!result.ok) {
    await logAudit({
      action: 'tenant_registration_email_verify',
      resource_type: 'tenant',
      ip_address: ipAddress,
      status: 'failed',
      error_message: result.reason,
      details: { failure_class: result.reason },
    }).catch(() => {})

    const messages: Record<string, string> = {
      invalid: 'Ungültiger Bestätigungslink.',
      expired: 'Der Bestätigungslink ist abgelaufen. Bitte neuen Link anfordern.',
      used: 'Dieser Bestätigungslink wurde bereits verwendet.',
      email_mismatch: 'E-Mail stimmt nicht mehr mit der Registrierung überein.',
      tenant_missing: 'Registrierung nicht gefunden.',
      already_verified: 'E-Mail bereits bestätigt.',
    }
    throw createError({
      statusCode: 400,
      statusMessage: messages[result.reason] || 'Bestätigung fehlgeschlagen.',
    })
  }

  await logAudit({
    action: 'tenant_registration_email_verify',
    tenant_id: result.tenantId,
    resource_type: 'tenant',
    resource_id: result.tenantId,
    ip_address: ipAddress,
    status: 'success',
    details: {
      slug: result.slug,
      email_masked: `${result.email.slice(0, 2)}***@${result.email.split('@')[1] || ''}`,
    },
  }).catch(() => {})

  return {
    success: true,
    registration_token: result.registrationToken,
    tenant: {
      id: result.tenantId,
      slug: result.slug,
      name: result.name,
      contact_email: result.email,
    },
  }
})
