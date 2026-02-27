<template>
  <div>
    <Head>
      <Title>{{ categoryData.title }} | Driving Team Zürich</Title>
      <Meta name="description" :content="`${categoryData.shortDesc} in Zürich. Professionelle Fahrschule mit erfahrenen Fahrlehrern.`" />
      <Meta property="og:title" :content="categoryData.title" />
      <Meta property="og:description" :content="categoryData.shortDesc" />
      <Link rel="canonical" :href="`https://drivingteam.ch/categories/${slug}`" />
    </Head>

    <!-- Hero Section -->
    <section class="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-16 md:py-24">
      <div class="section-container">
        <div class="max-w-3xl">
          <h1 class="heading-lg text-white mb-6">{{ categoryData.title }}</h1>
          <p class="text-xl text-blue-100 mb-8">{{ categoryData.description }}</p>
          <button @click="goToBooking" class="btn-primary bg-white text-blue-600 hover:bg-blue-50 text-lg">
            ✨ Jetzt Termin buchen
          </button>
        </div>
      </div>
    </section>

    <!-- Highlights/Benefits -->
    <section class="section-container">
      <h2 class="heading-md mb-12">Was wir bieten</h2>
      <div class="grid md:grid-cols-2 gap-6 mb-16">
        <div v-for="(highlight, idx) in categoryData.highlights" :key="idx" class="flex gap-4">
          <span class="text-3xl flex-shrink-0">✓</span>
          <div>
            <p class="text-lg text-gray-900">{{ highlight }}</p>
          </div>
        </div>
      </div>
      <div class="text-center">
        <button @click="goToBooking" class="btn-primary">
          Termin reservieren
        </button>
      </div>
    </section>

    <!-- Process Steps -->
    <section class="bg-gray-50 py-16">
      <div class="section-container">
        <h2 class="heading-md mb-12 text-center">Dein Weg zum Erfolg</h2>
        
        <div class="space-y-8 max-w-4xl mx-auto">
          <div v-for="(step, idx) in categoryData.steps" :key="idx" class="bg-white rounded-lg p-8 border-l-4 border-blue-600 shadow-sm hover:shadow-md transition">
            <div class="flex items-start gap-6">
              <div class="flex-shrink-0">
                <div class="flex items-center justify-center h-12 w-12 rounded-full bg-blue-600 text-white font-bold text-lg">
                  {{ idx + 1 }}
                </div>
              </div>
              <div class="flex-1">
                <h3 class="heading-sm mb-2">{{ step.title }}</h3>
                <p class="text-gray-600 mb-4">{{ step.desc }}</p>
                <button @click="goToBooking" class="text-blue-600 font-semibold hover:text-blue-700">
                  Los geht's →
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="text-center mt-12">
          <button @click="goToBooking" class="btn-primary text-lg">
            🚀 Jetzt starten!
          </button>
        </div>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="section-container">
      <h2 class="heading-md mb-12 text-center">Häufig gestellte Fragen</h2>
      <div class="max-w-3xl mx-auto space-y-4 mb-12">
        <details v-for="(faq, idx) in categoryData.faqs" :key="idx" class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-md transition group">
          <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
            {{ faq.q }}
            <span class="text-gray-400 group-open:rotate-180 transition">▼</span>
          </summary>
          <p class="text-gray-600 mt-4">{{ faq.a }}</p>
        </details>
      </div>

      <div class="bg-blue-50 border-2 border-blue-200 rounded-lg p-8 text-center">
        <p class="text-lg text-gray-900 mb-4">Weitere Fragen? Wir helfen gerne weiter!</p>
        <a href="tel:+41444310033" class="btn-primary">
          📞 Jetzt anrufen: +41 44 431 00 33
        </a>
      </div>
    </section>

    <!-- Why Choose Us -->
    <section class="bg-gray-50 py-16">
      <div class="section-container">
        <h2 class="heading-md mb-12 text-center">Warum Driving Team?</h2>
        <div class="grid md:grid-cols-3 gap-8">
          <div class="bg-white rounded-lg p-8 shadow-sm">
            <p class="text-4xl mb-4">🏆</p>
            <h3 class="font-bold text-lg mb-2">Erfahrene Fahrlehrer</h3>
            <p class="text-gray-600">Alle mit eidgenössischem Fachausweis und langjähriger Erfahrung</p>
          </div>
          <div class="bg-white rounded-lg p-8 shadow-sm">
            <p class="text-4xl mb-4">⚡</p>
            <h3 class="font-bold text-lg mb-2">Flexible Zeiten</h3>
            <p class="text-gray-600">2-4 Fahrstunden pro Woche, je nach deinem Tempo</p>
          </div>
          <div class="bg-white rounded-lg p-8 shadow-sm">
            <p class="text-4xl mb-4">✅</p>
            <h3 class="font-bold text-lg mb-2">100% Erfolgsquote</h3>
            <p class="text-gray-600">Systematische Vorbereitung und moderne Fahrzeuge</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="bg-blue-600 text-white py-16">
      <div class="section-container text-center">
        <h2 class="heading-md mb-6 text-white">Bereit zu starten?</h2>
        <p class="text-xl text-blue-100 mb-8">Reserviere jetzt deinen Termin – kein Risiko, unverbindliches Angebot!</p>
        <button @click="goToBooking" class="btn-primary bg-white text-blue-600 hover:bg-blue-50 text-lg">
          📅 Termin buchen
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { categoryDetails } from '~/category-data'

const route = useRoute()
const router = useRouter()
const slug = route.params.slug as string

// Get category data
const categoryData = computed(() => {
  return categoryDetails[slug as keyof typeof categoryDetails] || categoryDetails.auto
})

// Go to booking with category parameter
const goToBooking = () => {
  window.location.href = `/booking?category=${slug}`
}
</script>
