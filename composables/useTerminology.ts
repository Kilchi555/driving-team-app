// composables/useTerminology.ts
//
// Branchenspezifische Terminologie für Multi-Tenant Multi-Business-Type Setup.
//
// Verwendung in Templates:
//   const { t } = useTerminology()
//   <h1>{{ t.clientsPlural }}-Verwaltung</h1>
//   <p>{{ t.client }} {{ student.first_name }} bearbeiten</p>
//
// Neue Branche hinzufügen: einfach Eintrag in TERMS ergänzen.
//
// Falls Tenant kein business_type hat → fallback auf 'driving_school' (aktueller Default).

import { computed } from 'vue'

export interface Terminology {
  /** Singular: ein Kunde/Schüler/Klient (z.B. "Schüler") */
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
}

const TERMS: Record<string, Terminology> = {
  driving_school: {
    client: 'Benutzer',
    clientsPlural: 'Benutzer',
    clientPossessive: 'Benutzer',
    staff: 'Fahrlehrer',
    staffPlural: 'Fahrlehrer',
    appointment: 'Fahrstunde',
    appointmentsPlural: 'Fahrstunden',
    bookAction: 'Fahrstunde buchen'
  },
  coaching: {
    client: 'Klient',
    clientsPlural: 'Klienten',
    clientPossessive: 'Klient',
    staff: 'Coach',
    staffPlural: 'Coaches',
    appointment: 'Session',
    appointmentsPlural: 'Sessions',
    bookAction: 'Session buchen'
  },
  therapy: {
    client: 'Patient',
    clientsPlural: 'Patienten',
    clientPossessive: 'Patient',
    staff: 'Therapeut',
    staffPlural: 'Therapeuten',
    appointment: 'Sitzung',
    appointmentsPlural: 'Sitzungen',
    bookAction: 'Sitzung buchen'
  },
  tutoring: {
    client: 'Schüler',
    clientsPlural: 'Schüler',
    clientPossessive: 'Schüler',
    staff: 'Tutor',
    staffPlural: 'Tutoren',
    appointment: 'Nachhilfe',
    appointmentsPlural: 'Nachhilfestunden',
    bookAction: 'Nachhilfe buchen'
  },
  fitness: {
    client: 'Mitglied',
    clientsPlural: 'Mitglieder',
    clientPossessive: 'Mitglied',
    staff: 'Trainer',
    staffPlural: 'Trainer',
    appointment: 'Training',
    appointmentsPlural: 'Trainings',
    bookAction: 'Training buchen'
  },
  generic: {
    client: 'Kunde',
    clientsPlural: 'Kunden',
    clientPossessive: 'Kunde',
    staff: 'Mitarbeiter',
    staffPlural: 'Mitarbeiter',
    appointment: 'Termin',
    appointmentsPlural: 'Termine',
    bookAction: 'Termin buchen'
  }
}

const FALLBACK_BUSINESS_TYPE = 'driving_school'

export function useTerminology() {
  const { currentTenantBranding } = useTenantBranding()

  const businessType = computed<string>(() => {
    const raw = (currentTenantBranding.value as any)?.business_type
      || (currentTenantBranding.value as any)?.businessType
      || FALLBACK_BUSINESS_TYPE
    return TERMS[raw] ? raw : FALLBACK_BUSINESS_TYPE
  })

  const t = computed<Terminology>(() => TERMS[businessType.value])

  return { t, businessType }
}
