<template>
  <!-- Kurse vorhanden -->
  <section v-if="status !== 'pending' && courses.length > 0" class="bg-white py-10 border-b border-gray-100">
    <div class="section-container">
      <div class="max-w-3xl mx-auto">
        <h2 class="text-xl font-bold text-gray-900 mb-1">{{ title }}</h2>
        <p class="text-sm text-gray-500 mb-6">{{ subtitle }}</p>

        <div class="grid sm:grid-cols-2 gap-4">
          <div
            v-for="course in courses"
            :key="course.id"
            class="border border-gray-200 rounded-xl p-5 flex flex-col gap-3 hover:border-primary-300 hover:shadow-sm transition"
          >
            <ul class="space-y-1">
              <li
                v-for="(session, idx) in course.sessions"
                :key="idx"
                class="flex items-center gap-2 text-sm"
              >
                <span class="text-primary-500 font-bold text-xs w-5 text-center">{{ idx + 1 }}</span>
                <span class="font-medium text-gray-900">{{ session.date }}</span>
                <span class="text-gray-400">·</span>
                <span class="text-gray-600">{{ session.time }}</span>
              </li>
            </ul>

            <div class="flex items-center justify-between pt-2 border-t border-gray-100">
              <span
                class="text-xs font-semibold px-2 py-1 rounded-full"
                :class="course.spotsRemaining <= 1
                  ? 'bg-red-50 text-red-700'
                  : course.spotsRemaining <= 2
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-green-50 text-green-700'"
              >
                {{ course.spotsRemaining === 0 ? 'Ausgebucht' : `${course.spotsRemaining} Platz${course.spotsRemaining === 1 ? '' : 'plätze'} frei` }}
              </span>
              <span v-if="course.priceChf" class="text-sm font-bold text-gray-900">CHF {{ course.priceChf }}.–</span>
            </div>

            <a
              v-if="course.spotsRemaining > 0"
              :href="`https://app.simy.ch/customer/courses/driving-team/?courseId=${course.id}`"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-primary text-sm text-center py-2"
            >
              Platz sichern →
            </a>
            <span v-else class="text-center text-xs text-gray-400 py-1">Ausgebucht — andere Termine verfügbar</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Loading skeleton -->
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

  <!-- Fallback: keine Kurse → Warteliste -->
  <CategoryWaitlistForm
    v-else
    :category-code="categoryCode"
    :category-label="categoryLabel"
    tenant-id="64259d68-195a-4c68-8875-f1b44d962830"
  />
</template>

<script setup lang="ts">
import type { UpcomingPgsCourse } from '~/server/api/courses/upcoming-pgs.get'

const props = defineProps<{
  category: string
  location?: string
  title: string
  subtitle: string
  categoryCode: string
  categoryLabel: string
  fetchKey: string
  // Optional: enables dynamic JSON-LD CourseInstance injection
  courseName?: string
  pageUrl?: string
}>()

const { data, status } = useFetch<{ courses: UpcomingPgsCourse[] }>(
  '/api/courses/upcoming-pgs',
  {
    query: computed(() => ({
      category: props.category,
      ...(props.location ? { location: props.location } : {}),
    })),
    key: props.fetchKey,
  },
)

const courses = computed(() => data.value?.courses ?? [])

// Dynamic JSON-LD: inject CourseInstance entries for each upcoming course
useHead(computed(() => {
  if (!props.courseName || !props.pageUrl || courses.value.length === 0) return {}

  const instances = courses.value.map((course) => {
    const sortedSessions = [...course.sessions].sort((a, b) =>
      a.startIso.localeCompare(b.startIso),
    )
    const startDate = sortedSessions[0]?.startIso?.slice(0, 10)
    const endDate = sortedSessions[sortedSessions.length - 1]?.startIso?.slice(0, 10)

    const availability =
      course.spotsRemaining > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/SoldOut'

    const instance: Record<string, unknown> = {
      '@type': 'CourseInstance',
      courseMode: 'onsite',
      startDate,
      endDate,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'CHF',
        availability,
        url: `https://app.simy.ch/customer/courses/driving-team/?courseId=${course.id}`,
        ...(course.priceChf ? { price: String(course.priceChf) } : {}),
      },
    }
    return instance
  })

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: props.courseName,
    url: props.pageUrl,
    provider: {
      '@type': 'Organization',
      name: 'Driving Team Fahrschule',
      url: 'https://drivingteam.ch',
    },
    hasCourseInstance: instances,
  }

  return {
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify(schema),
        key: `${props.fetchKey}-jsonld`,
      },
    ],
  }
}))
</script>
