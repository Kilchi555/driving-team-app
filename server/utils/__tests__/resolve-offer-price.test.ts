import { describe, expect, it, vi, beforeEach } from 'vitest'
import { logger } from '~/utils/logger'
import {
  computeLessonRappenFromRule,
  offerPriceToHttpError,
  parsePricePerMinuteRappen,
  previewPayloadFromOfferPrice,
  resolveOfferPrice,
  selectDeterministicNewestRule,
  type OfferPrice,
  type PricingRuleRow,
} from '../resolve-offer-price'

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

type EventTypeRow = {
  tenant_id: string
  code: string
  require_payment: boolean
  is_active?: boolean
}

function createOfferPriceSupabase(opts: {
  eventTypes?: EventTypeRow[]
  rules?: PricingRuleRow[]
}) {
  const eventTypes = (opts.eventTypes || []).map((et) => ({ is_active: true, ...et })) as Record<string, unknown>[]
  const rules = (opts.rules || []).map((r) => ({
    is_active: true,
    valid_from: '2020-01-01T00:00:00.000Z',
    created_at: '2020-01-01T00:00:00.000Z',
    ...r,
  })) as Record<string, unknown>[]

  return {
    from(table: string) {
      let rows: Record<string, unknown>[] =
        table === 'event_types' ? [...eventTypes] : table === 'pricing_rules' ? [...rules] : []
      const orderKeys: Array<{ col: string; ascending: boolean }> = []
      const chain = {
        select: () => chain,
        eq(col: string, val: unknown) {
          rows = rows.filter((r) => r[col] === val)
          return chain
        },
        lte(col: string, val: string) {
          rows = rows.filter((r) => r[col] == null || String(r[col]) <= val)
          return chain
        },
        or() {
          return chain
        },
        order(col: string, opts: { ascending: boolean }) {
          orderKeys.push({ col, ascending: opts.ascending })
          rows = [...rows].sort((a, b) => {
            for (const k of orderKeys) {
              const av = String(a[k.col] ?? '')
              const bv = String(b[k.col] ?? '')
              if (av === bv) continue
              return k.ascending ? (av < bv ? -1 : 1) : (av < bv ? 1 : -1)
            }
            return 0
          })
          return chain
        },
        maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
        then(resolveFn: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
          return Promise.resolve({ data: rows, error: null }).then(resolveFn, reject)
        },
      }
      return chain
    },
  }
}

const TENANT = 'tenant-a'
const OTHER = 'tenant-b'

function paidRule(partial: PricingRuleRow): PricingRuleRow {
  return {
    id: 'rule-1',
    tenant_id: TENANT,
    rule_type: 'base_price',
    price_per_minute_rappen: 200,
    ...partial,
  }
}

describe('parsePricePerMinuteRappen', () => {
  it('rejects empty, null, undefined, NaN, zero, and negative — never paid CHF 0', () => {
    expect(parsePricePerMinuteRappen('')).toBeNull()
    expect(parsePricePerMinuteRappen(null)).toBeNull()
    expect(parsePricePerMinuteRappen(undefined)).toBeNull()
    expect(parsePricePerMinuteRappen(NaN)).toBeNull()
    expect(parsePricePerMinuteRappen(0)).toBeNull()
    expect(parsePricePerMinuteRappen(-10)).toBeNull()
    expect(parsePricePerMinuteRappen('abc')).toBeNull()
  })

  it('accepts a positive per-minute amount', () => {
    expect(parsePricePerMinuteRappen(211)).toBe(211)
    expect(parsePricePerMinuteRappen('211')).toBe(211)
  })
})

describe('resolveOfferPrice — offer matrix', () => {
  beforeEach(() => {
    vi.mocked(logger.warn).mockClear()
  })

  it('1. category + lesson + category price → category price', async () => {
    const supabase = createOfferPriceSupabase({
      eventTypes: [{ tenant_id: TENANT, code: 'lesson', require_payment: true }],
      rules: [paidRule({ id: 'b-price', rule_type: 'base_price', category_code: 'B', price_per_minute_rappen: 211 })],
    })
    const offer = await resolveOfferPrice(supabase, {
      tenantId: TENANT,
      eventTypeCode: 'lesson',
      categoryCode: 'B',
      durationMinutes: 45,
    })
    expect(offer).toMatchObject({ kind: 'paid', priceRappen: 9495, rule: { id: 'b-price', rule_type: 'base_price' } })
  })

  it('2. category + consulting + event price → event price', async () => {
    const supabase = createOfferPriceSupabase({
      eventTypes: [{ tenant_id: TENANT, code: 'consulting', require_payment: true }],
      rules: [
        paidRule({ id: 'b-price', rule_type: 'base_price', category_code: 'B', price_per_minute_rappen: 211 }),
        paidRule({
          id: 'consult-price',
          rule_type: 'event_price',
          event_type_code: 'consulting',
          price_per_minute_rappen: 400,
        }),
      ],
    })
    const offer = await resolveOfferPrice(supabase, {
      tenantId: TENANT,
      eventTypeCode: 'consulting',
      categoryCode: 'B',
      durationMinutes: 45,
    })
    expect(offer).toMatchObject({
      kind: 'paid',
      priceRappen: 18000,
      rule: { id: 'consult-price', rule_type: 'event_price' },
    })
  })

  it('3. category-less + event price → event price', async () => {
    const supabase = createOfferPriceSupabase({
      eventTypes: [{ tenant_id: TENANT, code: 'consulting', require_payment: true }],
      rules: [
        paidRule({
          id: 'consult-price',
          rule_type: 'event_price',
          event_type_code: 'consulting',
          price_per_minute_rappen: 300,
        }),
      ],
    })
    const offer = await resolveOfferPrice(supabase, {
      tenantId: TENANT,
      eventTypeCode: 'consulting',
      durationMinutes: 30,
    })
    expect(offer).toMatchObject({
      kind: 'paid',
      priceRappen: 9000,
      rule: { rule_type: 'event_price' },
    })
  })

  it('4. category-less + paid + no price → unpriced', async () => {
    const supabase = createOfferPriceSupabase({
      eventTypes: [{ tenant_id: TENANT, code: 'consulting', require_payment: true }],
      rules: [],
    })
    const offer = await resolveOfferPrice(supabase, {
      tenantId: TENANT,
      eventTypeCode: 'consulting',
      durationMinutes: 45,
    })
    expect(offer).toEqual({ kind: 'unpriced', error: 'NO_PRICE_RULE' })
  })

  it('5. explicit free → free / 0', async () => {
    const supabase = createOfferPriceSupabase({
      eventTypes: [{ tenant_id: TENANT, code: 'discovery', require_payment: false }],
      rules: [],
    })
    const offer = await resolveOfferPrice(supabase, {
      tenantId: TENANT,
      eventTypeCode: 'discovery',
      durationMinutes: 30,
    })
    expect(offer).toEqual({ kind: 'free', priceRappen: 0, reason: 'require_payment_false' })
  })

  it('6. consulting + B + event price → event price (not B)', async () => {
    const supabase = createOfferPriceSupabase({
      eventTypes: [{ tenant_id: TENANT, code: 'consulting', require_payment: true }],
      rules: [
        paidRule({ id: 'b', rule_type: 'base_price', category_code: 'B', price_per_minute_rappen: 211 }),
        paidRule({
          id: 'et',
          rule_type: 'event_price',
          event_type_code: 'consulting',
          price_per_minute_rappen: 150,
        }),
      ],
    })
    const offer = await resolveOfferPrice(supabase, {
      tenantId: TENANT,
      eventTypeCode: 'consulting',
      categoryCode: 'B',
      durationMinutes: 60,
    })
    expect(offer.kind).toBe('paid')
    if (offer.kind === 'paid') {
      expect(offer.rule.id).toBe('et')
      expect(offer.priceRappen).toBe(9000)
    }
  })

  it('7. consulting + B + no event price + paid → category fallback', async () => {
    const supabase = createOfferPriceSupabase({
      eventTypes: [{ tenant_id: TENANT, code: 'consulting', require_payment: true }],
      rules: [paidRule({ id: 'b', rule_type: 'base_price', category_code: 'B', price_per_minute_rappen: 211 })],
    })
    const offer = await resolveOfferPrice(supabase, {
      tenantId: TENANT,
      eventTypeCode: 'consulting',
      categoryCode: 'B',
      durationMinutes: 45,
    })
    expect(offer).toMatchObject({ kind: 'paid', rule: { id: 'b', rule_type: 'base_price' } })
  })

  it('8. consulting + B + require_payment=false → free, NOT B price', async () => {
    const supabase = createOfferPriceSupabase({
      eventTypes: [{ tenant_id: TENANT, code: 'consulting', require_payment: false }],
      rules: [paidRule({ id: 'b', rule_type: 'base_price', category_code: 'B', price_per_minute_rappen: 211 })],
    })
    const offer = await resolveOfferPrice(supabase, {
      tenantId: TENANT,
      eventTypeCode: 'consulting',
      categoryCode: 'B',
      durationMinutes: 45,
    })
    expect(offer).toEqual({ kind: 'free', priceRappen: 0, reason: 'require_payment_false' })
  })

  it('never resolves another tenant event type by code alone', async () => {
    const supabase = createOfferPriceSupabase({
      eventTypes: [
        { tenant_id: OTHER, code: 'lesson', require_payment: false },
        { tenant_id: TENANT, code: 'lesson', require_payment: true },
      ],
      rules: [
        paidRule({
          id: 'other-free-ish',
          tenant_id: OTHER,
          rule_type: 'event_price',
          event_type_code: 'lesson',
          price_per_minute_rappen: 50,
        }),
        paidRule({
          id: 'ours',
          tenant_id: TENANT,
          rule_type: 'event_price',
          event_type_code: 'lesson',
          price_per_minute_rappen: 200,
        }),
      ],
    })
    const offer = await resolveOfferPrice(supabase, {
      tenantId: TENANT,
      eventTypeCode: 'lesson',
      durationMinutes: 45,
    })
    expect(offer).toMatchObject({ kind: 'paid', rule: { id: 'ours' }, priceRappen: 9000 })
  })

  it('zero / invalid event_price ppm is not a paid CHF 0 — falls through', async () => {
    const supabase = createOfferPriceSupabase({
      eventTypes: [{ tenant_id: TENANT, code: 'consulting', require_payment: true }],
      rules: [
        paidRule({
          id: 'zero',
          rule_type: 'event_price',
          event_type_code: 'consulting',
          price_per_minute_rappen: 0,
        }),
      ],
    })
    const offer = await resolveOfferPrice(supabase, {
      tenantId: TENANT,
      eventTypeCode: 'consulting',
      durationMinutes: 45,
    })
    expect(offer).toEqual({ kind: 'unpriced', error: 'NO_PRICE_RULE' })
  })

  it('multiple matching rules pick newest valid_from then created_at and log', async () => {
    const supabase = createOfferPriceSupabase({
      eventTypes: [{ tenant_id: TENANT, code: 'lesson', require_payment: true }],
      rules: [
        paidRule({
          id: 'old',
          rule_type: 'event_price',
          event_type_code: 'lesson',
          price_per_minute_rappen: 100,
          valid_from: '2024-01-01T00:00:00.000Z',
          created_at: '2024-06-01T00:00:00.000Z',
        }),
        paidRule({
          id: 'newest',
          rule_type: 'event_price',
          event_type_code: 'lesson',
          price_per_minute_rappen: 250,
          valid_from: '2026-01-01T00:00:00.000Z',
          created_at: '2026-01-02T00:00:00.000Z',
        }),
        paidRule({
          id: 'same-from-older-created',
          rule_type: 'event_price',
          event_type_code: 'lesson',
          price_per_minute_rappen: 999,
          valid_from: '2026-01-01T00:00:00.000Z',
          created_at: '2026-01-01T00:00:00.000Z',
        }),
      ],
    })
    const offer = await resolveOfferPrice(supabase, {
      tenantId: TENANT,
      eventTypeCode: 'lesson',
      durationMinutes: 40,
    })
    expect(offer).toMatchObject({ kind: 'paid', rule: { id: 'newest' }, priceRappen: 10000 })
    expect(logger.warn).toHaveBeenCalled()
  })

  it('exam without exam rule uses same-tenant category base_price × duration', async () => {
    const supabase = createOfferPriceSupabase({
      eventTypes: [{ tenant_id: TENANT, code: 'exam', require_payment: true }],
      rules: [paidRule({
        id: 'c-lesson',
        rule_type: 'base_price',
        category_code: 'C',
        price_per_minute_rappen: 366.6667,
      })],
    })
    const offer = await resolveOfferPrice(supabase, {
      tenantId: TENANT,
      eventTypeCode: 'exam',
      categoryCode: 'C',
      durationMinutes: 130,
      ruleTypeHint: 'exam',
    })
    const expected = computeLessonRappenFromRule({
      pricePerMinuteRappen: 366.6667,
      durationMinutes: 130,
    })
    expect(expected).toBe(47665)
    expect(offer).toMatchObject({
      kind: 'paid',
      priceRappen: expected,
      rule: { id: 'c-lesson', rule_type: 'base_price' },
    })
  })

  it('explicit exam rule wins over category base_price', async () => {
    const supabase = createOfferPriceSupabase({
      eventTypes: [{ tenant_id: TENANT, code: 'exam', require_payment: true }],
      rules: [
        paidRule({
          id: 'c-exam',
          rule_type: 'exam',
          category_code: 'C',
          price_per_minute_rappen: 100,
        }),
        paidRule({
          id: 'c-lesson',
          rule_type: 'base_price',
          category_code: 'C',
          price_per_minute_rappen: 366.6667,
        }),
      ],
    })
    const offer = await resolveOfferPrice(supabase, {
      tenantId: TENANT,
      eventTypeCode: 'exam',
      categoryCode: 'C',
      durationMinutes: 130,
      ruleTypeHint: 'exam',
    })
    expect(offer).toMatchObject({
      kind: 'paid',
      priceRappen: 13000,
      rule: { id: 'c-exam', rule_type: 'exam' },
    })
  })

  it('exam with neither exam nor base_price rule is unpriced', async () => {
    const supabase = createOfferPriceSupabase({
      eventTypes: [{ tenant_id: TENANT, code: 'exam', require_payment: true }],
      rules: [],
    })
    const offer = await resolveOfferPrice(supabase, {
      tenantId: TENANT,
      eventTypeCode: 'exam',
      categoryCode: 'C',
      durationMinutes: 130,
      ruleTypeHint: 'exam',
    })
    expect(offer).toEqual({ kind: 'unpriced', error: 'NO_PRICE_RULE' })
  })

  it('exam fallback never uses another tenant base_price', async () => {
    const supabase = createOfferPriceSupabase({
      eventTypes: [{ tenant_id: TENANT, code: 'exam', require_payment: true }],
      rules: [paidRule({
        id: 'other-c',
        tenant_id: OTHER,
        rule_type: 'base_price',
        category_code: 'C',
        price_per_minute_rappen: 366.6667,
      })],
    })
    const offer = await resolveOfferPrice(supabase, {
      tenantId: TENANT,
      eventTypeCode: 'exam',
      categoryCode: 'C',
      durationMinutes: 130,
      ruleTypeHint: 'exam',
    })
    expect(offer).toEqual({ kind: 'unpriced', error: 'NO_PRICE_RULE' })
  })
})

describe('HTTP consistency helpers (preview / guest / authenticated)', () => {
  it('9-10. same paid offer is the same number for every path', () => {
    const price = computeLessonRappenFromRule({
      pricePerMinuteRappen: 211,
      durationMinutes: 45,
    })
    const offer: OfferPrice = {
      kind: 'paid',
      priceRappen: price,
      rule: { id: 'r', rule_type: 'base_price' },
    }
    expect(previewPayloadFromOfferPrice(offer).price_rappen).toBe(price)
    expect(price).toBe(9495)
  })

  it('11. missing paid price never becomes CHF 0', () => {
    const err = offerPriceToHttpError({ kind: 'unpriced', error: 'NO_PRICE_RULE' })
    expect(err?.statusCode).toBe(503)
    expect(err?.data.code).toBe('NO_PRICE_RULE')
  })

  it('12. explicit free returns CHF 0', () => {
    expect(previewPayloadFromOfferPrice({
      kind: 'free',
      priceRappen: 0,
      reason: 'require_payment_false',
    }).price_rappen).toBe(0)
  })
})

describe('selectDeterministicNewestRule', () => {
  it('does not crash or pick randomly when several rows match', () => {
    const chosen = selectDeterministicNewestRule(
      [
        { id: 'a', price_per_minute_rappen: 100, valid_from: '2024-01-01', created_at: '2024-01-02' },
        { id: 'b', price_per_minute_rappen: 200, valid_from: '2025-01-01', created_at: '2025-01-01' },
      ],
      { tenantId: TENANT }
    )
    expect(chosen?.id).toBe('newest'.replace('newest', 'b'))
  })
})
