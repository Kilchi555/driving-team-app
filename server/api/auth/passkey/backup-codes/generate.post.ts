/**
 * POST /api/auth/passkey/backup-codes/generate
 *
 * Generates 10 fresh single-use backup codes for the authenticated user.
 * Returns the plaintext codes ONCE — they are never retrievable again.
 * Any previously generated codes are invalidated.
 */

import { defineEventHandler, createError } from 'h3'
import { randomBytes, scryptSync } from 'crypto'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logPasskeyEvent, getRequestContext, isPasskeyEnabledForRole } from '~/server/utils/passkey'

const SCRYPT_KEYLEN = 64
const SCRYPT_COST = 16384 // 2^14 — same default as Node's recommended

function generateCode(): string {
  // 8 chars from a friendly alphabet (no 0/O/1/I confusion). Ergonomic to type.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(8)
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += alphabet[bytes[i] % alphabet.length]
  }
  // Format as XXXX-XXXX for readability
  return `${code.slice(0, 4)}-${code.slice(4)}`
}

function hashCode(code: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(code, salt, SCRYPT_KEYLEN, { N: SCRYPT_COST })
  return `scrypt$${SCRYPT_COST}$${salt.toString('base64')}$${hash.toString('base64')}`
}

export default defineEventHandler(async (event) => {
  const ctx = getRequestContext(event)

  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const dbUserId: string | undefined = authUser.db_user_id || authUser.profile?.id
  const role: string | undefined = authUser.role || authUser.profile?.role
  if (!dbUserId) {
    throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
  }
  if (!isPasskeyEnabledForRole(role)) {
    throw createError({ statusCode: 403, statusMessage: 'Backup codes are only available for accounts with passkey access.' })
  }

  const supabase = getSupabaseAdmin()

  // Invalidate previous unused codes — only the freshest set is ever valid
  await supabase
    .from('passkey_backup_codes')
    .delete()
    .eq('user_id', dbUserId)
    .is('used_at', null)

  // Generate 10 new codes
  const plainCodes: string[] = []
  const rows = []
  for (let i = 0; i < 10; i++) {
    const code = generateCode()
    plainCodes.push(code)
    rows.push({
      user_id: dbUserId,
      code_hash: hashCode(code)
    })
  }

  const { error } = await supabase.from('passkey_backup_codes').insert(rows)
  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to store backup codes' })
  }

  await logPasskeyEvent({
    userId: dbUserId,
    eventType: 'backup_code_generated',
    success: true,
    details: { count: plainCodes.length },
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent
  })

  return {
    success: true,
    codes: plainCodes,
    notice:
      'Diese Codes werden nur einmal angezeigt. Drucke sie aus oder speichere sie offline. Jeder Code kann nur einmal verwendet werden.'
  }
})
