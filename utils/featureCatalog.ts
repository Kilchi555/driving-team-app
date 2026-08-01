/**
 * Canonical UI metadata for tenant feature flags.
 * Merged over DB `tenant_settings` rows so toggles stay visible even when
 * syncFeatureFlags only wrote `{ enabled: bool }`.
 */

export type FeatureCatalogEntry = {
  displayName: string
  description: string
  icon: string
  sortOrder: number
  /** Hide from non-driving-school tenants in the admin toggle UI */
  drivingSchoolOnly?: boolean
}

export const FEATURE_CATALOG: Record<string, FeatureCatalogEntry> = {
  invoices_enabled: {
    displayName: 'Rechnungen',
    description: 'Rechnungen erstellen und versenden',
    icon: '🧾',
    sortOrder: 10
  },
  categories_enabled: {
    displayName: 'Kategorien',
    description: 'Kategorien / Leistungsbereiche verwalten',
    icon: '🏷️',
    sortOrder: 20,
    drivingSchoolOnly: true
  },
  evaluations_enabled: {
    displayName: 'Termindokumentation',
    description: 'Termine dokumentieren und bewerten (Themen, Notizen, Bewertungen)',
    icon: '📝',
    sortOrder: 30
  },
  exams_enabled: {
    displayName: 'Prüfungen',
    description: 'Prüfungstermine und Resultate verwalten',
    icon: '🎓',
    sortOrder: 40
  },
  experts_enabled: {
    displayName: 'Experten',
    description: 'Prüfungsexperten verwalten',
    icon: '👤',
    sortOrder: 45,
    drivingSchoolOnly: true
  },
  examiners_enabled: {
    displayName: 'Prüfer',
    description: 'Prüfer verwalten',
    icon: '✅',
    sortOrder: 46,
    drivingSchoolOnly: true
  },
  cancellation_management_enabled: {
    displayName: 'Absagen-Verwaltung',
    description: 'Absagen und Umbuchungen zentral verwalten',
    icon: '🚫',
    sortOrder: 50
  },
  staff_hours_enabled: {
    displayName: 'Arbeitszeiten',
    description: 'Arbeitszeiten der Mitarbeitenden erfassen',
    icon: '⏱️',
    sortOrder: 60
  },
  reminders_enabled: {
    displayName: 'Erinnerungen',
    description: 'Automatische Termin- und Zahlungserinnerungen',
    icon: '🔔',
    sortOrder: 70
  },
  data_management_enabled: {
    displayName: 'Daten-Import',
    description: 'Daten importieren und verwalten',
    icon: '📥',
    sortOrder: 80
  },
  cash_management_enabled: {
    displayName: 'Kasse',
    description: 'Bargeld und Kassenbestand verwalten',
    icon: '💵',
    sortOrder: 90
  },
  discounts_enabled: {
    displayName: 'Rabatte',
    description: 'Rabatte und Gutscheine',
    icon: '🏷️',
    sortOrder: 100
  },
  product_sales_enabled: {
    displayName: 'Produktverkauf',
    description: 'Produkte verkaufen und verrechnen',
    icon: '🛒',
    sortOrder: 110
  },
  courses_enabled: {
    displayName: 'Kurse',
    description: 'Gruppenkurse und Anmeldungen',
    icon: '📚',
    sortOrder: 120
  },
  affiliate_enabled: {
    displayName: 'Affiliate',
    description: 'Empfehlungsprogramm',
    icon: '🤝',
    sortOrder: 130
  }
}

/** Flags that stay off by default for non-driving-school tenants (even on trial). */
export const NON_DRIVING_SCHOOL_DEFAULT_OFF = new Set([
  'evaluations_enabled',
  'exams_enabled',
  'experts_enabled',
  'examiners_enabled',
  'categories_enabled'
])
