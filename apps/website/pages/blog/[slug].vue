<template>
  <div>
    <Head v-if="article">
      <Title>{{ article.title }} | Blog | Driving Team Fahrschule</Title>
      <Meta name="description" :content="article.description" />
      <Meta name="keywords" :content="article.keywords || ''" />
      <Link rel="canonical" :href="articleUrl" />
      <Meta property="og:title" :content="article.title" />
      <Meta property="og:description" :content="article.description" />
      <Meta property="og:url" :content="articleUrl" />
      <Meta property="og:type" content="article" />
      <Meta property="og:image" :content="`https://drivingteam.ch${article.ogImage || '/images/og-image.webp'}`" />
      <Meta property="article:published_time" :content="article.date" />
      <Meta property="article:modified_time" :content="article.dateModified || article.date" />
      <Meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    </Head>

    <div v-if="article">

      <!-- Reading Progress Bar -->
      <div class="fixed top-0 left-0 z-50 h-1 bg-primary-500 transition-all duration-100" :style="{ width: readingProgress + '%' }" />

      <!-- Hero -->
      <section class="relative bg-gradient-to-br from-gray-900 via-primary-900 to-primary-800 text-white overflow-hidden">
        <div class="absolute inset-0 opacity-10 bg-[url('/images/og-image.webp')] bg-cover bg-center" />
        <div class="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent" />
        <div class="relative section-container py-16 md:py-24 max-w-4xl">
          <nav class="text-sm text-primary-200 mb-6 flex flex-wrap items-center gap-1" aria-label="Breadcrumb">
            <a href="/" class="hover:text-white transition">Home</a>
            <span class="mx-1 text-primary-400">›</span>
            <a href="/blog/" class="hover:text-white transition">Blog</a>
            <span class="mx-1 text-primary-400">›</span>
            <span class="text-white/70 truncate max-w-xs text-xs">{{ article.title }}</span>
          </nav>

          <div class="flex flex-wrap items-center gap-3 mb-5">
            <span class="bg-primary-500 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide">
              {{ article.category || 'Blog' }}
            </span>
            <span class="text-primary-200 text-sm flex items-center gap-1.5">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              {{ formatDate(article.date) }}
            </span>
            <span v-if="article.readingTime" class="text-primary-200 text-sm flex items-center gap-1.5">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {{ article.readingTime }} Min. Lesezeit
            </span>
          </div>

          <h1 class="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight max-w-3xl">
            {{ article.title }}
          </h1>
          <p class="mt-5 text-lg md:text-xl text-primary-100/90 max-w-2xl leading-relaxed">
            {{ article.description }}
          </p>

          <!-- Author -->
          <div class="mt-8 flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold text-sm shrink-0 ring-2 ring-white/20">
              DT
            </div>
            <div>
              <p class="text-white font-semibold text-sm">{{ article.author || 'Driving Team Fahrschule' }}</p>
              <p class="text-primary-200 text-xs">
                {{ formatDate(article.date) }}
                <span v-if="article.dateModified && article.dateModified !== article.date"> · Aktualisiert: {{ formatDate(article.dateModified) }}</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Article Layout -->
      <div class="bg-white">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div class="lg:grid lg:grid-cols-[1fr_280px] lg:gap-12">

            <!-- Main Content -->
            <article ref="articleRef">
              <div class="prose prose-lg max-w-none
                prose-headings:font-extrabold prose-headings:text-gray-900 prose-headings:tracking-tight
                prose-h1:text-3xl prose-h1:mt-0
                prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h2:pb-3 prose-h2:border-b prose-h2:border-gray-100
                prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-primary-700
                prose-p:text-gray-700 prose-p:leading-[1.85] prose-p:text-[17px]
                prose-a:text-primary-600 prose-a:font-semibold prose-a:no-underline hover:prose-a:underline
                prose-strong:text-gray-900 prose-strong:font-bold
                prose-ul:my-6 prose-ul:space-y-2
                prose-ol:my-6 prose-ol:space-y-2
                prose-li:text-gray-700 prose-li:text-[17px] prose-li:leading-[1.75]
                prose-blockquote:border-l-4 prose-blockquote:border-primary-400 prose-blockquote:bg-primary-50 prose-blockquote:rounded-r-xl prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:not-italic prose-blockquote:text-gray-700
                prose-blockquote:before:content-none prose-blockquote:after:content-none
                prose-table:text-sm prose-table:rounded-xl prose-table:overflow-hidden prose-table:shadow-sm
                prose-th:bg-primary-600 prose-th:text-white prose-th:font-semibold prose-th:py-3 prose-th:px-4
                prose-td:py-2.5 prose-td:px-4 prose-td:border-b prose-td:border-gray-100
                prose-tr:even:bg-gray-50
                prose-hr:border-gray-200 prose-hr:my-10
                prose-code:bg-gray-100 prose-code:text-primary-700 prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
                ">
                <ContentRenderer :value="article" />
              </div>

              <!-- Tags -->
              <div v-if="article.keywords" class="mt-12 pt-8 border-t border-gray-100 flex flex-wrap gap-2">
                <span
                  v-for="tag in article.keywords.split(',').slice(0, 5)"
                  :key="tag"
                  class="text-xs text-primary-700 bg-primary-50 border border-primary-100 px-3 py-1.5 rounded-full font-medium"
                >
                  {{ tag.trim() }}
                </span>
              </div>

              <!-- Author Box -->
              <div class="mt-10 bg-gradient-to-br from-primary-50 to-white border border-primary-100 rounded-2xl p-6 flex gap-5">
                <div class="w-14 h-14 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm">
                  DT
                </div>
                <div>
                  <p class="font-bold text-gray-900 text-base">{{ article.author || 'Driving Team Fahrschule' }}</p>
                  <p class="text-gray-500 text-sm mt-0.5 mb-2">Fahrschule seit 1994 · Zürich & Lachen SZ</p>
                  <p class="text-gray-600 text-sm leading-relaxed">
                    Die Driving Team Fahrschule begleitet Fahrschülerinnen und Fahrschüler durch die gesamte Fahrausbildung – von der Theorieprüfung bis zum Führerschein. Alle Fahrlehrer haben einen eidgenössischen Fachausweis.
                  </p>
                </div>
              </div>

              <!-- Share Buttons -->
              <div class="mt-8 flex flex-wrap items-center gap-3">
                <span class="text-sm font-semibold text-gray-500 mr-1">Teilen:</span>
                <a
                  :href="`https://wa.me/?text=${encodeURIComponent(article.title + ' – ' + articleUrl)}`"
                  target="_blank" rel="noopener noreferrer"
                  class="flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe57] text-white text-sm font-semibold px-4 py-2 rounded-full transition"
                >
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </a>
                <a
                  :href="`mailto:?subject=${encodeURIComponent(article.title)}&body=${encodeURIComponent(articleUrl)}`"
                  class="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 text-white text-sm font-semibold px-4 py-2 rounded-full transition"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  E-Mail
                </a>
                <button
                  @click="copyLink"
                  class="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-4 py-2 rounded-full transition"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  {{ copied ? 'Kopiert!' : 'Link kopieren' }}
                </button>
              </div>
            </article>

            <!-- Sidebar (desktop) -->
            <aside class="hidden lg:block">
              <div class="sticky top-6 space-y-6">

                <!-- Table of Contents -->
                <div v-if="headings.length > 0" class="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                  <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Inhalt</p>
                  <nav class="space-y-1">
                    <a
                      v-for="h in headings"
                      :key="h.id"
                      :href="`#${h.id}`"
                      :class="[
                        'block text-sm py-1 px-2 rounded-lg transition leading-snug',
                        h.level === 2 ? 'font-semibold text-gray-700 hover:text-primary-600 hover:bg-primary-50' : 'font-normal text-gray-500 pl-4 hover:text-primary-600 hover:bg-primary-50'
                      ]"
                    >
                      {{ h.text }}
                    </a>
                  </nav>
                </div>

                <!-- CTA Card -->
                <div class="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-5 text-white">
                  <p class="font-bold text-base mb-2">Jetzt Fahrstunden buchen</p>
                  <p class="text-primary-100 text-sm mb-4 leading-relaxed">Professionelle Fahrausbildung in Zürich und Lachen SZ.</p>
                  <a href="/kontakt/" class="block w-full text-center bg-white text-primary-700 font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-primary-50 transition">
                    Kontakt aufnehmen →
                  </a>
                  <a href="tel:+41444310033" class="block w-full text-center text-primary-100 font-medium text-sm mt-2 hover:text-white transition">
                    📞 +41 44 431 00 33
                  </a>
                </div>

              </div>
            </aside>
          </div>

          <!-- Related Articles -->
          <div v-if="relatedArticles.length > 0" class="mt-16 pt-12 border-t border-gray-100">
            <h2 class="text-2xl font-extrabold text-gray-900 mb-8">Weitere Artikel</h2>
            <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <a
                v-for="related in relatedArticles"
                :key="related.slug"
                :href="`/blog/${related.slug}/`"
                class="group bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md hover:border-primary-200 transition"
              >
                <div class="h-32 bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center text-4xl">
                  {{ categoryEmoji(related.category) }}
                </div>
                <div class="p-5">
                  <span class="text-xs font-bold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-full">{{ related.category || 'Blog' }}</span>
                  <h3 class="font-bold text-gray-900 mt-3 text-sm leading-snug group-hover:text-primary-700 transition line-clamp-3">{{ related.title }}</h3>
                  <p class="text-gray-400 text-xs mt-2">{{ formatDate(related.date) }}</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom CTA -->
      <section class="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-16">
        <div class="section-container text-center max-w-2xl">
          <h2 class="text-2xl md:text-3xl font-extrabold mb-4 text-white">Bereit mit deiner Fahrausbildung zu starten?</h2>
          <p class="text-primary-100 mb-8 text-lg">Die Driving Team Fahrschule begleitet dich von der Theorieprüfung bis zum Führerschein – in Zürich und Lachen SZ.</p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/auto-fahrschule/" class="btn-primary bg-white text-primary-700 hover:bg-primary-50 text-base font-bold px-8 py-3">Auto Fahrschule</a>
            <a href="/kontakt/" class="btn-primary bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary-700 text-base font-bold px-8 py-3">Kontakt aufnehmen</a>
          </div>
        </div>
      </section>
    </div>

    <!-- 404 -->
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
  queryCollection('blog').where('path', '=', `/blog/${slug}`).first()
)

if (!article.value) {
  // During prerendering this throw is caught by failOnError:false
  // In SSR/CSR it shows the 404 template below
  if (import.meta.server && !import.meta.prerender) {
    throw createError({ statusCode: 404, message: 'Artikel nicht gefunden' })
  }
}

const { data: allArticles } = await useAsyncData('blog-all-for-related', () =>
  queryCollection('blog').select('title', 'slug', 'date', 'category').all()
)

const relatedArticles = computed(() => {
  if (!allArticles.value || !article.value) return []
  return allArticles.value
    .filter(a => a.slug !== article.value!.slug)
    .slice(0, 3)
})

const articleUrl = computed(() =>
  `https://drivingteam.ch/blog/${article.value?.slug}/`
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

// Reading progress bar
const readingProgress = ref(0)
const articleRef = ref<HTMLElement | null>(null)
const copied = ref(false)

onMounted(() => {
  const handleScroll = () => {
    const el = articleRef.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    const total = el.offsetHeight
    const scrolled = Math.max(0, -rect.top)
    readingProgress.value = Math.min(100, Math.round((scrolled / total) * 100))
  }
  window.addEventListener('scroll', handleScroll, { passive: true })
  onUnmounted(() => window.removeEventListener('scroll', handleScroll))
})

// Table of contents from headings
const headings = ref<{ id: string; text: string; level: number }[]>([])
onMounted(() => {
  const els = document.querySelectorAll('article h2, article h3')
  headings.value = Array.from(els).map(el => {
    if (!el.id) {
      el.id = el.textContent?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || ''
    }
    return {
      id: el.id,
      text: el.textContent || '',
      level: el.tagName === 'H2' ? 2 : 3,
    }
  })
})

async function copyLink() {
  try {
    await navigator.clipboard.writeText(articleUrl.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {}
}

// JSON-LD
const jsonLd = computed(() => {
  if (!article.value) return []
  const a = article.value
  const url = articleUrl.value
  return [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: a.title,
        description: a.description,
        url,
        datePublished: a.date,
        dateModified: a.dateModified || a.date,
        author: { '@type': 'Organization', name: 'Driving Team Fahrschule', url: 'https://drivingteam.ch' },
        publisher: {
          '@type': 'Organization',
          name: 'Driving Team Fahrschule',
          url: 'https://drivingteam.ch',
          logo: { '@type': 'ImageObject', url: 'https://drivingteam.ch/images/og-image.webp' },
        },
        image: `https://drivingteam.ch${a.ogImage || '/images/og-image.webp'}`,
        inLanguage: a.lang === 'en' ? 'en' : 'de-CH',
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      }),
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://drivingteam.ch/' },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://drivingteam.ch/blog/' },
          { '@type': 'ListItem', position: 3, name: a.title, item: url },
        ],
      }),
    },
  ]
})
useHead({ script: jsonLd })
</script>
