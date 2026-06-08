<template>
  <div class="min-h-screen bg-white font-sans">
    <SimyNav />

    <!-- Hero -->
    <section class="pt-20 pb-14 px-6 text-center relative overflow-hidden">
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full opacity-[0.06]"
          style="background: radial-gradient(circle, var(--brand-primary), transparent)"></div>
      </div>
      <div class="relative max-w-3xl mx-auto">
        <div class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider mb-6 border"
          style="background: rgba(var(--brand-rgb),0.07); color: var(--brand-primary); border-color: rgba(var(--brand-rgb),0.25)">
          Preise
        </div>
        <h1 class="text-3xl md:text-5xl font-black text-gray-900 mb-4 leading-tight">Fahrschulsoftware Preise — transparent &amp; fair</h1>
        <p class="text-xl text-gray-500 max-w-xl mx-auto mb-10">60 Tage kostenlos testen — keine Kreditkarte, keine Jahresbindung.</p>
      </div>
    </section>

    <!-- Plans -->
    <section class="pb-20 px-6">
      <div class="max-w-5xl mx-auto">
        <div class="grid md:grid-cols-3 gap-6 mb-10">
          <div v-for="plan in plans" :key="plan.name"
            class="rounded-3xl p-8 border-2 flex flex-col relative"
            :class="plan.highlighted ? '' : 'border-gray-100 bg-white'"
            :style="plan.highlighted ? 'background: linear-gradient(145deg, var(--brand-primary), var(--brand-secondary)); border-color: transparent; box-shadow: 0 25px 50px rgba(var(--brand-rgb),0.25)' : ''">
            <div v-if="plan.highlighted"
              class="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1.5 rounded-full bg-white whitespace-nowrap"
              style="color: var(--brand-primary)">
              ✦ Am beliebtesten
            </div>
            <h3 class="font-extrabold text-xl mb-1" :class="plan.highlighted ? 'text-white' : 'text-gray-900'">{{ plan.name }}</h3>
            <p class="text-sm mb-5" :style="plan.highlighted ? 'color: rgba(255,255,255,0.65)' : 'color: #9ca3af'">{{ plan.tagline }}</p>
            <div class="flex items-baseline gap-1 mb-6">
              <span class="text-4xl font-black" :class="plan.highlighted ? 'text-white' : 'text-gray-900'">
                CHF {{ plan.price }}
              </span>
              <span class="text-sm" :style="plan.highlighted ? 'color: rgba(255,255,255,0.6)' : 'color: #9ca3af'">/Monat</span>
            </div>
            <ul class="space-y-2.5 mb-8 flex-1">
              <li v-for="f in plan.features" :key="f.text"
                class="flex items-start gap-2.5 text-sm"
                :style="plan.highlighted ? 'color: rgba(255,255,255,0.9)' : 'color: #374151'">
                <svg class="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"
                  :style="plan.highlighted ? 'color: rgba(255,255,255,0.7)' : 'color: var(--brand-primary)'">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
                <span>{{ f.text }}<span v-if="f.new" class="ml-1.5 text-xs font-bold px-1.5 py-0.5 rounded" :style="plan.highlighted ? 'background: rgba(255,255,255,0.15)' : 'background: rgba(var(--brand-rgb),0.1); color: var(--brand-primary)'">NEU</span></span>
              </li>
            </ul>
            <a href="https://app.simy.ch/tenant-register"
              class="block text-center py-3.5 rounded-xl font-bold text-sm transition-all hover:opacity-90"
              :style="plan.highlighted
                ? 'background: rgba(255,255,255,0.92); color: var(--brand-primary)'
                : 'background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); color: white'">
              60 Tage gratis starten
            </a>
          </div>
        </div>

        <!-- Feature comparison note -->
        <p class="text-center text-sm text-gray-400">Alle Pläne: DSGVO-konform, Schweizer Server, monatlich kündbar. <a href="#vergleich" class="underline hover:text-gray-600">Vollständiger Feature-Vergleich ↓</a></p>
      </div>
    </section>

    <!-- Add-ons -->
    <section class="pb-16 px-6">
      <div class="max-w-5xl mx-auto">
        <p class="text-xs font-bold uppercase tracking-widest text-center mb-8" style="color: var(--brand-primary); opacity: 0.6;">Add-ons (optional)</p>
        <div class="grid md:grid-cols-2 gap-4">

          <div class="rounded-2xl border-2 border-gray-100 p-6 bg-white">
            <div class="flex items-start justify-between mb-3">
              <div>
                <p class="font-bold text-gray-900 text-sm">Extra Fahrlehrer Seats</p>
                <p class="text-xs text-gray-400 mt-0.5">Jeder Plan inkl. feste Anzahl — weitere Seats zubuchbar</p>
              </div>
              <span class="text-xs font-bold px-2.5 py-1 rounded-lg" style="background: rgba(var(--brand-rgb),0.08); color: var(--brand-primary);">Pro Seat / Mt.</span>
            </div>
            <p class="text-xs text-gray-500 leading-relaxed">Starter: 1 Seat inkl. · Professional: 5 inkl. · Enterprise: 10 inkl. Mehr nötig? Einfach dazubuchen.</p>
          </div>

          <div class="rounded-2xl border-2 border-gray-100 p-6 bg-white">
            <div class="flex items-start justify-between mb-3">
              <div>
                <p class="font-bold text-gray-900 text-sm">Kursbuchungsseite</p>
                <p class="text-xs text-gray-400 mt-0.5">Online-Buchung für Kurse & Lektionen</p>
              </div>
              <span class="text-xs font-bold px-2.5 py-1 rounded-lg" style="background: rgba(var(--brand-rgb),0.08); color: var(--brand-primary);">Add-on</span>
            </div>
            <p class="text-xs text-gray-500 leading-relaxed">Im <strong>Professional</strong> und <strong>Enterprise</strong>-Plan inklusive. Für Starter als Add-on zubuchbar.</p>
          </div>

          <div class="rounded-2xl border-2 border-gray-100 p-6 bg-white">
            <div class="flex items-start justify-between mb-3">
              <div>
                <p class="font-bold text-gray-900 text-sm">Affiliate-System</p>
                <p class="text-xs text-gray-400 mt-0.5">Empfehlungen & Partnerprogramm</p>
              </div>
              <span class="text-xs font-bold px-2.5 py-1 rounded-lg" style="background: rgba(var(--brand-rgb),0.08); color: var(--brand-primary);">Add-on</span>
            </div>
            <p class="text-xs text-gray-500 leading-relaxed">Im <strong>Enterprise</strong>-Plan inklusive. Für Starter & Professional als Add-on zubuchbar.</p>
          </div>

          <div class="rounded-2xl border-2 border-gray-100 p-6 bg-white">
            <div class="flex items-start justify-between mb-3">
              <div>
                <p class="font-bold text-gray-900 text-sm">Online-Zahlungen (Wallee)</p>
                <p class="text-xs text-gray-400 mt-0.5">TWINT, Kreditkarte & mehr für deine Schüler</p>
              </div>
              <span class="text-xs font-bold px-2.5 py-1 rounded-lg bg-green-50 text-green-700">Inklusive</span>
            </div>
            <p class="text-xs text-gray-500 leading-relaxed">In jedem Plan enthalten. Es fällt eine Transaktionsgebühr von <strong>1.7%</strong> pro Schülerzahlung an — kein monatlicher Aufpreis.</p>
          </div>

        </div>

        <!-- Flexibility strip -->
        <div class="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-gray-500">
          <span class="flex items-center gap-1.5">
            <svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
            Jederzeit upgraden oder downgraden
          </span>
          <span class="flex items-center gap-1.5">
            <svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
            Sofort wirksam, anteilsmässig abgerechnet
          </span>
          <span class="flex items-center gap-1.5">
            <svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
            Kündigung mit 30 Tagen Frist
          </span>
        </div>
      </div>
    </section>

    <!-- Full feature comparison table -->
    <section id="vergleich" class="py-16 px-6 bg-gray-50">
      <div class="max-w-4xl mx-auto">
        <h2 class="text-2xl font-extrabold text-gray-900 mb-8 text-center">Was ist in jedem Plan?</h2>
        <div class="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
          <table class="w-full text-sm min-w-[500px]">
            <thead>
              <tr class="border-b border-gray-100">
                <th class="px-5 py-4 text-left font-bold text-gray-500 w-1/2">Feature</th>
                <th class="px-4 py-4 text-center font-bold text-gray-700">Starter</th>
                <th class="px-4 py-4 text-center font-bold text-white rounded-t-xl" style="background: var(--brand-primary)">Professional</th>
                <th class="px-4 py-4 text-center font-bold text-gray-700">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in comparison" :key="i"
                class="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td class="px-5 py-3.5 text-gray-700 font-medium">{{ row.label }}</td>
                <td class="px-4 py-3.5 text-center">
                  <span v-if="row.starter === true" class="inline-flex items-center justify-center w-5 h-5 rounded-full" style="background: rgba(var(--brand-rgb),0.08)">
                    <svg class="w-3 h-3" style="color:var(--brand-primary)" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                  </span>
                  <svg v-else-if="row.starter === false" class="w-4 h-4 text-gray-200 mx-auto" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                  <span v-else-if="row.starter === 'Add-on'" class="text-xs font-medium px-2 py-0.5 rounded-full" style="background: rgba(var(--brand-rgb),0.08); color:var(--brand-primary)">Add-on</span>
                  <span v-else class="text-xs text-gray-600 font-semibold">{{ row.starter }}</span>
                </td>
                <td class="px-4 py-3.5 text-center" style="background: rgba(var(--brand-rgb),0.03)">
                  <span v-if="row.pro === true" class="inline-flex items-center justify-center w-5 h-5 rounded-full" style="background: rgba(var(--brand-rgb),0.12)">
                    <svg class="w-3 h-3" style="color:var(--brand-primary)" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                  </span>
                  <svg v-else-if="row.pro === false" class="w-4 h-4 text-gray-200 mx-auto" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                  <span v-else-if="row.pro === 'Add-on'" class="text-xs font-medium px-2 py-0.5 rounded-full" style="background: rgba(var(--brand-rgb),0.08); color:var(--brand-primary)">Add-on</span>
                  <span v-else class="text-xs font-semibold" style="color:var(--brand-primary)">{{ row.pro }}</span>
                </td>
                <td class="px-4 py-3.5 text-center">
                  <span v-if="row.enterprise === true" class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-50">
                    <svg class="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                  </span>
                  <svg v-else-if="row.enterprise === false" class="w-4 h-4 text-gray-200 mx-auto" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                  <span v-else class="text-xs text-gray-600 font-semibold">{{ row.enterprise }}</span>
                </td>
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
    <section class="py-20 px-6" style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))">
      <div class="max-w-xl mx-auto text-center">
        <h2 class="text-3xl font-black text-white mb-4">Kostenlos starten — heute noch</h2>
        <p class="text-purple-200 mb-8">60 Tage gratis. Keine Kreditkarte. In 5 Minuten eingerichtet.</p>
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
import { ref, computed } from 'vue'

useHead({
  title: 'Preise – Simy | Fahrschulsoftware ab CHF 49/Monat',
  meta: [
    { name: 'description', content: 'Simy Preise: Fahrschulsoftware ab CHF 49/Monat. 60 Tage kostenlos testen, Keine Kreditkarte, monatlich kündbar. Transparent, flexibel, fair.' },
    { name: 'keywords', content: 'Simy preis, fahrschulapp kosten, fahrschulsoftware preis' },
    { property: 'og:title', content: 'Preise – Simy | Fahrschulsoftware ab CHF 49/Monat' },
    { property: 'og:description', content: 'Simy Preise: ab CHF 49/Monat. 60 Tage kostenlos testen, Keine Kreditkarte, monatlich kündbar.' },
    { property: 'og:url', content: 'https://simy.ch/preise' },
    { name: 'twitter:title', content: 'Preise – Simy | Fahrschulsoftware ab CHF 49/Monat' },
    { name: 'twitter:description', content: 'Simy Preise: ab CHF 49/Monat. 60 Tage kostenlos testen.' },
  ],
  link: [{ rel: 'canonical', href: 'https://simy.ch/preise' }],
  script: [{
    type: 'application/ld+json',
    children: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'Brauche ich eine Kreditkarte für den Trial?', acceptedAnswer: { '@type': 'Answer', text: 'Nein. Die 60 Tage sind vollständig kostenlos und ohne Kreditkarte. Du wirst erst danach zur Kasse gebeten.' } },
        { '@type': 'Question', name: 'Was kostet Simy für Fahrschulen?', acceptedAnswer: { '@type': 'Answer', text: 'Simy bietet Pläne ab CHF 49/Monat. Monatlich kündbar, keine Jahresbindung.' } },
        { '@type': 'Question', name: 'Kann ich jederzeit kündigen?', acceptedAnswer: { '@type': 'Answer', text: 'Ja. Monatlich kündbar, keine Jahresbindung. Kündigung mit 30 Tagen Frist auf Ende des Monats.' } },
        { '@type': 'Question', name: 'Kann ich jederzeit upgraden oder downgraden?', acceptedAnswer: { '@type': 'Answer', text: 'Ja. Planwechsel sind jederzeit möglich und wirken sofort. Beim Upgrade wird der Differenzbetrag anteilsmässig berechnet, beim Downgrade gibt es eine Gutschrift auf die nächste Rechnung.' } },
        { '@type': 'Question', name: 'Wie funktioniert die Abrechnung?', acceptedAnswer: { '@type': 'Answer', text: 'Monatlich per TWINT, Kreditkarte oder Banküberweisung. Bei Jahresabo einmal jährlich.' } },
      ],
    }),
  }],
})

const openFaq = ref<number | null>(null)

const { data: stripePrices } = await useFetch('/api/prices', { default: () => ({ starter: null, professional: null, enterprise: null }) })

const FALLBACK = { starter: { monthly: 49 }, professional: { monthly: 149 }, enterprise: { monthly: 259 } }

function monthlyPrice(key: 'starter' | 'professional' | 'enterprise'): number {
  const stripe = stripePrices.value?.[key]
  return stripe ? parseInt(stripe.formatted) : FALLBACK[key].monthly
}

const plans = computed(() => [
  {
    name: 'Starter', tagline: 'Für den Einzelfahrlehrer', key: 'starter' as const,
    price: monthlyPrice('starter'),
    highlighted: false,
    features: [
      { text: '1 Fahrlehrer inkl.' },
      { text: 'Online-Terminbuchung' },
      { text: 'Kundenverwaltung' },
      { text: 'Rechnungen & Zahlungen' },
      { text: 'Kassenverwaltung' },
      { text: 'Auswertungen & Statistiken' },
      { text: 'Fahrlehrer-App (iOS/Android)' },
    ],
  },
  {
    name: 'Professional', tagline: 'Für wachsende Fahrschulen', key: 'professional' as const,
    price: monthlyPrice('professional'),
    highlighted: true,
    features: [
      { text: 'Bis 5 Fahrlehrer inkl.' },
      { text: 'Alles aus Starter' },
      { text: 'Kursbuchungsseite' },
      { text: 'Prioritäts-Support' },
    ],
  },
  {
    name: 'Enterprise', tagline: 'Für grosse Fahrschulen & Ketten', key: 'enterprise' as const,
    price: monthlyPrice('enterprise'),
    highlighted: false,
    features: [
      { text: 'Bis 10 Fahrlehrer inkl.' },
      { text: 'Alles aus Professional' },
      { text: 'Affiliate-System' },
      { text: 'Dedizierter Support' },
    ],
  },
])

const comparison: { label: string; starter: boolean | string; pro: boolean | string; enterprise: boolean | string }[] = [
  { label: 'Fahrlehrer inkl.', starter: '1', pro: '5', enterprise: '10' },
  { label: 'Online-Terminbuchung', starter: true, pro: true, enterprise: true },
  { label: 'Kundenverwaltung', starter: true, pro: true, enterprise: true },
  { label: 'E-Mail-Erinnerungen & Benachrichtigungen', starter: true, pro: true, enterprise: true },
  { label: 'Rechnungen & Zahlungen', starter: true, pro: true, enterprise: true },
  { label: 'QR-Einzahlungsschein', starter: true, pro: true, enterprise: true },
  { label: 'Kassenverwaltung', starter: true, pro: true, enterprise: true },
  { label: 'Gutscheine & Rabatte', starter: true, pro: true, enterprise: true },
  { label: 'Auswertungen & Statistiken', starter: true, pro: true, enterprise: true },
  { label: 'Prüfungsverwaltung', starter: true, pro: true, enterprise: true },
  { label: 'Ausbildungsauswertungen', starter: true, pro: true, enterprise: true },
  { label: 'Native App (iOS & Android)', starter: true, pro: true, enterprise: true },
  { label: 'Kursbuchungsseite', starter: 'Add-on', pro: true, enterprise: true },
  { label: 'Affiliate-System', starter: 'Add-on', pro: 'Add-on', enterprise: true },
  { label: 'Online-Zahlungen (Wallee)', starter: true, pro: true, enterprise: true },
  { label: 'Planwechsel (Self-Service)', starter: true, pro: true, enterprise: true },
  { label: 'Einrichtungsgebühr', starter: 'Keine', pro: 'Keine', enterprise: 'Keine' },
  { label: 'Support', starter: 'E-Mail', pro: 'Priorität', enterprise: 'Dediziert' },
]

const faqs = [
  { q: 'Brauche ich eine Kreditkarte für den Trial?', a: 'Nein. Die 60 Tage sind vollständig kostenlos und ohne Kreditkarte. Du wirst erst danach zur Kasse gebeten — und kannst jederzeit kündigen.' },
  { q: 'Kann ich jederzeit upgraden oder downgraden?', a: 'Ja. Planwechsel sind jederzeit möglich und wirken sofort. Beim Upgrade wird der Differenzbetrag anteilsmässig für die verbleibenden Tage des Monats berechnet. Beim Downgrade erhältst du eine Gutschrift auf die nächste Rechnung. Keine Wartezeit, keine manuelle Freischaltung.' },
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
