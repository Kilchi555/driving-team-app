/**
 * POST /api/auth/passkey/register/options
 *
 * Generates a WebAuthn registration challenge for the currently logged-in user.
 * The user must already be authenticated (cookie/Bearer) — passkey registration
 * is always done from within an authenticated session.
 *
 * Feature-flag gated: only roles in PASSKEY_ENABLED_ROLES may register.
 */

import { defineEventHandler, createError } from 'h3'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  getPasskeyConfig,
  isPasskeyEnabledForRole,
  storeChallenge,
  logPasskeyEvent,
  getRequestContext
} from '~/server/utils/passkey'

export default defineEventHandler(async (event) => {
  const ctx = getRequestContext(event)

  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const dbUserId: string | undefined = authUser.db_user_id || authUser.profile?.id
  const role: string | undefined = authUser.role || authUser.profile?.role
  const email: string = authUser.email || authUser.profile?.email || ''
  const firstName: string = authUser.profile?.first_name || ''
  const lastName: string = authUser.profile?.last_name || ''

  if (!dbUserId) {
    throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
  }

  if (!isPasskeyEnabledForRole(role)) {
    await logPasskeyEvent({
      userId: dbUserId,
      eventType: 'register_fail',
      success: false,
      errorCode: 'feature_disabled_for_role',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent
    })
    throw createError({
      statusCode: 403,
      statusMessage: 'Passkey registration is not enabled for your role yet.'
    })
  }

  const supabase = getSupabaseAdmin()

  // Load existing credentials so the authenticator excludes them (no double-register)
  const { data: existing } = await supabase
    .from('webauthn_credentials')
    .select('credential_id, transports')
    .eq('user_id', dbUserId)
    .eq('is_active', true)

  const excludeCredentials = (existing || []).map((cred) => ({
    id: cred.credential_id,
    transports: (cred.transports || []) as any[]
  }))

  // Hard cap: prevent unbounded passkey accumulation per user
  const MAX_PASSKEYS = 20
  if (excludeCredentials.length >= MAX_PASSKEYS) {
    await logPasskeyEvent({
      userId: dbUserId,
      eventType: 'register_fail',
      success: false,
      errorCode: 'max_passkeys_reached',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent
    })
    throw createError({
      statusCode: 422,
      statusMessage: `Maximum of ${MAX_PASSKEYS} passkeys per account reached. Remove unused devices first.`
    })
  }

  const { rpID, rpName } = getPasskeyConfig()

  // userID must be a Uint8Array (SimpleWebAuthn v13 requirement).
  // We use the database UUID encoded as bytes so it's stable across logins.
  const userIDBytes = new TextEncoder().encode(dbUserId)

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: userIDBytes,
    userName: email,
    userDisplayName: `${firstName} ${lastName}`.trim() || email,
    attestationType: 'none', // 'none' for consumer apps; flip to 'direct' if you want enterprise attestation
    excludeCredentials,
    authenticatorSelection: {
      residentKey: 'preferred',     // Discoverable credentials → 1-tap login
      userVerification: 'required', // ALWAYS require biometric/PIN
      authenticatorAttachment: 'platform' // Prefer Face ID / Touch ID over hardware keys
    },
    supportedAlgorithmIDs: [-7, -257] // ES256, RS256
  })

  // Persist the challenge server-side; client passes the ID back on /verify
  const challengeId = await storeChallenge({
    userId: dbUserId,
    challenge: options.challenge,
    challengeType: 'registration',
    ip: ctx.ipAddress,
    userAgent: ctx.userAgent
  })

  await logPasskeyEvent({
    userId: dbUserId,
    eventType: 'register_start',
    success: true,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent
  })

  return {
    challengeId,
    options
  }
})
