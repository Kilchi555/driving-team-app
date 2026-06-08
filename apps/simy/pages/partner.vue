<template>
  <div class="min-h-screen bg-white font-sans">
    <SimyNav />

    <section class="pt-20 pb-16 px-6 relative overflow-hidden">
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style="background: radial-gradient(circle, var(--brand-primary), transparent)"></div>
      </div>
      <div class="relative max-w-4xl mx-auto">
        <div class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider mb-6 border"
          style="background: rgba(var(--brand-rgb),0.07); color: var(--brand-primary); border-color: rgba(var(--brand-rgb),0.25)">
          Partner
        </div>
        <h1 class="text-4xl font-black text-gray-900 mb-5 leading-tight">Unsere Partner</h1>
        <p class="text-xl text-gray-500 max-w-2xl mb-16">Simy arbeitet mit den besten Anbietern zusammen, um Fahrschulen eine vollständige, integrierte Lösung zu bieten.</p>

        <!-- Technology Partners -->
        <h2 class="text-lg font-bold text-gray-900 mb-6">Technologie-Partner</h2>
        <div class="grid sm:grid-cols-2 md:grid-cols-3 gap-5 mb-16">
          <div v-for="p in techPartners" :key="p.name"
            class="rounded-2xl p-6 border border-gray-100 hover:border-purple-100 transition-all">
            <div class="text-3xl mb-3">{{ p.icon }}</div>
            <h3 class="font-bold text-gray-900 mb-1">{{ p.name }}</h3>
            <p class="text-xs text-gray-400 mb-2">{{ p.category }}</p>
            <p class="text-sm text-gray-500 leading-relaxed">{{ p.desc }}</p>
          </div>
        </div>

        <!-- Become a partner -->
        <div class="rounded-3xl p-10 border border-purple-100 text-center"
          style="background: linear-gradient(135deg, rgba(var(--brand-rgb),0.04), rgba(var(--brand-2-rgb),0.06))">
          <h2 class="text-2xl font-extrabold text-gray-900 mb-3">Partner werden?</h2>
          <p class="text-gray-500 mb-6 max-w-lg mx-auto">Wenn du ein Produkt oder eine Dienstleistung für Fahrschulen anbietest, lass uns sprechen. Wir bauen gemeinsam die beste Lösung für den Schweizer Markt.</p>
          <a href="mailto:partner@simy.ch"
            class="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90"
            style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))">
            partner@simy.ch
          </a>
        </div>
      </div>
    </section>

    <SimyFooter />
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Partner – Simy | Technologie & Integrationspartner',
  meta: [
    { name: 'description', content: 'Simy arbeitet mit Wallee, asa.ch und weiteren Partnern zusammen. Erfahre mehr über unsere Integrationen und werde selbst Partner.' },
  ],
})

const techPartners = [
  { icon: '💳', name: 'Wallee', category: 'Zahlungsabwicklung', desc: 'Schweizer Zahlungsgateway für TWINT, Kreditkarte und PostFinance. Nahtlos in Simy integriert.' },
  { icon: '📋', name: 'asa.ch', category: 'Branchenverband', desc: 'Der Verband Schweizerischer Fahrlehrerinnen und Fahrlehrer — Referenzpartner für Schweizer Standards.' },
  { icon: '📧', name: 'Resend', category: 'E-Mail Delivery', desc: 'Professioneller E-Mail-Versand für automatische Rechnungen, Erinnerungen und Bestätigungen.' },
  { icon: '☁️', name: 'Supabase', category: 'Datenbank & Auth', desc: 'Sichere, skalierbare Datenbankinfrastruktur für alle Simy-Kundendaten. DSGVO-konform.' },
  { icon: '🌐', name: 'Vercel', category: 'Hosting', desc: 'Website und App werden auf Vercel gehostet — für maximale Performance und Verfügbarkeit.' },
  { icon: '🗺️', name: 'Google Maps', category: 'Standorte & Navigation', desc: 'Standortkarten und Adressvalidierung in der Simy-App und auf generierten Websites.' },
]
</script>
