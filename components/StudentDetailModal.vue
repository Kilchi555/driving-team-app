<!-- components/StudentDetailModal.vue -->
<template>
  <div v-if="show && student" class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black bg-opacity-50" @click="$emit('close')"></div>
    
    <!-- Modal -->
    <div class="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b bg-gray-50">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <span class="text-green-600 font-bold text-lg">
              {{ student.first_name?.[0] }}{{ student.last_name?.[0] }}
            </span>
          </div>
          <div>
            <h2 class="text-xl font-bold text-gray-900">
              {{ student.first_name }} {{ student.last_name }}
            </h2>
            <p class="text-sm text-gray-600">{{ student.email }}</p>
          </div>
        </div>
        
        <div class="flex items-center gap-3">
          <!-- Status Toggle (nur für Staff/Admin) -->
          <button
            v-if="currentUser && ['staff', 'admin'].includes(currentUser.role)"
            @click="toggleStatus"
            :disabled="isToggling"
            :class="[
              'px-3 py-1 rounded-full text-sm font-medium transition-colors',
              student.is_active
                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                : 'bg-red-100 text-red-800 hover:bg-red-200'
            ]"
          >
            {{ isToggling ? '...' : (student.is_active ? 'Aktiv' : 'Inaktiv') }}
          </button>
          
          <button 
            @click="$emit('close')"
            class="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex h-[70vh]">
        <!-- Left Side - Student Info -->
        <div class="w-1/3 p-6 border-r bg-gray-50 overflow-y-auto">
          <h3 class="font-semibold text-gray-900 mb-4">Schüler-Informationen</h3>
          
          <!-- Personal Info -->
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-gray-500 uppercase tracking-wide">Name</label>
              <p class="text-sm text-gray-900">{{ student.first_name }} {{ student.last_name }}</p>
            </div>
            
            <div>
              <label class="block text-xs font-medium text-gray-500 uppercase tracking-wide">E-Mail</label>
              <p class="text-sm text-gray-900">{{ student.email }}</p>
            </div>
            
            <div v-if="student.phone">
              <label class="block text-xs font-medium text-gray-500 uppercase tracking-wide">Telefon</label>
              <p class="text-sm text-gray-900">{{ student.phone }}</p>
            </div>
            
            <div v-if="student.birthdate">
              <label class="block text-xs font-medium text-gray-500 uppercase tracking-wide">Geburtsdatum</label>
              <p class="text-sm text-gray-900">{{ formatDate(student.birthdate) }}</p>
            </div>
            
            <div v-if="student.category">
              <label class="block text-xs font-medium text-gray-500 uppercase tracking-wide">Kategorie</label>
              <p class="text-sm text-gray-900">{{ student.category }}</p>
            </div>
            
            <!-- Address -->
            <div v-if="student.street || student.city">
              <label class="block text-xs font-medium text-gray-500 uppercase tracking-wide">Adresse</label>
              <div class="text-sm text-gray-900">
                <p v-if="student.street">{{ student.street }} {{ student.street_nr }}</p>
                <p v-if="student.zip || student.city">{{ student.zip }} {{ student.city }}</p>
              </div>
            </div>
            
            <div>
              <label class="block text-xs font-medium text-gray-500 uppercase tracking-wide">Registriert</label>
              <p class="text-sm text-gray-900">{{ formatDate(student.created_at) }}</p>
            </div>

            <!-- Assigned Staff -->
            <div v-if="studentDetail?.assigned_staff">
              <label class="block text-xs font-medium text-gray-500 uppercase tracking-wide">Zugewiesener Fahrlehrer</label>
              <p class="text-sm text-gray-900">
                {{ studentDetail.assigned_staff.first_name }} {{ studentDetail.assigned_staff.last_name }}
              </p>
            </div>
          </div>

          <!-- Quick Stats -->
          <div class="mt-6 pt-6 border-t">
            <h4 class="font-medium text-gray-900 mb-3">Statistiken</h4>
            <div class="grid grid-cols-2 gap-3 text-center">
              <div class="bg-blue-50 rounded-lg p-3">
                <div class="text-2xl font-bold text-blue-600">{{ appointments.length }}</div>
                <div class="text-xs text-blue-600">Termine</div>
              </div>
              <div class="bg-green-50 rounded-lg p-3">
                <div class="text-2xl font-bold text-green-600">{{ completedAppointments }}</div>
                <div class="text-xs text-green-600">Abgeschlossen</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Side - Appointments -->
        <div class="flex-1 flex flex-col">
          <!-- Appointments Header -->
          <div class="p-6 border-b">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-gray-900">Termine & Bewertungen</h3>
              <div class="flex gap-2">
                <button
                  @click="appointmentFilter = 'all'"
                  :class="[
                    'px-3 py-1 rounded-md text-sm font-medium transition-colors',
                    appointmentFilter === 'all'
                      ? 'bg-blue-100 text-blue-800'
                      : 'text-gray-600 hover:bg-gray-100'
                  ]"
                >
                  Alle
                </button>
                <button
                  @click="appointmentFilter = 'upcoming'"
                  :class="[
                    'px-3 py-1 rounded-md text-sm font-medium transition-colors',
                    appointmentFilter === 'upcoming'
                      ? 'bg-blue-100 text-blue-800'
                      : 'text-gray-600 hover:bg-gray-100'
                  ]"
                >
                  Zukünftig
                </button>
                <button
                  @click="appointmentFilter = 'past'"
                  :class="[
                    'px-3 py-1 rounded-md text-sm font-medium transition-colors',
                    appointmentFilter === 'past'
                      ? 'bg-blue-100 text-blue-800'
                      : 'text-gray-600 hover:bg-gray-100'
                  ]"
                >
                  Vergangen
                </button>
              </div>
            </div>
          </div>

          <!-- Appointments List -->
          <div class="flex-1 overflow-y-auto p-6">
            <!-- Loading Appointments -->
            <div v-if="loadingAppointments" class="text-center py-8">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p class="mt-2 text-gray-600">Lade Termine...</p>
            </div>

            <!-- No Appointments -->
            <div v-else-if="filteredAppointments.length === 0" class="text-center py-8">
              <div class="text-4xl mb-2">📅</div>
              <p class="text-gray-600">Keine Termine gefunden</p>
            </div>

            <!-- Appointments -->
            <div v-else class="space-y-4">
              <div
                v-for="appointment in filteredAppointments"
                :key="appointment.id"
                class="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow"
              >
                <!-- Appointment Header -->
                <div class="flex justify-between items-start mb-3">
                  <div>
                    <h4 class="font-medium text-gray-900">{{ appointment.title || 'Fahrstunde' }}</h4>
                    <p class="text-sm text-gray-600">
                      {{ formatDateTime(appointment.start_time) }} - {{ formatTime(appointment.end_time) }}
                    </p>
                    <p v-if="appointment.staff" class="text-xs text-gray-500">
                      Fahrlehrer: {{ appointment.staff.first_name }} {{ appointment.staff.last_name }}
                    </p>
                  </div>
                  
                  <!-- Status Badge -->
                  <span :class="[
                    'text-xs px-2 py-1 rounded-full',
                    getAppointmentStatusColor(appointment)
                  ]">
                    {{ getAppointmentStatus(appointment) }}
                  </span>
                </div>

                <!-- Rating & Notes (nur bei vergangenen Terminen) -->
                <div v-if="isPastAppointment(appointment) && appointment.notes && appointment.notes.length > 0" class="mt-3 pt-3 border-t">
                  <div v-for="note in appointment.notes" :key="note.id" class="space-y-2">
                    <!-- Rating -->
                    <div v-if="note.staff_rating" class="flex items-center gap-2">
                      <span class="text-sm font-medium text-gray-700">Bewertung:</span>
                      <div class="flex gap-1">
                        <span
                          v-for="rating in 6"
                          :key="rating"
                          :class="[
                            'w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center',
                            rating <= note.staff_rating 
                              ? 'bg-green-500 text-white' 
                              : 'bg-gray-200 text-gray-600'
                          ]"
                        >
                          {{ rating }}
                        </span>
                      </div>
                      <span class="text-xs text-gray-500">{{ getRatingText(note.staff_rating) }}</span>
                    </div>
                    
                    <!-- Note -->
                    <div v-if="note.staff_note" class="bg-gray-50 rounded p-3">
                      <p class="text-sm text-gray-700">{{ note.staff_note }}</p>
                      <p class="text-xs text-gray-500 mt-1">
                        {{ formatDate(note.last_updated_at) }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- No Rating Yet -->
                <div v-else-if="isPastAppointment(appointment)" class="mt-3 pt-3 border-t">
                  <p class="text-sm text-amber-600 bg-amber-50 rounded p-2">
                    ⏰ Noch nicht bewertet
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useStudents } from '~/composables/useStudents'

// Props
interface Props {
  show: boolean
  student: any | null
  currentUser: any | null
}

const props = defineProps<Props>()

// Emits
defineEmits<{
  close: []
  updated: []
}>()

// Composables
const { fetchStudent, fetchStudentAppointments, toggleStudentStatus } = useStudents()

// State
const studentDetail = ref<any>(null)
const appointments = ref<any[]>([])
const loadingAppointments = ref(false)
const isToggling = ref(false)
const appointmentFilter = ref<'all' | 'upcoming' | 'past'>('all')

// Computed
const filteredAppointments = computed(() => {
  const now = new Date()
  
  switch (appointmentFilter.value) {
    case 'upcoming':
      return appointments.value.filter(apt => new Date(apt.start_time) > now)
    case 'past':
      return appointments.value.filter(apt => new Date(apt.start_time) <= now)
    default:
      return appointments.value
  }
})

const completedAppointments = computed(() => {
  const now = new Date()
  return appointments.value.filter(apt => new Date(apt.end_time) <= now).length
})

// Methods
const loadStudentData = async () => {
  if (!props.student?.id) return

  try {
    // Load detailed student info
    studentDetail.value = await fetchStudent(props.student.id)
    
    // Load appointments
    loadingAppointments.value = true
    appointments.value = await fetchStudentAppointments(props.student.id)
    
  } catch (error) {
    console.error('Fehler beim Laden der Schülerdaten:', error)
  } finally {
    loadingAppointments.value = false
  }
}

const toggleStatus = async () => {
  if (!props.student?.id) return
  
  isToggling.value = true
  try {
    await toggleStudentStatus(props.student.id, !props.student.is_active)
    props.student.is_active = !props.student.is_active
  } catch (error) {
    console.error('Fehler beim Ändern des Status:', error)
  } finally {
    isToggling.value = false
  }
}

const isPastAppointment = (appointment: any) => {
  return new Date(appointment.end_time) <= new Date()
}

const getAppointmentStatus = (appointment: any) => {
  const now = new Date()
  const start = new Date(appointment.start_time)
  const end = new Date(appointment.end_time)
  
  if (end <= now) return 'Abgeschlossen'
  if (start <= now && end > now) return 'Läuft'
  return 'Geplant'
}

const getAppointmentStatusColor = (appointment: any) => {
  const status = getAppointmentStatus(appointment)
  
  switch (status) {
    case 'Abgeschlossen': return 'bg-green-100 text-green-800'
    case 'Läuft': return 'bg-blue-100 text-blue-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getRatingText = (rating: number) => {
  const texts = ['', 'besprochen', 'geübt', 'ungenügend', 'genügend', 'gut', 'prüfungsreif']
  return texts[rating] || ''
}

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'Kein Datum'
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return 'Ungültiges Datum'
    }
    return date.toLocaleDateString('de-CH')
  } catch (error) {
    console.warn('Error formatting date:', dateString, error)
    return 'Datum Fehler'
  }
}

const formatDateTime = (dateString: string | null | undefined) => {
  if (!dateString) return 'Kein Datum/Zeit'
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return 'Ungültiges Datum/Zeit'
    }
    return `${date.toLocaleDateString('de-CH')} ${date.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}`
  } catch (error) {
    console.warn('Error formatting dateTime:', dateString, error)
    return 'Datum/Zeit Fehler'
  }
}

const formatTime = (dateString: string | null | undefined) => {
  if (!dateString) return 'Keine Zeit'
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return 'Ungültige Zeit'
    }
    return date.toLocaleTimeString('de-CH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  } catch (error) {
    console.warn('Error formatting time:', dateString, error)
    return 'Zeit Fehler'
  }
}

// Watchers
watch(() => props.show && props.student, (newValue) => {
  if (newValue) {
    loadStudentData()
  }
}, { immediate: true })
</script>