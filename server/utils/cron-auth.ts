import { createError, getHeader, type H3Event } from 'h3'
import { timingSafeEqual } from 'node:crypto'

function secretsEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

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
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const provided = authHeader.slice('Bearer '.length)
  if (!secretsEqual(provided, cronSecret)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
}
