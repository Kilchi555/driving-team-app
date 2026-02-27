<template>
  <section class="py-16 sm:py-24 bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-12">
        <h2 class="text-4xl font-bold mb-4">{{ content.title }}</h2>
        <p class="text-gray-600">{{ content.description }}</p>
      </div>

      <div class="space-y-3 max-w-2xl mx-auto">
        <details
          v-for="(item, idx) in content.items"
          :key="idx"
          class="border border-gray-200 rounded-lg bg-white hover:shadow-md transition"
        >
          <summary class="cursor-pointer px-6 py-4 font-semibold text-gray-900 flex items-center justify-between">
            <span>{{ item.question }}</span>
            <span class="text-gray-400">+</span>
          </summary>
          <div class="px-6 py-4 border-t border-gray-200 text-gray-700">
            <p>{{ item.answer }}</p>
          </div>
        </details>
      </div>
    </div>

    <!-- Schema.org FAQ -->
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": {{ content.items?.map((item: any) => ({
          "@type": "Question",
          "name": item.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": item.answer
          }
        })) }}
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
