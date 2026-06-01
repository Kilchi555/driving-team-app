<template>
  <div class="min-h-screen bg-white font-sans">
    <SimyNav />
    <section class="pt-16 pb-24 px-6">
      <div class="max-w-3xl mx-auto">
        <nav class="flex items-center gap-2 text-xs text-gray-400 mb-8">
          <a href="/" class="hover:text-gray-600">Simy</a><span>›</span>
          <span class="text-gray-600">AGB</span>
        </nav>
        <h1 class="text-3xl font-black text-gray-900 mb-3">Allgemeine Geschäftsbedingungen</h1>
        <p class="text-sm text-gray-400 mb-12">Stand: Mai 2026 · Simy GmbH, Schweiz</p>

        <div class="prose prose-gray max-w-none space-y-10">
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
  title: 'AGB – Simy | Allgemeine Geschäftsbedingungen',
  meta: [{ name: 'description', content: 'Allgemeine Geschäftsbedingungen der Simy GmbH.' }],
})

const sections = [
  {
    title: '1. Geltungsbereich',
    content: 'Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Verträge zwischen der Simy GmbH (nachfolgend "Simy") und ihren Kunden (nachfolgend "Nutzer") im Zusammenhang mit der Nutzung der Simy-Softwareplattform und zugehöriger Dienstleistungen.',
  },
  {
    title: '2. Vertragsschluss',
    content: 'Der Vertrag kommt mit der Registrierung eines Nutzerkontos zustande. Mit der Registrierung akzeptiert der Nutzer diese AGB. Die Nutzung ist erst nach Bestätigung der E-Mail-Adresse möglich.',
  },
  {
    title: '3. Leistungen',
    content: 'Simy stellt dem Nutzer eine webbasierte Software für die Verwaltung von Fahrschulen, Buchungen und Rechnungen zur Verfügung. Der Leistungsumfang richtet sich nach dem gebuchten Tarif. Simy behält sich vor, den Leistungsumfang jederzeit anzupassen.',
  },
  {
    title: '4. Preise und Zahlung',
    content: 'Die Preise sind dem aktuellen Preisblatt unter simy.ch/preise zu entnehmen. Alle Preise verstehen sich in CHF inkl. MwSt. Die Abrechnung erfolgt monatlich oder jährlich im Voraus per TWINT, Kreditkarte oder Rechnung.',
  },
  {
    title: '5. Kündigung',
    content: 'Der Nutzer kann den Vertrag jederzeit mit einer Frist von 30 Tagen auf Ende des laufenden Abrechnungsmonats kündigen. Die Kündigung erfolgt über das Nutzer-Dashboard oder per E-Mail an support@simy.ch.',
  },
  {
    title: '6. Datenschutz',
    content: 'Simy verarbeitet personenbezogene Daten gemäss der Datenschutzerklärung unter simy.ch/datenschutz. Alle Daten werden auf Schweizer Servern gespeichert und sind DSGVO-konform verarbeitet.',
  },
  {
    title: '7. Haftung',
    content: 'Simy haftet nur für Schäden, die durch grobe Fahrlässigkeit oder Vorsatz von Simy verursacht wurden. Die Haftung für mittelbare Schäden, entgangenen Gewinn oder Datenverlust ist ausgeschlossen.',
  },
  {
    title: '8. Anwendbares Recht',
    content: 'Es gilt Schweizer Recht. Gerichtsstand ist Zürich, Schweiz.',
  },
  {
    title: '9. Kontakt',
    content: 'Simy GmbH · support@simy.ch · +41 44 000 00 00',
  },
]
</script>
