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
 *   GOOGLE_ADS_CONVERSION_ACTION_ID          (numeric ID of the "Server: Booking Completed" action)
 *   GOOGLE_ADS_INQUIRY_CONVERSION_ACTION_ID  (optional — "Server: Inquiry Submitted" for proposal forms)
 *   GOOGLE_ADS_MANAGER_CUSTOMER_ID           (optional, for MCC accounts — e.g. 9509957201)
 *
 * Reference:
 *   https://developers.google.com/google-ads/api/rest/reference/rest/v23/customers/uploadClickConversions
 */

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

const GOOGLE_ADS_API_VERSION = 'v23'

export interface ConversionUploadInput {
  /** Appointment UUID when this is a booking conversion. Optional for inquiry/lead uploads. */
  appointment_id?: string
  tenant_id?: string | null
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
  /** Override conversion action (defaults to GOOGLE_ADS_CONVERSION_ACTION_ID). */
  conversion_action_id?: string
  /**
   * When true, keep the provided conversion value as-is (including small inquiry
   * lead values). Booking uploads still use normalizeConversionValueChf().
   */
  skip_value_floor?: boolean
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUuid(value: string | null | undefined): value is string {
  return !!value && UUID_RE.test(value)
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

function readCreds(conversionActionIdOverride?: string): GoogleAdsCreds | null {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID?.trim()
  // Trim to guard against accidental trailing newlines when pasting into Vercel env vars
  const conversionActionId = (conversionActionIdOverride || process.env.GOOGLE_ADS_CONVERSION_ACTION_ID)?.trim()
  const managerCustomerId = process.env.GOOGLE_ADS_MANAGER_CUSTOMER_ID?.trim()

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
  // Google Ads API requires exactly "yyyy-mm-dd HH:mm:ss+HH:mm" (with space, no ms).
  // ISO 8601 with milliseconds or "T" separator is rejected as INVALID_STRING_DATE_TIME.
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
         `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}+00:00`
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
  const creds = readCreds(input.conversion_action_id)
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

  const conversionValue = input.skip_value_floor
    ? (Number.isFinite(Number(input.conversion_value_chf)) && Number(input.conversion_value_chf) > 0
        ? Number(Number(input.conversion_value_chf).toFixed(2))
        : readInquiryDefaultValueChf())
    : normalizeConversionValueChf(input.conversion_value_chf)

  const orderId = input.order_id || input.appointment_id
  if (!orderId) {
    return { uploaded: false, reason: 'missing_order_id', error: 'order_id or appointment_id required' }
  }

  const conversion: Record<string, any> = {
    conversionAction,
    conversionDateTime: toRfc3339(input.conversion_date_time),
    conversionValue,
    currencyCode: 'CHF',
    orderId,
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
  // Trim: env vars pasted into Vercel occasionally carry a trailing newline. The
  // actual API call already trims via readCreds(); trim here too so the audit
  // row in google_ads_conversion_uploads doesn't store a polluted id like "123\n".
  const conversionActionId = (input.conversion_action_id ?? process.env.GOOGLE_ADS_CONVERSION_ACTION_ID ?? 'unknown').trim()
  const normalizedValue = normalizeConversionValueChf(input.conversion_value_chf)
  const uploadInput: ConversionUploadInput = { ...input, conversion_value_chf: normalizedValue }

  // 1. Record the pending upload (insert immediately so we have an audit trail
  //    even if the API call hangs / never returns).
  const { data: row, error: insertError } = await supabase
    .from('google_ads_conversion_uploads')
    .insert({
      appointment_id: input.appointment_id,
      order_id: input.order_id || input.appointment_id || null,
      tenant_id: input.tenant_id ?? null,
      conversion_action_id: conversionActionId,
      gclid: input.gclid ?? null,
      gbraid: input.gbraid ?? null,
      wbraid: input.wbraid ?? null,
      conversion_value_chf: normalizedValue,
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
  const result = await uploadClickConversion(uploadInput)

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
    logger.info(`google-ads-conversion: uploaded for appointment ${input.appointment_id} (CHF ${normalizedValue})`)
  } else if (result.reason === 'no_click_id') {
    // Expected/benign: this booking has no gclid/gbraid/wbraid (e.g. direct visit,
    // organic traffic, or another channel) — there is nothing to upload. Not a failure.
    logger.debug(`google-ads-conversion: skipped for appointment ${input.appointment_id} — no click id on this booking (not from a Google Ads click)`)
  } else {
    logger.warn(`google-ads-conversion: upload skipped/failed for appointment ${input.appointment_id} — ${result.reason}${result.error ? `: ${result.error.slice(0, 200)}` : ''}`)
  }
}

/**
 * Upload a paid course-registration conversion to Google Ads.
 *
 * course_registrations are not appointments, so we cannot write the UUID FK
 * audit row in google_ads_conversion_uploads. Upload directly with a stable
 * order_id (`course_<registration_id>`) for Google-side dedupe — same pattern
 * as Meta CAPI for courses.
 */
export async function recordAndUploadCourseConversion(input: {
  registration_id: string
  tenant_id?: string | null
  gclid?: string | null
  gbraid?: string | null
  wbraid?: string | null
  conversion_value_chf: number
  conversion_date_time?: Date | string
  hashed_email?: string | null
  hashed_phone?: string | null
}): Promise<void> {
  if (!input.gclid && !input.gbraid && !input.wbraid) {
    logger.info(`google-ads-conversion: course ${input.registration_id} — no click id, skip (organic/direct)`)
    return
  }

  const conversionDateTime = input.conversion_date_time ?? new Date()
  const normalizedValue = normalizeConversionValueChf(input.conversion_value_chf)
  const result = await uploadClickConversion({
    appointment_id: input.registration_id,
    order_id: `course_${input.registration_id}`,
    tenant_id: input.tenant_id,
    gclid: input.gclid,
    gbraid: input.gbraid,
    wbraid: input.wbraid,
    conversion_value_chf: normalizedValue,
    conversion_date_time: conversionDateTime,
    hashed_email: input.hashed_email,
    hashed_phone: input.hashed_phone,
  })

  if (result.uploaded) {
    logger.info(`google-ads-conversion: course ${input.registration_id} uploaded (CHF ${normalizedValue})`)
  } else if (result.reason !== 'no_click_id') {
    logger.warn(`google-ads-conversion: course ${input.registration_id} failed — ${result.reason}${result.error ? `: ${result.error.slice(0, 200)}` : ''}`)
  }
}

/**
 * Re-attempt a previously failed row from google_ads_conversion_uploads.
 * Used by the hourly retry cron (and one-shot admin repairs).
 */
export async function retryFailedConversionUpload(row: {
  id: number | string
  appointment_id?: string | null
  order_id?: string | null
  conversion_action_id?: string | null
  gclid?: string | null
  gbraid?: string | null
  wbraid?: string | null
  conversion_value_chf: number
  conversion_date_time: string | Date
  upload_attempts?: number | null
}): Promise<ConversionUploadResult> {
  const supabase = getSupabaseAdmin()
  const inquiryActionId = (process.env.GOOGLE_ADS_INQUIRY_CONVERSION_ACTION_ID || '').trim()
  const actionId = (row.conversion_action_id || '').trim()
  const isInquiry = !!inquiryActionId && actionId === inquiryActionId
  const valueChf = isInquiry
    ? (Number.isFinite(Number(row.conversion_value_chf)) && Number(row.conversion_value_chf) > 0
        ? Number(Number(row.conversion_value_chf).toFixed(2))
        : readInquiryDefaultValueChf())
    : normalizeConversionValueChf(row.conversion_value_chf)

  const orderId = row.order_id
    || (row.appointment_id ? String(row.appointment_id) : null)
    || undefined

  const result = await uploadClickConversion({
    appointment_id: row.appointment_id || undefined,
    order_id: orderId,
    conversion_action_id: actionId || undefined,
    gclid: row.gclid,
    gbraid: row.gbraid,
    wbraid: row.wbraid,
    conversion_value_chf: valueChf,
    conversion_date_time: row.conversion_date_time,
    skip_value_floor: isInquiry,
  })

  const upload_status =
    result.uploaded ? 'success'
      : result.reason === 'no_click_id' ? 'skipped_no_click_id'
        : 'failed'

  await supabase
    .from('google_ads_conversion_uploads')
    .update({
      upload_status,
      upload_attempts: (row.upload_attempts ?? 0) + 1,
      last_attempt_at: new Date().toISOString(),
      error_message: result.error || result.reason || null,
      google_response: result.google_response ?? null,
      conversion_value_chf: valueChf,
      conversion_action_id: actionId || (process.env.GOOGLE_ADS_CONVERSION_ACTION_ID ?? '').trim() || row.conversion_action_id,
      order_id: orderId ?? row.order_id ?? null,
    })
    .eq('id', row.id)

  return result
}

/**
 * Default lead value for inquiry/proposal conversions (CHF). Override via env.
 * NB: the env var has previously been set to an empty string ("") in Vercel,
 * which is not `undefined`, so `?? '10'` never kicked in and every inquiry
 * conversion silently uploaded with value 0. Guard against blank/invalid
 * values explicitly instead of relying on `??`.
 */
function readInquiryDefaultValueChf(): number {
  const raw = process.env.GOOGLE_ADS_INQUIRY_CONVERSION_VALUE_CHF?.trim()
  const parsed = raw ? Number(raw) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10
}

/**
 * Floor value for bookings that complete at CHF 0 (free public events /
 * Erstgespräch / Probelektion). Uploading 0 teaches Smart Bidding that
 * conversions are worthless. Override via GOOGLE_ADS_FALLBACK_BOOKING_VALUE_CHF.
 */
export function readFallbackBookingValueChf(): number {
  const raw = process.env.GOOGLE_ADS_FALLBACK_BOOKING_VALUE_CHF?.trim()
  const parsed = raw ? Number(raw) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 100
}

/**
 * Never upload conversion_value 0 for a real Google Ads click conversion.
 * Free bookings still signal demand — use the configured floor instead.
 */
export function normalizeConversionValueChf(valueChf: number | null | undefined): number {
  const n = Number(valueChf)
  if (Number.isFinite(n) && n > 0) return Number(n.toFixed(2))
  return readFallbackBookingValueChf()
}

/**
 * Upload a booking-proposal (inquiry) conversion to Google Ads.
 * Uses GOOGLE_ADS_INQUIRY_CONVERSION_ACTION_ID and writes an audit row to
 * google_ads_conversion_uploads (proposal_id + order_id, appointment_id null).
 */
export async function recordAndUploadInquiryConversion(input: {
  proposal_id: string
  gclid?: string | null
  gbraid?: string | null
  wbraid?: string | null
  conversion_value_chf?: number
  conversion_date_time?: Date | string
  hashed_email?: string | null
  hashed_phone?: string | null
  tenant_id?: string | null
}): Promise<void> {
  const conversionActionId = process.env.GOOGLE_ADS_INQUIRY_CONVERSION_ACTION_ID?.trim()
  if (!conversionActionId) {
    logger.warn('google-ads-conversion: skipping inquiry upload — GOOGLE_ADS_INQUIRY_CONVERSION_ACTION_ID not set')
    return
  }

  const supabase = getSupabaseAdmin()
  const orderId = `inquiry-${input.proposal_id}`
  const proposalUuid = isUuid(input.proposal_id) ? input.proposal_id : null
  const conversionDateTime = input.conversion_date_time ?? new Date()
  const valueChf = (Number.isFinite(Number(input.conversion_value_chf)) && Number(input.conversion_value_chf) > 0)
    ? Number(Number(input.conversion_value_chf).toFixed(2))
    : readInquiryDefaultValueChf()

  // Record pending upload for audit trail + hourly retry cron.
  // appointment_id stays null (FK to appointments); proposal_id only when it is a real booking_proposals UUID.
  const { data: row, error: insertError } = await supabase
    .from('google_ads_conversion_uploads')
    .insert({
      appointment_id: null,
      proposal_id: proposalUuid,
      order_id: orderId,
      tenant_id: input.tenant_id ?? null,
      conversion_action_id: conversionActionId,
      gclid: input.gclid ?? null,
      gbraid: input.gbraid ?? null,
      wbraid: input.wbraid ?? null,
      conversion_value_chf: valueChf,
      conversion_date_time: typeof conversionDateTime === 'string'
        ? conversionDateTime
        : conversionDateTime.toISOString(),
      upload_status: 'pending',
      upload_attempts: 0,
    })
    .select('id')
    .single()

  if (insertError || !row) {
    // If proposal_id FK fails (entity id looks like a UUID but isn't a proposal), retry without it.
    if (proposalUuid && insertError) {
      const { data: fallbackRow, error: fallbackError } = await supabase
        .from('google_ads_conversion_uploads')
        .insert({
          appointment_id: null,
          proposal_id: null,
          order_id: orderId,
          tenant_id: input.tenant_id ?? null,
          conversion_action_id: conversionActionId,
          gclid: input.gclid ?? null,
          gbraid: input.gbraid ?? null,
          wbraid: input.wbraid ?? null,
          conversion_value_chf: valueChf,
          conversion_date_time: typeof conversionDateTime === 'string'
            ? conversionDateTime
            : conversionDateTime.toISOString(),
          upload_status: 'pending',
          upload_attempts: 0,
        })
        .select('id')
        .single()

      if (fallbackError || !fallbackRow) {
        logger.warn('google-ads-conversion: could not record inquiry upload row', fallbackError?.message || insertError?.message)
      } else {
        await finishInquiryUpload({
          rowId: fallbackRow.id,
          orderId,
          conversionActionId,
          valueChf,
          conversionDateTime,
          input,
        })
        return
      }
    } else {
      logger.warn('google-ads-conversion: could not record inquiry upload row', insertError?.message)
    }
  }

  await finishInquiryUpload({
    rowId: row?.id ?? null,
    orderId,
    conversionActionId,
    valueChf,
    conversionDateTime,
    input,
  })
}

async function finishInquiryUpload(params: {
  rowId: number | string | null
  orderId: string
  conversionActionId: string
  valueChf: number
  conversionDateTime: Date | string
  input: {
    proposal_id: string
    gclid?: string | null
    gbraid?: string | null
    wbraid?: string | null
    hashed_email?: string | null
    hashed_phone?: string | null
  }
}): Promise<void> {
  const supabase = getSupabaseAdmin()
  const result = await uploadClickConversion({
    order_id: params.orderId,
    conversion_action_id: params.conversionActionId,
    gclid: params.input.gclid,
    gbraid: params.input.gbraid,
    wbraid: params.input.wbraid,
    conversion_value_chf: params.valueChf,
    conversion_date_time: params.conversionDateTime,
    hashed_email: params.input.hashed_email,
    hashed_phone: params.input.hashed_phone,
    skip_value_floor: true,
  })

  if (params.rowId) {
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
      .eq('id', params.rowId)
  }

  if (result.uploaded) {
    logger.info(`google-ads-conversion: inquiry uploaded for proposal ${params.input.proposal_id}`)
  } else if (result.reason === 'no_click_id') {
    logger.debug(`google-ads-conversion: inquiry skipped for proposal ${params.input.proposal_id} — no click id (not from a Google Ads click)`)
  } else {
    logger.warn(`google-ads-conversion: inquiry upload skipped/failed for proposal ${params.input.proposal_id} — ${result.reason}${result.error ? `: ${result.error.slice(0, 200)}` : ''}`)
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
