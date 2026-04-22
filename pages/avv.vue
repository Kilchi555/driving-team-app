<!-- pages/avv.vue – Auftragsverarbeitungsvertrag (AVV) Simy -->
<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
      <div class="max-w-4xl mx-auto px-6 py-12 sm:py-16">
        <div class="flex items-center gap-3 mb-4">
          <NuxtLink to="/agb" class="text-blue-200 hover:text-white text-sm transition-colors">← Zurück zu AGB</NuxtLink>
        </div>
        <h1 class="text-2xl sm:text-3xl font-bold mb-2">Auftragsverarbeitungsvertrag (AVV)</h1>
        <p class="text-blue-200 text-sm">Gemäss Art. 28 DSGVO und Art. 9 nDSG | Stand: 1. April 2026</p>
      </div>
    </div>

    <!-- Content -->
    <div class="max-w-4xl mx-auto px-6 py-10 sm:py-14">
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-10 space-y-10 text-sm sm:text-base leading-relaxed text-gray-700">

        <!-- Intro -->
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <p><strong>Hinweis:</strong> Dieser Auftragsverarbeitungsvertrag (AVV) ist integraler Bestandteil der <NuxtLink to="/agb" class="text-amber-700 font-semibold hover:underline">Allgemeinen Geschäftsbedingungen (AGB)</NuxtLink> von Simy. Mit der Registrierung einer Fahrschule auf der Simy-Plattform und der Akzeptanz der AGB stimmt der Kunde diesem AVV zu.</p>
        </div>

        <!-- Vertragsparteien -->
        <section>
          <h2 class="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">Vertragsparteien</h2>
          <div class="grid sm:grid-cols-2 gap-4">
            <div class="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <p class="text-xs font-bold text-blue-500 uppercase tracking-wide mb-2">Auftragsverarbeiter</p>
              <p class="font-semibold text-gray-900">Driving Team Zürich GmbH</p>
              <p class="text-gray-600">Baslerstrasse 145, 8048 Zürich</p>
              <p class="text-gray-600">support@simy.ch</p>
              <p class="text-xs text-blue-600 mt-2">(im Folgenden: «Simy»)</p>
            </div>
            <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Verantwortlicher</p>
              <p class="font-semibold text-gray-900">Der registrierte Tenant</p>
              <p class="text-gray-600">Die Fahrschule, die sich auf der Simy-Plattform registriert hat.</p>
              <p class="text-xs text-gray-500 mt-2">(im Folgenden: «Auftraggeber»)</p>
            </div>
          </div>
        </section>

        <!-- §1 -->
        <section id="a1">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">1. Gegenstand und Dauer der Verarbeitung</h2>
          <p class="mb-3">Simy verarbeitet im Auftrag des Auftraggebers Personendaten im Rahmen der Bereitstellung der SaaS-Plattform für Fahrschulen. Die Verarbeitung erfolgt für die Dauer des Abonnementvertrags und endet mit dessen Beendigung.</p>
          <p>Der Gegenstand der Auftragsverarbeitung ergibt sich aus den in Ziffer 2 beschriebenen Verarbeitungstätigkeiten.</p>
        </section>

        <!-- §2 -->
        <section id="a2">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">2. Art, Zweck und Umfang der Verarbeitung</h2>

          <div class="overflow-x-auto mb-4">
            <table class="w-full text-sm border-collapse">
              <thead>
                <tr class="bg-gray-50">
                  <th class="text-left p-3 font-semibold border border-gray-200">Aspekt</th>
                  <th class="text-left p-3 font-semibold border border-gray-200">Beschreibung</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="p-3 border border-gray-200 font-medium align-top">Art der Verarbeitung</td>
                  <td class="p-3 border border-gray-200">Erhebung, Speicherung, Organisation, Strukturierung, Änderung, Abfrage, Verwendung, Offenlegung, Löschung von Personendaten über eine webbasierte Plattform</td>
                </tr>
                <tr class="bg-gray-50">
                  <td class="p-3 border border-gray-200 font-medium align-top">Zweck</td>
                  <td class="p-3 border border-gray-200">Bereitstellung der Simy-Plattform zur Verwaltung des Fahrschulbetriebs (Schüler, Termine, Rechnungen, Lernfortschritt)</td>
                </tr>
                <tr>
                  <td class="p-3 border border-gray-200 font-medium align-top">Kategorien betroffener Personen</td>
                  <td class="p-3 border border-gray-200">Schüler/Fahrschüler, Fahrlehrer, sonstige Mitarbeiter der Fahrschule</td>
                </tr>
                <tr class="bg-gray-50">
                  <td class="p-3 border border-gray-200 font-medium align-top">Kategorien von Daten</td>
                  <td class="p-3 border border-gray-200">Stammdaten (Name, Adresse, Geburtsdatum, Telefon, E-Mail), Terminbuchungen, Fahrstundenprotokolle, Bewertungen, Zahlungshistorie, Führerscheinkategorie-Informationen</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- §3 -->
        <section id="a3">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">3. Pflichten von Simy als Auftragsverarbeiter</h2>
          <p class="mb-3">Simy verpflichtet sich:</p>
          <ul class="list-disc pl-5 space-y-2">
            <li>Personendaten ausschliesslich auf dokumentierte Weisung des Auftraggebers zu verarbeiten</li>
            <li>Sicherzustellen, dass alle zur Verarbeitung befugten Personen zur Vertraulichkeit verpflichtet sind</li>
            <li>Dem Auftraggeber unverzüglich mitzuteilen, falls Simy der Ansicht ist, eine Weisung verstosse gegen Datenschutzrecht</li>
            <li>Den Auftraggeber bei der Erfüllung von Anfragen betroffener Personen (Auskunft, Löschung, Portabilität) zu unterstützen</li>
            <li>Den Auftraggeber bei der Meldung von Datenschutzverletzungen zu unterstützen; Simy meldet Datenpannen, die Auftraggeberdaten betreffen, innerhalb von <strong>72 Stunden</strong> an den Auftraggeber</li>
            <li>Nach Wahl des Auftraggebers alle Personendaten nach Beendigung der Verarbeitung zu löschen oder zurückzugeben und bestehende Kopien zu löschen, sofern keine gesetzliche Aufbewahrungspflicht besteht</li>
            <li>Dem Auftraggeber alle erforderlichen Informationen zum Nachweis der Einhaltung dieser Pflichten zur Verfügung zu stellen</li>
          </ul>
        </section>

        <!-- §4 -->
        <section id="a4">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">4. Technische und organisatorische Massnahmen (TOMs)</h2>
          <p class="mb-4">Simy trifft folgende Massnahmen zur Sicherung der verarbeiteten Daten:</p>
          <div class="grid sm:grid-cols-2 gap-3">
            <div v-for="tom in toms" :key="tom.title" class="rounded-xl border border-gray-200 p-3">
              <p class="font-semibold text-gray-800 text-sm mb-1 flex items-center gap-2">
                <span class="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg class="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                  </svg>
                </span>
                {{ tom.title }}
              </p>
              <p class="text-xs text-gray-600 pl-7">{{ tom.desc }}</p>
            </div>
          </div>
        </section>

        <!-- §5 -->
        <section id="a5">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">5. Weitere Auftragsverarbeiter (Sub-Prozessoren)</h2>
          <p class="mb-3">Der Auftraggeber erteilt Simy die allgemeine Genehmigung zur Einschaltung der folgenden Sub-Prozessoren:</p>
          <div class="overflow-x-auto">
            <table class="w-full text-sm border-collapse">
              <thead>
                <tr class="bg-gray-50">
                  <th class="text-left p-3 font-semibold border border-gray-200">Unternehmen</th>
                  <th class="text-left p-3 font-semibold border border-gray-200">Leistung</th>
                  <th class="text-left p-3 font-semibold border border-gray-200">Land</th>
                  <th class="text-left p-3 font-semibold border border-gray-200">Garantie</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="p-3 border border-gray-200 font-medium">Supabase Inc.</td>
                  <td class="p-3 border border-gray-200">Datenbankhosting, Authentifizierung</td>
                  <td class="p-3 border border-gray-200">USA / EU</td>
                  <td class="p-3 border border-gray-200">SCCs, EU-Hosting bevorzugt</td>
                </tr>
                <tr class="bg-gray-50">
                  <td class="p-3 border border-gray-200 font-medium">Wallee Group AG</td>
                  <td class="p-3 border border-gray-200">Zahlungsabwicklung</td>
                  <td class="p-3 border border-gray-200">Schweiz</td>
                  <td class="p-3 border border-gray-200">PCI DSS Level 1</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="mt-3 text-sm">Simy informiert den Auftraggeber über beabsichtigte Änderungen bei Sub-Prozessoren mindestens <strong>14 Tage</strong> im Voraus. Der Auftraggeber kann gegen die Änderung begründeten Einspruch erheben.</p>
        </section>

        <!-- §6 -->
        <section id="a6">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">6. Pflichten des Auftraggebers</h2>
          <p class="mb-3">Der Auftraggeber ist als datenschutzrechtlich Verantwortlicher verpflichtet:</p>
          <ul class="list-disc pl-5 space-y-2">
            <li>Seinen Schülern, Fahrlehrern und anderen betroffenen Personen eine eigene Datenschutzerklärung bereitzustellen</li>
            <li>Die erforderliche Rechtsgrundlage für die Verarbeitung der Daten in der Plattform sicherzustellen (z.B. Einwilligung oder Vertragserfüllung)</li>
            <li>Datenschutzanfragen seiner Schüler (Auskunft, Löschung etc.) selbst zu beantworten, oder Simy per E-Mail um Unterstützung zu bitten</li>
            <li>Simy unverzüglich über Änderungen zu informieren, die die Verarbeitungstätigkeiten betreffen</li>
          </ul>
        </section>

        <!-- §7 -->
        <section id="a7">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">7. Datenlöschung nach Vertragsende</h2>
          <p class="mb-3">Nach Beendigung des Abonnementvertrags gilt folgendes:</p>
          <ol class="list-decimal pl-5 space-y-2">
            <li>Der Auftraggeber erhält für <strong>30 Tage</strong> schreibgeschützten Zugang zur Plattform, um seine Daten zu exportieren.</li>
            <li>Nach Ablauf der 30 Tage werden alle Auftrageberdaten unwiderruflich und sicher gelöscht.</li>
            <li>Rechnungsdaten werden entsprechend der gesetzlichen Aufbewahrungspflicht (10 Jahre) aufbewahrt und danach gelöscht.</li>
            <li>Simy bestätigt die vollständige Löschung auf schriftliche Anfrage.</li>
          </ol>
        </section>

        <!-- §8 -->
        <section id="a8">
          <h2 class="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">8. Anwendbares Recht</h2>
          <p>Dieser AVV unterliegt Schweizer Recht. Gerichtsstand ist Zürich. Im Verhältnis zu EU-ansässigen Kunden gelten ergänzend die Anforderungen der DSGVO, insbesondere Art. 28 DSGVO.</p>
        </section>

        <!-- Footer -->
        <div class="pt-6 border-t border-gray-100 text-xs text-gray-400">
          <p>Driving Team Zürich GmbH · Baslerstrasse 145 · 8048 Zürich · Schweiz</p>
          <p class="mt-1">Stand: 1. April 2026 · Version 1.0</p>
          <div class="flex gap-4 mt-3">
            <NuxtLink to="/agb" class="text-blue-500 hover:underline">AGB</NuxtLink>
            <NuxtLink to="/datenschutz" class="text-blue-500 hover:underline">Datenschutz</NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })
useHead({ title: 'Auftragsverarbeitungsvertrag (AVV) | Simy' })

const toms = [
  { title: 'Transportverschlüsselung', desc: 'TLS 1.2+ für alle Datenübertragungen zwischen Client und Server.' },
  { title: 'Verschlüsselung at rest', desc: 'Datenbankinhalt ist verschlüsselt gespeichert (AES-256).' },
  { title: 'Zugriffskontrolle', desc: 'Rollenbasiertes Berechtigungssystem; Tenant-Isolation auf Datenbankebene.' },
  { title: 'Passwort-Sicherheit', desc: 'Min. 12 Zeichen, Stärke-Check, HIBP-Abgleich, bcrypt-Hashing.' },
  { title: 'Datensicherung', desc: 'Tägliche automatische Backups mit 30-tägiger Aufbewahrung.' },
  { title: 'Zugangsprotokollierung', desc: 'Login-Versuche und Admin-Aktionen werden protokolliert (90 Tage).' },
  { title: 'Incident Response', desc: 'Dokumentierter Prozess; Kundenmeldung bei Datenpanne innerhalb 72h.' },
  { title: 'Patch-Management', desc: 'Kritische Sicherheits-Updates innerhalb von 30 Tagen nach Release.' },
]
</script>
