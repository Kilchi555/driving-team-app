// utils/fallbackPricingRules.ts
//
// Single source of truth for the hardcoded pricing fallback used when a
// tenant's real pricing_rules cannot be loaded from the database (API
// unreachable, category not configured yet, etc). Framework-agnostic so it
// can be imported from both client composables (composables/usePricing.ts)
// and server endpoints (e.g. server/api/appointments/save.post.ts) without
// each maintaining its own drifting copy of these numbers.
//
// IMPORTANT: every call site using this fallback should also report it via
// logFallbackUsed()/server/utils/log-fallback.ts so fallback usage is visible
// in the super-admin "Error Monitoring" dashboard.

export interface FallbackPricingRule {
  id: string
  category_code: string
  name: string
  description: string
  price_per_minute_rappen: number
  price_per_minute_chf: number
  admin_fee_rappen: number
  admin_fee_chf: number
  admin_fee_applies_from: number
  base_duration_minutes: number
  is_active: boolean
  valid_from: string | null
  valid_until: string | null
  rule_name: string
}

// ===== FALLBACK RULES (basierend auf tatsächlichen DB-Daten) =====
export const COMPLETE_FALLBACK_RULES: FallbackPricingRule[] = [
  {
    id: 'fallback-B', category_code: 'B', name: 'Autoprüfung Kategorie B',
    description: 'Personenwagen bis 3500kg',
    price_per_minute_rappen: 211, price_per_minute_chf: 2.11, // 95 CHF / 45min = 2.11
    admin_fee_rappen: 12000, admin_fee_chf: 120, admin_fee_applies_from: 2,
    base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback B'
  },
  {
    id: 'fallback-A', category_code: 'A', name: 'Kategorie A (Motorrad)',
    description: 'Motorrad unbeschränkt',
    price_per_minute_rappen: 211, price_per_minute_chf: 2.11, // 95 CHF / 45min = 2.11
    admin_fee_rappen: 0, admin_fee_chf: 0, admin_fee_applies_from: 999, // Motorräder: keine Admin-Fee
    base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback A'
  },
  {
    id: 'fallback-A1', category_code: 'A1', name: 'Motorrad A1/A35kW/A',
    description: 'Leichtmotorrad 125ccm',
    price_per_minute_rappen: 211, price_per_minute_chf: 2.11, // 95 CHF / 45min = 2.11
    admin_fee_rappen: 0, admin_fee_chf: 0, admin_fee_applies_from: 999, // Motorräder: keine Admin-Fee
    base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback A1'
  },
  {
    id: 'fallback-A35kW', category_code: 'A35kW', name: 'Kategorie A 35kW',
    description: 'Motorrad mit Leistungsbeschränkung',
    price_per_minute_rappen: 211, price_per_minute_chf: 2.11, // 95 CHF / 45min = 2.11
    admin_fee_rappen: 0, admin_fee_chf: 0, admin_fee_applies_from: 999, // Motorräder: keine Admin-Fee
    base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback A35kW'
  },
  {
    id: 'fallback-BE', category_code: 'BE', name: 'Anhänger BE',
    description: 'Personenwagen mit Anhänger',
    price_per_minute_rappen: 267, price_per_minute_chf: 2.67, // 120 CHF / 45min = 2.67
    admin_fee_rappen: 12000, admin_fee_chf: 120, admin_fee_applies_from: 2,
    base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback BE'
  },
  {
    id: 'fallback-C', category_code: 'C', name: 'LKW C',
    description: 'Lastwagen über 3500kg',
    price_per_minute_rappen: 378, price_per_minute_chf: 3.78, // 170 CHF / 45min = 3.78
    admin_fee_rappen: 20000, admin_fee_chf: 200, admin_fee_applies_from: 2,
    base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback C'
  },
  {
    id: 'fallback-C1', category_code: 'C1', name: 'LKW C1/D1',
    description: 'Kleinlastwagen 3500-7500kg',
    price_per_minute_rappen: 334, price_per_minute_chf: 3.34, // Updated from database
    admin_fee_rappen: 20000, admin_fee_chf: 200, admin_fee_applies_from: 2,
    base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback C1'
  },
  {
    id: 'fallback-CE', category_code: 'CE', name: 'LKW CE',
    description: 'Lastwagen mit Anhänger',
    price_per_minute_rappen: 445, price_per_minute_chf: 4.45, // Updated from database
    admin_fee_rappen: 25000, admin_fee_chf: 250, admin_fee_applies_from: 2,
    base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback CE'
  },
  {
    id: 'fallback-D', category_code: 'D', name: 'Bus D',
    description: 'Autobus über 8 Personen',
    price_per_minute_rappen: 445, price_per_minute_chf: 4.45, // Updated from database
    admin_fee_rappen: 30000, admin_fee_chf: 300, admin_fee_applies_from: 2,
    base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback D'
  },
  {
    id: 'fallback-D1', category_code: 'D1', name: 'D1 (Kleinbus)',
    description: 'Kleinbus 9-16 Personen',
    price_per_minute_rappen: 334, price_per_minute_chf: 3.34, // Updated from database
    admin_fee_rappen: 20000, admin_fee_chf: 200, admin_fee_applies_from: 2,
    base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback D1'
  },
  {
    id: 'fallback-Boot', category_code: 'Motorboot', name: 'Motorboot',
    description: 'Motorbootführerschein',
    price_per_minute_rappen: 211, price_per_minute_chf: 2.11, // 95 CHF / 45min = 2.11
    admin_fee_rappen: 12000, admin_fee_chf: 120, admin_fee_applies_from: 2,
    base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback Motorboot'
  },
  {
    id: 'fallback-BPT', category_code: 'BPT', name: 'Berufsprüfung Transport',
    description: 'Berufskraftfahrer Theorieprüfung',
    price_per_minute_rappen: 222, price_per_minute_chf: 2.22, // 100 CHF / 45min = 2.22
    admin_fee_rappen: 12000, admin_fee_chf: 120, admin_fee_applies_from: 2,
    base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback BPT'
  }
]

export const getFallbackRule = (categoryCode: string): FallbackPricingRule | null => {
  const category = (categoryCode || '').split(',')[0].trim().toUpperCase()
  return COMPLETE_FALLBACK_RULES.find(rule => rule.category_code.toUpperCase() === category)
    // 'Boot' isn't its own fallback entry - it shares Motorboot's fallback pricing.
    || (category === 'BOOT' ? COMPLETE_FALLBACK_RULES.find(rule => rule.category_code === 'Motorboot') : null)
    || null
}
