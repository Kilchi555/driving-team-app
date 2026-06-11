/**
 * Meta Conversions API (CAPI) — Server-Side Event Upload
 *
 * Sends conversion events directly to Meta from the server, bypassing browser
 * cookies and iOS 14+ privacy restrictions. Provides ~30–50% more signal than
 * client-side Pixel alone, enabling Meta's algorithm to optimise for real bookings.
 *
 * Required env vars:
 *   META_PIXEL_ID              — Pixel ID (same as NUXT_PUBLIC_META_PIXEL_ID)
 *   META_SYSTEM_USER_TOKEN     — Never-expiring System User token (preferred)
 *   META_ACCESS_TOKEN          — Fallback: User Access Token (expires in 60 days)
 *
 * Optional env vars:
 *   META_CAPI_TEST_EVENT_CODE  — Set during testing (e.g. "TEST12345") to route
 *                                events to the Meta Events Manager Test tab
 *
 * API Reference:
 *   https://developers.facebook.com/docs/marketing-api/conversions-api/using-the-api
 */

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

const META_GRAPH_API_VERSION = 'v19.0'

export interface MetaCapiInput {
  appointment_id: string
  tenant_id?: string | null
  event_name: 'Purchase' | 'Lead' | 'RefundOrder'
  conversion_value_chf: number
  conversion_date_time: Date | string
  /** Raw fbclid from URL (?fbclid=...) — used as deduplication signal. */
  fbclid?: string | null
  /** _fbc cookie value. Format: fb.1.{creation_time_ms}.{fbclid} */
  fbc?: string | null
  /** _fbp cookie value. Format: fb.1.{creation_time_ms}.{random_number} */
  fbp?: string | null
  /** SHA-256 hashed email (lowercased, trimmed). */
  hashed_email?: string | null
  /** SHA-256 hashed phone in E.164 format (e.g. +41441234567). */
  hashed_phone?: string | null
  /** Client IP address for server-side user matching. */
  client_ip?: string | null
  /** User-Agent string for server-side user matching. */
  user_agent?: string | null
  /** URL of the page where the conversion happened (recommended by Meta for web events). */
  event_source_url?: string | null
}

export interface MetaCapiResult {
  sent: boolean
  reason?: string
  error?: string
  meta_response?: any
}

interface MetaCapiCreds {
  pixelId: string
  accessToken: string
}

function readCreds(): MetaCapiCreds | null {
  const pixelId = process.env.META_PIXEL_ID
  const accessToken = process.env.META_SYSTEM_USER_TOKEN ?? process.env.META_ACCESS_TOKEN

  if (!pixelId || !accessToken) return null
  return { pixelId, accessToken }
}

/**
 * Hash a string with SHA-256. Used for email + phone in Enhanced Conversions.
 * Email: lowercased + trimmed. Phone: E.164 (e.g. +41441234567).
 */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function toUnixSeconds(value: Date | string): number {
  const d = typeof value === 'string' ? new Date(value) : value
  return Math.floor(d.getTime() / 1000)
}

/**
 * Send a single event to the Meta Conversions API.
 * Fire-and-forget safe: never throws — returns a structured result.
 *
 * Event deduplication: event_id is set to `capi_{appointment_id}` which must
 * match the eventID passed to `fbq('track', ..., { eventID: ... })` on the
 * client side so Meta deduplicates browser + server events automatically.
 */
export async function sendCapiEvent(input: MetaCapiInput): Promise<MetaCapiResult> {
  const creds = readCreds()
  if (!creds) {
    return { sent: false, reason: 'missing_credentials' }
  }

  // Without any user signal, CAPI can still fire but match rate is near zero.
  // Require at least one identifier for meaningful attribution.
  const hasUserSignal = !!(input.fbclid || input.fbc || input.fbp || input.hashed_email || input.hashed_phone || input.client_ip)
  if (!hasUserSignal) {
    return { sent: false, reason: 'no_user_signal' }
  }

  const eventTime = toUnixSeconds(input.conversion_date_time)
  // event_id must match the browser pixel's eventID for deduplication.
  const eventId = `capi_${input.appointment_id}`

  const userData: Record<string, any> = {}
  if (input.hashed_email) userData.em = [input.hashed_email]
  if (input.hashed_phone) userData.ph = [input.hashed_phone]
  if (input.fbc) userData.fbc = input.fbc
  if (input.fbp) userData.fbp = input.fbp
  if (input.client_ip) userData.client_ip_address = input.client_ip
  if (input.user_agent) userData.client_user_agent = input.user_agent

  const customData: Record<string, any> = {
    currency: 'CHF',
    value: Number(input.conversion_value_chf.toFixed(2)),
  }

  const eventPayload: Record<string, any> = {
    event_name: input.event_name,
    event_time: eventTime,
    event_id: eventId,
    action_source: 'website',
    user_data: userData,
    custom_data: customData,
  }
  if (input.event_source_url) {
    eventPayload.event_source_url = input.event_source_url
  }

  const payload: Record<string, any> = {
    data: [eventPayload],
    access_token: creds.accessToken,
  }

  // Test event code — only include when explicitly set (keeps production clean).
  const testEventCode = process.env.META_CAPI_TEST_EVENT_CODE
  if (testEventCode) {
    payload.test_event_code = testEventCode
  }

  const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${creds.pixelId}/events`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const text = await res.text()
    let parsed: any = null
    try { parsed = JSON.parse(text) } catch { /* non-JSON */ }

    if (!res.ok) {
      return {
        sent: false,
        reason: 'api_error',
        error: parsed?.error?.message ?? text.slice(0, 500),
        meta_response: parsed,
      }
    }

    return { sent: true, meta_response: parsed }
  } catch (err: any) {
    return { sent: false, reason: 'fetch_error', error: err?.message ?? String(err) }
  }
}

/**
 * Upload a CAPI event AND record the attempt in `meta_capi_uploads` for audit + retry.
 * Fire-and-forget safe.
 */
export async function recordAndSendCapiEvent(input: MetaCapiInput): Promise<void> {
  const supabase = getSupabaseAdmin()
  const pixelId = process.env.META_PIXEL_ID ?? 'unknown'

  const { data: row, error: insertError } = await supabase
    .from('meta_capi_uploads')
    .insert({
      appointment_id: input.appointment_id,
      tenant_id: input.tenant_id ?? null,
      pixel_id: pixelId,
      event_name: input.event_name,
      fbclid: input.fbclid ?? null,
      fbc: input.fbc ?? null,
      fbp: input.fbp ?? null,
      conversion_value_chf: input.conversion_value_chf,
      conversion_date_time: typeof input.conversion_date_time === 'string'
        ? input.conversion_date_time
        : input.conversion_date_time.toISOString(),
      upload_status: 'pending',
      upload_attempts: 0,
    })
    .select('id')
    .single()

  if (insertError || !row) {
    logger.warn('meta-capi: could not record upload row', insertError?.message)
  }

  const result = await sendCapiEvent(input)

  if (row?.id) {
    const uploadStatus =
      result.sent ? 'success'
        : result.reason === 'no_user_signal' ? 'skipped_no_signal'
          : 'failed'

    await supabase
      .from('meta_capi_uploads')
      .update({
        upload_status: uploadStatus,
        upload_attempts: 1,
        last_attempt_at: new Date().toISOString(),
        error_message: result.error || result.reason || null,
        meta_response: result.meta_response ?? null,
      })
      .eq('id', row.id)
  }

  if (result.sent) {
    logger.info(`meta-capi: ${input.event_name} sent for appointment ${input.appointment_id} (CHF ${input.conversion_value_chf})`)
  } else {
    logger.warn(`meta-capi: ${input.event_name} skipped/failed for appointment ${input.appointment_id} — ${result.reason}${result.error ? `: ${result.error.slice(0, 200)}` : ''}`)
  }
}

/**
 * Send a RefundOrder event to Meta CAPI when an appointment is cancelled.
 * Meta has no native "retract" mechanism like Google Ads, but RefundOrder
 * helps train the algorithm with accurate revenue data.
 * No audit row — refunds are optional signal enrichment only.
 */
export async function sendCapiRefundEvent(params: {
  appointment_id: string
  tenant_id?: string | null
  fbc?: string | null
  fbp?: string | null
  hashed_email?: string | null
  hashed_phone?: string | null
  refund_value_chf: number
}): Promise<void> {
  if (!process.env.META_PIXEL_ID) return

  const result = await sendCapiEvent({
    appointment_id: `refund_${params.appointment_id}`,
    tenant_id: params.tenant_id,
    event_name: 'RefundOrder',
    conversion_value_chf: params.refund_value_chf,
    conversion_date_time: new Date(),
    fbc: params.fbc,
    fbp: params.fbp,
    hashed_email: params.hashed_email,
    hashed_phone: params.hashed_phone,
  })

  if (result.sent) {
    logger.info(`meta-capi: RefundOrder sent for appointment ${params.appointment_id}`)
  } else {
    logger.warn(`meta-capi: RefundOrder skipped/failed for appointment ${params.appointment_id} — ${result.reason}`)
  }
}
