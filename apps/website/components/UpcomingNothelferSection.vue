<template>
  <section v-if="status !== 'pending' && courses.length > 0" class="bg-white py-10 border-b border-gray-100">
    <div class="section-container">
      <div class="max-w-3xl mx-auto">
        <h2 class="text-xl font-bold text-gray-900 mb-1">{{ title }}</h2>
        <p class="text-sm text-gray-500 mb-6">{{ subtitle }}</p>

        <div class="grid sm:grid-cols-2 gap-4">
          <div
            v-for="course in courses"
            :key="course.id"
            class="border border-gray-200 rounded-xl p-5 flex flex-col gap-3 hover:border-red-300 hover:shadow-sm transition"
          >
            <p v-if="showLocation && course.city" class="text-xs font-semibold text-red-600 uppercase tracking-wide">
              {{ course.city }}
            </p>

            <ul class="space-y-1">
              <li
                v-for="(session, idx) in course.sessions"
                :key="idx"
                class="flex items-center gap-2 text-sm"
              >
                <span class="text-red-500 font-bold text-xs w-5 text-center">{{ idx + 1 }}</span>
                <span class="font-medium text-gray-900">{{ session.date }}</span>
                <span class="text-gray-400">·</span>
                <span class="text-gray-600">{{ session.time }}</span>
              </li>
            </ul>

            <div class="flex items-center justify-between pt-2 border-t border-gray-100">
              <span
                v-if="course.hasSpotCount !== false"
                class="text-xs font-semibold px-2 py-1 rounded-full"
                :class="course.spotsRemaining <= 1
                  ? 'bg-red-50 text-red-700'
                  : course.spotsRemaining <= 3
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-green-50 text-green-700'"
              >
                {{ course.spotsRemaining === 0 ? 'Ausgebucht' : `${course.spotsRemaining} Platz${course.spotsRemaining === 1 ? '' : 'plätze'} frei` }}
              </span>
              <span v-else class="text-xs font-semibold px-2 py-1 rounded-full bg-green-50 text-green-700">
                Plätze verfügbar
              </span>
              <span v-if="course.priceChf" class="text-sm font-bold text-gray-900">CHF {{ course.priceChf }}.–</span>
            </div>

            <a
              v-if="course.spotsRemaining > 0"
              :href="course.bookingUrl || bookingFallbackUrl"
              class="inline-flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-semibold text-sm text-center py-2 px-4 rounded-xl transition"
            >
              Jetzt buchen →
            </a>
            <span v-else class="text-center text-xs text-gray-400 py-1">Ausgebucht — andere Termine verfügbar</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section v-else-if="status === 'pending'" class="bg-white py-10 border-b border-gray-100">
    <div class="section-container">
      <div class="max-w-3xl mx-auto">
        <div class="h-6 w-64 bg-gray-100 rounded animate-pulse mb-3" />
        <div class="h-4 w-48 bg-gray-100 rounded animate-pulse mb-6" />
        <div class="flex gap-3">
          <div v-for="i in 3" :key="i" class="h-28 flex-1 rounded-xl bg-gray-100 animate-pulse" />
        </div>
      </div>
    </div>
  </section>

  <section v-else class="bg-white py-10 border-b border-gray-100">
    <div class="section-container">
      <div class="max-w-3xl mx-auto text-center">
        <h2 class="text-xl font-bold text-gray-900 mb-2">{{ title }}</h2>
        <p class="text-sm text-gray-500 mb-6">Aktuelle Termine konnten nicht geladen werden. Buchung direkt beim Anbieter:</p>
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            v-if="location === 'all' || location === 'altstetten'"
            href="/nothelferkurs-buchen/nothelfer/"
            class="inline-flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition"
          >
            Zürich-Altstetten buchen
          </a>
          <a
            v-if="location === 'all' || location === 'lachen'"
            href="/nothelferkurs-buchen/flying/"
            class="inline-flex items-center justify-center bg-red-700 hover:bg-red-800 text-white font-semibold py-3 px-6 rounded-xl transition"
          >
            Lachen buchen
          </a>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { UpcomingPgsCourse } from '~/server/api/courses/upcoming-pgs.get'
import { buildCourseSchema, type CourseSchemaMeta } from '~/utils/build-course-schema'

const props = defineProps<{
  location: 'altstetten' | 'lachen' | 'all'
  title: string
  subtitle: string
  fetchKey: string
  bookingFallbackUrl: string
  courseName: string
  pageUrl: string
  schemaMeta: Omit<CourseSchemaMeta, 'name' | 'url'>
  showLocation?: boolean
}>()

const { data, status } = useFetch<{ courses: UpcomingPgsCourse[] }>(
  '/api/courses/upcoming-nothelfer',
  {
    query: computed(() => ({ location: props.location })),
    key: props.fetchKey,
  },
)

const courses = computed(() => data.value?.courses ?? [])

useHead(computed(() => {
  const schema = buildCourseSchema(
    {
      name: props.courseName,
      url: props.pageUrl,
      ...props.schemaMeta,
    },
    courses.value,
  )

  return {
    script: [{
      type: 'application/ld+json',
      innerHTML: JSON.stringify(schema),
      key: `${props.fetchKey}-jsonld`,
    }],
  }
}))
</script>
