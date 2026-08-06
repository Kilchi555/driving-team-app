<template>
  <div class="min-h-screen bg-white font-sans">
    <SimyNav />

    <!-- Hero -->
    <section class="pt-20 pb-24 px-6 relative overflow-hidden">
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full opacity-[0.06]"
          style="background: radial-gradient(circle, var(--brand-primary), transparent)"></div>
        <div class="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-[0.04]"
          style="background: radial-gradient(circle, var(--brand-secondary), transparent)"></div>
      </div>
      <div class="relative max-w-5xl mx-auto text-center">
        <div class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider mb-6 border"
          style="background: rgba(var(--brand-rgb),0.07); color: var(--brand-primary); border-color: rgba(var(--brand-rgb),0.25)">
          🚀 Marketing für Dienstleister
        </div>
        <h1 class="text-5xl md:text-6xl font-black text-gray-900 mb-6 leading-tight">
          Mehr Kunden mit<br />
          <span style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
            lokalem Marketing
          </span>
        </h1>
        <p class="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Simy ist mehr als Verwaltungssoftware. Wir bringen dir aktiv neue Kunden — durch Google Ads und lokales SEO, das für Terminbetriebe wirklich funktioniert.
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="#angebote"
            class="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-white font-bold transition-all hover:opacity-90"
            style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); box-shadow: 0 8px 24px rgba(var(--brand-rgb),0.3)">
            Marketing-Angebote entdecken →
          </a>
          <a href="https://app.simy.ch/tenant-register"
            class="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all">
            Software gratis testen
          </a>
        </div>
      </div>
    </section>

    <!-- Value Prop -->
    <section class="py-14 px-6 border-y border-gray-100 bg-gray-50">
      <div class="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
          <div v-for="vp in valueProps" :key="vp.title" class="text-center">
          <SimyIconTile :name="vp.icon" :size="56" class="mx-auto mb-3" />
          <h3 class="font-bold text-gray-900 mb-1">{{ vp.title }}</h3>
          <p class="text-sm text-gray-500">{{ vp.desc }}</p>
        </div>
      </div>
    </section>

    <!-- Services -->
    <section id="angebote" class="py-24 px-6">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-16">
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary)">Marketing-Angebote</p>
          <h2 class="text-3xl font-extrabold text-gray-900 mb-4">Zwei Wege zu mehr Kunden</h2>
          <p class="text-gray-500 max-w-xl mx-auto">Ob sofortige Leads durch Werbung oder nachhaltiges Wachstum durch SEO — wir haben die richtige Strategie für dein Unternehmen.</p>
        </div>

        <div class="grid md:grid-cols-2 gap-8">
          <!-- Google Ads Card -->
          <div class="rounded-3xl border-2 p-8 hover:-translate-y-1 transition-all group"
            style="border-color: rgba(var(--brand-rgb),0.2); background: rgba(var(--brand-rgb),0.02)">
            <SimyIconTile name="megaphone" :size="56" class="mb-6" />
            <div class="flex items-center gap-3 mb-3">
              <h3 class="text-xl font-black text-gray-900">Google Ads</h3>
              <span class="text-xs font-bold px-3 py-1 rounded-full text-white" style="background: var(--brand-primary)">Sofortige Leads</span>
            </div>
            <p class="text-gray-500 leading-relaxed mb-6">Sofort sichtbar bei Google, wenn jemand dein Angebot in deiner Stadt sucht. Wir erstellen, optimieren und betreuen deine Kampagnen — du zahlst nur für Klicks.</p>
            <ul class="space-y-3 mb-8">
              <li v-for="item in adsHighlights" :key="item" class="flex items-center gap-3 text-sm text-gray-700">
                <svg class="w-4 h-4 flex-shrink-0" style="color: var(--brand-primary)" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
                {{ item }}
              </li>
            </ul>
            <a href="/marketing/google-ads"
              class="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90"
              style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))">
              Mehr über Google Ads →
            </a>
          </div>

          <!-- SEO Card -->
          <div class="rounded-3xl border-2 p-8 hover:-translate-y-1 transition-all group border-gray-100 bg-white">
            <SimyIconTile name="search" :size="56" class="mb-6" />
            <div class="flex items-center gap-3 mb-3">
              <h3 class="text-xl font-black text-gray-900">Lokales SEO</h3>
              <span class="text-xs font-bold px-3 py-1 rounded-full bg-green-100 text-green-700">Nachhaltiges Wachstum</span>
            </div>
            <p class="text-gray-500 leading-relaxed mb-6">Organisch auf Platz 1 bei Google für deine lokalen Suchbegriffe. Einmal oben — dauerhafter Strom an neuen Anfragen, ohne laufende Werbekosten.</p>
            <ul class="space-y-3 mb-8">
              <li v-for="item in seoHighlights" :key="item" class="flex items-center gap-3 text-sm text-gray-700">
                <svg class="w-4 h-4 flex-shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
                {{ item }}
              </li>
            </ul>
            <a href="/marketing/seo"
              class="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm border-2 transition-all hover:bg-gray-50"
              style="border-color: var(--brand-primary); color: var(--brand-primary)">
              Mehr über SEO →
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- Why Simy for marketing -->
    <section class="py-20 px-6 bg-gray-950">
      <div class="max-w-4xl mx-auto">
        <div class="text-center mb-12">
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary)">Warum Simy</p>
          <h2 class="text-3xl font-extrabold text-white mb-4">Marketing + Software = Der Vorteil</h2>
          <p class="text-gray-400 max-w-xl mx-auto">Wer nur Werbung schaltet, verliert potenzielle Kunden durch eine schlechte Website oder ein fehlendes Buchungssystem. Simy schliesst diese Lücke.</p>
        </div>
        <div class="grid md:grid-cols-2 gap-6">
          <div v-for="benefit in whySimy" :key="benefit.title"
            class="rounded-2xl p-6 border border-gray-800">
            <div class="flex items-start gap-4">
              <SimyIconTile :name="benefit.icon" :size="44" />
              <div>
                <h3 class="font-bold text-white mb-2">{{ benefit.title }}</h3>
                <p class="text-sm text-gray-400 leading-relaxed">{{ benefit.desc }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-24 px-6" style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))">
      <div class="max-w-2xl mx-auto text-center">
        <h2 class="text-4xl font-black text-white mb-5">Bereit, mehr Kunden zu gewinnen?</h2>
        <p class="text-white/70 text-lg mb-10">Starte kostenlos mit der Software und frage uns nach unserem Marketing-Paket.</p>
        <a href="https://app.simy.ch/tenant-register"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white font-black text-lg transition-all hover:opacity-90"
          style="color: var(--brand-primary); box-shadow: 0 12px 40px rgba(0,0,0,0.2)">
          Kostenlos starten →
        </a>
      </div>
    </section>

    <SimyFooter />
  </div>
</template>

<script setup lang="ts">
import { breadcrumbLd, ldScripts, serviceLd } from '~/utils/schema'

useHead({
  title: 'Marketing für Terminbetriebe – Google Ads & SEO | Simy',
  meta: [
    { name: 'description', content: 'Simy bringt mehr Kunden zu deinem Betrieb. Google Ads und lokales SEO für Fahrschulen, Coaching, Consulting und mehr. Mehr Anfragen, mehr Umsatz.' },
    { name: 'keywords', content: 'marketing terminbetriebe, google ads schweiz, lokales seo, mehr kunden gewinnen' },
    { property: 'og:title', content: 'Marketing für Terminbetriebe – Simy | Mehr Kunden gewinnen' },
    { property: 'og:description', content: 'Google Ads und lokales SEO für Terminbetriebe. Simy bringt dir aktiv neue Kunden.' },
    { property: 'og:url', content: 'https://simy.ch/marketing' },
  ],
  link: [{ rel: 'canonical', href: 'https://simy.ch/marketing' }],
  script: ldScripts(
    serviceLd({
      name: 'Simy Marketing für Terminbetriebe',
      description: 'Google Ads und lokales SEO für Schweizer Terminbetriebe — verbunden mit dem Simy-Buchungssystem.',
      url: 'https://simy.ch/marketing',
    }),
    breadcrumbLd([
      { name: 'Simy', url: 'https://simy.ch/' },
      { name: 'Marketing', url: 'https://simy.ch/marketing' },
    ]),
  ),
})

const valueProps = [
  { icon: 'zap', title: 'Sofort messbar', desc: 'Jede Anfrage wird erfasst. Du siehst genau, welche Kampagne Kunden bringt.' },
  { icon: 'target', title: 'Lokal & präzise', desc: 'Wir schalten Werbung nur in deinem Einzugsgebiet — kein Geld verschwenden.' },
  { icon: 'refresh', title: 'Closed Loop', desc: 'Von der Google-Suche bis zur Buchung in Simy — alles ist verbunden.' },
]

const adsHighlights = [
  'Setup innerhalb von 48 Stunden',
  'Zielgruppen-Targeting nach PLZ & Radius',
  'Monatliches Reporting mit klaren KPIs',
  'Nur für Klicks von echten Interessenten zahlen',
  'Nahtlose Integration mit Simy-Buchungssystem',
]

const seoHighlights = [
  'Google Business Profile Optimierung',
  'Lokale Keyword-Strategie für deine Stadt',
  'SEO-optimierte Website durch Simy',
  'Bewertungsmanagement & Reputation',
  'Langfristiger Traffic ohne Werbekosten',
]

const whySimy = [
  { icon: 'link', title: 'Alles aus einer Hand', desc: 'Website, Buchungssystem und Marketing kommen von Simy — perfekt abgestimmt.' },
  { icon: 'chart', title: 'Echter ROI', desc: 'Du siehst direkt in Simy, welche Marketing-Massnahmen Buchungen generieren.' },
  { icon: 'swiss', title: 'Schweizer Marktkenntnis', desc: 'Wir kennen den Schweizer Markt für lokale Terminbetriebe — keine generischen Kampagnen.' },
  { icon: 'handshake', title: 'Persönlicher Ansprechpartner', desc: 'Kein anonymes Support-Ticket. Du hast einen festen Ansprechpartner bei simy.' },
]
</script>
