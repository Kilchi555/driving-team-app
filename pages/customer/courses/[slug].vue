<template>
  <div 
    class="h-[100svh] flex flex-col bg-gradient-to-br from-slate-50 to-slate-100"
    :style="{'--primary-color': tenantBranding?.primary_color || '#10B981'} as any"
  >
    <!-- Header -->
    <div 
      class="shadow-sm border-b flex-shrink-0 pt-safe"
      :style="{'backgroundColor': tenantBranding?.primary_color || '#10B981'}"
    >
      <div class="max-w-6xl mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <button 
            @click="router.back()"
            class="flex items-center gap-2 text-white hover:opacity-80 transition-opacity cursor-pointer"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Zurück</span>
          </button>
          <h1 class="text-xl font-semibold text-white text-right">Unsere Kurse</h1>
        </div>
      </div>
    </div>

    <!-- Scrollable content -->
    <div class="flex-1 overflow-y-auto">

    <!-- Initial Loading Overlay -->
    <div
      v-if="isInitializing"
      class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50"
    >
      <div class="mb-8">
        <img
          v-if="tenantBranding && (tenant?.logo_wide_url || tenant?.logo_url || tenantBranding.logo_url)"
          :src="tenant?.logo_wide_url || tenant?.logo_url || tenantBranding.logo_url"
          alt="Logo"
          class="h-10 max-w-[180px] object-contain drop-shadow-md"
        />
        <div
          v-else-if="tenantBranding"
          class="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg"
          :style="{ backgroundColor: tenantBranding.primary_color }"
        >
          {{ getInitials(tenant?.name || '') }}
        </div>
        <div
          v-else
          class="w-16 h-16 rounded-2xl bg-slate-200 animate-pulse"
        />
      </div>
      <div
        class="w-10 h-10 rounded-full border-4 border-gray-200 animate-spin"
        :style="tenantBranding ? { borderTopColor: tenantBranding.primary_color } : { borderTopColor: '#94a3b8' }"
      ></div>
      <p class="mt-4 text-sm text-gray-500">Kurse werden geladen…</p>
    </div>

    <!-- Loading State (within-page) -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div
        class="animate-spin rounded-full h-12 w-12 border-b-2"
        :style="{ borderBottomColor: tenantBranding?.primary_color || '#10B981' }"
      ></div>
    </div>

    <!-- Error State -->
    <div v-if="error" class="max-w-6xl mx-auto px-4 py-12">
      <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p class="text-red-700">{{ error }}</p>
      </div>
    </div>

    <!-- Content -->
    <div v-else class="max-w-6xl mx-auto px-4 py-8">
      <!-- Filters -->
      <div class="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div class="grid grid-cols-2 gap-4 max-w-md">
          <!-- Category Filter -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Kategorie</label>
            <select 
              v-model="selectedCategory" 
              class="tenant-focus w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2"
            >
              <option value="">Alle Kategorien</option>
              <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </div>
          
          <!-- Location Filter -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Standort</label>
            <select 
              v-model="selectedLocation" 
              class="tenant-focus w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2"
            >
              <option value="">Alle Standorte</option>
              <option v-for="loc in locations" :key="loc" :value="loc">{{ loc }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Meine Anmeldung (authenticated users only) -->
      <div v-if="myRegistrations.length > 0" class="mb-6">
        <h2 class="text-base font-semibold text-slate-700 mb-3">Meine Anmeldungen</h2>
        <div class="space-y-3">
          <div
            v-for="reg in myRegistrations"
            :key="reg.id"
            class="bg-white rounded-xl shadow-sm border-2 border-slate-200 p-4"
          >
            <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <p class="font-semibold text-slate-800">{{ reg.courses?.name }}</p>
                <p class="text-sm text-slate-500 mt-0.5">
                  Kategorie: {{ reg.courses?.category }}
                  <span v-if="reg.courses?.course_start_date">
                    · {{ formatSessionDate(reg.courses.course_start_date.split('T')[0]) }}
                  </span>
                </p>
                <span class="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full"
                  :class="{
                    'bg-green-100 text-green-800': reg.status === 'confirmed' || reg.status === 'enrolled',
                    'bg-yellow-100 text-yellow-800': reg.status === 'pending',
                  }">
                  {{ reg.status === 'confirmed' || reg.status === 'enrolled' ? 'Bestätigt' : 'Ausstehend' }}
                </span>
              </div>
              <!-- Umplanen button (only for SARI-managed courses with > 7 days until start) -->
              <div class="flex-shrink-0">
                <button
                  v-if="reg.courses?.sari_managed && canCustomerTransfer(reg)"
                  @click.stop="startCustomerTransfer(reg)"
                  class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border-2 transition-colors"
                  :style="{
                    color: tenantBranding?.primary_color || '#10B981',
                    borderColor: tenantBranding?.primary_color || '#10B981',
                  }"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                  </svg>
                  Umplanen
                </button>
                <p
                  v-else-if="reg.courses?.sari_managed && !canCustomerTransfer(reg)"
                  class="text-xs text-slate-400 max-w-[160px] text-right"
                >
                  Umplanung nur bis 7 Tage vor Kursbeginn — bitte Fahrlehrer kontaktieren.
                </p>
              </div>
            </div>
            <!-- Inline transfer picker for this registration -->
            <div
              v-if="customerTransferRegId === reg.id"
              class="mt-3 p-3 border rounded-lg"
              :style="{
                backgroundColor: `${tenantBranding?.primary_color || '#10B981'}0d`,
                borderColor: `${tenantBranding?.primary_color || '#10B981'}33`
              }"
            >
              <p class="text-sm font-medium mb-2" :style="{ color: tenantBranding?.primary_color || '#10B981' }">Umplanen zu:</p>
              <div v-if="customerTransferOptions(reg).length === 0" class="text-sm text-gray-500 mb-2">
                Keine verfügbaren Kurse derselben Kategorie mit freien Plätzen.
              </div>
              <select
                v-else
                v-model="customerTransferTargetId"
                class="tenant-focus w-full text-sm border rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2"
                :style="{ borderColor: `${tenantBranding?.primary_color || '#10B981'}66` }"
              >
                <option value="">Ziel-Kurs auswählen…</option>
                <option v-for="c in customerTransferOptions(reg)" :key="c.id" :value="c.id">
                  {{ c.name }} ({{ (c.max_participants ?? 0) - (c.current_participants ?? 0) }} freie Plätze)
                </option>
              </select>
              <p v-if="customerTransferError" class="text-xs text-red-600 mb-2">{{ customerTransferError }}</p>
              <div class="flex gap-2">
                <button
                  @click="confirmCustomerTransfer(reg)"
                  :disabled="customerTransferring || !customerTransferTargetId"
                  class="px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  :style="{ backgroundColor: tenantBranding?.primary_color || '#10B981' }"
                >
                  {{ customerTransferring ? 'Umbuchen…' : 'Umbuchen bestätigen' }}
                </button>
                <button
                  @click="cancelCustomerTransfer"
                  class="px-3 py-1.5 text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No Courses -->
      <div v-if="filteredCourses.length === 0" class="bg-white rounded-xl shadow-sm p-12 text-center">
        <svg class="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <p class="text-slate-500">Keine Kurse gefunden</p>
      </div>

      <!-- Course Cards -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="course in filteredCourses" 
          :key="course.id"
          class="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border-2 border-slate-200"
          :class="course.status !== 'waitlist' ? 'cursor-pointer' : ''"
          @click="course.status !== 'waitlist' && openEnrollmentModal(course)"
        >
          <!-- Course Header -->
          <div class="p-5 border-b border-slate-100">
            <div class="flex items-start justify-between gap-2 mb-1">
              <h3 class="font-semibold text-lg text-slate-800">{{ removeDateFromTitle(course.name) }}</h3>
              <span
                v-if="course._partiallyStarted"
                class="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200"
              >
                Einzellektion
              </span>
            </div>
            <p class="text-sm text-slate-500">{{ course.description || 'Standort wird noch bekannt gegeben' }}</p>
          </div>
          
          <!-- Sessions -->
          <div class="p-5 space-y-2">
            <!-- Waitlist: no date yet -->
            <div v-if="course.status === 'waitlist'" class="flex items-center gap-3 text-sm">
              <div 
                class="w-8 h-8 rounded-full flex items-center justify-center font-medium text-white"
                :style="{'backgroundColor': tenantBranding?.primary_color || '#10B981'}"
              >
                ?
              </div>
              <p class="text-slate-500 italic">Datum folgt — Warteliste offen</p>
            </div>
            <!-- Regular sessions -->
            <div 
              v-else
              v-for="(session, idx) in getGroupedSessions(course)" 
              :key="idx"
              class="flex items-center gap-3 text-sm"
            >
              <div 
                class="w-8 h-8 shrink-0 rounded-full flex items-center justify-center font-medium text-white"
                :style="{'backgroundColor': tenantBranding?.primary_color || '#10B981'}"
              >
                {{ idx + 1 }}
              </div>
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0 flex-1">
                <p class="font-medium text-slate-700 whitespace-nowrap">
                  {{ formatSessionDate(session.date) }} 
                  <span class="font-normal text-slate-600">{{ session.timeRange }}</span>
                </p>
                <button
                  v-if="session.allowIndividualBooking && session.individualPriceRappen && course.free_slots > 0"
                  @click.stop="session.requiresConfirmation ? openIndividualConfirm(course, session.confirmationText) : openEnrollmentModal(course)"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-opacity hover:opacity-80"
                  :style="{
                    color: tenantBranding?.primary_color || '#10B981',
                    borderColor: `${tenantBranding?.primary_color || '#10B981'}40`,
                    backgroundColor: `${tenantBranding?.primary_color || '#10B981'}0f`
                  }"
                >
                  <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Einzeln · CHF {{ formatPrice(session.individualPriceRappen) }}
                </button>
              </div>
              <button
                v-if="idx > 0 && courseSessionAlternatives[course.id]?.[idx + 1]"
                @click.stop="openSessionCustomizer(course)"
                class="shrink-0 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors"
                :style="{
                  backgroundColor: `${tenantBranding?.primary_color || '#10B981'}20`,
                  color: tenantBranding?.primary_color || '#10B981'
                }"
              >
                Ändern
              </button>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="px-5 py-4 bg-slate-50 space-y-4">
            <!-- Waitlist footer -->
            <div v-if="course.status === 'waitlist'">
              <p class="text-sm text-slate-500 mb-3">Trage dich auf die Warteliste ein – wir benachrichtigen dich, sobald ein Termin feststeht.</p>
              <a
                :href="`/booking/waitlist/${course.id}`"
                @click.stop
                class="block w-full px-4 py-2 text-white font-medium rounded-lg transition-opacity hover:opacity-90 text-center"
                :style="{'backgroundColor': tenantBranding?.primary_color || '#10B981'}"
              >
                Auf Warteliste eintragen
              </a>
            </div>

            <!-- Regular course footer -->
            <template v-else>
              <!-- Price and Free Slots -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <p class="text-sm text-slate-500">Preis</p>
                  <p class="font-bold text-lg text-slate-800">
                    CHF {{ formatPrice(course._individualPrice ?? course.price_per_participant_rappen) }}
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-sm text-slate-500">Freie Plätze</p>
                  <p class="font-semibold" :class="{'text-red-500': course.free_slots <= 0}" :style="course.free_slots > 0 ? {'color': tenantBranding?.primary_color || '#10B981'} : {}">
                    <span v-if="course.free_slots > 3">mehr als 3</span>
                    <span v-else-if="course.free_slots <= 0">Ausgebucht</span>
                    <span v-else-if="course.free_slots !== undefined">{{ course.free_slots }}</span>
                    <span v-else>?</span>
                  </p>
                </div>
              </div>
              
              <!-- Buttons -->
              <div class="space-y-2">
                <!-- Sessions anpassen Button (only if course has free slots) -->
                <button
                  v-if="courseSessionAlternatives[course.id] && Object.values(courseSessionAlternatives[course.id]).some(v => v)"
                  @click.stop="openSessionCustomizer(course)"
                  class="w-full px-4 py-2 font-medium rounded-lg border-2 transition-colors flex items-center justify-center gap-2"
                  :style="{
                    'color': tenantBranding?.primary_color || '#10B981',
                    'borderColor': tenantBranding?.primary_color || '#10B981'
                  }"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Sessions anpassen
                </button>
                
                <!-- Anmelden Button -->
                <button 
                  v-if="course.free_slots > 0"
                  @click.stop="openEnrollmentModal(course)"
                  class="w-full px-4 py-2 text-white font-medium rounded-lg transition-opacity hover:opacity-90"
                  :style="{
                    'backgroundColor': tenantBranding?.primary_color || '#10B981'
                  }"
                >
                  Anmelden
                </button>

                <!-- Ausgebucht: Warteliste Button -->
                <a
                  v-if="course.free_slots <= 0"
                  :href="`/booking/waitlist/${course.id}`"
                  @click.stop
                  class="block w-full px-4 py-2 font-medium rounded-lg border-2 transition-colors text-center"
                  :style="{
                    'color': tenantBranding?.primary_color || '#10B981',
                    'borderColor': tenantBranding?.primary_color || '#10B981'
                  }"
                >
                  Auf Warteliste eintragen
                </a>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    </div><!-- end scrollable content -->

    <!-- Individual Session Confirmation Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showIndividualConfirm"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          @click.self="showIndividualConfirm = false"
        >
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <!-- Icon header -->
            <div class="px-6 pt-6 pb-4 text-center">
              <div
                class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                :style="{ backgroundColor: `${tenantBranding?.primary_color || '#10B981'}15` }"
              >
                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" :style="{ color: tenantBranding?.primary_color || '#10B981' }">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-slate-800">Einzelbuchung bestätigen</h3>
              <p class="mt-3 text-sm text-slate-700 leading-relaxed text-left bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
                {{ individualConfirmText || DEFAULT_CONFIRMATION_TEXT }}
              </p>
            </div>

            <!-- Actions -->
            <div class="px-6 pb-6 flex flex-col gap-2">
              <button
                @click="confirmIndividualBooking"
                class="w-full py-2.5 rounded-xl text-white font-medium transition-opacity hover:opacity-90"
                :style="{ backgroundColor: tenantBranding?.primary_color || '#10B981' }"
              >
                Ja, ich bestätige
              </button>
              <button
                @click="showIndividualConfirm = false"
                class="w-full py-2.5 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Enrollment Modal -->
    <CourseEnrollmentModal
      v-if="selectedCourse"
      :is-open="showEnrollmentModal"
      :course="selectedCourse"
      :tenant-id="tenantId"
      :tenant-slug="slug"
      :wallee-enabled-override="tenantWalleeEnabled"
      :initial-individual-mode="enrollWithIndividualMode"
      @close="closeEnrollmentModal"
      @enrolled="handleEnrolled"
    />
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAsyncData } from '#app'
import { logger } from '~/utils/logger'
import { useUIStore } from '~/stores/ui'
import { useTenantBranding } from '~/composables/useTenantBranding'
import CourseEnrollmentModal from '~/components/customer/CourseEnrollmentModal.vue'

definePageMeta({
  layout: 'default',
  middleware: []
})

const route = useRoute()
const router = useRouter()
const slug = computed(() => route.params.slug as string)

// State
const isLoading = ref(false)
const isInitializing = ref(true)
const error = ref<string | null>(null)
const tenant = ref<any>(null)
const tenantWalleeEnabled = ref<boolean>(false)

// Branding: initialised from the store the moment it's available so the header
// colour, spinner and logo are correct before loadData() returns.
// Uses watch+immediate so it works whether the plugin finishes before or after
// this component's setup runs.
const { currentTenantBranding } = useTenantBranding()
const tenantBranding = ref<any>(null)

const applyStoreBranding = (branding: typeof currentTenantBranding.value) => {
  if (!branding) return
  // Only overwrite while tenant API data hasn't arrived yet
  if (!tenant.value) {
    tenantBranding.value = {
      primary_color: branding.colors?.primary || '#10B981',
      secondary_color: branding.colors?.secondary,
      accent_color: branding.colors?.accent,
      logo_url: branding.logos?.wide || branding.logos?.standard || null,
    }
  }
}

// immediate:true → runs synchronously if already loaded, reactively otherwise
watch(currentTenantBranding, applyStoreBranding, { immediate: true })

useHead(computed(() => ({
  title: tenant.value?.name ? `Kurse – ${tenant.value.name}` : 'Kursangebot',
  meta: [
    { name: 'description', content: tenant.value?.name ? `Aktuelles Kursangebot von ${tenant.value.name}. Jetzt Platz sichern.` : 'Kursangebot.' },
    { name: 'robots', content: 'noindex, nofollow' }
  ],
  link: tenantBranding.value?.logo_url ? [
    { rel: 'icon', type: 'image/png', href: tenantBranding.value.logo_url },
    { rel: 'apple-touch-icon', href: tenantBranding.value.logo_url }
  ] : []
})))
const courses = ref<any[]>([])
// courseId → sessionPosition → hasAlternatives
const courseSessionAlternatives = ref<Record<string, Record<number, boolean>>>({})
const selectedCategory = ref('')
const selectedLocation = ref('')
const selectedCourse = ref<any>(null)
const showEnrollmentModal = ref(false)
const showIndividualConfirm = ref(false)
const enrollWithIndividualMode = ref(false)
const pendingIndividualCourse = ref<any>(null)
const individualConfirmText = ref<string | null>(null)

const DEFAULT_CONFIRMATION_TEXT = 'Hiermit bestätige ich, dass ich die anderen Kursteile besucht habe und die dort geübten Themen vollumfänglich im Griff habe.'

// My registrations (authenticated users)
const myRegistrations = ref<any[]>([])
const customerTransferRegId = ref<string | null>(null)
const customerTransferTargetId = ref<string>('')
const customerTransferring = ref(false)
const customerTransferError = ref('')

// Pre-fetch tenant branding so the header colour is available before onMounted
// Using a try/catch so a failing API (wrong slug, network error) never throws
// up to Nuxt's error page — the component's own error state handles it.
const { data: initData, error: initError } = await useAsyncData(
  `courses-init-${slug.value}`,
  () => $fetch<any>('/api/courses/public', { query: { slug: slug.value } }),
  { watch: [slug], lazy: true }
).catch(() => ({ data: ref(null), error: ref(null) }))

if (initData.value?.success && initData.value?.tenant) {
  tenant.value = initData.value.tenant
  tenantBranding.value = {
    primary_color: initData.value.tenant.primary_color || '#10B981',
    secondary_color: initData.value.tenant.secondary_color,
    accent_color: initData.value.tenant.accent_color,
    logo_url: initData.value.tenant.logo_wide_url || initData.value.tenant.logo_url || initData.value.tenant.logo_square_url || initData.value.tenant.logo_dark_url || tenantBranding.value?.logo_url || null,
  }
}

// Computed
const tenantId = computed(() => tenant.value?.id || '')

const categories = computed(() => {
  let coursesToUse = courses.value
  
  // If location is selected, only show categories of courses in that location
  if (selectedLocation.value) {
    coursesToUse = coursesToUse.filter(c => getCourseCity(c) === selectedLocation.value)
  }
  
  const cats = new Set(coursesToUse.map(c => c.category).filter(Boolean))
  return Array.from(cats).sort()
})

const getInitials = (name: string): string => {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
}

// Returns the city for a course. Uses the dedicated `city` column when available,
// falls back to extracting it from description or name for legacy records.
const getCourseCity = (c: any): string => {
  if (c.city) return c.city
  return extractCity(c.description || c.name)
}

// Extract city from free-text description or course name (legacy fallback).
// Handles:
//   "Herrengasse 17, 8853 Zürich SZ"  →  "Zürich"  (PLZ format)
//   "Swiss Life Arena in Zürich"       →  "Zürich"  ("in City" pattern)
//   "VKU Zürich"                       →  "Zürich"  (last capitalised word)
const extractCity = (text: string): string => {
  if (!text) return ''
  const plzMatch = text.match(/,\s*\d{4}\s+([A-Za-zäöüÄÖÜ\-\s]+?)(?:\s+[A-Z]{2})?$/)
  if (plzMatch) return plzMatch[1].trim()
  const inMatch = text.match(/\bin\s+([A-ZÄÖÜ][A-Za-zäöüÄÖÜ\-]+)(?:\s+[A-Z]{2})?$/)
  if (inMatch) return inMatch[1].trim()
  const lastWordMatch = text.match(/\s([A-ZÄÖÜ][A-Za-zäöüÄÖÜ\-]+)(?:\s+[A-Z]{2})?$/)
  if (lastWordMatch) return lastWordMatch[1].trim()
  return ''
}

const locations = computed(() => {
  let coursesToUse = courses.value
  
  // If category is selected, only show locations of courses in that category
  if (selectedCategory.value) {
    coursesToUse = coursesToUse.filter(c => c.category === selectedCategory.value)
  }
  
  const locs = new Set(coursesToUse.map(c => getCourseCity(c)).filter(Boolean))
  return Array.from(locs).sort()
})

const filteredCourses = computed(() => {
  let result = [...courses.value]
  
  if (selectedCategory.value) {
    result = result.filter(c => c.category === selectedCategory.value)
  }
  
  if (selectedLocation.value) {
    result = result.filter(c => getCourseCity(c) === selectedLocation.value)
  }
  
  // Waitlist courses first, then by next session date ascending
  result.sort((a, b) => {
    const aIsWaitlist = a.status === 'waitlist'
    const bIsWaitlist = b.status === 'waitlist'
    if (aIsWaitlist && !bIsWaitlist) return -1
    if (!aIsWaitlist && bIsWaitlist) return 1
    const aDate = a.course_sessions?.[0]?.start_time || ''
    const bDate = b.course_sessions?.[0]?.start_time || ''
    return aDate.localeCompare(bDate)
  })
  
  return result
})

// Methods
const loadData = async () => {
  try {
    // Use secure public API instead of direct DB queries
    const response = await $fetch('/api/courses/public', {
      query: { slug: slug.value }
    }) as any

    if (!response.success) {
      error.value = 'Fehler beim Laden der Kurse'
      return
    }

    // Set tenant data
    tenant.value = response.tenant
    tenantWalleeEnabled.value = response.tenant.wallee_enabled ?? false
    
    // Load branding – prefer wide logo, fall back through available fields,
    // then keep whatever the store already loaded (never overwrite with null)
    tenantBranding.value = {
      primary_color: response.tenant.primary_color || '#10B981',
      secondary_color: response.tenant.secondary_color,
      accent_color: response.tenant.accent_color,
      logo_url: response.tenant.logo_wide_url
        || response.tenant.logo_url
        || response.tenant.logo_square_url
        || response.tenant.logo_dark_url
        || tenantBranding.value?.logo_url
        || null,
    }
    
    const now = new Date().toISOString()

    const futureCourses = (response.courses || []).filter((course: any) => {
      if (course.status === 'waitlist') return true
      if (!course.course_sessions || course.course_sessions.length === 0) return false

      const allFuture = course.course_sessions.every((s: any) => s.start_time > now)

      if (!allFuture) {
        // Some sessions already started: only show if there are individually bookable future sessions
        return course.course_sessions.some(
          (s: any) => s.start_time > now && s.allow_individual_booking
        )
      }

      // Partial-only courses (e.g. SARI-synced "Teil 3"): always show if their sessions
      // are in the future. The allow_individual_booking flag is for per-session bookings
      // and must not gate the display of is_partial_only courses.
      if (course.is_partial_only) {
        return true
      }

      return true
    })

    // Calculate free slots; normalise category from course_category.name if the plain text field is empty
    courses.value = futureCourses.map((course: any) => {
      const allFuture = course.course_sessions?.every((s: any) => s.start_time > now) ?? true
      // For partially-started courses: keep only future individually-bookable sessions
      const visibleSessions = allFuture
        ? course.course_sessions
        : (course.course_sessions || []).filter((s: any) => s.start_time > now && s.allow_individual_booking)

      // Determine display price: use individual_price_rappen if partially started
      const individualPrice = !allFuture && visibleSessions.length > 0
        ? visibleSessions[0].individual_price_rappen ?? null
        : null

      return {
        ...course,
        course_sessions: visibleSessions,
        category: course.category || course.course_category?.name || null,
        free_slots: (course.max_participants || 0) - (course.current_participants || 0),
        _partiallyStarted: !allFuture,
        _individualPrice: individualPrice,
      }
    })
    
    logger.debug(`Loaded ${courses.value.length} future courses`)

    // Check which changeable sessions have actual alternatives (in background)
    checkAllSessionAlternatives()

    // Auto-open modal if courseId was passed in the URL
    const courseIdParam = route.query.courseId as string | undefined
    if (courseIdParam) {
      const target = courses.value.find((c: any) => c.id === courseIdParam)
      if (target) openEnrollmentModal(target)
    }
  } catch (err: any) {
    logger.error('Error loading data:', err)
    error.value = err.data?.statusMessage || 'Fahrschule nicht gefunden'
  }
}

const getGroupedSessions = (course: any) => {
  if (!course.course_sessions || course.course_sessions.length === 0) return []
  
  // Sort sessions by start_time
  const sorted = [...course.course_sessions].sort((a, b) => 
    a.start_time.localeCompare(b.start_time)
  )
  
  // Group by date
  interface GroupedSession {
    date: string
    startTime: string
    endTime: string
    parts: number
    allowIndividualBooking: boolean
    individualPriceRappen: number | null
    requiresConfirmation: boolean
    confirmationText: string | null
    minFreeSlots: number | null
  }
  
  const grouped: GroupedSession[] = []
  let currentDate = ''
  let currentGroup: GroupedSession | null = null

  const calcSessionFreeSlots = (session: any): number | null => {
    if (session.max_participants != null) {
      return session.max_participants - (session.current_participants || 0)
    }
    if (session.current_participants != null) {
      return (course.max_participants || 0) - session.current_participants
    }
    return null
  }
  
  for (const session of sorted) {
    const date = session.start_time.split('T')[0]
    const sessionFree = calcSessionFreeSlots(session)
    
    if (date !== currentDate) {
      if (currentGroup) {
        grouped.push(currentGroup)
      }
      currentDate = date
      currentGroup = {
        date,
        startTime: session.start_time,
        endTime: session.end_time,
        parts: 1,
        allowIndividualBooking: !!session.allow_individual_booking,
        individualPriceRappen: session.individual_price_rappen ?? null,
        requiresConfirmation: session.individual_booking_requires_confirmation ?? true,
        confirmationText: session.individual_booking_confirmation_text ?? null,
        minFreeSlots: sessionFree
      }
    } else {
      if (currentGroup) {
        currentGroup.endTime = session.end_time
        currentGroup.parts++
        // Take minimum free slots across sessions in the same group
        if (sessionFree !== null) {
          currentGroup.minFreeSlots = currentGroup.minFreeSlots === null ? sessionFree : Math.min(currentGroup.minFreeSlots, sessionFree)
        }
        // Propagate individual booking flag if any session in the group has it
        if (session.allow_individual_booking) {
          currentGroup.allowIndividualBooking = true
          currentGroup.individualPriceRappen = session.individual_price_rappen ?? currentGroup.individualPriceRappen
          currentGroup.requiresConfirmation = session.individual_booking_requires_confirmation ?? true
          currentGroup.confirmationText = session.individual_booking_confirmation_text ?? currentGroup.confirmationText
        }
      }
    }
  }
  
  if (currentGroup) {
    grouped.push(currentGroup)
  }

  const courseFreeSlots = (course.max_participants || 0) - (course.current_participants || 0)
  
  // Format time ranges
  return grouped.map(g => {
    const sessionFree = g.minFreeSlots ?? courseFreeSlots
    const freeSlots = Math.max(0, Math.min(courseFreeSlots, sessionFree))
    return {
      date: g.date,
      timeRange: `${formatTime(g.startTime)} - ${formatTime(g.endTime)}`,
      parts: g.parts,
      allowIndividualBooking: g.allowIndividualBooking,
      individualPriceRappen: g.individualPriceRappen,
      requiresConfirmation: g.requiresConfirmation,
      confirmationText: g.confirmationText,
      freeSlots
    }
  })
}

const formatSessionDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr + 'T00:00:00')
    const formatted = new Intl.DateTimeFormat('de-CH', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date)
    // Remove comma after weekday: "Mo, 20.01.2026" → "Mo 20.01.2026"
    return formatted.replace(/, /, ' ')
  } catch {
    return dateStr
  }
}

const formatTime = (isoString: string) => {
  try {
    // Always convert to Swiss local time (Europe/Zurich) before displaying
    const date = new Date(isoString.replace(' ', 'T'))
    return date.toLocaleTimeString('de-CH', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Europe/Zurich'
    })
  } catch {
    return ''
  }
}

const formatPrice = (rappen: number) => {
  return (rappen / 100).toFixed(2)
}

const removeDateFromTitle = (title: string): string => {
  if (!title) return ''
  return title.replace(/\s*-\s*\d{2}\.\d{2}\.\d{4}$/, '')
}

const openEnrollmentModal = (course: any) => {
  enrollWithIndividualMode.value = false
  selectedCourse.value = course
  showEnrollmentModal.value = true
}

const openIndividualConfirm = (course: any, confirmationText?: string | null) => {
  pendingIndividualCourse.value = course
  individualConfirmText.value = confirmationText || null
  showIndividualConfirm.value = true
}

const confirmIndividualBooking = () => {
  showIndividualConfirm.value = false
  enrollWithIndividualMode.value = true
  selectedCourse.value = pendingIndividualCourse.value
  showEnrollmentModal.value = true
  pendingIndividualCourse.value = null
}

const closeEnrollmentModal = () => {
  showEnrollmentModal.value = false
  selectedCourse.value = null
  enrollWithIndividualMode.value = false
}

const handleEnrolled = () => {
  closeEnrollmentModal()
  // Show success message via global UI store
  const uiStore = useUIStore()
  uiStore.showSuccess('Anmeldung erfolgreich!', 'Die Bestätigungsmail wurde versendet.')
  loadData() // Refresh to update free slots
}

// Check if a course has changeable sessions (for the button)
const hasChangeableSessions = (course: any): boolean => {
  if (!course?.course_sessions?.length) return false

  // Show button only when there's actually something to customise:
  // 1. Any session can be booked individually
  const hasIndividualSessions = course.course_sessions.some((s: any) => s.allow_individual_booking)
  // 2. The course category allows partial enrollment
  const allowsPartial = !!course.course_category?.allow_partial_enrollment
  // 3. The course is set to partial-only
  const isPartialOnly = !!course.is_partial_only

  return hasIndividualSessions || allowsPartial || isPartialOnly
}

const openSessionCustomizer = (course: any) => {
  selectedCourse.value = course
  showEnrollmentModal.value = true
  // The modal will automatically show the session customizer on mount
}

// Check for success params on mount (after Wallee payment redirect)
const checkSuccessParams = () => {
  if (route.query.success === 'true') {
    logger.debug('✅ Success params found - payment completed')
    // Show success via global UI store
    const uiStore = useUIStore()
    uiStore.showSuccess('Anmeldung erfolgreich!', 'Die Bestätigungsmail wurde versendet.')
    // Clean up the URL
    window.history.replaceState({}, '', route.path)
  }
}

// Apply query params to filters
watch(() => route.query, (query) => {
  // Apply filter params
  if (query.category) selectedCategory.value = query.category as string
  if (query.location) selectedLocation.value = query.location as string

  // Auto-open enrollment modal for a specific course
  if (query.courseId) {
    const target = courses.value.find((c: any) => c.id === query.courseId)
    if (target) {
      openEnrollmentModal(target)
    }
  }
}, { immediate: true })

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

const canCustomerTransfer = (reg: any): boolean => {
  const startDate = reg.courses?.course_start_date ? new Date(reg.courses.course_start_date) : null
  if (!startDate) return false
  return startDate.getTime() - Date.now() > SEVEN_DAYS_MS
}

const customerTransferOptions = (reg: any) => {
  return courses.value.filter(c =>
    c.id !== reg.course_id &&
    c.sari_managed &&
    c.category === reg.courses?.category &&
    c.is_active !== false &&
    (c.max_participants ?? 0) > (c.current_participants ?? 0)
  )
}

const startCustomerTransfer = (reg: any) => {
  customerTransferRegId.value = reg.id
  customerTransferTargetId.value = ''
  customerTransferError.value = ''
}

const cancelCustomerTransfer = () => {
  customerTransferRegId.value = null
  customerTransferTargetId.value = ''
  customerTransferError.value = ''
}

const confirmCustomerTransfer = async (reg: any) => {
  if (!customerTransferTargetId.value) {
    customerTransferError.value = 'Bitte einen Ziel-Kurs auswählen.'
    return
  }
  if (customerTransferring.value) return
  customerTransferring.value = true
  customerTransferError.value = ''
  try {
    const response = await fetch('/api/sari/transfer-enrollment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationId: reg.id, targetCourseId: customerTransferTargetId.value, notifyCustomer: true }),
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data?.statusMessage || data?.message || 'Umplanung fehlgeschlagen')
    }
    cancelCustomerTransfer()
    const uiStore = useUIStore()
    uiStore.showSuccess('Umplanung erfolgreich!', `Du wurdest umgebucht zu "${data.toCourse?.name}".`)
    await loadData()
    await loadMyRegistrations()
  } catch (err: any) {
    customerTransferError.value = err?.message || 'Umplanung fehlgeschlagen'
  } finally {
    customerTransferring.value = false
  }
}

const loadMyRegistrations = async () => {
  if (!tenant.value?.id) return
  try {
    const data = await $fetch<{ registrations: any[] }>('/api/courses/my-registrations', {
      query: { tenantId: tenant.value.id }
    })
    myRegistrations.value = data?.registrations ?? []
  } catch {
    // Not authenticated or other error — silently ignore
    myRegistrations.value = []
  }
}

// Load data
const checkAllSessionAlternatives = async () => {
  const tenantId = tenant.value?.id
  if (!tenantId) return

  const checks: Promise<void>[] = []

  for (const course of courses.value) {
    if (!hasChangeableSessions(course) || course.free_slots <= 0) continue

    const grouped = getGroupedSessions(course)
    for (let idx = 1; idx < grouped.length; idx++) {
      const group = grouped[idx]
      const prevGroup = grouped[idx - 1]
      const afterDate = prevGroup?.date

      checks.push((async () => {
        try {
          const res = await $fetch('/api/courses/available-sessions', {
            query: {
              tenantId,
              category: course.category,
              sessionPosition: idx + 1,
              afterDate,
              excludeCourseId: course.id,
              courseLocation: course.description,
              currentDate: group.date
            }
          }) as any
          if (!courseSessionAlternatives.value[course.id]) {
            courseSessionAlternatives.value[course.id] = {}
          }
          courseSessionAlternatives.value[course.id][idx + 1] = !!(res?.sessions?.length)
        } catch {
          if (!courseSessionAlternatives.value[course.id]) {
            courseSessionAlternatives.value[course.id] = {}
          }
          courseSessionAlternatives.value[course.id][idx + 1] = false
        }
      })())
    }
  }

  await Promise.allSettled(checks)
}

onMounted(async () => {
  logger.debug('Loading courses for slug:', slug.value)
  
  try {
    await loadData()
    await loadMyRegistrations()
    checkSuccessParams()
  } catch (e: any) {
    logger.error('Error:', e)
    error.value = 'Ein Fehler ist aufgetreten'
  } finally {
    isInitializing.value = false
  }
})
</script>

<style scoped>
.tenant-focus:focus {
  --tw-ring-color: var(--primary-color, #10B981);
  border-color: var(--primary-color, #10B981);
}
</style>

