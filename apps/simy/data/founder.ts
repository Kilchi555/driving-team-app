/** Short founder transfer blurbs for Final-CTA (not long About copy). */
export const FOUNDER_BLURB_HOME =
  'Genervt von Tool-Chaos und Handarbeit hat er 2025 Simy gebaut — damit Fahrlehrer unterrichten statt administrieren. Seit Juni 2026 für alle Fahrschulen in der Schweiz.'

export const FOUNDER_BLURB_BY_SLUG: Record<string, string> = {
  coaching:
    'Was in der Fahrschule funktioniert — Online-Buchung, Automatisierung, weniger Admin — funktioniert genauso im Coaching. Seit 2026 auch für Coaches.',
  'personal-training':
    'Was in der Fahrschule funktioniert — Termine, Absagen, Abrechnung — funktioniert genauso im Personal Training. Seit 2026 auch für Trainer.',
  massage:
    'Was in der Fahrschule funktioniert — Buchung, Erinnerungen, Rechnungen — funktioniert genauso in der Massagepraxis. Seit 2026 auch für Masseure.',
  nachhilfe:
    'Was in der Fahrschule funktioniert — Kalender, Schüler, Automatisierung — funktioniert genauso in der Nachhilfe. Seit 2026 auch für Nachhilfelehrer.',
  musikschule:
    'Was in der Fahrschule funktioniert — Lektionen, Absagen, Abrechnung — funktioniert genauso in der Musikschule. Seit 2026 auch für Musikschulen.',
  hundeschule:
    'Was in der Fahrschule funktioniert — Kurse, Termine, weniger Admin — funktioniert genauso in der Hundeschule. Seit 2026 auch für Hundeschulen.',
  consulting:
    'Was in der Fahrschule funktioniert — Termine, Klienten, Automatisierung — funktioniert genauso im Consulting. Seit 2026 auch für Berater.',
}

export function founderBlurbForSlug(slug: string): string {
  return FOUNDER_BLURB_BY_SLUG[slug] ?? FOUNDER_BLURB_HOME
}
