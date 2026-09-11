/**
 * Canonical staff-calendar appointment price authority.
 *
 * INTENTIONAL SEMANTICS (do not "fix" without a product decision):
 * This quote mirrors current staff EventModal / usePricing math:
 *   lesson = roundToNearest5Rappen(price_per_minute_rappen * duration)
 *   NO duration_multiplier
 *   NO weekend_multiplier
 *   NO evening_multiplier
 *   NO public-booking travel fee
 *   NO public calculateVehicleCost(vehicle_mode)
 * Vehicle/room costs use the EventModal resource formula (lesson tier or
 * hourly_rate * duration/60) and are added to the payment TOTAL, not folded
 * into lesson_price_rappen.
 *
 * Public booking / guest-book / preview-price are a different formula and
 * MUST remain unchanged. Calendar paste previously applied multipliers in the
 * browser; it must now use this helper so it cannot bypass staff authority.
 *
 * Missing tenant pricing rules do not become a free lesson and do not use
 * COMPLETE_FALLBACK_RULES or the hardcoded 85 CHF theory price.
 */

import { createError } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import { roundToNearest5Rappen } from '~/utils/rounding'
import { calculateAdminFee } from '~/server/utils/admin-fee'
import { BOOT_ALIASES } from '~/server/utils/category-groups'
import { availableWalletRappen } from '~/server/utils/apply-student-credit'

export const MIN_STAFF_DURATION_MINUTES = 1
export const MAX_STAFF_DURATION_MINUTES = 600
export const MAX_PRODUCT_QUANTITY = 99

export type StaffPriceRuleSource = 'base' | 'theory' | 'consultation' | 'event_price'

export class StaffPricingError extends Error {
  statusCode: number
  code: string

  constructor(code: string, message: string, statusCode = 400) {
    super(message)
    this.name = 'StaffPricingError'
    this.code = code
    this.statusCode = statusCode
  }
}

export function throwIfStaffPricingError(err: unknown): never {
  if (err instanceof StaffPricingError) {
    throw createError({ statusCode: err.statusCode, statusMessage: err.message })
  }
  throw err
}

export type CombinedStaffPricingRule = {
  category_code: string
  event_type_code: string | null
  price_per_minute_rappen: number
  admin_fee_rappen: number
  admin_fee_applies_from: number
  base_duration_minutes: number
  theory_price_per_minute_rappen: number
  theory_base_duration_minutes: number
  has_theory_rule: boolean
  consultation_price_per_minute_rappen: number
  consultation_base_duration_minutes: number | null
  has_consultation_rule: boolean
  has_base_rule: boolean
  is_event_price: boolean
}

export type StaffAppointmentPriceInput = {
  tenantId: string
  categoryCode?: string | null
  eventTypeCode?: string | null
  durationMinutes: number
  studentUserId?: string | null
  vehicleId?: string | null
  roomId?: string | null
  mode?: 'create' | 'edit'
  excludeAppointmentId?: string | null
}

export type StaffAppointmentQuote = {
  lessonPriceRappen: number
  adminFeeRappen: number
  vehicleCostRappen: number
  roomCostRappen: number
  resourceCostRappen: number
  pricePerMinuteRappen: number
  durationMinutes: number
  appointmentNumber: number
  ruleSource: StaffPriceRuleSource
  categoryCode: string | null
  eventTypeCode: string | null
  appliesAdminFee: boolean
}

export type StaffProductLine = {
  productId?: string | null
  id?: string | null
  quantity?: number
  customPriceRappen?: number | null
}

export type StaffPaymentTotals = {
  lesson_price_rappen: number
  admin_fee_rappen: number
  products_price_rappen: number
  discount_amount_rappen: number
  voucher_discount_rappen: number
  credit_used_rappen: number
  total_amount_rappen: number
  resource_cost_rappen: number
  vehicle_cost_rappen: number
  room_cost_rappen: number
}

type RawPricingRule = {
  category_code?: string | null
  event_type_code?: string | null
  rule_type?: string | null
  rule_name?: string | null
  price_per_minute_rappen?: number | null
  admin_fee_rappen?: number | null
  admin_fee_applies_from?: number | null
  base_duration_minutes?: number | null
}

export function normalizeStaffDurationMinutes(value: unknown): number {
  const duration = Array.isArray(value) ? Number(value[0]) : Number(value)
  if (!Number.isFinite(duration) || !Number.isInteger(duration)) {
    throw new StaffPricingError('invalid_duration', 'Ungültige Termindauer.')
  }
  if (duration < MIN_STAFF_DURATION_MINUTES || duration > MAX_STAFF_DURATION_MINUTES) {
    throw new StaffPricingError(
      'invalid_duration',
      `Termindauer muss zwischen ${MIN_STAFF_DURATION_MINUTES} und ${MAX_STAFF_DURATION_MINUTES} Minuten liegen.`,
    )
  }
  return duration
}

export function normalizeStaffEventType(code: string | null | undefined): string {
  return String(code || 'lesson').trim().toLowerCase() || 'lesson'
}

export function computeLessonPriceRappen(pricePerMinuteRappen: number, durationMinutes: number): number {
  const ppm = Number(pricePerMinuteRappen)
  if (!Number.isFinite(ppm) || ppm < 0) {
    throw new StaffPricingError('invalid_ppm', 'Ungültiger Minutenpreis in der Preisregel.')
  }
  return roundToNearest5Rappen(Math.round(ppm * durationMinutes))
}

/**
 * EventModal resource formula — not public calculateVehicleCost(vehicle_mode).
 */
export function staffResourceCostRappen(
  item: { pricing_tiers?: { lesson?: number | null } | null; hourly_rate_rappen?: number | null } | null | undefined,
  durationMinutes: number,
): number {
  if (!item) return 0
  if (item.pricing_tiers?.lesson != null) {
    const lessonTier = Math.round(Number(item.pricing_tiers.lesson))
    return Number.isFinite(lessonTier) && lessonTier >= 0 ? lessonTier : 0
  }
  const hourly = Number(item.hourly_rate_rappen) || 0
  if (hourly > 0) return Math.round(hourly * durationMinutes / 60)
  return 0
}

/**
 * Duration-adjust business rule: scale the stored lesson price. Do not treat
 * this as a fresh category quote, and never trust a client ppm.
 */
export function proportionalLessonPriceRappen(
  storedLessonRappen: number,
  originalDurationMinutes: number,
  newDurationMinutes: number,
): number {
  const stored = Math.round(Number(storedLessonRappen) || 0)
  const original = Number(originalDurationMinutes)
  const next = Number(newDurationMinutes)
  if (!Number.isFinite(original) || original <= 0) {
    throw new StaffPricingError('invalid_duration', 'Ursprüngliche Termindauer fehlt.')
  }
  if (!Number.isFinite(next) || !Number.isInteger(next) || next < MIN_STAFF_DURATION_MINUTES || next > MAX_STAFF_DURATION_MINUTES) {
    throw new StaffPricingError('invalid_duration', 'Ungültige neue Termindauer.')
  }
  if (stored < 0) {
    throw new StaffPricingError('invalid_stored_price', 'Gespeicherter Lektionspreis ist ungültig.')
  }
  return roundToNearest5Rappen(Math.round((stored * next) / original))
}

export function composeStaffPaymentTotals(input: {
  lessonPriceRappen: number
  adminFeeRappen: number
  productsPriceRappen: number
  resourceCostRappen: number
  discountAmountRappen: number
  creditUsedRappen: number
}): StaffPaymentTotals {
  const lesson = Math.max(0, Math.round(Number(input.lessonPriceRappen) || 0))
  const admin = Math.max(0, Math.round(Number(input.adminFeeRappen) || 0))
  const products = Math.max(0, Math.round(Number(input.productsPriceRappen) || 0))
  const resource = Math.max(0, Math.round(Number(input.resourceCostRappen) || 0))
  const gross = lesson + admin + products + resource
  const discount = Math.max(0, Math.min(Math.round(Number(input.discountAmountRappen) || 0), gross))
  const total = Math.max(0, gross - discount)
  const credit = Math.max(0, Math.min(Math.round(Number(input.creditUsedRappen) || 0), total))
  return {
    lesson_price_rappen: lesson,
    admin_fee_rappen: admin,
    products_price_rappen: products,
    discount_amount_rappen: discount,
    voucher_discount_rappen: 0,
    credit_used_rappen: credit,
    total_amount_rappen: total,
    resource_cost_rappen: resource,
    vehicle_cost_rappen: 0,
    room_cost_rappen: 0,
  }
}

export function combineStaffPricingRules(rawRules: RawPricingRule[]): CombinedStaffPricingRule[] {
  const rulesByKey = rawRules.reduce((acc, rule) => {
    const key = rule.category_code || rule.event_type_code
    if (!key) return acc
    if (!acc[key]) {
      acc[key] = {
        category_code: key,
        event_type_code: rule.event_type_code || null,
        price_per_minute_rappen: 0,
        admin_fee_rappen: 0,
        admin_fee_applies_from: 2,
        base_duration_minutes: 45,
        theory_price_per_minute_rappen: 0,
        theory_base_duration_minutes: 45,
        has_theory_rule: false,
        consultation_price_per_minute_rappen: 0,
        consultation_base_duration_minutes: null,
        has_consultation_rule: false,
        has_base_rule: false,
        is_event_price: false,
      }
    }

    if (rule.rule_type === 'base' || rule.rule_type === 'pricing' || rule.rule_type === 'base_price' || !rule.rule_type) {
      acc[key].has_base_rule = true
      if (rule.price_per_minute_rappen != null) {
        acc[key].price_per_minute_rappen = Number(rule.price_per_minute_rappen) || 0
      }
      if (rule.base_duration_minutes) {
        acc[key].base_duration_minutes = Number(rule.base_duration_minutes) || 45
      }
    }

    if (rule.rule_type === 'event_price') {
      acc[key].is_event_price = true
      if (rule.price_per_minute_rappen != null) {
        acc[key].price_per_minute_rappen = Number(rule.price_per_minute_rappen) || 0
      }
      if (rule.base_duration_minutes) {
        acc[key].base_duration_minutes = Number(rule.base_duration_minutes) || 45
      }
      if (rule.event_type_code) acc[key].event_type_code = rule.event_type_code
    }

    if (rule.rule_type === 'admin_fee') {
      if (rule.admin_fee_rappen !== undefined && rule.admin_fee_rappen !== null) {
        acc[key].admin_fee_rappen = Number(rule.admin_fee_rappen) || 0
      }
      if (rule.admin_fee_applies_from !== undefined && rule.admin_fee_applies_from !== null) {
        acc[key].admin_fee_applies_from = Number(rule.admin_fee_applies_from)
      }
    }

    if (rule.rule_type === 'theory') {
      acc[key].has_theory_rule = true
      acc[key].theory_price_per_minute_rappen = Number(rule.price_per_minute_rappen) || 0
      if (rule.base_duration_minutes) {
        acc[key].theory_base_duration_minutes = Number(rule.base_duration_minutes) || 45
      }
    }

    if (rule.rule_type === 'consultation') {
      acc[key].has_consultation_rule = true
      acc[key].consultation_price_per_minute_rappen = Number(rule.price_per_minute_rappen) || 0
      if (rule.base_duration_minutes) {
        acc[key].consultation_base_duration_minutes = Number(rule.base_duration_minutes)
      }
    }

    return acc
  }, {} as Record<string, CombinedStaffPricingRule>)

  return Object.values(rulesByKey)
}

function findCombinedRule(rules: CombinedStaffPricingRule[], categoryCode: string | null | undefined): CombinedStaffPricingRule | null {
  if (!categoryCode) return null
  const exact = rules.find(rule => rule.category_code === categoryCode)
  if (exact) return exact
  const insensitive = rules.find(rule => rule.category_code.toLowerCase() === categoryCode.toLowerCase())
  if (insensitive) return insensitive
  if (BOOT_ALIASES.includes(categoryCode)) {
    const alt = BOOT_ALIASES.find(code => code !== categoryCode) || null
    if (alt) {
      return rules.find(rule => rule.category_code === alt)
        || rules.find(rule => rule.category_code.toLowerCase() === alt.toLowerCase())
        || null
    }
  }
  return null
}

function selectStaffPricingRule(
  rules: CombinedStaffPricingRule[],
  categoryCode: string | null | undefined,
  eventTypeCode: string | null | undefined,
): CombinedStaffPricingRule | null {
  const eventTypeRule = eventTypeCode ? findCombinedRule(rules, eventTypeCode) : null
  const isGenuineEventPriceRule = !!eventTypeRule && eventTypeRule.event_type_code === eventTypeCode
  return (isGenuineEventPriceRule ? eventTypeRule : null)
    || findCombinedRule(rules, categoryCode)
    || eventTypeRule
    || null
}

async function loadTenantPricingRules(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<CombinedStaffPricingRule[]> {
  const { data, error } = await supabase
    .from('pricing_rules')
    .select('category_code, event_type_code, rule_type, rule_name, price_per_minute_rappen, admin_fee_rappen, admin_fee_applies_from, base_duration_minutes')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)

  if (error) {
    throw new StaffPricingError('pricing_rules_load_failed', 'Preisregeln konnten nicht geladen werden.', 500)
  }
  return combineStaffPricingRules((data || []) as RawPricingRule[])
}

async function loadTenantResource(
  supabase: SupabaseClient,
  table: 'vehicles' | 'rooms',
  tenantId: string,
  id: string,
): Promise<{ pricing_tiers?: { lesson?: number | null } | null; hourly_rate_rappen?: number | null } | null> {
  const { data, error } = await supabase
    .from(table)
    .select('id, tenant_id, hourly_rate_rappen, pricing_tiers')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error || !data) return null
  return data
}

export async function quoteStaffAppointmentLessonPrice(
  supabase: SupabaseClient,
  input: StaffAppointmentPriceInput,
): Promise<StaffAppointmentQuote> {
  const tenantId = String(input.tenantId || '').trim()
  if (!tenantId) {
    throw new StaffPricingError('missing_tenant', 'Mandant fehlt für die Preisberechnung.', 403)
  }

  const durationMinutes = normalizeStaffDurationMinutes(input.durationMinutes)
  const eventTypeCode = normalizeStaffEventType(input.eventTypeCode)
  const categoryCode = input.categoryCode ? String(input.categoryCode).trim() : null
  const rules = await loadTenantPricingRules(supabase, tenantId)
  const rule = selectStaffPricingRule(rules, categoryCode, eventTypeCode)

  let lessonPriceRappen = 0
  let pricePerMinuteRappen = 0
  let ruleSource: StaffPriceRuleSource = 'base'
  let adminFeeRappen = 0
  let appointmentNumber = 1
  let appliesAdminFee = false

  if (eventTypeCode === 'theory') {
    if (!rule?.has_theory_rule) {
      throw new StaffPricingError(
        'missing_theory_rule',
        `Keine Theorie-Preisregel für Kategorie "${categoryCode || eventTypeCode}" konfiguriert.`,
      )
    }
    pricePerMinuteRappen = rule.theory_price_per_minute_rappen
    lessonPriceRappen = computeLessonPriceRappen(pricePerMinuteRappen, durationMinutes)
    ruleSource = 'theory'
  } else if (eventTypeCode === 'consultation') {
    if (!rule?.has_consultation_rule) {
      throw new StaffPricingError(
        'missing_consultation_rule',
        `Keine Beratungs-Preisregel für Kategorie "${categoryCode || eventTypeCode}" konfiguriert.`,
      )
    }
    pricePerMinuteRappen = rule.consultation_price_per_minute_rappen
    lessonPriceRappen = computeLessonPriceRappen(pricePerMinuteRappen, durationMinutes)
    ruleSource = 'consultation'
  } else {
    if (!rule) {
      throw new StaffPricingError(
        'missing_pricing_rule',
        `Keine Preisregel für Kategorie "${categoryCode || eventTypeCode}" konfiguriert.`,
      )
    }
    if (!rule.is_event_price && !rule.has_base_rule) {
      throw new StaffPricingError(
        'missing_pricing_rule',
        `Keine Preisregel für Kategorie "${categoryCode || eventTypeCode}" konfiguriert.`,
      )
    }
    pricePerMinuteRappen = rule.price_per_minute_rappen
    lessonPriceRappen = computeLessonPriceRappen(pricePerMinuteRappen, durationMinutes)
    ruleSource = rule.is_event_price ? 'event_price' : 'base'

    if (categoryCode) {
      const admin = await calculateAdminFee({
        supabase,
        userId: input.studentUserId || null,
        tenantId,
        categoryCode,
        adminFeeRappenFromRule: rule.admin_fee_rappen,
        adminFeeAppliesFromRule: rule.admin_fee_applies_from,
        excludeAppointmentId: input.excludeAppointmentId || null,
      })
      adminFeeRappen = admin.adminFeeRappen
      appointmentNumber = admin.appointmentNumber || 1
      appliesAdminFee = admin.applies
    }
  }

  let vehicleCostRappen = 0
  let roomCostRappen = 0
  if (input.vehicleId) {
    const vehicle = await loadTenantResource(supabase, 'vehicles', tenantId, String(input.vehicleId))
    if (!vehicle) {
      throw new StaffPricingError('invalid_vehicle', 'Fahrzeug gehört nicht zu diesem Mandanten.')
    }
    vehicleCostRappen = staffResourceCostRappen(vehicle, durationMinutes)
  }
  if (input.roomId) {
    const room = await loadTenantResource(supabase, 'rooms', tenantId, String(input.roomId))
    if (!room) {
      throw new StaffPricingError('invalid_room', 'Raum gehört nicht zu diesem Mandanten.')
    }
    roomCostRappen = staffResourceCostRappen(room, durationMinutes)
  }

  return {
    lessonPriceRappen,
    adminFeeRappen,
    vehicleCostRappen,
    roomCostRappen,
    resourceCostRappen: vehicleCostRappen + roomCostRappen,
    pricePerMinuteRappen,
    durationMinutes,
    appointmentNumber,
    ruleSource,
    categoryCode,
    eventTypeCode,
    appliesAdminFee,
  }
}

export async function resolveStaffProductLinesPrice(
  supabase: SupabaseClient,
  tenantId: string,
  lines: StaffProductLine[] | null | undefined,
): Promise<number> {
  if (!lines || lines.length === 0) return 0
  const ids = [...new Set(lines.map(line => String(line.productId || line.id || '')).filter(Boolean))]
  if (ids.length === 0) return 0

  const { data, error } = await supabase
    .from('products')
    .select('id, tenant_id, price_rappen, is_active, allow_custom_amount, min_amount_rappen, max_amount_rappen')
    .eq('tenant_id', tenantId)
    .in('id', ids)

  if (error) {
    throw new StaffPricingError('products_load_failed', 'Produkte konnten nicht geladen werden.', 500)
  }

  const byId = new Map((data || []).map((row: any) => [row.id, row]))
  let total = 0
  for (const line of lines) {
    const productId = String(line.productId || line.id || '')
    if (!productId) continue
    const product = byId.get(productId)
    if (!product || product.is_active === false) {
      throw new StaffPricingError('invalid_product', 'Produkt nicht gefunden oder inaktiv.')
    }
    const quantity = Math.round(Number(line.quantity) || 1)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_PRODUCT_QUANTITY) {
      throw new StaffPricingError('invalid_product_quantity', 'Ungültige Produktmenge.')
    }
    let unit = Math.round(Number(product.price_rappen) || 0)
    if (product.allow_custom_amount && line.customPriceRappen != null) {
      const requested = Math.round(Number(line.customPriceRappen) || 0)
      const min = Math.round(Number(product.min_amount_rappen) || 0)
      const max = product.max_amount_rappen != null ? Math.round(Number(product.max_amount_rappen)) : requested
      if (!Number.isFinite(requested) || requested < 0) {
        throw new StaffPricingError('invalid_product_price', 'Ungültiger Produktpreis.')
      }
      unit = Math.min(Math.max(requested, min), max)
    }
    total += unit * quantity
  }
  return total
}

export async function resolveStaffCreditUsedRappen(
  supabase: SupabaseClient,
  opts: {
    tenantId: string
    studentUserId?: string | null
    requestedRappen?: number | null
    maxRappen: number
  },
): Promise<number> {
  const requested = Math.round(Number(opts.requestedRappen) || 0)
  if (!Number.isFinite(requested) || requested <= 0 || !opts.studentUserId) return 0
  const { data } = await supabase
    .from('student_credits')
    .select('balance_rappen, pending_withdrawal_rappen')
    .eq('user_id', opts.studentUserId)
    .eq('tenant_id', opts.tenantId)
    .maybeSingle()
  const wallet = availableWalletRappen(data)
  return Math.max(0, Math.min(requested, wallet, Math.max(0, opts.maxRappen)))
}

export async function quoteAndComposeStaffAppointmentPayment(
  supabase: SupabaseClient,
  input: StaffAppointmentPriceInput & {
    productLines?: StaffProductLine[] | null
    requestedDiscountRappen?: number | null
    requestedCreditRappen?: number | null
  },
): Promise<{ quote: StaffAppointmentQuote; totals: StaffPaymentTotals }> {
  const quote = await quoteStaffAppointmentLessonPrice(supabase, input)
  const productsPriceRappen = await resolveStaffProductLinesPrice(supabase, input.tenantId, input.productLines)
  const composed = composeStaffPaymentTotals({
    lessonPriceRappen: quote.lessonPriceRappen,
    adminFeeRappen: quote.adminFeeRappen,
    productsPriceRappen,
    resourceCostRappen: quote.resourceCostRappen,
    discountAmountRappen: input.requestedDiscountRappen || 0,
    creditUsedRappen: 0,
  })
  const credit = await resolveStaffCreditUsedRappen(supabase, {
    tenantId: input.tenantId,
    studentUserId: input.studentUserId,
    requestedRappen: input.requestedCreditRappen,
    maxRappen: composed.total_amount_rappen,
  })
  return {
    quote,
    totals: {
      ...composed,
      credit_used_rappen: credit,
      vehicle_cost_rappen: quote.vehicleCostRappen,
      room_cost_rappen: quote.roomCostRappen,
    },
  }
}

export function staffQuoteMetadata(quote: StaffAppointmentQuote, totals: StaffPaymentTotals) {
  return {
    staff_quote: {
      quoted_at: new Date().toISOString(),
      rule_source: quote.ruleSource,
      duration_minutes: quote.durationMinutes,
      lesson_price_rappen: totals.lesson_price_rappen,
      admin_fee_rappen: totals.admin_fee_rappen,
      products_price_rappen: totals.products_price_rappen,
      resource_cost_rappen: totals.resource_cost_rappen,
      vehicle_cost_rappen: quote.vehicleCostRappen,
      room_cost_rappen: quote.roomCostRappen,
      discount_amount_rappen: totals.discount_amount_rappen,
      total_amount_rappen: totals.total_amount_rappen,
    },
  }
}

export async function quoteStaffAppointmentFromRow(
  supabase: SupabaseClient,
  appointment: {
    id?: string | null
    tenant_id: string
    type?: string | null
    event_type_code?: string | null
    duration_minutes?: number | null
    user_id?: string | null
    vehicle_id?: string | null
    room_id?: string | null
  },
  extras?: {
    productLines?: StaffProductLine[] | null
    requestedDiscountRappen?: number | null
    requestedCreditRappen?: number | null
    mode?: 'create' | 'edit'
  },
) {
  return quoteAndComposeStaffAppointmentPayment(supabase, {
    tenantId: appointment.tenant_id,
    categoryCode: appointment.type,
    eventTypeCode: appointment.event_type_code,
    durationMinutes: Number(appointment.duration_minutes),
    studentUserId: appointment.user_id,
    vehicleId: appointment.vehicle_id,
    roomId: appointment.room_id,
    mode: extras?.mode || (appointment.id ? 'edit' : 'create'),
    excludeAppointmentId: appointment.id || null,
    productLines: extras?.productLines,
    requestedDiscountRappen: extras?.requestedDiscountRappen,
    requestedCreditRappen: extras?.requestedCreditRappen,
  })
}
