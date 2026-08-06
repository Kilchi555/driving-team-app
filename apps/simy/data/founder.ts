/** Short founder transfer blurbs for Final-CTA (not long About copy). */
export const FOUNDER_BLURB_HOME =
  'Genervt von Tool-Chaos und Handarbeit hat er 2025 Simy gebaut — damit Dienstleister arbeiten statt administrieren. Seit 2026 für Dienstleister und KMU in der Schweiz.'

export const FOUNDER_BLURB_BY_SLUG: Record<string, string> = {
  coaching:
    'Was im Terminbetrieb funktioniert — Online-Buchung, Automatisierung, weniger Admin — funktioniert genauso im Coaching. Seit 2026 auch für Coaches.',
  'personal-training':
    'Was im Terminbetrieb funktioniert — Termine, Absagen, Abrechnung — funktioniert genauso im Personal Training. Seit 2026 auch für Trainer.',
  massage:
    'Was im Terminbetrieb funktioniert — Buchung, Erinnerungen, Rechnungen — funktioniert genauso in der Massagepraxis. Seit 2026 auch für Masseure.',
  nachhilfe:
    'Was im Terminbetrieb funktioniert — Kalender, Kunden, Automatisierung — funktioniert genauso in der Nachhilfe. Seit 2026 auch für Nachhilfelehrer.',
  musikschule:
    'Was im Terminbetrieb funktioniert — Termine, Absagen, Abrechnung — funktioniert genauso in der Musikschule. Seit 2026 auch für Musikschulen.',
  hundeschule:
    'Was im Terminbetrieb funktioniert — Kurse, Termine, weniger Admin — funktioniert genauso in der Hundeschule. Seit 2026 auch für Hundeschulen.',
  consulting:
    'Was im Terminbetrieb funktioniert — Termine, Kunden, Automatisierung — funktioniert genauso im Consulting. Seit 2026 auch für Berater.',
}

export function founderBlurbForSlug(slug: string): string {
  return FOUNDER_BLURB_BY_SLUG[slug] ?? FOUNDER_BLURB_HOME
}
