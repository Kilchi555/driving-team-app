import { createError, getHeader, type H3Event } from 'h3'

/**
 * Fail-closed cron authentication.
 * Vercel Cron sends Authorization: Bearer $CRON_SECRET when CRON_SECRET is set.
 * x-vercel-cron is not treated as proof of identity.
 */
export function assertCronRequest(event: H3Event) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const authHeader = getHeader(event, 'authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
}
