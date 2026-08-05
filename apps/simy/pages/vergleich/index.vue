<template>
  <div class="min-h-screen bg-white font-sans">
    <SimyNav />

    <section class="pt-20 pb-16 px-6 relative overflow-hidden">
      <div class="absolute inset-0 pointer-events-none">
        <div
          class="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full opacity-[0.06]"
          style="background: radial-gradient(circle, var(--brand-primary), transparent)"
        />
      </div>
      <div class="relative max-w-3xl mx-auto text-center">
        <div
          class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider mb-6 border"
          style="background: rgba(var(--brand-rgb),0.07); color: var(--brand-primary); border-color: rgba(var(--brand-rgb),0.25)"
        >
          Vergleiche
        </div>
        <h1 class="text-3xl md:text-5xl font-black text-gray-900 mb-5 leading-tight">
          Simy im Vergleich
        </h1>
        <p class="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
          Ehrliche Gegenüberstellungen zu Calendly, Terminli, KLARA und SimplyBook —
          damit Schweizer Selbständige und KMUs die passende Terminsoftware wählen.
        </p>
      </div>
    </section>

    <section class="pb-20 px-6">
      <div class="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
        <NuxtLink
          v-for="c in COMPARISONS"
          :key="c.slug"
          :to="`/vergleich/${c.slug}`"
          class="group rounded-3xl p-7 border-2 border-gray-100 bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all"
          style="border-color: rgba(var(--brand-rgb),0.15)"
        >
          <p class="text-xs font-bold uppercase tracking-widest mb-2" style="color: var(--brand-primary)">
            Vergleich
          </p>
          <h2 class="text-xl font-extrabold text-gray-900 mb-2 group-hover:underline">
            vs {{ c.competitorName }}
          </h2>
          <p class="text-sm text-gray-500 leading-relaxed mb-4 line-clamp-3">{{ c.verdict }}</p>
          <span class="text-sm font-bold" style="color: var(--brand-primary)">Vergleich lesen →</span>
        </NuxtLink>
      </div>
    </section>

    <section class="py-12 px-6 bg-gray-50 border-t border-gray-100">
      <div class="max-w-3xl mx-auto text-center">
        <p class="text-sm text-gray-500 mb-4">Oder direkt nach Branche starten</p>
        <div class="flex flex-wrap justify-center gap-3">
          <NuxtLink to="/fahrschule/software" class="text-sm font-semibold px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:border-purple-200">Fahrschulsoftware</NuxtLink>
          <NuxtLink to="/coaching" class="text-sm font-semibold px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:border-purple-200">Coaching</NuxtLink>
          <NuxtLink to="/consulting" class="text-sm font-semibold px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:border-purple-200">Consulting</NuxtLink>
          <NuxtLink to="/massage" class="text-sm font-semibold px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:border-purple-200">Massage</NuxtLink>
          <NuxtLink to="/branchen" class="text-sm font-semibold px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:border-purple-200">Alle Branchen</NuxtLink>
        </div>
      </div>
    </section>

    <SimyFooter />
  </div>
</template>

<script setup lang="ts">
import { COMPARISONS } from '~/data/comparisons'
import { breadcrumbLd, itemListLd, ldScripts } from '~/utils/schema'

useHead({
  title: 'Simy Vergleich – Calendly, Terminli, KLARA & SimplyBook | Schweiz',
  htmlAttrs: { lang: 'de' },
  meta: [
    {
      name: 'description',
      content:
        'Vergleiche Simy mit Calendly, Terminli, KLARA und SimplyBook. Welche Terminsoftware passt zu Schweizer Selbständigen und KMUs?',
    },
    {
      name: 'keywords',
      content:
        'terminsoftware vergleich schweiz, calendly alternative, terminli alternative, klara terminbuchung, simplybook alternative',
    },
    { property: 'og:title', content: 'Simy Vergleich – Terminsoftware Schweiz' },
    { property: 'og:url', content: 'https://simy.ch/vergleich' },
  ],
  link: [{ rel: 'canonical', href: 'https://simy.ch/vergleich' }],
  script: ldScripts(
    itemListLd({
      name: 'Simy Software-Vergleiche',
      description: 'Ehrliche Vergleiche: Simy vs Calendly, Terminli, KLARA und SimplyBook.',
      url: 'https://simy.ch/vergleich',
      items: COMPARISONS.map((c) => ({
        name: `Simy vs ${c.competitorName}`,
        url: `https://simy.ch/vergleich/${c.slug}`,
      })),
    }),
    breadcrumbLd([
      { name: 'Simy', url: 'https://simy.ch/' },
      { name: 'Vergleich', url: 'https://simy.ch/vergleich' },
    ]),
  ),
})
</script>
