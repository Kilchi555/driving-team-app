// server/api/booking/get-booking-init.get.ts
// Single public endpoint for booking page initialization.
// Returns tenant + categories + locations count in ONE roundtrip,
// eliminating the sequential get-tenant-by-slug → get-availability waterfall.

import { defineEventHandler, getQuery, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { DEFAULT_BOOKING_POLICY, normalizeLocationIntakeModes, normalizeRegistrationFieldMode, normalizeRegistrationAccountMode } from '~/server/api/admin/booking-policy.get'
import { allowsCustomerAccountActivation } from '~/server/utils/customer-account-activation'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { parsePaymentSettings } from '~/server/utils/tenant-default-payment-method'
import {
  onlineBookingAllowedMethods,
  onlineBookingFallbackMethod,
  paymentPolicyFromTenantSettings,
} from '~/server/utils/resolve-online-booking-payment-method'
import { selectPublicBookingCatalog } from '~/server/utils/select-public-booking-catalog'

function parseFeatureEnabled(raw: unknown, fallback: boolean): boolean {
  if (raw == null) return fallback
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (typeof (parsed as any)?.enabled === 'boolean') return (parsed as any).enabled
  } catch {
    // plain "true"/"false" strings
  }
  if (raw === 'true' || raw === true) return true
  if (raw === 'false' || raw === false) return false
  return fallback
}

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
    .select('id, name, slug, business_type, primary_color, secondary_color, accent_color, logo_url, logo_square_url, logo_wide_url, booking_policy, wallee_enabled')
    .eq('slug', slug)
    .single()

  if (tenantErr || !tenant) {
    throw createError({ statusCode: 404, message: `Tenant not found: ${slug}` })
  }

  let categories: any[] = []
  let locationsCount = 0
  let availableServiceTypes: Array<'fahrstunde' | 'theorie' | 'beratung'> = []

  const settingsPromise = getSupabaseAdmin()
    .from('tenant_settings')
    .select('category, setting_key, setting_value')
    .eq('tenant_id', tenant.id)
    .in('setting_key', ['allow_online_booking', 'customer_plz_travel_check_enabled', 'payment_settings'])

  const [categoriesResult, eventTypesResult, locationsResult, pricingRulesResult] = await Promise.all([
    supabase
      .from('categories')
      .select('id, code, name, description, lesson_duration_minutes, tenant_id, parent_category_id, color, icon_svg, vehicle_settings, room_settings')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .order('parent_category_id', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from('event_types')
      .select('id, code, name, description, default_duration_minutes, default_color, emoji, public_bookable, require_payment, display_order, payment_method')
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
    supabase
      .from('pricing_rules')
      .select('rule_type')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true),
  ])

  if (categoriesResult.error) throw categoriesResult.error
  if (eventTypesResult.error) throw eventTypesResult.error
  if (locationsResult.error) throw locationsResult.error

  const catalog = selectPublicBookingCatalog({
    tenantId: tenant.id,
    primaryColor: tenant.primary_color,
    categories: categoriesResult.data || [],
    publicEventTypes: eventTypesResult.data || [],
  })
  categories = catalog.categories
  locationsCount = locationsResult.data?.length ?? 0

  if (catalog.source === 'categories') {
    const ruleTypes = new Set((pricingRulesResult.data || []).map((r: any) => r.rule_type))
    if (ruleTypes.has('base_price')) availableServiceTypes.push('fahrstunde')
    if (ruleTypes.has('theory')) availableServiceTypes.push('theorie')
    if (ruleTypes.has('consultation')) availableServiceTypes.push('beratung')
  } else if (catalog.source === 'event_types') {
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
    ask_acquisition_source: rawPolicy.ask_acquisition_source === true,
    require_payment_before_confirm: rawPolicy.require_payment_before_confirm === true,
    allow_customer_account_activation: allowsCustomerAccountActivation(rawPolicy),
  }

  // Strip booking_policy from tenant object before returning (avoid leaking internal settings)
  const { booking_policy: _bp, ...tenantPublic } = tenant as any

  let allowOnlineBooking = true
  let pickupTravelCheck = false
  let cashVisibleForCustomer = false
  let invoicePaymentsEnabled = false
  const paymentPolicy = paymentPolicyFromTenantSettings({
    settings: {},
    walleeEnabled: (tenant as any).wallee_enabled,
  })
  let onlinePaymentMethods = onlineBookingAllowedMethods(paymentPolicy)
  let defaultOnlinePaymentMethod = onlineBookingFallbackMethod(paymentPolicy)
  try {
    const { data: settingRows } = await settingsPromise
    for (const row of settingRows ?? []) {
      if (row.setting_key === 'allow_online_booking') {
        allowOnlineBooking = parseFeatureEnabled(row.setting_value, true)
      } else if (row.setting_key === 'customer_plz_travel_check_enabled') {
        pickupTravelCheck = parseFeatureEnabled(row.setting_value, false)
      } else if (row.setting_key === 'payment_settings') {
        const payment = parsePaymentSettings(row.setting_value)
        const resolvedPolicy = paymentPolicyFromTenantSettings({
          settings: payment,
          walleeEnabled: (tenant as any).wallee_enabled,
        })
        cashVisibleForCustomer = resolvedPolicy.cashEnabledForCustomers
        invoicePaymentsEnabled = resolvedPolicy.invoiceEnabled
        onlinePaymentMethods = onlineBookingAllowedMethods(resolvedPolicy)
        defaultOnlinePaymentMethod = onlineBookingFallbackMethod(resolvedPolicy)
      }
    }
  } catch {
    // Keep defaults if settings lookup fails
  }

  const { wallee_enabled: _walleeEnabled, ...tenantWithoutSecrets } = tenantPublic as any

  return {
    success: true,
    data: {
      tenant: tenantWithoutSecrets,
      categories,
      catalog_source: catalog.source,
      locationsCount,
      bookingPolicy,
      availableServiceTypes,
      allow_online_booking: allowOnlineBooking,
      pickup_travel_check: pickupTravelCheck,
      cash_visible_for_customer: cashVisibleForCustomer,
      invoice_payments_enabled: invoicePaymentsEnabled,
      online_payment_methods: onlinePaymentMethods,
      default_online_payment_method: defaultOnlinePaymentMethod,
      event_type_payment_methods: Object.fromEntries(
        (eventTypesResult.data || []).map((row: { code?: string; payment_method?: string | null }) => [
          row.code,
          row.payment_method ?? null,
        ])
      ),
    },
  }
})
