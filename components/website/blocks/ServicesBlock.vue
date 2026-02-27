<template>
  <section class="py-16 sm:py-24 bg-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-12">
        <h2 class="text-4xl font-bold mb-4">{{ content.title }}</h2>
        <p class="text-gray-600 max-w-2xl mx-auto">{{ content.description }}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div
          v-for="service in (content.services || [])"
          :key="service.id"
          class="border border-gray-200 rounded-lg p-8 hover:shadow-lg hover:border-blue-300 transition"
        >
          <div class="flex items-start justify-between mb-3">
            <div>
              <h3 class="text-xl font-bold text-gray-900">{{ service.name }}</h3>
              <p class="text-sm text-gray-600 mt-1">{{ service.duration_minutes }} Minuten</p>
            </div>
            <span v-if="service.badge" class="inline-block bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full">
              {{ service.badge }}
            </span>
          </div>

          <p class="text-gray-700 mb-6">{{ service.description }}</p>

          <div class="flex justify-between items-center">
            <span class="text-2xl font-bold text-blue-600">
              €{{ (service.price / 100).toFixed(2) }}
            </span>
            <a
              :href="`/book?service_id=${service.id}`"
              class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Buchen
            </a>
          </div>
        </div>
      </div>

      <!-- Hidden SEO Content -->
      <div class="mt-12 hidden">
        <h3>{{ content.title }} - Häufig gestellte Fragen:</h3>
        <p>
          Unsere {{ content.title }} werden von erfahrenen Fahrlehrern durchgeführt.
          Wir bieten individuelles Training, flexible Zeitplanung und moderne Fahrzeuge.
          Jede {{ content.title }} ist personalisiert auf deine Bedürfnisse abgestimmt.
        </p>
      </div>
    </div>

    <!-- Schema.org Service -->
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Service",
        "name": {{ content.title }},
        "description": {{ content.description }},
        "provider": {
          "@type": "LocalBusiness",
          "name": {{ tenant.name }}
        },
        "hasOfferCatalog": {
          "@type": "OfferCatalog",
          "name": {{ content.title }},
          "itemListElement": {{ content.services?.map((s: any) => ({
            "@type": "Service",
            "name": s.name,
            "description": s.description,
            "offers": {
              "@type": "Offer",
              "price": (s.price / 100).toFixed(2),
              "priceCurrency": "EUR"
            }
          })) }}
        }
      }
    </script>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  content: any
  tenant: any
}>()
</script>
