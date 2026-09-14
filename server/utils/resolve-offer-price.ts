/**
 * Authoritative offer price resolver.
 *
 * One offer identity (event type + optional category) → one server-side price.
 * Fail closed on a missing paid price. Never silently return 0 for an unpriced
 * paid offer. require_payment=false is the existing free / no-in-app-payment marker.
 *
 * Precedence:
 *  1. Active event_price for (tenant, event_type_code)
 *  2. Else if require_payment and categoryCode: existing category rule
 *     (base_price / theory / consultation / exam via ruleTypeHint)
 *  3. Else if require_payment === false: free (do NOT inherit category price)
 *  4. Else unpriced
 */

import { createError } from 'h3'
import { logger } from '~/utils/logger'
import { roundToNearest5Rappen } from '~/utils/rounding'

export type OfferPriceRuleTypeHint =
  | 'base_price'
  | 'theory'
  | 'consultation'
  | 'exam'
  | 'event_price'

export type ResolveOfferPriceInput = {
  tenantId: string
  eventTypeCode: string
  categoryCode?: string | null
  durationMinutes: number
  startTime?: string | Date
  ruleTypeHint?: OfferPriceRuleTypeHint
}

export type OfferPriceRuleRef = {
  id: string
  rule_type: string
}

export type OfferPrice =
  | {
      kind: 'paid'
      priceRappen: number
      rule: OfferPriceRuleRef
    }
  | {
      kind: 'free'
      priceRappen: 0
      reason: 'require_payment_false'
    }
  | {
      kind: 'unpriced'
      error: 'NO_PRICE_RULE'
    }

export type OfferPriceClient = {
  from: (table: string) => any
}

export type PricingRuleRow = {
  id?: string | null
  rule_type?: string | null
  price_per_minute_rappen?: number | string | null
  duration_multiplier?: string | number | null
  weekend_multiplier?: string | number | null
  evening_multiplier?: string | number | null
  valid_from?: string | null
  created_at?: string | null
  is_active?: boolean | null
  tenant_id?: string | null
  event_type_code?: string | null
  category_code?: string | null
}

const CATEGORY_RULE_TYPES = new Set(['base_price', 'theory', 'consultation', 'exam'])

export function parsePricePerMinuteRappen(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

export function computeLessonRappenFromRule(opts: {
  pricePerMinuteRappen: number
  durationMinutes: number
  startTime?: string | Date | null
  durationMultiplier?: string | number | null
  weekendMultiplier?: string | number | null
  eveningMultiplier?: string | number | null
}): number {
  let price = opts.pricePerMinuteRappen * opts.durationMinutes

  const durationMul = opts.durationMultiplier
  if (durationMul != null && String(durationMul) !== '1.00') {
    const mul = parseFloat(String(durationMul))
    if (Number.isFinite(mul)) {
      price = Math.round(price * mul)
    }
  }

  if (opts.startTime) {
    const start = opts.startTime instanceof Date ? opts.startTime : new Date(opts.startTime)
    if (!Number.isNaN(start.getTime())) {
      const dayOfWeek = start.getDay()
      if (
        (dayOfWeek === 0 || dayOfWeek === 6) &&
        opts.weekendMultiplier != null &&
        String(opts.weekendMultiplier) !== '1.00'
      ) {
        const mul = parseFloat(String(opts.weekendMultiplier))
        if (Number.isFinite(mul)) price = Math.round(price * mul)
      }

      const hour = start.getHours()
      if (
        hour >= 18 &&
        opts.eveningMultiplier != null &&
        String(opts.eveningMultiplier) !== '1.00'
      ) {
        const mul = parseFloat(String(opts.eveningMultiplier))
        if (Number.isFinite(mul)) price = Math.round(price * mul)
      }
    }
  }

  return roundToNearest5Rappen(Math.round(price))
}

export function comparePricingRulesNewestFirst(a: PricingRuleRow, b: PricingRuleRow): number {
  const aFrom = a.valid_from || ''
  const bFrom = b.valid_from || ''
  if (aFrom !== bFrom) return aFrom < bFrom ? 1 : -1
  const aCreated = a.created_at || ''
  const bCreated = b.created_at || ''
  if (aCreated !== bCreated) return aCreated < bCreated ? 1 : -1
  return 0
}

export function selectDeterministicNewestRule(
  rules: PricingRuleRow[],
  logContext: Record<string, unknown>
): PricingRuleRow | null {
  const valid = rules.filter((r) => r && parsePricePerMinuteRappen(r.price_per_minute_rappen) != null)
  if (valid.length === 0) return null
  const sorted = [...valid].sort(comparePricingRulesNewestFirst)
  if (sorted.length > 1) {
    logger.warn('Multiple active pricing rules matched; using newest (valid_from DESC, created_at DESC)', {
      ...logContext,
      matchCount: sorted.length,
      chosenId: sorted[0]?.id ?? null,
      ruleIds: sorted.map((r) => r.id).filter(Boolean),
    })
  }
  return sorted[0] || null
}

function paidFromRule(
  rule: PricingRuleRow,
  durationMinutes: number,
  startTime?: string | Date
): OfferPrice | null {
  const ppm = parsePricePerMinuteRappen(rule.price_per_minute_rappen)
  if (ppm == null) return null
  return {
    kind: 'paid',
    priceRappen: computeLessonRappenFromRule({
      pricePerMinuteRappen: ppm,
      durationMinutes,
      startTime,
      durationMultiplier: rule.duration_multiplier,
      weekendMultiplier: rule.weekend_multiplier,
      eveningMultiplier: rule.evening_multiplier,
    }),
    rule: {
      id: String(rule.id || ''),
      rule_type: String(rule.rule_type || ''),
    },
  }
}

async function loadTenantEventType(
  supabase: OfferPriceClient,
  tenantId: string,
  eventTypeCode: string
): Promise<{ code: string; require_payment: boolean } | null> {
  const code = String(eventTypeCode || '').trim()
  if (!code) return null

  const { data, error } = await supabase
    .from('event_types')
    .select('code, require_payment, is_active')
    .eq('tenant_id', tenantId)
    .eq('code', code)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) return null
  return {
    code: data.code,
    require_payment: data.require_payment !== false,
  }
}

async function loadMatchingRules(
  supabase: OfferPriceClient,
  filters: {
    tenantId: string
    ruleType: string
    eventTypeCode?: string | null
    categoryCode?: string | null
    nowIso: string
  }
): Promise<PricingRuleRow[]> {
  let query = supabase
    .from('pricing_rules')
    .select(
      'id, rule_type, price_per_minute_rappen, duration_multiplier, weekend_multiplier, evening_multiplier, valid_from, created_at, is_active'
    )
    .eq('tenant_id', filters.tenantId)
    .eq('rule_type', filters.ruleType)
    .eq('is_active', true)
    .lte('valid_from', filters.nowIso)
    .or(`valid_until.is.null,valid_until.gte.${filters.nowIso}`)

  if (filters.eventTypeCode) {
    query = query.eq('event_type_code', filters.eventTypeCode)
  }
  if (filters.categoryCode) {
    query = query.eq('category_code', filters.categoryCode)
  }

  query = query.order('valid_from', { ascending: false }).order('created_at', { ascending: false })

  const { data, error } = await query
  if (error) {
    logger.warn('Offer price rule lookup failed', {
      tenantId: filters.tenantId,
      ruleType: filters.ruleType,
      eventTypeCode: filters.eventTypeCode,
      categoryCode: filters.categoryCode,
      error: error.message || error,
    })
    return []
  }
  return Array.isArray(data) ? data : data ? [data] : []
}

export async function resolveOfferPrice(
  supabase: OfferPriceClient,
  input: ResolveOfferPriceInput
): Promise<OfferPrice> {
  const tenantId = String(input.tenantId || '').trim()
  const eventTypeCode = String(input.eventTypeCode || '').trim()
  const categoryCode = String(input.categoryCode || '').trim() || null
  const durationMinutes = Number(input.durationMinutes)
  const hint = input.ruleTypeHint && CATEGORY_RULE_TYPES.has(input.ruleTypeHint)
    ? input.ruleTypeHint
    : 'base_price'

  if (!tenantId || !Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return { kind: 'unpriced', error: 'NO_PRICE_RULE' }
  }

  const nowIso = new Date().toISOString()
  const eventType = await loadTenantEventType(supabase, tenantId, eventTypeCode)

  // 1. Active event_price wins over category pricing.
  if (eventTypeCode) {
    const eventRules = await loadMatchingRules(supabase, {
      tenantId,
      ruleType: 'event_price',
      eventTypeCode,
      nowIso,
    })
    const eventRule = selectDeterministicNewestRule(eventRules, {
      tenantId,
      eventTypeCode,
      categoryCode,
      ruleType: 'event_price',
    })
    const paid = eventRule ? paidFromRule(eventRule, durationMinutes, input.startTime) : null
    if (paid) return paid
  }

  const requirePayment = eventType ? eventType.require_payment : true

  // 2. Category price only when the offer is paid (or event type is unknown — legacy FS).
  if (requirePayment && categoryCode) {
    const categoryRules = await loadMatchingRules(supabase, {
      tenantId,
      ruleType: hint,
      categoryCode,
      nowIso,
    })
    const categoryRule = selectDeterministicNewestRule(categoryRules, {
      tenantId,
      eventTypeCode,
      categoryCode,
      ruleType: hint,
    })
    const paid = categoryRule ? paidFromRule(categoryRule, durationMinutes, input.startTime) : null
    if (paid) return paid
  }

  // 3. Explicit free — do not inherit a category price.
  if (eventType && eventType.require_payment === false) {
    return { kind: 'free', priceRappen: 0, reason: 'require_payment_false' }
  }

  return { kind: 'unpriced', error: 'NO_PRICE_RULE' }
}

export function offerPriceToHttpError(offer: OfferPrice): {
  statusCode: number
  statusMessage: string
  data: { code: 'NO_PRICE_RULE' }
} | null {
  if (offer.kind !== 'unpriced') return null
  return {
    statusCode: 503,
    statusMessage:
      'Der Preis für diese Buchung konnte nicht ermittelt werden. Bitte versuche es erneut oder kontaktiere uns direkt.',
    data: { code: 'NO_PRICE_RULE' },
  }
}

export function throwIfUnpriced(
  offer: OfferPrice
): asserts offer is Extract<OfferPrice, { kind: 'paid' | 'free' }> {
  const err = offerPriceToHttpError(offer)
  if (err) throw createError(err)
}

/**
 * Preview JSON for a priced offer. Missing paid rules must never become success + 0.
 */
export function previewPayloadFromOfferPrice(
  offer: Extract<OfferPrice, { kind: 'paid' | 'free' }>
): {
  success: true
  kind: 'paid' | 'free'
  price_rappen: number
} {
  return {
    success: true,
    kind: offer.kind,
    price_rappen: offer.priceRappen,
  }
}
