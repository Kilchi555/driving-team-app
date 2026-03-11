/**
 * Public API: Check if a password has been pwned (HaveIBeenPwned)
 * Uses k-Anonymity – the full password never leaves the client in plain text,
 * and only the first 5 chars of the SHA1 hash are sent to HIBP.
 *
 * POST /api/auth/check-password-pwned
 * Body: { password: string }
 * Returns: { isPwned: boolean, count: number }
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { checkPasswordPwned } from '~/server/utils/hibp-checker'

export default defineEventHandler(async (event) => {
  const { password } = await readBody(event)

  if (!password || typeof password !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Missing password' })
  }

  // Only check passwords that already pass basic length requirement
  // to avoid hammering HIBP with garbage inputs
  if (password.length < 8) {
    return { isPwned: false, count: 0 }
  }

  const result = await checkPasswordPwned(password)
  return {
    isPwned: result.isPwned,
    count: result.count
  }
})
