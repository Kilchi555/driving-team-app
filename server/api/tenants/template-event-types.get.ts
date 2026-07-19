// server/api/tenants/template-event-types.get.ts
// Returns template event types (tenant_id IS NULL) for a given business_type,
// enriched with their template default price (if any pricing_rules template
// row exists for that event_type_code). Used during tenant registration to
// render the pricing step dynamically per business_type instead of the
// hardcoded driving_school-only Fahrstunde/Prüfung/Theorie list.

import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  const queryParams = getQuery(event)
  const businessType = (queryParams.business_type as string) || 'driving_school'

  const supabase = getSupabaseAdmin()

  // Only chargeable event types belong in a pricing step (e.g. driving_school's
  // internal 'meeting'/'admin'/'vacation'/'training'/'maintenance' types are
  // excluded since they're never billed to a customer).
  const { data: eventTypes, error } = await supabase
    .from('event_types')
    .select('code, name, emoji, default_duration_minutes, require_payment, public_bookable, is_default, display_order')
    .is('tenant_id', null)
    .eq('is_active', true)
    .eq('business_type', businessType)
    .eq('require_payment', true)
    .order('display_order', { ascending: true })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: `Fehler beim Laden der Event-Types: ${error.message}` })
  }

  const codes = (eventTypes || []).map(e => e.code)
  let priceByCode: Record<string, { price_chf: number; duration_minutes: number }> = {}

  if (codes.length > 0) {
    const { data: priceRules } = await supabase
      .from('pricing_rules')
      .select('event_type_code, price_per_minute_rappen, base_duration_minutes')
      .is('tenant_id', null)
      .eq('business_type', businessType)
      .eq('rule_type', 'event_price')
      .in('event_type_code', codes)

    priceByCode = (priceRules || []).reduce((acc, r) => {
      if (!r.event_type_code) return acc
      const duration = r.base_duration_minutes || 60
      acc[r.event_type_code] = {
        price_chf: Math.round((Number(r.price_per_minute_rappen) * duration) / 100),
        duration_minutes: duration,
      }
      return acc
    }, {} as Record<string, { price_chf: number; duration_minutes: number }>)
  }

  // Fallback defaults for event types that don't (yet) have a dedicated
  // event_price template row – e.g. driving_school's 'lesson'/'exam'/'theory'
  // are priced per license category, not per event type, so no event_price
  // template exists for them. These numbers just avoid showing "CHF 0" as a
  // starting point; they're fully editable in the registration UI and later
  // in the admin dashboard.
  const FALLBACK_PRICE_CHF: Record<string, number> = {
    lesson: 95,
    exam: 160,
    theory: 85,
    consultation: 60,
  }

  // Data-driven signal for the client: does this business type have dedicated
  // event_price templates (mental_coach-style, price is tenant-wide per event
  // type) or not (driving_school-style, price is set per license category)?
  const pricingMode: 'per_category' | 'per_event_type' = Object.keys(priceByCode).length > 0
    ? 'per_event_type'
    : 'per_category'

  const result = (eventTypes || []).map(e => ({
    code: e.code,
    name: e.name,
    emoji: e.emoji,
    duration_minutes: priceByCode[e.code]?.duration_minutes || e.default_duration_minutes || 45,
    price_chf: priceByCode[e.code]?.price_chf ?? FALLBACK_PRICE_CHF[e.code] ?? 0,
    require_payment: e.require_payment,
    // Only the tenant's "primary" event type is pre-checked; everything else
    // is shown but off by default, editable via the toggle.
    default_enabled: !!e.is_default,
    is_default: e.is_default,
  }))

  return { eventTypes: result, pricingMode }
})
