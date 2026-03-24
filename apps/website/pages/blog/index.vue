<template>
  <div>
    <Head>
      <Title>Fahrschule Blog | Tipps & News zur Fahrausbildung | Driving Team</Title>
      <Meta name="description" content="Blog der Fahrschule Driving Team. Tipps zur Theorieprüfung, VKU Kurs, Fahrprüfungsangst, Führerschein umschreiben und mehr." />
      <Meta property="og:title" content="Blog – Tipps & Wissen rund ums Autofahren | Driving Team" />
      <Meta property="og:description" content="Tipps zur Theorieprüfung, VKU Kurs, Fahrprüfungsangst und mehr. Blog der Fahrschule Driving Team." />
      <Meta property="og:url" content="https://drivingteam.ch/blog/" />
      <Link rel="canonical" href="https://drivingteam.ch/blog/" />
      <Meta property="og:image" content="https://drivingteam.ch/images/og-image.webp" />
      <Meta property="og:image:width" content="1200" />
      <Meta property="og:image:height" content="630" />
      <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    </Head>

    <!-- Hero -->
    <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-16 md:py-24">
      <div class="section-container text-center">
        <h1 class="heading-lg text-white mb-6">Blog</h1>
        <p class="text-xl text-white/90 max-w-2xl mx-auto">Tipps, Tricks und News rund um Fahrausbildung und Verkehrssicherheit – von erfahrenen Fahrlehrern.</p>
      </div>
    </section>

    <!-- Blog Posts -->
    <section class="section-container py-16 md:py-20">
      <p class="text-lg text-gray-700 mb-12 max-w-3xl">Willkommen im Blog der Fahrschule Driving Team. Hier findest du Artikel zu verschiedenen Themen rund um das sichere Fahren im Strassenverkehr.</p>

      <!-- Dynamic articles from Nuxt Content -->
      <div v-if="articles && articles.length > 0" class="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl">
        <article
          v-for="post in articles"
          :key="post.slug"
          class="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition group"
        >
          <a :href="`/blog/${post.slug}/`" class="block">
            <div class="h-44 bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center relative overflow-hidden">
              <span class="text-5xl">{{ categoryEmoji(post.category) }}</span>
              <span class="absolute top-3 left-3 bg-primary-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                {{ post.category || 'Blog' }}
              </span>
            </div>
            <div class="p-6">
              <div class="flex items-center gap-2 text-xs text-gray-400 mb-3">
                <span>{{ formatDate(post.date) }}</span>
                <span v-if="post.readingTime">· {{ post.readingTime }} Min.</span>
              </div>
              <h2 class="font-bold text-gray-900 text-base leading-snug mb-3 group-hover:text-primary-700 transition line-clamp-3">
                {{ post.title }}
              </h2>
              <p class="text-gray-500 text-sm line-clamp-2 mb-4">{{ post.description }}</p>
              <span class="text-primary-600 font-semibold text-sm inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                Artikel lesen <span>→</span>
              </span>
            </div>
          </a>
        </article>
      </div>

      <div v-else class="text-gray-500 py-12">Keine Artikel gefunden.</div>
    </section>

    <!-- CTA -->
    <section class="bg-primary-600 text-white py-16">
      <div class="section-container text-center">
        <h2 class="heading-md mb-6 text-white">Bereit mit deiner Fahrausbildung zu starten?</h2>
        <div class="flex flex-col md:flex-row gap-4 justify-center">
          <a href="/auto-fahrschule/" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">Auto Fahrschule</a>
          <a href="tel:+41444310033" class="btn-primary bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary-600 text-lg">📞 +41 44 431 00 33</a>
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
  const date = new Date(dateStr)
  return date.toLocaleDateString('de-CH', { year: 'numeric', month: 'long', day: 'numeric' })
}

function categoryEmoji(category: string | undefined): string {
  const map: Record<string, string> = {
    'Theorieprüfung': '📚',
    'VKU Kurs': '🚦',
    'Verkehrssicherheit': '🤝',
    'License Conversion': '🌍',
    'Fahrprüfung': '😰',
  }
  return map[category ?? ''] ?? '🚗'
}

const jsonLd = [
  {
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'Driving Team Fahrschule Blog',
      url: 'https://drivingteam.ch/blog/',
      description: 'Tipps und Wissen rund um Fahrausbildung und Verkehrssicherheit in der Schweiz',
      publisher: {
        '@type': 'Organization',
        name: 'Driving Team Fahrschule',
        url: 'https://drivingteam.ch'
      }
    })
  }
]
useHead({ script: jsonLd })
</script>
