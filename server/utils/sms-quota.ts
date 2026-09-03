import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getIncludedSmsSegments,
  SMS_OVERAGE_CHF_PER_SEGMENT,
} from '~/utils/planFeatures'

/** GSM 03.38 basic charset (Twilio / 3GPP). Extended set still uses GSM-7 encoding. */
const GSM7_BASIC = new Set(
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ ÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà"
)
const GSM7_EXTENDED = new Set(['^', '{', '}', '\\', '[', '~', ']', '|', '€'])

export function isGsm7Message(message: string): boolean {
  for (const ch of message) {
    if (!GSM7_BASIC.has(ch) && !GSM7_EXTENDED.has(ch)) return false
  }
  return true
}

/**
 * Count SMS segments the way carriers/Twilio bill:
 * GSM-7: 160 single / 153 concatenated
 * UCS-2: 70 single / 67 concatenated
 */
export function countSmsSegments(message: string): number {
  const text = message || ''
  const gsm = isGsm7Message(text)
  const len = text.length
  if (gsm) {
    if (len === 0) return 0
    if (len <= 160) return 1
    return Math.ceil(len / 153)
  }
  if (len === 0) return 0
  if (len <= 70) return 1
  return Math.ceil(len / 67)
}

export function estimateSmsCostChf(segments: number): number {
  return Math.round(segments * SMS_OVERAGE_CHF_PER_SEGMENT * 100) / 100
}

export interface SmsQuotaSnapshot {
  used: number
  included: number
  remaining: number
  overage: number
  overageCostChf: number
  periodStart: string
  periodEnd: string
  plan: string
}

/** Active SMS quota window — aligned with Stripe when period fields exist. */
export interface SmsBillingPeriod {
  /** Inclusive start of the usage window */
  start: Date
  /** Exclusive end / next reset instant */
  resetAt: Date
  /** Stable key for once-per-period alerts */
  periodKey: string
  /** Human range for emails (de-CH) */
  rangeLabel: string
  /** Human reset date for emails (de-CH) */
  resetLabel: string
  /** True when falling back to UTC calendar month */
  isCalendarFallback: boolean
}

export type SmsQuotaAlertState = {
  period?: string
  warned80?: boolean
  warned100?: boolean
}

function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isFinite(d.getTime()) ? d : null
}

function formatDeChDate(d: Date): string {
  return d.toLocaleDateString('de-CH', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function buildPeriodLabels(start: Date, resetAt: Date): Pick<SmsBillingPeriod, 'periodKey' | 'rangeLabel' | 'resetLabel'> {
  return {
    periodKey: `${start.toISOString()}|${resetAt.toISOString()}`,
    rangeLabel: `${formatDeChDate(start)} – ${formatDeChDate(new Date(resetAt.getTime() - 1))}`,
    resetLabel: formatDeChDate(resetAt),
  }
}

export function getBillingPeriodStart(from: Date = new Date()): Date {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1, 0, 0, 0, 0))
}

export function getBillingPeriodEnd(from: Date = new Date()): Date {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1, 0, 0, 0, 0))
}

/**
 * Calendar-month fallback (UTC). Used when Stripe period fields are missing/stale.
 */
export function resolveCalendarSmsBillingPeriod(from: Date = new Date()): SmsBillingPeriod {
  const start = getBillingPeriodStart(from)
  const resetAt = getBillingPeriodEnd(from)
  return {
    start,
    resetAt,
    ...buildPeriodLabels(start, resetAt),
    isCalendarFallback: true,
  }
}

/**
 * Resolve the SMS quota window.
 * Prefer tenant Stripe `current_period_*`; fall back to UTC calendar month when
 * fields are missing, invalid, inverted, or already expired (stale end).
 */
export function resolveSmsBillingPeriod(opts: {
  currentPeriodStart?: string | Date | null
  currentPeriodEnd?: string | Date | null
  now?: Date
}): SmsBillingPeriod {
  const now = opts.now ?? new Date()
  let start = parseDate(opts.currentPeriodStart)
  let resetAt = parseDate(opts.currentPeriodEnd)

  // Production often has period end from Stripe but null start — derive ~1 month back.
  if (!start && resetAt) {
    start = new Date(resetAt.getTime())
    start.setUTCMonth(start.getUTCMonth() - 1)
  }
  // Start without end — one calendar month forward from start.
  if (start && !resetAt) {
    resetAt = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate(), start.getUTCHours(), start.getUTCMinutes(), start.getUTCSeconds(), start.getUTCMilliseconds()))
  }

  if (!start || !resetAt) {
    return resolveCalendarSmsBillingPeriod(now)
  }
  if (resetAt.getTime() <= start.getTime()) {
    return resolveCalendarSmsBillingPeriod(now)
  }
  // Stale Stripe end: period already over → don't undercount current month usage.
  if (resetAt.getTime() <= now.getTime()) {
    return resolveCalendarSmsBillingPeriod(now)
  }

  return {
    start,
    resetAt,
    ...buildPeriodLabels(start, resetAt),
    isCalendarFallback: false,
  }
}

export function parseSmsQuotaAlertState(raw: unknown): SmsQuotaAlertState {
  if (!raw) return {}
  let value: unknown = raw
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw)
    } catch {
      return {}
    }
  }
  if (!value || typeof value !== 'object') return {}
  const obj = value as Record<string, unknown>
  return {
    period: typeof obj.period === 'string' ? obj.period : undefined,
    warned80: obj.warned80 === true,
    warned100: obj.warned100 === true,
  }
}

export function smsQuotaAlertPeriodsMatch(
  storedPeriod: string | null | undefined,
  currentPeriodKey: string,
): boolean {
  return !!storedPeriod && storedPeriod === currentPeriodKey
}

/**
 * Sum billable SMS segments in [periodStart, periodEnd).
 * periodEnd is exclusive when provided (matches Stripe current_period_end / next reset).
 */
export async function getTenantSmsUsage(
  supabase: SupabaseClient,
  tenantId: string,
  periodStart: Date = getBillingPeriodStart(),
  periodEnd?: Date | null,
): Promise<number> {
  let query = supabase
    .from('sms_logs')
    .select('segment_count')
    .eq('tenant_id', tenantId)
    .eq('billable', true)
    .gte('sent_at', periodStart.toISOString())

  if (periodEnd) {
    query = query.lt('sent_at', periodEnd.toISOString())
  }

  const { data, error } = await query

  if (error) throw error
  return (data || []).reduce((sum: number, row: { segment_count?: number | null }) => {
    return sum + (Number(row.segment_count) || 1)
  }, 0)
}

export function isSmsOverageWaived(policy: Record<string, any> | null | undefined, now: Date = new Date()): boolean {
  const p = policy || {}
  if (p.sms_overage_waived === true) return true
  const until = typeof p.sms_overage_waived_until === 'string' ? p.sms_overage_waived_until.trim() : ''
  if (!until) return false
  // Inclusive end of UTC day for YYYY-MM-DD
  const end = until.length <= 10
    ? new Date(`${until}T23:59:59.999Z`)
    : new Date(until)
  if (Number.isNaN(end.getTime())) return false
  return now.getTime() <= end.getTime()
}

export async function getTenantSmsQuotaSnapshot(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<SmsQuotaSnapshot> {
  const { data: tenant } = await supabase
    .from('tenants')
    .select('subscription_plan, booking_policy, current_period_start, current_period_end')
    .eq('id', tenantId)
    .single()

  const plan = tenant?.subscription_plan || 'trial'
  const policy = (tenant?.booking_policy as Record<string, any>) || {}
  const overageWaived = isSmsOverageWaived(policy)
  const included = getIncludedSmsSegments(plan)
  const period = resolveSmsBillingPeriod({
    currentPeriodStart: (tenant as { current_period_start?: string | null } | null)?.current_period_start,
    currentPeriodEnd: (tenant as { current_period_end?: string | null } | null)?.current_period_end,
  })
  const used = await getTenantSmsUsage(supabase, tenantId, period.start, period.resetAt)
  const overage = Math.max(0, used - included)
  return {
    used,
    included,
    remaining: Math.max(0, included - used),
    overage,
    overageCostChf: overageWaived ? 0 : estimateSmsCostChf(overage),
    periodStart: period.start.toISOString(),
    periodEnd: period.resetAt.toISOString(),
    plan,
  }
}

export class SmsQuotaExceededError extends Error {
  code = 'SMS_QUOTA_EXCEEDED'
  constructor(message = 'SMS-Kontingent aufgebraucht (Hard-Stop aktiv)') {
    super(message)
    this.name = 'SmsQuotaExceededError'
  }
}
