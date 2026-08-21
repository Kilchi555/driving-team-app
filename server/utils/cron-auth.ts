import { createError, getHeader, type H3Event } from 'h3'

/** Vercel Cron is GET and sends x-vercel-cron: 1 plus Bearer CRON_SECRET when that env is set. */
export function assertCronRequest(event: H3Event) {
  const isVercelCron = getHeader(event, 'x-vercel-cron') === '1'
  const cronSecret = process.env.CRON_SECRET
  const authHeader = getHeader(event, 'authorization')
  const isValidSecret = !!(cronSecret?.trim() && authHeader === `Bearer ${cronSecret}`)
  if (!isVercelCron && !isValidSecret) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
}
