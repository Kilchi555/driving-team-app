/**
 * POST /api/auth/passkey/login/options
 *
 * Generates a WebAuthn authentication challenge.
 *
 * Two modes:
 *   - "discoverable" (no email in body): the browser shows all matching passkeys
 *     across the whole RP. Best UX, requires WebAuthn-Level-2 conditional UI.
 *   - "targeted" (email provided): looks up the user's credentials and limits
 *     allowCredentials to those, so the right passkey is suggested first.
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  getPasskeyConfig,
  storeChallenge,
  logPasskeyEvent,
  getRequestContext
} from '~/server/utils/passkey'

export default defineEventHandler(async (event) => {
  const ctx = getRequestContext(event)
  const body = await readBody(event).catch(() => ({}))
  const email: string | undefined = body?.email?.toString().trim().toLowerCase()

  const { rpID } = getPasskeyConfig()
  const supabase = getSupabaseAdmin()

  let userId: string | null = null
  let allowCredentials: Array<{ id: string; transports?: any[] }> = []

  if (email) {
    // Targeted login — look up user and his credentials
    const { data: userRow } = await supabase
      .from('users')
      .select('id, role, is_active')
      .eq('email', email)
      .eq('is_active', true)
      .maybeSingle()

    if (userRow?.id) {
      userId = userRow.id

      const { data: creds } = await supabase
        .from('webauthn_credentials')
        .select('credential_id, transports')
        .eq('user_id', userRow.id)
        .eq('is_active', true)

      allowCredentials = (creds || []).map((c) => ({
        id: c.credential_id,
        transports: (c.transports || []) as any[]
      }))
    }
    // Note: we do NOT reveal whether the email exists. Even if not, we generate
    // a valid challenge so timing/response-shape doesn't leak account info.
  }

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'required', // biometric/PIN mandatory
    allowCredentials: allowCredentials.length ? allowCredentials : undefined
  })

  const challengeId = await storeChallenge({
    userId,
    challenge: options.challenge,
    challengeType: 'authentication',
    ip: ctx.ipAddress,
    userAgent: ctx.userAgent
  })

  await logPasskeyEvent({
    userId,
    eventType: 'login_start',
    success: true,
    details: { mode: email ? 'targeted' : 'discoverable' },
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent
  })

  return {
    challengeId,
    options
  }
})
