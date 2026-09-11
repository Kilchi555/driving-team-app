import { describe, expect, it, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  calculateAdminFee: vi.fn(),
}))

vi.mock('~/server/utils/admin-fee', () => ({
  calculateAdminFee: mocks.calculateAdminFee,
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import {
  StaffPricingError,
  combineStaffPricingRules,
  composeStaffPaymentTotals,
  computeLessonPriceRappen,
  normalizeStaffDurationMinutes,
  proportionalLessonPriceRappen,
  quoteStaffAppointmentLessonPrice,
  staffResourceCostRappen,
} from '../staff-appointment-price'

function thenable(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {}
  const chain = () => builder
  builder.select = vi.fn(chain)
  builder.eq = vi.fn(chain)
  builder.in = vi.fn(chain)
  builder.maybeSingle = vi.fn(async () => {
    const rows = result.data
    const data = Array.isArray(rows) ? (rows[0] ?? null) : rows
    return { data, error: result.error }
  })
  builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  return builder
}

function supabaseFor(tables: Record<string, { data: unknown; error: unknown }>) {
  return {
    from: vi.fn((table: string) => thenable(tables[table] || { data: [], error: null })),
  }
}

const baseRules = [
  {
    category_code: 'B',
    event_type_code: null,
    rule_type: 'base',
    price_per_minute_rappen: 211,
    admin_fee_rappen: null,
    admin_fee_applies_from: null,
    base_duration_minutes: 45,
  },
  {
    category_code: 'B',
    event_type_code: null,
    rule_type: 'admin_fee',
    price_per_minute_rappen: null,
    admin_fee_rappen: 5000,
    admin_fee_applies_from: 2,
    base_duration_minutes: null,
  },
  {
    category_code: 'B',
    event_type_code: null,
    rule_type: 'theory',
    price_per_minute_rappen: 189,
    admin_fee_rappen: null,
    admin_fee_applies_from: null,
    base_duration_minutes: 45,
  },
  {
    category_code: 'B',
    event_type_code: null,
    rule_type: 'consultation',
    price_per_minute_rappen: 200,
    admin_fee_rappen: null,
    admin_fee_applies_from: null,
    base_duration_minutes: 45,
  },
]

describe('staff appointment quote primitives', () => {
  it('rounds lesson price to the nearest 5 rappen', () => {
    expect(computeLessonPriceRappen(211, 45)).toBe(9495)
    expect(computeLessonPriceRappen(197, 1)).toBe(195)
    expect(computeLessonPriceRappen(198, 1)).toBe(200)
  })

  it('rejects invalid durations', () => {
    expect(() => normalizeStaffDurationMinutes(0)).toThrow(StaffPricingError)
    expect(() => normalizeStaffDurationMinutes(12.5)).toThrow(StaffPricingError)
    expect(() => normalizeStaffDurationMinutes(601)).toThrow(StaffPricingError)
    expect(normalizeStaffDurationMinutes(45)).toBe(45)
  })

  it('scales stored lesson price proportionally on duration adjust', () => {
    expect(proportionalLessonPriceRappen(9000, 45, 30)).toBe(6000)
    expect(proportionalLessonPriceRappen(9495, 45, 90)).toBe(18990)
  })

  it('does not treat missing resource as a free surcharge plant', () => {
    expect(staffResourceCostRappen(null, 45)).toBe(0)
    expect(staffResourceCostRappen({ pricing_tiers: { lesson: 1500 } }, 90)).toBe(1500)
    expect(staffResourceCostRappen({ hourly_rate_rappen: 6000 }, 30)).toBe(3000)
  })

  it('composes Wallee total as lesson + admin + products + resource - discount, credit stored separately', () => {
    const totals = composeStaffPaymentTotals({
      lessonPriceRappen: 9500,
      adminFeeRappen: 5000,
      productsPriceRappen: 1000,
      resourceCostRappen: 500,
      discountAmountRappen: 1500,
      creditUsedRappen: 999999,
    })
    expect(totals.total_amount_rappen).toBe(14500)
    expect(totals.credit_used_rappen).toBe(14500)
    expect(totals.discount_amount_rappen).toBe(1500)
  })

  it('caps a planted discount at gross so total cannot go negative', () => {
    const totals = composeStaffPaymentTotals({
      lessonPriceRappen: 9500,
      adminFeeRappen: 0,
      productsPriceRappen: 0,
      resourceCostRappen: 0,
      discountAmountRappen: 1,
      creditUsedRappen: 0,
    })
    expect(totals.total_amount_rappen).toBe(9499)
    const zeroed = composeStaffPaymentTotals({
      lessonPriceRappen: 9500,
      adminFeeRappen: 0,
      productsPriceRappen: 0,
      resourceCostRappen: 0,
      discountAmountRappen: 999999,
      creditUsedRappen: 0,
    })
    expect(zeroed.total_amount_rappen).toBe(0)
    expect(zeroed.discount_amount_rappen).toBe(9500)
  })

  it('combines theory/consultation flags without a hardcoded 85 CHF fallback', () => {
    const combined = combineStaffPricingRules(baseRules)
    expect(combined[0].has_theory_rule).toBe(true)
    expect(combined[0].theory_price_per_minute_rappen).toBe(189)
    expect(combined[0].has_consultation_rule).toBe(true)
    expect(combined[0].has_base_rule).toBe(true)
  })
})

describe('quoteStaffAppointmentLessonPrice', () => {
  beforeEach(() => {
    mocks.calculateAdminFee.mockReset()
    mocks.calculateAdminFee.mockResolvedValue({
      adminFeeRappen: 5000,
      applies: true,
      reason: 'applied',
      appointmentNumber: 2,
      alreadyPaid: false,
      isMotorcycle: false,
    })
  })

  it('quotes a normal staff lesson as ppm × duration with 5-rappen rounding', async () => {
    const quote = await quoteStaffAppointmentLessonPrice(supabaseFor({
      pricing_rules: { data: baseRules, error: null },
    }) as any, {
      tenantId: 'tenant-a',
      categoryCode: 'B',
      eventTypeCode: 'lesson',
      durationMinutes: 45,
      studentUserId: 'student-1',
    })
    expect(quote.lessonPriceRappen).toBe(9495)
    expect(quote.adminFeeRappen).toBe(5000)
    expect(quote.ruleSource).toBe('base')
    expect(quote.pricePerMinuteRappen).toBe(211)
  })

  it('quotes a different duration from the same rule', async () => {
    const quote = await quoteStaffAppointmentLessonPrice(supabaseFor({
      pricing_rules: { data: baseRules, error: null },
    }) as any, {
      tenantId: 'tenant-a',
      categoryCode: 'B',
      eventTypeCode: 'lesson',
      durationMinutes: 90,
      studentUserId: 'student-1',
    })
    expect(quote.lessonPriceRappen).toBe(18990)
  })

  it('quotes a different category from its own rule', async () => {
    const rules = [
      ...baseRules,
      {
        category_code: 'A',
        event_type_code: null,
        rule_type: 'base',
        price_per_minute_rappen: 300,
        admin_fee_rappen: null,
        admin_fee_applies_from: null,
        base_duration_minutes: 45,
      },
    ]
    const quote = await quoteStaffAppointmentLessonPrice(supabaseFor({
      pricing_rules: { data: rules, error: null },
    }) as any, {
      tenantId: 'tenant-a',
      categoryCode: 'A',
      eventTypeCode: 'lesson',
      durationMinutes: 45,
      studentUserId: 'student-1',
    })
    expect(quote.lessonPriceRappen).toBe(13500)
  })

  it('uses the tenant theory rule and does not fall back to 8500 rappen', async () => {
    const quote = await quoteStaffAppointmentLessonPrice(supabaseFor({
      pricing_rules: { data: baseRules, error: null },
    }) as any, {
      tenantId: 'tenant-a',
      categoryCode: 'B',
      eventTypeCode: 'theory',
      durationMinutes: 45,
    })
    expect(quote.lessonPriceRappen).toBe(8505)
    expect(quote.lessonPriceRappen).not.toBe(8500)
    expect(quote.adminFeeRappen).toBe(0)
    expect(quote.ruleSource).toBe('theory')
    expect(mocks.calculateAdminFee).not.toHaveBeenCalled()
  })

  it('quotes consultation from the consultation rule', async () => {
    const quote = await quoteStaffAppointmentLessonPrice(supabaseFor({
      pricing_rules: { data: baseRules, error: null },
    }) as any, {
      tenantId: 'tenant-a',
      categoryCode: 'B',
      eventTypeCode: 'consultation',
      durationMinutes: 45,
    })
    expect(quote.lessonPriceRappen).toBe(9000)
    expect(quote.ruleSource).toBe('consultation')
  })

  it('rejects a missing pricing rule instead of a free lesson', async () => {
    await expect(quoteStaffAppointmentLessonPrice(supabaseFor({
      pricing_rules: { data: [], error: null },
    }) as any, {
      tenantId: 'tenant-a',
      categoryCode: 'B',
      eventTypeCode: 'lesson',
      durationMinutes: 45,
    })).rejects.toMatchObject({ code: 'missing_pricing_rule' })
  })

  it('rejects missing theory rules instead of hardcoded 85 CHF', async () => {
    const withoutTheory = baseRules.filter(rule => rule.rule_type !== 'theory')
    await expect(quoteStaffAppointmentLessonPrice(supabaseFor({
      pricing_rules: { data: withoutTheory, error: null },
    }) as any, {
      tenantId: 'tenant-a',
      categoryCode: 'B',
      eventTypeCode: 'theory',
      durationMinutes: 45,
    })).rejects.toMatchObject({ code: 'missing_theory_rule' })
  })

  it('rejects missing consultation rules instead of silent CHF 0', async () => {
    const withoutConsultation = baseRules.filter(rule => rule.rule_type !== 'consultation')
    await expect(quoteStaffAppointmentLessonPrice(supabaseFor({
      pricing_rules: { data: withoutConsultation, error: null },
    }) as any, {
      tenantId: 'tenant-a',
      categoryCode: 'B',
      eventTypeCode: 'consultation',
      durationMinutes: 45,
    })).rejects.toMatchObject({ code: 'missing_consultation_rule' })
  })

  it('rejects a missing tenant instead of quoting', async () => {
    await expect(quoteStaffAppointmentLessonPrice(supabaseFor({
      pricing_rules: { data: baseRules, error: null },
    }) as any, {
      tenantId: '',
      categoryCode: 'B',
      eventTypeCode: 'lesson',
      durationMinutes: 45,
    })).rejects.toMatchObject({ code: 'missing_tenant' })
  })

  it('looks up vehicle cost from the tenant catalog, not a client surcharge', async () => {
    const quote = await quoteStaffAppointmentLessonPrice(supabaseFor({
      pricing_rules: { data: baseRules, error: null },
      vehicles: { data: { id: 'veh-1', tenant_id: 'tenant-a', pricing_tiers: { lesson: 2000 }, hourly_rate_rappen: 0 }, error: null },
    }) as any, {
      tenantId: 'tenant-a',
      categoryCode: 'B',
      eventTypeCode: 'lesson',
      durationMinutes: 45,
      studentUserId: 'student-1',
      vehicleId: 'veh-1',
    })
    expect(quote.vehicleCostRappen).toBe(2000)
    expect(quote.resourceCostRappen).toBe(2000)
    expect(quote.lessonPriceRappen).toBe(9495)
  })

  it('rejects a vehicle from another tenant', async () => {
    await expect(quoteStaffAppointmentLessonPrice(supabaseFor({
      pricing_rules: { data: baseRules, error: null },
      vehicles: { data: null, error: null },
    }) as any, {
      tenantId: 'tenant-a',
      categoryCode: 'B',
      eventTypeCode: 'lesson',
      durationMinutes: 45,
      vehicleId: 'foreign-vehicle',
    })).rejects.toMatchObject({ code: 'invalid_vehicle' })
  })

  it('is deterministic for the same trusted inputs', async () => {
    const input = {
      tenantId: 'tenant-a',
      categoryCode: 'B',
      eventTypeCode: 'lesson' as const,
      durationMinutes: 45,
      studentUserId: 'student-1',
    }
    const a = await quoteStaffAppointmentLessonPrice(supabaseFor({
      pricing_rules: { data: baseRules, error: null },
    }) as any, input)
    const b = await quoteStaffAppointmentLessonPrice(supabaseFor({
      pricing_rules: { data: baseRules, error: null },
    }) as any, input)
    expect(a).toEqual(b)
  })
})
