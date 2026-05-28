/**
 * POST /api/auth/passkey/register/verify
 *
 * Verifies the attestation response from the browser, extracts the public key,
 * and stores the new credential. The challenge is consumed atomically.
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import type { RegistrationResponseJSON } from '@simplewebauthn/server'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  getPasskeyConfig,
  isPasskeyEnabledForRole,
  consumeChallenge,
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
  if (!dbUserId) {
    throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
  }
  if (!isPasskeyEnabledForRole(role)) {
    throw createError({ statusCode: 403, statusMessage: 'Passkey not enabled for your role' })
  }

  const body = await readBody(event)
  const challengeId: string | undefined = body?.challengeId
  const response: RegistrationResponseJSON | undefined = body?.response
  const deviceName: string | undefined = body?.deviceName

  if (!challengeId || !response) {
    throw createError({ statusCode: 400, statusMessage: 'challengeId and response are required' })
  }

  // Atomically consume the challenge (single-use, TTL-checked)
  const consumed = await consumeChallenge(challengeId, 'registration')
  if (!consumed) {
    await logPasskeyEvent({
      userId: dbUserId,
      eventType: 'register_fail',
      success: false,
      errorCode: 'challenge_invalid_or_expired',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent
    })
    throw createError({ statusCode: 400, statusMessage: 'Challenge invalid or expired' })
  }

  // The user_id stored with the challenge must match the authenticated user
  if (consumed.userId !== dbUserId) {
    await logPasskeyEvent({
      userId: dbUserId,
      eventType: 'register_fail',
      success: false,
      errorCode: 'challenge_user_mismatch',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent
    })
    throw createError({ statusCode: 400, statusMessage: 'Challenge does not belong to this user' })
  }

  const { rpID, expectedOrigins } = getPasskeyConfig()

  let verification
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: consumed.challenge,
      expectedOrigin: expectedOrigins,
      expectedRPID: rpID,
      requireUserVerification: true
    })
  } catch (err: any) {
    await logPasskeyEvent({
      userId: dbUserId,
      eventType: 'register_fail',
      success: false,
      errorCode: 'verification_threw',
      errorMessage: err?.message,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent
    })
    throw createError({ statusCode: 400, statusMessage: `Registration verification failed: ${err?.message}` })
  }

  if (!verification.verified || !verification.registrationInfo) {
    await logPasskeyEvent({
      userId: dbUserId,
      eventType: 'register_fail',
      success: false,
      errorCode: 'not_verified',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent
    })
    throw createError({ statusCode: 400, statusMessage: 'Registration not verified' })
  }

  const info = verification.registrationInfo
  const credential = info.credential

  // Store the credential — public_key as binary BYTEA
  const supabase = getSupabaseAdmin()
  const { error: insertError } = await supabase.from('webauthn_credentials').insert({
    user_id: dbUserId,
    credential_id: credential.id,
    public_key: Buffer.from(credential.publicKey),
    counter: credential.counter,
    aaguid: info.aaguid || null,
    transports: credential.transports || [],
    device_type: info.credentialDeviceType, // 'singleDevice' | 'multiDevice'
    backup_eligible: info.credentialBackedUp ? true : !!(info as any).credentialBackupEligible,
    backup_state: info.credentialBackedUp,
    device_name: deviceName?.slice(0, 120) || 'Unbenanntes Gerät',
    is_active: true
  })

  if (insertError) {
    await logPasskeyEvent({
      userId: dbUserId,
      credentialId: credential.id,
      eventType: 'register_fail',
      success: false,
      errorCode: 'db_insert_failed',
      errorMessage: insertError.message,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent
    })
    throw createError({ statusCode: 500, statusMessage: 'Failed to store credential' })
  }

  await logPasskeyEvent({
    userId: dbUserId,
    credentialId: credential.id,
    eventType: 'register_success',
    success: true,
    details: {
      aaguid: info.aaguid,
      device_type: info.credentialDeviceType,
      backed_up: info.credentialBackedUp
    },
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent
  })

  return {
    success: true,
    credentialId: credential.id,
    deviceType: info.credentialDeviceType,
    backedUp: info.credentialBackedUp
  }
})
