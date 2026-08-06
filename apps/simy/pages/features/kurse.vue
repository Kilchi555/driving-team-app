<template>
  <div class="min-h-screen bg-white font-sans">
    <SimyNav />

    <section class="pt-20 pb-24 px-6 relative overflow-hidden">
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full opacity-[0.06]"
          style="background: radial-gradient(circle, var(--brand-primary), transparent)"></div>
      </div>
      <div class="relative max-w-4xl mx-auto">
        <nav class="flex items-center gap-2 text-xs text-gray-400 mb-8">
          <a href="/" class="hover:text-gray-600">Simy</a><span>›</span>
          <span class="hover:text-gray-600">Features</span><span>›</span>
          <span class="text-gray-600">Kursbuchungsseite</span>
        </nav>
        <div class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider mb-6 border"
          style="background: rgba(var(--brand-rgb),0.07); color: var(--brand-primary); border-color: rgba(var(--brand-rgb),0.25)">
          Feature — Kurse
        </div>
        <h1 class="text-3xl md:text-5xl font-black text-gray-900 mb-6 leading-tight">
          Kursbuchungsseite —<br/>
          <span style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
            Gruppenkurse online verkaufen
          </span>
        </h1>
        <p class="text-xl text-gray-500 max-w-2xl mb-10 leading-relaxed">
          Theorie, Welpenkurs, Intensivwoche oder Workshop: Kunden melden sich selbst an, zahlen online — du behältst Plätze, Warteliste und Rechnung im Griff.
        </p>
        <div class="flex flex-col sm:flex-row gap-4">
          <a :href="registerCta"
            class="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-white font-bold transition-all hover:opacity-90"
            style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); box-shadow: 0 8px 24px rgba(var(--brand-rgb),0.3)">
            Kostenlos testen →
          </a>
          <a href="/preise"
            class="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl font-bold border-2 transition-all hover:bg-gray-50"
            style="border-color: rgba(var(--brand-rgb),0.3); color: var(--brand-primary)">
            Pläne ansehen
          </a>
        </div>
      </div>
    </section>

    <!-- Mock course card -->
    <section class="py-10 px-6 bg-gray-50 border-y border-gray-100">
      <div class="max-w-lg mx-auto">
        <div class="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-widest" style="color: var(--brand-primary)">Kursseite</span>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full text-white" style="background: var(--brand-primary)">4 Plätze frei</span>
          </div>
          <div class="p-6">
            <h3 class="text-lg font-black text-gray-900 mb-1">VKU / Theoriekurs</h3>
            <p class="text-sm text-gray-500 mb-4">Samstag, 10:00–16:00 · Zürich</p>
            <div class="rounded-xl p-4 mb-4" style="background: rgba(var(--brand-rgb),0.06)">
              <div class="flex justify-between text-sm mb-2">
                <span class="text-gray-500">Teilnehmer</span>
                <span class="font-bold text-gray-900">8 / 12</span>
              </div>
              <div class="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div class="h-full rounded-full" style="width: 66%; background: var(--brand-primary)"></div>
              </div>
            </div>
            <div class="flex items-center justify-between mb-5">
              <span class="text-2xl font-black" style="color: var(--brand-primary)">CHF 180.–</span>
              <span class="text-xs text-gray-400">inkl. Unterlagen</span>
            </div>
            <button class="w-full py-3 rounded-xl text-white text-sm font-bold" style="background: var(--brand-primary)">
              Jetzt anmelden →
            </button>
          </div>
        </div>
        <p class="text-xs text-center text-gray-400 mt-3">Eigener Link, dein Branding — Kunden buchen und zahlen online</p>
      </div>
    </section>

    <section class="py-24 px-6">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-14">
          <h2 class="text-3xl font-extrabold text-gray-900 mb-4">Was die Kursbuchungsseite kann</h2>
          <p class="text-gray-500 max-w-xl mx-auto">Ideal für Fahrschulen, Hundeschulen, Musikschulen, Nachhilfe und alle, die Gruppenformate neben Einzelterminen anbieten.</p>
        </div>
        <div class="grid md:grid-cols-2 gap-6">
          <div v-for="f in courseFeatures" :key="f.title"
            class="flex gap-5 p-6 rounded-2xl border border-gray-100 hover:border-gray-200 transition-all group">
            <SimyIconTile :name="f.icon" :size="44" class="group-hover:scale-110 transition-transform" />
            <div>
              <h3 class="font-bold text-gray-900 mb-1">{{ f.title }}</h3>
              <p class="text-sm text-gray-500 leading-relaxed">{{ f.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="py-16 px-6 bg-gray-50 border-y border-gray-100">
      <div class="max-w-4xl mx-auto">
        <h2 class="text-2xl font-extrabold text-gray-900 mb-8 text-center">Für diese Branchen besonders stark</h2>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <a v-for="b in branchenLinks" :key="b.href" :href="b.href"
            class="rounded-2xl border border-gray-100 bg-white p-5 hover:border-gray-200 transition-all">
            <SimyIconTile :name="b.icon" :size="40" class="mb-3" rounded="xl" />
            <p class="font-bold text-gray-900 text-sm mb-1">{{ b.label }}</p>
            <p class="text-xs text-gray-500 leading-relaxed">{{ b.desc }}</p>
          </a>
        </div>
      </div>
    </section>

    <section class="py-20 px-6" style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))">
      <div class="max-w-xl mx-auto text-center">
        <h2 class="text-3xl font-black text-white mb-4">Kurse und Termine in einer Plattform</h2>
        <p class="text-white/80 mb-8">Im Pro-Plan inklusive. 30 Tage kostenlos testen — keine Kreditkarte.</p>
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
import { VERTICAL_ICON_BY_SLUG } from '~/utils/icons'
import { breadcrumbLd, ldScripts, softwareAppLd, webPageLd } from '~/utils/schema'
const { registerCta } = useRegisterCta()

useHead({
  title: 'Kursbuchungsseite – Gruppenkurse online verkaufen | Simy',
  meta: [
    { name: 'description', content: 'Kursbuchungsseite für Schweizer Dienstleister: Plätze, Anmeldung, Online-Zahlung und Warteliste. Ideal für Fahrschule, Hundeschule, Musikschule und Nachhilfe. 30 Tage gratis.' },
    { name: 'keywords', content: 'kursbuchungsseite, kursverwaltung software, gruppenkurs buchen, online kursanmeldung schweiz, welpenkurs software, theoriekurs buchung' },
    { property: 'og:title', content: 'Kursbuchungsseite – Gruppenkurse online verkaufen | Simy' },
    { property: 'og:description', content: 'Kunden melden sich selbst zu Kursen an und zahlen online — Plätze und Rechnung unter Kontrolle.' },
    { property: 'og:url', content: 'https://simy.ch/features/kurse' },
  ],
  link: [{ rel: 'canonical', href: 'https://simy.ch/features/kurse' }],
  script: ldScripts(
    softwareAppLd({
      name: 'Simy Kursbuchungsseite',
      description: 'Online-Anmeldung und Zahlung für Gruppenkurse in der Schweiz.',
      url: 'https://simy.ch/features/kurse',
    }),
    webPageLd({
      name: 'Kursbuchungsseite',
      description: 'Gruppenkurse online verkaufen mit Simy.',
      url: 'https://simy.ch/features/kurse',
    }),
    breadcrumbLd([
      { name: 'Simy', url: 'https://simy.ch/' },
      { name: 'Features', url: 'https://simy.ch/features/kalender' },
      { name: 'Kurse', url: 'https://simy.ch/features/kurse' },
    ]),
  ),
})

const courseFeatures = [
  { icon: 'school', title: 'Eigene Kursseite', desc: 'Öffentlicher Link mit Branding — Kunden sehen Datum, Ort, Preis und freie Plätze.' },
  { icon: 'users', title: 'Platzkontingente', desc: 'Maximale Teilnehmerzahl, Restplätze live — keine Überbuchung per WhatsApp.' },
  { icon: 'credit-card', title: 'Online-Zahlung', desc: 'Anmeldung mit TWINT, Karte oder QR-Rechnung — je nach Plan und Setup.' },
  { icon: 'clipboard', title: 'Warteliste', desc: 'Wenn der Kurs voll ist, landen Interessenten auf der Warteliste statt im Chat.' },
  { icon: 'calendar', title: 'Neben Einzelterminen', desc: '1:1-Buchung und Gruppenkurse in derselben All-in-One Software.' },
  { icon: 'bell', title: 'Erinnerungen', desc: 'Automatische Bestätigung und Reminder an Teilnehmer — weniger No-Shows.' },
]

const branchenLinks = [
  { href: '/fahrschule', label: 'Fahrschule', icon: VERTICAL_ICON_BY_SLUG.fahrschule, desc: 'Theorie, VKU, Nothelfer — Kurse neben Fahrstunden.' },
  { href: '/hundeschule', label: 'Hundeschule', icon: VERTICAL_ICON_BY_SLUG.hundeschule, desc: 'Welpenkurse und Gruppen mit Platzlimit.' },
  { href: '/musikschule', label: 'Musikschule', icon: VERTICAL_ICON_BY_SLUG.musikschule, desc: 'Gruppenunterricht neben Einzelstunden.' },
  { href: '/nachhilfe', label: 'Nachhilfe', icon: VERTICAL_ICON_BY_SLUG.nachhilfe, desc: 'Intensivwochen und Gruppenkurse.' },
  { href: '/personal-training', label: 'Personal Training', icon: VERTICAL_ICON_BY_SLUG['personal-training'], desc: 'Optional: Bootcamps und Kleingruppen.' },
  { href: '/coaching', label: 'Coaching', icon: VERTICAL_ICON_BY_SLUG.coaching, desc: 'Optional: Workshops neben 1:1-Sitzungen.' },
]
</script>
