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
  plan: string
}

export function getBillingPeriodStart(from: Date = new Date()): Date {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1, 0, 0, 0, 0))
}

export async function getTenantSmsUsage(
  supabase: SupabaseClient,
  tenantId: string,
  periodStart: Date = getBillingPeriodStart(),
): Promise<number> {
  const { data, error } = await supabase
    .from('sms_logs')
    .select('segment_count')
    .eq('tenant_id', tenantId)
    .eq('billable', true)
    .gte('sent_at', periodStart.toISOString())

  if (error) throw error
  return (data || []).reduce((sum: number, row: any) => sum + (Number(row.segment_count) || 1), 0)
}

export async function getTenantSmsQuotaSnapshot(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<SmsQuotaSnapshot> {
  const { data: tenant } = await supabase
    .from('tenants')
    .select('subscription_plan, booking_policy')
    .eq('id', tenantId)
    .single()

  const plan = tenant?.subscription_plan || 'trial'
  const policy = (tenant?.booking_policy as Record<string, any>) || {}
  const overageWaived = policy.sms_overage_waived === true
  const included = getIncludedSmsSegments(plan)
  const periodStart = getBillingPeriodStart()
  const used = await getTenantSmsUsage(supabase, tenantId, periodStart)
  const overage = Math.max(0, used - included)
  return {
    used,
    included,
    remaining: Math.max(0, included - used),
    overage,
    overageCostChf: overageWaived ? 0 : estimateSmsCostChf(overage),
    periodStart: periodStart.toISOString(),
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
