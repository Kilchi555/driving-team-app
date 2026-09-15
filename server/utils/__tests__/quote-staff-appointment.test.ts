import { describe, expect, it, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  composeStaffPaymentFromOffer,
  quoteStaffAppointmentOffer,
  staffOfferIdentityFromAppointment,
  staffQuoteFromPersistedLesson,
  staffRuleTypeHint,
} from '../quote-staff-appointment'
import type { PricingRuleRow } from '../resolve-offer-price'

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
const START = '2026-09-14T10:00:00.000Z'

function identity(overrides: Partial<{
  tenantId: string
  eventTypeCode: string
  categoryCode: string | null
  durationMinutes: number
}> = {}) {
  return staffOfferIdentityFromAppointment({
    tenantId: TENANT,
    eventTypeCode: 'lesson',
    categoryCode: 'B',
    durationMinutes: 45,
    startTime: START,
    ...overrides,
  })
}

describe('staffRuleTypeHint', () => {
  it('maps built-in paid types to category rule types', () => {
    expect(staffRuleTypeHint('theory')).toBe('theory')
    expect(staffRuleTypeHint('consultation')).toBe('consultation')
    expect(staffRuleTypeHint('exam')).toBe('exam')
    expect(staffRuleTypeHint('lesson')).toBe('base_price')
    expect(staffRuleTypeHint('workshop')).toBe('base_price')
  })
})

describe('quoteStaffAppointmentOffer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('G. valid paid lesson uses category rule through resolveOfferPrice', async () => {
    const supabase = createOfferPriceSupabase({
      eventTypes: [{ tenant_id: TENANT, code: 'lesson', require_payment: true }],
      rules: [{
        tenant_id: TENANT,
        id: 'rule-b',
        rule_type: 'base_price',
        category_code: 'B',
        price_per_minute_rappen: 200,
      }],
    })
    const quote = await quoteStaffAppointmentOffer(supabase, identity())
    expect(quote.kind).toBe('paid')
    expect(quote.lessonPriceRappen).toBe(9000)
  })

  it('A. client-planted cheap amounts are not an input to the quote', async () => {
    const supabase = createOfferPriceSupabase({
      eventTypes: [{ tenant_id: TENANT, code: 'lesson', require_payment: true }],
      rules: [{
        tenant_id: TENANT,
        id: 'rule-b',
        rule_type: 'base_price',
        category_code: 'B',
        price_per_minute_rappen: 200,
      }],
    })
    const quote = await quoteStaffAppointmentOffer(supabase, identity())
    const composed = composeStaffPaymentFromOffer(quote, {
      adminFeeRappen: 0,
      productsPriceRappen: 0,
      discountAmountRappen: 0,
    })
    expect(composed.lessonPriceRappen).not.toBe(1)
    expect(composed.totalAmountRappen).not.toBe(1)
    expect(composed.lessonPriceRappen).toBe(9000)
    expect(composed.totalAmountRappen).toBe(9000)
  })

  it('adds server resource surcharge onto the lesson total', async () => {
    const supabase = createOfferPriceSupabase({
      eventTypes: [{ tenant_id: TENANT, code: 'lesson', require_payment: true }],
      rules: [{
        tenant_id: TENANT,
        id: 'rule-b',
        rule_type: 'base_price',
        category_code: 'B',
        price_per_minute_rappen: 200,
      }],
    })
    const quote = await quoteStaffAppointmentOffer(supabase, identity())
    const composed = composeStaffPaymentFromOffer(quote, {
      resourceSurchargeRappen: 7500,
    })
    expect(composed.resourceSurchargeRappen).toBe(7500)
    expect(composed.totalAmountRappen).toBe(16500)
  })

  it('composes from a persisted lesson without looking up pricing rules', () => {
    const quote = staffQuoteFromPersistedLesson(9000)
    const composed = composeStaffPaymentFromOffer(quote, {
      adminFeeRappen: 1000,
      productsPriceRappen: 2000,
      resourceSurchargeRappen: 7500,
    })
    expect(quote.kind).toBe('paid')
    expect(quote.lessonPriceRappen).toBe(9000)
    expect(composed.totalAmountRappen).toBe(19500)
  })

  it('B. planted zero is ignored for a paid event; missing paid rule fails closed', async () => {
    const paid = createOfferPriceSupabase({
      eventTypes: [{ tenant_id: TENANT, code: 'lesson', require_payment: true }],
      rules: [{
        tenant_id: TENANT,
        id: 'rule-b',
        rule_type: 'base_price',
        category_code: 'B',
        price_per_minute_rappen: 200,
      }],
    })
    const paidQuote = await quoteStaffAppointmentOffer(paid, identity())
    expect(composeStaffPaymentFromOffer(paidQuote).totalAmountRappen).toBe(9000)

    const unpriced = createOfferPriceSupabase({
      eventTypes: [{ tenant_id: TENANT, code: 'lesson', require_payment: true }],
      rules: [],
    })
    await expect(quoteStaffAppointmentOffer(unpriced, identity())).rejects.toMatchObject({
      statusCode: 503,
      data: { code: 'NO_PRICE_RULE' },
    })
  })

  it('B. require_payment=false is free at 0 and does not inherit category price', async () => {
    const supabase = createOfferPriceSupabase({
      eventTypes: [{ tenant_id: TENANT, code: 'vacation', require_payment: false }],
      rules: [{
        tenant_id: TENANT,
        id: 'rule-b',
        rule_type: 'base_price',
        category_code: 'B',
        price_per_minute_rappen: 200,
      }],
    })
    const quote = await quoteStaffAppointmentOffer(supabase, identity({
      eventTypeCode: 'vacation',
      categoryCode: 'B',
    }))
    expect(quote).toEqual({ kind: 'free', lessonPriceRappen: 0, reason: 'require_payment_false' })
  })

  it('C. paid event without a valid rule throws NO_PRICE_RULE', async () => {
    const supabase = createOfferPriceSupabase({
      eventTypes: [{ tenant_id: TENANT, code: 'lesson', require_payment: true }],
      rules: [],
    })
    await expect(quoteStaffAppointmentOffer(supabase, identity())).rejects.toMatchObject({
      statusCode: 503,
      data: { code: 'NO_PRICE_RULE' },
    })
  })

  it('D. category-specific price resolves for B vs A', async () => {
    const supabase = createOfferPriceSupabase({
      eventTypes: [{ tenant_id: TENANT, code: 'lesson', require_payment: true }],
      rules: [
        {
          tenant_id: TENANT,
          id: 'rule-b',
          rule_type: 'base_price',
          category_code: 'B',
          price_per_minute_rappen: 200,
        },
        {
          tenant_id: TENANT,
          id: 'rule-a',
          rule_type: 'base_price',
          category_code: 'A',
          price_per_minute_rappen: 100,
        },
      ],
    })
    const b = await quoteStaffAppointmentOffer(supabase, identity({ categoryCode: 'B' }))
    const a = await quoteStaffAppointmentOffer(supabase, identity({ categoryCode: 'A' }))
    expect(b.lessonPriceRappen).toBe(9000)
    expect(a.lessonPriceRappen).toBe(4500)
  })

  it('E. tenant A never uses tenant B pricing rules or event types', async () => {
    const supabase = createOfferPriceSupabase({
      eventTypes: [{ tenant_id: OTHER, code: 'lesson', require_payment: true }],
      rules: [{
        tenant_id: OTHER,
        id: 'rule-other',
        rule_type: 'base_price',
        category_code: 'B',
        price_per_minute_rappen: 999,
      }],
    })
    await expect(quoteStaffAppointmentOffer(supabase, identity())).rejects.toMatchObject({
      statusCode: 503,
      data: { code: 'NO_PRICE_RULE' },
    })
  })

  it('F. duration is priced through the canonical resolver', async () => {
    const supabase = createOfferPriceSupabase({
      eventTypes: [{ tenant_id: TENANT, code: 'lesson', require_payment: true }],
      rules: [{
        tenant_id: TENANT,
        id: 'rule-b',
        rule_type: 'base_price',
        category_code: 'B',
        price_per_minute_rappen: 200,
      }],
    })
    const fortyFive = await quoteStaffAppointmentOffer(supabase, identity({ durationMinutes: 45 }))
    const ninety = await quoteStaffAppointmentOffer(supabase, identity({ durationMinutes: 90 }))
    expect(fortyFive.lessonPriceRappen).toBe(9000)
    expect(ninety.lessonPriceRappen).toBe(18000)
  })

  it('does not use hardcoded 85 CHF / 95/45 fallbacks', () => {
    const src = readFileSync(resolve(process.cwd(), 'server/utils/quote-staff-appointment.ts'), 'utf8')
    expect(src).not.toContain('8500')
    expect(src).not.toContain('95 / 45')
    expect(src).not.toContain('getFallbackRule')
    expect(src).toContain('resolveOfferPrice')
    expect(src).not.toContain('bindPublicSlotOfferIdentity')
  })
})

describe('appointments/save staff pricing contract', () => {
  const src = readFileSync(resolve(process.cwd(), 'server/api/appointments/save.post.ts'), 'utf8')

  it('quotes through the staff wrapper before persist', () => {
    expect(src).toContain('quoteStaffAppointmentOffer')
    expect(src).toContain('composeStaffPaymentFromOffer')
    expect(src).toContain('quoteStaffResourceSurcharge')
    expect(src).not.toContain('getFallbackRule')
    expect(src).not.toContain('isChargeableEventType')
    expect(src).not.toContain('basePriceRappen')
    expect(src).not.toContain('totalAmountRappenForPayment')
    expect(src).not.toContain('bindPublicSlotOfferIdentity')
    expect(src).not.toContain('resourceSurcharges')
  })

  it('quotes before appointment insert/update', () => {
    const quoteAt = src.indexOf('quoteStaffAppointmentOffer')
    const resourceAt = src.indexOf('quoteStaffResourceSurcharge')
    const insertAt = src.indexOf('.insert(appointmentData)')
    const updateAt = src.indexOf('.update(appointmentData)')
    expect(quoteAt).toBeGreaterThan(0)
    expect(resourceAt).toBeGreaterThan(0)
    expect(quoteAt).toBeLessThan(insertAt)
    expect(resourceAt).toBeLessThan(insertAt)
    expect(quoteAt).toBeLessThan(updateAt)
    expect(resourceAt).toBeLessThan(updateAt)
  })
})

describe('updatePaymentEntry does not rewrite save amounts', () => {
  const src = readFileSync(resolve(process.cwd(), 'composables/useEventModalForm.ts'), 'utf8')
  const updateFn = src.slice(src.indexOf('const updatePaymentEntry'), src.indexOf('const loadLastAppointmentLocation'))

  it('19. does not write lesson_price_rappen or total_amount_rappen', () => {
    expect(updateFn).toContain('Amounts (lesson / total / products / discount) are owned by')
    expect(updateFn).not.toContain('lesson_price_rappen:')
    expect(updateFn).not.toContain('total_amount_rappen:')
    expect(updateFn).not.toContain('products_price_rappen:')
    expect(updateFn).not.toContain('discount_amount_rappen:')
  })
})
