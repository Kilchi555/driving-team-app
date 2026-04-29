<template>
  <div class="min-h-screen bg-white font-sans text-gray-900">

    <!-- ── Head ─────────────────────────────────────────────────────────────── -->
    <Head>
      <Title>Fahrschule Software Schweiz – App, Buchung & Abrechnung | Simy</Title>
      <Meta name="description" content="Simy ist die führende Fahrschule-Software in der Schweiz: Online-Buchung, automatische Abrechnung, Schülerverwaltung & TWINT-Zahlung. Jetzt 30 Tage kostenlos testen." />
      <Meta name="keywords" content="Fahrschule Software Schweiz, Fahrschule App, Fahrstunden Verwaltung Software, Fahrschule Buchungssystem, Fahrschule Online Buchung, Fahrschule Verwaltungssoftware, Fahrstunden App" />
      <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      <Meta property="og:title" content="Fahrschule Software Schweiz – Simy" />
      <Meta property="og:description" content="Online-Buchung, Abrechnung & Schülerverwaltung für Fahrschulen in der Schweiz. 30 Tage kostenlos." />
      <Meta property="og:type" content="website" />
      <Meta property="og:url" content="https://simy.ch/fahrschule-software" />
      <Meta property="og:image" content="https://simy.ch/og-image.png" />
      <Meta property="og:locale" content="de_CH" />
      <Link rel="canonical" href="https://simy.ch/fahrschule-software" />
    </Head>

    <!-- ── Minimal Nav ───────────────────────────────────────────────────────── -->
    <nav class="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
      <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/" class="flex items-center gap-2">
          <img src="/simy-logo.png" alt="Simy" class="h-8 max-w-[120px] object-contain" />
        </a>
        <div class="flex items-center gap-3">
          <a href="/login" class="hidden sm:block text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">Einloggen</a>
          <a href="/tenant-register"
            class="text-sm font-bold px-4 py-2 rounded-xl text-white transition-all hover:opacity-90 whitespace-nowrap bg-[#6000BD]">
            30 Tage gratis testen →
          </a>
        </div>
      </div>
    </nav>

    <!-- ── Hero ─────────────────────────────────────────────────────────────── -->
    <section class="relative overflow-hidden pt-16 pb-20 px-6">
      <div class="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full opacity-[0.07] pointer-events-none bg-[#6000BD]"></div>

      <div class="relative max-w-4xl mx-auto text-center">
        <div class="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider mb-6 border border-purple-200 bg-purple-50 text-[#6000BD]">
          <span class="w-2 h-2 rounded-full bg-[#6000BD] animate-pulse"></span>
          Fahrschule Software Schweiz
        </div>

        <h1 class="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 mb-6 leading-tight">
          Die smarte Software<br>
          <span class="text-[#6000BD]">für deine Fahrschule</span>
        </h1>

        <p class="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-8 leading-relaxed">
          Online-Buchung, automatische Abrechnung, Schülerverwaltung und TWINT-Zahlung –
          alles in einer App. Simy spart Fahrschulen in der Schweiz durchschnittlich
          <strong class="text-gray-800">8 Stunden Verwaltungsaufwand pro Woche.</strong>
        </p>

        <div class="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <a href="/tenant-register"
            class="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-white font-bold text-base transition-all hover:scale-105 bg-[#6000BD]">
            30 Tage kostenlos starten
          </a>
          <a href="/#features"
            class="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-base border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all">
            Alle Features ansehen
          </a>
        </div>

        <!-- Trust Bar -->
        <div class="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-400">
          <span class="flex items-center gap-1.5"><svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>Keine Kreditkarte nötig</span>
          <span class="flex items-center gap-1.5"><svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>30 Tage gratis, dann monatlich kündbar</span>
          <span class="flex items-center gap-1.5"><svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>In 10 Minuten eingerichtet</span>
          <span class="flex items-center gap-1.5"><svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>Support auf Deutsch</span>
        </div>
      </div>
    </section>

    <!-- ── Pain Points ───────────────────────────────────────────────────────── -->
    <section class="bg-gray-50 py-16 px-6">
      <div class="max-w-5xl mx-auto">
        <p class="text-center text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Kennst du das?</p>
        <h2 class="text-3xl md:text-4xl font-extrabold text-center text-gray-900 mb-10">
          Verwaltung frisst deine Zeit
        </h2>
        <div class="grid md:grid-cols-3 gap-6">
          <div v-for="pain in painPoints" :key="pain.title"
            class="bg-white rounded-2xl p-6 border border-gray-100">
            <p class="text-2xl mb-3">{{ pain.icon }}</p>
            <h3 class="font-bold text-gray-900 mb-2">{{ pain.title }}</h3>
            <p class="text-sm text-gray-500 leading-relaxed">{{ pain.text }}</p>
          </div>
        </div>
        <p class="text-center text-gray-500 mt-8 text-sm">
          Schweizer Fahrlehrer verbringen im Schnitt <strong class="text-gray-800">12 Stunden pro Woche</strong> mit Verwaltungsaufgaben,
          die Simy automatisiert.
        </p>
      </div>
    </section>

    <!-- ── Features ─────────────────────────────────────────────────────────── -->
    <section class="py-16 px-6">
      <div class="max-w-5xl mx-auto">
        <p class="text-center text-xs font-bold uppercase tracking-widest text-[#6000BD] mb-3">Alles inklusive</p>
        <h2 class="text-3xl md:text-4xl font-extrabold text-center text-gray-900 mb-4">
          Was Simy für dich erledigt
        </h2>
        <p class="text-center text-gray-500 mb-10 max-w-xl mx-auto text-sm">
          Keine Zusatzmodule, keine versteckten Kosten. Alle Features sind in jedem Plan enthalten.
        </p>
        <div class="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
          <div v-for="feat in features" :key="feat.title"
            class="rounded-2xl p-5 border border-gray-100 hover:border-purple-100 hover:bg-purple-50/30 transition-colors">
            <div class="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-lg mb-3">{{ feat.icon }}</div>
            <h3 class="font-bold text-gray-900 mb-1 text-sm">{{ feat.title }}</h3>
            <p class="text-xs text-gray-500 leading-relaxed">{{ feat.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Social Proof / Case Study ────────────────────────────────────────── -->
    <section class="bg-[#6000BD] py-16 px-6">
      <div class="max-w-4xl mx-auto">
        <p class="text-center text-xs font-bold uppercase tracking-widest text-purple-200 mb-3">Erfolgsgeschichte</p>
        <h2 class="text-3xl md:text-4xl font-extrabold text-center text-white mb-10">
          Driving Team Zürich nutzt Simy
        </h2>
        <div class="grid md:grid-cols-3 gap-6 mb-10">
          <div v-for="stat in caseStudyStats" :key="stat.label"
            class="bg-white/10 rounded-2xl p-6 text-center">
            <p class="text-3xl font-extrabold text-white mb-1">{{ stat.value }}</p>
            <p class="text-sm text-purple-200">{{ stat.label }}</p>
          </div>
        </div>
        <div class="bg-white/10 rounded-2xl p-6 max-w-2xl mx-auto text-center">
          <p class="text-white italic text-base leading-relaxed mb-4">
            "Seit wir Simy nutzen, verbringen wir keine Zeit mehr mit Rechnungen schreiben und Terminerinnerungen.
            Die Schüler buchen alles selbst online – und bezahlen direkt mit TWINT.
            Das hat unseren Alltag komplett verändert."
          </p>
          <p class="text-purple-200 text-sm font-semibold">Pascal Kilchenmann · Driving Team, Zürich & Lachen</p>
        </div>
      </div>
    </section>

    <!-- ── Vergleich ─────────────────────────────────────────────────────────── -->
    <section class="py-16 px-6">
      <div class="max-w-5xl mx-auto">
        <p class="text-center text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Warum Simy?</p>
        <h2 class="text-3xl md:text-4xl font-extrabold text-center text-gray-900 mb-10">
          Simy vs. andere Lösungen
        </h2>
        <div class="overflow-x-auto rounded-2xl border border-gray-100">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100">
                <th class="text-left px-5 py-4 font-semibold text-gray-500 w-[40%]">Feature</th>
                <th class="px-5 py-4 font-bold text-[#6000BD] text-center">Simy</th>
                <th class="px-5 py-4 font-semibold text-gray-500 text-center">Andere Software</th>
                <th class="px-5 py-4 font-semibold text-gray-500 text-center">Manuell / Excel</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in comparisonRows" :key="row[0]"
                :class="i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'">
                <td class="px-5 py-3.5 text-gray-700 font-medium">{{ row[0] }}</td>
                <td class="px-5 py-3.5 text-center">
                  <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-50 text-green-600 text-xs font-bold">✓</span>
                </td>
                <td class="px-5 py-3.5 text-center text-gray-400 text-xs">{{ row[1] }}</td>
                <td class="px-5 py-3.5 text-center">
                  <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-50 text-red-400 text-xs font-bold">✕</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="text-center mt-6">
          <a href="/fahrschule-software-vergleich" class="text-sm text-[#6000BD] font-semibold hover:underline">
            Detaillierter Softwarevergleich ansehen →
          </a>
        </p>
      </div>
    </section>

    <!-- ── Pricing Teaser ────────────────────────────────────────────────────── -->
    <section class="bg-gray-50 py-16 px-6">
      <div class="max-w-3xl mx-auto text-center">
        <p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Preise</p>
        <h2 class="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Transparent & fair</h2>
        <p class="text-gray-500 mb-8 text-sm">Ab CHF 49 / Monat. Alle Features inklusive. Monatlich kündbar. 30 Tage kostenlos testen.</p>
        <div class="grid sm:grid-cols-2 gap-4 text-left max-w-xl mx-auto mb-8">
          <div class="bg-white rounded-2xl p-5 border border-gray-100">
            <p class="text-xs font-bold uppercase text-gray-400 mb-1">Starter</p>
            <p class="text-2xl font-extrabold text-gray-900">CHF 49<span class="text-sm font-normal text-gray-400">/Mo</span></p>
            <p class="text-xs text-gray-500 mt-2">1 Fahrlehrer · alle Features · unbegrenzte Schüler</p>
          </div>
          <div class="bg-[#6000BD] rounded-2xl p-5 border border-purple-700">
            <p class="text-xs font-bold uppercase text-purple-200 mb-1">Team</p>
            <p class="text-2xl font-extrabold text-white">CHF 89<span class="text-sm font-normal text-purple-200">/Mo</span></p>
            <p class="text-xs text-purple-200 mt-2">Bis 5 Fahrlehrer · Multi-Standort · Analytik</p>
          </div>
        </div>
        <a href="/tenant-register"
          class="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-white font-bold text-base bg-[#6000BD] hover:opacity-90 transition-all">
          Jetzt 30 Tage kostenlos starten →
        </a>
        <p class="text-xs text-gray-400 mt-3">Keine Kreditkarte · Monatlich kündbar · Setup in 10 Min.</p>
      </div>
    </section>

    <!-- ── FAQ ──────────────────────────────────────────────────────────────── -->
    <section class="py-16 px-6">
      <div class="max-w-2xl mx-auto">
        <h2 class="text-3xl font-extrabold text-gray-900 mb-8 text-center">Häufige Fragen</h2>
        <div class="space-y-3">
          <div v-for="faq in faqs" :key="faq.q"
            class="border border-gray-100 rounded-2xl overflow-hidden">
            <button
              class="w-full text-left px-5 py-4 flex items-center justify-between font-semibold text-sm text-gray-800 hover:bg-gray-50 transition-colors"
              @click="toggleFaq(faq.q)">
              {{ faq.q }}
              <span class="text-gray-400 text-lg leading-none ml-3 flex-shrink-0">{{ openFaq === faq.q ? '−' : '+' }}</span>
            </button>
            <div v-if="openFaq === faq.q" class="px-5 pb-4 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-3">
              {{ faq.a }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Final CTA ─────────────────────────────────────────────────────────── -->
    <section class="py-16 px-6">
      <div class="max-w-2xl mx-auto text-center">
        <h2 class="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
          Bereit für weniger Verwaltung?
        </h2>
        <p class="text-gray-500 mb-8 text-sm">30 Tage kostenlos, keine Kreditkarte, jederzeit kündbar.</p>
        <a href="/tenant-register"
          class="inline-flex items-center justify-center gap-2 px-10 py-5 rounded-2xl text-white font-bold text-lg bg-[#6000BD] hover:opacity-90 transition-all hover:scale-105">
          Jetzt kostenlos starten →
        </a>
      </div>
    </section>

    <!-- ── Footer ────────────────────────────────────────────────────────────── -->
    <footer class="border-t border-gray-100 py-10 px-6">
      <div class="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
        <a href="/" class="font-bold text-gray-700 hover:text-[#6000BD] transition-colors">Simy</a>
        <div class="flex flex-wrap gap-x-5 gap-y-1 justify-center">
          <a href="/" class="hover:text-gray-700 transition-colors">Startseite</a>
          <a href="/fahrschule-software-vergleich" class="hover:text-gray-700 transition-colors">Software-Vergleich</a>
          <a href="/online-terminbuchung-fahrschule" class="hover:text-gray-700 transition-colors">Online-Buchung</a>
          <a href="/datenschutz" class="hover:text-gray-700 transition-colors">Datenschutz</a>
          <a href="/agb" class="hover:text-gray-700 transition-colors">AGB</a>
        </div>
        <span>© {{ new Date().getFullYear() }} Simy</span>
      </div>
    </footer>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { definePageMeta, useHead } from '#imports'

definePageMeta({ layout: false })

// JSON-LD structured data
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Simy – Fahrschule Software',
        url: 'https://simy.ch/fahrschule-software',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web, iOS, Android',
        description: 'Die führende Fahrschul-Software der Schweiz: Online-Buchung, automatische Abrechnung, Schülerverwaltung & TWINT-Zahlung.',
        inLanguage: 'de-CH',
        offers: {
          '@type': 'Offer',
          price: '49',
          priceCurrency: 'CHF',
          priceValidUntil: '2027-12-31',
          description: 'Starter-Plan ab CHF 49/Monat',
        },
        provider: {
          '@type': 'Organization',
          name: 'Simy',
          url: 'https://simy.ch',
          areaServed: { '@type': 'Country', name: 'Switzerland' },
        },
        review: {
          '@type': 'Review',
          author: { '@type': 'Person', name: 'Pascal Kilchenmann' },
          reviewBody: 'Seit wir Simy nutzen, verbringen wir keine Zeit mehr mit Rechnungen schreiben. Die Schüler buchen alles selbst online.',
          reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.9',
          reviewCount: '38',
          bestRating: '5',
        },
        featureList: [
          'Online-Buchung für Fahrstunden',
          'Automatische Abrechnung & Rechnungsversand',
          'TWINT und Kreditkartenzahlung',
          'Schülerverwaltung',
          'Automatische Terminerinnerungen',
          'Affiliate-System',
          'Prüfungsverwaltung',
          'Fahrzeugverwaltung',
        ],
      }),
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Ist Simy eine Fahrschule Software für die Schweiz?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Ja, Simy ist speziell für Fahrschulen in der Schweiz entwickelt – mit CHF-Zahlungen, TWINT-Integration und SARI-Anbindung.',
            },
          },
          {
            '@type': 'Question',
            name: 'Wie lange dauert die Einrichtung?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Die meisten Fahrschulen sind in unter 10 Minuten eingerichtet. Unser Support hilft dir bei der Einrichtung.',
            },
          },
          {
            '@type': 'Question',
            name: 'Kann ich Simy kostenlos testen?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Ja, du kannst Simy 30 Tage kostenlos und ohne Kreditkarte testen.',
            },
          },
        ],
      }),
    },
  ],
})

// ─── Data ─────────────────────────────────────────────────────────────────────
const openFaq = ref<string | null>(null)

function toggleFaq(q: string) {
  openFaq.value = openFaq.value === q ? null : q
}

const painPoints = [
  {
    icon: '📅',
    title: 'Terminverwaltung per WhatsApp',
    text: 'Stunden am Telefon und per WhatsApp – Terminabsprachen, Verschiebungen, Absagen. Fehler inklusive.',
  },
  {
    icon: '💸',
    title: 'Offene Rechnungen',
    text: 'Rechnungen manuell erstellen, ausdrucken, verschicken und nachverfolgen. Mahnungen schreiben, Zahlungen kontrollieren.',
  },
  {
    icon: '📋',
    title: 'Schülerdaten im Chaos',
    text: 'Lernfortschritte, Dokumente, Notizen und Kontaktdaten verteilt auf Post-its, Excel und verschiedene Apps.',
  },
]

const features = [
  { icon: '📅', title: 'Online-Buchung & Kalender', desc: 'Schüler buchen Fahrstunden direkt online. Automatische Sync mit deinem Kalender.' },
  { icon: '💳', title: 'Zahlungen & Rechnungen', desc: 'TWINT, Kreditkarte, PostFinance. Rechnungen automatisch erstellt und per E-Mail versendet.' },
  { icon: '👥', title: 'Schülerverwaltung', desc: 'Alle Daten, Lernfortschritte, Dokumente und Notizen zentral und übersichtlich.' },
  { icon: '🔔', title: 'Automatische Erinnerungen', desc: 'Terminerinnerungen, Zahlungsfristen und Prüfungshinweise – Simy erinnert statt du.' },
  { icon: '🎓', title: 'Prüfungsverwaltung', desc: 'Prüfungen erfassen, Experten zuweisen, Ergebnisse tracken und dokumentieren.' },
  { icon: '📣', title: 'Affiliate-System', desc: 'Schüler empfehlen Freunde und erhalten Rabatte. Neue Kunden ohne Werbeaufwand.' },
  { icon: '🏫', title: 'Kursbuchungsseite', desc: 'Eigene Buchungsseite mit deinem Branding. Schüler buchen und bezahlen Kurse direkt.' },
  { icon: '📊', title: 'Auswertungen', desc: 'Umsatz, Auslastung, No-Show-Rate – alle Kennzahlen auf einen Blick.' },
  { icon: '🚗', title: 'Fahrzeugverwaltung', desc: 'Revisionen tracken, Fahrtenbuch führen – automatisch und gesetzeskonform.' },
]

const caseStudyStats = [
  { value: '85%', label: 'Prüfungserfolgsquote' },
  { value: '−8h', label: 'Verwaltungsaufwand pro Woche' },
  { value: '100%', label: 'Schüler buchen online' },
]

const comparisonRows = [
  ['Online-Buchung für Schüler', 'Teilweise, oft kostenpflichtig'],
  ['TWINT-Zahlung direkt in der App', 'Selten, nur grosse Anbieter'],
  ['Automatische Terminerinnerungen', 'Meist als Add-on'],
  ['Schweizer SARI-Kurs-Anbindung', 'Nicht verfügbar'],
  ['Affiliate-System für Weiterempfehlungen', 'Nicht verfügbar'],
  ['White-Label Buchungsseite mit eigenem Branding', 'Selten'],
  ['Setup in unter 10 Minuten', 'Meist mehrtägiges Onboarding'],
  ['Support auf Deutsch', 'Oft nur Englisch oder Ticket-System'],
]

const faqs = [
  {
    q: 'Ist Simy speziell für Schweizer Fahrschulen entwickelt?',
    a: 'Ja. Simy ist vollständig in der Schweiz entwickelt und auf Schweizer Anforderungen ausgerichtet: CHF-Zahlungen, TWINT-Integration, SARI-Kursanbindung (ASA-PGS) und Schweizer Datenschutz.',
  },
  {
    q: 'Wie lange dauert die Einrichtung meiner Fahrschule in Simy?',
    a: 'Die meisten Fahrschulen sind in unter 10 Minuten einsatzbereit. Du gibst deine Fahrstunden-Kategorien, Preise und Verfügbarkeiten ein – fertig. Unser Support hilft dir bei Fragen.',
  },
  {
    q: 'Kann ich Simy kostenlos testen?',
    a: 'Ja, du kannst Simy 30 Tage lang vollständig kostenlos testen – ohne Kreditkarte und ohne automatische Verlängerung.',
  },
  {
    q: 'Welche Zahlungsmethoden unterstützt Simy?',
    a: 'Simy unterstützt TWINT, Kreditkarten (Visa, Mastercard), Debitkarte und PostFinance. Zahlungen werden direkt in deinem Dashboard verwaltet.',
  },
  {
    q: 'Kann ich Simy mit mehreren Fahrlehrern nutzen?',
    a: 'Ja. Im Team-Plan können bis zu 5 Fahrlehrer gleichzeitig arbeiten, Termine teilen und gemeinsam Schüler betreuen. Für grössere Teams gibt es individuelle Tarife.',
  },
  {
    q: 'Gibt es eine App für meine Schüler?',
    a: 'Ja. Schüler können über die mobile-optimierte Buchungsseite oder per direktem Link jederzeit Termine buchen, bezahlen und Erinnerungen erhalten.',
  },
]
</script>
