<template>
  <div class="min-h-screen bg-white font-sans">
    <SimyNav />
    <section class="pt-16 pb-24 px-6">
      <div class="max-w-3xl mx-auto">
        <nav class="flex items-center gap-2 text-xs text-gray-400 mb-8">
          <a href="/" class="hover:text-gray-600">Simy</a><span>›</span>
          <span class="text-gray-600">Datenschutz</span>
        </nav>
        <h1 class="text-3xl font-black text-gray-900 mb-3">Datenschutzerklärung</h1>
        <p class="text-sm text-gray-400 mb-12">Stand: Mai 2026 · Gilt für simy.ch und app.simy.ch</p>

        <div class="space-y-10">
          <div v-for="section in sections" :key="section.title">
            <h2 class="text-lg font-bold text-gray-900 mb-3">{{ section.title }}</h2>
            <p class="text-gray-600 leading-relaxed whitespace-pre-line">{{ section.content }}</p>
          </div>
        </div>
      </div>
    </section>
    <SimyFooter />
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Datenschutz – Simy',
  meta: [{ name: 'description', content: 'Datenschutzerklärung der Simy IT Systems Kilchenmann. DSGVO-konform, Schweizer Server.' }],
})

const sections = [
  {
    title: '1. Verantwortliche Stelle',
    content: 'Simy IT Systems Kilchenmann, Schweiz\nE-Mail: info@simy.ch\n\nWir nehmen den Schutz deiner persönlichen Daten sehr ernst und behandeln deine personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften (DSG, DSGVO).',
  },
  {
    title: '2. Welche Daten wir erheben',
    content: 'Kontodaten: Name, E-Mail-Adresse, Telefonnummer, Adresse\nNutzungsdaten: Login-Zeitpunkte, verwendete Features, Seitenaufrufe\nGeschäftsdaten: Schülerdaten, Termine, Rechnungen (werden im Auftrag verarbeitet)\nTechnische Daten: IP-Adresse, Browser, Gerät (anonymisiert)',
  },
  {
    title: '3. Zweck der Datenverarbeitung',
    content: 'Bereitstellung und Verbesserung der Simy-Plattform\nKontoverwaltung und Abrechnung\nKundenservice und Support\nSicherheit und Betrugsprävention\nMarketing (nur mit ausdrücklicher Einwilligung)',
  },
  {
    title: '4. Datenspeicherung',
    content: 'Alle Daten werden ausschliesslich auf Servern in der Schweiz gespeichert. Wir geben deine Daten nicht ohne deine ausdrückliche Einwilligung an Dritte weiter, ausser wenn wir gesetzlich dazu verpflichtet sind.',
  },
  {
    title: '5. Deine Rechte',
    content: 'Auskunft über deine gespeicherten Daten\nBerichtigung unrichtiger Daten\nLöschung deiner Daten ("Recht auf Vergessenwerden")\nEinschränkung der Verarbeitung\nDatenportabilität\n\nUm deine Rechte auszuüben, kontaktiere uns unter info@simy.ch.',
  },
  {
    title: '6. Cookies',
    content: 'Simy verwendet technisch notwendige Cookies für den Betrieb der Plattform (Session, Auth). Optionale Analyse-Cookies werden nur mit deiner Einwilligung gesetzt.',
  },
  {
    title: '7. Drittanbieter',
    content: 'Wir arbeiten mit sorgfältig ausgewählten Dienstleistern zusammen: Supabase (Datenbank), Resend (E-Mail), Wallee (Zahlung), Vercel (Hosting). Alle Partner sind datenschutzkonform und verarbeiten nur die für ihre Leistung notwendigen Daten.',
  },
  {
    title: '8. Kontakt',
    content: 'Bei Fragen zum Datenschutz: info@simy.ch',
  },
]
</script>
