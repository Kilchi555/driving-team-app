// SEO Metadata for Driving Team website
export const siteConfig = {
  siteName: 'Driving Team - Fahrschule Zürich',
  siteUrl: 'https://drivingteam.ch',
  description: 'Moderne Fahrschule in Zürich für Auto, Motorrad, Taxi & Lastwagen. Erfahrene Fahrlehrer, flexible Preise, garantiert bestanden.',
  defaultImage: 'https://drivingteam.ch/og-image.jpg',
  socialLinks: {
    facebook: 'https://facebook.com/drivingtea mzurich',
    instagram: 'https://instagram.com/drivingtea mzurich'
  }
}

export const categories = [
  { name: 'Auto', slug: 'auto', icon: '🚗', description: 'Fahrausbildung Kategorie B' },
  { name: 'Motorrad', slug: 'motorrad', icon: '🏍️', description: 'Motorrad Fahrausbildung' },
  { name: 'Anhänger', slug: 'anhaenger', icon: '🚙', description: 'Anhänger Fahrausbildung' },
  { name: 'Lastwagen', slug: 'lastwagen', icon: '🚚', description: 'Lastwagen Fahrausbildung' },
  { name: 'Bus', slug: 'bus', icon: '🚌', description: 'Bus Fahrausbildung' },
  { name: 'Taxi', slug: 'taxi', icon: '🚕', description: 'Taxi/BPT Fahrausbildung' },
  { name: 'Motorboot', slug: 'motorboot', icon: '⛵', description: 'Motorboot Fahrausbildung' }
]

export const faqItems = [
  {
    question: 'Wieviele Fahrstunden benötige ich?',
    answer: 'Das ist unterschiedlich und hängt von deinem Alter, Erfahrung und Lerntempo ab. Im Durchschnitt benötigen unsere Schüler 15-20 Fahrstunden. Wir beraten dich gerne individuell.'
  },
  {
    question: 'Wie kann ich meine Fahrausbildung beschleunigen?',
    answer: 'Optimal wären 2-4 Fahrten pro Woche. Das heisst nicht unbedingt 2-4 Fahrlektionen, sondern z.B. 1 Fahrlektion und 1 Mal privat repetieren mit einer Begleitperson.'
  },
  {
    question: 'Wieso dauert die Fahrstunde 45 Minuten?',
    answer: 'Nach 45 Minuten lässt die Konzentration nach. Dies ist auch an Schulen Standard. Je nach Gebiet und Ausbildungsstand können Fahrstunden auch länger ausfallen.'
  },
  {
    question: 'Wie rechtfertigen sich eure Preise?',
    answer: 'Wir streben nach maximaler Professionalität in jedem Aspekt. Das gilt für unsere Fahrlehrer, unsere Fahrzeuge, die Kundenbetreuung und die Ausbildungsqualität.'
  },
  {
    question: 'Wo bietet Ihr Fahrstunden an?',
    answer: 'Unsere Lokale befinden sich in Zürich-Altstetten und in Lachen/SZ. Das Tätigkeitsgebiet erstreckt sich von Zürich bis in die Ostschweiz.'
  }
]

export const testimonials = [
  {
    text: 'Ich habe dank Keni meine Anhängerprüfung erfolgreich bestanden. Er hat sich viel Zeit genommen und mir alles anschaulich erklärt.',
    author: 'Sarah M.',
    rating: 5
  },
  {
    text: 'Eine sehr gute Fahrschule und ein tolles Team. Pascal ist ein kompetenter und humorvoller Fahrlehrer. Sehr empfehlenswert!',
    author: 'Marco L.',
    rating: 5
  },
  {
    text: 'Sehr gute Fahrschule! Rijad gab mir immer präzise und hilfreiche Tipps. Eine ausgezeichnete Vorbereitung auf die Prüfung.',
    author: 'Anna K.',
    rating: 5
  }
]

export const contactInfo = {
  phone: '+41 44 431 00 33',
  email: 'info@drivingteam.ch',
  hours: 'Montag - Freitag: 08:00 - 12:00 / 13:00 - 17:00',
  address: 'Bahnhofstrasse 145, 8048 Zürich'
}
