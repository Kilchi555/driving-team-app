<template>
  <div class="min-h-screen bg-white font-sans">
    <SimyNav />

    <!-- Hero -->
    <section class="pt-20 pb-24 px-6 relative overflow-hidden">
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full opacity-[0.06]"
          style="background: radial-gradient(circle, #6000BD, transparent)"></div>
      </div>
      <div class="relative max-w-4xl mx-auto">
        <nav class="flex items-center gap-2 text-xs text-gray-400 mb-8">
          <a href="/" class="hover:text-gray-600">Simy</a><span>›</span>
          <a href="/fahrschule" class="hover:text-gray-600">Fahrschule</a><span>›</span>
          <span class="text-gray-600">Fahrlehrer App</span>
        </nav>
        <div class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider mb-6 border"
          style="background: rgba(96,0,189,0.07); color: #6000BD; border-color: rgba(96,0,189,0.25)">
          Fahrlehrer App
        </div>
        <h1 class="text-5xl font-black text-gray-900 mb-6 leading-tight">
          Die Fahrlehrer App, die<br/>
          <span style="background: linear-gradient(135deg, #6000BD, #8B2FE8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
            wirklich an alles denkt.
          </span>
        </h1>
        <p class="text-xl text-gray-500 max-w-2xl mb-10 leading-relaxed">
          Kalender, Schülerliste, Erinnerungen, Ausbildungsplan, Online-Zahlung und Terminbuchung — alles auf deinem Smartphone. Simy läuft auf iOS und Android.
        </p>
        <div class="flex flex-col sm:flex-row gap-4">
          <a href="https://app.simy.ch/tenant-register"
            class="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-white font-bold transition-all hover:opacity-90"
            style="background: linear-gradient(135deg, #6000BD, #8B2FE8); box-shadow: 0 8px 24px rgba(96,0,189,0.3)">
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

    <!-- App Features -->
    <section class="py-24 px-6 bg-gray-50">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-14">
          <h2 class="text-3xl font-extrabold text-gray-900 mb-4">Was die Simy Fahrlehrer App kann</h2>
        </div>
        <div class="grid md:grid-cols-3 gap-6">
          <div v-for="f in appFeatures" :key="f.title"
            class="bg-white rounded-3xl p-7 border border-gray-100 hover:border-purple-100 hover:-translate-y-1 transition-all group">
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-all group-hover:scale-110"
              style="background: rgba(96,0,189,0.08)">
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
                <th class="px-4 py-4 text-center font-bold min-w-[110px]" style="color: #6000BD">Simy</th>
                <th class="px-4 py-4 text-center font-bold text-gray-500 min-w-[110px]">Carzi</th>
                <th class="px-4 py-4 text-center font-bold text-gray-500 min-w-[110px]">OrphyDrive</th>
                <th class="px-4 py-4 text-center font-bold text-gray-500 min-w-[110px]">AdminDrive</th>
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
              </tr>
            </tbody>
          </table>
        </div>
        <p class="text-xs text-gray-400 text-center mt-4">Angaben basieren auf öffentlich verfügbaren Informationen der jeweiligen Anbieter.</p>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-20 px-6" style="background: linear-gradient(135deg, #6000BD, #8B2FE8)">
      <div class="max-w-2xl mx-auto text-center">
        <h2 class="text-3xl font-black text-white mb-4">simy Fahrlehrer-App kostenlos testen</h2>
        <p class="text-purple-200 mb-8">60 Tage gratis. Kein Kreditkarte.</p>
        <a href="https://app.simy.ch/tenant-register"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white font-black text-lg transition-all hover:opacity-90"
          style="color: #6000BD">
          Jetzt starten →
        </a>
      </div>
    </section>

    <SimyFooter />
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Fahrlehrer App – simy | iOS & Android Fahrschulsoftware',
  meta: [
    { name: 'description', content: 'Die simy Fahrlehrer App für iOS und Android. Kalender, Schüler, Rechnungen auf dem Smartphone. 60 Tage kostenlos testen.' },
    { name: 'keywords', content: 'fahrlehrer app, fahrschulapp, app für fahrschule, fahrlehrer kalender app, fahrschule app' },
    { property: 'og:title', content: 'Fahrlehrer App – simy | iOS & Android' },
    { property: 'og:description', content: 'Kalender, Schüler und Rechnungen in einer App — iOS und Android.' },
    { property: 'og:url', content: 'https://simy.ch/fahrschule/app' },
  ],
  link: [{ rel: 'canonical', href: 'https://simy.ch/fahrschule/app' }],
})

const appFeatures = [
  { icon: '📅', title: 'Tageskalender', desc: 'Alle Termine des Tages auf einen Blick. Schülername, Uhrzeit, Standort — alles direkt sichtbar.' },
  { icon: '👤', title: 'Schülerprofil unterwegs', desc: 'Fahrstunden-History, Notizen, Kontaktdaten — alles griffbereit, immer aktuell.' },
  { icon: '💶', title: 'Einnahmen-Übersicht', desc: 'Tages-, Wochen- und Monatseinnahmen auf einen Blick. Offene Rechnungen sofort sichtbar.' },
  { icon: '🔔', title: 'Push-Benachrichtigungen', desc: 'Neue Buchungen, Absagen, Zahlungseingänge — du wirst sofort benachrichtigt.' },
  { icon: '📍', title: 'Navigation aus der App', desc: 'Tippe auf eine Adresse und die Navigation startet direkt. Kein Copy-Paste mehr.' },
  { icon: '✍️', title: 'Fahrstunden dokumentieren', desc: 'Notizen, Fortschritt und Bewertung direkt nach der Fahrstunde eingeben — dauert 30 Sekunden.' },
]

const comparison = [
  {
    feature: 'iOS & Android Fahrlehrer-App',
    simy: true, carzi: true, orphy: true, admin: false
  },
  {
    feature: 'Schüler buchen selbst online',
    simy: true, carzi: 'Mit Bestätigung', orphy: false, admin: false
  },
  {
    feature: 'TWINT & Online-Zahlung (CH)',
    simy: true, carzi: true, orphy: false, admin: false
  },
  {
    feature: 'Automatische Rechnungen',
    simy: true, carzi: 'Teilweise', orphy: true, admin: 'Add-on'
  },
  {
    feature: 'Push-Benachrichtigungen',
    simy: true, carzi: 'SMS', orphy: false, admin: 'Add-on'
  },
  {
    feature: 'Kostenlose Schüler-App',
    simy: true, carzi: true, orphy: true, admin: 'Add-on'
  },
  {
    feature: 'Auf Schweizer Servern',
    simy: true, carzi: true, orphy: 'k. A.', admin: true
  },
  {
    feature: 'Kostenloser Test',
    simy: '60 Tage', carzi: 'Auf Anfrage', orphy: '30 Tage', admin: 'k. A.'
  },
  {
    feature: 'Preis / Monat',
    simy: 'Ab CHF 49', carzi: 'Auf Anfrage', orphy: 'Ab CHF 15/User', admin: 'Ab CHF 39.90'
  },
]
</script>
