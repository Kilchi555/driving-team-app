/**
 * POST /api/auth/passkey/backup-codes/verify
 *
 * Lockout recovery path: user provides email + one unused backup code.
 * On success, the code is consumed and a Supabase session is issued.
 *
 * This is intentionally rate-limited via `webauthn_audit_log` (one fail = log;
 * a separate cron/middleware can lock the account on too many fails).
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { scryptSync, timingSafeEqual } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { setAuthCookies } from '~/server/utils/cookies'
import { logPasskeyEvent, getRequestContext } from '~/server/utils/passkey'

function verifyCode(code: string, storedHash: string): boolean {
  // Format: scrypt$<cost>$<salt-base64>$<hash-base64>
  const parts = storedHash.split('$')
  if (parts.length !== 4 || parts[0] !== 'scrypt') return false
  const cost = Number(parts[1])
  if (!Number.isInteger(cost) || cost < 1024) return false

  try {
    const salt = Buffer.from(parts[2], 'base64')
    const expected = Buffer.from(parts[3], 'base64')
    const actual = scryptSync(code, salt, expected.length, { N: cost })
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

export default defineEventHandler(async (event) => {
  const ctx = getRequestContext(event)
  const body = await readBody(event)
  const email: string | undefined = body?.email?.toString().trim().toLowerCase()
  const code: string | undefined = body?.code?.toString().trim().toUpperCase()

  if (!email || !code) {
    throw createError({ statusCode: 400, statusMessage: 'email and code are required' })
  }

  const supabase = getSupabaseAdmin()

  const { data: userRow } = await supabase
    .from('users')
    .select('id, email, role, auth_user_id, is_active')
    .eq('email', email)
    .eq('is_active', true)
    .maybeSingle()

  // To prevent account-existence leak, do constant-time work even if user not found
  if (!userRow?.auth_user_id) {
    await logPasskeyEvent({
      userId: null,
      eventType: 'login_fail',
      success: false,
      errorCode: 'backup_code_user_not_found',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent
    })
    // Generic error so attacker can't probe emails
    throw createError({ statusCode: 401, statusMessage: 'Invalid email or backup code' })
  }

  // Load all unused codes for this user; iterate to find a match
  const { data: codes } = await supabase
    .from('passkey_backup_codes')
    .select('id, code_hash')
    .eq('user_id', userRow.id)
    .is('used_at', null)

  const match = (codes || []).find((row) => verifyCode(code, row.code_hash))

  if (!match) {
    await logPasskeyEvent({
      userId: userRow.id,
      eventType: 'login_fail',
      success: false,
      errorCode: 'backup_code_invalid',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent
    })
    throw createError({ statusCode: 401, statusMessage: 'Invalid email or backup code' })
  }

  // Atomically mark this code consumed
  const { data: consumed } = await supabase
    .from('passkey_backup_codes')
    .update({
      used_at: new Date().toISOString(),
      used_ip: ctx.ipAddress,
      used_user_agent: ctx.userAgent
    })
    .eq('id', match.id)
    .is('used_at', null)
    .select('id')
    .maybeSingle()

  if (!consumed) {
    // Race condition: another request consumed it first
    throw createError({ statusCode: 401, statusMessage: 'Backup code already used' })
  }

  // Issue Supabase session — same machinery as passkey login
  const supabaseUrl = process.env.SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: userRow.email
  })
  if (linkErr || !linkData?.properties?.hashed_token) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to mint session' })
  }
  const publicClient = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  const { data: sessionData, error: sessionErr } = await publicClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink'
  })
  if (sessionErr || !sessionData?.session) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to verify session' })
  }

  setAuthCookies(event, sessionData.session.access_token, sessionData.session.refresh_token)

  await logPasskeyEvent({
    userId: userRow.id,
    eventType: 'backup_code_used',
    success: true,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent
  })

  // Count remaining codes so the UI can warn if running low
  const { count: remaining } = await supabase
    .from('passkey_backup_codes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userRow.id)
    .is('used_at', null)

  return {
    success: true,
    user: {
      id: userRow.id,
      email: userRow.email,
      role: userRow.role
    },
    remainingCodes: remaining ?? 0
  }
})
