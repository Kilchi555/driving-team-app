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
            <h1 class="text-4xl font-black text-gray-900 mb-5 leading-tight">Gebaut aus der Praxis — für Dienstleister</h1>
            <p class="text-gray-500 leading-relaxed mb-4">Simy wurde von Pascal Kilchenmann gegründet — aktiver Fahrlehrer und Inhaber der Driving Team Fahrschule in Zürich. Die erste Version entstand, weil wir die täglich frustrierenden Admin-Aufgaben satt hatten.</p>
            <p class="text-gray-500 leading-relaxed mb-4">Was als interne Lösung startete, ist heute eine Plattform für Schweizer Dienstleister — von Fahrschule über Coaching bis Consulting. Wir bauen Simy für uns selbst — und für alle, die arbeiten wollen statt verwalten.</p>
            <p class="text-gray-500 leading-relaxed">Unser Ziel: Software + Website + Marketing aus einer Hand. Damit sich Betriebe auf das konzentrieren können, was sie wirklich können — und lieben.</p>
          </div>
          <!-- Numbers -->
          <div class="space-y-4">
            <div v-for="fact in facts" :key="fact.label"
              class="flex items-center gap-5 rounded-2xl p-5 border border-gray-100 hover:border-gray-200 transition-all">
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
              class="rounded-2xl p-6 border border-gray-100 hover:border-gray-200 transition-all text-center">
              <img
                v-if="member.photo"
                :src="member.photo"
                :alt="member.name"
                class="w-16 h-16 rounded-2xl object-cover mx-auto mb-4"
                width="64"
                height="64"
                loading="lazy"
              />
              <div
                v-else
                class="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black mx-auto mb-4"
                style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))"
              >{{ member.name[0] }}</div>
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
        <p class="text-xs font-bold uppercase tracking-widest mb-4 text-white/60">Unsere Mission</p>
        <h2 class="text-3xl font-black text-white mb-5">"Arbeiten statt verwalten."</h2>
        <p class="text-white leading-relaxed mb-8">Wir glauben, dass jeder Dienstleister in der Schweiz eine professionelle digitale Präsenz und ein effizientes Verwaltungssystem verdient — zu einem Preis, der sich bereits nach der ersten gesparten Stunde rechnet.</p>
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
import { breadcrumbLd, ldScripts, webPageLd } from '~/utils/schema'

useHead({
  title: 'Über Simy – All-in-One Software aus der Praxis',
  meta: [
    { name: 'description', content: 'Simy wurde aus der Praxis gebaut. Erfahre unsere Geschichte, Mission und Team. Schweizer All-in-One Software für Dienstleister — seit 2022.' },
    { property: 'og:title', content: 'Über Simy – All-in-One Software aus der Praxis' },
    { property: 'og:description', content: 'Simy wurde aus der Praxis gebaut — für alle, die arbeiten statt verwalten wollen.' },
    { property: 'og:url', content: 'https://simy.ch/ueber-uns' },
  ],
  link: [{ rel: 'canonical', href: 'https://simy.ch/ueber-uns' }],
  script: ldScripts(
    webPageLd({
      name: 'Über Simy',
      description: 'Simy — All-in-One Software aus der Schweiz für Dienstleister und KMU.',
      url: 'https://simy.ch/ueber-uns',
      type: 'AboutPage',
    }),
    breadcrumbLd([
      { name: 'Simy', url: 'https://simy.ch/' },
      { name: 'Über uns', url: 'https://simy.ch/ueber-uns' },
    ]),
  ),
})

const facts = [
  { value: '2022', label: 'Gegründet in der Schweiz', desc: 'Aus der Praxis — für Dienstleister' },
  { value: '50+', label: 'Betriebe vertrauen Simy', desc: 'Täglich aktive Nutzer in der ganzen Schweiz' },
  { value: '100%', label: 'Swiss Made', desc: 'Team, Server und Support in der Schweiz' },
  { value: '3', label: 'Produkte unter einem Dach', desc: 'Software + Website + Marketing' },
]

const team = [
  { name: 'Pascal Kilchenmann', role: 'Gründer & CEO', photo: '/pascal-business-2-round.png', bio: 'Fahrlehrer seit 2011, Inhaber Driving Team Zürich. Hat Simy gebaut, weil er die eigene Admin-Hölle satt hatte.' },
  { name: 'Dev Team', role: 'Engineering', bio: 'Schweizer Software-Entwickler, die täglich mit Kunden sprechen und sofort reagieren.' },
  { name: 'Support', role: 'Customer Success', bio: 'Persönliche Betreuung auf Deutsch — erreichbar per E-Mail, Chat und Telefon.' },
]
</script>
