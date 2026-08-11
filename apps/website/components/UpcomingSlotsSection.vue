<template>
  <section
    v-if="status === 'pending' || slots.length > 0"
    class="bg-white py-10 border-b border-gray-100"
  >
    <div class="section-container">
      <div class="max-w-3xl mx-auto">
        <template v-if="status === 'pending'">
          <div class="h-6 w-64 bg-gray-100 rounded animate-pulse mb-3" />
          <div class="h-4 w-48 bg-gray-100 rounded animate-pulse mb-6" />
          <div class="flex gap-3">
            <div v-for="i in 3" :key="i" class="h-24 flex-1 rounded-xl bg-gray-100 animate-pulse" />
          </div>
        </template>

        <template v-else>
          <h2 class="text-xl font-bold text-gray-900 mb-1">{{ title }}</h2>
          <p class="text-sm text-gray-500 mb-2">{{ displaySubtitle }}</p>
          <p v-if="hint" class="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">
            {{ hint }}
          </p>

          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
            <a
              v-for="s in slots"
              :key="s.id"
              :href="s.book_url"
              target="_blank"
              rel="noopener noreferrer"
              class="group border border-gray-200 rounded-xl px-4 py-3 hover:border-primary-300 hover:shadow-sm transition flex flex-col gap-1"
            >
              <span class="text-xs font-semibold uppercase tracking-wide text-primary-600">{{ s.day_label }}</span>
              <span class="text-lg font-bold text-gray-900">{{ s.time_label }}</span>
              <span class="text-sm text-gray-600">{{ s.label }}</span>
              <span v-if="s.location_name" class="text-xs text-gray-400 truncate">{{ s.location_name }}</span>
              <span class="text-sm font-semibold text-primary-600 mt-1 group-hover:underline">Buchen →</span>
            </a>
          </div>

          <div class="text-center sm:text-left">
            <a
              :href="allUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700"
            >
              Alle Termine anzeigen →
            </a>
          </div>
        </template>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
type TeaserSlot = {
  id: string
  day_label: string
  time_label: string
  label: string
  location_name: string | null
  book_url: string
  category_code: string | null
}

const props = withDefaults(
  defineProps<{
    page: string
    title?: string
    subtitle?: string
    /** Default deep-link when opening “all slots” */
    category?: string
  }>(),
  {
    title: 'Nächste freie Fahrstunden',
    subtitle: 'Aktuelle Verfügbarkeit — mit Klick öffnen Sie die Online-Buchung.',
    category: 'B Automatik',
  },
)

const { data, status } = useFetch<{
  slots: TeaserSlot[]
  used_fallback?: boolean
  hint?: string | null
  booking_url?: string
}>('/api/next-slots', {
  query: { page: props.page },
  key: `next-slots-${props.page}`,
  server: true,
})

const slots = computed(() => data.value?.slots || [])
const hint = computed(() => data.value?.hint || null)
const displaySubtitle = computed(() => props.subtitle)

const allUrl = computed(() => {
  const base = data.value?.booking_url || 'https://app.simy.ch/booking/availability/driving-team'
  const params = new URLSearchParams()
  if (props.category) params.set('category', props.category)
  params.set('prefill', 'partial')
  return `${base}?${params.toString().replace(/\+/g, '%20')}`
})
</script>
