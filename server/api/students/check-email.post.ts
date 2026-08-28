// server/api/students/check-email.post.ts
// Real-time email availability for onboarding / register / guest booking

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getClientIP } from '~/server/utils/ip-utils'
import { validateEmail } from '~/server/utils/validators'
import {
  evaluateClientEmailClaim,
  PUBLIC_EMAIL_TAKEN_MESSAGE,
  publicEmailCheckAvailable,
  resolvePendingUserIdFromOnboardingToken,
} from '~/server/utils/auth-email-claim'

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
    const { email, tenantId, token, purpose } = body || {}

    if (!email || !tenantId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Email and tenantId are required'
      })
    }

    if (!validateEmail(email).valid) {
      return {
        available: false,
        message: 'Ungültige E-Mail-Adresse',
      }
    }

    const supabase = getSupabaseAdmin()
    const trustedUserId = await resolvePendingUserIdFromOnboardingToken(supabase, token)
    const claim = await evaluateClientEmailClaim({
      supabase,
      email,
      tenantId,
      excludeUserId: trustedUserId,
    })

    const forBooking = purpose === 'booking'
    const available = trustedUserId && !forBooking
      ? claim.availableForAccount
      : publicEmailCheckAvailable(claim, forBooking ? 'booking' : 'account')

    return {
      available,
      ...(trustedUserId ? { code: claim.code } : {}),
      message: available
        ? '✓ E-Mail verfügbar'
        : (trustedUserId ? claim.message : PUBLIC_EMAIL_TAKEN_MESSAGE),
    }
  } catch (error: any) {
    logger.error('❌ Error in check-email API:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Email check failed'
    })
  }
})
