<template>
  <div class="min-h-screen bg-white font-sans">
    <SimyNav />

    <!-- Hero -->
    <section class="pt-20 pb-16 px-6 text-center relative overflow-hidden">
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full opacity-[0.06]"
          style="background: radial-gradient(circle, #6000BD, transparent)"></div>
      </div>
      <div class="relative max-w-2xl mx-auto">
        <div class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider mb-6 border"
          style="background: rgba(96,0,189,0.07); color: #6000BD; border-color: rgba(96,0,189,0.25)">
          Kontakt
        </div>
        <h1 class="text-5xl font-black text-gray-900 mb-5 leading-tight">Wie können wir helfen?</h1>
        <p class="text-xl text-gray-500 leading-relaxed">
          Wähle das passende Team — wir antworten schnell und persönlich.
        </p>
      </div>
    </section>

    <!-- Contact Cards -->
    <section class="pb-20 px-6">
      <div class="max-w-4xl mx-auto grid sm:grid-cols-2 gap-5">

        <!-- Sales -->
        <div class="rounded-2xl p-8 border border-gray-100 hover:border-purple-100 transition-all group">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-all group-hover:scale-110"
            style="background: rgba(96,0,189,0.08)">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#6000BD" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p class="text-xs font-bold uppercase tracking-widest mb-1" style="color: #6000BD">Sales & Beratung</p>
          <h2 class="text-lg font-extrabold text-gray-900 mb-2">Du möchtest simy kennenlernen?</h2>
          <p class="text-sm text-gray-500 leading-relaxed mb-6">Fragen zu Funktionen, Preisen oder einem personalisierten Setup — schreib uns oder starte direkt mit dem kostenlosen Test.</p>
          <div class="space-y-2">
            <a href="mailto:info@simy.ch"
              class="flex items-center gap-3 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors group/link">
              <span class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all group-hover/link:scale-105"
                style="background: rgba(96,0,189,0.07)">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#6000BD" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </span>
              info@simy.ch
            </a>
            <a href="tel:+41797157027"
              class="flex items-center gap-3 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors group/link">
              <span class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all group-hover/link:scale-105"
                style="background: rgba(96,0,189,0.07)">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#6000BD" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                </svg>
              </span>
              +41 79 715 70 27
            </a>
          </div>
          <div class="mt-6 pt-5 border-t border-gray-100">
            <a href="https://app.simy.ch/tenant-register"
              class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90"
              style="background: linear-gradient(135deg, #6000BD, #8B2FE8)">
              Kostenlos starten →
            </a>
          </div>
        </div>

        <!-- Support -->
        <div class="rounded-2xl p-8 border border-gray-100 hover:border-purple-100 transition-all group">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-all group-hover:scale-110"
            style="background: rgba(96,0,189,0.08)">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#6000BD" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"/>
            </svg>
          </div>
          <p class="text-xs font-bold uppercase tracking-widest mb-1" style="color: #6000BD">Support</p>
          <h2 class="text-lg font-extrabold text-gray-900 mb-2">Technische Fragen oder ein Problem?</h2>
          <p class="text-sm text-gray-500 leading-relaxed mb-6">Unser Support-Team hilft bei technischen Fragen, Einrichtung und allem rund um deinen simy-Account.</p>
          <div class="space-y-2">
            <a href="mailto:support@simy.ch"
              class="flex items-center gap-3 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors group/link">
              <span class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all group-hover/link:scale-105"
                style="background: rgba(96,0,189,0.07)">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#6000BD" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </span>
              support@simy.ch
            </a>
          </div>
          <div class="mt-6 pt-5 border-t border-gray-100">
            <div class="flex items-center gap-2 text-xs text-gray-400">
              <span class="inline-block w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0"></span>
              Antwort innerhalb von 24h an Werktagen
            </div>
          </div>
        </div>

        <!-- Partnership -->
        <div class="rounded-2xl p-8 border border-gray-100 hover:border-purple-100 transition-all group">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-all group-hover:scale-110"
            style="background: rgba(96,0,189,0.08)">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#6000BD" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <p class="text-xs font-bold uppercase tracking-widest mb-1" style="color: #6000BD">Partnerships</p>
          <h2 class="text-lg font-extrabold text-gray-900 mb-2">Zusammenarbeit oder Integration?</h2>
          <p class="text-sm text-gray-500 leading-relaxed mb-6">Du bietest ein Produkt oder eine Dienstleistung für Fahrschulen an und möchtest mit simy kooperieren?</p>
          <div class="space-y-2">
            <a href="mailto:partner@simy.ch"
              class="flex items-center gap-3 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors group/link">
              <span class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all group-hover/link:scale-105"
                style="background: rgba(96,0,189,0.07)">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#6000BD" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </span>
              partner@simy.ch
            </a>
          </div>
          <div class="mt-6 pt-5 border-t border-gray-100">
            <a href="/partner" class="text-sm font-semibold hover:underline" style="color: #6000BD">
              Aktuelle Partner ansehen →
            </a>
          </div>
        </div>

        <!-- Datenschutz -->
        <div class="rounded-2xl p-8 border border-gray-100 hover:border-purple-100 transition-all group">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-all group-hover:scale-110"
            style="background: rgba(96,0,189,0.08)">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#6000BD" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </div>
          <p class="text-xs font-bold uppercase tracking-widest mb-1" style="color: #6000BD">Datenschutz & Recht</p>
          <h2 class="text-lg font-extrabold text-gray-900 mb-2">Datenschutz-Anfragen</h2>
          <p class="text-sm text-gray-500 leading-relaxed mb-6">Anfragen zu Datenlöschung, Auskunftsrecht (DSG/DSGVO) oder rechtlichen Themen gehen direkt an unser Datenschutz-Team.</p>
          <div class="space-y-2">
            <a href="mailto:datenschutz@simy.ch"
              class="flex items-center gap-3 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors group/link">
              <span class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all group-hover/link:scale-105"
                style="background: rgba(96,0,189,0.07)">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#6000BD" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </span>
              datenschutz@simy.ch
            </a>
          </div>
          <div class="mt-6 pt-5 border-t border-gray-100">
            <a href="/datenschutz" class="text-sm font-semibold hover:underline" style="color: #6000BD">
              Datenschutzerklärung lesen →
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- Address + Response Time Strip -->
    <section class="py-10 px-6 bg-gray-50 border-y border-gray-100">
      <div class="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-8 sm:gap-16">
        <div class="flex items-start gap-4">
          <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style="background: rgba(96,0,189,0.08)">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#6000BD" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <div>
            <p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Adresse</p>
            <p class="text-sm text-gray-700 font-medium">simy GmbH</p>
            <p class="text-sm text-gray-500">Weiherweg 2, 8610 Uster</p>
          </div>
        </div>

        <div class="h-px sm:h-12 w-full sm:w-px bg-gray-200"></div>

        <div class="flex items-start gap-4">
          <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style="background: rgba(96,0,189,0.08)">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#6000BD" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Reaktionszeit</p>
            <p class="text-sm text-gray-700 font-medium">Innerhalb 24h</p>
            <p class="text-sm text-gray-500">Mo–Fr, 09:00–18:00</p>
          </div>
        </div>

        <div class="h-px sm:h-12 w-full sm:w-px bg-gray-200"></div>

        <div class="flex items-start gap-4">
          <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style="background: rgba(96,0,189,0.08)">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#6000BD" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"/>
            </svg>
          </div>
          <div>
            <p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Swiss Made</p>
            <p class="text-sm text-gray-700 font-medium">100 % in der Schweiz</p>
            <p class="text-sm text-gray-500">Entwicklung & Support</p>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="py-20 px-6">
      <div class="max-w-3xl mx-auto">
        <h2 class="text-2xl font-extrabold text-gray-900 text-center mb-3">Häufige Fragen</h2>
        <p class="text-center text-gray-400 text-sm mb-12">Alles rund um simy und die Zusammenarbeit</p>

        <div class="space-y-10">
          <div v-for="(group, gi) in faqGroups" :key="gi">
            <p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">{{ group.label }}</p>
            <div class="space-y-2">
              <details v-for="(item, i) in group.items" :key="i"
                class="rounded-xl border border-gray-100 p-5 cursor-pointer hover:border-purple-100 transition group">
                <summary class="font-semibold text-gray-900 flex justify-between items-center text-sm">
                  {{ item.q }}
                  <span class="text-purple-400 group-open:rotate-180 transition text-xs ml-4 shrink-0">▼</span>
                </summary>
                <p class="text-gray-500 mt-3 text-sm leading-relaxed" v-html="item.a"></p>
              </details>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-20 px-6" style="background: linear-gradient(135deg, #6000BD, #8B2FE8)">
      <div class="max-w-xl mx-auto text-center">
        <h2 class="text-3xl font-black text-white mb-4">Lieber direkt einsteigen?</h2>
        <p class="text-purple-200 mb-8 text-sm">60 Tage kostenlos testen — kein Kreditkarte, keine Kündigung nötig.</p>
        <a href="https://app.simy.ch/tenant-register"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white font-black text-base transition-all hover:opacity-90"
          style="color: #6000BD">
          Kostenlos starten →
        </a>
      </div>
    </section>

    <SimyFooter />
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Kontakt – simy | Fahrschulsoftware Schweiz',
  meta: [
    { name: 'description', content: 'Kontaktiere das simy-Team für Fragen zu Fahrschulsoftware, Support, Preisen oder Partnerschaften. Antwort innerhalb von 24h.' },
    { property: 'og:title', content: 'Kontakt – simy | Fahrschulsoftware' },
    { property: 'og:description', content: 'Schreib uns für Sales, Support, Partnerships oder Datenschutz. Wir antworten innert 24h.' },
    { property: 'og:url', content: 'https://simy.ch/kontakt' },
    { name: 'robots', content: 'index, follow' },
  ],
  link: [{ rel: 'canonical', href: 'https://simy.ch/kontakt' }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ContactPage',
        name: 'Kontakt – simy GmbH',
        url: 'https://simy.ch/kontakt',
        mainEntity: {
          '@type': 'Organization',
          name: 'simy GmbH',
          url: 'https://simy.ch',
          email: 'info@simy.ch',
          telephone: '+41797157027',
          address: {
            '@type': 'PostalAddress',
            streetAddress: 'Weiherweg 2',
            addressLocality: 'Uster',
            postalCode: '8610',
            addressCountry: 'CH',
          },
        },
      }),
    },
  ],
})

const faqGroups = [
  {
    label: 'Produkt & Test',
    items: [
      {
        q: 'Kann ich simy kostenlos testen?',
        a: 'Ja — simy ist <strong>60 Tage vollständig kostenlos</strong> testbar. Keine Kreditkarte nötig, keine automatische Verlängerung. Einfach unter <a href="https://app.simy.ch/tenant-register" class="text-purple-600 hover:underline">app.simy.ch/tenant-register</a> registrieren und sofort loslegen.',
      },
      {
        q: 'Brauche ich technisches Vorwissen?',
        a: 'Nein. simy ist darauf ausgelegt, dass Fahrlehrer ohne IT-Kenntnisse in wenigen Minuten starten können. Ein Setup-Wizard führt dich durch alle wichtigen Einstellungen.',
      },
      {
        q: 'Was passiert nach dem Gratiszeitraum?',
        a: 'Du entscheidest selbst, ob du weitermachen möchtest. Falls ja, kannst du direkt in der App upgraden. Falls nicht, läuft der Account einfach aus — keine Kündigung nötig, keine versteckten Gebühren.',
      },
      {
        q: 'Auf welchen Geräten funktioniert simy?',
        a: 'simy läuft im Browser auf jedem Gerät. Zusätzlich gibt es eine <strong>native App für iOS und Android</strong> für Fahrlehrer — ideal für den Alltag im Auto.',
      },
    ],
  },
  {
    label: 'Preise & Abonnement',
    items: [
      {
        q: 'Was kostet simy nach der Testphase?',
        a: 'Pläne starten ab <strong>CHF 69 pro Monat</strong>. Alle Details und Vergleiche findest du transparent auf der <a href="/preise" class="text-purple-600 hover:underline">Preisseite</a> — ohne Überraschungen.',
      },
      {
        q: 'Gibt es einen Jahresrabatt?',
        a: 'Ja, bei jährlicher Zahlung sparst du gegenüber dem Monatsabo. Die genauen Konditionen siehst du in der App nach dem Trial oder direkt auf <a href="/preise" class="text-purple-600 hover:underline">simy.ch/preise</a>.',
      },
      {
        q: 'Wie läuft die Kündigung ab?',
        a: 'Jederzeit kündbar, zum Ende des laufenden Abrechnungszeitraums. Keine Mindestlaufzeit, keine Stornogebühren. Kündigung direkt in den Account-Einstellungen in der App.',
      },
    ],
  },
  {
    label: 'Daten & Sicherheit',
    items: [
      {
        q: 'Wo werden meine Daten gespeichert?',
        a: 'Alle Daten werden in der Schweiz gespeichert und sind vollständig <strong>DSGVO- und DSG-konform</strong>. simy nutzt Supabase mit europäischen Servern für maximale Datensicherheit.',
      },
      {
        q: 'Kann ich meine Daten exportieren?',
        a: 'Ja. Du kannst deine Schüler-, Buchungs- und Rechnungsdaten jederzeit exportieren — auch wenn du simy nicht mehr nutzt. Deine Daten gehören dir.',
      },
      {
        q: 'Wie stelle ich eine DSG-Auskunftsanfrage?',
        a: 'Für Datenschutz-Anfragen (Auskunft, Löschung, Berichtigung) wende dich direkt an <a href="mailto:datenschutz@simy.ch" class="text-purple-600 hover:underline">datenschutz@simy.ch</a>. Wir bearbeiten Anfragen innerhalb der gesetzlichen Fristen.',
      },
    ],
  },
]
</script>
