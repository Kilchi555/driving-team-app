<!-- pages/datenschutz.vue – Datenschutzerklärung Simy SaaS -->
<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
      <div class="max-w-4xl mx-auto px-6 py-12 sm:py-16">
        <div class="flex items-center gap-3 mb-4">
          <NuxtLink to="/" class="text-blue-200 hover:text-white text-sm transition-colors">← Zurück</NuxtLink>
        </div>
        <h1 class="text-2xl sm:text-3xl font-bold mb-2">Datenschutzerklärung</h1>
        <p class="text-blue-200 text-sm">Simy – SaaS-Plattform für Fahrschulen | Stand: 1. April 2026</p>
      </div>
    </div>

    <!-- Content -->
    <div class="max-w-4xl mx-auto px-6 py-10 sm:py-14">
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-10 space-y-10 text-sm sm:text-base leading-relaxed text-gray-700">

        <!-- Intro -->
        <div class="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
          <p><strong>Wichtiger Hinweis:</strong> Diese Datenschutzerklärung beschreibt, wie Simy mit Daten von <strong>Fahrschulen (Tenants)</strong> und deren Administratoren umgeht. Für die Verarbeitung von Schüler- und Kundendaten durch die Fahrschulen selbst sind diese als datenschutzrechtlich Verantwortliche zuständig. Der entsprechende Auftragsverarbeitungsvertrag (AVV) ist unter <NuxtLink to="/avv" class="text-blue-600 hover:underline">simy.ch/avv</NuxtLink> abrufbar.</p>
        </div>

        <!-- Inhaltsverzeichnis -->
        <nav class="bg-gray-50 rounded-xl p-5 border border-gray-200">
          <p class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Inhaltsverzeichnis</p>
          <ol class="space-y-1.5 text-sm text-blue-600">
            <li><a href="#d1" class="hover:underline">1. Verantwortlicher</a></li>
            <li><a href="#d2" class="hover:underline">2. Welche Daten wir verarbeiten</a></li>
            <li><a href="#d3" class="hover:underline">3. Rechtsgrundlagen</a></li>
            <li><a href="#d4" class="hover:underline">4. Zwecke der Datenverarbeitung</a></li>
            <li><a href="#d5" class="hover:underline">5. Speicherdauer</a></li>
            <li><a href="#d6" class="hover:underline">6. Weitergabe an Dritte und Sub-Prozessoren</a></li>
            <li><a href="#d7" class="hover:underline">7. Internationale Datenübermittlung</a></li>
            <li><a href="#d8" class="hover:underline">8. Ihre Rechte als betroffene Person</a></li>
            <li><a href="#d9" class="hover:underline">9. Datensicherheit</a></li>
            <li><a href="#d10" class="hover:underline">10. Cookies und Tracking</a></li>
            <li><a href="#d11" class="hover:underline">11. Änderungen dieser Erklärung</a></li>
          </ol>
        </nav>

        <!-- §1 -->
        <section id="d1">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">1. Verantwortlicher</h2>
          <div class="bg-gray-50 rounded-xl p-4 border border-gray-200 text-sm space-y-1">
            <p><strong>Simy IT Systems, Pascal Kilchenmann</strong></p>
            <p>Weiherweg 2, 8610 Uster, Schweiz</p>
            <p>E-Mail: <a href="mailto:info@simy.ch" class="text-blue-600 hover:underline">info@simy.ch</a></p>
            <p>Website: <a href="https://www.simy.ch" class="text-blue-600 hover:underline">www.simy.ch</a></p>
          </div>
          <p class="mt-3">Bei Fragen zum Datenschutz wenden Sie sich bitte direkt per E-Mail an uns. Wir beantworten Anfragen in der Regel innerhalb von 10 Arbeitstagen.</p>
        </section>

        <!-- §2 -->
        <section id="d2">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">2. Welche Daten wir verarbeiten</h2>

          <h3 class="font-semibold text-gray-800 mb-2 mt-4">2.1 Registrierungs- und Kontodaten (Tenant-Admins)</h3>
          <p class="mb-3">Bei der Registrierung einer Fahrschule auf Simy erheben wir:</p>
          <ul class="list-disc pl-5 space-y-1 mb-3">
            <li>Firmenname, rechtlicher Name, URL-Kennung</li>
            <li>Name und Kontaktdaten der Ansprechperson (Vorname, Nachname, E-Mail, Telefon)</li>
            <li>Unternehmensadresse (Strasse, PLZ, Ort)</li>
            <li>UID-Nummer (optional), Website-URL (optional)</li>
            <li>Zahlungsdaten: IBAN und Bank (werden verschlüsselt gespeichert; Kartenzahlungen werden ausschliesslich über Wallee Group AG verarbeitet)</li>
          </ul>

          <h3 class="font-semibold text-gray-800 mb-2 mt-4">2.2 Nutzungs- und Protokolldaten</h3>
          <ul class="list-disc pl-5 space-y-1 mb-3">
            <li>Login-Zeitpunkte und IP-Adressen (für Sicherheitszwecke, max. 90 Tage)</li>
            <li>Verwendete Features und API-Aufrufe (anonymisiert, für Produktverbesserung)</li>
            <li>Fehlermeldungen und Systemprotokolle (max. 30 Tage)</li>
          </ul>

          <h3 class="font-semibold text-gray-800 mb-2 mt-4">2.3 Daten im Auftrag (Auftragsverarbeitung)</h3>
          <p>Schülerdaten, Buchungen, Fahrstunden, Bewertungen und andere von der Fahrschule eingegebenen Daten werden von Simy <strong>ausschliesslich im Auftrag des Kunden</strong> verarbeitet. Simy hat kein eigenes Interesse an diesen Daten und verarbeitet sie nur nach Weisung des Kunden. Es gilt der <NuxtLink to="/avv" class="text-blue-600 hover:underline">Auftragsverarbeitungsvertrag (AVV)</NuxtLink>.</p>
        </section>

        <!-- §3 -->
        <section id="d3">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">3. Rechtsgrundlagen</h2>
          <p class="mb-3">Die Verarbeitung personenbezogener Daten erfolgt auf folgenden Rechtsgrundlagen:</p>
          <div class="overflow-x-auto">
            <table class="w-full text-sm border-collapse">
              <thead>
                <tr class="bg-gray-50">
                  <th class="text-left p-3 font-semibold border border-gray-200">Verarbeitungszweck</th>
                  <th class="text-left p-3 font-semibold border border-gray-200">Rechtsgrundlage (nDSG/DSGVO)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="p-3 border border-gray-200">Vertragserfüllung (Plattform bereitstellen)</td>
                  <td class="p-3 border border-gray-200">Art. 6 Abs. 1 lit. b DSGVO / nDSG Art. 31</td>
                </tr>
                <tr class="bg-gray-50">
                  <td class="p-3 border border-gray-200">Rechnungsstellung und Buchhaltung</td>
                  <td class="p-3 border border-gray-200">Rechtliche Verpflichtung (OR, MWSTG)</td>
                </tr>
                <tr>
                  <td class="p-3 border border-gray-200">Sicherheitsprotokoll-Logs</td>
                  <td class="p-3 border border-gray-200">Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO)</td>
                </tr>
                <tr class="bg-gray-50">
                  <td class="p-3 border border-gray-200">Produktverbesserung (anonymisiert)</td>
                  <td class="p-3 border border-gray-200">Berechtigtes Interesse</td>
                </tr>
                <tr>
                  <td class="p-3 border border-gray-200">Auftragsverarbeitung (Schülerdaten)</td>
                  <td class="p-3 border border-gray-200">AVV (Art. 28 DSGVO / nDSG Art. 9)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- §4 -->
        <section id="d4">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">4. Zwecke der Datenverarbeitung</h2>
          <p class="mb-3">Wir verarbeiten Ihre Daten zu folgenden Zwecken:</p>
          <ul class="list-disc pl-5 space-y-1.5">
            <li>Bereitstellung, Wartung und Verbesserung der Simy-Plattform</li>
            <li>Verwaltung des Kundenkontos und des Abonnements</li>
            <li>Rechnungsstellung und Zahlungsabwicklung</li>
            <li>Technischer Support und Kommunikation</li>
            <li>Sicherheit der Plattform und Missbrauchsprävention</li>
            <li>Erfüllung gesetzlicher Aufbewahrungspflichten (Buchungsunterlagen: 10 Jahre gemäss OR)</li>
          </ul>
        </section>

        <!-- §5 -->
        <section id="d5">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">5. Speicherdauer</h2>
          <div class="overflow-x-auto">
            <table class="w-full text-sm border-collapse">
              <thead>
                <tr class="bg-gray-50">
                  <th class="text-left p-3 font-semibold border border-gray-200">Datenkategorie</th>
                  <th class="text-left p-3 font-semibold border border-gray-200">Speicherdauer</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="p-3 border border-gray-200">Kontodaten (aktive Tenants)</td>
                  <td class="p-3 border border-gray-200">Für die Dauer des Vertragsverhältnisses</td>
                </tr>
                <tr class="bg-gray-50">
                  <td class="p-3 border border-gray-200">Kontodaten (nach Kündigung)</td>
                  <td class="p-3 border border-gray-200">30 Tage (Datenexport), danach Löschung</td>
                </tr>
                <tr>
                  <td class="p-3 border border-gray-200">Rechnungen und Buchungsbelege</td>
                  <td class="p-3 border border-gray-200">10 Jahre (gesetzliche Aufbewahrungspflicht)</td>
                </tr>
                <tr class="bg-gray-50">
                  <td class="p-3 border border-gray-200">Sicherheitslogs (IP-Adressen)</td>
                  <td class="p-3 border border-gray-200">90 Tage</td>
                </tr>
                <tr>
                  <td class="p-3 border border-gray-200">Auftragsverarbeitungs-Daten (Schüler etc.)</td>
                  <td class="p-3 border border-gray-200">30 Tage nach Vertragsende, dann Löschung</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- §6 -->
        <section id="d6">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">6. Weitergabe an Dritte und Sub-Prozessoren</h2>
          <p class="mb-4">Simy gibt Ihre Daten nur in folgenden Fällen an Dritte weiter: zur Vertragserfüllung durch beauftragte Dienstleister (Sub-Prozessoren), bei gesetzlicher Verpflichtung oder mit Ihrer ausdrücklichen Einwilligung.</p>

          <p class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Aktuelle Sub-Prozessoren</p>
          <div class="overflow-x-auto">
            <table class="w-full text-sm border-collapse">
              <thead>
                <tr class="bg-gray-50">
                  <th class="text-left p-3 font-semibold border border-gray-200">Anbieter</th>
                  <th class="text-left p-3 font-semibold border border-gray-200">Leistung</th>
                  <th class="text-left p-3 font-semibold border border-gray-200">Sitz</th>
                  <th class="text-left p-3 font-semibold border border-gray-200">Massnahme</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="p-3 border border-gray-200 font-medium">Supabase Inc.</td>
                  <td class="p-3 border border-gray-200">Datenbank, Authentifizierung</td>
                  <td class="p-3 border border-gray-200">USA (EU-Server wählbar)</td>
                  <td class="p-3 border border-gray-200">SCCs / EU-Hosting</td>
                </tr>
                <tr class="bg-gray-50">
                  <td class="p-3 border border-gray-200 font-medium">Wallee Group AG</td>
                  <td class="p-3 border border-gray-200">Zahlungsabwicklung</td>
                  <td class="p-3 border border-gray-200">Schweiz</td>
                  <td class="p-3 border border-gray-200">PCI DSS Level 1, AVV</td>
                </tr>
                <tr>
                  <td class="p-3 border border-gray-200 font-medium">SMS-Provider (tbd)</td>
                  <td class="p-3 border border-gray-200">Einladungs-SMS</td>
                  <td class="p-3 border border-gray-200">EU/CH</td>
                  <td class="p-3 border border-gray-200">AVV</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="mt-3 text-xs text-gray-500">Simy benachrichtigt Kunden mindestens 14 Tage im Voraus über Änderungen bei Sub-Prozessoren.</p>
        </section>

        <!-- §7 -->
        <section id="d7">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">7. Internationale Datenübermittlung</h2>
          <p class="mb-3">Wo Daten in Länder ausserhalb der Schweiz oder des Europäischen Wirtschaftsraums (EWR) übertragen werden – insbesondere bei der Nutzung von Supabase (US-Sitz) – stellt Simy durch den Abschluss von <strong>Standardvertragsklauseln (SCCs)</strong> gemäss Art. 46 DSGVO sicher, dass ein angemessenes Datenschutzniveau gewährleistet ist.</p>
          <p>Die Datenbank wird bevorzugt auf EU-Servern von Supabase betrieben. Auf Anfrage erteilen wir Auskunft über den aktuellen Hosting-Standort.</p>
        </section>

        <!-- §8 -->
        <section id="d8">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">8. Ihre Rechte als betroffene Person</h2>
          <p class="mb-3">Als betroffene Person stehen Ihnen gemäss nDSG und DSGVO folgende Rechte zu. Anfragen richten Sie bitte an <a href="mailto:support@simy.ch" class="text-blue-600 hover:underline">support@simy.ch</a>. Wir bearbeiten Anfragen innerhalb von <strong>30 Tagen</strong>.</p>
          <div class="grid sm:grid-cols-2 gap-3">
            <div v-for="right in rights" :key="right.title" class="rounded-xl border border-gray-200 p-3">
              <p class="font-semibold text-gray-800 text-sm mb-1">{{ right.title }}</p>
              <p class="text-xs text-gray-600">{{ right.desc }}</p>
            </div>
          </div>
          <p class="mt-4 text-sm">Sie haben ausserdem das Recht, sich bei der zuständigen Aufsichtsbehörde zu beschweren. In der Schweiz ist dies der <strong>Eidgenössische Datenschutz- und Öffentlichkeitsbeauftragte (EDÖB)</strong>, <a href="https://www.edoeb.admin.ch" target="_blank" class="text-blue-600 hover:underline">www.edoeb.admin.ch</a>.</p>
        </section>

        <!-- §9 -->
        <section id="d9">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">9. Datensicherheit</h2>
          <p class="mb-3">Simy setzt dem Stand der Technik entsprechende technische und organisatorische Massnahmen (TOMs) ein:</p>
          <ul class="list-disc pl-5 space-y-1.5">
            <li><strong>Verschlüsselung:</strong> Alle Datenübertragungen erfolgen via TLS 1.2+. Daten at rest sind verschlüsselt.</li>
            <li><strong>Zugriffssteuerung:</strong> Rollenbasiertes Berechtigungskonzept; jeder Tenant sieht ausschliesslich seine eigenen Daten.</li>
            <li><strong>Passwörter:</strong> Mindestlänge 12 Zeichen, Stärkeprüfung, Have I Been Pwned-Integration.</li>
            <li><strong>Backups:</strong> Tägliche automatische Datensicherungen mit 30-tägiger Aufbewahrung.</li>
            <li><strong>Incident Response:</strong> Dokumentierter Prozess; Benachrichtigung betroffener Kunden bei Datenpannen innerhalb von 72 Stunden.</li>
            <li><strong>Updates:</strong> Sicherheits-Patches werden innerhalb von 30 Tagen nach Veröffentlichung eingespielt.</li>
          </ul>
        </section>

        <!-- §10 -->
        <section id="d10">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">10. Cookies und Tracking</h2>
          <p class="mb-3">Die Simy-Plattform verwendet ausschliesslich technisch notwendige Cookies (Session-Cookies für die Authentifizierung). Es werden keine Tracking-, Marketing- oder Analytics-Cookies eingesetzt.</p>
          <p>Es erfolgt keine Weitergabe von Nutzungsdaten an Werbenetzwerke oder soziale Medien.</p>
        </section>

        <!-- §11 -->
        <section id="d11">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">11. Änderungen dieser Erklärung</h2>
          <p>Simy behält sich vor, diese Datenschutzerklärung bei wesentlichen Änderungen der Datenverarbeitung oder der gesetzlichen Rahmenbedingungen anzupassen. Kunden werden per E-Mail über wesentliche Änderungen informiert. Die jeweils aktuelle Version ist unter simy.ch/datenschutz abrufbar.</p>
        </section>

        <!-- Footer -->
        <div class="pt-6 border-t border-gray-100 text-xs text-gray-400">
          <p>Simy IT Systems, Pascal Kilchenmann · Weiherweg 2 · 8610 Uster · Schweiz</p>
          <p class="mt-1">Stand: 1. April 2026 · Version 1.0</p>
          <div class="flex gap-4 mt-3">
            <NuxtLink to="/agb" class="text-blue-500 hover:underline">AGB</NuxtLink>
            <NuxtLink to="/avv" class="text-blue-500 hover:underline">Auftragsverarbeitungsvertrag</NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })
useHead({ title: 'Datenschutzerklärung | Simy' })

const rights = [
  { title: 'Auskunftsrecht', desc: 'Sie können jederzeit Auskunft über die zu Ihrer Person gespeicherten Daten verlangen.' },
  { title: 'Berichtigungsrecht', desc: 'Unrichtige oder unvollständige Daten können Sie berichtigen lassen.' },
  { title: 'Löschungsrecht', desc: 'Sie können die Löschung Ihrer Daten verlangen, sofern keine Aufbewahrungspflichten entgegenstehen.' },
  { title: 'Einschränkungsrecht', desc: 'Sie können die Verarbeitung Ihrer Daten unter bestimmten Bedingungen einschränken lassen.' },
  { title: 'Datenportabilität', desc: 'Sie haben das Recht, Ihre Daten in einem maschinenlesbaren Format zu erhalten.' },
  { title: 'Widerspruchsrecht', desc: 'Sie können der Verarbeitung auf Basis berechtigter Interessen jederzeit widersprechen.' },
]
</script>
