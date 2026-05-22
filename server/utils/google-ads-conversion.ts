/**
 * Google Ads Server-Side Conversion Upload
 *
 * Uploads click conversions (gclid/gbraid/wbraid) directly to the Google Ads API
 * when a booking is completed. Bypasses browser JS, cookies and consent — the
 * conversion fires from the server with the click ID stored in our DB.
 *
 * Required env vars:
 *   GOOGLE_ADS_DEVELOPER_TOKEN
 *   GOOGLE_ADS_CLIENT_ID
 *   GOOGLE_ADS_CLIENT_SECRET
 *   GOOGLE_ADS_REFRESH_TOKEN          (must have `https://www.googleapis.com/auth/adwords` write scope)
 *   GOOGLE_ADS_CUSTOMER_ID            (no dashes, e.g. 1916698119)
 *   GOOGLE_ADS_CONVERSION_ACTION_ID   (numeric ID of the "Server: Booking Completed" action)
 *   GOOGLE_ADS_MANAGER_CUSTOMER_ID    (optional, for MCC accounts — e.g. 9509957201)
 *
 * Reference:
 *   https://developers.google.com/google-ads/api/rest/reference/rest/v23/customers/uploadClickConversions
 */

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

const GOOGLE_ADS_API_VERSION = 'v23'

export interface ConversionUploadInput {
  appointment_id: string
  gclid?: string | null
  gbraid?: string | null
  wbraid?: string | null
  conversion_value_chf: number
  conversion_date_time: Date | string
  /** SHA-256 hashed email (lowercased, trimmed) for Enhanced Conversions. */
  hashed_email?: string | null
  /** SHA-256 hashed phone (E.164 format) for Enhanced Conversions. */
  hashed_phone?: string | null
  /** Optional custom order id to dedupe in Google Ads. Defaults to appointment_id. */
  order_id?: string
}

export interface ConversionUploadResult {
  uploaded: boolean
  reason?: string
  error?: string
  google_response?: any
}

interface GoogleAdsCreds {
  developerToken: string
  clientId: string
  clientSecret: string
  refreshToken: string
  customerId: string
  conversionActionId: string
  managerCustomerId?: string
}

function readCreds(): GoogleAdsCreds | null {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID
  const conversionActionId = process.env.GOOGLE_ADS_CONVERSION_ACTION_ID
  const managerCustomerId = process.env.GOOGLE_ADS_MANAGER_CUSTOMER_ID

  if (!developerToken || !clientId || !clientSecret || !refreshToken || !customerId || !conversionActionId) {
    return null
  }

  return { developerToken, clientId, clientSecret, refreshToken, customerId, conversionActionId, managerCustomerId }
}

async function getAccessToken(creds: GoogleAdsCreds): Promise<string | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        refresh_token: creds.refreshToken,
        grant_type: 'refresh_token',
      }),
    })
    const data = await res.json() as any
    if (!data.access_token) {
      logger.warn('google-ads-conversion: token exchange failed', data?.error_description ?? data)
      return null
    }
    return data.access_token as string
  } catch (err: any) {
    logger.warn('google-ads-conversion: token fetch error', err?.message ?? err)
    return null
  }
}

function toRfc3339(value: Date | string): string {
  const d = typeof value === 'string' ? new Date(value) : value
  // Google Ads expects e.g. "2026-05-22 16:30:00+02:00" (note the space).
  // ISO format "2026-05-22T16:30:00+02:00" also accepted in v23.
  return d.toISOString().replace('Z', '+00:00')
}

/**
 * Hash a string with SHA-256 for Enhanced Conversions.
 * Email should be lowercased + trimmed. Phone in E.164 (e.g. +41441234567).
 */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Upload a single click conversion to Google Ads.
 * Fire-and-forget: never throws — returns a structured result so callers can log.
 */
export async function uploadClickConversion(input: ConversionUploadInput): Promise<ConversionUploadResult> {
  const creds = readCreds()
  if (!creds) {
    return { uploaded: false, reason: 'missing_credentials' }
  }

  // Without any click identifier the API call would be rejected.
  // Enhanced Conversions for Leads (email-only) would require a separate flow.
  if (!input.gclid && !input.gbraid && !input.wbraid) {
    return { uploaded: false, reason: 'no_click_id' }
  }

  const accessToken = await getAccessToken(creds)
  if (!accessToken) {
    return { uploaded: false, reason: 'token_error' }
  }

  const conversionAction = `customers/${creds.customerId}/conversionActions/${creds.conversionActionId}`

  const conversion: Record<string, any> = {
    conversionAction,
    conversionDateTime: toRfc3339(input.conversion_date_time),
    conversionValue: Number(input.conversion_value_chf.toFixed(2)),
    currencyCode: 'CHF',
    orderId: input.order_id || input.appointment_id,
  }

  if (input.gclid) conversion.gclid = input.gclid
  if (input.gbraid) conversion.gbraid = input.gbraid
  if (input.wbraid) conversion.wbraid = input.wbraid

  // Enhanced Conversions — hashed user identifiers strengthen attribution
  // when cookies / gclid are stale. Sent under `userIdentifiers`.
  const userIdentifiers: Record<string, any>[] = []
  if (input.hashed_email) userIdentifiers.push({ hashedEmail: input.hashed_email })
  if (input.hashed_phone) userIdentifiers.push({ hashedPhoneNumber: input.hashed_phone })
  if (userIdentifiers.length > 0) {
    conversion.userIdentifiers = userIdentifiers
  }

  const url = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${creds.customerId}:uploadClickConversions`
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'developer-token': creds.developerToken,
    'Content-Type': 'application/json',
  }
  if (creds.managerCustomerId) headers['login-customer-id'] = creds.managerCustomerId

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        conversions: [conversion],
        partialFailure: true,
        validateOnly: false,
      }),
    })

    const text = await res.text()
    let parsed: any = null
    try { parsed = JSON.parse(text) } catch { /* non-JSON response */ }

    if (!res.ok) {
      return { uploaded: false, reason: 'api_error', error: parsed?.error?.message ?? text.slice(0, 500), google_response: parsed }
    }

    // partialFailureError surfaces per-row failures even on HTTP 200.
    if (parsed?.partialFailureError?.message) {
      return { uploaded: false, reason: 'partial_failure', error: parsed.partialFailureError.message, google_response: parsed }
    }

    return { uploaded: true, google_response: parsed }
  } catch (err: any) {
    return { uploaded: false, reason: 'fetch_error', error: err?.message ?? String(err) }
  }
}

/**
 * Wrapper that uploads a conversion AND records the attempt in
 * google_ads_conversion_uploads for audit + retry. Fire-and-forget safe.
 */
export async function recordAndUploadConversion(input: ConversionUploadInput): Promise<void> {
  const supabase = getSupabaseAdmin()
  const conversionActionId = process.env.GOOGLE_ADS_CONVERSION_ACTION_ID ?? 'unknown'

  // 1. Record the pending upload (insert immediately so we have an audit trail
  //    even if the API call hangs / never returns).
  const { data: row, error: insertError } = await supabase
    .from('google_ads_conversion_uploads')
    .insert({
      appointment_id: input.appointment_id,
      conversion_action_id: conversionActionId,
      gclid: input.gclid ?? null,
      gbraid: input.gbraid ?? null,
      wbraid: input.wbraid ?? null,
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
    logger.warn('google-ads-conversion: could not record upload row', insertError?.message)
    // Continue with upload anyway — better to attempt than to skip.
  }

  // 2. Perform the upload.
  const result = await uploadClickConversion(input)

  // 3. Update audit row with outcome.
  if (row?.id) {
    const upload_status =
      result.uploaded ? 'success'
        : result.reason === 'no_click_id' ? 'skipped_no_click_id'
          : 'failed'

    await supabase
      .from('google_ads_conversion_uploads')
      .update({
        upload_status,
        upload_attempts: 1,
        last_attempt_at: new Date().toISOString(),
        error_message: result.error || result.reason || null,
        google_response: result.google_response ?? null,
      })
      .eq('id', row.id)
  }

  if (result.uploaded) {
    logger.info(`google-ads-conversion: uploaded for appointment ${input.appointment_id} (CHF ${input.conversion_value_chf})`)
  } else {
    logger.warn(`google-ads-conversion: upload skipped/failed for appointment ${input.appointment_id} — ${result.reason}${result.error ? `: ${result.error.slice(0, 200)}` : ''}`)
  }
}

/**
 * Upload a conversion ADJUSTMENT (retract / restate) to Google Ads.
 * Used when an appointment is cancelled — we tell Google to subtract the
 * conversion so Smart Bidding learns from genuine completions only.
 */
export async function uploadConversionAdjustment(params: {
  appointment_id: string
  original_conversion_date_time: Date | string
  adjustment_type: 'RETRACT' | 'RESTATEMENT'
  adjustment_date_time?: Date | string
  new_conversion_value_chf?: number
}): Promise<ConversionUploadResult> {
  const creds = readCreds()
  if (!creds) return { uploaded: false, reason: 'missing_credentials' }

  const accessToken = await getAccessToken(creds)
  if (!accessToken) return { uploaded: false, reason: 'token_error' }

  const conversionAction = `customers/${creds.customerId}/conversionActions/${creds.conversionActionId}`

  const adjustment: Record<string, any> = {
    conversionAction,
    adjustmentType: params.adjustment_type,
    adjustmentDateTime: toRfc3339(params.adjustment_date_time ?? new Date()),
    orderId: params.appointment_id,
  }

  if (params.adjustment_type === 'RESTATEMENT' && typeof params.new_conversion_value_chf === 'number') {
    adjustment.restatementValue = {
      adjustedValue: Number(params.new_conversion_value_chf.toFixed(2)),
      currencyCode: 'CHF',
    }
  }

  const url = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${creds.customerId}:uploadConversionAdjustments`
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'developer-token': creds.developerToken,
    'Content-Type': 'application/json',
  }
  if (creds.managerCustomerId) headers['login-customer-id'] = creds.managerCustomerId

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        conversionAdjustments: [adjustment],
        partialFailure: true,
        validateOnly: false,
      }),
    })

    const text = await res.text()
    let parsed: any = null
    try { parsed = JSON.parse(text) } catch { /* non-JSON */ }

    if (!res.ok) {
      return { uploaded: false, reason: 'api_error', error: parsed?.error?.message ?? text.slice(0, 500), google_response: parsed }
    }
    if (parsed?.partialFailureError?.message) {
      return { uploaded: false, reason: 'partial_failure', error: parsed.partialFailureError.message, google_response: parsed }
    }

    return { uploaded: true, google_response: parsed }
  } catch (err: any) {
    return { uploaded: false, reason: 'fetch_error', error: err?.message ?? String(err) }
  }
}
