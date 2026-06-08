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
        <nav class="flex items-center gap-2 text-xs text-gray-400 mb-8">
          <a href="/" class="hover:text-gray-600">Simy</a><span>›</span>
          <a href="/marketing" class="hover:text-gray-600">Marketing</a><span>›</span>
          <span class="text-gray-600">Google Ads</span>
        </nav>
        <div class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider mb-6 border"
          style="background: rgba(var(--brand-rgb),0.07); color: var(--brand-primary); border-color: rgba(var(--brand-rgb),0.25)">
          📢 Google Ads für Fahrschulen
        </div>
        <h1 class="text-3xl md:text-5xl font-black text-gray-900 mb-6 leading-tight">
          Google Ads für Fahrschulen —<br/>
          <span style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
            Sofort gefunden werden
          </span>
        </h1>
        <p class="text-xl text-gray-500 max-w-2xl mb-10 leading-relaxed">
          Wenn jemand "Fahrschule [deine Stadt]" googelt, erscheinst du zuoberst. Simy erstellt und optimiert deine Kampagnen — du konzentrierst dich aufs Unterrichten.
        </p>
        <div class="flex flex-col sm:flex-row gap-4">
          <a href="https://app.simy.ch/tenant-register"
            class="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-white font-bold transition-all hover:opacity-90"
            style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); box-shadow: 0 8px 24px rgba(var(--brand-rgb),0.3)">
            Kostenlose Beratung anfragen →
          </a>
        </div>
      </div>
    </section>

    <!-- Google Ads Search Preview -->
    <section class="py-10 px-6 bg-gray-50 border-y border-gray-100">
      <div class="max-w-2xl mx-auto">
        <p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 text-center">So sieht deine Anzeige aus</p>
        <div class="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
              <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/></svg>
            </div>
            <span class="text-sm text-gray-500 font-mono">fahrschule zürich</span>
          </div>
          <div class="border-l-4 border-green-500 pl-4 space-y-1">
            <p class="text-xs text-gray-400">Anzeige · deineschule.ch</p>
            <p class="text-base font-medium text-blue-700 leading-tight">Fahrschule Zürich — Online buchen & sofort starten</p>
            <p class="text-sm text-gray-500">Verfügbare Termine heute ✓ Online-Buchung ✓ Flexible Zeiten ✓ Erfolgreich seit...</p>
          </div>
        </div>
        <p class="text-xs text-center text-gray-400 mt-3">Erscheint sofort — noch bevor die organischen Ergebnisse</p>
      </div>
    </section>

    <!-- How we work -->
    <section class="py-24 px-6">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-16">
          <h2 class="text-3xl font-extrabold text-gray-900 mb-4">Unser Google Ads Prozess</h2>
          <p class="text-gray-500 max-w-xl mx-auto">Von der Keyword-Analyse bis zur laufenden Optimierung — alles wird von uns übernommen.</p>
        </div>
        <div class="grid md:grid-cols-4 gap-6">
          <div v-for="(step, i) in process" :key="i" class="text-center relative">
            <div class="w-12 h-12 rounded-full flex items-center justify-center text-white font-black mx-auto mb-4"
              style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))">{{ i + 1 }}</div>
            <h3 class="font-bold text-gray-900 mb-2 text-sm">{{ step.title }}</h3>
            <p class="text-xs text-gray-500 leading-relaxed">{{ step.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- What's included -->
    <section class="py-20 px-6 bg-gray-50">
      <div class="max-w-4xl mx-auto">
        <h2 class="text-3xl font-extrabold text-gray-900 mb-10 text-center">Was im Google Ads Paket enthalten ist</h2>
        <div class="grid md:grid-cols-2 gap-5">
          <div v-for="item in included" :key="item.title"
            class="bg-white rounded-2xl p-6 border border-gray-100 flex gap-4">
            <span class="text-2xl flex-shrink-0">{{ item.icon }}</span>
            <div>
              <h3 class="font-bold text-gray-900 mb-1">{{ item.title }}</h3>
              <p class="text-sm text-gray-500 leading-relaxed">{{ item.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="py-20 px-6">
      <div class="max-w-2xl mx-auto">
        <h2 class="text-3xl font-extrabold text-gray-900 mb-10 text-center">Häufige Fragen zu Google Ads</h2>
        <div class="space-y-3">
          <div v-for="(faq, i) in faqs" :key="i" class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
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

    <!-- CTA -->
    <section class="py-20 px-6" style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))">
      <div class="max-w-2xl mx-auto text-center">
        <h2 class="text-3xl font-black text-white mb-4">Mehr Schüler ab sofort?</h2>
        <p class="text-purple-200 mb-8">Jetzt kostenloses Erstgespräch buchen — wir zeigen dir, was in deiner Region möglich ist.</p>
        <a href="https://app.simy.ch/tenant-register"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white font-black text-lg transition-all hover:opacity-90"
          style="color: var(--brand-primary)">
          Beratungsgespräch buchen →
        </a>
      </div>
    </section>

    <SimyFooter />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

useHead({
  title: 'Google Ads für Fahrschulen – Sofort mehr Schüler | Simy',
  meta: [
    { name: 'description', content: 'Google Ads für Fahrschulen: Simy erstellt und betreut deine Kampagnen. Sofort in Google Top-Positionen. Mehr Anfragen, mehr Buchungen. Jetzt Beratung anfragen.' },
    { name: 'keywords', content: 'google ads fahrschule, google adwords fahrschule, werbung fahrschule, online marketing fahrschule' },
    { property: 'og:title', content: 'Google Ads für Fahrschulen – Simy | Sofort sichtbar bei Google' },
    { property: 'og:description', content: 'Wir erstellen & betreuen Google Ads für Fahrschulen. Sofortige Leads, messbare Ergebnisse.' },
    { property: 'og:url', content: 'https://simy.ch/marketing/google-ads' },
  ],
  link: [{ rel: 'canonical', href: 'https://simy.ch/marketing/google-ads' }],
  script: [{
    type: 'application/ld+json',
    children: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Simy', item: 'https://simy.ch/' },
        { '@type': 'ListItem', position: 2, name: 'Marketing', item: 'https://simy.ch/marketing' },
        { '@type': 'ListItem', position: 3, name: 'Google Ads für Fahrschulen' },
      ],
    }),
  }],
})

const openFaq = ref<number | null>(null)

const process = [
  { title: 'Analyse & Strategie', desc: 'Wir analysieren deine Region, Mitbewerber und die besten Keywords für maximale Leads.' },
  { title: 'Kampagnen-Setup', desc: 'Wir erstellen alle Anzeigentexte, Kampagnenstrukturen und Landingpages.' },
  { title: 'Launch', desc: 'Deine Kampagne geht live. Erste Klicks und Anfragen kommen innerhalb von 24–48h.' },
  { title: 'Optimierung', desc: 'Monatliche Auswertung und Anpassung — für immer bessere Ergebnisse und tiefere Kosten.' },
]

const included = [
  { icon: '🔍', title: 'Keyword-Recherche', desc: 'Wir identifizieren alle relevanten Suchbegriffe in deiner Region mit hohem Buchungsabsicht.' },
  { icon: '✍️', title: 'Anzeigentexte', desc: 'Professionelle, getestete Texte, die Klicks und Anfragen generieren.' },
  { icon: '🎯', title: 'Geo-Targeting', desc: 'Anzeigen nur für Nutzer in deinem Einzugsgebiet — kein Budget verschwenden.' },
  { icon: '📊', title: 'Monatliches Reporting', desc: 'Klares Report mit Kosten, Klicks, Anfragen und ROI — keine Blackbox.' },
  { icon: '🔗', title: 'Integration mit Simy', desc: 'Anfragen aus Google Ads landen direkt im Simy-Dashboard als Lead.' },
  { icon: '📞', title: 'Persönliche Betreuung', desc: 'Du hast einen festen Ansprechpartner — erreichbar per E-Mail und Telefon.' },
]

const faqs = [
  { q: 'Was kostet Google Ads für eine Fahrschule?', a: 'Das Werbebudget liegt je nach Region bei CHF 200–500/Monat. Hinzu kommt die Simy-Verwaltungsgebühr. Im Durchschnitt kostet eine neue Schüler-Anfrage CHF 8–20.' },
  { q: 'Wie schnell sieht man Ergebnisse?', a: 'Die ersten Anfragen kommen in der Regel innerhalb von 48 Stunden nach dem Start. Die Optimierung der Kampagnen dauert 2–4 Wochen.' },
  { q: 'Muss ich ein Simy-Konto haben?', a: 'Für die optimale Integration ja — aber wir können Google Ads auch standalone betreuen. Empfehlenswert ist die Kombination, da Anfragen direkt als Leads im System landen.' },
  { q: 'Kann ich das Budget selbst festlegen?', a: 'Ja, du bestimmst das monatliche Budget. Wir empfehlen ein Mindestbudget von CHF 200/Monat, damit die Kampagne genug Daten für die Optimierung sammeln kann.' },
]
</script>

<style scoped>
.faq-enter-active, .faq-leave-active { transition: all 0.2s ease; overflow: hidden; }
.faq-enter-from, .faq-leave-to { max-height: 0; opacity: 0; }
.faq-enter-to, .faq-leave-from { max-height: 300px; opacity: 1; }
</style>
