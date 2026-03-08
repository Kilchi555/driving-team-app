<template>
  <section class="section-container py-6">
    <div class="mb-12">
      <h2 class="heading-md mb-4 text-center text-gray-900">{{ title }}</h2>
      <p class="text-center text-gray-600 text-lg max-w-3xl mx-auto">{{ description }}</p>
    </div>

    <!-- Two Column Grid: Voraussetzungen & Details -->
    <div class="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-8">
      <!-- Voraussetzungen Card -->
      <div class="group relative">
        <div class="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl blur-lg opacity-0 group-hover:opacity-60 transition duration-300 transform group-hover:scale-105"></div>
        <div class="relative bg-white rounded-2xl p-8 shadow-lg border border-green-100 hover:border-green-300 transition-all duration-300 transform group-hover:-translate-y-1">
          <!-- Header mit Icon -->
          <div class="flex items-center gap-3 mb-6">
            <div class="text-4xl">✅</div>
            <h3 class="font-bold text-gray-900 text-xl">Voraussetzungen</h3>
          </div>

          <!-- List Items -->
          <ul class="space-y-4">
            <li v-for="(req, i) in requirements" :key="i" class="flex items-start gap-3 group/item">
              <span class="text-green-600 font-bold text-lg mt-0.5 group-hover/item:scale-125 transition-transform">✓</span>
              <span class="text-gray-700 text-sm leading-relaxed">{{ req }}</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Details Card -->
      <div class="group relative">
        <div class="absolute inset-0 bg-gradient-to-br from-blue-500 to-primary-600 rounded-2xl blur-lg opacity-0 group-hover:opacity-60 transition duration-300 transform group-hover:scale-105"></div>
        <div class="relative bg-white rounded-2xl p-8 shadow-lg border border-blue-100 hover:border-blue-300 transition-all duration-300 transform group-hover:-translate-y-1">
          <!-- Header mit Icon -->
          <div class="flex items-center gap-3 mb-6">
            <div class="text-4xl">📋</div>
            <h3 class="font-bold text-gray-900 text-xl">Details</h3>
          </div>

          <!-- List Items -->
          <ul class="space-y-4">
            <li v-for="(detail, i) in details" :key="i" class="flex items-start gap-3 group/item">
              <span class="text-primary-600 font-bold text-lg mt-0.5 group-hover/item:scale-125 transition-transform">→</span>
              <span class="text-gray-700 text-sm leading-relaxed" v-html="detail"></span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Important Notice Box -->
    <div class="max-w-5xl mx-auto bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-400 rounded-2xl p-6 md:p-8 shadow-md hover:shadow-lg transition-shadow">
      <div class="flex items-start gap-3 md:gap-4">
        <div class="text-3xl md:text-4xl flex-shrink-0">⚠️</div>
        <div>
          <h3 class="font-bold text-gray-900 mb-2 md:mb-3 text-base md:text-lg">Wichtig!</h3>
          <p v-for="(note, i) in importantNotes" :key="i" class="text-gray-700 text-xs md:text-sm mb-2 last:mb-0 leading-relaxed">{{ note }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface CourseOverviewProps {
  title: string
  description: string
  requirements: string[]
  details: string[]
  importantNotes: string[]
  stats?: {
    requirements: string | number
    details: string | number
    hours: string | number
  }
}

const props = withDefaults(defineProps<CourseOverviewProps>(), {
  stats: () => ({
    requirements: '4',
    details: '4',
    hours: '12h'
  })
})

const requirementsCount = computed(() => props.requirements.length)
const detailsCount = computed(() => props.details.length)
</script>

<style scoped>
/* Smooth transitions */
li {
  transition: all 0.2s ease;
}

li:hover {
  transform: translateX(4px);
}
</style>
