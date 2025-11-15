import { getSupabase } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { tenant_id, business_type: overrideType, overwrite_existing } = body || {}

    if (!tenant_id) {
      throw createError({ statusCode: 400, statusMessage: 'tenant_id is required' })
    }

    const supabase = getSupabase()

    // 1) Load tenant and determine business_type
    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants')
      .select('id, name, business_type')
      .eq('id', tenant_id)
      .single()

    if (tenantErr || !tenant) {
      throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })
    }

    const businessType = overrideType || tenant.business_type || 'driving_school'

    // 2) Try to load presets from business_type_presets; fallback to inline defaults
    let presets: any | null = null
    {
      const { data: presetRow } = await supabase
        .from('business_type_presets')
        .select('feature_flags, ui_labels, defaults, business_type_code')
        .eq('business_type_code', businessType)
        .maybeSingle()
      if (presetRow) presets = presetRow
    }

    // Inline fallback defaults per business type (minimal starter set)
    const defaultsByType: Record<string, { eventTypes: any[]; categories: any[]; pricingRules: any[]; uiLabels: Record<string, string>; featureFlags: Record<string, string> }> = {
      driving_school: {
        eventTypes: [
          { code: 'lesson', name: 'Fahrstunde', require_payment: true, public_bookable: true, default_duration_minutes: 45 },
          { code: 'exam', name: 'Prüfung', require_payment: true, public_bookable: false, default_duration_minutes: 45 },
          { code: 'theory', name: 'Theorie', require_payment: true, public_bookable: true, default_duration_minutes: 45 },
        ],
        categories: [
          { code: 'B', name: 'Kategorie B', color: '#90EE90', is_active: true },
        ],
        pricingRules: [],
        uiLabels: {
          term_lesson: 'Fahrstunde',
          term_exam: 'Prüfung',
          term_category: 'Kategorie',
          verb_book: 'Buchen'
        },
        featureFlags: {
          booking_public_enabled: 'true',
          invoices_enabled: 'true',
          packages_enabled: 'false',
          product_sales_enabled: 'false',
          courses_enabled: 'true'
        }
      },
      mental_coach: {
        eventTypes: [
          { code: 'intake', name: 'Erstgespräch', require_payment: false, public_bookable: true, default_duration_minutes: 30 },
          { code: 'session', name: 'Sitzung', require_payment: true, public_bookable: true, default_duration_minutes: 60 },
          { code: 'package', name: 'Paket', require_payment: true, public_bookable: false, default_duration_minutes: 60 },
        ],
        categories: [
          { code: 'stress', name: 'Stress', color: '#7C3AED', is_active: true },
          { code: 'focus', name: 'Fokus', color: '#0EA5E9', is_active: true },
        ],
        pricingRules: [],
        uiLabels: {
          term_lesson: 'Sitzung',
          term_exam: 'Erstgespräch',
          term_category: 'Themenbereich',
          verb_book: 'Buchen'
        },
        featureFlags: {
          booking_public_enabled: 'true',
          invoices_enabled: 'true',
          packages_enabled: 'true',
          product_sales_enabled: 'false',
          courses_enabled: 'true'
        }
      }
    }

    // Build effective defaults object from presets or fallback
    const defaults = (() => {
      if (presets) {
        const featureFlags = presets.feature_flags || {}
        const uiLabels = presets.ui_labels || {}
        const defs = presets.defaults || {}
        return {
          eventTypes: defs.event_types || [],
          categories: defs.categories || [],
          pricingRules: defs.pricing_rules || [],
          uiLabels: uiLabels,
          featureFlags: featureFlags
        }
      }
      return defaultsByType[businessType] || defaultsByType['driving_school']
    })()

    // 3) Upsert categories and event_types (respect tenant scope)
    // Categories: check existing by (tenant_id, code)
    const { data: existingCats } = await supabase
      .from('categories')
      .select('id, code')
      .eq('tenant_id', tenant_id)

    const existingCatCodes = new Set((existingCats || []).map((c: any) => c.code))
    const categoriesToInsert = (defaults.categories || [])
      .filter((c: any) => overwrite_existing ? true : !existingCatCodes.has(c.code))
      .map((c: any) => ({ ...c, tenant_id }))

    if (categoriesToInsert.length > 0) {
      const { error: catInsertErr } = await supabase.from('categories').insert(categoriesToInsert)
      if (catInsertErr) {
        throw createError({ statusCode: 500, statusMessage: `Insert categories failed: ${catInsertErr.message}` })
      }
    }

    // Event types: check existing by (tenant_id, code)
    const { data: existingEts } = await supabase
      .from('event_types')
      .select('id, code')
      .eq('tenant_id', tenant_id)

    const existingEtCodes = new Set((existingEts || []).map((e: any) => e.code))
    const eventTypesToInsert = (defaults.eventTypes || [])
      .filter((e: any) => overwrite_existing ? true : !existingEtCodes.has(e.code))
      .map((e: any, idx: number) => ({
        tenant_id,
        code: e.code,
        name: e.name,
        emoji: e.emoji || '',
        description: e.description || '',
        default_duration_minutes: e.default_duration_minutes || 60,
        default_color: e.default_color || '#666666',
        is_active: e.is_active ?? true,
        display_order: idx,
        require_payment: e.require_payment ?? false,
        public_bookable: e.public_bookable ?? true,
        allowed_roles: ['staff','admin'],
        requires_team_invite: false,
        auto_generate_title: true
      }))

    if (eventTypesToInsert.length > 0) {
      const { error: etInsertErr } = await supabase.from('event_types').insert(eventTypesToInsert)
      if (etInsertErr) {
        throw createError({ statusCode: 500, statusMessage: `Insert event types failed: ${etInsertErr.message}` })
      }
    }

    // 4) Feature flags and UI labels into tenant_settings
    const settingsToUpsert: Array<{ category: string; key: string; value: string; type: string; description?: string }> = []
    for (const [key, value] of Object.entries(defaults.featureFlags)) {
      settingsToUpsert.push({ category: 'features', key, value: String(value), type: 'boolean' })
    }
    for (const [key, value] of Object.entries(defaults.uiLabels)) {
      settingsToUpsert.push({ category: 'ui_labels', key, value: String(value), type: 'string' })
    }

    for (const s of settingsToUpsert) {
      const { error: setErr } = await supabase
        .from('tenant_settings')
        .upsert({
          tenant_id,
          category: s.category,
          setting_key: s.key,
          setting_value: s.value,
          setting_type: s.type,
          description: `Seeded for ${businessType}`
        }, { onConflict: 'tenant_id,category,setting_key' })
      if (setErr) {
        throw createError({ statusCode: 500, statusMessage: `Upsert setting ${s.category}.${s.key} failed: ${setErr.message}` })
      }
    }

    return {
      success: true,
      tenant_id,
      business_type: businessType,
      inserted: {
        categories: categoriesToInsert.length,
        event_types: eventTypesToInsert.length
      }
    }
  } catch (error: any) {
    console.error('Seed defaults error:', error)
    throw createError({ statusCode: error.statusCode || 500, statusMessage: error.statusMessage || 'Internal server error' })
  }
})


