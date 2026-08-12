/**
 * Lightweight FCM HTTP v1 push sender.
 * Requires env vars:
 *   FIREBASE_PROJECT_ID       — e.g. "my-app-12345"
 *   FIREBASE_SERVICE_ACCOUNT  — full service-account JSON as a string
 *
 * If either var is missing, every send call is a silent no-op so the app
 * keeps working before Firebase is configured.
 */

import { createSign } from 'node:crypto'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export interface PushPayload {
  title: string
  body: string
  data?: Record<string, string>
}

// ── Module-level token cache (resets on server restart) ───────────────────────
let _cachedToken: string | null = null
let _tokenExpiry = 0

function getServiceAccount(): { client_email: string; private_key: string } | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim()
  if (!raw) return null
  try {
    // Some hosts (and dotenv) expand `\n` inside the JSON into real newlines,
    // which breaks JSON.parse. Normalize private_key newlines first.
    const normalized = raw.includes('-----BEGIN PRIVATE KEY-----') && !raw.includes('\\n')
      ? raw.replace(/\r?\n/g, '\\n')
      : raw
    const parsed = JSON.parse(normalized)
    if (!parsed?.client_email || !parsed?.private_key) {
      console.warn('[Push] FIREBASE_SERVICE_ACCOUNT missing client_email/private_key')
      return null
    }
    // Node crypto expects real newlines in PEM
    if (typeof parsed.private_key === 'string' && parsed.private_key.includes('\\n')) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n')
    }
    return parsed
  } catch {
    console.warn('[Push] FIREBASE_SERVICE_ACCOUNT is not valid JSON')
    return null
  }
}

function buildJWT(sa: { client_email: string; private_key: string }): string {
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  ).toString('base64url')
  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${payload}`)
  const sig = signer.sign(sa.private_key, 'base64url')
  return `${header}.${payload}.${sig}`
}

async function getAccessToken(): Promise<string | null> {
  if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken
  const sa = getServiceAccount()
  if (!sa) return null
  try {
    const res = await $fetch<{ access_token: string; expires_in: number }>(
      'https://oauth2.googleapis.com/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: buildJWT(sa),
        }).toString(),
      },
    )
    _cachedToken = res.access_token
    _tokenExpiry = Date.now() + (res.expires_in - 60) * 1000
    return _cachedToken
  } catch (e: any) {
    console.warn('[Push] Could not obtain FCM access token:', e?.message)
    return null
  }
}

async function sendToToken(
  projectId: string,
  accessToken: string,
  fcmToken: string,
  payload: PushPayload,
): Promise<'ok' | 'invalid_token'> {
  try {
    await $fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: {
        message: {
          token: fcmToken,
          notification: { title: payload.title, body: payload.body },
          ...(payload.data ? { data: payload.data } : {}),
          apns: { payload: { aps: { sound: 'default', badge: 1 } } },
          android: { notification: { sound: 'default', channelId: 'default' } },
        },
      },
    })
    return 'ok'
  } catch (e: any) {
    const code: number | undefined = e?.data?.error?.code ?? e?.statusCode
    if (code === 404 || e?.data?.error?.status === 'NOT_FOUND') return 'invalid_token'
    console.warn('[Push] FCM send error:', e?.data?.error?.message ?? e?.message)
    return 'ok'
  }
}

export type SendPushResult = {
  /** Devices successfully targeted (FCM accepted). */
  sent: number
  /** Whether Firebase env / auth was available. */
  configured: boolean
}

/**
 * Send a push notification to every registered device of a user.
 * Silently no-ops if Firebase is not configured (returns sent: 0).
 * `userId` must be `public.users.id` (not auth.users.id).
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<SendPushResult> {
  const projectId = process.env.FIREBASE_PROJECT_ID
  if (!projectId || !process.env.FIREBASE_SERVICE_ACCOUNT) {
    return { sent: 0, configured: false }
  }

  const accessToken = await getAccessToken()
  if (!accessToken) return { sent: 0, configured: false }

  const supabase = getSupabaseAdmin()
  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('id, token')
    .eq('user_id', userId)

  if (!tokens?.length) return { sent: 0, configured: true }

  const staleIds: string[] = []
  let sent = 0

  await Promise.allSettled(
    tokens.map(async ({ id, token }) => {
      const result = await sendToToken(projectId, accessToken, token, payload)
      if (result === 'invalid_token') staleIds.push(id)
      else sent++
    }),
  )

  if (staleIds.length > 0) {
    await supabase.from('push_tokens').delete().in('id', staleIds)
  }

  return { sent, configured: true }
}
