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
          <a href="/" class="hover:text-gray-600">simy</a><span>›</span>
          <span class="hover:text-gray-600">Features</span><span>›</span>
          <span class="text-gray-600">Kalender & Planung</span>
        </nav>
        <div class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider mb-6 border"
          style="background: rgba(96,0,189,0.07); color: #6000BD; border-color: rgba(96,0,189,0.25)">
          Feature — Kalender
        </div>
        <h1 class="text-5xl font-black text-gray-900 mb-6 leading-tight">
          Kalender & Planung —<br/>
          <span style="background: linear-gradient(135deg, #6000BD, #8B2FE8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
            Dein Stundenplan auf Autopilot
          </span>
        </h1>
        <p class="text-xl text-gray-500 max-w-2xl mb-10 leading-relaxed">
          Immer aktuell, automatisch synchronisiert. simy zeigt dir und deinen Schülern genau, wann wer wo fährt — ohne manuelles Pflegen.
        </p>
        <div class="flex flex-col sm:flex-row gap-4">
          <a href="https://app.simy.ch/tenant-register"
            class="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-white font-bold transition-all hover:opacity-90"
            style="background: linear-gradient(135deg, #6000BD, #8B2FE8); box-shadow: 0 8px 24px rgba(96,0,189,0.3)">
            Kostenlos testen →
          </a>
        </div>
      </div>
    </section>

    <!-- Calendar UI mockup -->
    <section class="py-10 px-6 bg-gray-50 border-y border-gray-100">
      <div class="max-w-2xl mx-auto">
        <div class="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
          <!-- Mockup header -->
          <div class="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-red-400"></div>
              <div class="w-2 h-2 rounded-full bg-yellow-400"></div>
              <div class="w-2 h-2 rounded-full bg-green-400"></div>
            </div>
            <span class="text-xs text-gray-400 font-medium">simy — Kalender</span>
            <div></div>
          </div>
          <!-- Weekday header -->
          <div class="grid grid-cols-5 text-center border-b border-gray-50">
            <div v-for="day in days" :key="day.label"
              class="py-2 text-xs font-bold"
              :class="day.today ? 'text-white' : 'text-gray-400'"
              :style="day.today ? 'background: rgba(96,0,189,0.08)' : ''">
              <div>{{ day.label }}</div>
              <div class="text-lg font-black" :style="day.today ? 'color: #6000BD' : 'color: #374151'">{{ day.num }}</div>
            </div>
          </div>
          <!-- Time slots -->
          <div class="grid grid-cols-5 divide-x divide-gray-50">
            <div v-for="(col, ci) in calendarSlots" :key="ci" class="space-y-1 p-1.5">
              <div v-for="slot in col" :key="slot.time"
                class="rounded-lg px-2 py-1.5 text-xs"
                :class="slot.empty ? 'bg-gray-50' : ''"
                :style="slot.empty ? '' : `background: ${slot.color}15; border-left: 3px solid ${slot.color}`">
                <div v-if="!slot.empty">
                  <div class="font-bold" :style="`color: ${slot.color}`">{{ slot.time }}</div>
                  <div class="text-gray-600 truncate">{{ slot.name }}</div>
                </div>
                <div v-else class="text-gray-300 text-center py-0.5">·</div>
              </div>
            </div>
          </div>
        </div>
        <p class="text-xs text-center text-gray-400 mt-3">Alle Fahrlehrer auf einen Blick — live synchronisiert</p>
      </div>
    </section>

    <!-- Features -->
    <section class="py-24 px-6">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-14">
          <h2 class="text-3xl font-extrabold text-gray-900 mb-4">Alles was der Kalender kann</h2>
        </div>
        <div class="grid md:grid-cols-2 gap-6">
          <div v-for="f in calFeatures" :key="f.title"
            class="flex gap-5 p-6 rounded-2xl border border-gray-100 hover:border-purple-100 transition-all group">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-all"
              style="background: rgba(96,0,189,0.08)">
              <span class="text-xl">{{ f.icon }}</span>
            </div>
            <div>
              <h3 class="font-bold text-gray-900 mb-1">{{ f.title }}</h3>
              <p class="text-sm text-gray-500 leading-relaxed">{{ f.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-20 px-6" style="background: linear-gradient(135deg, #6000BD, #8B2FE8)">
      <div class="max-w-xl mx-auto text-center">
        <h2 class="text-3xl font-black text-white mb-4">Den Kalender heute noch ausprobieren</h2>
        <p class="text-purple-200 mb-8">60 Tage kostenlos — kein Kreditkarte.</p>
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
  title: 'Kalender & Terminplanung – simy | Fahrlehrer Kalender App',
  meta: [
    { name: 'description', content: 'Der simy Kalender synchronisiert alle Fahrlehrer automatisch. Online-Buchung, iCal-Sync, Push-Benachrichtigungen. Für iOS, Android und Browser. 60 Tage kostenlos.' },
    { name: 'keywords', content: 'fahrlehrer kalender app, fahrschule kalender, terminplanung fahrschule' },
    { property: 'og:title', content: 'Kalender & Terminplanung – simy | Stundenplan auf Autopilot' },
    { property: 'og:description', content: 'Multi-Fahrlehrer Kalender, iCal-Sync, automatische Erinnerungen. Alles synchronisiert.' },
    { property: 'og:url', content: 'https://simy.ch/features/kalender' },
  ],
  link: [{ rel: 'canonical', href: 'https://simy.ch/features/kalender' }],
})

const days = [
  { label: 'Mo', num: '19', today: false },
  { label: 'Di', num: '20', today: false },
  { label: 'Mi', num: '21', today: true },
  { label: 'Do', num: '22', today: false },
  { label: 'Fr', num: '23', today: false },
]

const calendarSlots = [
  [
    { time: '08:00', name: 'Marc H.', color: '#6000BD', empty: false },
    { empty: true },
    { time: '14:00', name: 'Lena K.', color: '#6000BD', empty: false },
  ],
  [
    { empty: true },
    { time: '10:00', name: 'Tom B.', color: '#059669', empty: false },
    { time: '15:00', name: 'Prüfung', color: '#DC2626', empty: false },
  ],
  [
    { time: '09:00', name: 'Lisa M.', color: '#0891B2', empty: false },
    { time: '11:00', name: 'VKU', color: '#EA580C', empty: false },
    { empty: true },
  ],
  [
    { time: '08:00', name: 'Jan F.', color: '#6000BD', empty: false },
    { empty: true },
    { time: '16:00', name: 'Anna S.', color: '#6000BD', empty: false },
  ],
  [
    { empty: true },
    { time: '10:30', name: 'Nils P.', color: '#059669', empty: false },
    { time: '14:00', name: 'Rita Z.', color: '#059669', empty: false },
  ],
]

const calFeatures = [
  { icon: '🔄', title: 'Echtzeit-Synchronisation', desc: 'Änderungen sind sofort sichtbar — für dich, alle Fahrlehrer und deine Schüler.' },
  { icon: '📲', title: 'Simy-Termine im privaten Kalender', desc: 'Jede Fahrstunde erscheint automatisch in deinem Google Calendar, Apple Calendar oder Outlook. Du siehst deinen ganzen Tag in einer App — ohne manuelles Übertragen.' },
  { icon: '🪄', title: 'Privatkalender blockiert Verfügbarkeit automatisch', desc: 'Du hast Zahnarzt, Ferien oder einen privaten Termin im Kalender? Simy erkennt das und zeigt Schülern in dieser Zeit gar keine freien Slots an. Du musst nichts extra einstellen — dein Kalender erledigt das für dich.' },
  { icon: '👥', title: 'Multi-Fahrlehrer Ansicht', desc: 'Alle Fahrlehrer auf einem Bildschirm — perfekt für den Überblick als Schulinhaber.' },
  { icon: '🎨', title: 'Farbcodierung', desc: 'Verschiedene Kategorien (Fahrstunde, VKU, Prüfung) in verschiedenen Farben.' },
  { icon: '📍', title: 'Standort-Info', desc: 'Treffpunkt direkt im Termin — ein Klick öffnet die Navigation.' },
  { icon: '🔔', title: 'Automatische Erinnerungen', desc: '24h vor jedem Termin: Schüler bekommt eine SMS oder E-Mail-Erinnerung.' },
  { icon: '🔒', title: 'Verfügbarkeits-Regeln', desc: 'Definiere Pufferzeit, maximale Tages-Buchungen und Vorlaufzeit pro Fahrlehrer.' },
  { icon: '📊', title: 'Auslastungs-Ansicht', desc: 'Sieh auf einen Blick, welcher Fahrlehrer wann noch freie Kapazität hat.' },
]
</script>
