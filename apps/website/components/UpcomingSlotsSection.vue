<template>
  <section
    v-if="status === 'pending' || status === 'success'"
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

        <!-- Slots available -->
        <template v-else-if="slots.length > 0">
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

          <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <a
              :href="allUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700"
            >
              Alle Termine anzeigen →
            </a>
            <a
              :href="proposalUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-primary-600"
            >
              Keinen passenden Termin? Wunschtermin vorschlagen →
            </a>
          </div>
        </template>

        <!-- No slots: proposal CTA -->
        <template v-else>
          <h2 class="text-xl font-bold text-gray-900 mb-1">{{ emptyTitle }}</h2>
          <p class="text-sm text-gray-600 mb-5">
            {{ emptyText }}
          </p>
          <div class="flex flex-col sm:flex-row gap-3">
            <a
              :href="proposalUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition"
            >
              Wunschtermin vorschlagen
            </a>
            <a
              :href="allUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center justify-center px-5 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:border-primary-300 hover:text-primary-700 transition"
            >
              Buchung trotzdem öffnen
            </a>
          </div>
          <p class="text-xs text-gray-400 mt-4">
            In der Online-Buchung kannst du bevorzugte Tage und Zeiten angeben — wir melden uns mit einem konkreten Termin.
          </p>
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
    /** Default deep-link when opening “all slots” / proposal */
    category?: string
    emptyTitle?: string
    emptyText?: string
  }>(),
  {
    title: 'Nächste freie Fahrstunden',
    subtitle: 'Aktuelle Verfügbarkeit — mit Klick öffnen Sie die Online-Buchung.',
    category: 'B Automatik',
    emptyTitle: 'Aktuell keine freien Online-Termine',
    emptyText:
      'Für diesen Standort sind gerade keine buchbaren Fahrstunden sichtbar. Du kannst uns deine Wunschzeiten schicken — wir melden uns mit einem konkreten Vorschlag.',
  },
)

const { data, status } = useFetch<{
  slots: TeaserSlot[]
  used_fallback?: boolean
  hint?: string | null
  booking_url?: string
  default_location_id?: string | null
  default_category?: string | null
}>('/api/next-slots', {
  query: { page: props.page },
  key: `next-slots-${props.page}`,
  server: true,
})

const slots = computed(() => data.value?.slots || [])
const hint = computed(() => data.value?.hint || null)
const displaySubtitle = computed(() => props.subtitle)

const bookingBase = computed(
  () => data.value?.booking_url || 'https://app.simy.ch/booking/availability/driving-team',
)

const categoryForLink = computed(
  () => data.value?.default_category || props.category || 'B Automatik',
)

function buildBookingUrl(opts: { proposal?: boolean } = {}) {
  const params = new URLSearchParams()
  if (categoryForLink.value) params.set('category', categoryForLink.value)
  params.set('prefill', 'partial')
  const loc = data.value?.default_location_id
  if (loc) params.set('location', loc)
  if (opts.proposal) params.set('proposal', '1')
  return `${bookingBase.value}?${params.toString().replace(/\+/g, '%20')}`
}

const allUrl = computed(() => buildBookingUrl())
const proposalUrl = computed(() => buildBookingUrl({ proposal: true }))
</script>
