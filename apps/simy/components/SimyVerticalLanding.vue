<template>
  <div class="min-h-screen bg-white font-sans">
    <SimyNav />

    <!-- Hero: one composition — brand, one H1, one sub, CTAs -->
    <section class="relative overflow-hidden pt-20 pb-24 px-6">
      <div class="absolute inset-0 pointer-events-none">
        <div
          class="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full opacity-[0.07]"
          style="background: radial-gradient(circle, var(--brand-primary) 0%, transparent 70%)"
        />
        <div
          class="absolute top-1/2 -left-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style="background: radial-gradient(circle, var(--brand-secondary) 0%, transparent 70%)"
        />
      </div>

      <div class="relative max-w-5xl mx-auto text-center">
        <div
          class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider mb-6 border"
          style="background: rgba(var(--brand-rgb),0.07); color: var(--brand-primary); border-color: rgba(var(--brand-rgb),0.25)"
        >
          {{ v.badge }}
        </div>

        <h1 class="text-4xl sm:text-5xl md:text-6xl font-black text-gray-900 mb-6 leading-[1.1] tracking-tight">
          {{ v.h1Line1 }}
          <br />
          <span
            style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;"
          >
            {{ v.h1Highlight }}
          </span>
        </h1>

        <p class="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          {{ v.heroSub }}
        </p>

        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            :href="ctaUrl"
            class="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-white font-bold text-base transition-all hover:opacity-90 hover:-translate-y-0.5"
            style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); box-shadow: 0 8px 30px rgba(var(--brand-rgb),0.3);"
          >
            {{ v.ctaPrimary }}
          </a>
          <a
            href="#features"
            class="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl font-bold text-base border border-gray-200 text-gray-700 hover:bg-gray-50 hover:-translate-y-0.5 transition-all"
          >
            {{ v.ctaSecondary }}
          </a>
        </div>

        <div class="flex flex-wrap items-center justify-center gap-5 mt-12 text-sm text-gray-400">
          <span v-for="t in trust" :key="t" class="flex items-center gap-1.5">
            <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            {{ t }}
          </span>
        </div>
      </div>
    </section>

    <section class="py-14 px-6 border-y border-gray-100 bg-gray-50">
      <div class="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        <div v-for="stat in v.stats" :key="stat.label" class="text-center">
          <div class="text-3xl md:text-4xl font-black mb-1" style="color: var(--brand-primary)">{{ stat.value }}</div>
          <div class="text-sm text-gray-500">{{ stat.label }}</div>
        </div>
      </div>
    </section>

    <section class="py-24 px-6">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-16">
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary)">{{ v.painEyebrow }}</p>
          <h2 class="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">{{ v.painTitle }}</h2>
          <p class="text-gray-500 text-lg max-w-2xl mx-auto">{{ v.painSub }}</p>
        </div>
        <div class="grid md:grid-cols-3 gap-6">
          <div
            v-for="pain in v.pains"
            :key="pain.title"
            class="rounded-2xl p-6 border transition-all duration-300 hover:-translate-y-1"
            style="background: rgba(var(--brand-rgb),0.04); border-color: rgba(var(--brand-rgb),0.15)"
          >
            <SimyIconTile :name="pain.icon" :size="48" class="mb-3" />
            <h3 class="font-bold text-gray-900 mb-2">{{ pain.title }}</h3>
            <p class="text-sm text-gray-500 leading-relaxed">{{ pain.text }}</p>
          </div>
        </div>
        <div class="text-center mt-12">
          <p class="text-2xl font-black" style="color: var(--brand-primary)">{{ v.painCloser }}</p>
        </div>
      </div>
    </section>

    <section id="features" class="py-24 px-6 bg-gray-50">
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-16">
          <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color: var(--brand-primary)">{{ v.featuresEyebrow }}</p>
          <h2 class="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">{{ v.featuresTitle }}</h2>
          <p class="text-gray-500 text-lg max-w-xl mx-auto">{{ v.featuresSub }}</p>
        </div>
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="feature in v.features"
            :key="feature.title"
            class="bg-white rounded-3xl p-7 border border-gray-100 hover:border-gray-200 hover:-translate-y-1 transition-all duration-300"
          >
            <SimyIconTile :name="feature.icon" :size="48" class="mb-5" />
            <h3 class="font-bold text-gray-900 mb-2 text-lg">{{ feature.title }}</h3>
            <p class="text-sm text-gray-500 leading-relaxed">{{ feature.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="py-24 px-6">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-14">
          <h2 class="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">{{ v.highlightsTitle }}</h2>
          <p class="text-lg text-gray-500 max-w-xl mx-auto">{{ v.highlightsSub }}</p>
        </div>
        <div class="space-y-12">
          <div
            v-for="(h, i) in v.highlights"
            :key="h.title"
            class="flex flex-col md:flex-row items-center gap-8"
            :class="i % 2 === 1 ? 'md:flex-row-reverse' : ''"
          >
            <div
              class="flex-shrink-0 w-full md:w-64 h-48 rounded-2xl flex items-center justify-center"
              style="background: linear-gradient(135deg, rgba(var(--brand-rgb),0.06), rgba(var(--brand-2-rgb),0.1)); color: var(--brand-primary);"
            >
              <SimyIcon :name="h.visual" :size="56" stroke-width="1.5" />
            </div>
            <div class="flex-1">
              <h3 class="text-xl font-extrabold text-gray-900 mb-3">{{ h.title }}</h3>
              <p class="text-gray-500 leading-relaxed mb-4">{{ h.desc }}</p>
              <ul class="space-y-2">
                <li v-for="point in h.points" :key="point" class="flex items-start gap-2 text-sm text-gray-600">
                  <svg class="w-4 h-4 mt-0.5 flex-shrink-0" style="color: var(--brand-primary);" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {{ point }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section v-if="v.guide" class="py-20 px-6 bg-white border-y border-gray-100">
      <div class="max-w-3xl mx-auto">
        <h2 class="text-2xl md:text-3xl font-extrabold text-gray-900 mb-4">{{ v.guide.title }}</h2>
        <p class="text-gray-600 leading-relaxed mb-10">{{ v.guide.intro }}</p>
        <div class="space-y-8">
          <div v-for="section in v.guide.sections" :key="section.heading">
            <h3 class="text-lg font-bold text-gray-900 mb-2">{{ section.heading }}</h3>
            <p class="text-sm text-gray-500 leading-relaxed">{{ section.body }}</p>
          </div>
        </div>
        <div class="mt-10 flex flex-wrap gap-3">
          <a
            href="/vergleich/calendly-alternative"
            class="text-sm font-semibold px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:border-gray-300 transition-all"
          >Calendly Alternative</a>
          <a
            href="/vergleich"
            class="text-sm font-semibold px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:border-gray-300 transition-all"
          >Alle Vergleiche</a>
          <a
            href="/fahrschule/software"
            class="text-sm font-semibold px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:border-gray-300 transition-all"
          >Fahrschulsoftware</a>
        </div>
      </div>
    </section>

    <section class="py-16 px-6 bg-gray-50">
      <div class="max-w-3xl mx-auto text-center">
        <h2 class="text-2xl font-extrabold text-gray-900 mb-3">{{ v.proofTitle }}</h2>
        <p class="text-gray-500">{{ v.proofSub }}</p>
        <div class="mt-8 flex flex-wrap justify-center gap-3">
          <a
            v-for="link in related"
            :key="link.href"
            :href="link.href"
            class="text-sm font-semibold px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900 transition-all"
          >
            {{ link.label }}
          </a>
        </div>
      </div>
    </section>

    <SimyReviewsSection
      :business-type="v.businessType"
      :title="`Google-Bewertungen für ${v.navLabel}`"
      :subtitle="`Nur Reviews, die zu ${v.navLabel} passen — live gefiltert.`"
    />

    <section class="py-24 px-6">
      <div class="max-w-2xl mx-auto">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-extrabold text-gray-900">Häufige Fragen</h2>
        </div>
        <div class="space-y-3">
          <div v-for="(faq, i) in v.faqs" :key="i" class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
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

    <section class="py-28 px-6" style="background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)">
      <div class="max-w-2xl mx-auto text-center">
        <SimyFounderNote :blurb="founderBlurb" compact />
        <h2 class="text-3xl md:text-4xl font-black text-white mb-5">{{ v.finalTitle }}</h2>
        <p class="text-white/80 text-lg mb-10">{{ v.finalSub }}</p>
        <a
          :href="ctaUrl"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white font-black text-lg transition-all hover:opacity-90 hover:-translate-y-1"
          style="color: var(--brand-primary); box-shadow: 0 12px 40px rgba(0,0,0,0.2)"
        >
          {{ v.ctaPrimary }}
        </a>
        <p class="text-white/70 text-sm mt-5">{{ v.finalNote }}</p>
      </div>
    </section>

    <SimyFooter />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SimyVertical } from '~/data/verticals'
import { registerUrl, VERTICALS } from '~/data/verticals'
import { founderBlurbForSlug } from '~/data/founder'

const props = defineProps<{ vertical: SimyVertical }>()

const v = computed(() => props.vertical)
const ctaUrl = computed(() => registerUrl(props.vertical.businessType))
const founderBlurb = computed(() => founderBlurbForSlug(props.vertical.slug))
const openFaq = ref<number | null>(0)
const trust = ['Keine Kreditkarte nötig', 'In Minuten startklar', 'Swiss Made', 'DSG-konform']

const related = computed(() =>
  VERTICALS.filter((x) => x.slug !== props.vertical.slug)
    .slice(0, 3)
    .map((x) => ({ href: `/${x.slug}`, label: x.navLabel }))
    .concat([
      { href: '/fahrschule', label: 'Fahrschule' },
      { href: '/vergleich', label: 'Vergleiche' },
      { href: '/branchen', label: 'Alle Branchen' },
    ])
)

const canonical = computed(() => `https://simy.ch/${props.vertical.slug}`)

useHead(() => ({
  title: props.vertical.title,
  meta: [
    { name: 'description', content: props.vertical.description },
    { name: 'keywords', content: props.vertical.keywords },
    { property: 'og:title', content: props.vertical.title },
    { property: 'og:description', content: props.vertical.description },
    { property: 'og:url', content: canonical.value },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: props.vertical.title },
    { name: 'twitter:description', content: props.vertical.description },
    { name: 'robots', content: 'index,follow' },
  ],
  link: [{ rel: 'canonical', href: canonical.value }],
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: props.vertical.schemaName,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description: props.vertical.schemaDescription,
        url: canonical.value,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'CHF',
          description: '30 Tage kostenlos testen',
        },
        provider: {
          '@type': 'Organization',
          name: 'Simy IT Systems',
          url: 'https://simy.ch',
        },
      }),
    },
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: props.vertical.faqs.map((f) => ({
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
          { '@type': 'ListItem', position: 2, name: 'Branchen', item: 'https://simy.ch/branchen' },
          { '@type': 'ListItem', position: 3, name: props.vertical.navLabel, item: canonical.value },
        ],
      }),
    },
  ],
}))
</script>
