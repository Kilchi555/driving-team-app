<!-- pages/register/staff-agb.vue – Nutzungsbedingungen für Fahrlehrer -->
<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
      <div class="max-w-4xl mx-auto px-6 py-12 sm:py-16">
        <div class="flex items-center gap-3 mb-4">
          <button @click="$router.back()" class="inline-flex items-center gap-1.5 text-violet-200 hover:text-white text-sm transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            Zurück zur Registrierung
          </button>
        </div>
        <h1 class="text-2xl sm:text-3xl font-bold mb-2">Nutzungsbedingungen für Fahrlehrer</h1>
        <p class="text-violet-200 text-sm">Simy – Plattform für Fahrschulen | Stand: Mai 2026 · Version 1.0</p>
      </div>
    </div>

    <!-- Content -->
    <div class="max-w-4xl mx-auto px-6 py-10 sm:py-14">
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-10 space-y-10 text-sm sm:text-base leading-relaxed text-gray-700">

        <!-- Intro -->
        <div class="bg-violet-50 border border-violet-100 rounded-xl p-4 text-sm text-violet-900">
          <p>Diese Nutzungsbedingungen regeln deine Rechte und Pflichten als <strong>Fahrlehrer/in</strong> bei der Nutzung der Simy-Plattform. Du wurdest von deiner Fahrschule eingeladen und nutzt Simy im Rahmen deiner Tätigkeit für diese.</p>
        </div>

        <!-- Inhaltsverzeichnis -->
        <nav class="rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div class="bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 flex items-center gap-2">
            <svg class="w-4 h-4 text-white/70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h10"/></svg>
            <p class="text-xs font-bold text-white uppercase tracking-widest">Inhaltsverzeichnis</p>
          </div>
          <ol class="divide-y divide-gray-50">
            <li v-for="(item, i) in toc" :key="item.href">
              <a :href="item.href" @click.prevent="scrollTo(item.href)"
                class="flex items-center gap-3 px-5 py-2.5 text-sm transition-all text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                <span class="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[11px] font-bold flex-shrink-0">{{ i + 1 }}</span>
                {{ item.label }}
              </a>
            </li>
          </ol>
        </nav>

        <!-- §1 Geltungsbereich -->
        <section id="geltungsbereich">
          <h2 class="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span class="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
            Geltungsbereich und Vertragspartner
          </h2>
          <p class="mb-3">Diese Nutzungsbedingungen gelten für dich als eingeladene/r Fahrlehrer/in, der/die über einen personalisierten Einladungslink Zugang zur Simy-Plattform erhält.</p>
          <p class="mb-3">Anbieter der Plattform ist:</p>
          <div class="bg-gray-50 rounded-lg p-4 text-sm mb-3">
            <p class="font-semibold">Simy</p>
            <p>Schweiz</p>
            <p>E-Mail: <a href="mailto:hallo@simy.ch" class="text-violet-600 hover:underline">hallo@simy.ch</a></p>
          </div>
          <p>Dein primäres Vertragsverhältnis besteht mit deiner Fahrschule (dem Tenant). Simy stellt lediglich die technische Plattform zur Verfügung.</p>
        </section>

        <!-- §2 Zugang und Konto -->
        <section id="zugang">
          <h2 class="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span class="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
            Zugang und Benutzerkonto
          </h2>
          <p class="mb-3">Der Zugang zur Plattform erfolgt ausschliesslich über einen personalisierten Einladungslink deiner Fahrschule. Du erhältst ein persönliches Konto, das nicht übertragbar ist.</p>
          <ul class="list-disc pl-5 space-y-2 mb-3">
            <li>Du bist für die Sicherheit deines Passworts verantwortlich.</li>
            <li>Du darfst dein Konto nicht an Dritte weitergeben.</li>
            <li>Bei Verdacht auf unbefugten Zugriff musst du uns und deine Fahrschule umgehend informieren.</li>
            <li>Du verwendest ausschliesslich deine eigenen, korrekten Daten bei der Registrierung.</li>
          </ul>
          <p>Mit der Registrierung bestätigst du, dass du volljährig bist und rechtlich in der Lage bist, diesen Bedingungen zuzustimmen.</p>
        </section>

        <!-- §3 Leistungen -->
        <section id="leistungen">
          <h2 class="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span class="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
            Leistungen der Plattform
          </h2>
          <p class="mb-3">Simy stellt dir als Fahrlehrer/in folgende Funktionen zur Verfügung:</p>
          <ul class="list-disc pl-5 space-y-2 mb-3">
            <li>Verwaltung deines persönlichen Kalenders und Verfügbarkeiten</li>
            <li>Einsicht in Buchungen und Fahrschüler deiner Fahrschule</li>
            <li>Verwaltung deiner Unterrichtsorte und Prüfungsorte</li>
            <li>Kommunikation über die Plattform</li>
            <li>Verwaltung deiner Fahrzeuge und Unterlagendokumente</li>
          </ul>
          <p>Der Umfang der dir zugänglichen Funktionen wird durch die Berechtigungen bestimmt, die deine Fahrschule dir einräumt.</p>
        </section>

        <!-- §4 Pflichten -->
        <section id="pflichten">
          <h2 class="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span class="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
            Deine Pflichten
          </h2>
          <p class="mb-3">Bei der Nutzung der Plattform bist du verpflichtet:</p>
          <ul class="list-disc pl-5 space-y-2 mb-3">
            <li>Alle eingegebenen Daten (Personalien, Verfügbarkeiten, Standorte) wahrheitsgemäss und aktuell zu halten.</li>
            <li>Die Plattform ausschliesslich für den vorgesehenen Zweck im Rahmen deiner Tätigkeit als Fahrlehrer/in zu nutzen.</li>
            <li>Kundendaten (Fahrschüler) vertraulich zu behandeln und nur im Rahmen deiner Tätigkeit zu verwenden.</li>
            <li>Keine automatisierten Zugriffe (Bots, Scraping) durchzuführen.</li>
            <li>Anwendbare Datenschutzgesetze (insbesondere DSG/DSGVO) einzuhalten.</li>
          </ul>
          <div class="bg-amber-50 border border-amber-100 rounded-lg p-4 text-sm text-amber-800">
            <p><strong>Wichtig:</strong> Du bist nicht berechtigt, Schülerdaten ausserhalb der Plattform zu speichern oder an Dritte weiterzugeben, ausser dies ist für die Erbringung deiner Fahrausbildungsdienstleistungen notwendig.</p>
          </div>
        </section>

        <!-- §5 Kündigung -->
        <section id="kuendigung">
          <h2 class="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span class="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">5</span>
            Kündigung und Kontodeaktivierung
          </h2>
          <p class="mb-3">Dein Konto ist an deine Fahrschule gebunden:</p>
          <ul class="list-disc pl-5 space-y-2 mb-3">
            <li>Deine Fahrschule kann deinen Zugang jederzeit deaktivieren (z.B. bei Beendigung des Arbeitsverhältnisses).</li>
            <li>Du kannst deine Fahrschule bitten, dein Konto zu löschen.</li>
            <li>Bei Kündigung werden deine Kontodaten für die gesetzlich vorgeschriebene Frist aufbewahrt und danach gelöscht.</li>
          </ul>
          <p>Nach Deaktivierung hast du keinen Zugriff mehr auf die Plattform. Abgeschlossene Buchungen und Bewertungen bleiben im System der Fahrschule erhalten, solange diese Simy nutzt.</p>
        </section>

        <!-- §6 Haftung -->
        <section id="haftung">
          <h2 class="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span class="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">6</span>
            Haftungsbeschränkung
          </h2>
          <p class="mb-3">Simy haftet nicht für:</p>
          <ul class="list-disc pl-5 space-y-2 mb-3">
            <li>Kurzfristige Unterbrechungen oder technische Störungen der Plattform</li>
            <li>Datenverlust durch höhere Gewalt oder Hackerangriffe trotz angemessener Sicherheitsmassnahmen</li>
            <li>Entscheidungen oder Handlungen, die deine Fahrschule auf Basis der Plattformdaten trifft</li>
            <li>Schäden durch unsachgemässe Nutzung der Plattform</li>
          </ul>
          <p>Simy ist bestrebt, eine Verfügbarkeit von 99 % (gemessen pro Monat, exkl. geplante Wartungszeiten) zu gewährleisten, übernimmt hierfür jedoch keine Garantie.</p>
        </section>

        <!-- §7 Änderungen -->
        <section id="aenderungen">
          <h2 class="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span class="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">7</span>
            Änderungen dieser Bedingungen
          </h2>
          <p class="mb-3">Simy behält sich vor, diese Nutzungsbedingungen zu aktualisieren. Bei wesentlichen Änderungen wirst du per E-Mail informiert. Wenn du die Plattform nach dem Inkrafttreten der Änderungen weiter nutzt, gilt dies als Zustimmung zu den neuen Bedingungen.</p>
        </section>

        <!-- §8 Anwendbares Recht -->
        <section id="recht">
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
    </div>
  </div>
</template>

<script setup lang="ts">
const toc = [
  { href: '#geltungsbereich', label: 'Geltungsbereich und Vertragspartner' },
  { href: '#zugang',          label: 'Zugang und Benutzerkonto' },
  { href: '#leistungen',      label: 'Leistungen der Plattform' },
  { href: '#pflichten',       label: 'Deine Pflichten' },
  { href: '#kuendigung',      label: 'Kündigung und Kontodeaktivierung' },
  { href: '#haftung',         label: 'Haftungsbeschränkung' },
  { href: '#aenderungen',     label: 'Änderungen dieser Bedingungen' },
  { href: '#recht',           label: 'Anwendbares Recht und Gerichtsstand' },
]

const scrollTo = (href: string) => {
  const el = document.querySelector(href)
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

useHead({ title: 'Nutzungsbedingungen für Fahrlehrer – Simy' })
</script>
