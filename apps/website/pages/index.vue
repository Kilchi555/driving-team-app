<template>
  <div>
    <Head>
      <Title>Fahrschule Zürich | Driving Team - Auto, Motorrad & Lastwagen</Title>
      <Meta name="description" content="Moderne Fahrschule in Zürich. Auto, Motorrad, Taxi & Lastwagen Fahrausbildung. Erfahrene Fahrlehrer, flexible Preise. Jetzt Termin buchen!" />
      <Meta property="og:title" content="Fahrschule Zürich | Driving Team" />
      <Meta property="og:description" content="Moderne Fahrschule für Auto, Motorrad, Taxi & Lastwagen in Zürich" />
      <Meta property="og:type" content="website" />
      <Meta property="og:url" content="https://drivingteam.ch" />
      <Meta name="robots" content="index, follow" />
      <Link rel="canonical" href="https://drivingteam.ch" />
      
      <!-- Structured Data - Organization Schema -->
      <Script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "name": "Driving Team",
          "image": "https://drivingteam.ch/logo.png",
          "description": "Moderne Fahrschule in Zürich für Auto, Motorrad, Taxi & Lastwagen",
          "url": "https://drivingteam.ch",
          "telephone": "+41 44 431 00 33",
          "email": "info@drivingteam.ch",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "Bahnhofstrasse 145",
            "addressLocality": "Zürich",
            "postalCode": "8048",
            "addressCountry": "CH"
          },
          "priceRange": "CHF",
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "reviewCount": "47"
          }
        }
      </Script>
    </Head>

    <!-- Hero Section -->
    <section class="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20 md:py-32">
      <div class="section-container">
        <div class="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 class="heading-lg mb-6 text-white">
              Deine Fahrschule in Zürich
            </h1>
            <p class="text-xl text-blue-100 mb-4">
              Auto, Motorrad, Taxi & Lastwagen Fahrausbildung von erfahrenen Fahrlehrern.
            </p>
            <p class="text-lg text-blue-100 mb-8">
              ⭐ 4.9/5 Sterne · 47+ Bewertungen · 100% Erfolgsquote
            </p>
            <div class="flex flex-col sm:flex-row gap-4">
              <a href="/booking" class="btn-primary bg-white text-blue-600 hover:bg-blue-50">
                Termin buchen
              </a>
              <a href="tel:+41444310033" class="btn-secondary border-2 border-white">
                📞 Jetzt anrufen
              </a>
            </div>
          </div>
          <div class="hidden md:block">
            <div class="bg-white rounded-lg p-8 shadow-lg">
              <div class="space-y-4">
                <div class="flex items-center gap-3">
                  <span class="text-3xl">🚗</span>
                  <div>
                    <p class="font-bold">Auto Fahrschule</p>
                    <p class="text-sm text-gray-600">Kategorie B, A1</p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-3xl">🏍️</span>
                  <div>
                    <p class="font-bold">Motorrad Fahrschule</p>
                    <p class="text-sm text-gray-600">Kategorie A, A2, AM</p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-3xl">🚚</span>
                  <div>
                    <p class="font-bold">Lastwagen Fahrschule</p>
                    <p class="text-sm text-gray-600">Kategorie C, C1</p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-3xl">🚕</span>
                  <div>
                    <p class="font-bold">Taxi Fahrschule</p>
                    <p class="text-sm text-gray-600">BPT Zertifizierung</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Categories Section -->
    <section class="section-container">
      <h2 class="heading-md mb-12 text-center">Unsere Fahrschule-Kategorien</h2>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div v-for="cat in categories.slice(0, 4)" :key="cat.slug" class="bg-white border-2 border-gray-100 rounded-lg p-6 hover:shadow-lg transition">
          <p class="text-5xl mb-4">{{ cat.icon }}</p>
          <h3 class="font-bold text-xl mb-2">{{ cat.name }}</h3>
          <p class="text-gray-600 text-sm">{{ cat.description }}</p>
          <NuxtLink :to="`/categories/${cat.slug}`" class="text-blue-600 font-semibold mt-4 inline-block hover:underline">
            Mehr erfahren →
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Benefits Section -->
    <section class="bg-gray-50 py-16">
      <div class="section-container">
        <h2 class="heading-md mb-12 text-center">Warum Driving Team?</h2>
        <div class="grid md:grid-cols-3 gap-8">
          <div class="bg-white rounded-lg p-8 shadow-sm">
            <p class="text-4xl mb-4">🏆</p>
            <h3 class="font-bold text-lg mb-2">Erfahrene Fahrlehrer</h3>
            <p class="text-gray-600">Alle unsere Fahrlehrer haben eine eidgenössische Ausbildung und langjährige Erfahrung in der Fahrausbildung.</p>
          </div>
          <div class="bg-white rounded-lg p-8 shadow-sm">
            <p class="text-4xl mb-4">⚡</p>
            <h3 class="font-bold text-lg mb-2">Flexibles Lernen</h3>
            <p class="text-gray-600">2-4 Fahrstunden pro Woche, je nach deinem Tempo. Mit privaten Lernfahrten schneller zum Erfolg.</p>
          </div>
          <div class="bg-white rounded-lg p-8 shadow-sm">
            <p class="text-4xl mb-4">✅</p>
            <h3 class="font-bold text-lg mb-2">100% Erfolgsquote</h3>
            <p class="text-gray-600">Systematische Vorbereitung, moderne Fahrzeuge und individuelle Unterstützung für deine Prüfung.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Testimonials Section -->
    <section class="section-container">
      <h2 class="heading-md mb-12 text-center">Das sagen unsere Schüler</h2>
      <div class="grid md:grid-cols-3 gap-8">
        <div v-for="(testimonial, idx) in testimonials" :key="idx" class="bg-white border border-gray-200 rounded-lg p-6">
          <p class="text-yellow-500 mb-2">{{ '⭐'.repeat(testimonial.rating) }}</p>
          <p class="text-gray-700 mb-4 italic">{{ testimonial.text }}</p>
          <p class="font-semibold text-gray-900">– {{ testimonial.author }}</p>
        </div>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="bg-gray-50 py-16">
      <div class="section-container">
        <h2 class="heading-md mb-12 text-center">Häufig gestellte Fragen</h2>
        <div class="max-w-3xl mx-auto space-y-4">
          <details v-for="(faq, idx) in faqItems.slice(0, 5)" :key="idx" class="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-md transition">
            <summary class="font-semibold text-lg text-gray-900 flex justify-between items-center">
              {{ faq.question }}
              <span>+</span>
            </summary>
            <p class="text-gray-600 mt-4">{{ faq.answer }}</p>
          </details>
        </div>
        <div class="text-center mt-12">
          <NuxtLink to="/faq" class="btn-primary">
            Alle FAQs ansehen
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="bg-blue-600 text-white py-16">
      <div class="section-container text-center">
        <h2 class="heading-md mb-6 text-white">Bereit für deine Fahrausbildung?</h2>
        <p class="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
          Kontaktiere uns noch heute und buche deinen ersten Termin. Kein Risiko, unverbindliches Angebot!
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <button class="btn-primary bg-white text-blue-600 hover:bg-blue-50">
            Termin buchen
          </button>
          <a href="tel:+41444310033" class="btn-secondary border-2 border-white text-white hover:bg-white hover:text-blue-600">
            📞 +41 44 431 00 33
          </a>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { categories, testimonials, faqItems } from '../data'
</script>
