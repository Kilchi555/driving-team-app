// composables/useTerminology.ts
//
// Branchenspezifische Terminologie für Multi-Tenant Multi-Business-Type Setup.
//
// Verwendung in Templates (eingeloggter Tenant):
//   const { t } = useTerminology()
//   <h1>{{ t.clientsPlural }}-Verwaltung</h1>
//   <p>{{ t.client }} {{ student.first_name }} bearbeiten</p>
//
// Verwendung ausserhalb eines Tenant-Kontexts (z.B. tenant-register.vue, wo
// business_type nur lokal im Formular steht und es noch keinen Tenant gibt):
//   import { getTerminologyDefaults } from '~/composables/useTerminology'
//   const labels = computed(() => getTerminologyDefaults(formData.value.business_type))
//
// Neue Branche hinzufügen: einfach Eintrag in TERMS ergänzen (alle Felder ausfüllen).
//
// Grammatik-Hinweis: `staff`/`staffPlural` sind bewusst auf maskuline
// Berufsbezeichnungen (Fahrlehrer, Berater, Coach, Therapeut, Tutor, Trainer,
// Mitarbeiter) beschränkt, damit generische Sätze wie "Weiteren {{staff}}
// hinzufügen" ohne Sonderfall-Grammatik pro Branche funktionieren. Bei neuen
// Branchen mit femininer/neutraler Berufsbezeichnung ggf. UI-Texte prüfen.
//
// Falls Tenant kein business_type hat → fallback auf 'driving_school' (aktueller Default).

import { computed } from 'vue'

export interface Terminology {
  /** Singular: ein Kunde/Schüler (z.B. "Schüler") */
  client: string
  /** Plural: mehrere Kunden (z.B. "Schüler") */
  clientsPlural: string
  /** Possessive: "mein/dein {client}" (z.B. "Schüler") — meist gleich wie client */
  clientPossessive: string

  /** Singular: Mitarbeiter (z.B. "Fahrlehrer") */
  staff: string
  /** Plural: Mitarbeiter (z.B. "Fahrlehrer") */
  staffPlural: string

  /** Singular: Termin/Stunde/Session (z.B. "Fahrstunde") */
  appointment: string
  /** Plural: Termine (z.B. "Fahrstunden") */
  appointmentsPlural: string

  /** Verb für "buchen" einer Session (z.B. "Fahrstunde buchen") */
  bookAction: string

  /** Plural: Angebotsgruppen (z.B. "Kategorien" / "Leistungsbereiche") */
  categoriesLabel: string
  /** Singular: eine Angebotsgruppe (z.B. "Kategorie" / "Leistungsbereich") */
  categoryLabel: string

  /**
   * Generische Bezeichnung des Geschäfts selbst (z.B. "Fahrschule",
   * "Consulting-Unternehmen"). Bewusst ohne Artikel verwendet (z.B.
   * "{{businessNoun}} registrieren" statt "Deine {{businessNoun}}
   * registrieren"), um Genus-Probleme (der/die/das) bei neuen Branchen zu
   * vermeiden.
   */
  businessNoun: string

  /**
   * Tab-Label für Termin-/Ausbildungsverlauf im Kundenprofil
   * (z.B. "Fortschritt" bei Fahrschulen, "Verlauf" bei Consulting).
   */
  progressLabel: string
}

const TERMS: Record<string, Terminology> = {
  driving_school: {
    client: 'Schüler',
    clientsPlural: 'Schüler',
    clientPossessive: 'Schüler',
    staff: 'Fahrlehrer',
    staffPlural: 'Fahrlehrer',
    appointment: 'Fahrstunde',
    appointmentsPlural: 'Fahrstunden',
    bookAction: 'Fahrstunde buchen',
    categoriesLabel: 'Kategorien',
    categoryLabel: 'Kategorie',
    businessNoun: 'Fahrschule',
    progressLabel: 'Fortschritt'
  },
  // 'mental_coach' is the actual business_type code used by business_types /
  // tenant-register.vue. 'coaching' is kept as an alias for any legacy data.
  mental_coach: {
    client: 'Kunde',
    clientsPlural: 'Kunden',
    clientPossessive: 'Kunde',
    staff: 'Coach',
    staffPlural: 'Coaches',
    appointment: 'Sitzung',
    appointmentsPlural: 'Sitzungen',
    bookAction: 'Sitzung buchen',
    categoriesLabel: 'Themenbereiche',
    categoryLabel: 'Themenbereich',
    businessNoun: 'Coaching-Praxis',
    progressLabel: 'Verlauf'
  },
  consulting: {
    client: 'Kunde',
    clientsPlural: 'Kunden',
    clientPossessive: 'Kunde',
    staff: 'Berater',
    staffPlural: 'Berater',
    appointment: 'Beratung',
    appointmentsPlural: 'Beratungen',
    bookAction: 'Beratung buchen',
    categoriesLabel: 'Leistungsbereiche',
    categoryLabel: 'Leistungsbereich',
    businessNoun: 'Consulting-Unternehmen',
    progressLabel: 'Verlauf'
  },
  coaching: {
    client: 'Kunde',
    clientsPlural: 'Kunden',
    clientPossessive: 'Kunde',
    staff: 'Coach',
    staffPlural: 'Coaches',
    appointment: 'Session',
    appointmentsPlural: 'Sessions',
    bookAction: 'Session buchen',
    categoriesLabel: 'Themenbereiche',
    categoryLabel: 'Themenbereich',
    businessNoun: 'Coaching-Praxis',
    progressLabel: 'Verlauf'
  },
  therapy: {
    client: 'Patient',
    clientsPlural: 'Patienten',
    clientPossessive: 'Patient',
    staff: 'Therapeut',
    staffPlural: 'Therapeuten',
    appointment: 'Sitzung',
    appointmentsPlural: 'Sitzungen',
    bookAction: 'Sitzung buchen',
    categoriesLabel: 'Behandlungsbereiche',
    categoryLabel: 'Behandlungsbereich',
    businessNoun: 'Praxis',
    progressLabel: 'Verlauf'
  },
  tutoring: {
    client: 'Schüler',
    clientsPlural: 'Schüler',
    clientPossessive: 'Schüler',
    staff: 'Tutor',
    staffPlural: 'Tutoren',
    appointment: 'Nachhilfe',
    appointmentsPlural: 'Nachhilfestunden',
    bookAction: 'Nachhilfe buchen',
    categoriesLabel: 'Fächer',
    categoryLabel: 'Fach',
    businessNoun: 'Nachhilfeschule',
    progressLabel: 'Fortschritt'
  },
  fitness: {
    client: 'Kunde',
    clientsPlural: 'Kunden',
    clientPossessive: 'Kunde',
    staff: 'Trainer',
    staffPlural: 'Trainer',
    appointment: 'Training',
    appointmentsPlural: 'Trainings',
    bookAction: 'Training buchen',
    categoriesLabel: 'Trainingsbereiche',
    categoryLabel: 'Trainingsbereich',
    businessNoun: 'Personal-Training-Studio',
    progressLabel: 'Verlauf'
  },
  music_school: {
    client: 'Schüler',
    clientsPlural: 'Schüler',
    clientPossessive: 'Schüler',
    staff: 'Lehrperson',
    staffPlural: 'Lehrpersonen',
    appointment: 'Musikstunde',
    appointmentsPlural: 'Musikstunden',
    bookAction: 'Musikstunde buchen',
    categoriesLabel: 'Instrumente',
    categoryLabel: 'Instrument',
    businessNoun: 'Musikschule',
    progressLabel: 'Fortschritt'
  },
  dog_training: {
    client: 'Hundehalter',
    clientsPlural: 'Hundehalter',
    clientPossessive: 'Hundehalter',
    staff: 'Hundetrainer',
    staffPlural: 'Hundetrainer',
    appointment: 'Training',
    appointmentsPlural: 'Trainings',
    bookAction: 'Training buchen',
    categoriesLabel: 'Trainingsbereiche',
    categoryLabel: 'Trainingsbereich',
    businessNoun: 'Hundeschule',
    progressLabel: 'Verlauf'
  },
  massage: {
    client: 'Kunde',
    clientsPlural: 'Kunden',
    clientPossessive: 'Kunde',
    staff: 'Therapeut',
    staffPlural: 'Therapeuten',
    appointment: 'Behandlung',
    appointmentsPlural: 'Behandlungen',
    bookAction: 'Behandlung buchen',
    categoriesLabel: 'Behandlungsarten',
    categoryLabel: 'Behandlungsart',
    businessNoun: 'Praxis',
    progressLabel: 'Verlauf'
  },
  generic: {
    client: 'Kunde',
    clientsPlural: 'Kunden',
    clientPossessive: 'Kunde',
    staff: 'Mitarbeiter',
    staffPlural: 'Mitarbeiter',
    appointment: 'Termin',
    appointmentsPlural: 'Termine',
    bookAction: 'Termin buchen',
    categoriesLabel: 'Kategorien',
    categoryLabel: 'Kategorie',
    businessNoun: 'Unternehmen',
    progressLabel: 'Verlauf'
  }
}

const FALLBACK_BUSINESS_TYPE = 'driving_school'

/**
 * Pure lookup, no Vue composable dependencies. Use this whenever the
 * business_type is available as a plain value/ref outside of a logged-in
 * tenant context (e.g. tenant-register.vue, where the tenant doesn't exist
 * yet and business_type lives in local form state instead of
 * useTenantBranding()).
 */
export function getTerminologyDefaults(businessType: string | undefined | null): Terminology {
  const key = businessType && TERMS[businessType] ? businessType : FALLBACK_BUSINESS_TYPE
  return TERMS[key]
}

/** Merge DB `ui_labels` over code defaults (same pattern as staff register). */
export function mergeTerminology(
  businessType: string | undefined | null,
  uiLabels?: Record<string, string> | null,
): Terminology {
  const fallback = getTerminologyDefaults(businessType)
  if (!uiLabels || typeof uiLabels !== 'object') return fallback
  const merged = { ...fallback }
  for (const key of Object.keys(fallback) as (keyof Terminology)[]) {
    const dbValue = uiLabels[key]
    if (typeof dbValue === 'string' && dbValue.trim()) merged[key] = dbValue
  }
  return merged
}

export function isDrivingSchoolBusinessType(businessType: string | undefined | null): boolean {
  return (businessType || FALLBACK_BUSINESS_TYPE) === 'driving_school'
}

/**
 * Canonical event-type → display label map.
 * `lesson` follows tenant appointment terminology; theory/exam/etc. are shared codes.
 */
export function eventTypeLabelMap(
  terms?: Terminology | null,
  opts?: { detailedExam?: boolean },
): Record<string, string> {
  const appointment = terms?.appointment || 'Fahrstunde'
  const examLabel = opts?.detailedExam
    ? 'Prüfungsfahrt inkl. WarmUp und Rückfahrt'
    : 'Prüfung'
  return {
    lesson: appointment,
    exam: examLabel,
    theory: 'Theorieunterricht',
    consultation: 'Beratung',
    course: 'Kurs',
    staff_meeting: 'Team-Meeting',
    meeting: 'Meeting',
    vku: 'VKU',
    haltbar: 'Haltbarkeitsprüfung',
    nothelfer: 'Nothelfer',
    break: 'Pause',
    training: 'Training',
    maintenance: 'Wartung',
    admin: 'Verwaltung',
    other: 'Sonstiges',
    nfa: 'NFA',
    practical: appointment,
  }
}

/**
 * Resolve a display label for an event_type_code.
 * Prefers DB name when provided, then exact map keys, then fuzzy matches.
 */
export function resolveEventTypeLabel(
  code: string | null | undefined,
  terms?: Terminology | null,
  opts?: { detailedExam?: boolean; dbName?: string | null },
): string {
  const dbName = opts?.dbName?.trim()
  if (dbName) return dbName

  const map = eventTypeLabelMap(terms, { detailedExam: opts?.detailedExam })
  if (!code) return map.lesson

  if (map[code]) return map[code]

  const key = String(code).toLowerCase()
  if (map[key]) return map[key]
  if (key.includes('exam') || key.includes('prüf') || key.includes('pruef')) return map.exam
  if (key.includes('theor')) return map.theory
  if (key.includes('consult') || key.includes('berat')) return map.consultation
  if (key.includes('course') || key.includes('kurs')) return map.course
  if (key.includes('vku')) return map.vku
  if (key.includes('haltbar')) return map.haltbar
  if (key.includes('lesson') || key.includes('fahr') || key === 'practical') return map.lesson
  if (key.includes('meeting')) return map.meeting

  return map.lesson
}

export function useTerminology() {
  const { currentTenantBranding } = useTenantBranding()

  const businessType = computed<string>(() => {
    const raw = (currentTenantBranding.value as any)?.business_type
      || (currentTenantBranding.value as any)?.businessType
      || FALLBACK_BUSINESS_TYPE
    return TERMS[raw] ? raw : FALLBACK_BUSINESS_TYPE
  })

  const t = computed<Terminology>(() => {
    const uiLabels = (currentTenantBranding.value as any)?.ui_labels
    return mergeTerminology(businessType.value, uiLabels)
  })

  const isDrivingSchool = computed(() => isDrivingSchoolBusinessType(businessType.value))

  const eventTypeLabels = computed(() =>
    eventTypeLabelMap(t.value, { detailedExam: isDrivingSchool.value }),
  )

  const eventTypeLabel = (
    code: string | null | undefined,
    opts?: { detailed?: boolean; dbName?: string | null },
  ) =>
    resolveEventTypeLabel(code, t.value, {
      detailedExam: opts?.detailed ?? isDrivingSchool.value,
      dbName: opts?.dbName,
    })

  return { t, businessType, isDrivingSchool, eventTypeLabels, eventTypeLabel }
}
