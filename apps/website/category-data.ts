// Category-specific FAQ and process steps
export const categoryDetails = {
  auto: {
    title: 'Auto Fahrschule Kategorie B',
    shortDesc: 'Fahrausbildung für Auto (Kategorie B)',
    description: 'Träumst du davon, die Freiheit auf vier Rädern zu erleben? Dann bist du bei unserer Auto Fahrschule genau richtig! Wir bereiten dich systematisch auf deine Autoprüfung vor.',
    highlights: [
      'Blutiger Anfänger? Wir begleiten dich von der ersten Stunde an',
      'Individuelle Förderung mit massgeschneiderten Privatstunden',
      'Prüfungssimulation zur optimalen Vorbereitung',
      'Auffrischungskurse auch nach bestandenem Führerschein'
    ],
    steps: [
      { title: 'Nothelferkurs', desc: 'Dein Start zum Führerschein: Gesuch und Nothelferkurs' },
      { title: 'Lernfahrgesuch', desc: 'Dein Lernfahrgesuch einreichen und Sehtest machen' },
      { title: 'Theorieprüfung', desc: 'Deine Theorieprüfung für den Führerschein' },
      { title: 'Verkehrskunde VKU', desc: 'Der Verkehrskundekurs: Dein Weg zur praktischen Prüfung' },
      { title: 'Fahrstunden', desc: 'Die ersten Fahrstunden mit deinem Fahrlehrer' },
      { title: 'Praktische Prüfung', desc: 'Erfolgreich zur praktischen Führerscheinprüfung' },
      { title: 'WAB Kurs', desc: 'Nach dem Führerschein: Weiterbildung und unbefristeter Ausweis' }
    ],
    faqs: [
      {
        q: 'Wieviele Fahrstunden benötige ich?',
        a: 'Das ist unterschiedlich. Im Durchschnitt benötigen Fahrschüler 15-20 Fahrstunden für die Kategorie B. Wir beraten dich individuell basierend auf deinen Fähigkeiten.'
      },
      {
        q: 'Wie kann ich meine Fahrausbildung beschleunigen?',
        a: 'Optimal wären 2-4 Fahrten pro Woche. Das heisst nicht unbedingt 2-4 Fahrlektionen, sondern z.B. 1 Fahrlektion und 1 Mal privat repetieren mit einer Begleitperson.'
      },
      {
        q: 'Wieso dauert eine Fahrstunde 45 Minuten?',
        a: 'Nach 45 Minuten lässt die Konzentration nach. Dies ist auch an Schulen Standard. Je nach Übungsgebiet können Fahrstunden auch länger ausfallen.'
      }
    ]
  },
  motorrad: {
    title: 'Motorrad Fahrschule',
    shortDesc: 'Fahrausbildung für Motorrad (Kategorie A, A2, AM)',
    description: 'Bist du bereit, die Strasse mit deinem Motorrad zu erobern? Unsere Motorrad Fahrschule bietet dir professionelle Ausbildung für alle Kategorien.',
    highlights: [
      'Alle Motorrad Kategorien: A, A2, AM',
      'Grundkurse in verschiedenen Regionen',
      'Sicherheitstraining und Technik-Verbesserung',
      'Motorrad Weiterbildungen für erfahrene Fahrer'
    ],
    steps: [
      { title: 'Nothelferkurs', desc: 'Obligatorischer Nothelferkurs' },
      { title: 'Lernfahrgesuch', desc: 'Anmeldung bei der Behörde' },
      { title: 'Grundkurs', desc: 'Motorrad Grundkurs (obligatorisch)' },
      { title: 'Theorieprüfung', desc: 'Motorrad Theorieprüfung' },
      { title: 'Fahrstunden', desc: 'Praktische Fahrstunden auf verschiedenen Strecken' },
      { title: 'Praktische Prüfung', desc: 'Motorrad Fahrprüfung' }
    ],
    faqs: [
      {
        q: 'Welche Kategorien gibt es für Motorräder?',
        a: 'Es gibt A (unbegrenzt ab 24 Jahren), A2 (bis 35kW ab 18 Jahren) und AM (bis 50ccm ab 16 Jahren).'
      },
      {
        q: 'Ist der Grundkurs obligatorisch?',
        a: 'Ja, der Motorrad Grundkurs ist obligatorisch für alle Kategorien und muss vor der praktischen Prüfung absolviert sein.'
      }
    ]
  },
  lastwagen: {
    title: 'Lastwagen Fahrschule',
    shortDesc: 'Fahrausbildung für Lastwagen (Kategorie C, C1)',
    description: 'Berufliche Fahrausbildung für Lastwagen mit allen erforderlichen Qualifikationen und Zertifikaten.',
    highlights: [
      'Kategorien C und C1 Ausbildung',
      'ADR Grundausbildung für Gefahrgüter',
      'CZV Grundkurs und Weiterbildung',
      'Berufshaftpflicht Beratung'
    ],
    steps: [
      { title: 'Voraussetzungen', desc: 'Kategorie B Führerschein erforderlich' },
      { title: 'Nothelferkurs', desc: 'Aktueller Nothelferkurs' },
      { title: 'Theorie', desc: 'Theoretische Schulung für Lastwagen' },
      { title: 'CZV Grundkurs', desc: 'Obligatorischer CZV Grundkurs' },
      { title: 'Fahrstunden', desc: 'Praktische Fahrstunden auf Lastwagen' },
      { title: 'Fahrprüfung', desc: 'Praktische Fahrprüfung' }
    ],
    faqs: [
      {
        q: 'Brauche ich Vorkenntnisse?',
        a: 'Ja, du brauchst einen Kategorie B Führerschein und musst mindestens 18 Jahre alt sein.'
      },
      {
        q: 'Wie lange dauert die Ausbildung?',
        a: 'Das hängt von deinem Tempo ab. Mit regelmässigem Training dauert es typically 4-8 Wochen.'
      }
    ]
  },
  taxi: {
    title: 'Taxi Fahrschule (BPT)',
    shortDesc: 'Fahrausbildung für Taxi (BPT Zertifizierung)',
    description: 'Professionelle Ausbildung für Taxi-Fahrer mit allen erforderlichen Zertifikationen und Kenntnissen.',
    highlights: [
      'BPT Zertifizierung für Taxi',
      'Kundenservice Schulung',
      'Verkehrsrechtliche Schulung',
      'Sicherheit und Erste Hilfe'
    ],
    steps: [
      { title: 'Voraussetzungen', desc: 'Kategorie B Führerschein' },
      { title: 'BPT Schulung', desc: 'BPT Grundausbildung' },
      { title: 'Fahrpraxis', desc: 'Praktische Fahrstunden' },
      { title: 'Prüfung', desc: 'BPT Fahrprüfung' }
    ],
    faqs: [
      {
        q: 'Was kostet die BPT Ausbildung?',
        a: 'Kontaktiere uns für ein individuelles Angebot. Preise hängen von deinen Vorkenntnissen ab.'
      }
    ]
  }
}
