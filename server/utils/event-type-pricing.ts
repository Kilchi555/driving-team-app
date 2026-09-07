/**
 * Event-type prices live in pricing_rules (rule_type='event_price').
 * EventTypesManager / registration keep that row in sync so calendar,
 * booking and invoices all read the same source.
 *
 * Driving-school catalog types (lesson/exam/theory/consultation) stay
 * priced per license category — never write an event_price row for those
 * or it would steal priority from Kategorie B/A/…
 */

export const DRIVING_SCHOOL_CATEGORY_PRICED_CODES = new Set([
  'lesson',
  'exam',
  'theory',
  'consultation',
])

/** Verticals priced per Leistung, not per license category. */
export const PER_EVENT_TYPE_BUSINESS_TYPES = new Set([
  'consulting',
  'mental_coach',
  'dog_training',
  'fitness',
  'massage',
  'tutoring',
  'music_school',
  'generic',
])

/**
 * True when unused catalog event types should be deactivated after signup.
 * Driving-school custom extras (is_custom + event_price) must NOT flip this
 * on — those rows have no event_type_code for lesson/exam/theory, so the
 * old check would deactivate the Fahrschul-Katalog.
 */
export function isPerEventTypeSignup(
  pricingItems: Array<{ rule_type?: string; is_custom?: boolean }>,
  businessType: string | null | undefined
): boolean {
  if (businessType === 'driving_school') return false
  if (businessType && PER_EVENT_TYPE_BUSINESS_TYPES.has(businessType)) return true
  return pricingItems.some(
    (p) => p.rule_type === 'event_price' || p.rule_type === 'free_event' || p.is_custom
  )
}

/**
 * Public booking writes appointments.event_type_code under a tenant FK.
 * Category-priced tenants book license classes (B, A1, …) → catalog 'lesson'.
 * Per-event-type tenants book the offer code itself (discovery, consulting).
 * Never infer the code from "has an event_price row" — free offers have none,
 * and inventing 'lesson' then violates appointments_event_type_tenant_code_fkey.
 */
export function resolveOnlineBookingEventTypeCode(input: {
  eventTypeRow?: { code?: string | null } | null
}): string {
  const matched = String(input.eventTypeRow?.code || '').trim()
  return matched || 'lesson'
}

export function shouldWriteEventPriceRule(
  businessType: string | null | undefined,
  eventTypeCode: string | null | undefined
): boolean {
  const code = String(eventTypeCode || '').trim()
  if (!code) return false
  if (businessType === 'driving_school' && DRIVING_SCHOOL_CATEGORY_PRICED_CODES.has(code)) {
    return false
  }
  return true
}

export function parsePriceChf(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

export function priceChfToRappen(priceChf: unknown): number {
  return Math.round(parsePriceChf(priceChf) * 100)
}

/** Build pricing_rules inserts from registration pricing_json (no I/O). */
export function buildRegistrationPricingRows(
  pricingItems: any[],
  tenantId: string,
  now: string
) {
  const pricingRows = pricingItems
    .filter((p: any) => {
      if (!p.rule_type || p.rule_type === 'free_event' || p.rule_type === 'admin_fee') return false
      if (!(Number(p.duration_minutes) > 0)) return false
      if (p.rule_type === 'event_price') return !!p.event_type_code
      const price = Number(p.price_chf)
      return Number.isFinite(price) && price >= 0
    })
    .map((p: any) => {
      if (p.rule_type === 'event_price') {
        return eventPriceRuleRow({
          tenantId,
          eventTypeCode: p.event_type_code,
          ruleName: p.label,
          priceChf: p.price_chf,
          durationMinutes: p.duration_minutes,
          now,
        })
      }
      return {
        tenant_id: tenantId,
        rule_type: p.rule_type,
        rule_name: p.label,
        category_code: p.category_code || p.rule_type.toUpperCase(),
        event_type_code: p.event_type_code || null,
        price_per_minute_rappen: (parsePriceChf(p.price_chf) * 100) / p.duration_minutes,
        base_duration_minutes: p.duration_minutes,
        admin_fee_rappen: 0,
        admin_fee_applies_from: 999,
        is_active: true,
        valid_from: now,
        valid_until: null as string | null,
        created_at: now,
        updated_at: now,
      }
    })

  const adminFeeRows = pricingItems
    .filter((p: any) =>
      p.rule_type === 'admin_fee' &&
      p.category_code &&
      Number(p.admin_fee_chf) > 0
    )
    .map((p: any) => ({
      tenant_id: tenantId,
      rule_type: 'admin_fee',
      rule_name: p.label || `Kategorie ${p.category_code} - Versicherung`,
      category_code: p.category_code,
      event_type_code: null as string | null,
      price_per_minute_rappen: 0,
      base_duration_minutes: Number(p.duration_minutes) > 0 ? Number(p.duration_minutes) : 45,
      admin_fee_rappen: Math.round(Number(p.admin_fee_chf) * 100),
      admin_fee_applies_from: Number(p.admin_fee_applies_from) > 0
        ? Number(p.admin_fee_applies_from)
        : 2,
      is_active: true,
      valid_from: now,
      valid_until: null as string | null,
      created_at: now,
      updated_at: now,
    }))

  return [...pricingRows, ...adminFeeRows]
}

export function eventPriceRuleRow(input: {
  tenantId: string
  eventTypeCode: string
  ruleName: string
  priceChf: unknown
  durationMinutes: unknown
  now?: string
}) {
  const duration = Number(input.durationMinutes) > 0 ? Number(input.durationMinutes) : 60
  const priceChf = parsePriceChf(input.priceChf)
  const now = input.now || new Date().toISOString()
  return {
    tenant_id: input.tenantId,
    rule_type: 'event_price' as const,
    rule_name: input.ruleName,
    category_code: null as string | null,
    event_type_code: input.eventTypeCode,
    price_per_minute_rappen: (priceChf * 100) / duration,
    base_duration_minutes: duration,
    admin_fee_rappen: 0,
    admin_fee_applies_from: 999,
    is_active: true,
    valid_from: now,
    valid_until: null as string | null,
    created_at: now,
    updated_at: now,
  }
}

type PricingClient = {
  from: (table: string) => any
}

export async function upsertEventPriceRule(
  supabase: PricingClient,
  input: {
    tenantId: string
    businessType?: string | null
    eventTypeCode: string
    ruleName: string
    priceChf: unknown
    durationMinutes: unknown
    requirePayment: boolean
  }
): Promise<{ action: 'skipped' | 'removed' | 'upserted'; error?: string }> {
  if (!shouldWriteEventPriceRule(input.businessType, input.eventTypeCode)) {
    return { action: 'skipped' }
  }

  const { error: deleteError } = await supabase
    .from('pricing_rules')
    .delete()
    .eq('tenant_id', input.tenantId)
    .eq('rule_type', 'event_price')
    .eq('event_type_code', input.eventTypeCode)

  if (deleteError) return { action: 'removed', error: deleteError.message }

  if (!input.requirePayment) {
    return { action: 'removed' }
  }

  const { error: insertError } = await supabase
    .from('pricing_rules')
    .insert(eventPriceRuleRow({
      tenantId: input.tenantId,
      eventTypeCode: input.eventTypeCode,
      ruleName: input.ruleName,
      priceChf: input.priceChf,
      durationMinutes: input.durationMinutes,
    }))

  if (insertError) return { action: 'upserted', error: insertError.message }
  return { action: 'upserted' }
}

export async function removeEventPriceRule(
  supabase: PricingClient,
  tenantId: string,
  eventTypeCode: string
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('pricing_rules')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('rule_type', 'event_price')
    .eq('event_type_code', eventTypeCode)
  return error ? { error: error.message } : {}
}
