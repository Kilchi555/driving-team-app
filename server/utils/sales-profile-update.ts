import { SALES_STATUSES, type SalesStatus } from './sales-intelligence'

const TEXT_LIMITS = {
  current_software: 500,
  pain_points: 2000,
  interested_features: 2000,
  objections: 2000,
  notes: 4000,
  lost_reason: 500,
} as const

type TextKey = keyof typeof TEXT_LIMITS

export interface StoredSalesProfile {
  sales_status?: string | null
  assigned_to?: string | null
  next_follow_up_at?: string | null
  notes?: string | null
  objections?: string | null
  current_software?: string | null
  pain_points?: string | null
  interested_features?: string | null
  lost_reason?: string | null
  demo_booked_at?: string | null
  demo_completed_at?: string | null
  proposal_sent_at?: string | null
  won_at?: string | null
  lost_at?: string | null
}

export type ProfileWrite =
  | { ok: true; fields: Record<string, string | null>; salesStatus: string }
  | { ok: false; message: string }

function asRecord(body: unknown): Record<string, unknown> {
  return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {}
}

function hasOwn(body: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key)
}

export function resolveStoredFollowUp(
  body: unknown,
  existing: string | null,
): { value: string | null; logged: string | null } | { error: 'invalid_date' } {
  const record = asRecord(body)
  if (!hasOwn(record, 'next_follow_up_at')) return { value: existing, logged: null }
  const raw = record.next_follow_up_at
  if (raw == null || raw === '') return { value: existing, logged: null }
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(raw)) return { error: 'invalid_date' }
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return { error: 'invalid_date' }
  const value = date.toISOString()
  return { value, logged: value }
}

function textValue(value: unknown, max: number): { ok: true; value: string | null } | { ok: false; message: string } {
  if (value == null) return { ok: true, value: null }
  if (typeof value !== 'string') return { ok: false, message: 'Text erwartet' }
  const cleaned = value.trim()
  if (!cleaned) return { ok: true, value: null }
  if (cleaned.length > max) return { ok: false, message: 'Text ist zu lang' }
  return { ok: true, value: cleaned }
}

function oneStatus(value: unknown): { ok: true; value: SalesStatus } | { ok: false; message: string } {
  if (typeof value !== 'string' || !SALES_STATUSES.includes(value as SalesStatus)) {
    return { ok: false, message: 'Ungültiges Feld: sales_status' }
  }
  return { ok: true, value: value as SalesStatus }
}

function oneUuid(value: unknown): { ok: true; value: string } | { ok: false; message: string } {
  if (typeof value !== 'string' || !/^[0-9a-f-]{36}$/i.test(value)) {
    return { ok: false, message: 'Ungültige Zuordnung' }
  }
  return { ok: true, value }
}

export function buildProfileWrite(input: {
  body: unknown
  existing: StoredSalesProfile | null
  now: string
  fallbackAssignee: string | null
}): ProfileWrite {
  const body = asRecord(input.body)
  const fields: Record<string, string | null> = {}
  const existing = input.existing

  let salesStatus = existing?.sales_status || 'review_required'
  if (hasOwn(body, 'sales_status')) {
    const parsed = oneStatus(body.sales_status)
    if (!parsed.ok) return parsed
    salesStatus = parsed.value
    fields.sales_status = parsed.value
  } else if (!existing) {
    fields.sales_status = salesStatus
  }

  if (hasOwn(body, 'assigned_to')) {
    const parsed = oneUuid(body.assigned_to)
    if (!parsed.ok) return parsed
    fields.assigned_to = parsed.value
  } else if (!existing && input.fallbackAssignee) {
    fields.assigned_to = input.fallbackAssignee
  }

  for (const key of Object.keys(TEXT_LIMITS) as TextKey[]) {
    if (!hasOwn(body, key)) continue
    const parsed = textValue(body[key], TEXT_LIMITS[key])
    if (!parsed.ok) return parsed
    fields[key] = parsed.value
  }

  if (hasOwn(body, 'sales_status') || !existing) {
    const stamp = (column: keyof StoredSalesProfile, when: boolean) => {
      if (!when) return
      if (existing?.[column]) return
      fields[column] = input.now
    }
    stamp('demo_booked_at', salesStatus === 'demo_booked')
    stamp('demo_completed_at', salesStatus === 'demo_completed')
    stamp('proposal_sent_at', salesStatus === 'proposal')
    stamp('won_at', salesStatus === 'won')
    stamp('lost_at', salesStatus === 'lost')
  }

  return { ok: true, fields, salesStatus }
}
