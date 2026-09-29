import { createError, getRequestIP } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { claimWebsiteProspect, type ClaimDb } from '~/server/utils/website-prospect-claim'
import { getClientIP } from '~/server/utils/ip-utils'

const attempts = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60 * 60 * 1000
const MAX_ATTEMPTS = 5

function claimAttemptAllowed(ip: string, now = Date.now()): boolean {
  const current = attempts.get(ip)
  if (!current || current.resetAt <= now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (current.count >= MAX_ATTEMPTS) return false
  current.count += 1
  return true
}

export default defineEventHandler(async (event) => {
  const ip = getClientIP(event) || getRequestIP(event, { xForwardedFor: false }) || 'unknown'
  if (!claimAttemptAllowed(ip)) {
    throw createError({ statusCode: 429, statusMessage: 'Zu viele Anfragen. Bitte warten.', message: 'Zu viele Anfragen. Bitte warten.' })
  }

  const body = await readBody(event).catch(() => ({} as Record<string, unknown>))
  const record = body && typeof body === 'object' ? body as Record<string, unknown> : {}
  return claimWebsiteProspect(getSupabaseAdmin() as unknown as ClaimDb, {
    token: String(record.token || ''),
    email: String(record.email || ''),
    password: String(record.password || ''),
    passwordConfirm: String(record.password_confirm || ''),
  })
})
