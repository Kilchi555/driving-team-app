// server/api/booking/get-booking-init.get.ts
// Single public endpoint for booking page initialization.
// Returns tenant + categories + locations count in ONE roundtrip,
// eliminating the sequential get-tenant-by-slug → get-availability waterfall.

import { defineEventHandler, getQuery, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { DEFAULT_BOOKING_POLICY, normalizeLocationIntakeModes, normalizeRegistrationFieldMode, normalizeRegistrationAccountMode } from '~/server/api/admin/booking-policy.get'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const { slug } = getQuery(event)

  if (!slug || typeof slug !== 'string') {
    throw createError({ statusCode: 400, message: 'slug is required' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_ANON_KEY || ''
  )

  // Resolve slug to tenant
  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .select('id, name, slug, business_type, primary_color, secondary_color, accent_color, logo_url, logo_square_url, logo_wide_url, booking_policy')
    .eq('slug', slug)
    .single()

  if (tenantErr || !tenant) {
    throw createError({ statusCode: 404, message: `Tenant not found: ${slug}` })
  }

  let categories: any[] = []
  let locationsCount = 0
  // Which booking service types (Fahrstunde/Theorie/Beratung) this tenant actually
  // offers — derived from active pricing_rules, not hardcoded on the client.
  let availableServiceTypes: Array<'fahrstunde' | 'theorie' | 'beratung'> = []

  if (tenant.business_type === 'driving_school') {
    // Load categories + locations + pricing rule types in parallel (no extra roundtrip)
    const [categoriesResult, locationsResult, pricingRulesResult] = await Promise.all([
      supabase
        .from('categories')
        .select('id, code, name, description, lesson_duration_minutes, tenant_id, parent_category_id, color, icon_svg, vehicle_settings, room_settings')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .order('parent_category_id', { ascending: true })
        .order('name', { ascending: true }),
      supabase
        .from('locations')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true),
      supabase
        .from('pricing_rules')
        .select('rule_type')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true),
    ])

    if (categoriesResult.error) throw categoriesResult.error
    if (locationsResult.error) throw locationsResult.error

    const allCategories = categoriesResult.data || []
    const mainCategories = allCategories.filter((c: any) => !c.parent_category_id)
    const subCategories = allCategories.filter((c: any) => !!c.parent_category_id)

    categories = mainCategories.map((main: any) => ({
      ...main,
      children: subCategories.filter((sub: any) => sub.parent_category_id === main.id),
    }))

    locationsCount = locationsResult.data?.length ?? 0

    const ruleTypes = new Set((pricingRulesResult.data || []).map((r: any) => r.rule_type))
    if (ruleTypes.has('base_price')) availableServiceTypes.push('fahrstunde')
    if (ruleTypes.has('theory')) availableServiceTypes.push('theorie')
    if (ruleTypes.has('consultation')) availableServiceTypes.push('beratung')
  } else {
    // per_event_type (and other non-FS): expose public_bookable event types as
    // selectable "categories" so the existing booking UI can reuse the leaf path
    // (no children → selectMainCategory uses the item directly).
    const [eventTypesResult, locationsResult] = await Promise.all([
      supabase
        .from('event_types')
        .select('id, code, name, description, default_duration_minutes, default_color, emoji, public_bookable, require_payment, display_order')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .eq('public_bookable', true)
        .gt('default_duration_minutes', 0)
        .order('display_order', { ascending: true }),
      supabase
        .from('locations')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true),
    ])

    if (eventTypesResult.error) throw eventTypesResult.error
    if (locationsResult.error) throw locationsResult.error

    categories = (eventTypesResult.data || []).map((et: any) => ({
      id: et.id,
      code: et.code,
      name: et.name,
      description: et.description || '',
      lesson_duration_minutes: [Number(et.default_duration_minutes)],
      tenant_id: tenant.id,
      parent_category_id: null,
      color: et.default_color || null,
      icon_svg: null,
      children: [],
      _source: 'event_type',
      require_payment: et.require_payment !== false,
    }))

    locationsCount = locationsResult.data?.length ?? 0
    // Booking UI always includes "fahrstunde" as the generic appointment path
    availableServiceTypes = ['fahrstunde']
  }

  // Expose only the customer-facing policy fields (not internal staff settings)
  const rawPolicy = (tenant as any).booking_policy ?? {}
  const bookingPolicy = {
    registration_required: rawPolicy.registration_required ?? DEFAULT_BOOKING_POLICY.registration_required,
    booking_required_fields: rawPolicy.booking_required_fields ?? DEFAULT_BOOKING_POLICY.booking_required_fields,
    booking_optional_fields: rawPolicy.booking_optional_fields ?? DEFAULT_BOOKING_POLICY.booking_optional_fields,
    location_intake_modes: normalizeLocationIntakeModes(rawPolicy),
    registration_categories_mode: normalizeRegistrationFieldMode(
      rawPolicy.registration_categories_mode,
      DEFAULT_BOOKING_POLICY.registration_categories_mode
    ),
    registration_lernfahrausweis_mode: normalizeRegistrationFieldMode(
      rawPolicy.registration_lernfahrausweis_mode,
      DEFAULT_BOOKING_POLICY.registration_lernfahrausweis_mode
    ),
    registration_proposal_mode: normalizeRegistrationFieldMode(
      rawPolicy.registration_proposal_mode,
      DEFAULT_BOOKING_POLICY.registration_proposal_mode
    ),
    registration_account_mode: normalizeRegistrationAccountMode(
      rawPolicy.registration_account_mode,
      DEFAULT_BOOKING_POLICY.registration_account_mode
    ),
    onboarding_sms_enabled: rawPolicy.onboarding_sms_enabled ?? DEFAULT_BOOKING_POLICY.onboarding_sms_enabled,
    onboarding_email_enabled: rawPolicy.onboarding_email_enabled ?? DEFAULT_BOOKING_POLICY.onboarding_email_enabled,
  }

  // Strip booking_policy from tenant object before returning (avoid leaking internal settings)
  const { booking_policy: _bp, ...tenantPublic } = tenant as any

  // Public booking page cannot rely on useFeatures() (guests have no auth tenant_id).
  // Default true when unset for backwards compatibility with tenants that never toggled the flag.
  let allowOnlineBooking = true
  try {
    const { data: featureRow } = await getSupabaseAdmin()
      .from('tenant_settings')
      .select('setting_value')
      .eq('tenant_id', tenant.id)
      .eq('category', 'features')
      .eq('setting_key', 'allow_online_booking')
      .maybeSingle()

    if (featureRow?.setting_value) {
      try {
        const parsed = JSON.parse(featureRow.setting_value)
        if (typeof parsed.enabled === 'boolean') {
          allowOnlineBooking = parsed.enabled
        }
      } catch {
        allowOnlineBooking = featureRow.setting_value === 'true'
      }
    }
  } catch {
    // Keep default true if feature lookup fails
  }

  return {
    success: true,
    data: {
      tenant: tenantPublic,
      categories,
      locationsCount,
      bookingPolicy,
      availableServiceTypes,
      allow_online_booking: allowOnlineBooking,
    },
  }
})
