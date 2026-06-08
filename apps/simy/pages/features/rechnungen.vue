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
          <span>Features</span><span>›</span>
          <span class="text-gray-600">Rechnungen & Kasse</span>
        </nav>
        <div class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider mb-6 border"
          style="background: rgba(var(--brand-rgb),0.07); color: var(--brand-primary); border-color: rgba(var(--brand-rgb),0.25)">
          Feature — Rechnungen & Kasse
        </div>
        <h1 class="text-3xl md:text-5xl font-black text-gray-900 mb-6 leading-tight">
          Rechnungen & Kasse —<br/>
          <span style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
            Geld läuft von selbst ein
          </span>
        </h1>
        <p class="text-xl text-gray-500 max-w-2xl mb-10 leading-relaxed">
          Simy erstellt Rechnungen automatisch und versendet sie per E-Mail. Bei Online-Zahlung (TWINT/Kreditkarte) werden Zahlungserinnerungen vollautomatisch verschickt. Bezahlt der Schüler per Rechnung, kannst du Mahnungen mit wenigen Klicks versenden. Du siehst jederzeit, wer was bezahlt hat.
        </p>
        <div class="flex flex-col sm:flex-row gap-4">
          <a href="https://app.simy.ch/tenant-register"
            class="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-white font-bold transition-all hover:opacity-90"
            style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); box-shadow: 0 8px 24px rgba(var(--brand-rgb),0.3)">
            Kostenlos testen →
          </a>
        </div>
      </div>
    </section>

    <!-- Invoice mockup -->
    <section class="py-10 px-6 bg-gray-50 border-y border-gray-100">
      <div class="max-w-lg mx-auto">
        <div class="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <p class="font-bold text-gray-900 text-sm">Rechnung #2026-0148</p>
              <p class="text-xs text-gray-400">Fahrschule Driving Team · 20.05.2026</p>
            </div>
            <span class="text-xs font-bold px-3 py-1 rounded-full bg-green-100 text-green-700">Bezahlt ✓</span>
          </div>
          <div class="px-6 py-5">
            <div class="space-y-2 mb-5">
              <div v-for="line in invoiceLines" :key="line.desc" class="flex justify-between text-sm">
                <span class="text-gray-600">{{ line.desc }}</span>
                <span class="font-medium text-gray-900">CHF {{ line.amount }}</span>
              </div>
              <div class="border-t border-gray-100 pt-2 flex justify-between font-bold">
                <span class="text-gray-900">Total</span>
                <span style="color: var(--brand-primary)">CHF 340.–</span>
              </div>
            </div>
            <div class="flex gap-2">
              <span class="text-xs px-2.5 py-1 rounded-lg bg-gray-100 text-gray-500">📧 Automatisch versendet</span>
              <span class="text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600">🏦 TWINT bezahlt</span>
            </div>
          </div>
        </div>
        <p class="text-xs text-center text-gray-400 mt-3">Automatisch erstellt · Automatisch versendet · TWINT bezahlt</p>
      </div>
    </section>

    <!-- Payment methods highlight -->
    <section class="py-16 px-6 border-b border-gray-100">
      <div class="max-w-4xl mx-auto">
        <h2 class="text-xl font-extrabold text-gray-900 mb-6 text-center">Alle Schweizer Zahlungsmittel integriert</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div v-for="pm in paymentMethods" :key="pm.name"
            class="rounded-2xl p-5 border border-gray-100 text-center hover:border-purple-100 transition-all">
            <div class="text-2xl mb-2">{{ pm.icon }}</div>
            <p class="font-bold text-gray-900 text-sm">{{ pm.name }}</p>
            <p class="text-xs text-gray-400 mt-0.5">{{ pm.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="py-20 px-6">
      <div class="max-w-5xl mx-auto">
        <h2 class="text-3xl font-extrabold text-gray-900 mb-12 text-center">Was das Kassensystem alles kann</h2>
        <div class="grid md:grid-cols-2 gap-6">
          <div v-for="f in invoiceFeatures" :key="f.title"
            class="flex gap-5 p-6 rounded-2xl border border-gray-100 hover:border-purple-100 transition-all group">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-all"
              style="background: rgba(var(--brand-rgb),0.08)">
              <span class="text-xl">{{ f.icon }}</span>
            </div>
            <div>
              <h3 class="font-bold text-gray-900 mb-1">{{ f.title }}</h3>
              <p class="text-sm text-gray-500 leading-relaxed">{{ f.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-20 px-6" style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))">
      <div class="max-w-xl mx-auto text-center">
        <h2 class="text-3xl font-black text-white mb-4">Nie mehr Rechnungen manuell schreiben</h2>
        <p class="text-purple-200 mb-8">60 Tage kostenlos — Keine Kreditkarte.</p>
        <a href="https://app.simy.ch/tenant-register"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white font-black text-lg transition-all hover:opacity-90"
          style="color: var(--brand-primary)">
          Jetzt starten →
        </a>
      </div>
    </section>

    <SimyFooter />
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Rechnungen & Kasse Fahrschule – Simy | Automatische Abrechnung',
  meta: [
    { name: 'description', content: 'Simy automatisiert die Rechnungsstellung für Fahrschulen. TWINT, QR-Rechnung, Kreditkarte. Zahlungseingang automatisch erfasst. 60 Tage kostenlos testen.' },
    { name: 'keywords', content: 'rechnung fahrschule, fahrschule abrechnung software, twint fahrschule, qr rechnung fahrschule' },
    { property: 'og:title', content: 'Rechnungen & Kasse – Simy | Automatische Abrechnung für Fahrschulen' },
    { property: 'og:description', content: 'Rechnungen automatisch erstellt, versendet und eingetrieben. TWINT, QR-Rechnung, Kreditkarte.' },
    { property: 'og:url', content: 'https://simy.ch/features/rechnungen' },
  ],
  link: [{ rel: 'canonical', href: 'https://simy.ch/features/rechnungen' }],
})

const invoiceLines = [
  { desc: '4× Fahrstunde 45 Min', amount: '340.–' },
]

const paymentMethods = [
  { icon: '📱', name: 'TWINT', desc: 'Schweizer Standard' },
  { icon: '💳', name: 'Kreditkarte', desc: 'Visa / Mastercard' },
  { icon: '🏦', name: 'QR-Rechnung', desc: 'Swiss QR Bill' },
  { icon: '🟡', name: 'PostFinance', desc: 'E-Finance' },
]

const invoiceFeatures = [
  { icon: '⚡', title: 'Automatische Erstellung', desc: 'Nach jeder Fahrstunde erstellt Simy automatisch die Rechnung — ohne dein Zutun.' },
  { icon: '📧', title: 'Direktversand per E-Mail', desc: 'Rechnung direkt per E-Mail an den Schüler — mit Zahlungslink und PDF-Anhang.' },
  { icon: '🔔', title: 'Zahlungserinnerungen', desc: 'Mit Online-Zahlung: vollautomatisch. Bei E-Mail-Rechnung: Mahnung mit wenigen Klicks versenden — schnell und einfach.' },
  { icon: '💳', title: 'TWINT & Online-Zahlung', desc: 'Schüler zahlen per TWINT, Kreditkarte oder QR-Rechnung — alles ohne Extra-Setup.' },
  { icon: '📊', title: 'Einnahmen-Übersicht', desc: 'Tages-, Wochen- und Monatsumsatz auf einen Blick. Offene und bezahlte Rechnungen sortiert.' },
  { icon: '🎟️', title: 'Guthaben-System', desc: 'Schüler kaufen Stunden-Pakete im Voraus. Guthaben wird automatisch abgezogen.' },
  { icon: '📋', title: 'Steuer-Export', desc: 'Alle Transaktionen als CSV exportieren — direkt für die Steuererklärung oder den Treuhänder.' },
  { icon: '🏷️', title: 'Rabatte & Sonderpreise', desc: 'Schnupper-Angebot, Frühbucher-Rabatt oder individuelle Preise — flexibel konfigurierbar.' },
]
</script>
