<template>
  <div class="min-h-screen bg-white font-sans">
    <SimyNav />

    <!-- Hero -->
    <section class="pt-20 pb-24 px-6 relative overflow-hidden">
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full opacity-[0.06]"
          style="background: radial-gradient(circle, var(--brand-primary), transparent)"></div>
      </div>
      <div class="relative max-w-4xl mx-auto">
        <!-- Breadcrumb -->
        <nav class="flex items-center gap-2 text-xs text-gray-400 mb-8">
          <a href="/" class="hover:text-gray-600 transition-colors">Simy</a>
          <span>›</span>
          <a href="/fahrschule" class="hover:text-gray-600 transition-colors">Fahrschule</a>
          <span>›</span>
          <span class="text-gray-600">Fahrschulsoftware</span>
        </nav>

        <div class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider mb-6 border"
          style="background: rgba(var(--brand-rgb),0.07); color: var(--brand-primary); border-color: rgba(var(--brand-rgb),0.25)">
          Fahrschulsoftware Schweiz
        </div>
        <h1 class="text-3xl md:text-5xl font-black text-gray-900 mb-6 leading-tight">
          Fahrschulsoftware — <br />
          <span style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
            Der komplette Ratgeber 2026
          </span>
        </h1>
        <p class="text-xl text-gray-500 max-w-2xl mb-8 leading-relaxed">
          Was ist die beste Fahrschulsoftware für die Schweiz? Wir vergleichen Funktionen, Preise und erklären, worauf Fahrschulen wirklich achten sollten.
        </p>
        <div class="flex items-center gap-6 text-sm text-gray-400">
          <span class="flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            8 Min. Lesezeit
          </span>
          <span class="flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            Aktualisiert Mai 2026
          </span>
        </div>
      </div>
    </section>

    <!-- TOC -->
    <section class="py-10 px-6 bg-gray-50 border-y border-gray-100">
      <div class="max-w-4xl mx-auto">
        <p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Inhaltsverzeichnis</p>
        <div class="grid sm:grid-cols-2 gap-2">
          <a v-for="(item, i) in toc" :key="i" :href="`#${item.id}`"
            class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-white hover:text-gray-900 border border-transparent hover:border-gray-100 transition-all">
            <span class="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black text-white flex-shrink-0"
              style="background: var(--brand-primary)">{{ i + 1 }}</span>
            {{ item.label }}
          </a>
        </div>
      </div>
    </section>

    <!-- Content -->
    <div class="max-w-4xl mx-auto px-6 py-16 space-y-20">

      <!-- Section 1 -->
      <section :id="toc[0].id">
        <h2 class="text-3xl font-extrabold text-gray-900 mb-6">Was ist Fahrschulsoftware?</h2>
        <p class="text-gray-600 leading-relaxed mb-4">Fahrschulsoftware ist eine digitale Verwaltungslösung, die speziell auf die Bedürfnisse von Fahrschulen und Fahrlehrern zugeschnitten ist. Sie ersetzt Excel-Tabellen, Papierkram und manuelle Terminkoordination durch automatisierte, digitale Prozesse.</p>
        <p class="text-gray-600 leading-relaxed mb-4">Eine gute Fahrschulsoftware deckt folgende Kernbereiche ab:</p>
        <ul class="space-y-3 mb-6">
          <li v-for="item in whatIs" :key="item" class="flex items-start gap-3 text-gray-700">
            <svg class="w-5 h-5 mt-0.5 flex-shrink-0" style="color: var(--brand-primary)" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            {{ item }}
          </li>
        </ul>
        <div class="rounded-2xl p-6 border" style="background: rgba(var(--brand-rgb),0.04); border-color: rgba(var(--brand-rgb),0.15)">
          <p class="font-semibold text-gray-900 mb-2">💡 Das Wichtigste vorab</p>
          <p class="text-sm text-gray-600">Gute Fahrschulsoftware spart einem durchschnittlichen Fahrlehrer <strong>2–3 Stunden täglich</strong>. Das entspricht 40–60 Fahrstunden pro Monat — oder CHF 3'000–5'000 zusätzlichem Umsatzpotenzial.</p>
        </div>
      </section>

      <!-- Section 2 -->
      <section :id="toc[1].id">
        <h2 class="text-3xl font-extrabold text-gray-900 mb-6">Welche Funktionen braucht eine Fahrschule wirklich?</h2>
        <p class="text-gray-600 leading-relaxed mb-8">Nicht jedes Feature ist gleich wichtig. Basierend auf Feedback von über 50 Schweizer Fahrschulen haben wir die Must-Haves von den Nice-to-Haves getrennt.</p>
        <div class="space-y-4">
          <div v-for="cat in featureCats" :key="cat.title" class="rounded-2xl border border-gray-100 overflow-hidden">
            <div class="px-6 py-4 flex items-center gap-3" :style="{ background: cat.color + '0A', borderBottom: `1px solid ${cat.color}20` }">
              <span class="text-lg">{{ cat.icon }}</span>
              <h3 class="font-bold text-gray-900">{{ cat.title }}</h3>
              <span class="ml-auto text-xs font-bold px-2.5 py-1 rounded-full" :style="{ background: cat.color + '15', color: cat.color }">{{ cat.tag }}</span>
            </div>
            <div class="px-6 py-5">
              <ul class="grid sm:grid-cols-2 gap-2">
                <li v-for="f in cat.features" :key="f" class="flex items-center gap-2 text-sm text-gray-600">
                  <svg class="w-4 h-4 flex-shrink-0" :style="{ color: cat.color }" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                  </svg>
                  {{ f }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- Section 3 — Simy CTA Block -->
      <section :id="toc[2].id">
        <h2 class="text-3xl font-extrabold text-gray-900 mb-6">Simy — Die beste Fahrschulsoftware für die Schweiz</h2>
        <p class="text-gray-600 leading-relaxed mb-8">Simy ist speziell für den Schweizer Markt entwickelt. Mit TWINT-Integration, Schweizer Datenschutz und auf Deutsch verfügbar — Simy ist die einzige All-in-One Lösung, die auch Website und Marketing einschliesst.</p>
        <div class="grid sm:grid-cols-3 gap-5 mb-8">
          <div v-for="usp in usps" :key="usp.title"
            class="rounded-2xl p-6 text-center border border-gray-100 hover:border-purple-100 transition-all">
            <div class="text-3xl mb-3">{{ usp.icon }}</div>
            <h3 class="font-bold text-gray-900 mb-2 text-sm">{{ usp.title }}</h3>
            <p class="text-xs text-gray-500">{{ usp.desc }}</p>
          </div>
        </div>
        <a href="https://app.simy.ch/tenant-register"
          class="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-white font-bold transition-all hover:opacity-90"
          style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); box-shadow: 0 8px 24px rgba(var(--brand-rgb),0.25)">
          60 Tage kostenlos testen →
        </a>
        <p class="text-center text-xs text-gray-400 mt-2">Keine Kreditkarte erforderlich</p>
      </section>

      <!-- Section 4 -->
      <section :id="toc[3].id">
        <h2 class="text-3xl font-extrabold text-gray-900 mb-6">Kosten: Was kostet Fahrschulsoftware?</h2>
        <p class="text-gray-600 leading-relaxed mb-8">Die Kosten für Fahrschulsoftware variieren stark. Wir erklären, welche Preismodelle es gibt und was sich wirklich lohnt.</p>
        <div class="overflow-x-auto rounded-2xl border border-gray-100">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100">
                <th class="px-5 py-4 text-left font-bold text-gray-700">Modell</th>
                <th class="px-5 py-4 text-left font-bold text-gray-700">Preis</th>
                <th class="px-5 py-4 text-left font-bold text-gray-700">Vorteil</th>
                <th class="px-5 py-4 text-left font-bold text-gray-700">Nachteil</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="row in pricingTable" :key="row.model" :class="row.highlight ? 'bg-purple-50' : ''">
                <td class="px-5 py-4 font-semibold text-gray-900 flex items-center gap-2">
                  {{ row.model }}
                  <span v-if="row.highlight" class="text-xs font-bold px-2 py-0.5 rounded-full text-white" style="background: var(--brand-primary)">Empfohlen</span>
                </td>
                <td class="px-5 py-4 text-gray-600">{{ row.price }}</td>
                <td class="px-5 py-4 text-gray-600">{{ row.pro }}</td>
                <td class="px-5 py-4 text-gray-600">{{ row.con }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

    </div>

    <!-- Final CTA -->
    <section class="py-20 px-6" style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))">
      <div class="max-w-2xl mx-auto text-center">
        <h2 class="text-3xl font-black text-white mb-4">Simy 60 Tage kostenlos testen</h2>
        <p class="text-purple-200 mb-8">Überzeuge dich selbst. Keine Kreditkarte, keine Kündigung nötig.</p>
        <a href="https://app.simy.ch/tenant-register"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white font-black text-lg transition-all hover:opacity-90"
          style="color: var(--brand-primary)">
          Jetzt kostenlos starten →
        </a>
      </div>
    </section>

    <SimyFooter />
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Fahrschulsoftware Schweiz 2026 – Der komplette Ratgeber | Simy',
  meta: [
    { name: 'description', content: 'Was ist die beste Fahrschulsoftware für die Schweiz? Ratgeber zu Funktionen, Kosten und Vergleich. simy: All-in-One Lösung für Fahrschulen. 60 Tage kostenlos.' },
    { name: 'keywords', content: 'fahrschulsoftware, software fahrschule, verwaltungssoftware fahrschule, software für fahrschulen, fahrschule software schweiz' },
    { property: 'og:title', content: 'Fahrschulsoftware Schweiz 2026 – Der komplette Ratgeber' },
    { property: 'og:description', content: 'Was ist die beste Fahrschulsoftware? Vergleich, Funktionen, Kosten. Simy gewinnt.' },
    { property: 'og:url', content: 'https://simy.ch/fahrschule/software' },
  ],
  link: [{ rel: 'canonical', href: 'https://simy.ch/fahrschule/software' }],
  script: [{
    type: 'application/ld+json',
    children: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Simy', item: 'https://simy.ch/' },
        { '@type': 'ListItem', position: 2, name: 'Fahrschule', item: 'https://simy.ch/fahrschule' },
        { '@type': 'ListItem', position: 3, name: 'Fahrschulsoftware' },
      ],
    }),
  }, {
    type: 'application/ld+json',
    children: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'Was kostet Fahrschulsoftware?', acceptedAnswer: { '@type': 'Answer', text: 'Fahrschulsoftware kostet je nach Anbieter zwischen CHF 29 und CHF 199 pro Monat. Simy bietet Pläne ab CHF 69/Monat mit 60 Tagen kostenlosem Test.' } },
        { '@type': 'Question', name: 'Welche Fahrschulsoftware ist die beste?', acceptedAnswer: { '@type': 'Answer', text: 'Simy ist die einzige All-in-One Lösung für Schweizer Fahrschulen mit Terminbuchung, automatischen Rechnungen, Fahrlehrer-App und integriertem Website-Generator.' } },
      ],
    }),
  }],
})

const toc = [
  { id: 'was-ist', label: 'Was ist Fahrschulsoftware?' },
  { id: 'funktionen', label: 'Welche Funktionen braucht man?' },
  { id: 'Simy', label: 'Simy — Die beste Lösung' },
  { id: 'kosten', label: 'Was kostet es?' },
]

const whatIs = [
  'Schülerverwaltung und Fortschrittserfassung',
  'Terminplanung und Online-Buchungssystem',
  'Rechnungsstellung und Zahlungsabwicklung',
  'Fahrlehrer-Kalender und Verfügbarkeitsmanagement',
  'Automatische Erinnerungen per SMS und E-Mail',
  'Auswertungen und Statistiken',
]

const featureCats = [
  {
    title: 'Terminverwaltung & Buchung', icon: '📅', color: 'var(--brand-primary)', tag: 'Must-Have',
    features: ['Online-Buchungslink für Schüler', 'Echtzeit-Kalender pro Fahrlehrer', 'Automatische Terminbestätigung', 'Absage-Verwaltung', 'Mehrtagesansicht', 'iCal-Sync'],
  },
  {
    title: 'Rechnungen & Kasse', icon: '💶', color: '#059669', tag: 'Must-Have',
    features: ['Automatische Rechnungserstellung', 'TWINT & Online-Zahlung (CH)', 'Automatische Erinnerungen bei Online-Zahlung', 'Guthaben-System', 'QR-Rechnung', 'Exportfunktion'],
  },
  {
    title: 'Schülerverwaltung', icon: '🎓', color: '#0891B2', tag: 'Must-Have',
    features: ['Schülerprofil mit Geschichte', 'Fahrstunden-Counter', 'Prüfungsdaten', 'Dokumente & Notizen', 'Massenkommunikation', 'Filterfunktionen'],
  },
  {
    title: 'Website & Marketing', icon: '🌐', color: '#EA580C', tag: 'Empfohlen',
    features: ['Automatisch generierte Website', 'SEO-optimierte Seiten', 'Google Ads Integration', 'Lead-Erfassung', 'Bewertungs-Management', 'Social Media Links'],
  },
]

const usps = [
  { icon: '🇨🇭', title: 'Swiss Made', desc: 'Server in der Schweiz, DSGVO-konform, TWINT & QR-Rechnung inklusive' },
  { icon: '⚡', title: 'Schnell startklar', desc: 'In 15 Minuten vollständig eingerichtet — mit Wizard und Vorlagen' },
  { icon: '🌐', title: 'Website inklusive', desc: 'Simy generiert automatisch eine professionelle Website für deine Fahrschule' },
]

const pricingTable = [
  { model: 'Excel / Paper', price: 'Gratis', pro: 'Keine Lizenzkosten', con: 'Sehr zeitaufwendig, fehleranfällig', highlight: false },
  { model: 'Einmalige Software', price: 'CHF 500–2000', pro: 'Keine monatlichen Kosten', con: 'Kein Updates, kein Support', highlight: false },
  { model: 'SaaS / Abo (Simy)', price: 'Ab CHF 49/Mt.', pro: 'Immer aktuell, inkl. Support & Website', con: 'Monatliche Kosten', highlight: true },
]
</script>
