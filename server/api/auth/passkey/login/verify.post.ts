/**
 * POST /api/auth/passkey/login/verify
 *
 * Verifies the assertion from the browser, increments the signature counter,
 * and issues a Supabase session for the user. The client receives the same
 * HTTP-only cookies as a normal password login.
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import type { AuthenticationResponseJSON } from '@simplewebauthn/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { setAuthCookies } from '~/server/utils/cookies'
import {
  getPasskeyConfig,
  consumeChallenge,
  logPasskeyEvent,
  getRequestContext
} from '~/server/utils/passkey'

export default defineEventHandler(async (event) => {
  const ctx = getRequestContext(event)
  const body = await readBody(event)
  const challengeId: string | undefined = body?.challengeId
  const response: AuthenticationResponseJSON | undefined = body?.response

  if (!challengeId || !response?.id) {
    throw createError({ statusCode: 400, statusMessage: 'challengeId and response are required' })
  }

  const supabase = getSupabaseAdmin()

  // 1. Consume challenge atomically
  const consumed = await consumeChallenge(challengeId, 'authentication')
  if (!consumed) {
    await logPasskeyEvent({
      userId: null,
      eventType: 'login_fail',
      success: false,
      errorCode: 'challenge_invalid_or_expired',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent
    })
    throw createError({ statusCode: 400, statusMessage: 'Challenge invalid or expired' })
  }

  // 2. Look up the credential by its base64url ID
  const { data: credRow, error: credErr } = await supabase
    .from('webauthn_credentials')
    .select('id, user_id, public_key, counter, transports, is_active')
    .eq('credential_id', response.id)
    .eq('is_active', true)
    .maybeSingle()

  if (credErr || !credRow) {
    await logPasskeyEvent({
      userId: null,
      credentialId: response.id,
      eventType: 'login_fail',
      success: false,
      errorCode: 'credential_not_found',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent
    })
    throw createError({ statusCode: 401, statusMessage: 'Unknown credential' })
  }

  // 3. Look up the user record
  const { data: userRow, error: userErr } = await supabase
    .from('users')
    .select('id, email, role, auth_user_id, is_active')
    .eq('id', credRow.user_id)
    .single()

  if (userErr || !userRow || !userRow.is_active || !userRow.auth_user_id) {
    await logPasskeyEvent({
      userId: credRow.user_id,
      credentialId: response.id,
      eventType: 'login_fail',
      success: false,
      errorCode: 'user_not_found_or_inactive',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent
    })
    throw createError({ statusCode: 401, statusMessage: 'User not found or inactive' })
  }

  // 4. Cryptographic verification
  const { rpID, expectedOrigins } = getPasskeyConfig()

  let verification
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: consumed.challenge,
      expectedOrigin: expectedOrigins,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: response.id,
        publicKey: new Uint8Array(credRow.public_key as any),
        counter: Number(credRow.counter),
        transports: (credRow.transports || []) as any[]
      }
    })
  } catch (err: any) {
    await logPasskeyEvent({
      userId: userRow.id,
      credentialId: response.id,
      eventType: 'login_fail',
      success: false,
      errorCode: 'verification_threw',
      errorMessage: err?.message,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent
    })
    throw createError({ statusCode: 401, statusMessage: `Verification failed: ${err?.message}` })
  }

  if (!verification.verified || !verification.authenticationInfo) {
    await logPasskeyEvent({
      userId: userRow.id,
      credentialId: response.id,
      eventType: 'login_fail',
      success: false,
      errorCode: 'not_verified',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent
    })
    throw createError({ statusCode: 401, statusMessage: 'Authentication not verified' })
  }

  const newCounter = verification.authenticationInfo.newCounter
  const oldCounter = Number(credRow.counter)

  // 5. Counter regression = cloned credential. Reject and lock.
  if (newCounter !== 0 && newCounter <= oldCounter) {
    // Mark credential as inactive — somebody may be using a clone
    await supabase
      .from('webauthn_credentials')
      .update({ is_active: false })
      .eq('id', credRow.id)

    await logPasskeyEvent({
      userId: userRow.id,
      credentialId: response.id,
      eventType: 'login_fail',
      success: false,
      errorCode: 'counter_regression_credential_locked',
      details: { old_counter: oldCounter, new_counter: newCounter },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent
    })
    throw createError({
      statusCode: 401,
      statusMessage: 'Authenticator counter regression detected. Credential locked for security.'
    })
  }

  // 6. Update counter + last_used_at
  await supabase
    .from('webauthn_credentials')
    .update({ counter: newCounter, last_used_at: new Date().toISOString() })
    .eq('id', credRow.id)

  // 7. Issue Supabase session via admin generateLink (magiclink) → get tokens
  const supabaseUrl = process.env.SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // We use the admin API to mint a session for the verified auth user.
  // generateLink with type 'magiclink' returns the access/refresh tokens we need.
  const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: userRow.email
  })

  if (linkErr || !linkData?.properties?.hashed_token) {
    await logPasskeyEvent({
      userId: userRow.id,
      credentialId: response.id,
      eventType: 'login_fail',
      success: false,
      errorCode: 'session_mint_failed',
      errorMessage: linkErr?.message,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent
    })
    throw createError({ statusCode: 500, statusMessage: 'Failed to mint session' })
  }

  // Exchange the OTP token for a real session
  const publicClient = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  const { data: sessionData, error: sessionErr } = await publicClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink'
  })

  if (sessionErr || !sessionData?.session) {
    await logPasskeyEvent({
      userId: userRow.id,
      credentialId: response.id,
      eventType: 'login_fail',
      success: false,
      errorCode: 'session_verify_failed',
      errorMessage: sessionErr?.message,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent
    })
    throw createError({ statusCode: 500, statusMessage: 'Failed to verify session' })
  }

  // 8. Set HTTP-only cookies — same as password login
  setAuthCookies(event, sessionData.session.access_token, sessionData.session.refresh_token)

  await logPasskeyEvent({
    userId: userRow.id,
    credentialId: response.id,
    eventType: 'login_success',
    success: true,
    details: { counter_before: oldCounter, counter_after: newCounter },
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent
  })

  return {
    success: true,
    user: {
      id: userRow.id,
      email: userRow.email,
      role: userRow.role
    }
  }
})
