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
          <a href="https://app.simy.ch/tenant-register"
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
    <section class="py-20 px-4 overflow-hidden" style="background: linear-gradient(180deg, #faf8ff 0%, #f3f0ff 100%)">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-12">
          <div class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider mb-4 border"
            style="background: rgba(var(--brand-rgb),0.07); color: var(--brand-primary); border-color: rgba(var(--brand-rgb),0.25)">
            Auf jedem Gerät
          </div>
          <h2 class="text-3xl font-extrabold text-gray-900 mb-3">iPhone, iPad & Desktop — immer dabei</h2>
          <p class="text-gray-500 max-w-xl mx-auto text-base">Simy passt sich automatisch an dein Gerät an. Ob auf dem Smartphone zwischen zwei Fahrstunden oder am Computer im Büro — du hast immer alles im Griff.</p>
        </div>

        <!-- Mobile: stacked single device, Desktop: row -->
        <div class="flex flex-col items-center gap-10 md:flex-row md:items-end md:justify-center md:gap-8">

          <!-- iPhone -->
          <div class="flex-shrink-0 w-[160px]">
            <div class="relative rounded-[2.2rem] border-[6px] border-gray-800 shadow-2xl overflow-hidden"
              style="box-shadow: 0 32px 64px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.12)">
              <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[52px] h-[14px] bg-gray-800 rounded-b-xl z-10"></div>
              <div class="bg-white pt-5 pb-4 px-3 space-y-2.5 min-h-[280px]">
                <div class="h-5 rounded-lg w-3/4" :style="{ background: `var(--brand-primary)`, opacity: '0.15' }"></div>
                <div class="grid grid-cols-2 gap-1.5">
                  <div v-for="i in 4" :key="i" class="rounded-xl p-2 space-y-1.5" :style="{ background: `rgba(var(--brand-rgb),0.06)` }">
                    <div class="h-3 rounded w-2/3" :style="{ background: `var(--brand-primary)`, opacity: '0.3' }"></div>
                    <div class="h-5 rounded font-black text-xs flex items-center" :style="{ color: `var(--brand-primary)` }">—</div>
                  </div>
                </div>
                <div class="space-y-1">
                  <div v-for="i in 3" :key="i" class="h-8 rounded-xl flex items-center px-2 gap-2" :style="{ background: i===1 ? `rgba(var(--brand-rgb),0.08)` : '#f9fafb' }">
                    <div class="w-4 h-4 rounded-full flex-shrink-0" :style="{ background: `var(--brand-primary)`, opacity: '0.5' }"></div>
                    <div class="h-2 rounded flex-1" style="background: #e5e7eb"></div>
                  </div>
                </div>
                <div class="h-8 rounded-xl w-full" :style="{ background: `var(--brand-primary)` }"></div>
              </div>
            </div>
            <p class="text-center text-xs text-gray-400 mt-3 font-medium">iPhone</p>
          </div>

          <!-- iPad – only visible md+ -->
          <div class="hidden md:block flex-shrink-0 w-[300px]">
            <div class="relative rounded-[1.8rem] border-[8px] border-gray-800 shadow-2xl overflow-hidden"
              style="box-shadow: 0 40px 80px rgba(var(--brand-rgb),0.18), 0 0 0 1px rgba(0,0,0,0.12)">
              <div class="absolute top-2 left-1/2 -translate-x-1/2 w-[7px] h-[7px] bg-gray-600 rounded-full z-10"></div>
              <div class="bg-white pt-5 pb-4 px-4 flex gap-3 min-h-[220px]">
                <!-- Sidebar -->
                <div class="w-10 flex flex-col gap-2 pt-2">
                  <div v-for="i in 5" :key="i" class="w-8 h-8 rounded-xl" :style="{ background: i===1 ? `var(--brand-primary)` : `rgba(var(--brand-rgb),0.08)` }"></div>
                </div>
                <!-- Content -->
                <div class="flex-1 space-y-2">
                  <div class="h-4 w-1/2 rounded" :style="{ background: `rgba(var(--brand-rgb),0.15)` }"></div>
                  <div class="grid grid-cols-3 gap-2">
                    <div v-for="i in 3" :key="i" class="rounded-xl p-2 space-y-1" :style="{ background: `rgba(var(--brand-rgb),0.06)` }">
                      <div class="h-2 rounded w-2/3" :style="{ background: `var(--brand-primary)`, opacity: '0.3' }"></div>
                      <div class="h-4 rounded w-1/2" style="background: #e5e7eb"></div>
                    </div>
                  </div>
                  <div class="space-y-1.5">
                    <div v-for="i in 4" :key="i" class="h-7 rounded-lg" :style="{ background: i===2 ? `rgba(var(--brand-rgb),0.1)` : '#f3f4f6' }"></div>
                  </div>
                </div>
              </div>
            </div>
            <p class="text-center text-xs text-gray-400 mt-3 font-medium">iPad</p>
          </div>

          <!-- Desktop – hidden on mobile -->
          <div class="hidden md:block flex-shrink-0 w-[340px]">
            <div class="rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden"
              style="box-shadow: 0 32px 60px rgba(0,0,0,0.12)">
              <div class="bg-gray-100 border-b border-gray-200 px-3 py-2 flex items-center gap-2">
                <div class="flex gap-1.5">
                  <div class="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                  <div class="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                  <div class="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                </div>
                <div class="flex-1 bg-white rounded-md px-2.5 py-1 text-[10px] text-gray-400 border border-gray-200 text-center truncate">app.simy.ch</div>
              </div>
              <div class="p-3 flex gap-3 min-h-[200px]">
                <div class="w-10 flex flex-col gap-1.5">
                  <div v-for="i in 6" :key="i" class="w-8 h-6 rounded-lg" :style="{ background: i===1 ? `var(--brand-primary)` : `rgba(var(--brand-rgb),0.07)` }"></div>
                </div>
                <div class="flex-1 space-y-2">
                  <div class="grid grid-cols-7 gap-1">
                    <div v-for="i in 7" :key="i" class="text-center text-[9px] text-gray-400 font-medium">{{ ['Mo','Di','Mi','Do','Fr','Sa','So'][i-1] }}</div>
                  </div>
                  <div class="grid grid-cols-7 gap-1">
                    <div v-for="i in 28" :key="i" class="h-5 rounded text-[9px] flex items-center justify-center"
                      :style="[3,8,15,22].includes(i) ? { background: `var(--brand-primary)`, color: 'white' } : { background: '#f3f4f6', color: '#9ca3af' }">{{ i }}</div>
                  </div>
                </div>
              </div>
            </div>
            <p class="text-center text-xs text-gray-400 mt-3 font-medium">Desktop</p>
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
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-all group-hover:scale-110"
              style="background: rgba(var(--brand-rgb),0.08)">
              <span class="text-2xl">{{ f.icon }}</span>
            </div>
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
        <p class="text-xs text-gray-400 text-center mt-4">Angaben basieren auf öffentlich verfügbaren Informationen der jeweiligen Anbieter (Stand Juni 2026). QualiDrive-Preis: pro neu erfasstem Schüler (einmalig), ohne Setup-Pauschale.</p>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-20 px-6" style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))">
      <div class="max-w-2xl mx-auto text-center">
        <h2 class="text-3xl font-black text-white mb-4">Simy Fahrlehrer-App kostenlos testen</h2>
        <p class="text-white mb-8">60 Tage gratis. Keine Kreditkarte.</p>
        <a href="https://app.simy.ch/tenant-register"
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
useHead({
  title: 'Fahrlehrer App – Simy | iOS & Android Fahrschulsoftware',
  meta: [
    { name: 'description', content: 'Die Simy Fahrlehrer App für iOS und Android. Kalender, Schüler, Rechnungen auf dem Smartphone. 60 Tage kostenlos testen.' },
    { name: 'keywords', content: 'fahrlehrer app, fahrschulapp, app für fahrschule, fahrlehrer kalender app, fahrschule app' },
    { property: 'og:title', content: 'Fahrlehrer App – Simy | iOS & Android' },
    { property: 'og:description', content: 'Kalender, Schüler und Rechnungen in einer App — iOS und Android.' },
    { property: 'og:url', content: 'https://simy.ch/fahrschule/app' },
  ],
  link: [{ rel: 'canonical', href: 'https://simy.ch/fahrschule/app' }],
})

const appFeatures = [
  { icon: '📅', title: 'Tageskalender & Kalender-Sync', desc: 'Alle Termine des Tages auf einen Blick. Simy-Fahrstunden erscheinen automatisch in Google/Apple/Outlook. Trägst du dort einen privaten Termin ein, sperrt Simy diese Zeit automatisch für Buchungen.' },
  { icon: '👤', title: 'Schülerprofil unterwegs', desc: 'Fahrstunden-History, Notizen, Kontaktdaten — alles griffbereit, immer aktuell.' },
  { icon: '💶', title: 'Einnahmen-Übersicht', desc: 'Tages-, Wochen- und Monatseinnahmen auf einen Blick. Offene Rechnungen sofort sichtbar.' },
  { icon: '🔔', title: 'Push-Benachrichtigungen', desc: 'Neue Buchungen, Absagen, Zahlungseingänge — du wirst sofort benachrichtigt.' },
  { icon: '📍', title: 'Navigation aus der App', desc: 'Tippe auf eine Adresse und die Navigation startet direkt. Kein Copy-Paste mehr.' },
  { icon: '✍️', title: 'Fahrstunden dokumentieren', desc: 'Notizen, Fortschritt und Bewertung direkt nach der Fahrstunde eingeben — dauert 30 Sekunden.' },
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
    simy: '60 Tage', carzi: 'Auf Anfrage', orphy: '30 Tage', admin: 'k. A.', quali: 'k. A.'
  },
  {
    feature: 'Preis / Monat',
    simy: 'Ab CHF 49', carzi: 'Auf Anfrage', orphy: 'Ab CHF 15/User', admin: 'Ab CHF 39.90', quali: 'Ab CHF 12/Schüler'
  },
]
</script>
