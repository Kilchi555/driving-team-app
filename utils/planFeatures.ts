// utils/planFeatures.ts
// Central source of truth for subscription plans and add-ons.
// Prices are intentionally not hardcoded here – define them in Stripe Dashboard
// and set the Price IDs via env vars.

export type SubscriptionPlan = 'trial' | 'starter' | 'professional' | 'enterprise'
export type AddonKey = 'seats' | 'courses' | 'affiliate'

export interface PlanDefinition {
  id: SubscriptionPlan
  name: string
  tagline: string
  priceEnvKey: string | null
  features: string[]
  // Which features are included in the base plan (no add-on needed)
  includedFeatures: string[]
  // Max included staff seats (null = unlimited)
  includedSeats: number | null
  highlighted?: boolean
}

export interface AddonDefinition {
  key: AddonKey
  name: string
  description: string
  priceEnvKey: string
  // true = per-unit pricing (Stripe per_unit), false = flat rate
  perUnit: boolean
  // Feature flag this add-on enables (null if it grants seats instead)
  featureFlag: string | null
}

// ─── Plans ───────────────────────────────────────────────────────────────────

export const PLANS: PlanDefinition[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Alles für den Einzelfahrlehrer',
    priceEnvKey: 'STRIPE_PRICE_STARTER',
    highlighted: true,
    features: [
      'Onlineterminbuchung',
      'Kundenverwaltung',
      'Kalender & Verfügbarkeit',
      'Rechnungen & Zahlungen',
      'Auswertungen & Statistiken',
      'Prüfungsverwaltung',
      'Kassenverwaltung',
      'Gutscheine & Rabatte',
      'E-Mail Support',
    ],
    includedFeatures: [
      'invoices_enabled',
      'categories_enabled',
      'evaluations_enabled',
      'cancellation_management_enabled',
      'staff_hours_enabled',
      'reminders_enabled',
      'data_management_enabled',
      'cash_management_enabled',
      'discounts_enabled',
      'exams_enabled',
      'experts_enabled',
    ],
    includedSeats: 1,
  },
  {
    id: 'professional',
    name: 'Professional',
    tagline: 'Für wachsende Fahrschulen',
    priceEnvKey: 'STRIPE_PRICE_PROFESSIONAL',
    features: [
      'Alles aus Starter',
      'Bis zu 5 Fahrlehrer',
      'Kursbuchungsseite',
      'Prioritäts-Support',
    ],
    includedFeatures: [
      'invoices_enabled',
      'categories_enabled',
      'evaluations_enabled',
      'cancellation_management_enabled',
      'staff_hours_enabled',
      'reminders_enabled',
      'data_management_enabled',
      'courses_enabled',
      'exams_enabled',
      'experts_enabled',
    ],
    includedSeats: 5,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Für grosse Fahrschulen & Ketten',
    priceEnvKey: 'STRIPE_PRICE_ENTERPRISE',
    features: [
      'Alles aus Professional',
      'Unbegrenzte Fahrlehrer',
      'Affiliate-System',
      'Dedizierter Support',
    ],
    includedFeatures: [
      'invoices_enabled',
      'categories_enabled',
      'evaluations_enabled',
      'cancellation_management_enabled',
      'staff_hours_enabled',
      'reminders_enabled',
      'data_management_enabled',
      'courses_enabled',
      'exams_enabled',
      'experts_enabled',
      'affiliate_enabled',
      'product_sales_enabled',
    ],
    includedSeats: null,
  },
]

// Trial gets full access so customers can explore everything
export const TRIAL_FEATURES: string[] = [
  'invoices_enabled',
  'categories_enabled',
  'evaluations_enabled',
  'cancellation_management_enabled',
  'staff_hours_enabled',
  'reminders_enabled',
  'data_management_enabled',
  'courses_enabled',
  'exams_enabled',
  'experts_enabled',
  'affiliate_enabled',
  'cash_management_enabled',
  'discounts_enabled',
  'product_sales_enabled',
]

// ─── Add-ons ─────────────────────────────────────────────────────────────────

export const ADDONS: AddonDefinition[] = [
  {
    key: 'seats',
    name: 'Fahrlehrer Seat',
    description: 'Zusätzlicher Fahrlehrer-Account',
    priceEnvKey: 'STRIPE_PRICE_ADDON_SEATS',
    perUnit: true,
    featureFlag: null,
  },
  {
    key: 'courses',
    name: 'Kursbuchungsseite',
    description: 'Online-Kursbuchung für Schüler',
    priceEnvKey: 'STRIPE_PRICE_ADDON_COURSES',
    perUnit: false,
    featureFlag: 'courses_enabled',
  },
  {
    key: 'affiliate',
    name: 'Affiliate-System',
    description: 'Empfehlungsprogramm & Partner-Tracking',
    priceEnvKey: 'STRIPE_PRICE_ADDON_AFFILIATE',
    perUnit: false,
    featureFlag: 'affiliate_enabled',
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getPlanById(id: string): PlanDefinition | undefined {
  return PLANS.find(p => p.id === id)
}

export function getAddonByKey(key: string): AddonDefinition | undefined {
  return ADDONS.find(a => a.key === key)
}

export function getPriceIdForPlan(plan: SubscriptionPlan): string | undefined {
  const def = getPlanById(plan)
  if (!def?.priceEnvKey) return undefined
  return process.env[def.priceEnvKey]
}

export function getPriceIdForAddon(key: AddonKey): string | undefined {
  const def = getAddonByKey(key)
  if (!def) return undefined
  return process.env[def.priceEnvKey]
}

// Build the complete list of active feature flags for a plan + active add-ons
export function resolveFeatureFlags(
  plan: SubscriptionPlan,
  addons: { courses?: boolean; affiliate?: boolean } = {}
): string[] {
  if (plan === 'trial') return [...TRIAL_FEATURES]

  const planDef = getPlanById(plan)
  const flags = new Set(planDef?.includedFeatures ?? [])

  if (addons.courses) flags.add('courses_enabled')
  if (addons.affiliate) flags.add('affiliate_enabled')

  return Array.from(flags)
}

// All known feature flags (for disabling unlisted ones during sync)
export const ALL_FEATURE_FLAGS = [
  'invoices_enabled',
  'categories_enabled',
  'evaluations_enabled',
  'cancellation_management_enabled',
  'staff_hours_enabled',
  'reminders_enabled',
  'data_management_enabled',
  'courses_enabled',
  'exams_enabled',
  'experts_enabled',
  'affiliate_enabled',
  'cash_management_enabled',
  'discounts_enabled',
  'product_sales_enabled',
]
