import { defineEventHandler, readBody, createError } from 'h3'
import { validateEmail } from '~/server/utils/validators'
import { logger } from '~/utils/logger'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getClientIP } from '~/server/utils/ip-utils'
import { AuthEmailClaimCode, evaluateClientEmailClaim } from '~/server/utils/auth-email-claim'

export default defineEventHandler(async (event) => {
  try {
    const ip = getClientIP(event) || 'unknown'
    const rate = await checkRateLimit(ip, 'email_check', 20, 60 * 1000)
    if (!rate.allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Zu viele Prüfungen. Bitte kurz warten.',
      })
    }

    const body = await readBody(event)
    const { email, tenantId } = body

    if (!email || !validateEmail(email).valid) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Ungültige E-Mail-Adresse'
      })
    }

    if (!tenantId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Mandanten-ID erforderlich'
      })
    }

    const serviceSupabase = getSupabaseAdmin()
    const emailNorm = email.toLowerCase().trim()

    const { data: existingUser, error } = await serviceSupabase
      .from('users')
      .select('id, auth_user_id')
      .eq('email', emailNorm)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      logger.error('❌ Database error:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Fehler beim Prüfen der E-Mail'
      })
    }

    const isPending = !!(existingUser && !existingUser.auth_user_id)
    if (existingUser) {
      return {
        exists: true,
        isPending,
        message: isPending
          ? 'E-Mail existiert, Account noch nicht aktiviert'
          : 'E-Mail existiert bereits'
      }
    }

    const claim = await evaluateClientEmailClaim({
      supabase: serviceSupabase,
      email: emailNorm,
      tenantId,
    })

    // Do not reveal global Auth occupancy on this public form.
    const exists = claim.code === AuthEmailClaimCode.TENANT_CLIENT_EXISTS
    return {
      exists,
      isPending: false,
      message: exists ? 'E-Mail existiert bereits' : 'E-Mail ist verfügbar'
    }
  } catch (error: any) {
    logger.error('❌ Check email error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Fehler beim Prüfen der E-Mail'
    })
  }
})
