<template>
  <div class="min-h-screen bg-white font-sans">
    <SimyNav />

    <section class="relative overflow-hidden pt-16 pb-16 px-6">
      <div class="absolute inset-0 pointer-events-none">
        <div
          class="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full opacity-[0.07]"
          style="background: radial-gradient(circle, var(--brand-primary) 0%, transparent 70%)"
        />
      </div>

      <div class="relative max-w-4xl mx-auto">
        <nav class="flex items-center gap-2 text-xs text-gray-400 mb-8 flex-wrap">
          <NuxtLink to="/" class="hover:text-gray-600">Simy</NuxtLink><span>›</span>
          <NuxtLink to="/vergleich" class="hover:text-gray-600">Vergleich</NuxtLink><span>›</span>
          <span class="text-gray-600">{{ c.competitorName }}</span>
        </nav>

        <div
          class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider mb-6 border"
          style="background: rgba(var(--brand-rgb),0.07); color: var(--brand-primary); border-color: rgba(var(--brand-rgb),0.25)"
        >
          {{ c.badge }}
        </div>

        <h1 class="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 mb-5 leading-tight tracking-tight">
          {{ c.h1 }}
          <br />
          <span
            style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;"
          >
            {{ c.h1Highlight }}
          </span>
        </h1>

        <p class="text-lg md:text-xl text-gray-600 leading-relaxed mb-4 max-w-3xl">
          {{ c.verdict }}
        </p>
        <p class="text-base text-gray-500 mb-8 max-w-2xl">{{ c.heroSub }}</p>

        <div class="flex flex-col sm:flex-row gap-4 mb-6">
          <a
            :href="ctaUrl"
            class="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-white font-bold transition-all hover:opacity-90"
            style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); box-shadow: 0 8px 24px rgba(var(--brand-rgb),0.3)"
          >
            30 Tage gratis testen →
          </a>
          <NuxtLink
            to="/preise"
            class="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all"
          >
            Preise ansehen
          </NuxtLink>
        </div>
        <p class="text-sm text-gray-400">Keine Kreditkarte · Monatlich kündbar · Schweizer Server</p>
      </div>
    </section>

    <section class="py-12 px-6 bg-gray-50 border-y border-gray-100">
      <div class="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
        <div class="rounded-2xl bg-white border border-gray-100 p-6">
          <p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">{{ c.competitorName }} passt, wenn…</p>
          <p class="text-sm text-gray-600 leading-relaxed">{{ c.bestForCompetitor }}</p>
        </div>
        <div class="rounded-2xl bg-white border p-6" style="border-color: rgba(var(--brand-rgb),0.25)">
          <p class="text-xs font-bold uppercase tracking-widest mb-2" style="color: var(--brand-primary)">Simy passt, wenn…</p>
          <p class="text-sm text-gray-600 leading-relaxed">{{ c.bestForSimy }}</p>
        </div>
      </div>
    </section>

    <section class="py-16 px-6">
      <div class="max-w-4xl mx-auto">
        <h2 class="text-2xl md:text-3xl font-extrabold text-gray-900 mb-8 text-center">
          Feature-Vergleich: Simy vs {{ c.competitorName }}
        </h2>
        <div class="overflow-x-auto rounded-2xl border border-gray-100">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 text-left">
                <th class="px-4 py-3 font-bold text-gray-700">Funktion</th>
                <th class="px-4 py-3 font-bold text-gray-500">{{ c.competitorName }}</th>
                <th class="px-4 py-3 font-bold" style="color: var(--brand-primary)">Simy</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in c.rows"
                :key="row.feature"
                class="border-t border-gray-50"
              >
                <td class="px-4 py-3 font-medium text-gray-900">{{ row.feature }}</td>
                <td class="px-4 py-3 text-gray-500">{{ row.competitor }}</td>
                <td class="px-4 py-3 font-semibold text-gray-900">
                  <span v-if="row.winner === 'simy'" class="text-green-600 mr-1">✓</span>
                  {{ row.simy }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="py-16 px-6 bg-gray-50">
      <div class="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
        <div>
          <h2 class="text-xl font-extrabold text-gray-900 mb-4">Stärken von {{ c.competitorName }}</h2>
          <ul class="space-y-3">
            <li v-for="p in c.prosCompetitor" :key="p" class="flex gap-2 text-sm text-gray-600">
              <span class="text-gray-400">•</span>{{ p }}
            </li>
          </ul>
        </div>
        <div>
          <h2 class="text-xl font-extrabold text-gray-900 mb-4">Stärken von Simy</h2>
          <ul class="space-y-3">
            <li v-for="p in c.prosSimy" :key="p" class="flex gap-2 text-sm text-gray-600">
              <span style="color: var(--brand-primary)">✓</span>{{ p }}
            </li>
          </ul>
        </div>
      </div>
    </section>

    <section class="py-16 px-6">
      <div class="max-w-2xl mx-auto">
        <h2 class="text-2xl font-extrabold text-gray-900 mb-8 text-center">Häufige Fragen</h2>
        <div class="space-y-3">
          <div
            v-for="(faq, i) in c.faqs"
            :key="i"
            class="bg-white rounded-2xl border border-gray-100 overflow-hidden"
          >
            <button
              class="w-full flex items-center justify-between px-6 py-5 text-left font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
              @click="openFaq = openFaq === i ? null : i"
            >
              {{ faq.q }}
              <svg
                class="w-5 h-5 text-gray-400 flex-shrink-0 transition-transform"
                :class="openFaq === i ? 'rotate-180' : ''"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div v-if="openFaq === i" class="px-6 pb-5 text-sm text-gray-500 leading-relaxed border-t border-gray-50">
              <div class="pt-4">{{ faq.a }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="py-12 px-6 bg-gray-50 border-y border-gray-100">
      <div class="max-w-3xl mx-auto text-center">
        <h2 class="text-lg font-extrabold text-gray-900 mb-4">Weitere Vergleiche</h2>
        <div class="flex flex-wrap justify-center gap-3">
          <NuxtLink
            v-for="other in others"
            :key="other.slug"
            :to="`/vergleich/${other.slug}`"
            class="text-sm font-semibold px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900 transition-all"
          >
            vs {{ other.competitorName }}
          </NuxtLink>
          <NuxtLink
            to="/branchen"
            class="text-sm font-semibold px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:border-gray-300 transition-all"
          >
            Branchen →
          </NuxtLink>
          <NuxtLink
            to="/fahrschule/software"
            class="text-sm font-semibold px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:border-gray-300 transition-all"
          >
            Fahrschulsoftware →
          </NuxtLink>
        </div>
      </div>
    </section>

    <section class="py-20 px-6" style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))">
      <div class="max-w-xl mx-auto text-center">
        <h2 class="text-3xl font-black text-white mb-4">Bereit für weniger Tools?</h2>
        <p class="text-white/80 mb-8">30 Tage kostenlos — keine Kreditkarte.</p>
        <a
          :href="ctaUrl"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white font-black text-lg transition-all hover:opacity-90"
          style="color: var(--brand-primary)"
        >
          Jetzt Simy testen →
        </a>
      </div>
    </section>

    <SimyFooter />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SimyComparison } from '~/data/comparisons'
import { COMPARISONS } from '~/data/comparisons'
import { STARTING_PRICE_CHF } from '~/data/pricing'

const props = defineProps<{ comparison: SimyComparison }>()

const c = computed(() => props.comparison)
const { registerCta: ctaUrl } = useRegisterCta()
const openFaq = ref<number | null>(0)
const others = computed(() => COMPARISONS.filter((x) => x.slug !== props.comparison.slug))
const canonical = computed(() => `https://simy.ch/vergleich/${props.comparison.slug}`)

useHead(() => ({
  title: props.comparison.title,
  htmlAttrs: { lang: 'de' },
  meta: [
    { name: 'description', content: props.comparison.description },
    { name: 'keywords', content: props.comparison.keywords },
    { property: 'og:title', content: props.comparison.title },
    { property: 'og:description', content: props.comparison.description },
    { property: 'og:url', content: canonical.value },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:title', content: props.comparison.title },
    { name: 'twitter:description', content: props.comparison.description },
  ],
  link: [{ rel: 'canonical', href: canonical.value }],
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: props.comparison.schemaName,
        description: props.comparison.verdict,
        url: canonical.value,
        inLanguage: 'de-CH',
        isPartOf: { '@type': 'WebSite', name: 'Simy', url: 'https://simy.ch' },
        about: {
          '@type': 'SoftwareApplication',
          name: 'Simy',
          applicationCategory: 'BusinessApplication',
          offers: {
            '@type': 'Offer',
            price: String(STARTING_PRICE_CHF),
            priceCurrency: 'CHF',
          },
        },
      }),
    },
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: props.comparison.faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }),
    },
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Simy', item: 'https://simy.ch/' },
          { '@type': 'ListItem', position: 2, name: 'Vergleich', item: 'https://simy.ch/vergleich' },
          {
            '@type': 'ListItem',
            position: 3,
            name: props.comparison.competitorName,
            item: canonical.value,
          },
        ],
      }),
    },
  ],
}))
</script>
