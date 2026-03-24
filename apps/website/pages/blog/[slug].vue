<template>
  <div>
    <Head v-if="article">
      <Title>{{ article.title }} | Blog | Driving Team Fahrschule</Title>
      <Meta name="description" :content="article.description" />
      <Meta name="keywords" :content="article.keywords || ''" />
      <Link rel="canonical" :href="`https://drivingteam.ch/blog/${article.slug}/`" />
      <Meta property="og:title" :content="article.title" />
      <Meta property="og:description" :content="article.description" />
      <Meta property="og:url" :content="`https://drivingteam.ch/blog/${article.slug}/`" />
      <Meta property="og:type" content="article" />
      <Meta property="og:image" :content="`https://drivingteam.ch${article.ogImage || '/images/og-image.webp'}`" />
      <Meta property="article:published_time" :content="article.date" />
      <Meta property="article:modified_time" :content="article.dateModified || article.date" />
      <Meta property="article:author" :content="article.author || 'Driving Team Fahrschule'" />
      <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    </Head>

    <div v-if="article">
      <!-- Hero -->
      <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-12 md:py-16">
        <div class="section-container">
          <!-- Breadcrumb -->
          <nav class="text-sm text-primary-200 mb-6" aria-label="Breadcrumb">
            <ol class="flex flex-wrap items-center gap-1">
              <li><a href="/" class="hover:text-white transition">Home</a></li>
              <li class="mx-1">›</li>
              <li><a href="/blog/" class="hover:text-white transition">Blog</a></li>
              <li class="mx-1">›</li>
              <li class="text-white truncate max-w-xs">{{ article.title }}</li>
            </ol>
          </nav>

          <div class="flex items-center gap-2 mb-4">
            <span class="bg-primary-500/50 text-white text-xs font-semibold px-3 py-1 rounded-full">
              {{ article.category || 'Blog' }}
            </span>
            <span class="text-primary-200 text-sm">{{ formatDate(article.date) }}</span>
            <span v-if="article.readingTime" class="text-primary-200 text-sm">· {{ article.readingTime }} Min. Lesezeit</span>
          </div>

          <h1 class="heading-lg text-white max-w-3xl">{{ article.title }}</h1>
          <p class="text-lg text-primary-100 mt-4 max-w-2xl">{{ article.description }}</p>
        </div>
      </section>

      <!-- Article Content -->
      <section class="section-container py-12 md:py-16">
        <div class="max-w-3xl">
          <div class="prose prose-lg prose-primary max-w-none
            prose-h2:text-2xl prose-h2:font-bold prose-h2:text-gray-900 prose-h2:mt-10 prose-h2:mb-4
            prose-h3:text-xl prose-h3:font-semibold prose-h3:text-gray-800 prose-h3:mt-8 prose-h3:mb-3
            prose-p:text-gray-700 prose-p:leading-relaxed
            prose-a:text-primary-600 prose-a:font-semibold hover:prose-a:underline
            prose-ul:space-y-1 prose-li:text-gray-700
            prose-strong:text-gray-900
            prose-blockquote:border-primary-400 prose-blockquote:bg-primary-50 prose-blockquote:rounded-r-lg prose-blockquote:py-1
            prose-table:text-sm prose-th:bg-primary-50 prose-th:text-primary-800">
            <ContentRenderer :value="article" />
          </div>

          <!-- Author / Date Footer -->
          <div class="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                DT
              </div>
              <div>
                <p class="font-semibold text-gray-900 text-sm">{{ article.author || 'Driving Team Fahrschule' }}</p>
                <p class="text-gray-500 text-xs">
                  Veröffentlicht: {{ formatDate(article.date) }}
                  <span v-if="article.dateModified && article.dateModified !== article.date"> · Aktualisiert: {{ formatDate(article.dateModified) }}</span>
                </p>
              </div>
            </div>
          </div>

          <!-- Related Articles -->
          <div v-if="relatedArticles.length > 0" class="mt-12">
            <h2 class="text-xl font-bold text-gray-900 mb-6">Weitere Artikel</h2>
            <div class="grid sm:grid-cols-2 gap-4">
              <a
                v-for="related in relatedArticles"
                :key="related.slug"
                :href="`/blog/${related.slug}/`"
                class="block bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-primary-50 hover:border-primary-200 transition group"
              >
                <span class="text-xs font-semibold text-primary-600 bg-primary-100 px-2 py-0.5 rounded-full">{{ related.category || 'Blog' }}</span>
                <h3 class="font-semibold text-gray-900 mt-2 text-sm leading-snug group-hover:text-primary-700 transition">{{ related.title }}</h3>
                <p class="text-gray-500 text-xs mt-1">{{ formatDate(related.date) }}</p>
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA -->
      <section class="bg-primary-600 text-white py-14">
        <div class="section-container text-center">
          <h2 class="heading-md mb-4 text-white">Bereit mit deiner Fahrausbildung zu starten?</h2>
          <p class="text-primary-100 mb-8 text-lg">Die Driving Team Fahrschule begleitet dich von der Theorieprüfung bis zum Führerschein.</p>
          <div class="flex flex-col md:flex-row gap-4 justify-center">
            <a href="/auto-fahrschule/" class="btn-primary bg-white text-primary-600 hover:bg-primary-50 text-lg">Auto Fahrschule</a>
            <a href="/kontakt/" class="btn-primary bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary-600 text-lg">Kontakt aufnehmen</a>
          </div>
        </div>
      </section>
    </div>

    <!-- 404 state -->
    <div v-else class="section-container py-20 text-center">
      <h1 class="heading-lg mb-4">Artikel nicht gefunden</h1>
      <p class="text-gray-600 mb-8">Dieser Artikel existiert leider nicht oder wurde verschoben.</p>
      <a href="/blog/" class="btn-primary">Zurück zum Blog</a>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const slug = route.params.slug as string

const { data: article } = await useAsyncData(`blog-${slug}`, () =>
  queryContent('blog').where({ slug }).findOne()
)

if (!article.value) {
  throw createError({ statusCode: 404, message: 'Artikel nicht gefunden' })
}

const { data: allArticles } = await useAsyncData('blog-all-for-related', () =>
  queryContent('blog').only(['title', 'slug', 'date', 'category']).find()
)

const relatedArticles = computed(() => {
  if (!allArticles.value || !article.value) return []
  return allArticles.value
    .filter(a => a.slug !== article.value!.slug)
    .slice(0, 4)
})

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('de-CH', { year: 'numeric', month: 'long', day: 'numeric' })
}

// JSON-LD
const jsonLd = computed(() => {
  if (!article.value) return []
  const a = article.value
  const articleUrl = `https://drivingteam.ch/blog/${a.slug}/`
  return [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: a.title,
        description: a.description,
        url: articleUrl,
        datePublished: a.date,
        dateModified: a.dateModified || a.date,
        author: {
          '@type': 'Organization',
          name: a.author || 'Driving Team Fahrschule',
          url: 'https://drivingteam.ch'
        },
        publisher: {
          '@type': 'Organization',
          name: 'Driving Team Fahrschule',
          url: 'https://drivingteam.ch',
          logo: {
            '@type': 'ImageObject',
            url: 'https://drivingteam.ch/images/og-image.webp'
          }
        },
        image: `https://drivingteam.ch${a.ogImage || '/images/og-image.webp'}`,
        inLanguage: a.lang === 'en' ? 'en' : 'de-CH',
        mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl }
      })
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://drivingteam.ch/' },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://drivingteam.ch/blog/' },
          { '@type': 'ListItem', position: 3, name: a.title, item: articleUrl }
        ]
      })
    }
  ]
})

useHead({ script: jsonLd })
</script>
