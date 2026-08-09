<!-- Shared privacy content for staff registration (page + modal) -->
<template>
  <div ref="rootEl" class="space-y-8 text-sm leading-relaxed text-gray-700">
    <div class="bg-violet-50 border border-violet-100 rounded-xl p-4 text-sm text-violet-900">
      <p><strong>Diese Datenschutzerklärung</strong> richtet sich an <strong>{{ t.staff }}/innen</strong>, die von ihrer Organisation zur Nutzung von Simy eingeladen wurden. Sie erklärt, welche Daten wir von dir verarbeiten, zu welchem Zweck und welche Rechte du hast.</p>
    </div>

    <nav class="rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <div class="bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 flex items-center gap-2">
        <svg class="w-4 h-4 text-white/70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h10"/></svg>
        <p class="text-xs font-bold text-white uppercase tracking-widest">Inhaltsverzeichnis</p>
      </div>
      <ol class="divide-y divide-gray-50">
        <li v-for="(item, i) in toc" :key="item.id">
          <button type="button" @click="scrollTo(item.id)"
            class="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-left transition-all text-gray-600 hover:bg-gray-50 hover:text-gray-900">
            <span class="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[11px] font-bold flex-shrink-0">{{ i + 1 }}</span>
            {{ item.label }}
          </button>
        </li>
      </ol>
    </nav>

    <section :id="id('verantwortliche')">
      <h2 class="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
        <span class="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
        Verantwortliche Stellen
      </h2>
      <p class="mb-3">Es gibt zwei datenschutzrechtlich relevante Stellen:</p>
      <div class="grid sm:grid-cols-2 gap-4 mb-3">
        <div class="bg-gray-50 rounded-lg p-4 text-sm">
          <p class="font-semibold text-gray-900 mb-1">Deine Organisation (Tenant)</p>
          <p class="text-gray-600">Ist Verantwortliche für die Verarbeitung deiner Daten im Rahmen des Beschäftigungs- oder Auftragsverhältnisses. {{ t.businessNoun }} entscheidet, welche Daten im Rahmen der Plattformnutzung erhoben werden.</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-4 text-sm">
          <p class="font-semibold text-gray-900 mb-1">Simy (Auftragsverarbeiter)</p>
          <p class="text-gray-600">Verarbeitet deine Daten im Auftrag deiner Organisation und gemäss den gesetzlichen Vorgaben. Simy hat keinen eigenen wirtschaftlichen Zugriff auf deine personenbezogenen Daten.</p>
        </div>
      </div>
      <div class="bg-gray-50 rounded-lg p-4 text-sm">
        <p class="font-semibold">Simy-Kontakt für Datenschutzfragen:</p>
        <p>E-Mail: <a href="mailto:datenschutz@simy.ch" class="text-violet-600 hover:underline">datenschutz@simy.ch</a></p>
      </div>
    </section>

    <section :id="id('daten')">
      <h2 class="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
        <span class="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
        Welche Daten werden erhoben?
      </h2>
      <p class="mb-3">Bei der Registrierung und Nutzung der Plattform werden folgende Daten verarbeitet:</p>
      <div class="space-y-3">
        <div class="border border-gray-100 rounded-lg overflow-hidden">
          <div class="bg-violet-50 px-4 py-2 text-xs font-semibold text-violet-800 uppercase tracking-wider">Registrierungsdaten</div>
          <ul class="divide-y divide-gray-50">
            <li class="px-4 py-2.5 text-sm flex gap-3"><span class="text-violet-500 flex-shrink-0">▸</span> Vorname, Nachname, E-Mail-Adresse</li>
            <li class="px-4 py-2.5 text-sm flex gap-3"><span class="text-violet-500 flex-shrink-0">▸</span> Telefonnummer, Geburtsdatum</li>
            <li class="px-4 py-2.5 text-sm flex gap-3"><span class="text-violet-500 flex-shrink-0">▸</span> Wohnadresse (Strasse, PLZ, Ort)</li>
            <li class="px-4 py-2.5 text-sm flex gap-3"><span class="text-violet-500 flex-shrink-0">▸</span> Passwort (verschlüsselt gespeichert)</li>
          </ul>
        </div>
        <div class="border border-gray-100 rounded-lg overflow-hidden">
          <div class="bg-violet-50 px-4 py-2 text-xs font-semibold text-violet-800 uppercase tracking-wider">Professionelle Daten</div>
          <ul class="divide-y divide-gray-50">
            <li v-if="isDrivingSchool" class="px-4 py-2.5 text-sm flex gap-3"><span class="text-violet-500 flex-shrink-0">▸</span> Unterrichtete Fahrkategorien</li>
            <li class="px-4 py-2.5 text-sm flex gap-3"><span class="text-violet-500 flex-shrink-0">▸</span> Reguläre Arbeitszeiten und Verfügbarkeiten</li>
            <li class="px-4 py-2.5 text-sm flex gap-3"><span class="text-violet-500 flex-shrink-0">▸</span> Treffpunkte und Standorte</li>
            <li class="px-4 py-2.5 text-sm flex gap-3"><span class="text-violet-500 flex-shrink-0">▸</span> Kalendereinträge und Buchungen</li>
          </ul>
        </div>
        <div class="border border-gray-100 rounded-lg overflow-hidden">
          <div class="bg-violet-50 px-4 py-2 text-xs font-semibold text-violet-800 uppercase tracking-wider">Dokumente</div>
          <ul class="divide-y divide-gray-50">
            <li v-if="isDrivingSchool" class="px-4 py-2.5 text-sm flex gap-3"><span class="text-violet-500 flex-shrink-0">▸</span> Führerschein (Vorder- und Rückseite, als Bild gespeichert)</li>
            <li class="px-4 py-2.5 text-sm flex gap-3"><span class="text-violet-500 flex-shrink-0">▸</span> Weitere für {{ t.businessNoun }} relevante Dokumente</li>
          </ul>
        </div>
        <div class="border border-gray-100 rounded-lg overflow-hidden">
          <div class="bg-violet-50 px-4 py-2 text-xs font-semibold text-violet-800 uppercase tracking-wider">Nutzungsdaten</div>
          <ul class="divide-y divide-gray-50">
            <li class="px-4 py-2.5 text-sm flex gap-3"><span class="text-violet-500 flex-shrink-0">▸</span> Login-Zeitstempel und IP-Adressen (Sicherheitslogs)</li>
            <li class="px-4 py-2.5 text-sm flex gap-3"><span class="text-violet-500 flex-shrink-0">▸</span> Aktionen innerhalb der Plattform (Audit-Log)</li>
          </ul>
        </div>
      </div>
    </section>

    <section :id="id('zweck')">
      <h2 class="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
        <span class="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
        Zweck der Datenverarbeitung
      </h2>
      <p class="mb-3">Deine Daten werden ausschliesslich für folgende Zwecke verarbeitet:</p>
      <ul class="list-disc pl-5 space-y-2">
        <li><strong>Verwaltung deines Kontos</strong> und Authentifizierung</li>
        <li><strong>Terminverwaltung</strong>: Zuweisung von {{ t.appointmentsPlural }} und Buchungen durch deine Organisation</li>
        <li><strong>{{ t.clientsPlural }}verwaltung</strong>: Anzeige der dir zugewiesenen {{ t.clientsPlural }}</li>
        <li><strong>Kommunikation</strong> über die Plattform (Benachrichtigungen, Bestätigungen)</li>
        <li><strong>Sicherheit</strong>: Schutz vor unbefugtem Zugriff und Missbrauch</li>
        <li><strong>Gesetzliche Pflichten</strong>: Aufbewahrung von Daten gemäss Schweizer Recht</li>
      </ul>
      <p class="mt-3">Deine Daten werden <strong>nicht</strong> für Werbezwecke genutzt und <strong>nicht</strong> an Dritte verkauft.</p>
    </section>

    <section :id="id('rechtsgrundlagen')">
      <h2 class="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
        <span class="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
        Rechtsgrundlagen
      </h2>
      <p class="mb-3">Die Verarbeitung deiner Daten stützt sich auf:</p>
      <ul class="list-disc pl-5 space-y-2">
        <li><strong>Vertragserfüllung</strong> (Art. 6 Abs. 1 lit. b DSGVO / Art. 31 DSG): für die Bereitstellung der Plattformfunktionen</li>
        <li><strong>Einwilligung</strong> (Art. 6 Abs. 1 lit. a DSGVO / Art. 31 DSG): durch Akzeptanz dieser Datenschutzerklärung bei der Registrierung</li>
        <li><strong>Berechtigte Interessen</strong> (Art. 6 Abs. 1 lit. f DSGVO): für Sicherheit und Betrugsprävention</li>
        <li><strong>Gesetzliche Verpflichtung</strong>: für Aufbewahrungspflichten</li>
      </ul>
    </section>

    <section :id="id('weitergabe')">
      <h2 class="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
        <span class="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">5</span>
        Weitergabe an Dritte
      </h2>
      <p class="mb-3">Deine Daten werden nur in folgenden Fällen weitergegeben:</p>
      <ul class="list-disc pl-5 space-y-2 mb-3">
        <li><strong>Deine Organisation</strong>: {{ t.businessNoun }}, die dich eingeladen hat, hat Zugriff auf deine Profil- und Buchungsdaten.</li>
        <li><strong>{{ t.clientsPlural }}</strong>: Name, Foto (falls hinterlegt) und Kontaktinfos können deinen zugewiesenen {{ t.clientsPlural }} sichtbar sein.</li>
        <li><strong>Technische Dienstleister</strong>: Supabase (Datenbankhosting, in der EU) als Auftragsverarbeiter.</li>
        <li><strong>Behörden</strong>: Nur wenn gesetzlich vorgeschrieben.</li>
      </ul>
      <div class="bg-green-50 border border-green-100 rounded-lg p-4 text-sm text-green-800">
        Eine Weitergabe an Dritte zu kommerziellen Zwecken findet nicht statt.
      </div>
    </section>

    <section :id="id('speicherdauer')">
      <h2 class="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
        <span class="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">6</span>
        Speicherdauer
      </h2>
      <p class="mb-3">Deine Daten werden gespeichert:</p>
      <ul class="list-disc pl-5 space-y-2">
        <li><strong>Aktives Konto</strong>: Für die gesamte Dauer deiner Tätigkeit für {{ t.businessNoun }}.</li>
        <li><strong>Nach Kontoauflösung</strong>: Buchungs- und Transaktionsdaten werden gemäss den gesetzlichen Aufbewahrungsfristen (mindestens 10 Jahre) für Buchhaltungszwecke gespeichert.</li>
        <li><strong>Persönliche Daten</strong> (Adresse, Geburtsdatum): werden nach Ablauf der gesetzlichen Fristen gelöscht.</li>
        <li><strong>Dokumente</strong>: werden auf Anfrage oder nach Kontoauflösung gelöscht.</li>
      </ul>
    </section>

    <section :id="id('rechte')">
      <h2 class="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
        <span class="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">7</span>
        Deine Rechte
      </h2>
      <p class="mb-3">Du hast folgende Rechte bezüglich deiner Daten:</p>
      <div class="grid sm:grid-cols-2 gap-3">
        <div class="border border-gray-100 rounded-lg p-3 text-sm">
          <p class="font-semibold text-gray-900 mb-1">Auskunft</p>
          <p class="text-gray-600">Du kannst jederzeit Auskunft über die zu deiner Person gespeicherten Daten verlangen.</p>
        </div>
        <div class="border border-gray-100 rounded-lg p-3 text-sm">
          <p class="font-semibold text-gray-900 mb-1">Berichtigung</p>
          <p class="text-gray-600">Du kannst falsche oder unvollständige Daten korrigieren lassen.</p>
        </div>
        <div class="border border-gray-100 rounded-lg p-3 text-sm">
          <p class="font-semibold text-gray-900 mb-1">Löschung</p>
          <p class="text-gray-600">Du kannst die Löschung deiner Daten verlangen, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen.</p>
        </div>
        <div class="border border-gray-100 rounded-lg p-3 text-sm">
          <p class="font-semibold text-gray-900 mb-1">Datenportabilität</p>
          <p class="text-gray-600">Du hast das Recht, deine Daten in einem gängigen Format zu erhalten.</p>
        </div>
        <div class="border border-gray-100 rounded-lg p-3 text-sm">
          <p class="font-semibold text-gray-900 mb-1">Widerspruch</p>
          <p class="text-gray-600">Du kannst der Verarbeitung deiner Daten zu bestimmten Zwecken widersprechen.</p>
        </div>
        <div class="border border-gray-100 rounded-lg p-3 text-sm">
          <p class="font-semibold text-gray-900 mb-1">Beschwerde</p>
          <p class="text-gray-600">Du hast das Recht, beim EDÖB (Eidgenössischer Datenschutzbeauftragter) Beschwerde einzureichen.</p>
        </div>
      </div>
      <p class="mt-4">Für Anfragen zu deinen Datenschutzrechten wende dich an: <a href="mailto:datenschutz@simy.ch" class="text-violet-600 hover:underline">datenschutz@simy.ch</a></p>
    </section>

    <section :id="id('sicherheit')">
      <h2 class="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
        <span class="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">8</span>
        Datensicherheit
      </h2>
      <p class="mb-3">Simy setzt folgende technische und organisatorische Massnahmen zum Schutz deiner Daten ein:</p>
      <ul class="list-disc pl-5 space-y-2">
        <li>Verschlüsselte Übertragung (HTTPS/TLS)</li>
        <li>Verschlüsselte Passwortspeicherung (bcrypt)</li>
        <li>Zugriffskontrolle nach dem Prinzip der minimalen Berechtigung</li>
        <li>Regelmässige Sicherheits-Audits</li>
        <li>Hosting in der EU (Supabase EU-Region)</li>
      </ul>
    </section>

    <div class="border-t pt-6 text-xs text-gray-400 text-center">
      Simy · datenschutz@simy.ch · Stand: Mai 2026
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { getTerminologyDefaults } from '~/composables/useTerminology'

const props = withDefaults(defineProps<{ businessType?: string; idPrefix?: string }>(), {
  businessType: 'driving_school',
  idPrefix: 'privacy',
})

const rootEl = ref<HTMLElement | null>(null)
const t = computed(() => getTerminologyDefaults(props.businessType))
const isDrivingSchool = computed(() => props.businessType === 'driving_school')
const id = (slug: string) => `${props.idPrefix}-${slug}`

const toc = computed(() => [
  { id: id('verantwortliche'),  label: 'Verantwortliche Stellen' },
  { id: id('daten'),            label: 'Welche Daten werden erhoben?' },
  { id: id('zweck'),            label: 'Zweck der Datenverarbeitung' },
  { id: id('rechtsgrundlagen'), label: 'Rechtsgrundlagen' },
  { id: id('weitergabe'),       label: 'Weitergabe an Dritte' },
  { id: id('speicherdauer'),    label: 'Speicherdauer' },
  { id: id('rechte'),           label: 'Deine Rechte' },
  { id: id('sicherheit'),       label: 'Datensicherheit' },
])

const scrollTo = (sectionId: string) => {
  const el = rootEl.value?.querySelector(`#${CSS.escape(sectionId)}`) || document.getElementById(sectionId)
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>
