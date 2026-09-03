// api/auth/manage.post.ts
// F-02: Permanently retired. This route previously exposed unauthenticated
// service-role auth operations (signin-password, signup, set-session, …)
// that bypassed hardened login controls.
//
// Legitimate replacements:
//   Login:           POST /api/auth/login
//   Customer signup: POST /api/auth/register | /api/auth/register-client
//   Staff signup:    POST /api/staff/register (invitation-gated)
//   Password reset:  POST /api/auth/password-reset-request + /api/auth/reset-password
//   Session/password updates after invite/recovery: client Supabase Auth (user JWT)

import { defineEventHandler, createError, readBody } from 'h3'
import { logger } from '~/utils/logger'

/** Operations that previously existed on this endpoint — all blocked. */
export const RETIRED_AUTH_MANAGE_ACTIONS = [
  'signin-password',
  'signup',
  'reset-password-email',
  'get-session',
  'set-session',
  'update-user',
] as const

export default defineEventHandler(async (event) => {
  let action = 'unknown'
  try {
    const body = await readBody<{ action?: string; operation?: string }>(event)
    action = String(body?.action || body?.operation || 'unknown')
  } catch {
    // Ignore body parse failures — still reject
  }

  logger.warn('[F-02] Blocked retired /api/auth/manage call', { action })

  throw createError({
    statusCode: 410,
    statusMessage:
      'This authentication endpoint has been permanently removed. Use /api/auth/login for sign-in.',
    data: {
      code: 'AUTH_MANAGE_RETIRED',
      action,
      retired: [...RETIRED_AUTH_MANAGE_ACTIONS],
    },
  })
})
