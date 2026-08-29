<template>
  <div class="min-h-screen bg-white font-sans">
    <SimyNav />

    <!-- Hero -->
    <section class="pt-20 pb-24 px-6 relative overflow-hidden">
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full opacity-[0.06]"
          style="background: radial-gradient(circle, var(--brand-primary), transparent)"></div>
      </div>
      <div class="relative max-w-4xl mx-auto">
        <nav class="flex items-center gap-2 text-xs text-gray-400 mb-8">
          <a href="/" class="hover:text-gray-600">Simy</a><span>›</span>
          <a href="/fahrschule" class="hover:text-gray-600">Fahrschule</a><span>›</span>
          <span class="text-gray-600">Fahrlehrer App</span>
        </nav>
        <div class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider mb-6 border"
          style="background: rgba(var(--brand-rgb),0.07); color: var(--brand-primary); border-color: rgba(var(--brand-rgb),0.25)">
          Fahrlehrer App
        </div>
        <h1 class="text-3xl md:text-5xl font-black text-gray-900 mb-6 leading-tight">
          Die Fahrlehrer App, die<br/>
          <span style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
            wirklich an alles denkt.
          </span>
        </h1>
        <p class="text-xl text-gray-500 max-w-2xl mb-10 leading-relaxed">
          Kalender, Schülerliste, Erinnerungen, Ausbildungsplan, Online-Zahlung und Terminbuchung — alles auf deinem Smartphone. Simy läuft auf iOS und Android.
        </p>
        <div class="flex flex-col sm:flex-row gap-4">
          <a :href="registerCta"
            class="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-white font-bold transition-all hover:opacity-90"
            style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); box-shadow: 0 8px 24px rgba(var(--brand-rgb),0.3)">
            Kostenlos testen →
          </a>
        </div>
        <div class="flex flex-wrap gap-4 mt-8 text-sm text-gray-400">
          <span class="flex items-center gap-1.5">✅ iOS & Android</span>
          <span class="flex items-center gap-1.5">✅ Push-Benachrichtigungen</span>
          <span class="flex items-center gap-1.5">✅ Viele Automatisierungen</span>
        </div>
      </div>
    </section>

    <!-- Device Mockup Showcase -->
    <section class="py-20 px-4 overflow-hidden" style="background: linear-gradient(180deg, rgba(var(--brand-rgb),0.04) 0%, rgba(var(--brand-2-rgb),0.06) 100%)">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-12">
          <div class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider mb-4 border"
            style="background: rgba(var(--brand-rgb),0.07); color: var(--brand-primary); border-color: rgba(var(--brand-rgb),0.25)">
            Auf jedem Gerät
          </div>
          <h2 class="text-3xl font-extrabold text-gray-900 mb-3">iPhone, iPad & Desktop — immer dabei</h2>
          <p class="text-gray-500 max-w-xl mx-auto text-base">Simy passt sich automatisch an dein Gerät an. Ob auf dem Smartphone zwischen zwei Fahrstunden oder am Computer im Büro — du hast immer alles im Griff.</p>
        </div>

        <div class="grid md:grid-cols-[200px_1fr] gap-6 items-end">
          <SimyShot
            src="/screenshots/iphone-calendar.webp"
            alt="Simy Fahrlehrer-App Kalender auf dem iPhone"
            device="phone"
            caption="iPhone"
            :width="390"
            :height="844"
            priority
          />
          <div class="space-y-4">
            <SimyShot
              src="/screenshots/ipad-calendar.webp"
              alt="Simy Kalender auf dem iPad"
              device="tablet"
              caption="iPad"
            />
            <SimyShot
              src="/screenshots/desktop-calendar.webp"
              alt="Simy Kalender auf dem Desktop"
              caption="Desktop"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- App Features -->
    <section class="py-24 px-6 bg-gray-50">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-14">
          <h2 class="text-3xl font-extrabold text-gray-900 mb-4">Was die Simy Fahrlehrer App kann</h2>
        </div>
        <div class="grid md:grid-cols-3 gap-6">
          <div v-for="f in appFeatures" :key="f.title"
            class="bg-white rounded-3xl p-7 border border-gray-100 hover:border-gray-200 hover:-translate-y-1 transition-all group">
            <SimyIconTile :name="f.icon" :size="48" class="mb-5 group-hover:scale-110 transition-transform" />
            <h3 class="font-bold text-gray-900 mb-2">{{ f.title }}</h3>
            <p class="text-sm text-gray-500 leading-relaxed">{{ f.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- vs. other apps comparison -->
    <section class="py-20 px-6">
      <div class="max-w-5xl mx-auto">
        <h2 class="text-3xl font-extrabold text-gray-900 mb-3 text-center">Simy im Direktvergleich</h2>
        <p class="text-sm text-gray-400 text-center mb-10">Vergleich mit den bekanntesten Schweizer Fahrschul-Apps (Stand Juni 2026)</p>
        <div class="overflow-x-auto rounded-2xl border border-gray-100">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100">
                <th class="px-4 py-4 text-left font-bold text-gray-700 min-w-[180px]">Feature</th>
                <th class="px-4 py-4 text-center font-bold min-w-[100px]" style="color: var(--brand-primary)">Simy</th>
                <th class="px-4 py-4 text-center font-bold text-gray-500 min-w-[100px]">Carzi</th>
                <th class="px-4 py-4 text-center font-bold text-gray-500 min-w-[100px]">OrphyDrive</th>
                <th class="px-4 py-4 text-center font-bold text-gray-500 min-w-[100px]">AdminDrive</th>
                <th class="px-4 py-4 text-center font-bold text-gray-500 min-w-[100px]">QualiDrive</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="row in comparison" :key="row.feature" class="hover:bg-gray-50/50">
                <td class="px-4 py-3.5 text-gray-700 font-medium">{{ row.feature }}</td>
                <td class="px-4 py-3.5 text-center">
                  <span v-if="row.simy === true" class="text-green-500 font-bold">✓</span>
                  <span v-else-if="row.simy === false" class="text-red-400">✗</span>
                  <span v-else class="text-xs text-gray-700 font-semibold">{{ row.simy }}</span>
                </td>
                <td class="px-4 py-3.5 text-center">
                  <span v-if="row.carzi === true" class="text-green-500">✓</span>
                  <span v-else-if="row.carzi === false" class="text-red-400">✗</span>
                  <span v-else class="text-xs text-gray-400">{{ row.carzi }}</span>
                </td>
                <td class="px-4 py-3.5 text-center">
                  <span v-if="row.orphy === true" class="text-green-500">✓</span>
                  <span v-else-if="row.orphy === false" class="text-red-400">✗</span>
                  <span v-else class="text-xs text-gray-400">{{ row.orphy }}</span>
                </td>
                <td class="px-4 py-3.5 text-center">
                  <span v-if="row.admin === true" class="text-green-500">✓</span>
                  <span v-else-if="row.admin === false" class="text-red-400">✗</span>
                  <span v-else class="text-xs text-gray-400">{{ row.admin }}</span>
                </td>
                <td class="px-4 py-3.5 text-center">
                  <span v-if="row.quali === true" class="text-green-500">✓</span>
                  <span v-else-if="row.quali === false" class="text-red-400">✗</span>
                  <span v-else class="text-xs text-gray-400">{{ row.quali }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="text-xs text-gray-400 text-center mt-4">Angaben basieren auf öffentlich verfügbaren Informationen der jeweiligen Anbieter (Stand Juni 2026). QualiDrive-Preis: pro neu erfasstem Schüler (einmalig), ohne Setup-Pauschale. Simy-Preise {{ PRICE_VAT_NOTE_SHORT }}.</p>
      </div>
    </section>

    <SimyWebsiteHighlight
      title="App fürs Team — Website für Schüler"
      subtitle="Die Fahrlehrer-App organisiert den Alltag. Die Simy-Website holt neue Schüler über Google. Beides aus einer Hand, Website auch allein."
      preview-host="simy.ch/s/fahrschule-muster"
    />

    <!-- CTA -->
    <section class="py-20 px-6" style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))">
      <div class="max-w-2xl mx-auto text-center">
        <h2 class="text-3xl font-black text-white mb-4">Simy Fahrlehrer-App kostenlos testen</h2>
        <p class="text-white mb-8">30 Tage gratis. Keine Kreditkarte.</p>
        <a :href="registerCta"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white font-black text-lg transition-all hover:opacity-90"
          style="color: var(--brand-primary)">
          Jetzt starten →
        </a>
      </div>
    </section>

    <SimyFooter />
  </div>
</template>

<script setup lang="ts">
import { PRICE_VAT_NOTE_SHORT } from '~/data/pricing'
import { breadcrumbLd, faqPageLd, ldScripts, softwareAppLd } from '~/utils/schema'
const { registerCta } = useRegisterCta('driving_school')

useHead({
  title: 'Fahrlehrer App – Simy | iOS & Android Fahrschulsoftware',
  meta: [
    { name: 'description', content: 'Die Simy Fahrlehrer App für iOS und Android. Kalender, Schüler, Rechnungen auf dem Smartphone. 30 Tage kostenlos testen.' },
    { name: 'keywords', content: 'fahrlehrer app, fahrschulapp, app für fahrschule, fahrlehrer kalender app, fahrschule app' },
    { property: 'og:title', content: 'Fahrlehrer App – Simy | iOS & Android' },
    { property: 'og:description', content: 'Kalender, Schüler und Rechnungen in einer App — iOS und Android.' },
    { property: 'og:url', content: 'https://www.simy.ch/fahrschule/app' },
  ],
  link: [{ rel: 'canonical', href: 'https://www.simy.ch/fahrschule/app' }],
  script: ldScripts(
    softwareAppLd({
      name: 'Simy Fahrlehrer App',
      description: 'Native iOS- und Android-App für Fahrlehrer: Kalender, Schüler, Rechnungen und Push-Benachrichtigungen.',
      url: 'https://www.simy.ch/fahrschule/app',
    }),
    faqPageLd([
      { q: 'Gibt es eine Fahrlehrer-App für iOS und Android?', a: 'Ja. Simy bietet eine native App für iOS und Android mit Kalender, Schülerprofilen und Rechnungen.' },
      { q: 'Funktioniert die App offline?', a: 'Die App synchronisiert mit dem Simy-Backend; Kernfunktionen sind für den Alltag unterwegs optimiert.' },
      { q: 'Kostet die App extra?', a: 'Nein. Die Fahrlehrer-App ist in den Simy-Plänen enthalten — 30 Tage kostenlos testen.' },
    ]),
    breadcrumbLd([
      { name: 'Simy', url: 'https://www.simy.ch/' },
      { name: 'Fahrschule', url: 'https://www.simy.ch/fahrschule' },
      { name: 'Fahrlehrer App', url: 'https://www.simy.ch/fahrschule/app' },
    ]),
  ),
})

const appFeatures = [
  { icon: 'calendar', title: 'Tageskalender & Kalender-Sync', desc: 'Alle Termine des Tages auf einen Blick. Simy-Fahrstunden erscheinen automatisch in Google/Apple/Outlook. Trägst du dort einen privaten Termin ein, sperrt Simy diese Zeit automatisch für Buchungen.' },
  { icon: 'users', title: 'Schülerprofil unterwegs', desc: 'Fahrstunden-History, Notizen, Kontaktdaten — alles griffbereit, immer aktuell.' },
  { icon: 'wallet', title: 'Einnahmen-Übersicht', desc: 'Tages-, Wochen- und Monatseinnahmen auf einen Blick. Offene Rechnungen sofort sichtbar.' },
  { icon: 'bell', title: 'Push-Benachrichtigungen', desc: 'Neue Buchungen, Absagen, Zahlungseingänge — du wirst sofort benachrichtigt.' },
  { icon: 'map-pin', title: 'Navigation aus der App', desc: 'Tippe auf eine Adresse und die Navigation startet direkt. Kein Copy-Paste mehr.' },
  { icon: 'pen', title: 'Fahrstunden dokumentieren', desc: 'Notizen, Fortschritt und Bewertung direkt nach der Fahrstunde — der Schüler sieht denselben Stand im Portal und als PDF.' },
  { icon: 'users', title: 'Schülerportal daneben', desc: 'Deine App ist für den Unterricht. Der Schüler loggt sich getrennt ein — Termine, Guthaben, Dokumente. Kein Store-Zwang.' },
]

const comparison = [
  {
    feature: 'iOS & Android Fahrlehrer-App',
    simy: true, carzi: true, orphy: true, admin: false, quali: 'Nur GeoLoc'
  },
  {
    feature: 'Schüler buchen selbst online',
    simy: true, carzi: 'Mit Bestätigung', orphy: false, admin: false, quali: 'Add-on'
  },
  {
    feature: 'TWINT & Online-Zahlung (CH)',
    simy: true, carzi: true, orphy: false, admin: false, quali: 'Add-on'
  },
  {
    feature: 'Einfache Rechnungsstellung',
    simy: true, carzi: false, orphy: true, admin: 'Add-on', quali: true
  },
  {
    feature: 'Push-Benachrichtigungen',
    simy: true, carzi: true, orphy: false, admin: 'Add-on', quali: false
  },
  {
    feature: 'Privattermine sperren Buchungen automatisch',
    simy: true, carzi: false, orphy: false, admin: false, quali: false
  },
  {
    feature: 'Kostenlose Schüler-App',
    simy: true, carzi: true, orphy: true, admin: 'Add-on', quali: 'Add-on'
  },
  {
    feature: 'Auf Schweizer Servern',
    simy: true, carzi: true, orphy: 'k. A.', admin: true, quali: true
  },
  {
    feature: 'Kostenloser Test',
    simy: '30 Tage', carzi: 'Auf Anfrage', orphy: '30 Tage', admin: 'k. A.', quali: 'k. A.'
  },
  {
    feature: 'Preis / Monat',
    simy: 'Ab CHF 49', carzi: 'Auf Anfrage', orphy: 'Ab CHF 15/User', admin: 'Ab CHF 39.90', quali: 'Ab CHF 12/Schüler'
  },
]
</script>
