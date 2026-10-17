/**
 * Super-admin only force-reset.
 * Invalidates the current password hash, revokes every current session,
 * and emails one recovery link. Does not apply any account set by itself.
 *
 * Access JWTs stay valid until expiry.
 */

import { createError, defineEventHandler, readBody } from 'h3'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import { getClientIP } from '~/server/utils/ip-utils'
import { actorDbUserId, isUuid } from '~/server/utils/session-control'
import {
  ACCESS_JWT_SEMANTICS,
  forceInvalidatePassword,
} from '~/server/utils/force-password-reset'

const RATE_MAX = 3
const RATE_WINDOW_MS = 15 * 60 * 1000

function publicResult(result: Awaited<ReturnType<typeof forceInvalidatePassword>>) {
  return {
    complete: result.complete,
    password_changed: result.password_changed,
    sessions_revoked: result.sessions_revoked,
    sessions_revoked_count: result.sessions_revoked_count,
    recovery_required: result.recovery_required,
    recovery_dispatched: result.recovery_dispatched,
    auth_user_id: result.auth_user_id,
    public_user_id: result.public_user_id,
    access_jwt: ACCESS_JWT_SEMANTICS,
    error: result.error || null,
  }
}

export default defineEventHandler(async (event) => {
  const authUser = await requireSuperAdmin(event)
  const actorAuthId = String((authUser as any).id || '')
  const ipAddress = getClientIP(event)

  const rate = await checkRateLimit(
    `${ipAddress}:${actorAuthId || 'unknown'}`,
    'force_password_reset',
    RATE_MAX,
    RATE_WINDOW_MS,
  )
  if (!rate.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Zu viele Force-Reset-Versuche. Bitte später erneut versuchen.',
      data: { retryAfter: rate.retryAfter },
    })
  }

  const body = await readBody(event).catch(() => ({} as Record<string, unknown>))
  if (body?.confirm !== true) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bestätigung erforderlich',
      data: { code: 'CONFIRM_REQUIRED' },
    })
  }

  const authUserId = typeof body?.auth_user_id === 'string' ? body.auth_user_id : undefined
  const publicUserId = typeof body?.user_id === 'string' ? body.user_id : undefined
  if (!!authUserId === !!publicUserId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Genau eine Ziel-ID (auth_user_id oder user_id) ist erforderlich',
      data: { code: 'TARGET_REQUIRED' },
    })
  }
  if ((authUserId && !isUuid(authUserId)) || (publicUserId && !isUuid(publicUserId))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Ungültige Ziel-ID',
      data: { code: 'INVALID_ID' },
    })
  }

  const result = await forceInvalidatePassword(
    { authUserId, publicUserId },
    {
      authUserId: actorAuthId || null,
      publicUserId: actorDbUserId(authUser as any),
      role: (authUser as any).role || 'super_admin',
      ipAddress,
    },
  )

  const payload = publicResult(result)
  if (!result.complete) {
    const statusCode = result.error?.code === 'IN_PROGRESS'
      ? 409
      : result.error?.code === 'USER_NOT_FOUND' || result.error?.code === 'AUTH_ONLY_NO_PUBLIC_ROW'
        ? 404
        : result.error?.code === 'SELF_RESET_FORBIDDEN'
          ? 400
          : result.password_changed ? 207 : 400
    throw createError({
      statusCode,
      statusMessage: result.error?.message || 'Force-Reset unvollständig',
      data: payload,
    })
  }

  return payload
})
