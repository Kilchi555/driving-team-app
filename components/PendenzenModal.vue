<!-- components/PendenzenModal.vue - Korrigiertes Design -->
<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
    <!-- MODAL CONTAINER - Das hat gefehlt! -->
    <div class="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
      
      <!-- Header -->
      <div class="bg-green-600 text-white p-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-xl sm:text-2xl font-bold">
              Pendenzen
              <span :class="[
                'ml-2 px-2 py-1 rounded-full text-sm font-medium',
                pendingCount > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
              ]">
                {{ pendingCount }}
              </span>
            </h1>
            <p class="text-sm text-green-100">Unbewertete Fahrlektionen</p>
          </div>
          
          <!-- Close Button -->
          <button 
            @click="closeModal"
            class="text-white hover:text-green-200 transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Filter & Stats -->
        <div class="mt-4 flex flex-wrap gap-4 items-center text-sm">
          <!-- Date Filter -->
          <div class="flex items-center gap-2">
            <label class="text-green-100">Zeitraum:</label>
            <select 
              v-model="selectedPeriod" 
              @change="loadPendingEvaluations"
              class="border border-green-400 bg-green-700 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
            >
              <option value="7">Letzte 7 Tage</option>
              <option value="14">Letzte 14 Tage</option>
              <option value="30">Letzte 30 Tage</option>
              <option value="all">Alle</option>
            </select>
          </div>

          <!-- Stats -->
          <div class="flex gap-4 text-green-100">
            <span>Gesamt: {{ pendingAppointments.length }}</span>
            <span>Heute: {{ getTodayCount() }}</span>
            <span>Überfällig: {{ getOverdueCount() }}</span>
          </div>

          <!-- Refresh Button -->
          <button
            @click="refreshPendings"
            :disabled="isLoading"
            class="bg-green-700 text-green-100 px-3 py-1 rounded hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            🔄 Aktualisieren
          </button>
        </div>
      </div>

      <!-- Content - Scrollable -->
      <div class="flex-1 overflow-y-auto">
        <!-- Loading State -->
        <div v-if="isLoading" class="flex items-center justify-center py-8">
          <div class="text-center">
            <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto"></div>
            <p class="mt-4 text-gray-600">Lade Pendenzen...</p>
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="p-4">
          <div class="bg-red-50 border border-red-200 rounded p-4 text-red-700">
            <h3 class="font-bold mb-2">Fehler beim Laden</h3>
            <p class="mb-4">{{ error }}</p>
            <button 
              @click="loadPendingEvaluations" 
              class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Erneut versuchen
            </button>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="pendingAppointments.length === 0" class="flex items-center justify-center py-8">
          <div class="text-center px-4">
            <div class="text-6xl mb-4">🎉</div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Keine Pendenzen!</h3>
            <p class="text-gray-600 mb-4">
              Alle Lektionen sind bewertet und kommentiert.
            </p>
            <button 
              @click="closeModal"
              class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Super! Schließen
            </button>
          </div>
        </div>

        <!-- Pending Appointments List -->
        <div v-else class="p-4 space-y-3">
          <div
            v-for="appointment in sortedPendingAppointments"
            :key="appointment.id"
            class="bg-gray-50 rounded-lg border p-4 hover:bg-gray-100 transition-all"
          >
            <!-- Mobile-First Layout -->
            <div class="space-y-3">
              <!-- Header Row -->
              <div class="flex items-start justify-between">
                <div class="flex-1 min-w-0">
                  <!-- Student Name & Title -->
                  <h3 class="font-semibold text-gray-900 truncate">
                    {{ appointment.student_name || 'Unbekannter Schüler' }}
                  </h3>
                  <p class="text-sm text-gray-600 truncate">
                    {{ appointment.title || 'Fahrlektion' }}
                  </p>
                </div>
                
                <!-- Priority Badge -->
                <span :class="[
                  'text-xs px-2 py-1 rounded-full font-medium ml-2',
                  getPriorityClass(appointment)
                ]">
                  {{ getPriorityText(appointment) }}
                </span>
              </div>

              <!-- Details Row -->
              <div class="flex flex-wrap gap-3 text-sm text-gray-600">
                <span class="flex items-center gap-1">
                  📅 {{ formatDate(appointment.start_time) }}
                </span>
                <span class="flex items-center gap-1">
                  ⏱️ {{ formatDuration(appointment.duration_minutes || 0) }}
                </span>
                <span v-if="appointment.category" class="flex items-center gap-1">
                  🚗 {{ appointment.category }}
                </span>
                <span class="flex items-center gap-1">
                  📍 {{ appointment.location_name || 'Kein Ort' }}
                </span>
              </div>

              <!-- Days since completion -->
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-500">
                  {{ getDaysSinceText(appointment.start_time) }}
                </span>
                
                <!-- Action Button -->
                <button
                  @click="openEvaluation(appointment)"
                  class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  Jetzt bewerten
                </button>
              </div>

              <!-- Quick Info -->
              <div v-if="appointment.student_phone" class="pt-2 border-t border-gray-200">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-gray-500">
                    📱 {{ formatPhone(appointment.student_phone) }}
                  </span>
                  <div class="flex gap-2">
                    <button
                      @click="callStudent(appointment.student_phone)"
                      class="text-xs text-green-600 hover:text-green-800 font-medium"
                    >
                      Anrufen
                    </button>
                    <button
                      v-if="appointment.student_email"
                      @click="emailStudent(appointment.student_email)"
                      class="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      E-Mail
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="bg-gray-50 px-4 py-3 border-t">
        <div class="flex gap-3">
          <button
            @click="closeModal"
            class="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Schließen
          </button>
          <button
            v-if="pendingCount > 0"
            @click="refreshPendings"
            :disabled="isLoading"
            class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {{ isLoading ? 'Aktualisiere...' : 'Aktualisieren' }}
          </button>
        </div>
      </div>

    </div>

    <!-- Evaluation Modal (außerhalb des Hauptmodals) -->
    <EvaluationModal
      :is-open="showEvaluationModal"
      :appointment="selectedAppointment"
      :student-category="selectedAppointment?.category || 'B'"
      @close="closeEvaluationModal"
      @saved="onEvaluationSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { navigateTo } from '#app'
import { useCurrentUser } from '~/composables/useCurrentUser'
import { getSupabase } from '~/utils/supabase'
import EvaluationModal from '~/components/EvaluationModal.vue'
import PendenzenModal from '~/components/PendenzenModal.vue'

// Types
interface Props {
  isOpen: boolean
}

interface UserData {
  first_name: string
  last_name: string
  phone?: string
  email?: string
  category?: string
}

interface LocationData {
  name: string
}

interface AppointmentData {
  id: string
  title?: string
  start_time: string
  end_time: string
  duration_minutes?: number
  user_id: string
  users?: UserData
  locations?: LocationData
}

interface PendingAppointment extends AppointmentData {
  student_name: string
  student_phone?: string
  student_email?: string
  category?: string
  location_name?: string
}

// Supabase client
const supabase = getSupabase()

// Composables
const { currentUser, fetchCurrentUser, userError } = useCurrentUser()

// State
const pendingAppointments = ref<PendingAppointment[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const selectedPeriod = ref('14')

// Modal state
const showEvaluationModal = ref(false)
const selectedAppointment = ref<PendingAppointment | null>(null)

// Computed
const pendingCount = computed(() => pendingAppointments.value.length)

const props = defineProps<Props>()
const emit = defineEmits(['close', 'evaluate-lesson'])

// HINZUFÜGEN: Close Method
const closeModal = () => {
  emit('close')
}

// ÄNDERN: openEvaluation Method
const openEvaluation = (appointment: any) => {
  emit('evaluate-lesson', appointment)
  closeModal() // Modal schließen nach Evaluation
}

// Deine bestehenden Methods bleiben...

// HINZUFÜGEN: Watcher für Props
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    loadPendingEvaluations()
  }
})

const sortedPendingAppointments = computed(() => {
  return [...pendingAppointments.value].sort((a, b) => {
    // Sort by priority: oldest first, then by start_time
    const daysA = getDaysSince(a.start_time)
    const daysB = getDaysSince(b.start_time)
    
    if (daysA !== daysB) {
      return daysB - daysA // Older appointments first
    }
    
    return new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  })
})

// Methods
const loadPendingEvaluations = async () => {
  if (!currentUser.value) return
  
  isLoading.value = true
  error.value = null
  
  try {
    // Calculate date filter
    let dateFilter = null
    if (selectedPeriod.value !== 'all') {
      const days = parseInt(selectedPeriod.value)
      dateFilter = new Date()
      dateFilter.setDate(dateFilter.getDate() - days)
    }

    // Get appointments without evaluations
    let query = supabase
      .from('appointments')
      .select(`
        id,
        title,
        start_time,
        end_time,
        duration_minutes,
        user_id,
        users!user_id(
          first_name,
          last_name,
          phone,
          email,
          category
        ),
        locations!location_id(
          name
        )
      `)
      .eq('staff_id', currentUser.value.id)
      .eq('status', 'completed')
      .lt('end_time', new Date().toISOString()) // Only past appointments

    if (dateFilter) {
      query = query.gte('start_time', dateFilter.toISOString())
    }

    const { data: appointments, error: appointmentsError } = await query
      .order('start_time', { ascending: false }) as { data: AppointmentData[] | null, error: any }

    if (appointmentsError) throw appointmentsError

    if (!appointments || appointments.length === 0) {
      pendingAppointments.value = []
      return
    }

    // Check which appointments don't have evaluations (overall rating)
    const appointmentIds = appointments.map(a => a.id)
    const { data: existingNotes, error: notesError } = await supabase
      .from('notes')
      .select('appointment_id')
      .in('appointment_id', appointmentIds)
      .not('staff_rating', 'is', null) // Has overall rating

    if (notesError) throw notesError

    const evaluatedAppointmentIds = new Set(
      existingNotes?.map(note => note.appointment_id) || []
    )

    // Filter out appointments that already have evaluations
    const pending = appointments.filter(appointment => 
      !evaluatedAppointmentIds.has(appointment.id)
    ).map(appointment => ({
      ...appointment,
      student_name: appointment.users ? `${appointment.users.first_name} ${appointment.users.last_name}` : 'Unbekannter Schüler',
      student_phone: appointment.users?.phone,
      student_email: appointment.users?.email,
      category: appointment.users?.category,
      location_name: appointment.locations?.name
    }))

    pendingAppointments.value = pending

  } catch (err: any) {
    console.error('Error loading pending evaluations:', err)
    error.value = err.message || 'Fehler beim Laden der Pendenzen'
  } finally {
    isLoading.value = false
  }
}

const refreshPendings = () => {
  loadPendingEvaluations()
}

const getTodayCount = () => {
  const today = new Date().toDateString()
  return pendingAppointments.value.filter(apt => 
    new Date(apt.start_time).toDateString() === today
  ).length
}

const getOverdueCount = () => {
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
  
  return pendingAppointments.value.filter(apt => 
    new Date(apt.start_time) < threeDaysAgo
  ).length
}

const getDaysSince = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

const getDaysSinceText = (dateString: string) => {
  const days = getDaysSince(dateString)
  
  if (days === 0) return 'Heute abgeschlossen'
  if (days === 1) return 'Gestern abgeschlossen'
  if (days < 7) return `Vor ${days} Tagen abgeschlossen`
  if (days < 30) return `Vor ${Math.floor(days / 7)} Wochen abgeschlossen`
  return `Vor ${Math.floor(days / 30)} Monaten abgeschlossen`
}

const getPriorityClass = (appointment: any) => {
  const days = getDaysSince(appointment.start_time)
  
  if (days >= 7) return 'bg-red-100 text-red-800'
  if (days >= 3) return 'bg-orange-100 text-orange-800'
  if (days >= 1) return 'bg-yellow-100 text-yellow-800'
  return 'bg-blue-100 text-blue-800'
}

const getPriorityText = (appointment: any) => {
  const days = getDaysSince(appointment.start_time)
  
  if (days >= 7) return 'Überfällig'
  if (days >= 3) return 'Dringend'
  if (days >= 1) return 'Bald fällig'
  return 'Neu'
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('de-CH', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDuration = (minutes: number | undefined) => {
  if (!minutes || minutes <= 0) return 'Keine Angabe'
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (hours > 0) {
    return remainingMinutes > 0 
      ? `${hours}h ${remainingMinutes}min`
      : `${hours}h`
  }
  
  return `${minutes}min`
}

const formatPhone = (phone: string) => {
  if (!phone) return ''
  
  // Swiss format: +41 79 123 45 67 -> 079 123 45 67
  if (phone.startsWith('+41')) {
    return phone.replace('+41', '0').replace(/\s+/g, ' ')
  }
  
  return phone
}

const callStudent = (phone: string) => {
  if (phone) {
    window.open(`tel:${phone}`)
  }
}

const emailStudent = (email: string) => {
  if (email) {
    window.open(`mailto:${email}`)
  }
}

const closeEvaluationModal = () => {
  showEvaluationModal.value = false
  selectedAppointment.value = null
}

const onEvaluationSaved = () => {
  // Refresh the pending list
  loadPendingEvaluations()
  closeEvaluationModal()
}

// Lifecycle
onMounted(async () => {
  await fetchCurrentUser()
  
  if (userError.value || !currentUser.value) {
    await navigateTo('/')
    return
  }

  if (currentUser.value.role === 'client') {
    await navigateTo('/dashboard')
    return
  }

  await loadPendingEvaluations()
})
</script>

<style scoped>
/* Mobile optimizations */
.transition-all {
  transition: all 0.2s ease-in-out;
}

/* Smooth touch interactions */
@media (hover: none) and (pointer: coarse) {
  .hover\:shadow-md:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }
  
  .hover\:bg-green-700:hover {
    background-color: #15803d;
  }
  
  .hover\:bg-gray-50:hover {
    background-color: #f9fafb;
  }
}

/* Ensure text doesn't break layout on small screens */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Floating action button shadow */
.shadow-lg {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}
</style>