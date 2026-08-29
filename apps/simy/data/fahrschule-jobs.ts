export type FahrschuleJob = {
  href: string
  icon: string
  title: string
  desc: string
  featured?: boolean
}

/** Hub + nav: jobs the owner actually buys — not a feature dump. */
export const FAHRSCHULE_JOBS: FahrschuleJob[] = [
  {
    href: '/fahrschule/abholung',
    icon: 'compass',
    title: 'Abholung im Radius',
    desc: 'Schüler wählen den Treffpunkt. Simy rechnet Fahrzeit — nicht Luftlinie. Was nicht passt, ist nicht buchbar.',
    featured: true,
  },
  {
    href: '/fahrschule/schuelerportal',
    icon: 'users',
    title: 'Schülerportal',
    desc: 'Termine, Fortschritt, Guthaben und Dokumente — der Schüler sieht denselben Stand wie du.',
  },
  {
    href: '/fahrschule/dokumentation',
    icon: 'graduate',
    title: 'Dokumentation & PDF',
    desc: 'Nach der Stunde bewertet. Schüler sehen den Stand jederzeit und können das PDF holen.',
  },
  {
    href: '/fahrschule/buchungssystem',
    icon: 'calendar',
    title: 'Online-Buchung & iCal',
    desc: 'Schüler buchen selbst. Simy-Termine im privaten Kalender — Privattermine dort sperren Slots.',
  },
  {
    href: '/features/rechnungen',
    icon: 'wallet',
    title: 'Guthaben & Teilzahlung',
    desc: 'Pakete, offener Rest, Rückzahlung auf denselben Weg. Ein Stand für Schüler und Admin.',
  },
  {
    href: '/features/kurse',
    icon: 'school',
    title: 'Kurse & Warteliste',
    desc: 'Theorie, VKU, Nothelfer: Plätze sichtbar. Ist der Kurs voll, landet niemand mehr im Chat.',
  },
  {
    href: '/fahrschule/app',
    icon: 'phone',
    title: 'Fahrlehrer-App',
    desc: 'Kalender, Schüler, Einnahmen auf iOS und Android — zwischen zwei Stunden.',
  },
]

export const FAHRSCHULE_SCREENSHOTS = {
  desktopCalendar: '/screenshots/desktop-calendar.webp',
  desktopDashboard: '/screenshots/desktop-dashboard.webp',
  ipadCalendar: '/screenshots/ipad-calendar.webp',
  ipadDashboard: '/screenshots/ipad-dashboard.webp',
  ipadLogin: '/screenshots/ipad-login.webp',
  iphoneCalendar: '/screenshots/iphone-calendar.webp',
  iphoneDashboard: '/screenshots/iphone-dashboard.webp',
  iphoneLogin: '/screenshots/iphone-login.webp',
} as const
