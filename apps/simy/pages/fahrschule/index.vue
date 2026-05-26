<template>
  <div class="min-h-screen bg-white font-sans">
    <SimyNav />

    <!-- ── Hero ─────────────────────────────────────────────────────────────── -->
    <section class="relative overflow-hidden pt-20 pb-28 px-6">
      <!-- Background gradient blob -->
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full opacity-[0.07]"
          style="background: radial-gradient(circle, #6000BD 0%, transparent 70%)"></div>
        <div class="absolute top-1/2 -left-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style="background: radial-gradient(circle, #8B2FE8 0%, transparent 70%)"></div>
      </div>

      <div class="relative max-w-5xl mx-auto text-center">
        <div class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider mb-6 border"
          style="background: rgba(96,0,189,0.07); color: #6000BD; border-color: rgba(96,0,189,0.25)">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
          </svg>
          Für Fahrschulen
        </div>

        <h1 class="text-5xl md:text-6xl font-black text-gray-900 mb-6 leading-[1.1] tracking-tight">
          Die Software, mit der<br />
          <span style="background: linear-gradient(135deg, #6000BD, #8B2FE8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
            Fahrschulen wachsen
          </span>
        </h1>
        <p class="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Terminverwaltung, automatische Rechnungen, Fahrlehrer-App und professionelle Website — alles in simy. Keine Insellösungen, kein Excel.
        </p>

        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="https://app.simy.ch/tenant-register"
            class="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-white font-bold text-base transition-all hover:opacity-90 hover:-translate-y-0.5"
            style="background: linear-gradient(135deg, #6000BD, #8B2FE8); box-shadow: 0 8px 30px rgba(96,0,189,0.3);">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            60 Tage kostenlos testen
          </a>
          <a href="#features"
            class="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl font-bold text-base border border-gray-200 text-gray-700 hover:bg-gray-50 hover:-translate-y-0.5 transition-all">
            Features entdecken
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </a>
        </div>

        <!-- Trust badges -->
        <div class="flex flex-wrap items-center justify-center gap-5 mt-12 text-sm text-gray-400">
          <span class="flex items-center gap-1.5">
            <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
            Kein Kreditkarte nötig
          </span>
          <span class="flex items-center gap-1.5">
            <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
            In 5 Min. startklar
          </span>
          <span class="flex items-center gap-1.5">
            <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
            Swiss Made
          </span>
          <span class="flex items-center gap-1.5">
            <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
            DSGVO-konform
          </span>
        </div>
      </div>
    </section>

    <!-- ── Stats ─────────────────────────────────────────────────────────────── -->
    <section class="py-14 px-6 border-y border-gray-100 bg-gray-50">
      <div class="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        <div v-for="stat in stats" :key="stat.label" class="text-center">
          <div class="text-4xl font-black text-gray-900 mb-1" style="color: #6000BD">{{ stat.value }}</div>
          <div class="text-sm text-gray-500">{{ stat.label }}</div>
        </div>
      </div>
    </section>

    <!-- ── Pain → Solution ───────────────────────────────────────────────────── -->
    <section class="py-24 px-6">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-16">
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: #6000BD">Das Problem</p>
          <h2 class="text-4xl font-extrabold text-gray-900 mb-4">Wie viel Zeit verlierst du täglich?</h2>
          <p class="text-gray-500 text-lg max-w-2xl mx-auto">Fahrlehrer verbringen durchschnittlich <strong>2–3 Stunden täglich</strong> mit Administration — Zeit, die du mit Unterrichten verdienen könntest.</p>
        </div>
        <div class="grid md:grid-cols-3 gap-6">
          <div v-for="pain in pains" :key="pain.title"
            class="rounded-2xl p-6 border transition-all duration-300 hover:-translate-y-1"
            style="background: rgba(96,0,189,0.04); border-color: rgba(96,0,189,0.15)">
            <div class="text-3xl mb-3">{{ pain.icon }}</div>
            <h3 class="font-bold text-gray-900 mb-2">{{ pain.title }}</h3>
            <p class="text-sm text-gray-500 leading-relaxed">{{ pain.text }}</p>
          </div>
        </div>
        <div class="text-center mt-12">
          <p class="text-2xl font-black" style="color: #6000BD">simy automatisiert das alles für dich.</p>
        </div>
      </div>
    </section>

    <!-- ── Features ──────────────────────────────────────────────────────────── -->
    <section id="features" class="py-24 px-6 bg-gray-50">
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-16">
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: #6000BD">Features</p>
          <h2 class="text-4xl font-extrabold text-gray-900 mb-4">Alles was deine Fahrschule braucht</h2>
          <p class="text-gray-500 text-lg max-w-xl mx-auto">Vom ersten Schüler-Kontakt bis zur bezahlten Rechnung — simy deckt den ganzen Workflow ab.</p>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="feature in features" :key="feature.title"
            class="bg-white rounded-3xl p-7 border border-gray-100 hover:border-purple-100 hover:-translate-y-1 transition-all duration-300 group">
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-all group-hover:scale-110"
              style="background: rgba(96,0,189,0.08)">
              <span class="text-2xl">{{ feature.icon }}</span>
            </div>
            <h3 class="font-bold text-gray-900 mb-2 text-lg">{{ feature.title }}</h3>
            <p class="text-sm text-gray-500 leading-relaxed mb-4">{{ feature.desc }}</p>
            <a v-if="feature.link" :href="feature.link" class="text-xs font-semibold transition-colors" style="color: #6000BD">
              Mehr erfahren →
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Website Generator Highlight ─────────────────────────────────────── -->
    <section class="py-24 px-6">
      <div class="max-w-5xl mx-auto">
        <div class="rounded-3xl p-10 md:p-14 relative overflow-hidden border border-purple-100"
          style="background: linear-gradient(135deg, rgba(96,0,189,0.04) 0%, rgba(139,47,232,0.06) 100%)">
          <div class="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
            style="background: radial-gradient(circle, #8B2FE8, transparent); transform: translate(30%, -30%)"></div>
          <div class="relative grid md:grid-cols-2 gap-10 items-center">
            <div>
              <div class="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold mb-5 border"
                style="background: rgba(96,0,189,0.08); color: #6000BD; border-color: rgba(96,0,189,0.2)">
                NEU — Website-Generator
              </div>
              <h2 class="text-3xl font-extrabold text-gray-900 mb-4">In 24h zu einer professionellen Website</h2>
              <p class="text-gray-500 leading-relaxed mb-6">simy generiert automatisch eine hochwertige Website aus deinen Daten — mit deinen Preisen, deinen Fahrlehrern und deinen Farben. Kein Designer nötig.</p>
              <ul class="space-y-3 mb-8">
                <li v-for="item in websiteFeatures" :key="item" class="flex items-center gap-3 text-sm text-gray-700">
                  <svg class="w-5 h-5 flex-shrink-0" style="color: #6000BD" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  {{ item }}
                </li>
              </ul>
              <a href="https://app.simy.ch/tenant-register"
                class="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90"
                style="background: linear-gradient(135deg, #6000BD, #8B2FE8)">
                Jetzt Website generieren →
              </a>
            </div>
            <div class="hidden md:block">
              <div class="rounded-2xl bg-white border border-gray-100 p-6 shadow-xl">
                <div class="flex items-center gap-2 mb-4">
                  <div class="w-3 h-3 rounded-full bg-red-400"></div>
                  <div class="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div class="w-3 h-3 rounded-full bg-green-400"></div>
                  <div class="ml-2 flex-1 h-5 rounded bg-gray-100 text-xs flex items-center justify-center text-gray-400 font-mono">simy.ch/fahrschule-muster</div>
                </div>
                <div class="space-y-2">
                  <div class="h-24 rounded-xl" style="background: linear-gradient(135deg, rgba(96,0,189,0.12), rgba(139,47,232,0.12))"></div>
                  <div class="grid grid-cols-3 gap-2">
                    <div class="h-14 rounded-lg bg-gray-50 border border-gray-100"></div>
                    <div class="h-14 rounded-lg bg-gray-50 border border-gray-100"></div>
                    <div class="h-14 rounded-lg bg-gray-50 border border-gray-100"></div>
                  </div>
                  <div class="h-3 w-3/4 rounded bg-gray-100"></div>
                  <div class="h-3 w-1/2 rounded bg-gray-100"></div>
                  <div class="h-8 w-1/3 rounded-lg mt-2" style="background: rgba(96,0,189,0.15)"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Marketing Add-on ────────────────────────────────────────────────── -->
    <section class="py-16 px-6 bg-gray-950">
      <div class="max-w-4xl mx-auto text-center">
        <p class="text-xs font-bold uppercase tracking-widest mb-4 text-purple-400">Marketing</p>
        <h2 class="text-3xl font-extrabold text-white mb-4">Mehr Schüler durch Google Ads & SEO</h2>
        <p class="text-gray-400 max-w-xl mx-auto mb-8">simy ist mehr als Software — wir bringen dir auch neue Kunden. Mit gezielten Google Ads und lokalem SEO, das wirklich funktioniert.</p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/marketing/google-ads"
            class="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-white font-bold text-sm border border-purple-500/30 hover:border-purple-500/60 transition-all"
            style="background: rgba(96,0,189,0.2)">
            Google Ads für Fahrschulen →
          </a>
          <a href="/marketing/seo"
            class="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-gray-300 font-bold text-sm border border-gray-700 hover:border-gray-500 transition-all">
            SEO für Fahrschulen →
          </a>
        </div>
      </div>
    </section>

    <!-- ── Testimonial ────────────────────────────────────────────────────── -->
    <section class="py-24 px-6">
      <div class="max-w-4xl mx-auto">
        <div class="text-center mb-14">
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: #6000BD">Kundenstimmen</p>
          <h2 class="text-3xl font-extrabold text-gray-900">Was Fahrschulen über simy sagen</h2>
        </div>
        <div class="grid md:grid-cols-2 gap-6">
          <div v-for="t in testimonials" :key="t.name"
            class="rounded-2xl p-7 border border-gray-100 bg-white hover:border-purple-100 transition-all">
            <div class="flex gap-1 mb-4">
              <svg v-for="i in 5" :key="i" class="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
            </div>
            <p class="text-gray-700 leading-relaxed mb-5 text-sm">"{{ t.quote }}"</p>
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style="background: linear-gradient(135deg, #6000BD, #8B2FE8)">
                {{ t.name[0] }}
              </div>
              <div>
                <p class="font-bold text-gray-900 text-sm">{{ t.name }}</p>
                <p class="text-xs text-gray-400">{{ t.school }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── FAQ ───────────────────────────────────────────────────────────────── -->
    <section class="py-24 px-6 bg-gray-50">
      <div class="max-w-2xl mx-auto">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-extrabold text-gray-900">Häufige Fragen</h2>
        </div>
        <div class="space-y-3">
          <div v-for="(faq, i) in faqs" :key="i"
            class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <button @click="openFaq = openFaq === i ? null : i"
              class="w-full flex items-center justify-between px-6 py-5 text-left font-semibold text-gray-900 hover:bg-gray-50 transition-colors">
              {{ faq.q }}
              <svg class="w-5 h-5 text-gray-400 flex-shrink-0 transition-transform"
                :class="openFaq === i ? 'rotate-180' : ''"
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            <Transition name="faq">
              <div v-if="openFaq === i" class="px-6 pb-5 text-sm text-gray-500 leading-relaxed border-t border-gray-50">
                <div class="pt-4">{{ faq.a }}</div>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Final CTA ─────────────────────────────────────────────────────────── -->
    <section class="py-28 px-6" style="background: linear-gradient(135deg, #6000BD 0%, #8B2FE8 100%)">
      <div class="max-w-2xl mx-auto text-center">
        <h2 class="text-4xl font-black text-white mb-5">Bereit, deine Fahrschule auf Autopilot zu stellen?</h2>
        <p class="text-purple-200 text-lg mb-10">60 Tage kostenlos testen. Kein Kreditkarte, keine Kündigung nötig. In 5 Minuten startklar.</p>
        <a href="https://app.simy.ch/tenant-register"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white font-black text-lg transition-all hover:opacity-90 hover:-translate-y-1"
          style="color: #6000BD; box-shadow: 0 12px 40px rgba(0,0,0,0.2)">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          Jetzt kostenlos starten
        </a>
        <p class="text-purple-300 text-sm mt-5">Bereits über 50 Fahrschulen vertrauen simy</p>
      </div>
    </section>

    <SimyFooter />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

useHead({
  title: 'Fahrschulsoftware Schweiz – simy | Verwaltung, Website & Marketing',
  meta: [
    { name: 'description', content: 'simy ist die All-in-One Fahrschulsoftware für die Schweiz. Terminbuchung, automatische Rechnungen, Fahrlehrer-App und professionelle Website. 60 Tage kostenlos.' },
    { name: 'keywords', content: 'fahrschulsoftware, software fahrschule, fahrschule app, verwaltungssoftware fahrschule, fahrlehrer app' },
    { property: 'og:title', content: 'Fahrschulsoftware Schweiz – simy | Die All-in-One Lösung' },
    { property: 'og:description', content: 'Terminbuchung, Rechnungen, App und Website — alles in simy. 60 Tage kostenlos testen.' },
    { property: 'og:url', content: 'https://simy.ch/fahrschule' },
    { name: 'twitter:title', content: 'Fahrschulsoftware Schweiz – simy' },
    { name: 'twitter:description', content: 'All-in-One Fahrschulsoftware: Terminbuchung, Rechnungen, App, Website. 60 Tage gratis.' },
  ],
  link: [{ rel: 'canonical', href: 'https://simy.ch/fahrschule' }],
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'simy',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description: 'All-in-One Fahrschulsoftware für die Schweiz',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'CHF', description: '60 Tage kostenlos testen' },
        aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.9', reviewCount: '128' },
      }),
    },
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'Was kostet simy für Fahrschulen?', acceptedAnswer: { '@type': 'Answer', text: 'simy bietet Pläne ab CHF 69/Monat. Die ersten 60 Tage sind vollständig kostenlos — keine Kreditkarte nötig.' } },
          { '@type': 'Question', name: 'Wie lange dauert die Einrichtung?', acceptedAnswer: { '@type': 'Answer', text: 'In der Regel unter 15 Minuten. Der Setup-Wizard führt durch alle Schritte.' } },
          { '@type': 'Question', name: 'Können meine Schüler selbst Termine buchen?', acceptedAnswer: { '@type': 'Answer', text: 'Ja. Jede Fahrschule erhält einen personalisierten Buchungslink, den du auf deiner Website oder per WhatsApp teilen kannst.' } },
        ],
      }),
    },
  ],
})

const openFaq = ref<number | null>(null)

const stats = [
  { value: '50+', label: 'Fahrschulen in der Schweiz' },
  { value: '2–3h', label: 'Admin täglich gespart' },
  { value: '4.9★', label: 'Kundenbewertung' },
  { value: '5 Min', label: 'Bis zur ersten Buchung' },
]

const pains = [
  { icon: '📱', title: 'WhatsApp-Chaos', text: 'Termine per WhatsApp koordinieren, Absagen vergessen, doppelte Buchungen — das kennen alle Fahrlehrer.' },
  { icon: '📊', title: 'Excel & Papier', text: 'Stundenlisten auf Papier, Rechnungen in Word, Zahlungseingänge manuell prüfen. Ineffizient und fehleranfällig.' },
  { icon: '🔁', title: 'Kein Überblick', text: 'Wer hat was bezahlt? Welcher Schüler braucht wie viele Stunden noch? Diese Fragen kosten täglich wertvolle Zeit.' },
]

const features = [
  { icon: '📅', title: 'Online-Terminbuchung', desc: 'Schüler buchen selbst — per Link, rund um die Uhr. Du siehst alles in einem Kalender.', link: '/fahrschule/buchungssystem' },
  { icon: '💶', title: 'Automatische Rechnungen', desc: 'Rechnungen werden automatisch erstellt und per E-Mail versendet. Zahlungserinnerungen laufen von selbst.', link: null },
  { icon: '📱', title: 'Fahrlehrer-App', desc: 'Dein Kalender, deine Schüler, deine Einnahmen — alles auf dem Smartphone, auch offline.', link: '/fahrschule/app' },
  { icon: '🌐', title: 'Website-Generator', desc: 'simy erstellt automatisch eine professionelle Website mit deinen Daten, Preisen und Fahrlehrern.', link: null },
  { icon: '📊', title: 'Statistiken & Berichte', desc: 'Einnahmen, Fahrstunden, Prüfungsquote — alle Zahlen auf einen Blick.', link: null },
  { icon: '🎨', title: 'Dein Branding', desc: 'simy läuft in deinen Farben und mit deinem Logo — für deine Schüler sieht es aus wie deine eigene App.', link: null },
]

const websiteFeatures = [
  'Automatisch aus deinen simy-Daten generiert',
  'Mit deinen Preisen, Fahrlehrern & Fotos',
  'Professionelles Design, mobiloptimiert',
  'SEO-optimiert für Google',
  'Eigene Domain möglich',
]

const testimonials = [
  { name: 'Pascal Kilchenmann', school: 'Driving Team, Zürich', quote: 'simy hat unsere Administration komplett digitalisiert. Wir sparen täglich Stunden an Büroarbeit und unsere Schüler lieben die einfache Online-Buchung.' },
  { name: 'Sandra M.', school: 'Fahrschule Muster, Bern', quote: 'Endlich kein Excel mehr! simy erinnert unsere Schüler automatisch an Termine und versendet Rechnungen von selbst. Ich kann mich wieder aufs Unterrichten konzentrieren.' },
]

const faqs = [
  { q: 'Was kostet simy für Fahrschulen?', a: 'simy bietet verschiedene Pläne ab CHF 69/Monat. Du kannst 60 Tage vollständig kostenlos testen — ohne Kreditkarte.' },
  { q: 'Wie lange dauert die Einrichtung?', a: 'In der Regel bist du in unter 15 Minuten startklar. Der Setup-Wizard führt dich durch alle Schritte: Kategorien, Preise, Standorte und Fahrlehrer.' },
  { q: 'Können meine Schüler selbst Termine buchen?', a: 'Ja. Jede Fahrschule erhält einen personalisierten Buchungslink, den du auf deiner Website oder in WhatsApp teilen kannst.' },
  { q: 'Funktioniert simy auch auf dem Smartphone?', a: 'Ja. Die Fahrlehrer-App läuft auf iOS und Android. Deine Schüler können den Buchungslink direkt im Browser öffnen.' },
  { q: 'Sind meine Daten in der Schweiz gespeichert?', a: 'Ja. simy speichert alle Daten auf Schweizer Servern und ist vollständig DSGVO-konform.' },
  { q: 'Kann ich simy zusammen mit meiner bestehenden Website nutzen?', a: 'Ja. Du kannst einfach den Buchungslink auf deiner Website einbinden. Optional generiert simy auch eine komplette Website für dich.' },
]
</script>

<style scoped>
.faq-enter-active, .faq-leave-active { transition: all 0.2s ease; overflow: hidden; }
.faq-enter-from, .faq-leave-to { max-height: 0; opacity: 0; }
.faq-enter-to, .faq-leave-from { max-height: 300px; opacity: 1; }
</style>
