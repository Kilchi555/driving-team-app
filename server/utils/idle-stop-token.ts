import { createHmac, timingSafeEqual } from 'crypto'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function getSecret(): string {
  return process.env.NUXT_REGISTRATION_TOKEN_SECRET
    || process.env.CRON_SECRET
    || 'insecure-dev-secret-change-in-production'
}

function signUserId(userId: string): string {
  return createHmac('sha256', getSecret())
    .update(`idle-stop:${userId}`)
    .digest('base64url')
    .slice(0, 22)
}

export function createIdleStopToken(userId: string): string {
  return `${userId}.${signUserId(userId)}`
}

export function verifyIdleStopToken(token: string | null | undefined): string | null {
  if (!token || typeof token !== 'string') return null
  const dot = token.indexOf('.')
  if (dot < 1) return null
  const userId = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  if (!UUID_RE.test(userId) || !sig) return null

  const expected = signUserId(userId)
  const sigBuf = Buffer.from(sig)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length) return null
  if (!timingSafeEqual(sigBuf, expBuf)) return null
  return userId
}

export function buildIdleStopUrl(userId: string): string {
  return `https://app.simy.ch/pause?t=${encodeURIComponent(createIdleStopToken(userId))}`
}
