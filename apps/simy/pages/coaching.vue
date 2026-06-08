<template>
  <div class="min-h-screen bg-white">
    <SimyNav />

    <!-- ── Hero ──────────────────────────────────────────────────────────── -->
    <section class="relative overflow-hidden pt-20 pb-24 px-6">
      <div class="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-purple-50 pointer-events-none"></div>
      <div class="relative max-w-4xl mx-auto text-center">

        <!-- Coming soon badge -->
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6 border"
          style="background: rgba(var(--brand-rgb),0.06); border-color: rgba(var(--brand-rgb),0.15); color: var(--brand-primary);">
          <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          Demnächst verfügbar · Jetzt Frühzugang sichern
        </div>

        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight mb-6">
          Simy für<br>
          <span style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
            Coaches & Trainer & Therapeuten
          </span>
        </h1>

        <p class="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto mb-10">
          Die Software, die Fahrschulen in der Schweiz vertrauen, kommt jetzt für Coaches, Trainer, Berater und Kursanbieter. Weniger Admin, mehr Zeit für deine Klienten.
        </p>

        <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
          <NuxtLink to="/kontakt"
            class="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-white font-bold text-base transition-all hover:opacity-90 hover:shadow-lg"
            style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));">
            Frühzugang anfordern →
          </NuxtLink>
          <NuxtLink to="/preise"
            class="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-base text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
            Preise ansehen
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ── Was ist Simy ──────────────────────────────────────────────────── -->
    <section class="py-20 px-6 bg-white">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-14">
          <h2 class="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">Was ist Simy?</h2>
          <p class="text-lg text-gray-500 max-w-xl mx-auto">
            Simy ist die All-in-One-Plattform für Ausbilder und Kursanbieter. Alles was du brauchst, um Klienten zu verwalten, Termine zu buchen und Rechnungen zu stellen — ohne Papierkram.
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="feature in features" :key="feature.title"
            class="p-6 rounded-2xl border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-4"
              style="background: rgba(var(--brand-rgb),0.08);">
              {{ feature.icon }}
            </div>
            <h3 class="text-base font-bold text-gray-900 mb-2">{{ feature.title }}</h3>
            <p class="text-sm text-gray-500 leading-relaxed">{{ feature.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Für wen ────────────────────────────────────────────────────────── -->
    <section class="py-20 px-6 bg-gray-50">
      <div class="max-w-4xl mx-auto text-center">
        <h2 class="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
          Für wen ist Simy Coaching?
        </h2>
        <p class="text-lg text-gray-500 mb-12 max-w-xl mx-auto">
          Überall dort, wo Einzelpersonen oder Gruppen gecoacht, trainiert oder unterrichtet werden.
        </p>

        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div v-for="use in useCases" :key="use.label"
            class="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-gray-100 hover:border-purple-200 transition-all">
            <span class="text-2xl">{{ use.icon }}</span>
            <span class="text-xs font-semibold text-gray-700 text-center leading-tight">{{ use.label }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Feature Highlights ──────────────────────────────────────────── -->
    <section class="py-20 px-6 bg-white">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-14">
          <h2 class="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            Alles, was du als Coach brauchst
          </h2>
          <p class="text-lg text-gray-500 max-w-xl mx-auto">
            Entwickelt für Ausbilder, die sich auf ihre Arbeit konzentrieren wollen — nicht auf Spreadsheets.
          </p>
        </div>

        <div class="space-y-8">
          <div v-for="(highlight, i) in highlights" :key="highlight.title"
            class="flex flex-col md:flex-row items-center gap-8"
            :class="i % 2 === 1 ? 'md:flex-row-reverse' : ''">
            <!-- Icon panel -->
            <div class="flex-shrink-0 w-full md:w-64 h-48 rounded-2xl flex items-center justify-center text-6xl"
              style="background: linear-gradient(135deg, rgba(var(--brand-rgb),0.06), rgba(139,47,232,0.1));">
              {{ highlight.visual }}
            </div>
            <!-- Text -->
            <div class="flex-1">
              <h3 class="text-xl font-extrabold text-gray-900 mb-3">{{ highlight.title }}</h3>
              <p class="text-gray-500 leading-relaxed mb-4">{{ highlight.desc }}</p>
              <ul class="space-y-2">
                <li v-for="point in highlight.points" :key="point"
                  class="flex items-start gap-2 text-sm text-gray-600">
                  <svg class="w-4 h-4 mt-0.5 flex-shrink-0" style="color: var(--brand-primary);" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                  {{ point }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Social Proof aus Fahrschule ──────────────────────────────────── -->
    <section class="py-16 px-6 bg-gray-50">
      <div class="max-w-3xl mx-auto text-center">
        <p class="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6">Bereits bewährt bei Fahrschulen</p>
        <div class="flex flex-wrap items-center justify-center gap-6 mb-8">
          <div v-for="stat in stats" :key="stat.value"
            class="flex flex-col items-center">
            <span class="text-3xl font-extrabold text-gray-900">{{ stat.value }}</span>
            <span class="text-sm text-gray-500 mt-1">{{ stat.label }}</span>
          </div>
        </div>
        <p class="text-gray-500 text-sm">
          Simy wird heute von Fahrschulen in der ganzen Schweiz eingesetzt. Dieselbe bewährte Plattform kommt demnächst für Coaches und Trainer.
        </p>
      </div>
    </section>

    <!-- ── CTA / Early Access ────────────────────────────────────────────── -->
    <section class="py-24 px-6">
      <div class="max-w-2xl mx-auto text-center">
        <div class="rounded-3xl p-10 sm:p-14 text-white relative overflow-hidden"
          style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));">
          <div class="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 -translate-y-1/2 translate-x-1/3"
            style="background: white;"></div>

          <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-white/20 mb-6">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse"></span>
            Bald verfügbar
          </div>

          <h2 class="text-3xl sm:text-4xl font-extrabold mb-4 leading-tight">
            Sei unter den Ersten
          </h2>
          <p class="text-white/80 text-lg mb-8 leading-relaxed">
            Trag dich jetzt ein und erhalte exklusiven Frühzugang zum günstigsten Einführungspreis — bevor Simy Coaching offiziell lanciert wird.
          </p>

          <NuxtLink to="/kontakt"
            class="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white font-bold text-base transition-all hover:shadow-xl hover:scale-105"
            style="color: var(--brand-primary);">
            Frühzugang anfordern →
          </NuxtLink>

          <p class="mt-6 text-white/60 text-sm">Kein Spam. Wir melden uns persönlich.</p>
        </div>
      </div>
    </section>

    <SimyFooter />
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Simy für Coaches – Buchung, Abrechnung & Wachstum | Demnächst',
  meta: [
    { name: 'description', content: 'Simy kommt für Coaches, Trainer und Berater. Online-Buchung, Abrechnung, Kundenverwaltung und deine eigene gebrandete App – alles in einem. Jetzt Frühzugang sichern.' },
    { name: 'robots', content: 'index, follow' },
    { property: 'og:title', content: 'Simy für Coaches – demnächst' },
    { property: 'og:description', content: 'Online-Buchung, Abrechnung und Kundenverwaltung für Coaches und Trainer. Powered by Simy.' },
    { property: 'og:type', content: 'website' },
  ],
  link: [{ rel: 'canonical', href: 'https://simy.ch/coaching' }],
})

const features = [
  { icon: '📅', title: 'Online-Buchungssystem', desc: 'Klienten buchen Termine direkt über deine Buchungsseite — 24/7, ohne hin und her schreiben.' },
  { icon: '💶', title: 'Rechnungen & Zahlungen', desc: 'Rechnungen automatisch erstellen und per TWINT, Karte oder Überweisung inkassieren.' },
  { icon: '👥', title: 'Kundenverwaltung', desc: 'Alle Klienten, Termine und Notizen an einem Ort. Kein Excel mehr.' },
  { icon: '📱', title: 'Deine eigene gebrandete App', desc: 'Klienten laden deine App mit deinem Logo, deinen Farben. Professionell von Tag 1.' },
  { icon: '🤖', title: 'Automatische Erinnerungen', desc: 'Buchungsbestätigungen und Terminerinnerungen laufen automatisch — du musst nichts tun.' },
  { icon: '📊', title: 'Umsatz & Statistiken', desc: 'Sieh auf einen Blick wie viel du diesen Monat verdient hast und welche Angebote laufen.' },
]

const useCases = [
  { icon: '🧠', label: 'Business Coaches' },
  { icon: '🏃', label: 'Fitness & Personal Trainer' },
  { icon: '🎵', label: 'Musik & Gesangslehrer' },
  { icon: '📸', label: 'Fotografie-Coaches' },
  { icon: '🧘', label: 'Yoga & Wellness' },
  { icon: '🗣️', label: 'Sprach-Coaches' },
  { icon: '💼', label: 'Karriere-Berater' },
  { icon: '🎨', label: 'Kreativ-Workshops' },
  { icon: '⚽', label: 'Sport-Trainer' },
  { icon: '🧒', label: 'Nachhilfe & Tutoren' },
  { icon: '🍎', label: 'Ernährungsberater' },
  { icon: '💡', label: 'Life Coaches' },
]

const highlights = [
  {
    visual: '📅',
    title: 'Deine Buchungsseite — immer offen',
    desc: 'Klienten wählen Datum und Uhrzeit selbst. Keine Telefonate, keine langen E-Mail-Verläufe. Dein Kalender füllt sich automatisch.',
    points: ['Echtzeit-Verfügbarkeit', 'Automatische Bestätigung per E-Mail & SMS', 'Individuelle Session-Typen und Preise'],
  },
  {
    visual: '💶',
    title: 'Rechnungen auf Knopfdruck',
    desc: 'Nach der Session wird die Rechnung automatisch erstellt. TWINT, Kreditkarte oder Rechnung — du entscheidest, wie deine Klienten zahlen.',
    points: ['TWINT & Kreditkarte integriert', 'Automatische Zahlungserinnerungen bei Online-Zahlung', 'Monatliche Auswertung auf einen Blick'],
  },
  {
    visual: '📱',
    title: 'Deine eigene App — in deinen Farben',
    desc: 'Mit Simy bekommst du eine White-Label-App, die deine Klienten aus dem App Store herunterladen können. Mit deinem Logo, deinen Farben.',
    points: ['iOS & Android', 'Push-Benachrichtigungen', 'Buchung, Bezahlung und Kommunikation in einer App'],
  },
]

const stats = [
  { value: '500+', label: 'Fahrlehrer in der Schweiz' },
  { value: '50 000+', label: 'Buchungen pro Monat' },
  { value: '4.9/5', label: 'Kundenbewertung' },
  { value: 'CHF 0', label: 'Einrichtungskosten' },
]
</script>
