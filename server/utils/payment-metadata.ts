/**
 * Payment.metadata is jsonb, but production contains three legacy shapes:
 * 1. a real JSON object
 * 2. a JSON string stored inside jsonb (`jsonb_typeof = 'string'`)
 * 3. a char-key object produced by `{ ...jsonString }`
 *
 * Never Object-spread unknown metadata. Always normalize first.
 */

export type PaymentMetadata = Record<string, unknown>

const MAX_METADATA_CHARS = 20_000
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function copySafeObject(value: Record<string, unknown>): PaymentMetadata {
  const out = Object.create(null) as PaymentMetadata
  for (const key of Object.keys(value)) {
    if (DANGEROUS_KEYS.has(key)) continue
    out[key] = value[key]
  }
  return out
}

export function reconstructCharKeyJson(value: unknown): Record<string, unknown> | null {
  if (!isPlainObject(value)) return null
  const keys = Object.keys(value)
  if (keys.length < 2) return null
  if (keys.length > MAX_METADATA_CHARS) return null
  if (!keys.every(key => /^\d+$/.test(key))) return null

  const sorted = keys.map(Number).sort((a, b) => a - b)
  if (sorted[0] !== 0 || sorted.length !== keys.length) return null
  if (!sorted.every((n, i) => n === i)) return null

  const chars: string[] = []
  for (const index of sorted) {
    const char = value[String(index)]
    if (typeof char !== 'string' || char.length !== 1) return null
    chars.push(char)
  }

  return parseJsonObjectString(chars.join(''))
}

function parseJsonObjectString(raw: string): Record<string, unknown> | null {
  if (!raw || raw.length > MAX_METADATA_CHARS) return null
  try {
    const parsed = JSON.parse(raw)
    if (isPlainObject(parsed)) return copySafeObject(parsed)
  } catch {
    return null
  }
  return null
}

export function normalizePaymentMetadata(raw: unknown): PaymentMetadata {
  if (raw == null) return {}
  if (typeof raw === 'string') {
    return parseJsonObjectString(raw) || {}
  }
  if (Array.isArray(raw) || !isPlainObject(raw)) return {}

  const reconstructed = reconstructCharKeyJson(raw)
  if (reconstructed) return reconstructed

  return copySafeObject(raw)
}

export function mergePaymentMetadata(
  existing: unknown,
  patch: Record<string, unknown>
): PaymentMetadata {
  return {
    ...normalizePaymentMetadata(existing),
    ...copySafeObject(patch),
  }
}

const TOPUP_DESCRIPTION_RE = /^Guthaben aufladen(?:\s|$|–|-)/

export type TopupInspection = {
  isTopup: boolean
  amountRappen: number | null
  source: 'metadata' | 'legacy_string' | 'char_key' | 'description' | 'none'
  reason: string
}

export type TopupPaymentLike = {
  payment_method?: string | null
  description?: string | null
  metadata?: unknown
  total_amount_rappen?: number | null
  lesson_price_rappen?: number | null
  products_price_rappen?: number | null
  appointment_id?: string | null
  invoice_id?: string | null
  course_registration_id?: string | null
}

function hasNonTopupContext(payment: TopupPaymentLike, meta: PaymentMetadata): boolean {
  return Boolean(
    payment.appointment_id
    || payment.invoice_id
    || payment.course_registration_id
    || meta.course_id
    || meta.appointment_id
    || (Number(payment.products_price_rappen) || 0) > 0
    || Array.isArray(meta.products)
  )
}

function resolveTopupAmountRappen(meta: PaymentMetadata, totalAmount: unknown): number | null {
  const metaAmount = Number(meta.topup_amount_rappen)
  const total = Number(totalAmount)
  const metaOk = Number.isInteger(metaAmount) && metaAmount > 0
  const totalOk = Number.isInteger(total) && total > 0

  if (metaOk && totalOk && metaAmount !== total) return null
  if (metaOk) return metaAmount
  if (totalOk) return total
  return null
}

function descriptionLooksLikeTopup(payment: TopupPaymentLike): boolean {
  if (!TOPUP_DESCRIPTION_RE.test(String(payment.description || ''))) return false
  const total = Number(payment.total_amount_rappen)
  const lesson = Number(payment.lesson_price_rappen)
  // create-topup-session stores the same amount in both columns. Shop payments set lesson_price=0.
  return Number.isInteger(total) && total > 0 && lesson === total
}

/**
 * Conservative top-up detection for captured Wallee payments.
 * Never classifies by amount or lesson_price_rappen alone.
 * Never credits payment_method=credit (duplicate-submit / wallet-spend payments).
 */
export function inspectWalleeTopupPayment(payment: TopupPaymentLike): TopupInspection {
  if (payment.payment_method === 'credit') {
    return { isTopup: false, amountRappen: null, source: 'none', reason: 'payment_method_credit' }
  }
  if (payment.payment_method !== 'wallee') {
    return { isTopup: false, amountRappen: null, source: 'none', reason: 'not_wallee' }
  }

  const raw = payment.metadata
  const meta = normalizePaymentMetadata(raw)
  if (hasNonTopupContext(payment, meta)) {
    return { isTopup: false, amountRappen: null, source: 'none', reason: 'not_topup' }
  }

  const flaggedByMetadata = meta.is_topup === true

  let source: TopupInspection['source'] = 'none'
  if (flaggedByMetadata) {
    if (typeof raw === 'string') source = 'legacy_string'
    else if (reconstructCharKeyJson(raw)) source = 'char_key'
    else source = 'metadata'
  } else if (descriptionLooksLikeTopup(payment)) {
    source = 'description'
  }

  if (source === 'none') {
    return { isTopup: false, amountRappen: null, source: 'none', reason: 'not_topup' }
  }

  const amountRappen = resolveTopupAmountRappen(meta, payment.total_amount_rappen)
  if (amountRappen == null) {
    return { isTopup: true, amountRappen: null, source, reason: 'invalid_amount' }
  }

  return { isTopup: true, amountRappen, source, reason: 'ok' }
}

export function toCharKeyMetadata(json: Record<string, unknown>): Record<string, string> {
  const encoded = JSON.stringify(json)
  const out: Record<string, string> = {}
  for (let i = 0; i < encoded.length; i++) out[String(i)] = encoded[i]
  return out
}
