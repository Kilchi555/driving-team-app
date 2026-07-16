/**
 * POST /api/integrations/vercel-log-drain
 *
 * Receiving endpoint for a Vercel Log Drain (Project Settings -> Log Drains ->
 * Custom Endpoint, format "JSON"). Vercel pushes every runtime log line here;
 * we only keep the error/warning ones (and any 4xx/5xx response) in
 * `vercel_log_events`, so the daily `review-vercel-logs` cron can summarize
 * the last 24h for the super-admin.
 *
 * Setup (Vercel dashboard, not doable via code):
 *   1. Project Settings -> Log Drains -> Add -> Custom Endpoint
 *   2. URL: https://app.simy.ch/api/integrations/vercel-log-drain
 *   3. Format: JSON · Sources: at least "lambda" and "edge"
 *   4. Copy the generated "Drain signature secret" into the
 *      VERCEL_LOG_DRAIN_SECRET env var (Vercel project settings).
 *
 * Security: Vercel signs every request with HMAC-SHA1 of the raw body,
 * sent in the `x-vercel-signature` header. We verify it before persisting
 * anything (see https://vercel.com/docs/drains/security).
 */
import { defineEventHandler, readRawBody, getHeader, createError } from 'h3'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

interface VercelLogLine {
  id: string
  deploymentId?: string
  projectId?: string
  source?: string
  host?: string
  timestamp: number
  level?: string
  message?: string
  statusCode?: number
  path?: string
  requestId?: string
  executionRegion?: string
  environment?: string
  proxy?: {
    method?: string
    path?: string
    statusCode?: number
    clientIp?: string
  }
  [key: string]: unknown
}

function verifySignature(rawBody: string, signature: string | undefined, secret: string): boolean {
  if (!signature) return false
  const expected = createHmac('sha1', secret).update(rawBody, 'utf-8').digest('hex')
  const expectedBuf = Buffer.from(expected, 'utf-8')
  const signatureBuf = Buffer.from(signature, 'utf-8')
  if (expectedBuf.length !== signatureBuf.length) return false
  return timingSafeEqual(expectedBuf, signatureBuf)
}

function parseLogLines(rawBody: string): VercelLogLine[] {
  const trimmed = rawBody.trim()
  if (!trimmed) return []

  // Vercel sends either a JSON array, or NDJSON (one JSON object per line).
  try {
    const parsed = JSON.parse(trimmed)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return trimmed
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        try {
          return JSON.parse(line) as VercelLogLine
        } catch {
          return null
        }
      })
      .filter((l): l is VercelLogLine => l !== null)
  }
}

/** Only worth storing: explicit warnings/errors, or any non-2xx/3xx HTTP response. */
function isNoteworthy(line: VercelLogLine): boolean {
  const level = (line.level || '').toLowerCase()
  if (level === 'error' || level === 'warning' || level === 'warn') return true
  const statusCode = line.statusCode ?? line.proxy?.statusCode
  return typeof statusCode === 'number' && statusCode >= 400
}

export default defineEventHandler(async (event) => {
  const secret = process.env.VERCEL_LOG_DRAIN_SECRET
  if (!secret) {
    logger.error('VercelLogDrain', 'VERCEL_LOG_DRAIN_SECRET not configured — rejecting drain request')
    throw createError({ statusCode: 500, statusMessage: 'Log drain not configured' })
  }

  const rawBody = (await readRawBody(event, 'utf-8')) || ''
  const signature = getHeader(event, 'x-vercel-signature')

  if (!verifySignature(rawBody, signature, secret)) {
    logger.warn('VercelLogDrain', 'Rejected log drain request with invalid signature')
    throw createError({ statusCode: 403, statusMessage: 'Invalid signature' })
  }

  const lines = parseLogLines(rawBody).filter(isNoteworthy)
  if (lines.length === 0) {
    return { success: true, stored: 0 }
  }

  const rows = lines.map(line => {
    const level = (line.level || '').toLowerCase()
    const statusCode = line.statusCode ?? line.proxy?.statusCode ?? null
    return {
      vercel_log_id: line.id,
      deployment_id: line.deploymentId ?? null,
      project_id: line.projectId ?? null,
      source: line.source ?? null,
      level: level === 'warn' ? 'warning' : (level || (statusCode && statusCode >= 500 ? 'error' : 'warning')),
      message: line.message ?? null,
      status_code: statusCode,
      path: line.path ?? line.proxy?.path ?? null,
      method: line.proxy?.method ?? null,
      environment: line.environment ?? null,
      request_id: line.requestId ?? null,
      region: line.executionRegion ?? null,
      client_ip: line.proxy?.clientIp ?? null,
      occurred_at: new Date(line.timestamp).toISOString(),
      raw: line,
    }
  })

  const supabase = getSupabaseAdmin()
  // Upsert on vercel_log_id: Vercel retries delivery on non-200 responses, so
  // duplicate deliveries must not create duplicate rows.
  const { error } = await supabase
    .from('vercel_log_events')
    .upsert(rows, { onConflict: 'vercel_log_id', ignoreDuplicates: true })

  if (error) {
    logger.error('VercelLogDrain', 'Failed to store log events:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to store log events' })
  }

  return { success: true, stored: rows.length }
})
