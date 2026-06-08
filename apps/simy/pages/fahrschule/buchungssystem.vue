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
          <span class="text-gray-600">Buchungssystem</span>
        </nav>
        <div class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider mb-6 border"
          style="background: rgba(var(--brand-rgb),0.07); color: var(--brand-primary); border-color: rgba(var(--brand-rgb),0.25)">
          Online-Buchungssystem
        </div>
        <h1 class="text-3xl md:text-5xl font-black text-gray-900 mb-6 leading-tight">
          Buchungssystem für Fahrschulen —<br/>
          <span style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
            Termine, die sich selbst organisieren
          </span>
        </h1>
        <p class="text-xl text-gray-500 max-w-2xl mb-10 leading-relaxed">
          Schüler buchen ihren Fahrstunden-Termin selbst — per Link, rund um die Uhr. Du siehst alles in einem übersichtlichen Kalender. Keine WhatsApp-Koordination mehr.
        </p>
        <div class="flex flex-col sm:flex-row gap-4">
          <a href="https://app.simy.ch/tenant-register"
            class="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-white font-bold transition-all hover:opacity-90"
            style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); box-shadow: 0 8px 24px rgba(var(--brand-rgb),0.3)">
            Kostenlos testen →
          </a>
          <a href="#wie-es-funktioniert"
            class="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all">
            Wie es funktioniert
          </a>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section id="wie-es-funktioniert" class="py-24 px-6 bg-gray-50">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-16">
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary)">So einfach geht's</p>
          <h2 class="text-3xl font-extrabold text-gray-900">In 3 Schritten zum papierlosen Buchungssystem</h2>
        </div>
        <div class="grid md:grid-cols-3 gap-8">
          <div v-for="(step, i) in steps" :key="i" class="relative">
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-lg mb-5"
              style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))">{{ i + 1 }}</div>
            <h3 class="font-bold text-gray-900 mb-3 text-lg">{{ step.title }}</h3>
            <p class="text-gray-500 leading-relaxed text-sm">{{ step.desc }}</p>
            <!-- Connector -->
            <div v-if="i < 2" class="hidden md:block absolute top-5 left-[calc(100%+1rem)] w-8 h-0.5 bg-gray-200"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Grid -->
    <section class="py-24 px-6">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-14">
          <h2 class="text-3xl font-extrabold text-gray-900 mb-4">Alles was ein Buchungssystem braucht</h2>
          <p class="text-gray-500 max-w-xl mx-auto">Simy bietet das vollständigste Buchungssystem speziell für Schweizer Fahrschulen.</p>
        </div>
        <div class="grid md:grid-cols-2 gap-6">
          <div v-for="f in bookingFeatures" :key="f.title"
            class="flex gap-5 p-6 rounded-2xl border border-gray-100 hover:border-gray-200 transition-all group">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all group-hover:scale-110"
              style="background: rgba(var(--brand-rgb),0.08)">
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

    <!-- CTA Banner -->
    <section class="py-20 px-6" style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))">
      <div class="max-w-2xl mx-auto text-center">
        <h2 class="text-3xl font-black text-white mb-4">Bereit, Termine zu automatisieren?</h2>
        <p class="text-white mb-8">60 Tage kostenlos. Keine Kreditkarte.</p>
        <a href="https://app.simy.ch/tenant-register"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white font-black text-lg transition-all hover:opacity-90"
          style="color: var(--brand-primary)">
          Jetzt kostenlos starten →
        </a>
      </div>
    </section>

    <SimyFooter />
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Buchungssystem Fahrschule – Online-Terminbuchung | Simy',
  meta: [
    { name: 'description', content: 'Online-Buchungssystem für Fahrschulen: Schüler buchen Fahrstunden selbst. Automatische Bestätigung, Erinnerungen, Kalender-Sync. 60 Tage kostenlos testen.' },
    { name: 'keywords', content: 'buchungssystem fahrschule, online terminbuchung fahrschule, fahrschule online buchen, terminverwaltung fahrschule' },
    { property: 'og:title', content: 'Buchungssystem Fahrschule – Simy | Termine auf Autopilot' },
    { property: 'og:description', content: 'Schüler buchen Fahrstunden selbst. Automatisch bestätigt, erinnert und synchronisiert.' },
    { property: 'og:url', content: 'https://simy.ch/fahrschule/buchungssystem' },
  ],
  link: [{ rel: 'canonical', href: 'https://simy.ch/fahrschule/buchungssystem' }],
})

const steps = [
  { title: 'Verfügbarkeit einrichten', desc: 'Du gibst einmalig deine freien Zeiten ein — oder importierst sie aus deinem Kalender. Danach läuft alles automatisch.' },
  { title: 'Link teilen', desc: 'Du bekommst einen persönlichen Buchungslink. Den teilst du auf deiner Website, per WhatsApp oder in deiner E-Mail-Signatur.' },
  { title: 'Schüler buchen selbst', desc: 'Schüler sehen deine freien Zeiten und buchen direkt. Du bekommst eine Bestätigung — und der Termin ist im Kalender.' },
]

const bookingFeatures = [
  { icon: '🔗', title: 'Persönlicher Buchungslink', desc: 'Jede Fahrschule und jeder Fahrlehrer erhält einen eigenen Buchungslink — direkt teilbar per WhatsApp, QR-Code oder auf der Website.' },
  { icon: '📱', title: 'Funktioniert auf jedem Gerät', desc: 'Schüler buchen auf dem Smartphone, Tablet oder Desktop — ohne App-Download. Direkt im Browser.' },
  { icon: '🔔', title: 'Automatische Erinnerungen', desc: 'Simy sendet 24h vor dem Termin automatisch eine SMS oder E-Mail. Weniger No-Shows, weniger Arbeit für dich.' },
  { icon: '📅', title: 'Zwei-Wege-Kalender-Sync', desc: 'Simy-Termine erscheinen automatisch in deinem Google Calendar, Apple Calendar oder Outlook. Und umgekehrt: Hast du dort einen privaten Termin eingetragen, blockiert Simy diese Zeit automatisch — Schüler können dann genau dort keinen Slot buchen.' },
  { icon: '🔄', title: 'Stornierung & Umbuchung', desc: 'Schüler können Termine selbst absagen oder umbuchen — innerhalb der von dir definierten Fristen.' },
  { icon: '🏫', title: 'Multi-Fahrlehrer', desc: 'Jeder Fahrlehrer hat seinen eigenen Kalender. Die Admin-Ansicht zeigt alle Fahrlehrer auf einen Blick.' },
  { icon: '⚙️', title: 'Regeln & Puffer', desc: 'Du definierst Mindestvorlaufzeiten, Puffer zwischen Terminen und maximale Buchungen pro Tag.' },
  { icon: '📊', title: 'Auslastungs-Statistik', desc: 'Sieh wie ausgelastet jeder Fahrlehrer ist — und optimiere deine Kapazitäten.' },
]
</script>
