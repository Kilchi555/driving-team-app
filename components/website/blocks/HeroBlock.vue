<template>
  <section class="relative min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 overflow-hidden flex items-center">
    <!-- Background Image mit Overlay -->
    <div v-if="content.image_url" class="absolute inset-0">
      <img
        :src="content.image_url"
        :alt="content.headline"
        class="w-full h-full object-cover opacity-20"
      />
    </div>

    <!-- Content -->
    <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
      <div class="max-w-3xl">
        <h1 class="text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight">
          {{ content.headline }}
        </h1>

        <p class="text-xl text-blue-100 mb-8 leading-relaxed">
          {{ content.subheadline }}
        </p>

        <div class="flex gap-4 flex-wrap">
          <a
            :href="content.cta_primary_url || '/book'"
            class="inline-flex items-center px-8 py-4 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition shadow-lg"
          >
            {{ content.cta_primary_text || 'Jetzt buchen' }} →
          </a>

          <a
            v-if="content.cta_secondary_url"
            :href="content.cta_secondary_url"
            class="inline-flex items-center px-8 py-4 border-2 border-white text-white font-bold rounded-lg hover:bg-white hover:text-blue-600 transition"
          >
            {{ content.cta_secondary_text || 'Mehr erfahren' }}
          </a>
        </div>

        <!-- Trust Signals -->
        <div class="mt-12 grid grid-cols-3 gap-4 max-w-md">
          <div class="text-white">
            <div class="text-3xl font-bold">{{ tenant.success_rate || 90 }}%</div>
            <p class="text-sm text-blue-100">Erfolgsquote</p>
          </div>
          <div class="text-white">
            <div class="text-3xl font-bold">{{ tenant.years_experience || 15 }}+</div>
            <p class="text-sm text-blue-100">Jahre Erfahrung</p>
          </div>
          <div class="text-white">
            <div class="text-3xl font-bold">{{ tenant.students_trained || 1000 }}+</div>
            <p class="text-sm text-blue-100">Schüler</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Scroll Indicator -->
    <div class="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
      <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    </div>

    <!-- Schema.org LocalBusiness -->
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": {{ tenant.name }},
        "description": {{ content.headline }},
        "url": {{ tenant.website_url }},
        "telephone": {{ tenant.phone }},
        "address": {
          "@type": "PostalAddress",
          "streetAddress": {{ tenant.street }},
          "addressLocality": {{ tenant.city }},
          "postalCode": {{ tenant.postal_code }},
          "addressCountry": "CH"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": {{ tenant.avg_rating }},
          "reviewCount": {{ tenant.review_count }}
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
