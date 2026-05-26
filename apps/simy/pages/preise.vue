<template>
  <div class="min-h-screen bg-white font-sans">
    <SimyNav />

    <!-- Hero -->
    <section class="pt-20 pb-14 px-6 text-center relative overflow-hidden">
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full opacity-[0.06]"
          style="background: radial-gradient(circle, #6000BD, transparent)"></div>
      </div>
      <div class="relative max-w-3xl mx-auto">
        <div class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider mb-6 border"
          style="background: rgba(96,0,189,0.07); color: #6000BD; border-color: rgba(96,0,189,0.25)">
          Preise
        </div>
        <h1 class="text-5xl font-black text-gray-900 mb-4 leading-tight">Fahrschulsoftware Preise — transparent &amp; fair</h1>
        <p class="text-xl text-gray-500 max-w-xl mx-auto mb-3">60 Tage kostenlos testen — keine Kreditkarte, keine Jahresbindung.</p>

        <!-- Billing toggle -->
        <div class="flex items-center justify-center gap-3 mb-10">
          <span class="text-sm font-medium" :class="!annual ? 'text-gray-900' : 'text-gray-400'">Monatlich</span>
          <button @click="annual = !annual"
            class="relative w-11 h-6 rounded-full transition-colors"
            :style="annual ? 'background: #6000BD' : 'background: #e5e7eb'">
            <span class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
              :style="annual ? 'transform: translateX(1.25rem)' : 'transform: translateX(0.125rem)'"></span>
          </button>
          <span class="text-sm font-medium" :class="annual ? 'text-gray-900' : 'text-gray-400'">
            Jährlich
            <span class="ml-1.5 text-xs font-bold px-2 py-0.5 rounded-full text-white" style="background: #059669">2 Monate gratis</span>
          </span>
        </div>
      </div>
    </section>

    <!-- Plans -->
    <section class="pb-20 px-6">
      <div class="max-w-5xl mx-auto">
        <div class="grid md:grid-cols-3 gap-6 mb-10">
          <div v-for="plan in plans" :key="plan.name"
            class="rounded-3xl p-8 border-2 flex flex-col relative"
            :class="plan.highlighted ? '' : 'border-gray-100 bg-white'"
            :style="plan.highlighted ? 'background: linear-gradient(145deg, #6000BD, #8B2FE8); border-color: transparent; box-shadow: 0 25px 50px rgba(96,0,189,0.25)' : ''">
            <div v-if="plan.highlighted"
              class="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1.5 rounded-full bg-white whitespace-nowrap"
              style="color: #6000BD">
              ✦ Am beliebtesten
            </div>
            <h3 class="font-extrabold text-xl mb-1" :class="plan.highlighted ? 'text-white' : 'text-gray-900'">{{ plan.name }}</h3>
            <p class="text-sm mb-5" :style="plan.highlighted ? 'color: rgba(255,255,255,0.65)' : 'color: #9ca3af'">{{ plan.tagline }}</p>
            <div class="flex items-baseline gap-1 mb-1">
              <span class="text-4xl font-black" :class="plan.highlighted ? 'text-white' : 'text-gray-900'">
                CHF {{ annual ? plan.annualPrice : plan.price }}
              </span>
              <span class="text-sm" :style="plan.highlighted ? 'color: rgba(255,255,255,0.6)' : 'color: #9ca3af'">/Monat</span>
            </div>
            <p v-if="annual" class="text-xs mb-5" :style="plan.highlighted ? 'color: rgba(255,255,255,0.5)' : 'color: #9ca3af'">
              CHF {{ plan.annualPrice * 12 }} / Jahr — CHF {{ plan.annualSaving }} gespart
            </p>
            <p v-else class="text-xs mb-5" :style="plan.highlighted ? 'color: rgba(255,255,255,0.5)' : 'color: #9ca3af'"> &nbsp;</p>
            <ul class="space-y-2.5 mb-8 flex-1">
              <li v-for="f in plan.features" :key="f.text"
                class="flex items-start gap-2.5 text-sm"
                :style="plan.highlighted ? 'color: rgba(255,255,255,0.9)' : 'color: #374151'">
                <svg class="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"
                  :style="plan.highlighted ? 'color: rgba(255,255,255,0.7)' : 'color: #6000BD'">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
                <span>{{ f.text }}<span v-if="f.new" class="ml-1.5 text-xs font-bold px-1.5 py-0.5 rounded" :style="plan.highlighted ? 'background: rgba(255,255,255,0.15)' : 'background: rgba(96,0,189,0.1); color: #6000BD'">NEU</span></span>
              </li>
            </ul>
            <a href="https://app.simy.ch/tenant-register"
              class="block text-center py-3.5 rounded-xl font-bold text-sm transition-all hover:opacity-90"
              :style="plan.highlighted
                ? 'background: rgba(255,255,255,0.92); color: #6000BD'
                : 'background: linear-gradient(135deg, #6000BD, #8B2FE8); color: white'">
              60 Tage gratis starten
            </a>
          </div>
        </div>

        <!-- Feature comparison note -->
        <p class="text-center text-sm text-gray-400">Alle Pläne: DSGVO-konform, Schweizer Server, monatlich kündbar. <a href="#vergleich" class="underline hover:text-gray-600">Vollständiger Feature-Vergleich ↓</a></p>
      </div>
    </section>

    <!-- Full feature comparison table -->
    <section id="vergleich" class="py-16 px-6 bg-gray-50">
      <div class="max-w-4xl mx-auto">
        <h2 class="text-2xl font-extrabold text-gray-900 mb-8 text-center">Vollständiger Feature-Vergleich</h2>
        <div class="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100">
                <th class="px-5 py-4 text-left font-bold text-gray-500 w-1/2">Feature</th>
                <th class="px-4 py-4 text-center font-bold text-gray-700">Starter</th>
                <th class="px-4 py-4 text-center font-bold text-white rounded-t-xl" style="background: #6000BD">Professional</th>
                <th class="px-4 py-4 text-center font-bold text-gray-700">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in comparison" :key="i"
                :class="row.section ? 'bg-gray-50' : 'border-t border-gray-50 hover:bg-gray-50/50'">
                <td v-if="row.section" colspan="4" class="px-5 py-3 text-xs font-bold uppercase tracking-widest text-gray-400">{{ row.section }}</td>
                <template v-else>
                  <td class="px-5 py-3.5 text-gray-700">{{ row.feature }}</td>
                  <td class="px-4 py-3.5 text-center">
                    <span v-if="row.starter === true" class="text-green-500 font-bold">✓</span>
                    <span v-else-if="row.starter === false" class="text-gray-200">—</span>
                    <span v-else class="text-xs text-gray-600 font-medium">{{ row.starter }}</span>
                  </td>
                  <td class="px-4 py-3.5 text-center" style="background: rgba(96,0,189,0.03)">
                    <span v-if="row.pro === true" class="font-bold" style="color: #6000BD">✓</span>
                    <span v-else-if="row.pro === false" class="text-gray-200">—</span>
                    <span v-else class="text-xs font-medium" style="color: #6000BD">{{ row.pro }}</span>
                  </td>
                  <td class="px-4 py-3.5 text-center">
                    <span v-if="row.enterprise === true" class="text-green-500 font-bold">✓</span>
                    <span v-else-if="row.enterprise === false" class="text-gray-200">—</span>
                    <span v-else class="text-xs text-gray-600 font-medium">{{ row.enterprise }}</span>
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="py-20 px-6">
      <div class="max-w-2xl mx-auto">
        <h2 class="text-3xl font-extrabold text-gray-900 mb-10 text-center">Häufige Fragen zu den Preisen</h2>
        <div class="space-y-3">
          <div v-for="(faq, i) in faqs" :key="i" class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <button @click="openFaq = openFaq === i ? null : i"
              class="w-full flex items-center justify-between px-6 py-5 text-left font-semibold text-gray-900 hover:bg-gray-50 transition-colors">
              {{ faq.q }}
              <svg class="w-5 h-5 text-gray-400 flex-shrink-0 transition-transform" :class="openFaq === i ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    <section class="py-20 px-6" style="background: linear-gradient(135deg, #6000BD, #8B2FE8)">
      <div class="max-w-xl mx-auto text-center">
        <h2 class="text-3xl font-black text-white mb-4">Kostenlos starten — heute noch</h2>
        <p class="text-purple-200 mb-8">60 Tage gratis. Kein Kreditkarte. In 5 Minuten eingerichtet.</p>
        <a href="https://app.simy.ch/tenant-register"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white font-black text-lg transition-all hover:opacity-90"
          style="color: #6000BD">
          Jetzt kostenlos starten →
        </a>
      </div>
    </section>

    <SimyFooter />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

useHead({
  title: 'Preise – simy | Fahrschulsoftware ab CHF 69/Monat',
  meta: [
    { name: 'description', content: 'simy Preise: Fahrschulsoftware ab CHF 69/Monat. 60 Tage kostenlos testen, kein Kreditkarte, monatlich kündbar. Transparent, flexibel, fair.' },
    { name: 'keywords', content: 'simy preis, fahrschulapp kosten, fahrschulsoftware preis' },
    { property: 'og:title', content: 'Preise – simy | Fahrschulsoftware ab CHF 69/Monat' },
    { property: 'og:description', content: 'simy Preise: ab CHF 69/Monat. 60 Tage kostenlos testen, kein Kreditkarte, monatlich kündbar.' },
    { property: 'og:url', content: 'https://simy.ch/preise' },
    { name: 'twitter:title', content: 'Preise – simy | Fahrschulsoftware ab CHF 69/Monat' },
    { name: 'twitter:description', content: 'simy Preise: ab CHF 69/Monat. 60 Tage kostenlos testen.' },
  ],
  link: [{ rel: 'canonical', href: 'https://simy.ch/preise' }],
  script: [{
    type: 'application/ld+json',
    children: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'Brauche ich eine Kreditkarte für den Trial?', acceptedAnswer: { '@type': 'Answer', text: 'Nein. Die 60 Tage sind vollständig kostenlos und ohne Kreditkarte. Du wirst erst danach zur Kasse gebeten.' } },
        { '@type': 'Question', name: 'Was kostet simy für Fahrschulen?', acceptedAnswer: { '@type': 'Answer', text: 'simy bietet Pläne ab CHF 69/Monat. Bei jährlicher Zahlung sparst du 2 Monate.' } },
        { '@type': 'Question', name: 'Kann ich jederzeit kündigen?', acceptedAnswer: { '@type': 'Answer', text: 'Ja. Monatlich kündbar, keine Jahresbindung. Kündigung mit 30 Tagen Frist auf Ende des Monats.' } },
        { '@type': 'Question', name: 'Wie funktioniert die Abrechnung?', acceptedAnswer: { '@type': 'Answer', text: 'Monatlich per TWINT, Kreditkarte oder Banküberweisung. Bei Jahresabo einmal jährlich.' } },
      ],
    }),
  }],
})

const annual = ref(false)
const openFaq = ref<number | null>(null)

const plans = [
  {
    name: 'Starter', tagline: 'Für den Einzelfahrlehrer', price: 69, annualPrice: 57, annualSaving: 144, highlighted: false,
    features: [
      { text: '1 Fahrlehrer' },
      { text: 'Online-Terminbuchung' },
      { text: 'Kundenverwaltung' },
      { text: 'Rechnungen & Zahlungen' },
      { text: 'Fahrlehrer-App (iOS/Android)' },
      { text: 'E-Mail Support' },
      { text: 'Website-Generator', new: true },
    ],
  },
  {
    name: 'Professional', tagline: 'Für wachsende Fahrschulen', price: 129, annualPrice: 107, annualSaving: 264, highlighted: true,
    features: [
      { text: 'Bis 5 Fahrlehrer' },
      { text: 'Alles aus Starter' },
      { text: 'Kursbuchungsseite' },
      { text: 'Multi-Fahrlehrer Kalender' },
      { text: 'Erweiterte Statistiken' },
      { text: 'Prioritäts-Support' },
      { text: 'Google Ads Integration', new: true },
    ],
  },
  {
    name: 'Enterprise', tagline: 'Für grosse Fahrschulen & Ketten', price: 249, annualPrice: 207, annualSaving: 504, highlighted: false,
    features: [
      { text: 'Bis 10 Fahrlehrer' },
      { text: 'Alles aus Professional' },
      { text: 'Affiliate-System' },
      { text: 'Dedizierter Account Manager' },
      { text: 'API-Zugang' },
      { text: 'SLA Garantie' },
      { text: 'Custom Domain Website', new: true },
    ],
  },
]

const comparison = [
  { section: 'Kernfunktionen' },
  { feature: 'Online-Terminbuchung', starter: true, pro: true, enterprise: true },
  { feature: 'Fahrlehrer-App (iOS/Android)', starter: true, pro: true, enterprise: true },
  { feature: 'Kundenverwaltung', starter: true, pro: true, enterprise: true },
  { feature: 'Anzahl Fahrlehrer', starter: '1', pro: 'bis 5', enterprise: 'bis 10' },
  { section: 'Rechnungen & Kasse' },
  { feature: 'Automatische Rechnungen', starter: true, pro: true, enterprise: true },
  { feature: 'TWINT & Online-Zahlung', starter: true, pro: true, enterprise: true },
  { feature: 'QR-Rechnung', starter: true, pro: true, enterprise: true },
  { feature: 'Guthaben-System', starter: true, pro: true, enterprise: true },
  { section: 'Website & Marketing' },
  { feature: 'Website-Generator', starter: true, pro: true, enterprise: true },
  { feature: 'Custom Domain', starter: false, pro: false, enterprise: true },
  { feature: 'Google Ads Integration', starter: false, pro: true, enterprise: true },
  { feature: 'SEO-Reporting', starter: false, pro: true, enterprise: true },
  { section: 'Support & Extras' },
  { feature: 'E-Mail Support', starter: true, pro: true, enterprise: true },
  { feature: 'Prioritäts-Support', starter: false, pro: true, enterprise: true },
  { feature: 'Dedizierter Account Manager', starter: false, pro: false, enterprise: true },
  { feature: 'API-Zugang', starter: false, pro: false, enterprise: true },
  { feature: 'Affiliate-System', starter: false, pro: false, enterprise: true },
]

const faqs = [
  { q: 'Brauche ich eine Kreditkarte für den Trial?', a: 'Nein. Die 60 Tage sind vollständig kostenlos und ohne Kreditkarte. Du wirst erst danach zur Kasse gebeten — und kannst jederzeit kündigen.' },
  { q: 'Kann ich jederzeit upgraden oder downgraden?', a: 'Ja. Du kannst deinen Plan jederzeit im Dashboard ändern. Das neue Abo gilt ab dem nächsten Monat.' },
  { q: 'Wie funktioniert die Abrechnung?', a: 'Wir stellen monatlich per TWINT, Kreditkarte oder Banküberweisung in Rechnung. Bei Jahresabo wird einmal jährlich abgerechnet.' },
  { q: 'Was passiert mit meinen Daten, wenn ich kündige?', a: 'Du kannst alle deine Daten jederzeit exportieren. Nach der Kündigung werden die Daten für 30 Tage gespeichert, dann endgültig gelöscht.' },
  { q: 'Gibt es Rabatte für mehrere Standorte?', a: 'Ja, für Fahrschulen mit mehreren Standorten haben wir individuelle Enterprise-Angebote. Kontaktiere uns für ein massgeschneidertes Angebot.' },
]
</script>

<style scoped>
.faq-enter-active, .faq-leave-active { transition: all 0.2s ease; overflow: hidden; }
.faq-enter-from, .faq-leave-to { max-height: 0; opacity: 0; }
.faq-enter-to, .faq-leave-from { max-height: 300px; opacity: 1; }
</style>
