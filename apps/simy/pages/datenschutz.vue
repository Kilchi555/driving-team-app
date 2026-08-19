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
        <p class="text-sm text-gray-400 mb-12">Stand: 18. August 2026 · Gilt für simy.ch und app.simy.ch</p>

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
import { breadcrumbLd, ldScripts, webPageLd } from '~/utils/schema'

useHead({
  title: 'Datenschutz – Simy',
  meta: [{ name: 'description', content: 'Datenschutzerklärung der Simy IT Systems Kilchenmann. DSGVO-konform, Schweizer Server.' }],
  link: [{ rel: 'canonical', href: 'https://simy.ch/datenschutz' }],
  script: ldScripts(
    webPageLd({
      name: 'Datenschutz – Simy',
      description: 'Datenschutzerklärung der Simy IT Systems. DSG/DSGVO-konform, Schweizer Server.',
      url: 'https://simy.ch/datenschutz',
    }),
    breadcrumbLd([
      { name: 'Simy', url: 'https://simy.ch/' },
      { name: 'Datenschutz', url: 'https://simy.ch/datenschutz' },
    ]),
  ),
})

const sections = [
  {
    title: '1. Verantwortliche Stelle',
    content: 'Simy IT Systems Kilchenmann (Einzelfirma), Schweiz\nE-Mail: info@simy.ch\n\nWir nehmen den Schutz deiner persönlichen Daten sehr ernst und behandeln deine personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften (DSG, DSGVO).',
  },
  {
    title: '2. Welche Daten wir erheben',
    content: 'Kontodaten: Name, E-Mail-Adresse, Telefonnummer, Adresse\nNutzungsdaten: Login-Zeitpunkte, verwendete Features, Seitenaufrufe\nGeschäftsdaten: Kundendaten, Termine, Rechnungen (werden im Auftrag verarbeitet)\nTechnische Daten: IP-Adresse, Browser, Gerät (anonymisiert)',
  },
  {
    title: '3. Zweck der Datenverarbeitung',
    content: 'Bereitstellung und Verbesserung der Simy-Plattform\nKontoverwaltung und Abrechnung\nKundenservice und Support\nSicherheit und Betrugsprävention\nMarketing (nur mit ausdrücklicher Einwilligung)',
  },
  {
    title: '4. Datenspeicherung',
    content: 'Die Datenbank läuft im Rechenzentrum Zürich (Schweiz). Die Anwendungsserver laufen in der EU. Wo Daten dabei ausserhalb der Schweiz verarbeitet werden, stellen wir über Standardvertragsklauseln (SCC) ein angemessenes Datenschutzniveau sicher — Details siehe Abschnitt 7. Wir geben deine Daten nicht ohne deine ausdrückliche Einwilligung an Dritte weiter, ausser wenn wir gesetzlich dazu verpflichtet sind oder ein Sub-Auftragsverarbeiter gemäss Abschnitt 7 im Einsatz ist.',
  },
  {
    title: '5. Deine Rechte',
    content: 'Auskunft über deine gespeicherten Daten\nBerichtigung unrichtiger Daten\nLöschung deiner Daten ("Recht auf Vergessenwerden")\nEinschränkung der Verarbeitung\nDatenportabilität\n\nKonto löschen: In der Simy-App unter Profil → „Konto löschen“, oder siehe https://simy.ch/konto-loeschen\n\nUm deine Rechte auszuüben, kontaktiere uns unter info@simy.ch bzw. support@simy.ch.',
  },
  {
    title: '6. Cookies',
    content: 'Simy verwendet technisch notwendige Cookies für den Betrieb der Plattform (Session, Auth). Zusätzlich setzen wir auf simy.ch Google Analytics 4 (Google Ireland Limited) zur Reichweitenmessung und Google Ads zur Erfolgsmessung unserer Werbekampagnen (Conversion-Tracking) ein. Beide werden erst aktiv, nachdem du im Cookie-Banner ausdrücklich zugestimmt hast (Google Consent Mode: Analyse- und Werbe-Cookies sind standardmässig deaktiviert). Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Du kannst deine Zustimmung jederzeit über die Löschung des Cookie-Consent-Eintrags im Browser widerrufen.',
  },
  {
    title: '7. Drittanbieter',
    content: 'Wir arbeiten mit sorgfältig ausgewählten Dienstleistern zusammen: Supabase (Datenbank, Rechenzentrum Zürich), Vercel (Hosting/Anwendungsserver, EU), Resend (E-Mail), Wallee (Zahlung, Schweiz), Twilio (SMS-Versand, USA). Für einzelne Funktionen setzen wir zudem KI-Modelle ein: OpenAI (Erkennung von Belegen/Rechnungen), Anthropic und Google (Simy AI Assistent und interne Textvorschläge). Diese KI-Anbieter erhalten nur die für die jeweilige Funktion nötigen Daten, trainieren ihre Modelle vertraglich nicht mit unseren Daten und verarbeiten sie nicht dauerhaft. Separat davon nutzen wir Google Analytics 4 und Google Ads (Google Ireland Limited) für Reichweiten- und Konversionsmessung auf simy.ch, siehe Ziffer 6. Alle Partner ausserhalb der Schweiz/EU sind über Standardvertragsklauseln (SCC) gemäss Art. 46 DSGVO abgesichert.',
  },
  {
    title: '8. Einsatz von Künstlicher Intelligenz',
    content: 'Einzelne Funktionen von Simy nutzen KI-Modelle, z. B. um Belege automatisch auszulesen oder im "Simy AI"-Assistenten Fragen zu Betrieb und Marketing zu beantworten. Diese Funktionen sind klar als KI gekennzeichnet, treffen keine automatisierten Entscheidungen mit rechtlicher Wirkung und ersetzen keine fachliche Beratung. Du erkennst KI-Funktionen jeweils direkt in der App.',
  },
  {
    title: '9. Kontakt',
    content: 'Bei Fragen zum Datenschutz: info@simy.ch',
  },
]
</script>
