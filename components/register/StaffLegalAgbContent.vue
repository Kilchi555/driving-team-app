<!-- Shared AGB content for staff registration (page + modal) -->
<template>
  <div ref="rootEl" class="space-y-8 text-sm leading-relaxed text-gray-700">
    <div class="bg-violet-50 border border-violet-100 rounded-xl p-4 text-sm text-violet-900">
      <p>Diese Nutzungsbedingungen regeln deine Rechte und Pflichten als <strong>{{ t.staff }}/in</strong> bei der Nutzung der Simy-Plattform. Du wurdest von deiner Organisation eingeladen und nutzt Simy im Rahmen deiner Tätigkeit für diese.</p>
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

    <section :id="id('geltungsbereich')">
      <h2 class="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
        <span class="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
        Geltungsbereich und Vertragspartner
      </h2>
      <p class="mb-3">Diese Nutzungsbedingungen gelten für dich als eingeladene/r {{ t.staff }}/in, der/die über einen personalisierten Einladungslink Zugang zur Simy-Plattform erhält.</p>
      <p class="mb-3">Anbieter der Plattform ist:</p>
      <div class="bg-gray-50 rounded-lg p-4 text-sm mb-3">
        <p class="font-semibold">Simy</p>
        <p>Schweiz</p>
        <p>E-Mail: <a href="mailto:hallo@simy.ch" class="text-violet-600 hover:underline">hallo@simy.ch</a></p>
      </div>
      <p>Dein primäres Vertragsverhältnis besteht mit deiner Organisation (dem Tenant). Simy stellt lediglich die technische Plattform zur Verfügung.</p>
    </section>

    <section :id="id('zugang')">
      <h2 class="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
        <span class="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
        Zugang und Benutzerkonto
      </h2>
      <p class="mb-3">Der Zugang zur Plattform erfolgt ausschliesslich über einen personalisierten Einladungslink deiner Organisation. Du erhältst ein persönliches Konto, das nicht übertragbar ist.</p>
      <ul class="list-disc pl-5 space-y-2 mb-3">
        <li>Du bist für die Sicherheit deines Passworts verantwortlich.</li>
        <li>Du darfst dein Konto nicht an Dritte weitergeben.</li>
        <li>Bei Verdacht auf unbefugten Zugriff musst du uns und deine Organisation umgehend informieren.</li>
        <li>Du verwendest ausschliesslich deine eigenen, korrekten Daten bei der Registrierung.</li>
      </ul>
      <p>Mit der Registrierung bestätigst du, dass du volljährig bist und rechtlich in der Lage bist, diesen Bedingungen zuzustimmen.</p>
    </section>

    <section :id="id('leistungen')">
      <h2 class="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
        <span class="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
        Leistungen der Plattform
      </h2>
      <p class="mb-3">Simy stellt dir als {{ t.staff }}/in folgende Funktionen zur Verfügung:</p>
      <ul class="list-disc pl-5 space-y-2 mb-3">
        <li>Verwaltung deines persönlichen Kalenders und Verfügbarkeiten</li>
        <li>Einsicht in Buchungen und {{ t.clientsPlural }} deiner Organisation</li>
        <li>Verwaltung deiner Standorte</li>
        <li>Kommunikation über die Plattform</li>
        <li>Verwaltung zugehöriger Ressourcen und Dokumente</li>
      </ul>
      <p>Der Umfang der dir zugänglichen Funktionen wird durch die Berechtigungen bestimmt, die deine Organisation dir einräumt.</p>
    </section>

    <section :id="id('pflichten')">
      <h2 class="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
        <span class="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
        Deine Pflichten
      </h2>
      <p class="mb-3">Bei der Nutzung der Plattform bist du verpflichtet:</p>
      <ul class="list-disc pl-5 space-y-2 mb-3">
        <li>Alle eingegebenen Daten (Personalien, Verfügbarkeiten, Standorte) wahrheitsgemäss und aktuell zu halten.</li>
        <li>Die Plattform ausschliesslich für den vorgesehenen Zweck im Rahmen deiner Tätigkeit als {{ t.staff }}/in zu nutzen.</li>
        <li>Kundendaten ({{ t.clientsPlural }}) vertraulich zu behandeln und nur im Rahmen deiner Tätigkeit zu verwenden.</li>
        <li>Keine automatisierten Zugriffe (Bots, Scraping) durchzuführen.</li>
        <li>Anwendbare Datenschutzgesetze (insbesondere DSG/DSGVO) einzuhalten.</li>
      </ul>
      <div class="bg-amber-50 border border-amber-100 rounded-lg p-4 text-sm text-amber-800">
        <p><strong>Wichtig:</strong> Du bist nicht berechtigt, {{ t.client }}daten ausserhalb der Plattform zu speichern oder an Dritte weiterzugeben, ausser dies ist für die Erbringung deiner Dienstleistungen notwendig.</p>
      </div>
    </section>

    <section :id="id('kuendigung')">
      <h2 class="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
        <span class="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">5</span>
        Kündigung und Kontodeaktivierung
      </h2>
      <p class="mb-3">Dein Konto ist an deine Organisation gebunden:</p>
      <ul class="list-disc pl-5 space-y-2 mb-3">
        <li>Deine Organisation kann deinen Zugang jederzeit deaktivieren (z.B. bei Beendigung des Arbeitsverhältnisses).</li>
        <li>Du kannst deine Organisation bitten, dein Konto zu löschen.</li>
        <li>Bei Kündigung werden deine Kontodaten für die gesetzlich vorgeschriebene Frist aufbewahrt und danach gelöscht.</li>
      </ul>
      <p>Nach Deaktivierung hast du keinen Zugriff mehr auf die Plattform. Abgeschlossene Buchungen und Bewertungen bleiben im System von {{ t.businessNoun }} erhalten, solange diese Simy nutzt.</p>
    </section>

    <section :id="id('haftung')">
      <h2 class="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
        <span class="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">6</span>
        Haftungsbeschränkung
      </h2>
      <p class="mb-3">Simy haftet nicht für:</p>
      <ul class="list-disc pl-5 space-y-2 mb-3">
        <li>Kurzfristige Unterbrechungen oder technische Störungen der Plattform</li>
        <li>Datenverlust durch höhere Gewalt oder Hackerangriffe trotz angemessener Sicherheitsmassnahmen</li>
        <li>Entscheidungen oder Handlungen, die deine Organisation auf Basis der Plattformdaten trifft</li>
        <li>Schäden durch unsachgemässe Nutzung der Plattform</li>
      </ul>
      <p>Simy ist bestrebt, eine Verfügbarkeit von 99 % (gemessen pro Monat, exkl. geplante Wartungszeiten) zu gewährleisten, übernimmt hierfür jedoch keine Garantie.</p>
    </section>

    <section :id="id('aenderungen')">
      <h2 class="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
        <span class="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">7</span>
        Änderungen dieser Bedingungen
      </h2>
      <p class="mb-3">Simy behält sich vor, diese Nutzungsbedingungen zu aktualisieren. Bei wesentlichen Änderungen wirst du per E-Mail informiert. Wenn du die Plattform nach dem Inkrafttreten der Änderungen weiter nutzt, gilt dies als Zustimmung zu den neuen Bedingungen.</p>
    </section>

    <section :id="id('recht')">
      <h2 class="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
        <span class="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">8</span>
        Anwendbares Recht und Gerichtsstand
      </h2>
      <p>Es gilt Schweizer Recht. Gerichtsstand ist Zürich, Schweiz.</p>
    </section>

    <div class="border-t pt-6 text-xs text-gray-400 text-center">
      Simy · hallo@simy.ch · Stand: Mai 2026
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { getTerminologyDefaults } from '~/composables/useTerminology'

const props = withDefaults(defineProps<{ businessType?: string; idPrefix?: string }>(), {
  businessType: 'driving_school',
  idPrefix: 'agb',
})

const rootEl = ref<HTMLElement | null>(null)
const t = computed(() => getTerminologyDefaults(props.businessType))
const id = (slug: string) => `${props.idPrefix}-${slug}`

const toc = computed(() => [
  { id: id('geltungsbereich'), label: 'Geltungsbereich und Vertragspartner' },
  { id: id('zugang'),          label: 'Zugang und Benutzerkonto' },
  { id: id('leistungen'),      label: 'Leistungen der Plattform' },
  { id: id('pflichten'),       label: 'Deine Pflichten' },
  { id: id('kuendigung'),      label: 'Kündigung und Kontodeaktivierung' },
  { id: id('haftung'),         label: 'Haftungsbeschränkung' },
  { id: id('aenderungen'),     label: 'Änderungen dieser Bedingungen' },
  { id: id('recht'),           label: 'Anwendbares Recht und Gerichtsstand' },
])

const scrollTo = (sectionId: string) => {
  const el = rootEl.value?.querySelector(`#${CSS.escape(sectionId)}`) || document.getElementById(sectionId)
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>
