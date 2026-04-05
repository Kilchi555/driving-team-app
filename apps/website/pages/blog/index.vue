<template>
  <div>
    <Head>
      <Title>Fahrschule Blog – Tipps & News zur Fahrausbildung</Title>
      <Meta name="description" content="Blog der Fahrschule Driving Team. Tipps zur Theorieprüfung, VKU Kurs, Fahrprüfungsangst, Führerschein umschreiben und mehr." />
      <Meta property="og:title" content="Blog – Tipps & Wissen rund ums Autofahren | Driving Team" />
      <Meta property="og:description" content="Tipps zur Theorieprüfung, VKU Kurs, Fahrprüfungsangst und mehr. Blog der Fahrschule Driving Team." />
      <Meta property="og:url" content="https://drivingteam.ch/blog/" />
      <Link rel="canonical" href="https://drivingteam.ch/blog/" />
      <Meta property="og:image" content="https://drivingteam.ch/images/og-image.webp" />
      <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    </Head>

    <!-- Hero -->
    <section class="bg-gradient-to-br from-gray-900 via-primary-900 to-primary-800 text-white py-16 md:py-24">
      <div class="section-container text-center max-w-3xl">
        <span class="inline-block bg-primary-500/30 text-primary-200 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-6">Driving Team Blog</span>
        <h1 class="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">Tipps & Wissen<br class="hidden md:block" /> rund um die Fahrausbildung</h1>
        <p class="text-lg text-primary-100/90 max-w-xl mx-auto">Praxiswissen von erfahrenen Fahrlehrern – zu Theorieprüfung, Führerschein, Kursen und mehr.</p>
      </div>
    </section>

    <!-- Blog Grid -->
    <section class="bg-gray-50 py-16 md:py-20">
      <div class="section-container">

        <!-- Featured Article (latest) -->
        <div v-if="articles && articles.length > 0" class="mb-12">
          <a
            :href="`/blog/${articles[0].slug}/`"
            class="group block bg-white rounded-3xl overflow-hidden border border-gray-200 hover:shadow-xl hover:border-primary-200 transition-all"
          >
            <div class="md:flex">
              <div class="md:w-2/5 h-56 md:h-auto bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center text-8xl relative overflow-hidden">
                <span class="relative z-10">{{ categoryEmoji(articles[0].category) }}</span>
                <div class="absolute inset-0 opacity-10 bg-[url('/images/og-image.webp')] bg-cover bg-center" />
              </div>
              <div class="md:w-3/5 p-8 md:p-10 flex flex-col justify-center">
                <div class="flex items-center gap-3 mb-4">
                  <span class="bg-primary-600 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide">{{ articles[0].category || 'Blog' }}</span>
                  <span class="text-gray-400 text-sm">{{ formatDate(articles[0].date) }}</span>
                  <span v-if="articles[0].readingTime" class="text-gray-400 text-sm">· {{ articles[0].readingTime }} Min.</span>
                </div>
                <h2 class="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3 group-hover:text-primary-700 transition leading-tight">
                  {{ articles[0].title }}
                </h2>
                <p class="text-gray-500 text-base leading-relaxed mb-6 line-clamp-3">{{ articles[0].description }}</p>
                <span class="inline-flex items-center gap-2 text-primary-600 font-bold text-sm group-hover:gap-3 transition-all">
                  Artikel lesen <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </span>
              </div>
            </div>
          </a>
        </div>

        <!-- Rest of articles grid -->
        <div v-if="articles && articles.length > 1" class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <a
            v-for="post in articles.slice(1)"
            :key="post.slug"
            :href="`/blog/${post.slug}/`"
            class="group bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-primary-200 transition-all flex flex-col"
          >
            <div class="h-40 bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center relative overflow-hidden">
              <span class="text-6xl relative z-10">{{ categoryEmoji(post.category) }}</span>
              <span class="absolute top-3 left-3 bg-primary-600 text-white text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide z-10">
                {{ post.category || 'Blog' }}
              </span>
            </div>
            <div class="p-6 flex flex-col flex-1">
              <div class="flex items-center gap-2 text-xs text-gray-400 mb-3">
                <span>{{ formatDate(post.date) }}</span>
                <span v-if="post.readingTime">· {{ post.readingTime }} Min.</span>
              </div>
              <h2 class="font-extrabold text-gray-900 text-base leading-snug mb-3 group-hover:text-primary-700 transition line-clamp-3 flex-1">
                {{ post.title }}
              </h2>
              <p class="text-gray-500 text-sm line-clamp-2 mb-5 leading-relaxed">{{ post.description }}</p>
              <span class="inline-flex items-center gap-1.5 text-primary-600 font-bold text-sm group-hover:gap-2.5 transition-all mt-auto">
                Lesen <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
              </span>
            </div>
          </a>
        </div>

        <div v-else-if="!articles || articles.length === 0" class="text-center py-16 text-gray-400">
          <p class="text-lg">Keine Artikel gefunden.</p>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="bg-white border-t border-gray-100 py-16">
      <div class="section-container text-center max-w-2xl">
        <h2 class="text-2xl font-extrabold text-gray-900 mb-4">Bereit mit deiner Fahrausbildung zu starten?</h2>
        <p class="text-gray-500 mb-8">Die Driving Team Fahrschule begleitet dich von der Theorieprüfung bis zum Führerschein.</p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/auto-fahrschule/" class="btn-primary text-base font-bold px-8 py-3">Auto Fahrschule</a>
          <a href="tel:+41444310033" class="btn-secondary text-base font-bold px-8 py-3">📞 +41 44 431 00 33</a>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const { data: articles } = await useAsyncData('blog-list', () =>
  queryCollection('blog')
    .select('title', 'description', 'slug', 'date', 'category', 'readingTime')
    .order('date', 'DESC')
    .all()
)

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('de-CH', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

function categoryEmoji(category: string | undefined): string {
  const map: Record<string, string> = {
    'Theorieprüfung': '📚',
    'VKU Kurs': '🚦',
    'Verkehrssicherheit': '🤝',
    'License Conversion': '🌍',
    'Fahrprüfung': '😰',
    'Kosten & Planung': '💰',
    'Fahrausbildung': '🚗',
  }
  return map[category ?? ''] ?? '🚗'
}

const jsonLd = [{
  type: 'application/ld+json',
  innerHTML: JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Driving Team Fahrschule Blog',
    url: 'https://drivingteam.ch/blog/',
    description: 'Tipps und Wissen rund um Fahrausbildung und Verkehrssicherheit in der Schweiz',
    publisher: { '@type': 'Organization', name: 'Driving Team Fahrschule', url: 'https://drivingteam.ch' },
  }),
}]
useHead({ script: jsonLd })
</script>
