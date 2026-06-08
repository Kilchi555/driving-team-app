<template>
  <div class="min-h-screen bg-white font-sans">
    <SimyNav />

    <section class="pt-20 pb-20 px-6 relative overflow-hidden">
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style="background: radial-gradient(circle, var(--brand-primary), transparent)"></div>
      </div>
      <div class="relative max-w-5xl mx-auto">
        <div class="grid md:grid-cols-2 gap-16 items-center mb-24">
          <!-- Story -->
          <div>
            <div class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider mb-6 border"
              style="background: rgba(var(--brand-rgb),0.07); color: var(--brand-primary); border-color: rgba(var(--brand-rgb),0.25)">
              Über Simy
            </div>
            <h1 class="text-4xl font-black text-gray-900 mb-5 leading-tight">Wir kennen Fahrschulen von innen</h1>
            <p class="text-gray-500 leading-relaxed mb-4">Simy wurde von Pascal Kilchenmann gegründet — selbst aktiver Fahrlehrer und Inhaber der Driving Team Fahrschule in Zürich. Die erste Version von Simy haben wir gebaut, weil wir die täglich frustrierenden Admin-Aufgaben satt hatten.</p>
            <p class="text-gray-500 leading-relaxed mb-4">Was als interne Lösung startete, ist heute eine Plattform, die über 50 Schweizer Fahrschulen täglich nutzen. Wir bauen Simy für uns selbst — und für alle, die genauso unterrichten wollen statt verwalten.</p>
            <p class="text-gray-500 leading-relaxed">Unser Ziel: Software + Website + Marketing aus einer Hand. Damit sich Fahrlehrer auf das konzentrieren können, was sie wirklich können — und lieben.</p>
          </div>
          <!-- Numbers -->
          <div class="space-y-4">
            <div v-for="fact in facts" :key="fact.label"
              class="flex items-center gap-5 rounded-2xl p-5 border border-gray-100 hover:border-purple-100 transition-all">
              <div class="text-3xl font-black flex-shrink-0" style="color: var(--brand-primary)">{{ fact.value }}</div>
              <div>
                <p class="font-bold text-gray-900 text-sm">{{ fact.label }}</p>
                <p class="text-xs text-gray-500">{{ fact.desc }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Team -->
        <div>
          <h2 class="text-2xl font-extrabold text-gray-900 mb-8">Das Team</h2>
          <div class="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            <div v-for="member in team" :key="member.name"
              class="rounded-2xl p-6 border border-gray-100 hover:border-purple-100 transition-all text-center">
              <div class="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black mx-auto mb-4"
                style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))">{{ member.name[0] }}</div>
              <h3 class="font-bold text-gray-900 mb-1">{{ member.name }}</h3>
              <p class="text-xs text-gray-400 mb-2">{{ member.role }}</p>
              <p class="text-sm text-gray-500">{{ member.bio }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Mission -->
    <section class="py-20 px-6" style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))">
      <div class="max-w-2xl mx-auto text-center">
        <p class="text-purple-300 text-xs font-bold uppercase tracking-widest mb-4">Unsere Mission</p>
        <h2 class="text-3xl font-black text-white mb-5">"Fahrlehrer sollen unterrichten — nicht verwalten."</h2>
        <p class="text-purple-200 leading-relaxed mb-8">Wir glauben, dass jeder Fahrlehrer in der Schweiz eine professionelle digitale Präsenz und ein effizientes Verwaltungssystem verdient — zu einem Preis, der sich bereits nach der ersten gesparten Stunde rechnet.</p>
        <a href="/demo"
          class="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white font-bold text-sm transition-all hover:opacity-90"
          style="color: var(--brand-primary)">
          Simy kostenlos testen →
        </a>
      </div>
    </section>

    <SimyFooter />
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Über Simy – Fahrschulsoftware von Fahrlehrern, für Fahrlehrer',
  meta: [
    { name: 'description', content: 'Simy wurde von einem echten Fahrlehrer gebaut. Erfahre unsere Geschichte, Mission und Team. Schweizer Software für Fahrschulen — seit 2022.' },
    { property: 'og:title', content: 'Über Simy – Fahrschulsoftware aus der Praxis' },
    { property: 'og:description', content: 'Simy wurde von einem echten Fahrlehrer gebaut — für alle, die unterrichten statt verwalten wollen.' },
    { property: 'og:url', content: 'https://simy.ch/ueber-uns' },
  ],
  link: [{ rel: 'canonical', href: 'https://simy.ch/ueber-uns' }],
})

const facts = [
  { value: '2022', label: 'Gegründet in der Schweiz', desc: 'Von einem aktiven Fahrlehrer, für Fahrlehrer' },
  { value: '50+', label: 'Fahrschulen vertrauen Simy', desc: 'Täglich aktive Nutzer in der ganzen Schweiz' },
  { value: '100%', label: 'Swiss Made', desc: 'Team, Server und Support in der Schweiz' },
  { value: '3', label: 'Produkte unter einem Dach', desc: 'Software + Website + Marketing' },
]

const team = [
  { name: 'Pascal Kilchenmann', role: 'Gründer & CEO', bio: 'Fahrlehrer seit 2011, Inhaber Driving Team Zürich. Hat Simy gebaut, weil er die eigene Admin-Hölle satt hatte.' },
  { name: 'Dev Team', role: 'Engineering', bio: 'Schweizer Software-Entwickler, die täglich mit Fahrlehrern sprechen und sofort reagieren.' },
  { name: 'Support', role: 'Customer Success', bio: 'Persönliche Betreuung auf Deutsch — erreichbar per E-Mail, Chat und Telefon.' },
]
</script>
