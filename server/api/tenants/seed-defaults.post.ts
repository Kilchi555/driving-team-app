import { getSupabaseAdmin } from '~/utils/supabase'

// ─── Color utilities ──────────────────────────────────────────────────────────

/** Parse any CSS hex color (#rgb or #rrggbb) → [r, g, b] 0-255 */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  if (h.length === 3) {
    return [
      parseInt(h[0] + h[0], 16),
      parseInt(h[1] + h[1], 16),
      parseInt(h[2] + h[2], 16)
    ]
  }
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
}

/** Convert RGB → HSL (h: 0-360, s: 0-100, l: 0-100) */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l * 100]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
  else if (max === gn) h = ((bn - rn) / d + 2) / 6
  else h = ((rn - gn) / d + 4) / 6
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100, ln = l / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = sn * Math.min(ln, 1 - ln)
  const f = (n: number) => ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255)
}

/**
 * Given primary and optional secondary hex colors, returns a palette of
 * `count` distinct, harmonious hues that don't clash with the inputs.
 * Strategy: rotate hue in 60° steps starting 120° away from primary,
 * skipping any hue within 30° of primary or secondary.
 */
function buildHarmoniousPalette(primary: string, secondary: string | null, count: number): string[] {
  const [ph] = rgbToHsl(...hexToRgb(primary))
  const blocked = [ph]
  if (secondary) blocked.push(rgbToHsl(...hexToRgb(secondary))[0])

  const isTooClose = (h: number) => blocked.some(b => {
    const diff = Math.abs(h - b)
    return Math.min(diff, 360 - diff) < 35
  })

  // Fixed, visually distinct base hues spread around the wheel
  const candidates = [0, 30, 60, 120, 180, 210, 240, 270, 300, 330]
  const palette: string[] = []

  for (const hue of candidates) {
    if (palette.length >= count) break
    if (!isTooClose(hue)) {
      // Use moderate saturation & lightness for calendar readability
      palette.push(hslToHex(hue, 65, 45))
    }
  }

  // Fill remaining slots with shifted variants if needed
  let offset = 15
  while (palette.length < count) {
    for (const base of candidates) {
      if (palette.length >= count) break
      const hue = (base + offset) % 360
      if (!isTooClose(hue)) palette.push(hslToHex(hue, 60, 48))
    }
    offset += 15
  }

  return palette
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { tenant_id, business_type: overrideType, overwrite_existing } = body || {}

    if (!tenant_id) {
      throw createError({ statusCode: 400, statusMessage: 'tenant_id is required' })
    }

    const supabase = getSupabaseAdmin()

    // 1) Load tenant including branding colors
    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants')
      .select('id, name, business_type, primary_color, secondary_color')
      .eq('id', tenant_id)
      .single()

    if (tenantErr || !tenant) {
      throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })
    }

    const businessType = overrideType || tenant.business_type || 'driving_school'

    // Tenant branding colors (fallback to safe defaults)
    const primaryColor: string = tenant.primary_color || '#3B82F6'
    const secondaryColor: string | null = tenant.secondary_color || null

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
          { code: 'lesson',   name: 'Fahrstunde', require_payment: true,  public_bookable: true,  default_duration_minutes: 45 },
          { code: 'exam',     name: 'Prüfung',    require_payment: true,  public_bookable: false, default_duration_minutes: 45 },
          { code: 'theory',   name: 'Theorie',    require_payment: true,  public_bookable: true,  default_duration_minutes: 45 },
          { code: 'vacation', name: 'Ferien',      require_payment: false, public_bookable: false, default_duration_minutes: 480, emoji: '🏖️',  default_color: '#94a3b8', display_order: 98 },
          { code: 'course',   name: 'Kurs',        require_payment: false, public_bookable: false, default_duration_minutes: 480, emoji: '📚', default_color: '#6366f1', display_order: 99 },
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

    // Categories: first gets primary, second gets secondary, rest get harmonious palette
    const allCats = defaults.categories || []
    const catPalette = buildHarmoniousPalette(primaryColor, secondaryColor, Math.max(allCats.length, 6))

    const categoriesToInsert = allCats
      .filter((c: any) => overwrite_existing ? true : !existingCatCodes.has(c.code))
      .map((c: any, idx: number) => {
        let color = c.color
        if (!color) {
          if (idx === 0) color = primaryColor
          else if (idx === 1) color = secondaryColor || catPalette[0]
          else color = catPalette[idx - 2] || catPalette[idx % catPalette.length]
        }
        return { ...c, color, tenant_id }
      })

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

    // Core lesson types get primary/secondary, remaining get harmonious extras
    const coreTypeCodes = ['lesson', 'exam', 'theory', 'session', 'intake']
    const coreColors = [
      primaryColor,
      secondaryColor || hslToHex((rgbToHsl(...hexToRgb(primaryColor))[0] + 180) % 360, 60, 45),
      hslToHex((rgbToHsl(...hexToRgb(primaryColor))[0] + 120) % 360, 55, 48),
    ]
    const otherEventTypes = (defaults.eventTypes || []).filter((e: any) => !coreTypeCodes.includes(e.code))
    const otherPalette = buildHarmoniousPalette(primaryColor, secondaryColor, Math.max(otherEventTypes.length, 4))

    const eventTypesToInsert = (defaults.eventTypes || [])
      .filter((e: any) => overwrite_existing ? true : !existingEtCodes.has(e.code))
      .map((e: any, idx: number) => {
        // Assign color: core types → primary/secondary/triadic, others → harmonious palette
        let color = e.default_color
        if (!color) {
          const coreIdx = coreTypeCodes.indexOf(e.code)
          if (coreIdx >= 0) {
            color = coreColors[coreIdx % coreColors.length]
          } else {
            const otherIdx = otherEventTypes.findIndex((o: any) => o.code === e.code)
            color = otherPalette[otherIdx % otherPalette.length] || '#6b7280'
          }
        }
        return {
          tenant_id,
          code: e.code,
          name: e.name,
          emoji: e.emoji || '',
          description: e.description || '',
          default_duration_minutes: e.default_duration_minutes || 60,
          default_color: color,
          is_active: e.is_active ?? true,
          display_order: idx,
          require_payment: e.require_payment ?? false,
          public_bookable: e.public_bookable ?? true,
          allowed_roles: ['staff', 'admin'],
          requires_team_invite: false,
          auto_generate_title: true
        }
      })

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


