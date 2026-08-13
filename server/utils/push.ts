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
    let parsed: any
    try {
      parsed = JSON.parse(raw)
    } catch {
      // dotenv/Vercel sometimes expand `\n` inside private_key into real newlines,
      // which makes the overall JSON invalid. Escape only inside the PEM block.
      const fixed = raw.replace(
        /-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/,
        (_m, pemBody: string) =>
          `-----BEGIN PRIVATE KEY-----${pemBody.replace(/\r?\n/g, '\\n')}-----END PRIVATE KEY-----`,
      )
      parsed = JSON.parse(fixed)
    }
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
 * Never throws — callers can fire-and-forget safely.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<SendPushResult> {
  try {
    if (!userId || typeof userId !== 'string') {
      return { sent: 0, configured: false }
    }

    const projectId = process.env.FIREBASE_PROJECT_ID
    if (!projectId || !process.env.FIREBASE_SERVICE_ACCOUNT) {
      return { sent: 0, configured: false }
    }

    const title = String(payload?.title || '').trim() || 'Simy'
    const body = String(payload?.body || '').trim()
    if (!body) {
      console.warn('[Push] Skipping send — empty body')
      return { sent: 0, configured: true }
    }

    // FCM data payload values must be strings
    const data: Record<string, string> | undefined = payload.data
      ? Object.fromEntries(
          Object.entries(payload.data)
            .filter(([, v]) => v != null && v !== '')
            .map(([k, v]) => [k, String(v)]),
        )
      : undefined

    const accessToken = await getAccessToken()
    if (!accessToken) return { sent: 0, configured: false }

    const supabase = getSupabaseAdmin()
    const { data: tokens, error: tokenError } = await supabase
      .from('push_tokens')
      .select('id, token')
      .eq('user_id', userId)

    if (tokenError) {
      console.warn('[Push] Token lookup failed:', tokenError.message)
      return { sent: 0, configured: true }
    }

    if (!tokens?.length) return { sent: 0, configured: true }

    const staleIds: string[] = []
    let sent = 0

    await Promise.allSettled(
      tokens.map(async ({ id, token }) => {
        if (!token) {
          staleIds.push(id)
          return
        }
        const result = await sendToToken(projectId, accessToken, token, {
          title,
          body,
          ...(data && Object.keys(data).length ? { data } : {}),
        })
        if (result === 'invalid_token') staleIds.push(id)
        else sent++
      }),
    )

    if (staleIds.length > 0) {
      await supabase.from('push_tokens').delete().in('id', staleIds)
    }

    return { sent, configured: true }
  } catch (e: any) {
    console.warn('[Push] sendPushToUser failed (non-critical):', e?.message || e)
    return { sent: 0, configured: Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_SERVICE_ACCOUNT) }
  }
}
