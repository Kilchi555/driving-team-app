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
        <p class="text-sm text-gray-400 mb-6">Stand: 18. August 2026 · Simy IT Systems Kilchenmann, Schweiz</p>

        <div class="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 mb-10">
          <p><strong>Hinweis:</strong> Diese Seite ist eine Kurzübersicht. Die rechtsverbindliche, vollständige Fassung der AGB (inkl. SLA, Haftungsregelung, Datenexport-/Wechselrecht und Empfehlungsprogramm) gilt ausschliesslich unter <a href="https://app.simy.ch/agb" class="underline font-semibold">app.simy.ch/agb</a> und wird bei der Registrierung akzeptiert.</p>
        </div>

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
import { breadcrumbLd, ldScripts, webPageLd } from '~/utils/schema'

useHead({
  title: 'AGB – Simy | Allgemeine Geschäftsbedingungen',
  meta: [{ name: 'description', content: 'Allgemeine Geschäftsbedingungen der Simy IT Systems.' }],
  link: [{ rel: 'canonical', href: 'https://www.simy.ch/agb' }],
  script: ldScripts(
    webPageLd({
      name: 'AGB – Simy',
      description: 'Allgemeine Geschäftsbedingungen der Simy IT Systems.',
      url: 'https://www.simy.ch/agb',
    }),
    breadcrumbLd([
      { name: 'Simy', url: 'https://www.simy.ch/' },
      { name: 'AGB', url: 'https://www.simy.ch/agb' },
    ]),
  ),
})

const sections = [
  {
    title: '1. Geltungsbereich',
    content: 'Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Verträge zwischen Simy IT Systems Kilchenmann, Einzelfirma (nachfolgend "Simy") und ihren gewerblichen Kunden (nachfolgend "Nutzer") im Zusammenhang mit der Nutzung der Simy-Softwareplattform und zugehöriger Dienstleistungen. Diese AGB gelten ausschliesslich für Unternehmen und andere gewerbliche Nutzer (B2B); Verbraucher im Sinne des Konsumentenrechts sind von der Nutzung ausgeschlossen.',
  },
  {
    title: '2. Vertragsschluss',
    content: 'Der Vertrag kommt mit der Registrierung eines Nutzerkontos zustande. Mit der Registrierung akzeptiert der Nutzer diese AGB. Die Nutzung ist erst nach Bestätigung der E-Mail-Adresse möglich.',
  },
  {
    title: '3. Leistungen',
    content: 'Simy stellt dem Nutzer eine webbasierte Software für Terminbuchung, Kundenverwaltung und Abrechnung für Dienstleistungsbetriebe zur Verfügung. Der Leistungsumfang richtet sich nach dem gebuchten Tarif. Simy behält sich vor, den Leistungsumfang jederzeit anzupassen.',
  },
  {
    title: '4. Preise und Zahlung',
    content: 'Die Preise sind dem aktuellen Preisblatt unter simy.ch/preise zu entnehmen. Alle Preise verstehen sich in CHF zuzüglich allfälliger Mehrwertsteuer. Die Abrechnung erfolgt monatlich oder jährlich im Voraus per TWINT, Kreditkarte oder Rechnung.',
  },
  {
    title: '4a. Planwechsel',
    content: 'Der Nutzer kann seinen Tarif jederzeit im Nutzer-Dashboard upgraden oder downgraden. Planwechsel wirken sofort. Beim Upgrade wird der Differenzbetrag anteilsmässig für die verbleibenden Tage des laufenden Abrechnungsmonats berechnet. Beim Downgrade wird die Differenz als Gutschrift auf die nächste Rechnung angerechnet. Es gilt keine Kündigungsfrist für Planwechsel.',
  },
  {
    title: '5. Kündigung',
    content: 'Der Nutzer kann den Vertrag jederzeit mit einer Frist von 30 Tagen auf Ende des laufenden Abrechnungsmonats kündigen. Die Kündigung erfolgt über das Nutzer-Dashboard oder per E-Mail an support@simy.ch.',
  },
  {
    title: '6. Datenschutz und Auftragsverarbeitung',
    content: 'Simy verarbeitet personenbezogene Daten gemäss der Datenschutzerklärung unter simy.ch/datenschutz. Soweit der Kunde über die Plattform Personendaten seiner eigenen Kunden/Schüler verarbeitet, handelt Simy als Auftragsverarbeiter gemäss dem Auftragsverarbeitungsvertrag (AVV), abrufbar unter app.simy.ch/avv, der mit der Registrierung Vertragsbestandteil wird.',
  },
  {
    title: '7. Haftung',
    content: 'Simy haftet für direkte Schäden aus schuldhafter Pflichtverletzung bis maximal zur Höhe einer Jahresabonnementgebühr des Kunden. Für indirekte Schäden, entgangenen Gewinn und Datenverlust (sofern der Kunde keine eigenen Backups erstellt hat) haftet Simy nicht, soweit gesetzlich zulässig. Diese Beschränkungen gelten nicht bei Vorsatz, grober Fahrlässigkeit oder Personenschäden. Details regelt Ziffer 11 der vollständigen AGB unter app.simy.ch/agb.',
  },
  {
    title: '8. Anwendbares Recht',
    content: 'Es gilt Schweizer Recht. Gerichtsstand ist Zürich, Schweiz.',
  },
  {
    title: '9. Kontakt',
    content: 'Simy IT Systems · support@simy.ch · +41 79 715 70 27',
  },
]
</script>
