<template>
  <section class="py-16 bg-gradient-to-br from-gray-50 via-white to-blue-50">
    <div class="section-container">
      <div class="text-center mb-12">
        <h2 class="heading-md mb-3 text-gray-900">Unsere Fahrlehrerinnen & Fahrlehrer</h2>
        <p class="text-gray-600 text-lg max-w-2xl mx-auto">Erfahrene Profis, die dich sicher zum Führerschein bringen</p>
      </div>

      <ClientOnly>
        <div class="space-y-3 max-w-4xl mx-auto" ref="listRef">

          <div
            v-for="(instructor, index) in instructors"
            :key="instructor.id"
            class="instructor-item bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            :class="{ 'is-visible': visible }"
            :style="{ animationDelay: `${index * 0.25}s` }"
          >
            <!-- Header/Toggle Button -->
            <button
              @click="toggleInstructor(instructor.id)"
              class="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
            >
              <div class="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary-100 to-blue-100 overflow-hidden flex-shrink-0">
                <NuxtImg
                  v-if="instructor.image"
                  :src="instructor.image"
                  :alt="`${instructor.name}, ${instructor.title} bei Driving Team`"
                  class="w-full h-full object-cover"
                  width="128"
                  height="128"
                  loading="lazy"
                />
                <div v-else class="w-full h-full flex items-center justify-center text-xl">👨‍🏫</div>
              </div>
              <div class="flex-grow min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <h3 class="text-lg font-bold text-gray-900">{{ instructor.name.split(' ')[0] }}</h3>
                  <span class="bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap">
                    seit {{ instructor.yearsExperience }} Jahren
                  </span>
                  <!-- Diplom-Labels (kompakt, immer sichtbar) -->
                  <span
                    v-for="diploma in instructor.diplomas"
                    :key="diploma.category"
                    class="bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer hover:bg-amber-100 transition"
                    :title="diploma.title"
                    @click.stop="diploma.image ? openLightbox(diploma) : null"
                  >🎓 Kat. {{ diploma.category }}</span>
                </div>
                <p class="text-sm text-primary-600 font-semibold">{{ instructor.title }}</p>
              </div>
              <span
                class="text-primary-600 transition-transform duration-300 flex-shrink-0"
                :class="{ 'rotate-180': openInstructors.includes(instructor.id) }"
              >▼</span>
            </button>

            <!-- Expanded Content -->
            <Transition
              enter-active-class="transition-all duration-300 ease-out"
              enter-from-class="opacity-0 max-h-0"
              enter-to-class="opacity-100 max-h-screen"
              leave-active-class="transition-all duration-200 ease-in"
              leave-from-class="opacity-100 max-h-screen"
              leave-to-class="opacity-0 max-h-0"
            >
              <div
                v-if="openInstructors.includes(instructor.id)"
                class="border-t border-gray-100 px-6 py-6 bg-gradient-to-br from-gray-50 to-blue-50 space-y-6"
              >
                <p class="text-gray-700 text-sm leading-relaxed">{{ instructor.bio }}</p>

                <div class="grid md:grid-cols-3 gap-6">
                  <div>
                    <h4 class="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                      <span>🎯</span> Spezialisierungen
                    </h4>
                    <div class="flex flex-wrap gap-2">
                      <span
                        v-for="specialty in instructor.specialties"
                        :key="specialty"
                        class="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium"
                      >✓ {{ specialty }}</span>
                    </div>
                  </div>

                  <div>
                    <h4 class="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                      <span>📊</span> Statistik
                    </h4>
                    <div class="space-y-2">
                      <div>
                        <p class="text-xs text-gray-600">Fahrstunden</p>
                        <p class="text-lg font-bold text-primary-600">{{ instructor.lessonsGiven }}+</p>
                      </div>
                      <div>
                        <p class="text-xs text-gray-600">Erfolgsquote</p>
                        <p class="text-lg font-bold text-green-600">{{ instructor.successRate }}%</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 class="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                      <span>🗣️</span> Sprachen
                    </h4>
                    <p class="text-gray-700 text-sm">{{ instructor.languages.join(', ') }}</p>
                  </div>
                </div>

                <!-- Diplome -->
                <div v-if="instructor.diplomas && instructor.diplomas.length">
                  <h4 class="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                    <span>🎓</span> Eidg. anerkannte Diplome
                  </h4>
                  <div class="flex flex-wrap gap-3">
                    <div
                      v-for="diploma in instructor.diplomas"
                      :key="diploma.category"
                      class="flex items-center gap-2 bg-white border border-amber-200 rounded-xl px-3 py-2 shadow-sm"
                      :class="diploma.image ? 'cursor-pointer hover:shadow-md hover:border-amber-400 transition' : ''"
                      @click="diploma.image ? openLightbox(diploma) : null"
                    >
                      <!-- Thumbnail: quadratisch, passt sich Hoch- und Querformat an -->
                      <div v-if="diploma.image" class="w-14 h-14 rounded-lg overflow-hidden border border-amber-200 flex-shrink-0 bg-amber-50 flex items-center justify-center">
                        <img :src="diploma.image" :alt="diploma.title" class="max-w-full max-h-full object-contain" loading="lazy" />
                      </div>
                      <div v-else class="w-14 h-14 rounded-lg border border-amber-200 flex-shrink-0 bg-amber-50 flex items-center justify-center text-2xl">
                        📜
                      </div>
                      <div>
                        <p class="text-xs font-bold text-amber-800">Kat. {{ diploma.category }}</p>
                        <p class="text-xs text-gray-600 leading-tight max-w-32">{{ diploma.title }}</p>
                        <p v-if="diploma.year" class="text-xs text-gray-400">{{ diploma.year }}</p>
                        <p v-if="diploma.image" class="text-xs text-amber-600 mt-0.5">↗ vergrössern</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="bg-white p-4 rounded-lg border-l-4 border-primary-600">
                  <h4 class="font-semibold text-gray-900 mb-2 text-sm flex items-center gap-2">
                    <span>💡</span> Unterrichtsphilosophie
                  </h4>
                  <p class="text-gray-700 text-sm italic">{{ instructor.teachingStyle }}</p>
                </div>

                <a
                  :href="getBookingUrl(instructor.name)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="block w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-lg transition-all text-center"
                >
                  📅 Mit {{ instructor.name }} fahren
                </a>
              </div>
            </Transition>
          </div>

        </div>
      </ClientOnly>
    </div>

    <!-- Lightbox Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
          <div
            v-if="lightboxDiploma"
            class="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4"
            @click.self="closeLightbox"
          >
            <div
              class="relative bg-white rounded-2xl shadow-2xl p-6 w-full"
              :class="lightboxDiploma.landscape ? 'max-w-2xl' : 'max-w-lg'"
            >
              <button
                @click="closeLightbox"
                class="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition"
              >✕</button>
              <div class="text-center mb-4">
                <p class="font-bold text-gray-900">{{ lightboxDiploma.title }}</p>
                <p v-if="lightboxDiploma.year" class="text-sm text-gray-500">{{ lightboxDiploma.year }}</p>
              </div>
              <img
                :src="lightboxDiploma.image"
                :alt="lightboxDiploma.title"
                class="w-full rounded-xl border border-gray-200 shadow"
              />
            </div>
          </div>
      </Transition>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useBookingUrl } from '~/composables/useBookingUrl'
import type { Diploma, Instructor } from '~/instructor-data'

defineProps<{ instructors: Instructor[] }>()

const route = useRoute()
const { getInstructorBookingUrl } = useBookingUrl()
const openInstructors = ref<string[]>([])
const listRef = ref<HTMLElement | null>(null)
const visible = ref(false)
const lightboxDiploma = ref<Diploma | null>(null)

onMounted(() => {
  nextTick(() => {
    const target = listRef.value
    if (!target) {
      visible.value = true
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          visible.value = true
          observer.disconnect()
        }
      },
      { threshold: 0.3, rootMargin: '0px 0px -100px 0px' }
    )
    observer.observe(target)
  })
})

const toggleInstructor = (id: string) => {
  const index = openInstructors.value.indexOf(id)
  if (index > -1) {
    openInstructors.value.splice(index, 1)
  } else {
    openInstructors.value.push(id)
  }
}

const openLightbox = (diploma: Diploma) => {
  lightboxDiploma.value = diploma
}

const closeLightbox = () => {
  lightboxDiploma.value = null
}

const getBookingUrl = (name: string): string => {
  const match = route.path.match(/fahrschule-([a-z]+)/)
  const location = match ? match[1] : ''
  const firstName = name.split(' ')[0].toLowerCase()
  return location
    ? getInstructorBookingUrl(location, firstName)
    : 'https://www.simy.ch/booking/availability/driving-team'
}
</script>

<style scoped>
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(60px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.instructor-item {
  opacity: 0;
  transform: translateY(60px);
}

.instructor-item.is-visible {
  animation: slideInUp 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
</style>
