<template>
  <section class="py-16 sm:py-24 bg-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-12">
        <h2 class="text-4xl font-bold mb-4">{{ content.title }}</h2>
        <p class="text-gray-600">{{ content.description }}</p>
      </div>

      <div class="relative">
        <!-- Carousel Container -->
        <div class="overflow-hidden">
          <div
            class="flex transition-transform duration-300 ease-out"
            :style="{ transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)` }"
          >
            <div
              v-for="testimonial in content.testimonials"
              :key="testimonial.id"
              :style="{ width: `${100 / itemsPerView}%` }"
              class="flex-shrink-0 px-4"
            >
              <div class="bg-gray-50 rounded-lg p-8 h-full border border-gray-200">
                <div class="flex items-center mb-4">
                  <div class="flex text-yellow-400">
                    <span v-for="i in 5" :key="i">⭐</span>
                  </div>
                </div>
                <p class="text-gray-700 mb-4 line-clamp-4">{{ testimonial.text }}</p>
                <p class="font-semibold text-gray-900">{{ testimonial.author }}</p>
                <p class="text-sm text-gray-600">{{ testimonial.date }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation Buttons -->
        <button
          @click="prevSlide"
          class="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 bg-blue-500 text-white p-3 rounded-full hover:bg-blue-600 transition"
        >
          ←
        </button>
        <button
          @click="nextSlide"
          class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-6 bg-blue-500 text-white p-3 rounded-full hover:bg-blue-600 transition"
        >
          →
        </button>
      </div>

      <!-- Dots -->
      <div class="flex justify-center gap-2 mt-8">
        <button
          v-for="(_, idx) in Math.ceil(content.testimonials.length / itemsPerView)"
          :key="idx"
          @click="currentIndex = idx"
          :class="[
            'w-3 h-3 rounded-full transition',
            currentIndex === idx ? 'bg-blue-600' : 'bg-gray-300'
          ]"
        />
      </div>
    </div>

    <!-- Schema.org Review -->
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "AggregateRating",
        "ratingValue": 4.8,
        "reviewCount": {{ content.testimonials?.length }},
        "bestRating": 5,
        "worstRating": 1
      }
    </script>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

defineProps<{
  content: any
  tenant: any
}>()

const currentIndex = ref(0)
const itemsPerView = computed(() => {
  if (window.innerWidth < 768) return 1
  if (window.innerWidth < 1024) return 2
  return 3
})

const prevSlide = () => {
  currentIndex.value = Math.max(
    0,
    currentIndex.value - 1
  )
}

const nextSlide = () => {
  const maxIndex = Math.ceil(
    (content.testimonials?.length || 0) / itemsPerView.value - 1
  )
  currentIndex.value = Math.min(maxIndex, currentIndex.value + 1)
}
</script>
