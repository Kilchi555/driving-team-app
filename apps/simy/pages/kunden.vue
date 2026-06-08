<template>
  <div class="min-h-screen bg-white font-sans">
    <SimyNav />

    <!-- Hero -->
    <section class="pt-20 pb-20 px-6 text-center relative overflow-hidden">
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[500px] rounded-full opacity-[0.05]"
          style="background: radial-gradient(circle, var(--brand-primary), transparent)"></div>
      </div>
      <div class="relative max-w-3xl mx-auto">
        <div class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider mb-6 border"
          style="background: rgba(var(--brand-rgb),0.07); color: var(--brand-primary); border-color: rgba(var(--brand-rgb),0.25)">
          Kundenstories
        </div>
        <h1 class="text-3xl md:text-5xl font-black text-gray-900 mb-5 leading-tight">Was unsere Kunden sagen</h1>
        <p class="text-xl text-gray-500 max-w-xl mx-auto">Echte Fahrschulen. Echte Zahlen. Echte Ergebnisse.</p>
      </div>
    </section>

    <!-- Stats band -->
    <section class="py-12 px-6 border-y border-gray-100 bg-gray-50">
      <div class="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        <div v-for="s in stats" :key="s.label" class="text-center">
          <div class="text-4xl font-black mb-1" style="color: var(--brand-primary)">{{ s.value }}</div>
          <div class="text-sm text-gray-500">{{ s.label }}</div>
        </div>
      </div>
    </section>

    <!-- Featured story -->
    <section class="py-20 px-6">
      <div class="max-w-4xl mx-auto">
        <div class="rounded-3xl p-10 md:p-14 border border-purple-100 relative overflow-hidden"
          style="background: linear-gradient(135deg, rgba(var(--brand-rgb),0.04), rgba(var(--brand-2-rgb),0.06))">
          <div class="absolute top-0 right-0 text-[180px] font-black opacity-[0.04] leading-none select-none pointer-events-none" style="color: var(--brand-primary)">"</div>
          <div class="relative">
            <div class="flex gap-1 mb-5">
              <svg v-for="i in 5" :key="i" class="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
            </div>
            <blockquote class="text-2xl font-bold text-gray-900 leading-relaxed mb-6">
              "Simy hat unsere gesamte Administration digitalisiert. Wir sparen täglich über 2 Stunden — das sind <span style="color: var(--brand-primary)">40+ Fahrstunden pro Monat</span>, die wir früher mit Papierkram verloren haben."
            </blockquote>
            <div class="grid md:grid-cols-3 gap-4 mb-8">
              <div v-for="m in drivingTeamMetrics" :key="m.label" class="rounded-xl p-4 bg-white border border-gray-100 text-center">
                <div class="text-2xl font-black" style="color: var(--brand-primary)">{{ m.value }}</div>
                <div class="text-xs text-gray-500 mt-1">{{ m.label }}</div>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-lg"
                style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))">P</div>
              <div>
                <p class="font-bold text-gray-900">Pascal Kilchenmann</p>
                <p class="text-sm text-gray-400">Driving Team, Zürich — 3 Standorte, 4 Fahrlehrer</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Testimonial grid -->
    <section class="py-10 pb-24 px-6">
      <div class="max-w-5xl mx-auto">
        <div class="grid md:grid-cols-2 gap-6">
          <div v-for="t in testimonials" :key="t.name"
            class="rounded-2xl p-7 border border-gray-100 bg-white hover:border-purple-100 hover:-translate-y-0.5 transition-all">
            <div class="flex gap-1 mb-4">
              <svg v-for="i in 5" :key="i" class="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
            </div>
            <p class="text-gray-700 leading-relaxed mb-5 text-sm">"{{ t.quote }}"</p>
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))">{{ t.name[0] }}</div>
              <div>
                <p class="font-bold text-gray-900 text-sm">{{ t.name }}</p>
                <p class="text-xs text-gray-400">{{ t.school }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-20 px-6" style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))">
      <div class="max-w-xl mx-auto text-center">
        <h2 class="text-3xl font-black text-white mb-4">Werde Teil der Simy-Familie</h2>
        <p class="text-purple-200 mb-8">Starte kostenlos und erlebe selbst, was andere schon täglich nutzen.</p>
        <a href="https://app.simy.ch/tenant-register"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white font-black text-lg transition-all hover:opacity-90"
          style="color: var(--brand-primary)">
          60 Tage kostenlos starten →
        </a>
      </div>
    </section>

    <SimyFooter />
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Kundenstories – Simy | Erfahrungen aus der Praxis',
  meta: [
    { name: 'description', content: 'Erfahrungsberichte von Fahrschulen, die Simy nutzen. Echte Zahlen: weniger Verwaltungsaufwand, mehr Buchungen, höherer Umsatz. 50+ Fahrschulen in der Schweiz.' },
    { property: 'og:title', content: 'Kundenstories – Simy | Erfahrungen aus der Praxis' },
    { property: 'og:description', content: '50+ Schweizer Fahrschulen vertrauen simy. Echte Erfahrungsberichte.' },
    { property: 'og:url', content: 'https://simy.ch/kunden' },
  ],
  link: [{ rel: 'canonical', href: 'https://simy.ch/kunden' }],
  script: [{
    type: 'application/ld+json',
    children: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Simy Kundenstories',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Driving Team Zürich – Pascal Kilchenmann' },
        { '@type': 'ListItem', position: 2, name: 'Fahrschule Rapperswil – Marco R.' },
      ],
    }),
  }],
})

const stats = [
  { value: '50+', label: 'Fahrschulen in der Schweiz' },
  { value: '2–3h', label: 'Admin täglich gespart' },
  { value: '4.9★', label: 'Durchschnittsbewertung' },
  { value: '95%', label: 'würden Simy weiterempfehlen' },
]

const drivingTeamMetrics = [
  { value: '2+ Std.', label: 'täglich gespart' },
  { value: '40+', label: 'Fahrstunden/Monat mehr' },
  { value: '4 FahrlehrerInnen', label: 'nahtlos koordiniert' },
]

const testimonials = [
  { name: 'Sandra M.', school: 'Fahrschule Muster, Bern', quote: 'Endlich kein Excel mehr. Simy erinnert unsere Schüler automatisch an Termine und versendet Rechnungen von selbst. Ich kann mich wieder aufs Unterrichten konzentrieren.' },
  { name: 'Marco R.', school: 'Fahrschule Rapperswil', quote: 'Die Online-Buchung hat alles verändert. Früher haben wir Termine per WhatsApp koordiniert — heute buchen Schüler selbst und ich werde nur noch informiert.' },
  { name: 'Rahel S.', school: 'Lachen SZ', quote: 'Der Website-Generator war ein echtes Highlight. In einer Stunde hatte ich eine professionelle Website, die meine Preise und Kurse zeigt. Hätte ich sonst tausende Franken bezahlt.' },
  { name: 'Thomas B.', school: 'Fahrschule Winterthur', quote: 'Als jemand, der nicht technikaffin ist, war die Einrichtung überraschend einfach. Der Setup-Wizard führt durch alles — nach 20 Minuten war ich komplett startklar.' },
]
</script>
