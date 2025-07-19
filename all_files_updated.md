=== DRIVING TEAM PROJECT EXPORT ===
Generated: Sat Jul 19 10:04:55 CEST 2025

### ./package.json
```json
{
  "name": "driving-team-app",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "nuxt build",
    "dev": "nuxt dev",
    "generate": "nuxt generate",
    "preview": "nuxt preview",
    "postinstall": "nuxt prepare"
  },
  "dependencies": {
    "@fullcalendar/core": "^6.1.17",
    "@fullcalendar/daygrid": "^6.1.17",
    "@fullcalendar/interaction": "^6.1.17",
    "@fullcalendar/timegrid": "^6.1.17",
    "@fullcalendar/vue3": "^6.1.17",
    "@nuxt/ui": "^2.18.7",
    "@nuxtjs/supabase": "^1.5.3",
    "@pinia/nuxt": "^0.5.5",
    "@supabase/supabase-js": "^2.50.2",
    "nuxt": "^3.17.5",
    "pinia": "^2.2.6"
  },
  "devDependencies": {
    "@nuxt/eslint": "^0.5.7",
    "@types/node": "^24.0.12",
    "eslint": "^8.57.1",
    "typescript": "^5.8.3",
    "vue-tsc": "^2.2.12"
  }
}
```

### ./nuxt.config.ts
```typescript
// nuxt.config.ts
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: false },
  ssr: true,
  
  // --- Module Configuration (MIT @nuxtjs/supabase hinzugefügt) ---
  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    '@nuxt/eslint',
    '@nuxtjs/supabase' // ✅ DIESE ZEILE HINZUFÜGEN
  ],
  
  // ✅ SUPABASE KONFIGURATION MIT UMGEBUNGSVARIABLEN
  // @ts-ignore - Supabase Konfiguration wird vom @nuxtjs/supabase Modul erweitert
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY,
    redirectOptions: {
      login: '/',
      callback: '/dashboard',
      exclude: ['/']
    }
  },
  
  // --- Build Configuration ---
  build: {
    transpile: [
      '@fullcalendar/core',
      '@fullcalendar/daygrid',
      '@fullcalendar/timegrid',
      '@fullcalendar/interaction',
      '@fullcalendar/vue3',
    ],
  },
  
  // --- TypeScript Configuration ---
  typescript: {
    strict: true,
    typeCheck: true
  },
  
  // --- Nitro Configuration ---
  nitro: {
    experimental: {
      wasm: true
    }
  },
  
  experimental: {
    // Suspense explizit aktivieren
    payloadExtraction: false
  },
  
  // Vue-spezifische Konfiguration
  vue: {
    compilerOptions: {
      // Suspense-Warnungen unterdrücken
      isCustomElement: (tag: string) => false
    }
  },
  
  runtimeConfig: {
    // Private keys (only available on server-side)
    walleeSpaceId: process.env.WALLEE_SPACE_ID,
    walleeApplicationUserId: process.env.WALLEE_APPLICATION_USER_ID,
    walleeSecretKey: process.env.WALLEE_SECRET_KEY,
    
    // Public keys (exposed to client-side)
    public: {
      googleMapsApiKey: process.env.VITE_GOOGLE_MAPS_API_KEY,
      walleeSpaceId: process.env.WALLEE_SPACE_ID,
      walleeUserId: process.env.WALLEE_USER_ID
    }
  },
  
  app: {
    head: {
      script: [
        {
          src: `https://maps.googleapis.com/maps/api/js?key=${process.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places&language=de&region=CH&v=beta&loading=async`,
          async: true,
          defer: true
        }
      ]
    }
  }
})```

### ./.env (Structure)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
VITE_GOOGLE_MAPS_API_KEY=your-maps-key
WALLEE_SPACE_ID=your-space-id
WALLEE_APPLICATION_USER_ID=your-user-id
WALLEE_SECRET_KEY=your-secret-key
```

### ./app.vue
```vue
<template>
  <div>
    <NuxtPage />
  </div>
</template>

```

### ./components/AddStudentModal.vue
```vue
<!-- components/AddStudentModal.vue -->
<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black bg-opacity-50" @click="$emit('close')"></div>
    
    <!-- Modal -->
    <div class="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b bg-gray-50">
        <h2 class="text-xl font-bold text-gray-900">Neuen Schüler hinzufügen</h2>
        <button 
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600 text-2xl"
        >
          ×
        </button>
      </div>

      <!-- Form -->
      <form @submit.prevent="submitForm" class="overflow-y-auto max-h-[70vh]">
        <div class="p-6 space-y-6">
          <!-- Personal Information -->
          <div>
            <h3 class="text-lg font-medium text-gray-900 mb-4">Persönliche Angaben</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- First Name -->
              <div>
                <label for="firstName" class="block text-sm font-medium text-gray-700 mb-1">
                  Vorname *
                </label>
                <input
                  id="firstName"
                  v-model="form.first_name"
                  type="text"
                  required
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  :class="{ 'border-red-300': errors.first_name }"
                  placeholder="Max"
                >
                <p v-if="errors.first_name" class="text-red-600 text-xs mt-1">{{ errors.first_name }}</p>
              </div>

              <!-- Last Name -->
              <div>
                <label for="lastName" class="block text-sm font-medium text-gray-700 mb-1">
                  Nachname *
                </label>
                <input
                  id="lastName"
                  v-model="form.last_name"
                  type="text"
                  required
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  :class="{ 'border-red-300': errors.last_name }"
                  placeholder="Mustermann"
                >
                <p v-if="errors.last_name" class="text-red-600 text-xs mt-1">{{ errors.last_name }}</p>
              </div>

              <!-- Email -->
              <div class="md:col-span-2">
                <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
                  E-Mail Adresse *
                </label>
                <input
                  id="email"
                  v-model="form.email"
                  type="email"
                  required
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  :class="{ 'border-red-300': errors.email }"
                  placeholder="max.mustermann@example.com"
                >
                <p v-if="errors.email" class="text-red-600 text-xs mt-1">{{ errors.email }}</p>
              </div>

              <!-- Phone -->
              <div>
                <label for="phone" class="block text-sm font-medium text-gray-700 mb-1">
                  Telefonnummer
                </label>
                <input
                  id="phone"
                  v-model="form.phone"
                  type="tel"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="+41 79 123 45 67"
                >
              </div>

              <!-- Birthdate -->
              <div>
                <label for="birthdate" class="block text-sm font-medium text-gray-700 mb-1">
                  Geburtsdatum
                </label>
                <input
                  id="birthdate"
                  v-model="form.birthdate"
                  type="date"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
              </div>

              <!-- Category -->
              <div>
                <label for="category" class="block text-sm font-medium text-gray-700 mb-1">
                  Führerausweis-Kategorie
                </label>
                <select
                  id="category"
                  v-model="form.category"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Kategorie wählen</option>
                  <option value="A1">A1 - Motorrad bis 125ccm</option>
                  <option value="A35kW">A (35kW) - Motorrad bis 35kW</option>
                  <option value="A">A - Motorrad unbeschränkt</option>
                  <option value="B">B - Personenwagen</option>
                  <option value="BE">BE - Personenwagen mit Anhänger</option>
                  <option value="C">C - Lastwagen</option>
                  <option value="CE">CE - Lastwagen mit Anhänger</option>
                  <option value="D">D - Bus</option>
                  <option value="DE">DE - Bus mit Anhänger</option>
                </select>
              </div>

              <!-- Assigned Staff (nur für Admin) -->
              <div v-if="currentUser?.role === 'admin'">
                <label for="assignedStaff" class="block text-sm font-medium text-gray-700 mb-1">
                  Zugewiesener Fahrlehrer
                </label>
                <select
                  id="assignedStaff"
                  v-model="form.assigned_staff_id"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Fahrlehrer wählen</option>
                  <option v-for="staff in staffMembers" :key="staff.id" :value="staff.id">
                    {{ staff.first_name }} {{ staff.last_name }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <!-- Address Information -->
          <div>
            <h3 class="text-lg font-medium text-gray-900 mb-4">Adresse (optional)</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <!-- Street -->
              <div class="md:col-span-2">
                <label for="street" class="block text-sm font-medium text-gray-700 mb-1">
                  Strasse
                </label>
                <input
                  id="street"
                  v-model="form.street"
                  type="text"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Musterstrasse"
                >
              </div>

              <!-- Street Number -->
              <div>
                <label for="streetNr" class="block text-sm font-medium text-gray-700 mb-1">
                  Hausnummer
                </label>
                <input
                  id="streetNr"
                  v-model="form.street_nr"
                  type="text"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="123"
                >
              </div>

              <!-- ZIP -->
              <div>
                <label for="zip" class="block text-sm font-medium text-gray-700 mb-1">
                  PLZ
                </label>
                <input
                  id="zip"
                  v-model="form.zip"
                  type="text"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="8000"
                >
              </div>

              <!-- City -->
              <div class="md:col-span-2">
                <label for="city" class="block text-sm font-medium text-gray-700 mb-1">
                  Stadt
                </label>
                <input
                  id="city"
                  v-model="form.city"
                  type="text"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Zürich"
                >
              </div>
            </div>
          </div>

          <!-- Additional Information -->
          <div>
            <h3 class="text-lg font-medium text-gray-900 mb-4">Zusätzliche Informationen</h3>
            
            <div class="space-y-4">
              <!-- Lernfahrausweis -->
              <div>
                <label for="lernfahrausweis" class="block text-sm font-medium text-gray-700 mb-1">
                  Lernfahrausweis-Nummer
                </label>
                <input
                  id="lernfahrausweis"
                  v-model="form.lernfahrausweis_url"
                  type="text"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="z.B. L-123456789"
                >
                <p class="text-xs text-gray-500 mt-1">
                  Später kann ein Foto des Lernfahrausweises hochgeladen werden
                </p>
              </div>

              <!-- Payment Provider -->
              <div>
                <label for="paymentProvider" class="block text-sm font-medium text-gray-700 mb-1">
                  Bevorzugte Zahlungsmethode
                </label>
                <select
                  id="paymentProvider"
                  v-model="form.payment_prov"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Zahlungsmethode wählen</option>
                  <option value="twint">TWINT</option>
                  <option value="debit">Debitkarte</option>
                  <option value="credit">Kreditkarte</option>
                  <option value="invoice">Rechnung</option>
                  <option value="cash">Bar</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between p-6 border-t bg-gray-50">
          <p class="text-sm text-gray-600">
            * Pflichtfelder
          </p>
          <div class="flex gap-3">
            <button
              type="button"
              @click="$emit('close')"
              class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              :disabled="isSubmitting || !isFormValid"
              :class="[
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                isFormValid && !isSubmitting
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              ]"
            >
              {{ isSubmitting ? 'Speichert...' : 'Schüler hinzufügen' }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useStudents } from '~/composables/useStudents'
import { getSupabase } from '~/utils/supabase'

const emit = defineEmits<{
  close: []
  added: [student: any]
}>()

// Props
interface Props {
  show: boolean
  currentUser: any | null
}

const props = defineProps<Props>()

// Emits
defineEmits<{
  close: []
  added: [student: any]
}>()

// Composables
const { addStudent } = useStudents()

// State
const isSubmitting = ref(false)
const staffMembers = ref<any[]>([])

// Form Data
const form = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  birthdate: '',
  street: '',
  street_nr: '',
  zip: '',
  city: '',
  category: '',
  lernfahrausweis_url: '',
  payment_prov: '',
  assigned_staff_id: ''
})

// Form Validation
const errors = ref<Record<string, string>>({})

const isFormValid = computed(() => {
  return form.value.first_name.trim() && 
         form.value.last_name.trim() && 
         form.value.email.trim() && 
         isValidEmail(form.value.email)
})

// Methods
const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const validateForm = () => {
  errors.value = {}

  if (!form.value.first_name.trim()) {
    errors.value.first_name = 'Vorname ist erforderlich'
  }

  if (!form.value.last_name.trim()) {
    errors.value.last_name = 'Nachname ist erforderlich'
  }

  if (!form.value.email.trim()) {
    errors.value.email = 'E-Mail ist erforderlich'
  } else if (!isValidEmail(form.value.email)) {
    errors.value.email = 'Ungültige E-Mail-Adresse'
  }

  return Object.keys(errors.value).length === 0
}

const resetForm = () => {
  form.value = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    birthdate: '',
    street: '',
    street_nr: '',
    zip: '',
    city: '',
    category: '',
    lernfahrausweis_url: '',
    payment_prov: '',
    assigned_staff_id: ''
  }
  errors.value = {}
}

const loadStaffMembers = async () => {
  if (props.currentUser?.role !== 'admin') return

  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('role', 'staff')
      .eq('is_active', true)
      .order('first_name')

    if (error) throw error
    staffMembers.value = data || []

  } catch (error) {
    console.error('Fehler beim Laden der Fahrlehrer:', error)
  }
}

const submitForm = async () => {
  if (!validateForm()) return

  isSubmitting.value = true

  try {
    // Prepare form data - remove empty strings
    const studentData = Object.fromEntries(
      Object.entries(form.value).filter(([key, value]) => value !== '')
    )

    // Auto-assign to current user if staff
    if (props.currentUser?.role === 'staff') {
      studentData.assigned_staff_id = props.currentUser.id
    }

    const newStudent = await addStudent(studentData)
    
    // Success feedback (you can add a toast notification here)
    console.log('Schüler erfolgreich hinzugefügt:', newStudent)
    
    // Reset form and close modal
    resetForm()
    emit('added', newStudent)
    emit('close')

  } catch (error: any) {
    console.error('Fehler beim Hinzufügen des Schülers:', error)
    
    // Handle specific errors
    if (error.message?.includes('duplicate')) {
      errors.value.email = 'Diese E-Mail-Adresse ist bereits registriert'
    } else {
      // General error (you can show a toast notification here)
      alert('Fehler beim Hinzufügen des Schülers: ' + error.message)
    }
  } finally {
    isSubmitting.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadStaffMembers()
})

// Watchers
watch(() => props.show, (newValue) => {
  if (newValue) {
    resetForm()
    loadStaffMembers()
  }
})

// Real-time validation
watch(() => form.value.email, () => {
  if (errors.value.email && isValidEmail(form.value.email)) {
    delete errors.value.email
  }
})

watch(() => form.value.first_name, () => {
  if (errors.value.first_name && form.value.first_name.trim()) {
    delete errors.value.first_name
  }
})

watch(() => form.value.last_name, () => {
  if (errors.value.last_name && form.value.last_name.trim()) {
    delete errors.value.last_name
  }
})
</script>```

### ./components/CalendarComponent.vue
```vue
<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { CalendarOptions } from '@fullcalendar/core'
import dayGridPlugin from '@fullcalendar/daygrid'
import EventModal from './EventModal.vue'
import { getSupabase } from '~/utils/supabase'
import ConfirmationDialog from './ConfirmationDialog.vue'
import { useAppointmentStatus } from '~/composables/useAppointmentStatus'
import MoveAppointmentModal from './MoveAppointmentModal.vue'




// Neue refs für Confirmation Dialog
const showConfirmation = ref(false)
const confirmationData = ref({
  title: '',
  message: '',
  details: '',
  icon: '',
  type: 'warning' as 'success' | 'warning' | 'danger',
  confirmText: 'Bestätigen',
  cancelText: 'Abbrechen'
})
const pendingAction = ref<(() => Promise<void>) | null>(null)
const showMoveModal = ref(false)
const selectedAppointmentToMove = ref<CalendarAppointment | null>(null)


// Helper-Funktion für Confirmation Dialog
const showConfirmDialog = (options: {
  title: string
  message: string
  details?: string
  icon?: string
  type?: 'success' | 'warning' | 'danger'
  confirmText?: string
  cancelText?: string
  action: () => Promise<void>
}) => {
  confirmationData.value = {
    title: options.title,
    message: options.message,
    details: options.details || '',
    icon: options.icon || '❓',
    type: options.type || 'warning',
    confirmText: options.confirmText || 'Bestätigen',
    cancelText: options.cancelText || 'Abbrechen'
  }
  pendingAction.value = options.action
  showConfirmation.value = true
}

// CalendarComponent.vue - Einfache Toast-Alternative

const showToast = (message: string) => {
  // Einfache Browser-Benachrichtigung
  if (message.includes('✅')) {
    alert('✅ ' + message.replace('✅ ', ''))
  } else if (message.includes('❌')) {
    alert('❌ ' + message.replace('❌ ', ''))
  } else {
    alert(message)
  }
}

// Confirmation handlers
const handleConfirmAction = async () => {
  if (pendingAction.value) {
    await pendingAction.value()
  }
  showConfirmation.value = false
  pendingAction.value = null
}

const handleCancelAction = () => {
  showConfirmation.value = false
  pendingAction.value = null
}

const openMoveModal = (appointment: CalendarAppointment) => {
  selectedAppointmentToMove.value = appointment
  showMoveModal.value = true
}

const { updateOverdueAppointments } = useAppointmentStatus()


const calendar = ref()
const supabase = getSupabase()

interface Props {
  currentUser?: any
}

const props = defineProps<Props>()

const isModalVisible = ref(false)
const modalEventData = ref<any>(null)
const modalMode = ref<'view' | 'edit' | 'create'>('create')

const handleAppointmentMoved = async (moveData: MoveData) => {
  console.log('✅ Appointment moved:', moveData)
  
  try {
    // Kalender neu laden
    await loadAppointments()
    
    // Success Toast
    showToast('✅ Termin erfolgreich verschoben')
  } catch (error) {
    console.error('❌ Error reloading calendar:', error)
    showToast('❌ Fehler beim Aktualisieren des Kalenders')
  }
}


type CalendarEvent = {
  id: string
  title: string
  start: string
  end: string
  allDay?: boolean
  extendedProps?: {
    location?: string
    staff_note?: string
    client_note?: string
    category?: string
    instructor?: string
    student?: string
    price?: number
    user_id?: string
    staff_id?: string
    location_id?: string
    duration_minutes?: number
    price_per_minute?: number
    status?: string
    is_paid?: boolean
    appointment_type?: string
    is_team_invite?: boolean
    original_type?: string
  }
}

interface MoveData {
  appointmentId: string
  newStart: string
  newEnd: string
}

interface CalendarAppointment {
  id: string
  title: string
  start: Date | string
  end: Date | string
  extendedProps?: {
    student?: string
    location?: string
    user_name?: string
    duration_minutes?: number
    [key: string]: any
  }
}

const calendarEvents = ref<CalendarEvent[]>([])
const isLoadingEvents = ref(false)

const emit = defineEmits(['view-updated', 'appointment-changed'])

const loadStaffMeetings = async () => {
  console.log('🔄 Loading staff meetings...')
  try {
    const supabase = getSupabase()
    let query = supabase
      .from('staff_meetings')
      .select(`
        *,
        staff:staff_id(first_name, last_name),
        location:location_id(name, address)
      `)
      .eq('staff_id', props.currentUser?.id) // Nur eigene Meetings
      .order('start_time')

    const { data: meetings, error } = await query

    console.log('📊 Raw staff meetings from DB:', meetings?.length || 0)
    if (error) throw error

    // Convert zu Calendar Events Format
    const convertedMeetings = (meetings || []).map((meeting) => ({
      id: meeting.id,
      title: meeting.title || 'Staff Meeting',
      start: meeting.start_time,
      end: meeting.end_time,
      allDay: false,
      extendedProps: {
        location: meeting.location?.name || 'Kein Ort',
        description: meeting.description || '',
        category: meeting.event_type_code,
        staff_id: meeting.staff_id,
        location_id: meeting.location_id,
        duration_minutes: meeting.duration_minutes,
        status: meeting.status,
        // Markiere als Staff Meeting
        isStaffMeeting: true,
        eventType: 'staff_meeting'
      }
    }))

    console.log('✅ Staff meetings loaded:', convertedMeetings.length)
    return convertedMeetings

  } catch (error) {
    console.error('❌ Error loading staff meetings:', error)
    return []
  }
}

// Kombiniere beide Datenquellen in loadAppointments
const loadAppointments = async () => {
  isLoadingEvents.value = true
  try {
    console.log('🔄 Loading all calendar events...')
    
    // Parallel laden
    const [appointments, staffMeetings] = await Promise.all([
      loadRegularAppointments(), // Deine bestehende Logik umbenennen
      loadStaffMeetings()
    ])

    // Kombinieren
    const allEvents = [...appointments, ...staffMeetings]
    calendarEvents.value = allEvents

    console.log('✅ Final calendar summary:', {
      appointments: appointments.length,
      staffMeetings: staffMeetings.length,
      total: allEvents.length
    })

    if (calendar.value?.getApi) {
      const calendarApi = calendar.value.getApi()
      calendarApi.refetchEvents()
    }

  } catch (error) {
    console.error('❌ Error loading calendar events:', error)
  } finally {
    isLoadingEvents.value = false
  }
}

const loadRegularAppointments = async () => {
  isLoadingEvents.value = true
  try {
    console.log('🔄 Loading appointments from Supabase...')
    console.log('👤 Current user:', props.currentUser?.id)
    
    // Erweiterte Abfrage: Eigene Termine UND Team-Einladungen
    let query = supabase
      .from('appointments')
      .select(`
        *,
        user:user_id(first_name, last_name),
        staff:staff_id(first_name, last_name),
        location:location_id(name, address)
      `)
      .or(`staff_id.eq.${props.currentUser?.id}`) // Eigene Termine (als staff_id)
      .order('start_time')
    
    const { data: appointments, error } = await query
    
    console.log('📊 Raw appointments from DB:', appointments?.length || 0)
    
    if (error) throw error
    
    // Filtern: Eigene Termine + echte Team-Einladungen (nicht doppelte)
    const filteredAppointments = (appointments || []).filter((apt) => {
      const isOwnAppointment = apt.staff_id === props.currentUser?.id
      const isTeamInvite = apt.type === 'team_invite'
      
      // Debug-Info
      console.log(`🔍 Filtering appointment "${apt.title}":`, {
        id: apt.id,
        staff_id: apt.staff_id,
        type: apt.type,
        isOwnAppointment,
        isTeamInvite,
        currentUserId: props.currentUser?.id
      })
      
      return isOwnAppointment // Nur eigene Termine
    })
    
    console.log('✅ Filtered appointments:', filteredAppointments.length)
    
    const convertedEvents = filteredAppointments.map((apt) => {
      const isTeamInvite = apt.type === 'team_invite'
      
      const event = {
        id: apt.id,
        title: apt.title || `${apt.user?.first_name || 'Unbekannt'} - ${apt.type || 'Termin'}`,
        start: new Date(apt.start_time).toISOString(), 
        end: new Date(apt.end_time).toISOString(),
        allDay: false,
        extendedProps: {
          location: apt.location?.name || 'Kein Ort',
          staff_note: apt.description || '',
          client_note: '',
          category: apt.type,
          instructor: `${apt.staff?.first_name || ''} ${apt.staff?.last_name || ''}`.trim(),
          student: `${apt.user?.first_name || ''} ${apt.user?.last_name || ''}`.trim(),
          price: (apt.price_per_minute || 0) * (apt.duration_minutes || 45),
          user_id: apt.user_id,
          staff_id: apt.staff_id,
          location_id: apt.location_id,
          duration_minutes: apt.duration_minutes,
          price_per_minute: apt.price_per_minute,
          status: apt.status,
          is_paid: apt.is_paid,
          // WICHTIG: Typ-Informationen für Modal
          appointment_type: apt.type,
          is_team_invite: isTeamInvite,
          original_type: apt.type
        }
      }
      
      console.log('🔍 TIME COMPARISON:', {
        dbStartTime: apt.start_time,
        eventStartTime: event.start,
        parsedDate: new Date(apt.start_time),
        parsedISOString: new Date(apt.start_time).toISOString()
      })
      
      return event
    })
    
    calendarEvents.value = convertedEvents
    
    
    console.log('✅ Final calendar summary:', {
      totalEvents: convertedEvents.length,
      teamInvites: convertedEvents.filter(e => e.extendedProps.is_team_invite).length,
      regularTermine: convertedEvents.filter(e => !e.extendedProps.is_team_invite).length,
      lessons: convertedEvents.filter(e => e.extendedProps.appointment_type === 'lesson').length,
      others: convertedEvents.filter(e => !['lesson', 'team_invite'].includes(e.extendedProps.appointment_type)).length
    })
    
    
    if (calendar.value?.getApi) {
      const calendarApi = calendar.value.getApi()
      calendarApi.refetchEvents()
      console.log('🔄 Calendar events refetched')
    }
    return convertedEvents 

    
  } catch (error) {
    console.error('❌ Error loading appointments:', error)
    return [] 
  } finally {
    isLoadingEvents.value = false
  }
}

const handleMoveError = (error: string) => {
  console.error('❌ Move error:', error)
  showToast('❌ Fehler beim Verschieben: ' + error)
}

const editAppointment = (appointment: CalendarAppointment) => {
  console.log('✏️ Edit appointment:', appointment.id)
  // TODO: Implementiere Edit-Modal
  // emit('edit-appointment', appointment)
  showToast('Edit-Funktion noch nicht implementiert')
}

// Im calendarOptions eventClick ersetzen:
// eventClick: handleEventClick,

const handleSaveEvent = async (eventData: CalendarEvent) => {
  console.log('💾 Event saved, refreshing calendar...')
  
  // View-Position speichern
  const currentDate = calendar.value?.getApi()?.getDate()
  
  // Daten neu laden
  await loadAppointments()
  await loadStaffMeetings()
  
  // View-Position wiederherstellen falls nötig
  if (currentDate && calendar.value?.getApi) {
    calendar.value.getApi().gotoDate(currentDate)
    console.log('✅ View position preserved:', currentDate)
  }
  
  emit('appointment-changed', { type: 'saved', data: eventData })
  isModalVisible.value = false
}

// CalendarComponent.vue - Erweiterte handleEventDrop Funktion
// Debug-Version um die richtigen Selektoren zu finden
const updateModalFieldsIfOpen = (event: any) => {
  console.log('🔍 Debugging modal inputs...')
  
  // Verschiedene Selektoren ausprobieren
  const dateInputs = document.querySelectorAll('input[type="date"]')
  const timeInputs = document.querySelectorAll('input[type="time"]')
  const allInputs = document.querySelectorAll('input')
  
  console.log('📊 Found inputs:', {
    dateInputs: dateInputs.length,
    timeInputs: timeInputs.length,
    allInputs: allInputs.length
  })
  
  // Alle Input-Elemente loggen um die richtigen zu finden
  allInputs.forEach((input, index) => {
    console.log(`Input ${index}:`, {
      type: input.type,
      id: input.id,
      name: input.name,
      className: input.className,
      value: input.value,
      placeholder: input.placeholder
    })
  })
  
  // Versuchen spezifischere Selektoren basierend auf Ihrem Modal
  const startDateInput = document.querySelector('input[type="date"]') as HTMLInputElement
  const startTimeInput = document.querySelector('input[type="time"]:first-of-type') as HTMLInputElement
  const endTimeInput = document.querySelector('input[type="time"]:last-of-type') as HTMLInputElement
  
}

const eventModalRef = ref()
const isUpdating = ref(false)
const modalEventType = ref<'lesson' | 'staff_meeting'>('lesson')


// Überarbeitete handleEventDrop mit schönem Dialog
const handleEventDrop = async (dropInfo: any) => {
  const newStartTime = new Date(dropInfo.event.start).toLocaleString('de-CH', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
  
  const newEndTime = new Date(dropInfo.event.end).toLocaleString('de-CH', {
    hour: '2-digit',
    minute: '2-digit'
  })

  const moveAction = async () => {
    try {
      console.log('✅ User confirmed move, updating database...')
      
      const { error } = await supabase
        .from('appointments')
        .update({
          start_time: dropInfo.event.startStr,
          end_time: dropInfo.event.endStr
        })
        .eq('id', dropInfo.event.id)

      if (error) throw error

      console.log('✅ Appointment moved in database:', dropInfo.event.title)
      
      // Modal aktualisieren falls offen
      if (isModalVisible.value && modalEventData.value?.id === dropInfo.event.id) {
        console.log('📝 Updating modal data...')
        modalEventData.value = {
          ...modalEventData.value,
          start: dropInfo.event.startStr,
          end: dropInfo.event.endStr
        }
      }
      
      // Kalender neu laden
      console.log('🔄 Reloading calendar events...')
        isUpdating.value = true
        await loadAppointments()
        await loadStaffMeetings()
        isUpdating.value = false

      
      console.log(`✅ Termin "${dropInfo.event.title}" erfolgreich verschoben`)
      
    } catch (err: any) {
      console.error('❌ Error moving appointment:', err)
      dropInfo.revert()
      
      // Schöne Fehlermeldung auch mit Dialog
      showConfirmDialog({
        title: 'Fehler beim Verschieben',
        message: 'Der Termin konnte nicht verschoben werden.',
        details: `<strong>Fehler:</strong> ${err?.message || 'Unbekannter Fehler'}<br><br>Der Termin wurde auf die ursprüngliche Zeit zurückgesetzt.`,
        icon: '❌',
        type: 'danger',
        confirmText: 'OK',
        cancelText: '',
        action: async () => {} // Leere Aktion für OK-Button
      })
    }
  }

const studentName = dropInfo.event.extendedProps?.student || 'Unbekannt'
const studentPhone = dropInfo.event.extendedProps?.phone || 'Keine Nummer'

showConfirmDialog({
  title: 'Termin verschieben',
  message: 'Möchten Sie diesen Termin wirklich verschieben?',
  details: `
    <strong>Termin:</strong> ${dropInfo.event.title}<br>
    <strong>Neue Zeit:</strong> ${newStartTime} - ${newEndTime}<br>
    <strong>Fahrschüler:</strong> ${studentName}<br><br>
    
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div class="flex items-center gap-2 mb-2">
        <input type="checkbox" id="sendSms" checked class="rounded border-gray-300">
        <label for="sendSms" class="font-medium text-blue-800">
          📱 SMS-Benachrichtigung senden
        </label>
      </div>
      <div class="text-xs text-blue-600">
        Der Fahrschüler wird über die Terminverschiebung informiert.
      </div>
    </div>
  `,
  icon: '🔄',
  type: 'warning',
  confirmText: 'Verschieben & Benachrichtigen',
  cancelText: 'Abbrechen',
  action: moveAction
})

  // Verschieben erstmal rückgängig machen, wird nur bei Bestätigung durchgeführt
  dropInfo.revert()
}

// Überarbeitete handleEventResize
const handleEventResize = async (resizeInfo: any) => {
  const durationMs = resizeInfo.event.end.getTime() - resizeInfo.event.start.getTime()
  const durationMinutes = Math.round(durationMs / (1000 * 60))

  const resizeAction = async () => {
    try {
      console.log('✅ User confirmed resize, updating database...')
      
      const { error } = await supabase
        .from('appointments')
        .update({
          end_time: resizeInfo.event.endStr,
          duration_minutes: durationMinutes
        })
        .eq('id', resizeInfo.event.id)

      if (error) throw error
      
      console.log('✅ Appointment resized in database:', resizeInfo.event.title)
      
      if (isModalVisible.value && modalEventData.value?.id === resizeInfo.event.id) {
        modalEventData.value = {
          ...modalEventData.value,
          end: resizeInfo.event.endStr
        }
      }
      
      await loadAppointments()
      await loadStaffMeetings()
      
    } catch (err: any) {
      console.error('❌ Error resizing appointment:', err)
      resizeInfo.revert()
      
      showConfirmDialog({
        title: 'Fehler beim Ändern',
        message: 'Die Terminlänge konnte nicht geändert werden.',
        details: `<strong>Fehler:</strong> ${err?.message || 'Unbekannter Fehler'}`,
        icon: '❌',
        type: 'danger',
        confirmText: 'OK',
        cancelText: '',
        action: async () => {}
      })
    }
  }

showConfirmDialog({
  title: 'Terminlänge ändern',
  message: 'Möchten Sie die Terminlänge wirklich ändern?',
  details: `
    <strong>Termin:</strong> ${resizeInfo.event.title}<br>
    <strong>Neue Dauer:</strong> ${durationMinutes} Minuten<br>
    <strong>Fahrschüler:</strong> ${resizeInfo.event.extendedProps?.student || 'Unbekannt'}<br><br>
    
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div class="flex items-center gap-2 mb-2">
        <input type="checkbox" id="sendSmsResize" checked class="rounded border-gray-300">
        <label for="sendSmsResize" class="font-medium text-blue-800">
          📱 SMS über Änderung senden
        </label>
      </div>
      <div class="text-xs text-blue-600">
        Der Fahrschüler wird über die Terminänderung informiert.
      </div>
    </div>
  `,
  icon: '📏',
  type: 'warning',
  confirmText: 'Ändern & Benachrichtigen',
  cancelText: 'Abbrechen',
  action: resizeAction
})

  resizeInfo.revert()
}

  const calendarOptions = ref<CalendarOptions>({
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'timeGridWeek',
    locale: 'delocale',
    timeZone: 'local',
    
    allDaySlot: false,
    slotMinTime: '05:00:00',
    slotMaxTime: '23:00:00',
    firstDay: 1,
    displayEventTime: true,
    forceEventDuration: true, 
    selectable: true,
    editable: true,
    events: calendarEvents.value,
    eventDrop: handleEventDrop,
    eventResize: handleEventResize,
  // Klick auf leeren Zeitslot
 dateClick: (arg) => {
  console.log('🔍 FREE SLOT CLICKED:', {
    clickedDate: arg.date,
    clickedISO: arg.date.toISOString()
  })
  
  // ✅ FIX 1: Verwende originale Zeit (keine -2h Korrektur)
  const clickedDate = arg.date
  const endDate = new Date(clickedDate.getTime() + 45 * 60000)
  
  console.log('📅 CREATE MODE: Free slot clicked at', clickedDate.toISOString())
  
  isModalVisible.value = true
  modalMode.value = 'create'
  modalEventData.value = {
    title: '',
    start: clickedDate.toISOString(), 
    end: endDate.toISOString(),
    allDay: arg.allDay,
    
    // ✅ FIX 2: KRITISCH - Markierung für freien Slot
    isFreeslotClick: true,
    clickSource: 'calendar-free-slot',
    
    // ✅ FIX 3: Explizit KEINE Student-Daten
    user_id: null,
    selectedStudentId: null,
    preselectedStudent: null,
    
    extendedProps: {
      location: '',
      staff_note: '',
      client_note: '',
      eventType: 'lesson',
      isNewAppointment: true
    }
  }
  
  console.log('✅ FREE SLOT: Modal opened with clean data (no student preselection)')
},

eventContent: (arg) => {
  const student = arg.event.extendedProps?.student || ''
  const location = arg.event.extendedProps?.location || ''
  
  return {
    html: `
      <div class="custom-event">
        <div class="event-name">${student}</div>
          <div class="event-location"> ${location}</div>
        </div>
      </div>
    `
  }
},

// Klick auf existierenden Termin
eventClick: (clickInfo) => {
  const appointmentData = calendarEvents.value.find(evt => evt.id === clickInfo.event.id)

 // Type Assertion verwenden
  const extendedProps = appointmentData?.extendedProps as any
  
  // Event Type erkennen
  const isStaffMeeting = extendedProps?.eventType === 'staff_meeting' ||
                         extendedProps?.isStaffMeeting === true ||
                         !extendedProps?.student // Kein Student = Staff Meeting
  
  modalEventType.value = isStaffMeeting ? 'staff_meeting' : 'lesson'
  
  isModalVisible.value = true
  modalMode.value = 'edit'
  modalEventData.value = appointmentData
},

// Ziehen/Auswählen von Zeitbereich
select: (arg) => {
  isModalVisible.value = true
  modalMode.value = 'create'
  modalEventData.value = {
    title: '',
    start: arg.start,
    end: arg.end,
    allDay: arg.allDay
  }
},
  
  // DEBUG: Callback um zu sehen ob Events verarbeitet werden
  eventDidMount: (info) => {
    console.log('✅ EVENT MOUNTED:',  {
    title: info.event.title,
    start: info.event.start,
    end: info.event.end,
    startStr: info.event.startStr,
    endStr: info.event.endStr
  })
  },
  eventClassNames: (arg) => {
  const category = arg.event.extendedProps?.category || 'default'
  return [`category-${category.toLowerCase()}`]
},
})

let calendarApi: any = null

// 🔥 NEU: Refresh Function hinzufügen
const refreshCalendar = async () => {
  console.log('🔄 CalendarComponent - Refreshing calendar...')
  
  try {
    // 1. Aktuelle View-Position speichern
    const currentDate = calendar.value?.getApi()?.getDate()
    
    // 2. Daten neu laden
    await Promise.all([
      loadAppointments(),
      loadStaffMeetings()
    ])
    
    // 3. Warte einen Moment für State-Updates
    await nextTick()
    
    // 4. FullCalendar wird automatisch durch die watch(calendarEvents) aktualisiert
    console.log('✅ Calendar data refreshed')
    
    // 5. View-Position wiederherstellen falls nötig
    if (currentDate && calendar.value?.getApi) {
      const api = calendar.value.getApi()
      const currentViewDate = api.getDate()
      
      // Nur wiederherstellen falls sich Position geändert hat
      if (Math.abs(currentDate.getTime() - currentViewDate.getTime()) > 24 * 60 * 60 * 1000) {
        api.gotoDate(currentDate)
        console.log('✅ View position restored to:', currentDate)
      }
    }
    
  } catch (error) {
    console.error('❌ Error during calendar refresh:', error)
  }
}

const isCalendarReady = ref(false)

const handleDeleteEvent = async (eventData: CalendarEvent) => {
  console.log('🗑 Event deleted, refreshing calendar...')
  await loadAppointments()
  await loadStaffMeetings()

  refreshCalendar()

  // 🆕 Event nach oben emittieren  
  emit('appointment-changed', { type: 'deleted', data: eventData })
  
  isModalVisible.value = false
}

onMounted(async () => {
  console.log('📅 CalendarComponent mounted')
  isCalendarReady.value = true
  
  // 🔥 NEU: Calendar API Setup
  await nextTick()
  if (calendar.value) {
    calendarApi = calendar.value.getApi()
    console.log('✅ Calendar API initialized')
    emit('view-updated', calendarApi.view.currentStart)
  }
  
  console.log('🔄 Initial appointment loading...')
  await loadAppointments()
  await loadStaffMeetings()
})

watch(() => props.currentUser, async (newUser) => {
  if (newUser) {
    await loadAppointments()
    await loadStaffMeetings()
  }
}, { deep: true })

watch(calendarEvents, (newEvents) => {
  console.log('🔄 calendarEvents changed, updating FullCalendar:', newEvents.length)
  
  if (calendar.value?.getApi) {
    const api = calendar.value.getApi()
    
    // Alle Events entfernen und neue hinzufügen
    api.removeAllEvents()
    api.addEventSource(newEvents)
    
    console.log('✅ FullCalendar events updated successfully')
  }
}, { deep: true, immediate: true })


defineExpose({
  getApi: () => calendar.value?.getApi?.(),
  loadAppointments,
  loadStaffMeetings,
  refreshCalendar,  
  handleSaveEvent,     // ← HINZUFÜGEN
  handleDeleteEvent   
})


</script>

<template>
  <div v-if="isLoadingEvents" class="text-center py-8">
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
    <p class="text-gray-600">Termine werden geladen...</p>
  </div>
  
  <FullCalendar
    v-else-if="isCalendarReady"
    ref="calendar"
    :options="calendarOptions"
  />
  <div v-else>
    Kalender wird geladen...
  </div>

 <EventModal
  ref="eventModalRef"
  :is-visible="isModalVisible"
  :event-data="modalEventData"
  :mode="modalMode"
  :current-user="props.currentUser" 
  :event-type="modalEventType"
  @close="isModalVisible = false"
  @save-event="handleSaveEvent"       
  @delete-event="handleDeleteEvent"   
  @refresh-calendar="loadAppointments"
  @appointment-saved="refreshCalendar"    
  @appointment-updated="refreshCalendar"   
  @appointment-deleted="refreshCalendar"
/>

  <!-- Confirmation Dialog -->
  <ConfirmationDialog
    :is-visible="showConfirmation"
    :title="confirmationData.title"
    :message="confirmationData.message"
    :details="confirmationData.details"
    :icon="confirmationData.icon"
    :type="confirmationData.type"
    :confirm-text="confirmationData.confirmText"
    :cancel-text="confirmationData.cancelText"
    @confirm="handleConfirmAction"
    @cancel="handleCancelAction"
    @close="handleCancelAction"
  />

    <!-- Move Modal hinzufügen -->
  <MoveAppointmentModal
    :is-visible="showMoveModal"
    :appointment="selectedAppointmentToMove"
    @close="showMoveModal = false"
    @moved="handleAppointmentMoved"
    @error="handleMoveError"
  />
</template>

<style>
/* === KALENDER BASIS === */
.fc {
  background-color: white !important;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  height: calc(100vh - 50px); 
}

/* === HEADER & NAVIGATION === */
.fc-col-header-cell {
  background-color: #f8fafc !important;
  color: #374151 !important;
  font-weight: 600 !important;
  font-size: 0.875rem !important;
  padding: 4px 4px !important;
  border-bottom: 2px solid #e5e7eb !important;
}

/* Custom day header styling */
.fc-day-header-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.fc-day-header-content .block {
  display: block;
  line-height: 1;
}

/* Heute hervorheben */
.fc-col-header-cell.fc-day-today {
  background-color: #dbeafe !important;
  color: #1d4ed8 !important;
}


/* === ZEIT-SPALTE === */


.fc-timegrid-slot-label {
  color: #6b7280 !important;
  font-size: 0.75rem !important;
  font-weight: 500 !important;
}

.fc-timegrid-col.fc-day-today {
    color: #1d4ed8 !important;
}

/* === EVENTS === */
.fc-event {
  border: none !important;
  border-radius: 6px !important;
  padding: 2px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
  font-weight: 500 !important;
  transition: all 0.2s ease !important;
  display: block !important;
  background-color: #62b22f !important; /* Fallback-Farbe */
  overflow: hidden;
}

.fc-event:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
}

.fc-event-title {
  font-weight: 600 !important;
  color: white !important;
  font-size: 10px !important;
}

/* === EVENT KATEGORIEN === */
.fc-event.category-a {
  background-color: #019ee5 !important;
}

.fc-event.category-b {
  background-color: #62b22f !important;
}

.fc-event.category-be {
  background-color: #f59e0b !important;
}

.fc-event.category-c {
  background-color: #ef4444 !important;
}

.fc-event.category-ce {
  background-color: #8b5cf6 !important;
}

.fc-event.category-d {
  background-color: #1d1e19 !important;
}

.fc-event.category-bpt {
  background-color: #06b6d4 !important;
}

.fc-event.category-boat {
  background-color: #10b981 !important;
}

.fc-event.category-default {
  background-color: #666666 !important;
}

/* === CUSTOM EVENT CONTENT === */
.custom-event {
  font-size: 9px;
  line-height: 1;
  color: white;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.event-location {
  font-size: 7px;
  opacity: 0.9;
  color: white !important;
  text-decoration: none;
}

/* === BUTTONS === */
.fc-button {
  background-color: white !important;
  border: 1px solid #d1d5db !important;
  color: #374151 !important;
  border-radius: 8px !important;
  padding: 8px 16px !important;
  font-weight: 500 !important;
  font-size: 0.875rem !important;
  transition: all 0.2s ease !important;
}

.fc-button:hover {
  background-color: #f9fafb !important;
  border-color: #9ca3af !important;
  transform: translateY(-1px);
}

.fc-button-primary {
  background-color: #62b22f !important;
  border-color: #62b22f !important;
  color: white !important;
}

.fc-button-primary:hover {
  background-color: #54a026 !important;
  border-color: #54a026 !important;
}

.fc-button:disabled {
  background-color: #f3f4f6 !important;
  color: #9ca3af !important;
  cursor: not-allowed !important;
}

.fc-button-group {
  gap: 8px;
}

/* === TOOLBAR === */
.fc-toolbar {
  padding: 8px;
  background-color: white !important;
  gap: 2px !important;
  align-items: center;
  justify-content: center;
}

.fc-toolbar-title {
  font-size: 1.5rem !important;
  font-weight: 700 !important;
  color: #111827 !important;
}

/* === SELECTION === */
.fc-highlight {
  background-color: rgba(98, 178, 47, 0.2) !important;
  border-radius: 4px;
}

/* === RESPONSIVE === */
@media (max-width: 768px) {
  .fc-toolbar {
    flex-direction: column;
    gap: 4px;
  }
  
  .fc-toolbar-title {
    font-size: 1.25rem !important;
  }
  
  .fc-button {
    padding: 6px 12px !important;
    font-size: 0.8rem !important;
  }
  
  .fc-col-header-cell {
    font-size: 0.75rem !important;
  }
 
}

/* === LOADING STATE === */
.fc-loading {
  background-color: #f9fafb !important;
  opacity: 0.7;
}

/* Nur diese CSS-Klasse hinzufügen: */
.fc {
  transition: opacity 0.3s ease !important;
}

.fc.updating {
  opacity: 0.7 !important;
}
</style>```

### ./components/CategorySelector.vue
```vue
<template>
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-2">
      🚗 Kategorie
    </label>
    
    <select
      :value="modelValue"
      @change="handleCategoryChange"
      :disabled="isLoading"
      class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
    >
      <option value="">
        {{ isLoading ? 'Kategorien laden...' : 'Kategorie wählen' }}
      </option>
      <option 
        v-for="category in availableCategoriesForUser" 
        :key="category.code"
        :value="category.code"
      >
        {{ category.name }}
      </option>
    </select>

    <!-- Error State -->
    <div v-if="error" class="mt-2 text-red-600 text-sm">
      ❌ {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { getSupabase } from '~/utils/supabase'

interface Category {
  id: number
  name: string
  code: string
  description?: string
  price_per_lesson: number
  lesson_duration_minutes: number
  color?: string
  is_active: boolean
  display_order: number
  price_unit: string
}

interface CategoryWithDurations extends Category {
  availableDurations: number[]
}

interface StaffCategoryDuration {
  id: string
  created_at: string
  staff_id: string
  category_code: string
  duration_minutes: number
  is_active: boolean
  display_order: number
}

interface Props {
  modelValue: string
  selectedUser?: any
  currentUser?: any
  currentUserRole?: string
  showDebugInfo?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'category-selected', category: CategoryWithDurations | null): void
  (e: 'price-changed', price: number): void
  (e: 'durations-changed', durations: number[]): void
}

const props = withDefaults(defineProps<Props>(), {
  showDebugInfo: false
})
const emit = defineEmits<Emits>()

// State
const allCategories = ref<Category[]>([])
const staffCategoryDurations = ref<StaffCategoryDuration[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const isAutoEmitting = ref(false)
const isInitializing = ref(false)

// Computed
const selectedCategory = computed(() => {
  if (!props.modelValue) return null
  return availableCategoriesForUser.value.find(cat => cat.code === props.modelValue) || null
})

const availableCategoriesForUser = computed(() => {
  let result: CategoryWithDurations[] = []
  
  console.log('🔍 Computing availableCategoriesForUser:', {
    role: props.currentUserRole,
    allCategoriesCount: allCategories.value.length,
    staffDurationsCount: staffCategoryDurations.value.length
  })
  
  // ✅ DEFENSIVE: Warte bis Categories geladen sind
  if (allCategories.value.length === 0) {
    console.log('⏳ Categories not loaded yet, returning empty')
    return []
  }
  
  // Admin kann alle Kategorien sehen
  if (props.currentUserRole === 'admin') {
    result = allCategories.value
      .filter(cat => cat.is_active)
      .map(cat => ({
        ...cat,
        availableDurations: [cat.lesson_duration_minutes] // Standard-Dauer für Admins
      }))
    console.log('👨‍💼 Admin: Showing all categories:', result.length)
  }
  // Staff sieht nur seine zugewiesenen Kategorien mit seinen verfügbaren Dauern
  else if (props.currentUserRole === 'staff') {
    // ✅ DEFENSIVE: Check ob Staff-Dauern geladen sind
    if (staffCategoryDurations.value.length === 0) {
      console.log('⏳ Staff durations not loaded yet, using fallback')
      result = allCategories.value
        .filter(cat => cat.is_active)
        .map(cat => ({
          ...cat,
          availableDurations: [cat.lesson_duration_minutes]
        }))
    } else {
      // Gruppiere Staff-Kategorien-Dauern nach category_code
      const groupedByCode: Record<string, number[]> = {}
      
      staffCategoryDurations.value.forEach(item => {
        if (!groupedByCode[item.category_code]) {
          groupedByCode[item.category_code] = []
        }
        groupedByCode[item.category_code].push(item.duration_minutes)
      })

      console.log('📊 Staff categories grouped:', groupedByCode)

      // Erstelle CategoryWithDurations für jede Staff-Kategorie
      result = Object.entries(groupedByCode).map(([code, durations]) => {
        const baseCategory = allCategories.value.find(cat => cat.code === code)
        if (!baseCategory) {
          console.log(`❌ Category ${code} not found in allCategories`)
          return null
        }

        return {
          ...baseCategory,
          availableDurations: durations.sort((a, b) => a - b)
        }
      }).filter((item): item is CategoryWithDurations => item !== null)
      
      // ✅ FALLBACK: Wenn Staff keine spezifischen Dauern hat, alle Kategorien mit Standard-Dauern zeigen
      if (result.length === 0) {
        console.log('⚠️ Staff has no specific category durations, showing ALL categories as fallback')
        result = allCategories.value
          .filter(cat => cat.is_active)
          .map(cat => ({
            ...cat,
            availableDurations: [cat.lesson_duration_minutes] // Standard-Dauer
          }))
      }
    }
    
    console.log('👨‍🏫 Staff: Final categories:', result.length, result.map(r => r.code))
  }
  // Client sieht alle aktiven Kategorien (für Terminbuchung)
  else {
    result = allCategories.value
      .filter(cat => cat.is_active)
      .map(cat => ({
        ...cat,
        availableDurations: [cat.lesson_duration_minutes] // Standard-Dauer für Clients
      }))
    console.log('👤 Client: Showing all categories:', result.length)
  }
  
  // Sortieren nach display_order und dann nach Name
  const sortedResult = result.sort((a, b) => {
    if (a.display_order !== b.display_order) {
      return a.display_order - b.display_order
    }
    return a.name.localeCompare(b.name)
  })
  
  console.log('📋 Final sorted categories:', sortedResult.map(cat => ({
    code: cat.code,
    name: cat.name,
    durations: cat.availableDurations
  })))
  
  return sortedResult
})



// Methods
const loadCategories = async () => {
 console.log('🔥 CategorySelector - loadCategories called')
 
 isLoading.value = true
 isInitializing.value = true  // ✅ Initialization Mode
 error.value = null
 
 try {
   const supabase = getSupabase()
   
   // Alle Kategorien laden
   const { data: categoriesData, error: categoriesError } = await supabase
     .from('categories')
     .select('id, name, code, description, price_per_lesson, lesson_duration_minutes, color, is_active, display_order, price_unit')
     .eq('is_active', true)
     .order('display_order', { ascending: true })
     .order('name', { ascending: true })

   if (categoriesError) throw categoriesError

   allCategories.value = categoriesData || []
   console.log('✅ All categories loaded:', categoriesData?.length)

   // Wenn es ein Staff-Benutzer ist, seine spezifischen Kategorie-Dauern laden
   if (props.currentUserRole === 'staff' && props.currentUser?.id) {
     await loadStaffCategoryDurations(props.currentUser.id)
   }

 } catch (err: any) {
   console.error('❌ Error loading categories:', err)
   error.value = err.message || 'Fehler beim Laden der Kategorien'
 } finally {
   isLoading.value = false
   
   // ✅ NACH dem Laden prüfen ob Durations emittiert werden müssen
   if (props.modelValue) {
     console.log('🔄 Categories loaded, checking current selection:', props.modelValue)
     const selected = availableCategoriesForUser.value.find(cat => cat.code === props.modelValue)
     
     if (selected) {
       console.log('✅ Re-emitting durations for loaded category:', selected.availableDurations)
       
       // ✅ RACE-SAFE Emit mit Verzögerung
       setTimeout(() => {
         if (!isAutoEmitting.value) {
           emit('durations-changed', selected.availableDurations)
         }
       }, 100)
     }
   }
   
   // ✅ Initialization Mode beenden
   setTimeout(() => {
     isInitializing.value = false
     console.log('✅ CategorySelector initialization completed')
   }, 200)
 }
}

const loadStaffCategoryDurations = async (staffId: string) => {
 console.log('🔄 Loading staff category durations for:', staffId)
 
 try {
   const supabase = getSupabase()
   
   // Staff-Kategorie-Dauern laden - KORREKTE TABELLE
   const { data: durationsData, error: durationsError } = await supabase
     .from('staff_category_durations')
     .select('id, created_at, staff_id, category_code, duration_minutes, is_active, display_order')
     .eq('staff_id', staffId)
     .eq('is_active', true)
     .order('category_code', { ascending: true })
     .order('display_order', { ascending: true })

   if (durationsError) throw durationsError

   staffCategoryDurations.value = durationsData || []
   console.log('✅ Staff category durations loaded:', durationsData?.length)

   if (durationsData && durationsData.length > 0) {
     const categories = [...new Set(durationsData.map(d => d.category_code))]
     console.log('📊 Categories found:', categories)
     
     // Debug: Zeige Dauern pro Kategorie
     categories.forEach(code => {
       const durations = durationsData.filter(d => d.category_code === code).map(d => d.duration_minutes)
       console.log(`📊 ${code}: [${durations.join(', ')}] Minuten`)
     })
   } else {
     console.log('⚠️ No category durations found for staff:', staffId)
   }

 } catch (err: any) {
   console.error('❌ Error loading staff category durations:', err)
   staffCategoryDurations.value = []
 }

 // ✅ RACE-SAFE: Nach dem Laden der Staff-Dauern prüfen
 if (props.modelValue && !isInitializing.value) {
   console.log('🔄 Staff durations loaded, checking current selection:', props.modelValue)
   const selected = availableCategoriesForUser.value.find(cat => cat.code === props.modelValue)
   
   if (selected) {
     console.log('✅ Emitting durations after staff load:', selected.availableDurations)
     
     // ✅ RACE-SAFE Emit mit Verzögerung
     setTimeout(() => {
       if (!isAutoEmitting.value) {
         emit('durations-changed', selected.availableDurations)
       }
     }, 100)
   }
 }
}

const handleCategoryChange = (event: Event) => {
 const target = event.target as HTMLSelectElement
 const newValue = target.value
 
 console.log('🔄 CategorySelector - Manual category change:', newValue)
 
 // ✅ Mark als User Interaction (verhindert andere Auto-Updates)
 isAutoEmitting.value = true
 
 emit('update:modelValue', newValue)
 
 const selected = availableCategoriesForUser.value.find(cat => cat.code === newValue) || null
 console.log('🎯 CategorySelector - Selected category:', selected)
 console.log('🎯 CategorySelector - Available durations:', selected?.availableDurations)
 
 emit('category-selected', selected)
 
 // Preis pro Minute berechnen (alle Preise sind auf 45min basis)
 if (selected) {
   const pricePerMinute = selected.price_per_lesson / 45
   emit('price-changed', pricePerMinute)
   
   // ✅ RACE-SAFE Durations Emit (User Selection erlaubt)
   console.log('⏱️ CategorySelector - Emitting durations-changed:', selected.availableDurations)
   emit('durations-changed', selected.availableDurations)
   
   console.log('💰 Price per minute:', pricePerMinute)
 } else {
   console.log('❌ No category selected, emitting empty durations')
   emit('price-changed', 0)
   emit('durations-changed', [])
 }
 
 // ✅ Reset Auto-Selecting Flag nach kurzer Zeit
 setTimeout(() => {
   isAutoEmitting.value = false
 }, 300)
}

// Watchers
// GEZIELTER FIX für CategorySelector.vue
// Ersetzen Sie den User-Watcher (Zeile 314-328) mit diesem korrigierten Code:

watch(() => props.selectedUser, (newUser, oldUser) => {
 // ✅ Skip wenn User nicht wirklich geändert wurde
 if (!newUser || oldUser?.id === newUser.id) return
 
 // ✅ Skip während Initialisierung
 if (isInitializing.value) {
   console.log('🚫 Auto-category selection blocked - initializing')
   return
 }
 
 // ✅ Skip wenn bereits Kategorie gewählt (verhindert Überschreibung)
 if (props.modelValue) {
   console.log('🚫 Auto-category selection blocked - category already selected')
   return
 }
 
 if (newUser?.category && newUser.category !== props.modelValue) {
   console.log('👤 User category detected:', newUser.category)
   
   // ✅ FIX: Nur erste Kategorie nehmen wenn mehrere
   const primaryCategory = newUser.category.split(',')[0].trim()
   console.log('🎯 Using primary category:', primaryCategory)
   
   // ✅ Mark als Auto-Selection
   isAutoEmitting.value = true
   
   emit('update:modelValue', primaryCategory)
   
   // 🔥 KRITISCHER FIX: Suche nach primaryCategory statt newUser.category
   const selected = availableCategoriesForUser.value.find(cat => cat.code === primaryCategory)
   
   if (selected) {
     console.log('🎯 Auto-selected category:', selected)
     emit('category-selected', selected)
     
     const pricePerMinute = selected.price_per_lesson / 45
     emit('price-changed', pricePerMinute)
     
     // ✅ RACE-SAFE Auto-Emit
     console.log('⏱️ Auto-emitting durations-changed:', selected.availableDurations)
     emit('durations-changed', selected.availableDurations)
     
     // ✅ Reset Auto-Emit Flag
     setTimeout(() => {
       isAutoEmitting.value = false
     }, 200)
   }
 }
}, { immediate: false })

// Wenn sich der currentUser ändert, Staff-Kategorien neu laden
watch(() => props.currentUser?.id, (newUserId) => {
  if (newUserId && props.currentUserRole === 'staff') {
    loadStaffCategoryDurations(newUserId)
  }
}, { immediate: true })

// Neuer Watcher in CategorySelector.vue hinzufügen:
watch([() => allCategories.value.length, () => props.modelValue], ([categoriesCount, modelValue]) => {
 // ✅ Skip während Initialisierung
 if (isInitializing.value) {
   console.log('🚫 Re-emit blocked - initializing')
   return
 }
 
 // ✅ Skip wenn Auto-Selection läuft
 if (isAutoEmitting.value) {
   console.log('🚫 Re-emit blocked - auto-selection in progress')
   return
 }
 
 if (categoriesCount > 0 && modelValue) {
   console.log('🔄 Categories loaded, re-emitting for:', modelValue)
   const selected = availableCategoriesForUser.value.find(cat => cat.code === modelValue)
   
   if (selected) {
     console.log('✅ Re-emitting durations-changed:', selected.availableDurations)
     
     // ✅ RACE-SAFE Re-Emit mit Verzögerung
     setTimeout(() => {
       if (!isAutoEmitting.value) {
         emit('durations-changed', selected.availableDurations)
       }
     }, 150)
   }
 }
}, { immediate: false })  // ✅ KEIN immediate: true!

// Lifecycle
onMounted(() => {
  loadCategories()
})
</script>

<style scoped>
select option {
  padding: 8px;
}

select:hover {
  border-color: #10b981;
}
</style>```

### ./components/ConfirmationDialog.vue
```vue
<template>
  <div 
    v-if="isVisible" 
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    @click="handleBackdropClick"
  >
    <div 
      class="bg-white rounded-lg w-full max-w-md shadow-xl transform transition-all"
      @click.stop
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex items-center gap-3">
          <div class="text-2xl">{{ icon }}</div>
          <h3 class="text-lg font-semibold text-gray-900">
            {{ title }}
          </h3>
        </div>
      </div>

      <!-- Content -->
      <div class="px-6 py-4">
        <p class="text-gray-700 leading-relaxed">{{ message }}</p>
        
        <!-- Details falls vorhanden -->
        <div v-if="details" class="mt-4 p-3 bg-gray-50 rounded-lg">
          <div class="text-sm text-gray-600" v-html="details"></div>
        </div>
      </div>

      <!-- Actions -->
      <div class="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
        <button
          @click="handleCancel"
          class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          {{ cancelText }}
        </button>
        <button
          @click="handleConfirm"
          :class="[
            'px-4 py-2 text-white rounded-lg font-medium transition-colors',
            type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 
            type === 'warning' ? 'bg-orange-600 hover:bg-orange-700' :
            'bg-green-600 hover:bg-green-700'
          ]"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  isVisible: boolean
  title: string
  message: string
  details?: string
  icon?: string
  type?: 'success' | 'warning' | 'danger'
  confirmText?: string
  cancelText?: string
}

const props = withDefaults(defineProps<Props>(), {
  icon: '❓',
  type: 'warning',
  confirmText: 'Bestätigen',
  cancelText: 'Abbrechen'
})

const emit = defineEmits<{
  confirm: []
  cancel: []
  close: []
}>()

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  emit('cancel')
  emit('close')
}

const handleBackdropClick = () => {
  emit('cancel')
  emit('close')
}
</script>```

### ./components/CustomerDashboard.vue
```vue
<!-- components/CustomerDashboard.vue -->
<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-6">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">
              Hallo, {{ getUserDisplayName() }}
            </h1>
          </div>
          <div class="flex items-center space-x-4">
            <button 
              @click="handleLogout"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Abmelden
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
        <p class="mt-4 text-gray-600">Termine werden geladen...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="bg-red-50 border border-red-200 rounded-md p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Fehler beim Laden der Daten</h3>
            <p class="mt-1 text-sm text-red-700">{{ error }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Kommende Termine</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ upcomingAppointments.length }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Absolvierte Lektionen</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ completedAppointments.length }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Offene Rechnungen</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ unpaidAppointments.length }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Rest of the template stays the same... -->
      <!-- ... (Tab navigation and content from original component) ... -->
    </div>
  </div>
</template>

<script setup>
import { formatDate, formatTime } from '~/utils/dateUtils'
import { getSupabase } from '~/utils/supabase'

// Composables
const authStore = useAuthStore()
const { user: currentUser, userRole, isClient } = storeToRefs(authStore)

// State
const isLoading = ref(true)
const error = ref(null)
const appointments = ref([])
const locations = ref([])
const staff = ref([])

// Helper method to get user display name
const getUserDisplayName = () => {
  if (!currentUser.value) return 'Unbekannt'
  
  // Try user metadata first
  const firstName = currentUser.value.user_metadata?.first_name || 
                   currentUser.value.user_metadata?.firstName
  const lastName = currentUser.value.user_metadata?.last_name || 
                  currentUser.value.user_metadata?.lastName
  
  if (firstName && lastName) {
    return `${firstName} ${lastName}`
  }
  
  // Fallback to email
  return currentUser.value.email || 'Unbekannt'
}

// Computed
const upcomingAppointments = computed(() => {
  const now = new Date()
  return appointments.value.filter(apt => 
    new Date(apt.start_time) > now
  ).sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
})

const completedAppointments = computed(() => {
  const now = new Date()
  return appointments.value.filter(apt => 
    new Date(apt.end_time) < now
  ).sort((a, b) => new Date(b.start_time) - new Date(a.start_time))
})

const unpaidAppointments = computed(() => {
  return appointments.value.filter(apt => !apt.is_paid)
})

// Methods
const loadAppointments = async () => {
  if (!currentUser.value?.id) return

  try {
    const supabase = getSupabase()
    
    // Get user data from users table to get internal user_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', currentUser.value.id)
      .single()
    
    if (userError) throw userError
    if (!userData) throw new Error('User nicht in Datenbank gefunden')

    // Load appointments with internal user_id
    const { data, error: fetchError } = await supabase
      .from('appointments')
      .select(`
        *,
        notes (
          id,
          staff_rating,
          staff_note
        )
      `)
      .eq('user_id', userData.id)
      .order('start_time', { ascending: false })

    if (fetchError) throw fetchError
    appointments.value = data || []
  } catch (err) {
    console.error('❌ Error loading appointments:', err)
    error.value = err.message
  }
}

const loadLocations = async () => {
  try {
    const supabase = getSupabase()
    const { data, error: fetchError } = await supabase
      .from('locations')
      .select('*')
      .order('name')

    if (fetchError) throw fetchError
    locations.value = data || []
  } catch (err) {
    console.error('❌ Error loading locations:', err)
  }
}

const loadStaff = async () => {
  try {
    const supabase = getSupabase()
    const { data, error: fetchError } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('role', 'staff')
      .eq('is_active', true)

    if (fetchError) throw fetchError
    staff.value = data || []
  } catch (err) {
    console.error('❌ Error loading staff:', err)
  }
}

const handleLogout = async () => {
  try {
    const supabase = getSupabase()
    await authStore.logout(supabase)
    await navigateTo('/')
  } catch (err) {
    console.error('❌ Fehler beim Abmelden:', err)
  }
}

// Lifecycle
onMounted(async () => {
  console.log('🔥 CustomerDashboard mounted')
  
  try {
    // Check if user is a client
    if (!isClient.value) {
      console.warn('⚠️ User is not a client, redirecting...')
      await navigateTo('/')
      return
    }

    // Load all data in parallel
    await Promise.all([
      loadAppointments(),
      loadLocations(),
      loadStaff()
    ])

    console.log('✅ Customer dashboard data loaded successfully')
  } catch (err) {
    console.error('❌ Error loading customer dashboard:', err)
    error.value = err.message
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>```

### ./components/CustomerInviteSelector.vue
```vue
<template>
  <div class="customer-invite-selector">
    <!-- Kollapsible Header -->
    <div class="bg-green-50 border border-green-200 rounded-lg">
      
      <!-- Klickbarer Header -->
      <div 
        class="flex items-center justify-between p-3 cursor-pointer hover:bg-green-100 transition-colors"
        @click="toggleExpanded"
      >
        <div class="flex items-center gap-2">
          <span class="text-lg">📞</span>
          <label class="text-sm font-semibold text-gray-900 cursor-pointer">
            Neukunden einladen
          </label>
          <span v-if="invitedCustomers.length > 0" class="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
            {{ invitedCustomers.length }}
          </span>
        </div>
        
        <div class="flex items-center gap-2">
          <!-- Schnell-Aktionen (nur wenn expanded) -->
          <div v-if="isExpanded && invitedCustomers.length > 0" class="flex gap-1">
            <button
              @click.stop="clearAll"
              :disabled="disabled"
              class="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              Alle löschen
            </button>
          </div>
          
          <!-- Expand/Collapse Icon -->
          <svg 
            class="w-4 h-4 text-gray-600 transition-transform duration-200"
            :class="{ 'rotate-180': isExpanded }"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      <!-- Ausklappbarer Inhalt -->
      <div 
        v-if="isExpanded"
        class="border-t border-green-200 transition-all duration-300 ease-in-out"
      >
        
        <!-- Error State -->
        <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 m-3">
          ❌ {{ error }}
        </div>

        <!-- Neukunden-Eingabeformular -->
        <div class="p-4 bg-white">
          
          <!-- Eingabefeld für neue Kunden -->
          <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <!-- Vorname (optional) -->
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">
                  Vorname
                </label>
                <input
                  v-model="newCustomer.first_name"
                  type="text"
                  placeholder="Max"
                  :disabled="disabled"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
                  @keydown.enter="addCustomer"
                />
              </div>

              <!-- Nachname (optional) -->
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">
                  Nachname
                </label>
                <input
                  v-model="newCustomer.last_name"
                  type="text"
                  placeholder="Mustermann"
                  :disabled="disabled"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
                  @keydown.enter="addCustomer"
                />
              </div>
            </div>

            <!-- Telefonnummer -->
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">
                Telefonnummer *
              </label>
              <input
                v-model="newCustomer.phone"
                type="tel"
                placeholder="+41 79 123 45 67"
                :disabled="disabled"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
                @keydown.enter="addCustomer"
              />
              <p class="text-xs text-gray-500 mt-1">
                Der Kunde erhält eine SMS-Einladung an diese Nummer
              </p>
            </div>

            <!-- Kategorie -->
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">
                Kategorie
              </label>
              <select
                v-model="newCustomer.category"
                :disabled="disabled || isLoadingCategories"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
              >
                <option value="">
                  {{ isLoadingCategories ? 'Kategorien laden...' : 'Kategorie wählen' }}
                </option>
                <option 
                  v-for="category in categories" 
                  :key="category.code"
                  :value="category.code"
                >
                  {{ category.name }}
                </option>
              </select>
            </div>

            <!-- Add Button -->
            <div class="flex justify-end">
              <button
                @click="addCustomer"
                :disabled="!isNewCustomerValid || disabled || isProcessing"
                class="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span v-if="isProcessing">⏳</span>
                <span v-else>➕</span>
                {{ isProcessing ? 'Hinzufügen...' : 'Zur Liste hinzufügen' }}
              </button>
            </div>
          </div>

          <!-- Eingeladene Kunden Liste -->
          <div v-if="invitedCustomers.length > 0" class="mt-6 pt-4 border-t border-gray-200">
            <h4 class="text-sm font-medium text-gray-900 mb-3">
              Eingeladene Neukunden ({{ invitedCustomers.length }})
            </h4>
            
            <div class="space-y-2">
              <div
                v-for="(customer, index) in invitedCustomers"
                :key="index"
                class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-gray-900">
                      {{ customer.first_name }} {{ customer.last_name }}
                    </span>
                    <span v-if="customer.category" class="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                      {{ customer.category }}
                    </span>
                  </div>
                  <div class="text-sm text-gray-600">
                    📱 {{ customer.phone }}
                    <span v-if="customer.notes" class="ml-2">
                      📝 {{ customer.notes }}
                    </span>
                  </div>
                </div>
                
                <button
                  v-if="!disabled"
                  @click="removeCustomer(index)"
                  class="text-red-600 hover:text-red-800 p-1"
                  title="Entfernen"
                >
                  ✕
                </button>
              </div>
            </div>

            <!-- Info Box -->
            <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div class="flex items-start gap-2">
                <span class="text-blue-600 mt-0.5">ℹ️</span>
                <div class="text-sm text-blue-800">
                  <p class="font-medium">Was passiert beim Speichern:</p>
                  <ul class="mt-1 space-y-1 text-xs">
                    <li>• Neukunden werden automatisch registriert</li>
                    <li>• SMS-Einladung mit App-Download Link</li>
                    <li>• Termin wird für alle Teilnehmer erstellt</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Kompakte Übersicht der eingeladenen Kunden (außerhalb des Selectors) -->
    <div v-if="!isExpanded && invitedCustomers.length > 0" class="mt-2">
      <div class="text-xs text-gray-600 mb-1">Eingeladene Neukunden:</div>
      <div class="flex flex-wrap gap-1">
        <span
          v-for="(customer, index) in invitedCustomers"
          :key="index"
          class="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800"
        >
          {{ customer.first_name }} {{ customer.last_name }}
          <button
            v-if="!disabled"
            @click="removeCustomer(index)"
            class="ml-1 hover:text-green-600"
          >
            ×
          </button>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

// Customer Interface - vereinfacht für temp users
interface NewCustomer {
  first_name?: string
  last_name?: string
  phone: string
  category?: string
  notes?: string
}

// Props
interface Props {
  modelValue?: NewCustomer[]
  currentUser?: any
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  disabled: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [customers: NewCustomer[]]
  'customers-added': [customers: NewCustomer[]]
  'customers-cleared': []
}>()

// State
const isExpanded = ref(false)
const isProcessing = ref(false)
const error = ref<string | null>(null)
const categories = ref<any[]>([])
const isLoadingCategories = ref(false)

const newCustomer = ref<NewCustomer>({
  first_name: '',
  last_name: '',
  phone: '',
  category: '',
  notes: ''
})

// Computed
const invitedCustomers = computed({
  get: () => props.modelValue || [],
  set: (value) => emit('update:modelValue', value)
})

const isNewCustomerValid = computed(() => {
  return newCustomer.value.phone.trim() &&
         isValidPhone(newCustomer.value.phone) &&
         (newCustomer.value.first_name?.trim() || newCustomer.value.last_name?.trim()) // Mindestens ein Name
})

// Methods
const isValidPhone = (phone: string): boolean => {
  // Swiss phone number validation
  const phoneRegex = /^(\+41|0041|0)[1-9]\d{8}$/
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '')
  return phoneRegex.test(cleanPhone)
}

const isValidEmail = (email: string): boolean => {
  // Email validation (not used anymore but kept for potential future use)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const formatPhone = (phone: string): string => {
  // Format phone number consistently
  let cleanPhone = phone.replace(/[\s\-\(\)]/g, '')
  
  if (cleanPhone.startsWith('0041')) {
    cleanPhone = '+41' + cleanPhone.substring(4)
  } else if (cleanPhone.startsWith('0') && !cleanPhone.startsWith('+41')) {
    cleanPhone = '+41' + cleanPhone.substring(1)
  }
  
  return cleanPhone
}

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
  console.log('🔄 CustomerInviteSelector expanded:', isExpanded.value)
  
  // Auto-load categories when expanded for the first time
  if (isExpanded.value && categories.value.length === 0) {
    loadCategories()
  }
}

const loadCategories = async () => {
  if (isLoadingCategories.value) return
  
  isLoadingCategories.value = true
  
  try {
    console.log('🔄 Loading categories from database...')
    const supabase = getSupabase()
    
    const { data, error } = await supabase
      .from('categories')
      .select('code, name, is_active, display_order')
      .eq('is_active', true)
      .order('display_order')
    
    if (error) throw error
    
    categories.value = data || []
    console.log('✅ Categories loaded:', categories.value.length)
    
  } catch (err: any) {
    console.error('❌ Error loading categories:', err)
    // Fallback categories
    categories.value = [
      { code: 'B', name: 'B - Auto' },
      { code: 'A1', name: 'A1 - Motorrad 125cc' },
      { code: 'A', name: 'A - Motorrad' },
      { code: 'BE', name: 'BE - Anhänger' },
      { code: 'C', name: 'C - LKW' },
      { code: 'C1', name: 'C1 - LKW klein' },
      { code: 'CE', name: 'CE - LKW mit Anhänger' }
    ]
    console.log('🔄 Using fallback categories')
  } finally {
    isLoadingCategories.value = false
  }
}

const addCustomer = async () => {
  if (!isNewCustomerValid.value) {
    error.value = 'Bitte füllen Sie alle Pflichtfelder korrekt aus'
    return
  }

  // Check for duplicates
  const phoneExists = invitedCustomers.value.some(c => 
    formatPhone(c.phone) === formatPhone(newCustomer.value.phone)
  )
  
  if (phoneExists) {
    error.value = 'Ein Kunde mit dieser Telefonnummer wurde bereits hinzugefügt'
    return
  }

  try {
    isProcessing.value = true
    error.value = null

    // Check if customer already exists in database OR invited_customers
    const supabase = getSupabase()
    
    // Check regular users
    const { data: existingCustomer } = await supabase
      .from('users')
      .select('id, first_name, last_name, phone')
      .eq('phone', formatPhone(newCustomer.value.phone))
      .eq('role', 'client')
      .maybeSingle()

    if (existingCustomer) {
      error.value = `Kunde "${existingCustomer.first_name} ${existingCustomer.last_name}" ist bereits registriert`
      return
    }

    // Check invited customers
    const { data: invitedCustomer } = await supabase
      .from('invited_customers')
      .select('id, first_name, last_name, phone')
      .eq('phone', formatPhone(newCustomer.value.phone))
      .eq('status', 'pending')
      .maybeSingle()

    if (invitedCustomer) {
      error.value = `Einladung für "${invitedCustomer.first_name || ''} ${invitedCustomer.last_name || ''}" bereits versendet`
      return
    }

    // Add to invited customers list
    const customerToAdd: NewCustomer = {
      first_name: newCustomer.value.first_name?.trim() || undefined,
      last_name: newCustomer.value.last_name?.trim() || undefined,
      phone: formatPhone(newCustomer.value.phone),
      category: newCustomer.value.category || undefined,
      notes: newCustomer.value.notes || undefined
    }

    const updatedCustomers = [...invitedCustomers.value, customerToAdd]
    invitedCustomers.value = updatedCustomers

    // Reset form
    newCustomer.value = {
      first_name: '',
      last_name: '',
      phone: '',
      category: '',
      notes: ''
    }

    console.log('✅ Customer added to invite list:', customerToAdd)
    emit('customers-added', [customerToAdd])

  } catch (err: any) {
    console.error('❌ Error adding customer:', err)
    error.value = err.message || 'Fehler beim Hinzufügen des Kunden'
  } finally {
    isProcessing.value = false
  }
}

const removeCustomer = (index: number) => {
  const updatedCustomers = invitedCustomers.value.filter((_, i) => i !== index)
  invitedCustomers.value = updatedCustomers
  console.log('🗑️ Customer removed from invite list at index:', index)
}

const clearAll = () => {
  invitedCustomers.value = []
  newCustomer.value = {
    first_name: '',
    last_name: '',
    phone: '',
    category: '',
    notes: ''
  }
  error.value = null
  console.log('🗑️ All invited customers cleared')
  emit('customers-cleared')
}

const resetSelection = () => {
  clearAll()
  isExpanded.value = false
  console.log('🔄 CustomerInviteSelector: Selection reset')
}

const createInvitedCustomers = async (appointmentData: any) => {
  if (invitedCustomers.value.length === 0) {
    console.log('📞 No customers to invite')
    return []
  }

  console.log('📧 Creating invited customers in temp table:', invitedCustomers.value.length)
  const supabase = getSupabase()
  const createdInvites = []

  for (const customer of invitedCustomers.value) {
    try {
      // 1. Create entry in invited_customers table
      const inviteData = {
        first_name: customer.first_name || null,
        last_name: customer.last_name || null,
        phone: customer.phone,
        category: customer.category || null,
        notes: customer.notes || null,
        invited_by_staff_id: props.currentUser?.id,
        status: 'pending',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 Tage
      }

      const { data: invite, error: inviteError } = await supabase
        .from('invited_customers')
        .insert(inviteData)
        .select()
        .single()

      if (inviteError) throw inviteError

      // 2. TODO: Send SMS invitation
      // Integration with SMS service (Twilio, etc.)
      console.log('📱 SMS invitation would be sent to:', customer.phone)
      console.log('📧 Invitation stored with ID:', invite.id)

      createdInvites.push(invite)

    } catch (err) {
      console.error('❌ Error creating invite for customer:', customer, err)
    }
  }

  // 3. TODO: Create reminder job for follow-up SMS
  console.log('⏰ Reminder jobs would be scheduled for', createdInvites.length, 'invites')

  return createdInvites
}

// Expose methods for parent components
defineExpose({
  addCustomer,
  clearAll,
  resetSelection,
  createInvitedCustomers,
  toggleExpanded,
  loadCategories
})
</script>

<style scoped>
/* Custom scrollbar */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

/* Smooth transitions */
.transition-all {
  transition: all 0.2s ease-in-out;
}

.transition-colors {
  transition: color 0.2s ease-in-out, background-color 0.2s ease-in-out;
}

/* Focus states */
input:focus, select:focus {
  outline: none;
}
</style>```

### ./components/DurationSelector.vue
```vue
<template>
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-2 mt-2">
     ⏱️ Dauer
    </label>
    
    <div class="grid grid-cols-4 gap-2" v-if="!isLoading">
      <button
        v-for="duration in formattedDurations"
        :key="duration.value"
        @click="selectDuration(duration.value)"
        :class="[
          'p-2 text-sm rounded border transition-colors',
          modelValue === duration.value
            ? 'bg-green-600 text-white border-green-600'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        ]"
      >
        {{ duration.label }}
      </button>
    </div>
    
    <!-- Loading State -->
    <div v-if="isLoading" class="grid grid-cols-4 gap-2">
      <div v-for="i in 4" :key="i" class="p-2 bg-gray-200 rounded animate-pulse h-10"></div>
    </div>
    
    <!-- Hinweis wenn keine Dauern verfügbar -->
    <div v-if="!isLoading && formattedDurations.length === 0" class="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
      ⚠️ Keine Lektionsdauern für diese Kategorie konfiguriert. 
      <br>Bitte in den Profileinstellungen Dauern hinzufügen.
    </div>
    
    <!-- Error State -->
    <div v-if="error" class="mt-2 text-red-600 text-sm">
      ❌ {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useDurationManager } from '~/composables/useDurationManager' 

interface Props {
  modelValue: number
  selectedCategory?: any
  currentUser?: any
  availableDurations?: number[]  
  pricePerMinute?: number
  adminFee?: number
  showDebugInfo?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: number): void
  (e: 'duration-changed', duration: number): void
}

const props = withDefaults(defineProps<Props>(), {
  pricePerMinute: 0,
  adminFee: 0,
  availableDurations: () => [],
  showDebugInfo: false
})

const emit = defineEmits<Emits>()

const {
  isLoading,
  error,
  loadStaffDurations,  
  getDefaultDuration
} = useDurationManager()

// Computed
const totalPrice = computed(() => {
  return props.modelValue * props.pricePerMinute
})

const formattedDurations = computed(() => {
  // ✅ Verwende Props-Dauern falls verfügbar, sonst Composable
  const durations = props.availableDurations?.length > 0 
    ? props.availableDurations 
    : [] // Fallback auf leer

  console.log('🎯 DurationSelector - Using durations from props:', durations)
  
  return durations.map(duration => ({
    value: duration,
    label: duration >= 120 
      ? `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? duration % 60 + 'min' : ''}`.trim() 
      : `${duration}min`
  }))
})

// Methods
const selectDuration = (duration: number) => {
  console.log('🔄 Duration selected:', duration)
  emit('update:modelValue', duration)
  emit('duration-changed', duration)
}

// Watchers
watch(() => props.selectedCategory, async (newCategory, oldCategory) => {
  console.log('🔄 DurationSelector - Category watcher triggered:', {
    old: oldCategory?.code,
    new: newCategory?.code,
    userId: props.currentUser?.id
  })

  // ✅ ADD: Debug selected category structure
  if (newCategory) {
    console.log('📊 Selected category full object:', newCategory)
    console.log('📊 Available durations in category:', newCategory.availableDurations)
  }
  
  if (newCategory && props.currentUser?.id) {
    console.log('🚗 Loading durations for staff:', {
      staffId: props.currentUser.id,
      categoryCode: newCategory.code
    })
    
    try {
      // ✅ KORRIGIERT - loadStaffDurations(staffId)
      await loadStaffDurations(props.currentUser.id)
      
      const defaultDuration = getDefaultDuration()
      console.log('🎯 Setting default duration:', defaultDuration)
      
      if (defaultDuration && defaultDuration !== props.modelValue) {
        emit('update:modelValue', defaultDuration)
        emit('duration-changed', defaultDuration)
      }
    } catch (error) {
      console.error('❌ Error loading durations:', error)
    }
  }
}, { immediate: true })

// User change watcher
watch(() => props.currentUser?.id, async (newUserId, oldUserId) => {
  console.log('🔄 DurationSelector - User watcher triggered:', {
    old: oldUserId,
    new: newUserId,
    categoryCode: props.selectedCategory?.code
  })
  
  if (newUserId) {
    // ✅ KORRIGIERT - loadStaffDurations(staffId)
    await loadStaffDurations(newUserId)
  }
})
</script>

<style scoped>
/* Animations für smooth transitions */
.duration-button {
  transition: all 0.2s ease-in-out;
}

.duration-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Grid responsiveness */
@media (max-width: 640px) {
  .duration-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>```

### ./components/EnhancedStudentModal.vue
```vue
<template>
  <div v-if="selectedStudent" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
    <div class="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
      <div class="bg-green-600 text-white p-4">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <h3 class="text-lg font-bold">{{ selectedStudent.first_name }} {{ selectedStudent.last_name }}</h3>
          </div>
          <div class="flex items-center gap-3">
            <span :class="[
              'text-xs px-2 py-1 rounded-full font-medium',
              selectedStudent.is_active 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            ]">
              {{ selectedStudent.is_active ? 'Aktiv' : 'Inaktiv' }}
            </span>
            <button @click="closeModal" class="text-white hover:text-green-200">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div class="bg-gray-50 border-b px-4">
        <div class="flex">
          <button
            @click="activeTab = 'details'"
            :class="[
              'px-4 py-2 font-medium text-sm border-b-2 transition-colors',
              activeTab === 'details'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            ]"
          >
            Details
          </button>
          <button
            @click="activeTab = 'lessons'"
            :class="[
              'px-4 py-2 font-medium text-sm border-b-2 transition-colors',
              activeTab === 'lessons'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            ]"
          >
            Lektionen
            <span v-if="lessonsCount > 0" class="ml-1 text-xs bg-gray-200 px-1.5 py-0.5 rounded-full">
              {{ lessonsCount }}
            </span>
          </button>
          <button
            @click="activeTab = 'progress'"
            :class="[
              'px-4 py-2 font-medium text-sm border-b-2 transition-colors',
              activeTab === 'progress'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            ]"
          >
            Fortschritt
          </button>
        </div>
      </div>

     <div class="flex-1 overflow-y-auto p-4">
  <div v-if="activeTab === 'details'" class="space-y-6">
    <!-- Persönliche Informationen -->
    <div class="bg-white rounded-lg border p-6">
      <h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <svg class="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
        </svg>
        Persönliche Daten
      </h4>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-4">
          <!-- E-Mail -->
          <div class="flex items-start space-x-3">
            <div class="flex-shrink-0 w-5 h-5 mt-0.5">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-900">E-Mail</div>
              <div v-if="selectedStudent.email" class="mt-1">
                <a 
                  :href="`mailto:${selectedStudent.email}`"
                  class="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                >
                  {{ selectedStudent.email }}
                  <svg class="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                  </svg>
                </a>
              </div>
              <div v-else class="mt-1 text-sm text-gray-500 italic">Nicht angegeben</div>
            </div>
          </div>

          <!-- Telefon -->
          <div class="flex items-start space-x-3">
            <div class="flex-shrink-0 w-5 h-5 mt-0.5">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-900">Telefon</div>
              <div v-if="selectedStudent.phone" class="mt-1">
                <a 
                  :href="`tel:${selectedStudent.phone}`"
                  class="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                >
                  {{ selectedStudent.phone }}
                  <svg class="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                  </svg>
                </a>
              </div>
              <div v-else class="mt-1 text-sm text-gray-500 italic">Nicht angegeben</div>
            </div>
          </div>

          <!-- Kategorie -->
          <div class="flex items-start space-x-3">
            <div class="flex-shrink-0 w-5 h-5 mt-0.5">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-900">Kategorie</div>
              <div class="mt-1">
                <span v-if="selectedStudent.category" 
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {{ selectedStudent.category }}
                </span>
                <span v-else class="text-sm text-gray-500 italic">Nicht angegeben</span>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <!-- Geburtsdatum -->
          <div v-if="selectedStudent.birthdate" class="flex items-start space-x-3">
            <div class="flex-shrink-0 w-5 h-5 mt-0.5">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-900">Geburtsdatum</div>
              <div class="mt-1 text-sm text-gray-700">{{ formatDate(selectedStudent.birthdate) }}</div>
            </div>
          </div>

          <!-- Adresse -->
          <div v-if="selectedStudent.fullAddress" class="flex items-start space-x-3">
            <div class="flex-shrink-0 w-5 h-5 mt-0.5">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-900">Adresse</div>
              <div class="mt-1">
                <a 
                  :href="`https://maps.google.com/?q=${encodeURIComponent(selectedStudent.fullAddress)}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-start"
                >
                  <span class="break-words">{{ selectedStudent.fullAddress }}</span>
                  <svg class="w-3 h-3 ml-1 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <!-- Fahrlehrer -->
          <div v-if="selectedStudent.assignedInstructor" class="flex items-start space-x-3">
            <div class="flex-shrink-0 w-5 h-5 mt-0.5">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-900">Fahrlehrer</div>
              <div class="mt-1 text-sm text-gray-700">{{ selectedStudent.assignedInstructor }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Statistiken -->
    <div class="bg-white rounded-lg border p-6">
      <h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <svg class="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
        </svg>
        Lektionen-Übersicht
      </h4>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div v-if="selectedStudent.lessonsCount" class="flex items-center space-x-3">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
              </svg>
            </div>
          </div>
          <div>
            <div class="text-sm font-medium text-gray-900">Lektionen total</div>
            <div class="text-2xl font-bold text-gray-900">{{ selectedStudent.lessonsCount }}</div>
          </div>
        </div>

        <div v-if="selectedStudent.lastLesson" class="flex items-center space-x-3">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
          <div>
            <div class="text-sm font-medium text-gray-900">Letzte Lektion</div>
            <div class="text-sm text-gray-700">{{ formatDate(selectedStudent.lastLesson) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Aktionen -->
    <div class="bg-white rounded-lg border p-6">
      <h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <svg class="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
        </svg>
        Schnellaktionen
      </h4>
      
      <div class="flex flex-wrap gap-3">
        <button
          v-if="selectedStudent.phone"
          @click="callStudent(selectedStudent.phone)"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
          </svg>
          Anrufen
        </button>

        <button
          v-if="selectedStudent.email"
          @click="emailStudent(selectedStudent.email)"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
          </svg>
          E-Mail senden
        </button>

        <button
          @click="createAppointment(selectedStudent)"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          Termin buchen
        </button>
      </div>
    </div>
  </div>
</div>

       <div v-if="activeTab === 'lessons'">
  <div v-if="isLoadingLessons" class="flex items-center justify-center py-8">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
    <span class="ml-2 text-gray-600">Lektionen werden geladen...</span>
  </div>

  <div v-else-if="lessonsError" class="bg-red-50 border border-red-200 rounded p-4 text-red-700">
    {{ lessonsError }}
  </div>

  <div v-else-if="lessons.length === 0" class="text-center py-8">
    <div class="text-4xl mb-2">📚</div>
    <h4 class="font-semibold text-gray-900 mb-2">Noch keine Lektionen</h4>
    <p class="text-gray-600 mb-4">Dieser Schüler hat noch keine Fahrlektionen absolviert.</p>
    <button
      @click="createAppointment(selectedStudent)"
      class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
    >
      Erste Lektion buchen
    </button>
  </div>

  <div v-else class="space-y-4">
    <div class="text-sm text-gray-600 mb-4">{{ lessons.length }} Lektionen</div>

    <div class="space-y-3">
      <div
        v-for="lesson in lessons"
        :key="lesson.id"
        class="bg-white border rounded-lg p-4 hover:shadow-md transition-all"
      >
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <h4 class="font-semibold text-gray-900">
              {{ formatDateTime(lesson.start_time) }}
              <span v-if="lesson.duration_minutes" class="ml-2">
                |  {{ lesson.duration_minutes }}min
              </span></h4>
              <p class=" text-gray-600">
              📍 {{ lesson.location_name || 'Treffpunkt nicht definiert' }}
              </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

        <div v-if="activeTab === 'progress'" class="space-y-4">
          <div v-if="isLoadingLessons" class="flex items-center justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <span class="ml-2 text-gray-600">Lade Fortschrittsdaten...</span>
          </div>

          <div v-else-if="lessonsError" class="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">
            {{ lessonsError }}
          </div>

          <div v-else-if="lessons.length === 0" class="text-center py-8">
            <div class="text-3xl mb-2">📚</div>
            <h4 class="font-semibold text-gray-900 mb-2">Keine Lektionen gefunden</h4>
            <p class="text-gray-600 text-sm">Dieser Schüler hat noch keine Fahrlektionen absolviert.</p>
          </div>

          <div v-else-if="progressData.length === 0" class="text-center py-8">
            <div class="text-3xl mb-2">📊</div>
            <h4 class="font-semibold text-gray-900 mb-2">Keine Kriterien-Bewertungen verfügbar</h4>
            <p class="text-gray-600 text-sm">
              {{ lessons.length }} Lektionen gefunden, aber noch keine Kriterien bewertet.
            </p>
          </div>

          <div v-else class="space-y-2">
            <div class="flex items-center justify-between mb-4">
              <h4 class="font-semibold text-gray-900">Lernfortschritt</h4>
            </div>

            <div class="space-y-1">
              <!-- KORRIGIERT: Iteriere über Gruppen und dann über Evaluationen -->
              <div
                v-for="group in progressData"
                :key="group.appointment_id"
                class="space-y-1"
              >
                <!-- Terminheader -->
                <div class="text-xs font-medium text-gray-600 mb-2">
                  {{ group.date }} • {{ group.time }}
                  <span v-if="group.duration" class="text-gray-500">
                    ({{ group.duration }}min)
                  </span>
                </div>

                <!-- Einzelne Kriterien-Bewertungen -->
                <div
                  v-for="(evaluation, evalIndex) in group.evaluations"
                  :key="`${group.appointment_id}-${evaluation.criteria_id}-${evalIndex}`"
                  class="border-l-3 pl-3 py-2 border-gray-200 hover:bg-gray-50 transition-colors"
                  :style="{ borderLeftColor: evaluation.borderColor }"
                >
                  <div class="space-y-1">
                    <div class="flex items-start gap-2">
                      <span
                        class="text-xs px-2 py-1 rounded-full font-medium flex-shrink-0"
                        :class="evaluation.colorClass"
                      >
                        {{ evaluation.rating }}/6
                      </span>
                      <div class="flex-1 min-w-0">
                        <div
                          class="text-xs font-medium mb-1"
                          :class="evaluation.textColorClass"
                        >
                          {{ evaluation.criteriaName }}
                          <span v-if="evaluation.shortCode" class="text-gray-500 ml-1">({{ evaluation.shortCode }})</span>
                        </div>
                        <div
                          v-if="evaluation.note"
                          class="text-xs leading-relaxed"
                          :class="evaluation.noteColorClass"
                        >
                          {{ evaluation.note }}
                        </div>
                        <div v-else class="text-xs text-gray-500 italic">Keine Notiz</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showNoteModal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60 p-4">
      <div class="bg-white rounded-lg max-w-md w-full p-6">
        <div class="flex items-center justify-between mb-4">
          <h4 class="font-semibold text-gray-900">{{ selectedCriteria?.criteria_name }}</h4>
          <button @click="showNoteModal = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-600">Bewertung:</span>
            <span :class="[
              'px-2 py-1 rounded text-sm font-medium',
              getRatingColor(selectedCriteria?.criteria_rating)
            ]">
              {{ selectedCriteria?.criteria_rating }}/6 - {{ getRatingText(selectedCriteria?.criteria_rating) }}
            </span>
          </div>
          
          <div>
            <span class="text-sm text-gray-600 block mb-2">Notiz:</span>
            <p class="text-sm text-gray-800 bg-gray-50 p-3 rounded">
              {{ selectedCriteria?.criteria_note }}
            </p>
          </div>
        </div>
        
        <button
          @click="showNoteModal = false"
          class="mt-4 w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Schließen
        </button>
      </div>
    </div>
 
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { 
  formatDate, 
  formatTime, 
  formatDateTime,
  formatDateShort,
  formatTimeShort
} from '~/utils/dateUtils'

// Props
interface Props {
  selectedStudent: any
}

// Interfaces für Datenstrukturen
interface EvaluationCategorySupabase {
  name: string | null
}

interface EvaluationCriteriaSupabase {
  name: string
  short_code: string | null
  evaluation_categories: EvaluationCategorySupabase[] | null
}

interface RawNote {
  appointment_id: string
  criteria_rating: number
  criteria_note: string | null
  evaluation_criteria_id: string
  evaluation_criteria: EvaluationCriteriaSupabase[] | null
}

interface CriteriaEvaluation {
  criteria_id: string
  criteria_name: string
  criteria_short_code: string | null
  criteria_rating: number
  criteria_note: string | null
  criteria_category_name?: string | null
}

interface Lesson {
  id: string
  title: string | null
  start_time: string
  end_time: string
  duration_minutes: number | null
  status: string
  location_name?: string | null  
  criteria_evaluations?: CriteriaEvaluation[]
}

// KORRIGIERTE Interface für ProgressEntry - entfernt die direkten Properties
interface ProgressGroup {
  appointment_id: string
  date: string
  time: string
  duration?: number
  sortDate: Date
  evaluations: {
    criteria_id: string
    criteriaName: string
    shortCode: string | null
    rating: number
    note: string
    colorClass: string
    textColorClass: string
    noteColorClass: string
    borderColor: string
  }[]
}

interface AppointmentWithLocation {
  id: string
  title: string | null
  start_time: string
  end_time: string
  duration_minutes: number | null
  status: string
  locations: {
    name: string
  } | null
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits(['close', 'edit', 'create-appointment', 'evaluate-lesson'])

// Supabase
const supabase = getSupabase()

// State
const activeTab = ref('details')
const isLoadingLessons = ref(false)
const lessonsError = ref<string | null>(null)
const lessons = ref<Lesson[]>([])
const lessonFilter = ref('all')

// Modal state
const showNoteModal = ref(false)
const selectedCriteria = ref<CriteriaEvaluation | null>(null)

// Computed
const lessonsCount = computed(() => lessons.value.length)

const filteredLessons = computed(() => {
  const allLessons = lessons.value

  if (lessonFilter.value === 'evaluated') {
    return allLessons.filter(lesson =>
      lesson.criteria_evaluations && lesson.criteria_evaluations.length > 0
    )
  } else if (lessonFilter.value === 'pending') {
    return allLessons.filter(lesson =>
      !lesson.criteria_evaluations || lesson.criteria_evaluations.length === 0
    )
  }

  return allLessons
})

// KORRIGIERTES progressData computed - gibt Gruppen zurück, nicht flache Einträge
const progressData = computed((): ProgressGroup[] => {
  if (!lessons.value || lessons.value.length === 0) return []

  const groupedByAppointment: Record<string, ProgressGroup> = {}

  lessons.value.forEach(lesson => {
    if (lesson.criteria_evaluations && lesson.criteria_evaluations.length > 0) {
      const appointmentGroup: ProgressGroup = {
        appointment_id: lesson.id,
        date: formatDateShort(lesson.start_time),
        time: formatTimeShort(lesson.start_time),
        duration: lesson.duration_minutes || undefined,
        sortDate: new Date(lesson.start_time),
        evaluations: []
      }

      lesson.criteria_evaluations.forEach((criteria: CriteriaEvaluation) => {
        const rating = criteria.criteria_rating || 0
        appointmentGroup.evaluations.push({
          criteria_id: criteria.criteria_id,
          criteriaName: criteria.criteria_name,
          shortCode: criteria.criteria_short_code,
          rating: rating,
          note: criteria.criteria_note || '',
          colorClass: getRatingColor(rating),
          textColorClass: getRatingTextColor(rating),
          noteColorClass: getRatingNoteColor(rating),
          borderColor: getRatingBorderColor(rating)
        })
      })

      // Sortiere Evaluationen nach Kriterien-Name
      appointmentGroup.evaluations.sort((a, b) => a.criteriaName.localeCompare(b.criteriaName))
      
      groupedByAppointment[lesson.id] = appointmentGroup
    }
  })

  // Konvertiere zu Array und sortiere nach Datum (neueste zuerst)
  return Object.values(groupedByAppointment).sort((a, b) => 
    b.sortDate.getTime() - a.sortDate.getTime()
  )
})

// Methods
const closeModal = () => {
  emit('close')
}

const editStudent = (student: any) => {
  emit('edit', student)
}

const createAppointment = (student: any) => {
  emit('create-appointment', student)
}

const evaluateLesson = (lesson: any) => {
  emit('evaluate-lesson', lesson)
}

const loadLessons = async () => {
  if (!props.selectedStudent?.id) return

  isLoadingLessons.value = true
  lessonsError.value = null

  try {
    console.log('🔥 Loading lessons for student:', props.selectedStudent.id)

    // 1. Lade Appointments
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        title,
        start_time,
        end_time,
        duration_minutes,
        status,
        location_id
      `)
      .eq('user_id', props.selectedStudent.id)
      .in('status', ['completed', 'cancelled'])
      .order('start_time', { ascending: false })

    if (appointmentsError) throw appointmentsError
    console.log('✅ Appointments loaded:', appointments?.length || 0)

    if (!appointments || appointments.length === 0) {
      lessons.value = []
      return
    }

    // 2. Lade Locations separat
    const locationIds = [...new Set(appointments.map(a => a.location_id).filter(Boolean))]
    let locationsMap: Record<string, string> = {}
    
    if (locationIds.length > 0) {
      const { data: locations, error: locationsError } = await supabase
        .from('locations')
        .select('id, name')
        .in('id', locationIds)

      if (!locationsError && locations) {
        locationsMap = locations.reduce((acc, loc) => {
          acc[loc.id] = loc.name
          return acc
        }, {} as Record<string, string>)
      }
    }

    // 3. Lade Notes mit Bewertungen (für Fortschritt)
    const appointmentIds = appointments.map(a => a.id)
    console.log('🔍 Searching notes for appointments:', appointmentIds)

    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select(`
        appointment_id,
        criteria_rating,
        criteria_note,
        evaluation_criteria_id,
        evaluation_criteria(
          name,
          short_code
        )
      `)
      .in('appointment_id', appointmentIds)
      .not('evaluation_criteria_id', 'is', null)

    if (notesError) {
      console.error('❌ Notes error:', notesError)
      throw notesError
    }

    console.log('✅ Notes loaded:', notes?.length || 0)

    // 4. Verarbeite Notes zu Criteria Evaluations
    const notesByAppointment = (notes || []).reduce((acc: Record<string, CriteriaEvaluation[]>, note: any) => {
      if (!acc[note.appointment_id]) {
        acc[note.appointment_id] = []
      }
      
      const evaluationCriteria = note.evaluation_criteria
      
      if (note.evaluation_criteria_id && note.criteria_rating !== null && evaluationCriteria) {
        acc[note.appointment_id].push({
          criteria_id: note.evaluation_criteria_id,
          criteria_name: evaluationCriteria.name || 'Unbekannt',
          criteria_short_code: evaluationCriteria.short_code || null,
          criteria_rating: note.criteria_rating,
          criteria_note: note.criteria_note,
          criteria_category_name: null
        })
      }
      
      return acc
    }, {} as Record<string, CriteriaEvaluation[]>)

    // 5. Kombiniere alles
    lessons.value = appointments.map(appointment => ({
      ...appointment,
      location_name: locationsMap[appointment.location_id] || null,
      criteria_evaluations: notesByAppointment[appointment.id] || []
    }))

    console.log('✅ Final lessons with locations and evaluations:', lessons.value.length)
    console.log('📍 Sample lesson:', lessons.value?.[0])

  } catch (err: any) {
    console.error('❌ Error loading lessons:', err)
    lessonsError.value = err.message || 'Fehler beim Laden der Lektionen'
  } finally {
    isLoadingLessons.value = false
  }
}



const groupedCriteriaEvaluations = (evaluations: CriteriaEvaluation[]) => {
  const grouped: Record<string, CriteriaEvaluation[]> = {}
  evaluations.forEach(evalItem => {
    const categoryName = evalItem.criteria_category_name || 'Allgemeine Kriterien'
    if (!grouped[categoryName]) {
      grouped[categoryName] = []
    }
    grouped[categoryName].push(evalItem)
  })

  for (const category in grouped) {
    grouped[category].sort((a, b) => a.criteria_name.localeCompare(b.criteria_name))
  }
  return grouped
}

const showCriteriaNote = (criteria: CriteriaEvaluation) => {
  selectedCriteria.value = criteria
  showNoteModal.value = true
}

const getRatingColor = (rating: number | null | undefined): string => {
  if (rating === null || rating === undefined) return 'bg-gray-100 text-gray-700'
  const colors: Record<number, string> = {
    1: 'bg-red-100 text-red-700',
    2: 'bg-orange-100 text-orange-700',
    3: 'bg-yellow-100 text-yellow-700',
    4: 'bg-blue-100 text-blue-700',
    5: 'bg-green-100 text-green-700',
    6: 'bg-emerald-100 text-emerald-700'
  }
  return colors[rating] || 'bg-gray-100 text-gray-700'
}

const getRatingText = (rating: number | null | undefined): string => {
  if (rating === null || rating === undefined) return ''
  const texts: Record<number, string> = {
    1: 'Besprochen',
    2: 'Geübt',
    3: 'Ungenügend',
    4: 'Genügend',
    5: 'Gut',
    6: 'Prüfungsreif'
  }
  return texts[rating] || ''
}

const getRatingTextColor = (rating: number | null | undefined): string => {
  if (rating === null || rating === undefined) return 'text-gray-900'
  const colors: Record<number, string> = {
    1: 'text-red-800',     
    2: 'text-orange-800',  
    3: 'text-yellow-800',  
    4: 'text-blue-800',    
    5: 'text-green-800',   
    6: 'text-emerald-800'  
  }
  return colors[rating] || 'text-gray-900'
}

const getRatingNoteColor = (rating: number | null | undefined): string => {
  if (rating === null || rating === undefined) return 'text-gray-700'
  const colors: Record<number, string> = {
    1: 'text-red-700',     
    2: 'text-orange-700',  
    3: 'text-yellow-700',  
    4: 'text-blue-700',    
    5: 'text-green-700',   
    6: 'text-emerald-700'  
  }
  return colors[rating] || 'text-gray-700'
}

const getRatingBorderColor = (rating: number | null | undefined): string => {
  if (rating === null || rating === undefined) return '#6b7280'
  const colors: Record<number, string> = {
    1: '#dc2626',
    2: '#ea580c',
    3: '#ca8a04',
    4: '#2563eb',
    5: '#16a34a',
    6: '#059669'
  }
  return colors[rating] || '#6b7280'
}

const getRatingBgColor = (rating: number | null | undefined): string => {
  if (rating === null || rating === undefined) return 'bg-gray-400'
  const colors: Record<number, string> = {
    1: 'bg-red-400',
    2: 'bg-orange-400',
    3: 'bg-yellow-400', 
    4: 'bg-blue-400',
    5: 'bg-green-400',
    6: 'bg-emerald-400'
  }
  return colors[rating] || 'bg-gray-400'
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

// Statistics (optional, falls benötigt)
const totalLessons = computed(() => {
  return lessons.value.filter(lesson => 
    lesson.criteria_evaluations && lesson.criteria_evaluations.length > 0
  ).length
})

const averageRating = computed(() => {
  const allRatings = progressData.value.flatMap(group => 
    group.evaluations.map(evaluation => evaluation.rating)
  )
  if (allRatings.length === 0) return '0.0'
  const avg = allRatings.reduce((sum, rating) => sum + rating, 0) / allRatings.length
  return avg.toFixed(1)
})

const totalCriteria = computed(() => {
  return progressData.value.reduce((total, group) => total + group.evaluations.length, 0)
})

const lastLessonDays = computed(() => {
  if (lessons.value.length === 0) return '–'
  const lastLesson = lessons.value[0]
  if (!lastLesson || !lastLesson.start_time) return '–'
  const daysDiff = Math.floor((new Date().getTime() - new Date(lastLesson.start_time).getTime()) / (1000 * 60 * 60 * 24))
  return daysDiff.toString()
})

const ratingDistribution = computed(() => {
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
  progressData.value.forEach(group => {
    group.evaluations.forEach(evaluation => {
      const rating = evaluation.rating
      if (rating >= 1 && rating <= 6) {
        distribution[rating]++
      }
    })
  })
  return distribution
})

// Watchers
watch(() => props.selectedStudent, (newStudent) => {
  if (newStudent) {
    console.log('🔥 Student ausgewählt:', newStudent.first_name, newStudent.last_name)
    activeTab.value = 'details'
    loadLessons()
  }
}, { immediate: true })

watch(activeTab, (newTab) => {
  if ((newTab === 'lessons' || newTab === 'progress') && props.selectedStudent) {
    console.log('🔥 Tab gewechselt zu:', newTab, '. Lektionen werden geladen...')
    loadLessons()
  }
})
</script>```

### ./components/EvaluationModal.vue
```vue
<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
    <div class="bg-white rounded-lg max-w-2xl w-full max-h-[95vh] overflow-hidden flex flex-col">
      <div class="bg-green-600 text-white p-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold">Lektion bewerten</h2>
            <p class="text-green-100 text-sm">
              {{ appointment?.title }} - {{ formatDate(appointment?.start_time) }}
            </p>
          </div>
          <button @click="closeModal" class="text-white hover:text-green-200">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-4">
        <div v-if="isLoading" class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>

        <div v-else-if="error" class="bg-red-50 border border-red-200 rounded p-4 text-red-700">
          {{ error }}
        </div>

        <div v-else class="space-y-4">
          <div class="relative">
            <div class="relative">
              <input
                v-model="searchQuery"
                @click="showDropdown = true"
                @input="showDropdown = true"
                type="text"
                placeholder="Bewertungspunkt suchen und hinzufügen..."
                class="search-input w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
              <div class="absolute left-3 top-3.5 text-gray-400">
                🔍
              </div>
            </div>

            <div 
              v-if="showDropdown && filteredCriteria.length > 0"
              class="criteria-dropdown absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg mt-1 shadow-lg z-50 max-h-60 overflow-y-auto"
            >
              <div
                v-for="criteria in filteredCriteria"
                :key="criteria.id"
                @click="selectCriteria(criteria)"
                class="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-medium text-gray-900">{{ criteria.name }}</h4>
                    <p class="text-sm text-gray-600">{{ criteria.category_name }}</p>
                  </div>
                  <span v-if="criteria.short_code" class="text-xs bg-gray-100 px-2 py-1 rounded">
                    {{ criteria.short_code }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <div
              v-for="(criteriaId, index) in selectedCriteriaOrder"
              :key="criteriaId"
              class="bg-gray-50 rounded-lg p-4 border border-gray-200"
            >
              <div class="flex items-start justify-between mb-3">
                <div class="flex-1">
                  <h4 class="font-medium text-gray-900">
                    {{ getCriteriaById(criteriaId)?.name }}
                  </h4>
                  <p class="text-sm text-gray-600">
                    {{ getCriteriaById(criteriaId)?.category_name }}
                  </p>
                </div>
                
                <button
                  @click="removeCriteria(criteriaId)"
                  class="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              <div class="mb-3">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Bewertung (1-6)
                </label>
                <div class="flex gap-2">
                  <button
                    v-for="rating in [1, 2, 3, 4, 5, 6]"
                    :key="rating"
                    @click="setCriteriaRating(criteriaId, rating)"
                    :class="[
                      'w-10 h-10 rounded-full text-sm font-semibold transition-all',
                      getCriteriaRating(criteriaId) === rating
                        ? getRatingColor(rating, true)
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    ]"
                  >
                    {{ rating }}
                  </button>
                </div>
                <p class="text-xs text-gray-500 mt-1">
                  {{ getRatingText(getCriteriaRating(criteriaId)) }}
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Notiz (optional)
                </label>
                <textarea
                  v-model="criteriaNotes[criteriaId]"
                  :placeholder="`Notiz zu ${getCriteriaById(criteriaId)?.name}...`"
                  class="w-full h-20 p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                ></textarea>
              </div>
            </div>
          </div>

          <div v-if="selectedCriteriaOrder.length === 0" class="text-center py-8">
            <div class="text-4xl mb-2">📝</div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Bewertungspunkte hinzufügen</h3>
            <p class="text-gray-600">
              Suchen Sie oben nach Bewertungspunkten und klicken Sie diese an, um die Lektion zu bewerten.
            </p>
          </div>
        </div>
      </div>

      <div class="bg-gray-50 px-4 py-3 border-t">
        <div class="flex gap-3">
          <button
            @click="closeModal"
            class="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Abbrechen
          </button>
          <button
            @click="saveEvaluation"
            :disabled="isSaving || !isValid"
            :class="[
              'flex-1 px-4 py-2 rounded-lg font-medium transition-colors',
              isValid && !isSaving
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            ]"
          >
            {{ isSaving ? 'Speichern...' : 'Bewertung speichern' }}
          </button>
        </div>
        
        <div v-if="!isValid && selectedCriteriaOrder.length > 0" class="mt-2 text-xs text-red-600">
          <p v-if="missingRequiredRatings.length > 0">
            • Folgende Bewertungspunkte müssen noch bewertet werden: {{ missingRequiredRatings.join(', ') }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { formatDate } from '~/utils/dateUtils'
// Importiere den CriteriaEvaluationData-Typ
import { usePendingTasks, type CriteriaEvaluationData } from '~/composables/usePendingTasks'

// Props
interface Props {
  isOpen: boolean
  appointment: any
  studentCategory: string
  currentUser?: any
  eventType?: 'lesson' | 'staff_meeting' // ✅ Neuer Prop
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits(['close', 'saved'])

// WICHTIG: Verwende das zentrale usePendingTasks Composable
// Jetzt importieren wir saveCriteriaEvaluations
const { saveCriteriaEvaluations } = usePendingTasks()

// Supabase
const supabase = getSupabase()

// State
const isLoading = ref(false)
const isSaving = ref(false)
const error = ref<string | null>(null)

// Search & Dropdown
const searchQuery = ref('')
const showDropdown = ref(false)
const allCriteria = ref<any[]>([]) // Wird von v_evaluation_matrix geladen

// Selected Criteria (in order of selection, newest first)
const selectedCriteriaOrder = ref<string[]>([])
const criteriaRatings = ref<Record<string, number>>({})
const criteriaNotes = ref<Record<string, string>>({})

// Computed
const filteredCriteria = computed(() => {
  if (!searchQuery.value) {
    // Wenn Suchfeld leer ist, zeige alle Kriterien, die noch nicht ausgewählt sind
    return allCriteria.value.filter(criteria => !selectedCriteriaOrder.value.includes(criteria.id))
  }
  
  const query = searchQuery.value.toLowerCase()
  return allCriteria.value.filter(criteria => 
    (criteria.name?.toLowerCase().includes(query) ||
    criteria.category_name?.toLowerCase().includes(query) ||
    criteria.short_code?.toLowerCase().includes(query)) &&
    // Don't show already selected criteria
    !selectedCriteriaOrder.value.includes(criteria.id)
  )
})

const isValid = computed(() => {
  // Valid nur wenn:
  // 1. Mindestens ein Kriterium ausgewählt ist
  // 2. ALLE ausgewählten Kriterien haben eine Bewertung
  if (selectedCriteriaOrder.value.length === 0) {
    return false
  }
  
  // Prüfen ob alle ausgewählten Kriterien bewertet wurden
  return selectedCriteriaOrder.value.every(criteriaId => {
    const rating = criteriaRatings.value[criteriaId]
    return rating && rating >= 1 && rating <= 6
  })
})

const missingRequiredRatings = computed(() => {
  const missing: string[] = []
  selectedCriteriaOrder.value.forEach(criteriaId => {
    const rating = criteriaRatings.value[criteriaId]
    if (!rating || rating < 1 || rating > 6) {
      const criteria = getCriteriaById(criteriaId)
      if (criteria) {
        missing.push(criteria.name)
      }
    }
  })
  return missing
})

// Methods
const closeModal = () => {
  console.log('🔥 EvaluationModal - closing modal')
  emit('close')
}

const loadAllCriteria = async () => {
  if (!props.studentCategory) {
    console.log('❌ No student category provided')
    return
  }
  
  console.log('🔥 EvaluationModal - loadAllCriteria called with category:', props.studentCategory)
  isLoading.value = true
  error.value = null
  
  try {
    // Da v_evaluation_matrix die category_id enthält, müssen wir hier die richtige Spalte verwenden
    // Der Fehler bei evaluation_criteria_id im vorherigen Schritt deutet darauf hin,
    // dass deine v_evaluation_matrix anders aufgebaut ist, als ich dachte.
    // Wir müssen die korrekten Spaltennamen aus v_evaluation_matrix verwenden.
    
    // Die Spaltennamen sind typischerweise:
    // id (der Kriterien-ID), name (Kriterienname), short_code, category_name (aus evaluation_categories)
    // Wenn deine v_evaluation_matrix nur 'evaluation_criteria_id' und 'criteria_name' etc. hat, 
    // dann müssen wir das entsprechend anpassen.
    // Laut deiner letzten Ausgabe: item.evaluation_criteria_id, item.criteria_name, item.category_name
    
    const { data, error: supabaseError } = await supabase
      .from('v_evaluation_matrix')
      .select(`
        evaluation_criteria_id,
        criteria_name,
        criteria_description,
        short_code,
        category_name
      `)
      // .eq('driving_category', props.studentCategory) // Diese Zeile könnte einen Fehler verursachen,
      // da ich nicht sicher bin, ob 'driving_category' in v_evaluation_matrix existiert.
      // Falls ja, lass sie drin. Falls nicht, kommentiere sie aus und füge sie später hinzu.
      // Basierend auf den vorherigen Logs, scheint diese Spalte NICHT zu existieren in evaluation_criteria.
      // Wenn evaluation_matrix eine View ist, die alles zusammenfügt, ist es wahrscheinlich,
      // dass sie eine Spalte wie `driving_category` hat.
      // Wenn der Fehler auftritt, liegt es an diesem .eq() Filter.
      
      // Ich gehe davon aus, dass deine v_evaluation_matrix das driving_category-Feld hat,
      // da du es als Prop übergibst. Wenn nicht, melde dich!
      .eq('driving_category', props.studentCategory) 


    if (supabaseError) {
      console.error('❌ Supabase error loading evaluation criteria:', supabaseError)
      throw supabaseError
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No criteria found for category', props.studentCategory)
      error.value = 'Keine Bewertungskriterien gefunden für Kategorie ' + props.studentCategory
      return
    }

    // Mappe die Daten auf das erwartete Format
    allCriteria.value = data.map(item => ({
      id: item.evaluation_criteria_id, // Wichtig: Die ID des Kriteriums
      name: item.criteria_name,
      description: item.criteria_description,
      short_code: item.short_code,
      category_name: item.category_name, // Name der Kategorie
      // Hier könntest du weitere Felder hinzufügen, falls aus v_evaluation_matrix vorhanden (z.B. min_rating, max_rating)
    }));

    console.log('✅ Loaded and processed criteria:', allCriteria.value.length)
    console.log('📋 First few processed criteria:', allCriteria.value.slice(0, 3))

  } catch (err: any) {
    console.error('❌ Error in loadAllCriteria:', err)
    error.value = err.message
  } finally {
    isLoading.value = false
  }
}


const selectCriteria = (criteria: any) => {
  // Add to beginning of array (newest first) only if not already selected
  if (!selectedCriteriaOrder.value.includes(criteria.id)) {
    selectedCriteriaOrder.value.unshift(criteria.id)
    
    // Initialize rating and note if not exists
    if (!criteriaRatings.value[criteria.id]) {
      criteriaRatings.value[criteria.id] = 0 // Standardwert 0 oder null
    }
    if (!criteriaNotes.value[criteria.id]) {
      criteriaNotes.value[criteria.id] = ''
    }
  }
  
  // Clear search and hide dropdown
  searchQuery.value = ''
  showDropdown.value = false
}

const removeCriteria = (criteriaId: string) => {
  const index = selectedCriteriaOrder.value.indexOf(criteriaId)
  if (index > -1) {
    selectedCriteriaOrder.value.splice(index, 1)
  }
  
  // Remove rating and note
  delete criteriaRatings.value[criteriaId]
  delete criteriaNotes.value[criteriaId]
}

const getCriteriaById = (criteriaId: string) => {
  return allCriteria.value.find(c => c.id === criteriaId)
}

const setCriteriaRating = (criteriaId: string, rating: number) => {
  criteriaRatings.value[criteriaId] = rating
}

const getCriteriaRating = (criteriaId: string) => {
  return criteriaRatings.value[criteriaId] || 0 // Rückgabe 0, falls nicht gesetzt
}

const getRatingColor = (rating: number, selected = false) => {
  const colors = {
    1: selected ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700',
    2: selected ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-700',
    3: selected ? 'bg-yellow-500 text-white' : 'bg-yellow-100 text-yellow-700',
    4: selected ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700',
    5: selected ? 'bg-green-500 text-white' : 'bg-green-100 text-green-700',
    6: selected ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700'
  }
  return colors[rating as keyof typeof colors] || (selected ? 'bg-gray-500 text-white' : 'bg-gray-100 text-gray-700')
}

const getRatingText = (rating: number | null) => {
  const texts = {
    1: 'Besprochen',
    2: 'Geübt',
    3: 'Ungenügend',
    4: 'Genügend',
    5: 'Gut',
    6: 'Prüfungsreif'
  }
  return rating ? texts[rating as keyof typeof texts] || '' : ''
}

const loadExistingEvaluation = async () => {
  if (!props.appointment?.id) return
  
  try {
    const { data, error: supabaseError } = await supabase
      .from('notes')
      .select('evaluation_criteria_id, criteria_rating, criteria_note') // Nur die relevanten Spalten laden
      .eq('appointment_id', props.appointment.id)
      .not('evaluation_criteria_id', 'is', null) // Nur Kriterien-Bewertungen laden

    if (supabaseError) throw supabaseError

    // Lade existierende Kriterien-Bewertungen und ordne sie neu an (neueste zuerst)
    selectedCriteriaOrder.value = [] // Zuerst leeren
    data?.forEach(note => {
      if (note.evaluation_criteria_id) {
        selectedCriteriaOrder.value.unshift(note.evaluation_criteria_id) // Add to beginning
        criteriaRatings.value[note.evaluation_criteria_id] = note.criteria_rating || 0
        criteriaNotes.value[note.evaluation_criteria_id] = note.criteria_note || ''
      }
    })

  } catch (err: any) {
    console.error('Error loading existing evaluation:', err)
  }
}

const saveEvaluation = async () => {
  console.log('🔥 EvaluationModal - saveEvaluation called')
  
  if (!isValid.value || !props.appointment?.id) {
    console.log('❌ Validation failed or no appointment ID')
    // Fehler anzeigen, wenn isValid false ist, z.B. über ein Toast
    error.value = missingRequiredRatings.value.length > 0
      ? `Bitte bewerten Sie alle ausgewählten Kriterien: ${missingRequiredRatings.value.join(', ')}`
      : 'Bitte wählen Sie mindestens ein Kriterium und bewerten Sie es.';
    return;
  }
  
  isSaving.value = true
  error.value = null
  
  try {
    // Erstelle ein Array von CriteriaEvaluationData-Objekten
    const evaluationsToSave: CriteriaEvaluationData[] = selectedCriteriaOrder.value.map(criteriaId => {
      return {
        criteria_id: criteriaId,
        rating: criteriaRatings.value[criteriaId],
        note: criteriaNotes.value[criteriaId] || '' // Sicherstellen, dass es ein String ist
      }
    })

    console.log('🔥 EvaluationModal - calling saveCriteriaEvaluations with:', {
      appointmentId: props.appointment.id,
      evaluations: evaluationsToSave,
      currentUser: props.currentUser?.id
    })

    // RUFE DIE NEUE FUNKTION IM COMPOSABLE AUF
    await saveCriteriaEvaluations(
      props.appointment.id,
      evaluationsToSave,
      props.currentUser?.id
    )

    console.log('✅ EvaluationModal - evaluations saved successfully via composable')
    
    // Emit saved event
    emit('saved', props.appointment.id)
    
  } catch (err: any) {
    console.error('❌ EvaluationModal - error saving evaluation:', err)
    error.value = err.message || 'Fehler beim Speichern der Bewertung'
  } finally {
    isSaving.value = false
  }
}

// Click outside or escape key to close dropdown
const handleClickOutside = (event: Event) => {
  const dropdown = document.querySelector('.criteria-dropdown')
  const input = document.querySelector('.search-input')
  
  if (dropdown && !dropdown.contains(event.target as Node) && 
      input && !input.contains(event.target as Node)) {
    showDropdown.value = false
  }
}

const handleEscapeKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    showDropdown.value = false
  }
}

// Watchers
watch(showDropdown, (isOpen) => {
  if (isOpen) {
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleEscapeKey)
  } else {
    document.removeEventListener('click', handleClickOutside)
    document.removeEventListener('keydown', handleEscapeKey)
  }
})

// Watchers
watch(() => props.isOpen, (isOpen) => {
  console.log('🔥 EvaluationModal - isOpen changed:', isOpen)
  console.log('🔥 Student category:', props.studentCategory)
  console.log('🔥 Appointment:', props.appointment)
  
  if (isOpen) {
    console.log('🔄 EvaluationModal - loading data...')
    // Kleine Verzögerung um sicherzustellen dass alle Props gesetzt sind
    nextTick(() => {
      loadAllCriteria()
      loadExistingEvaluation()
    })
  } else {
    console.log('🔥 EvaluationModal - resetting form...')
    // Reset form
    searchQuery.value = ''
    showDropdown.value = false
    selectedCriteriaOrder.value = []
    criteriaRatings.value = {}
    criteriaNotes.value = {}
    error.value = null
    
    // Clean up event listeners
    document.removeEventListener('click', handleClickOutside)
    document.removeEventListener('keydown', handleEscapeKey)
  }
}, { immediate: true })

// Zusätzlicher Watch für studentCategory
watch(() => props.studentCategory, (newCategory) => {
  console.log('🔄 Student category changed to:', newCategory)
  if (props.isOpen && newCategory) {
    console.log('🔄 Reloading criteria for new category...')
    loadAllCriteria()
  }
}, { immediate: true })
</script>

<style scoped>
/* Custom scrollbar */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

/* Smooth transitions */
.transition-all {
  transition: all 0.2s ease-in-out;
}

.transition-colors {
  transition: color 0.2s ease-in-out, background-color 0.2s ease-in-out;
}

/* Focus states for accessibility */
input:focus, textarea:focus {
  outline: none;
}
</style>```

### ./components/EventModal.vue
```vue

<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
    <div class="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto" @click.stop>
      
      <!-- Header -->
      <div class="sticky top-0 bg-white border-b px-6 py-4 rounded-t-lg">
        <div class="flex justify-between items-center">
          <h3 class="text-xl font-semibold text-gray-900">
            {{ modalTitle }}
          </h3>
          <button @click="handleClose" class="text-gray-400 hover:text-gray-600 text-2xl">
            ✕
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="px-6 py-6 space-y-6">
        
        <!-- Student Selector -->
        <div v-if="showStudentSelector">
          <StudentSelector
            ref="studentSelectorRef"
            v-model="selectedStudent"
            :current-user="currentUser"
            :disabled="mode === 'view'"
            :auto-load="shouldAutoLoadStudents"
            @student-selected="handleStudentSelected"
            @student-cleared="handleStudentCleared"
            @switch-to-other="switchToOtherEventType"
          />
        </div>

        <!-- Lesson Type Selector -->
        <div v-if="selectedStudent && formData.eventType === 'lesson'">
          <LessonTypeSelector
            v-model="selectedLessonType"
            :disabled="mode === 'view'"
            @lesson-type-selected="handleLessonTypeSelected"
          />
        </div>

        <!-- Event Type Selector -->
        <div v-if="showEventTypeSelector">
          <EventTypeSelector
            :selected-type="formData.selectedSpecialType"
            @event-type-selected="handleEventTypeSelected"
            @back-to-student="backToStudentSelection"
          />
        </div>

        <!-- Staff Selector für andere Terminarten -->
        <div v-if="formData.eventType === 'other' && formData.selectedSpecialType">
          <StaffSelector
            ref="staffSelectorRef"
            v-model="invitedStaffIds"
            :current-user="currentUser"
            :disabled="mode === 'view'"
            @selection-changed="handleStaffSelectionChanged"
          />
        </div>

        <!-- Customer Invite Selector für andere Terminarten -->
        <div v-if="formData.eventType === 'other' && formData.selectedSpecialType">
          <CustomerInviteSelector
            v-model="invitedCustomers"
            :current-user="currentUser"
            :disabled="mode === 'view'"
            @customers-added="handleCustomersAdded"
            @customers-cleared="handleCustomersCleared"
          />
        </div>

       <!-- Title Input -->
        <TitleInput
          :title="formData.title"
          :event-type="formData.eventType"
          :selected-student="selectedStudent"
          :selected-special-type="formData.selectedSpecialType"
          :category-code="formData.type"
          :selected-location="selectedLocation"
          :disabled="mode === 'view'"
          @update:title="formData.title = $event"
          @title-generated="handleTitleGenerated"
        />

        <!-- Category & Duration Section -->
        <div v-if="selectedStudent" class="space-y-4">
          <CategorySelector
            v-model="formData.type"
            :selected-user="selectedStudent"
            :current-user="currentUser"
            :current-user-role="currentUser?.role"
            @category-selected="handleCategorySelected"
            @price-changed="handlePriceChanged"
            @durations-changed="handleDurationsChanged"
          />

          <DurationSelector
            v-if="formData.type"
            v-model="formData.duration_minutes"
            :available-durations="availableDurations"
            :price-per-minute="formData.price_per_minute"
            :disabled="mode === 'view'"
            @duration-changed="handleDurationChanged"
          />
        </div>

        <!-- Time Section -->
        <TimeSelector
          :start-date="formData.startDate"
          :start-time="formData.startTime"
          :end-time="formData.endTime"
          :duration-minutes="formData.duration_minutes"
          :event-type="formData.eventType"
          :selected-student="selectedStudent"
          :selected-special-type="formData.selectedSpecialType"
          :disabled="mode === 'view'"
          :mode="mode"
          @update:start-date="formData.startDate = $event"
          @update:start-time="formData.startTime = $event"
          @update:end-time="formData.endTime = $event"
          @time-changed="handleTimeChanged"
        />

        <!-- Location Section -->
        <div v-if="showTimeSection">
          <LocationSelector
            :model-value="formData.location_id"
            :selected-student-id="selectedStudent?.id"
            :current-staff-id="formData.staff_id"
            :disabled="mode === 'view'"
            @update:model-value="updateLocationId"
            @location-selected="handleLocationSelected"
          />
        </div>

        <!-- Price Display - nur für Fahrstunden -->
        <div v-if="selectedStudent && formData.duration_minutes && formData.eventType === 'lesson'">
          <PriceDisplay
            ref="priceDisplayRef"
            :event-type="formData.eventType"
            :duration-minutes="formData.duration_minutes"
            :price-per-minute="formData.price_per_minute"
            :category-code="formData.type"
            :is-paid="formData.is_paid"
            :admin-fee="120"
            :is-second-or-later-appointment="false"
            :appointment-number="1"
            :discount="formData.discount"
            :discount-type="formData.discount_type"
            :discount-reason="formData.discount_reason"
            :allow-discount-edit="currentUser?.role === 'staff' || currentUser?.role === 'admin'"
            :current-user="currentUser"
            :selected-date="formData.startDate"
            :start-time="formData.startTime"
            :selected-student="selectedStudent"
            :initial-payment-method="formData.payment_method"
            @discount-changed="handleDiscountChanged"
            @payment-status-changed="handlePaymentStatusChanged"
            @open-payment-modal="handleOpenPaymentModal"
            @payment-mode-changed="handlePaymentModeChanged"
            @invoice-data-changed="handleInvoiceDataChanged"
          />
        </div>

        <!-- Error Display -->
        <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
          <p class="text-sm text-red-800">❌ {{ error }}</p>
        </div>

        <!-- Loading Display -->
        <div v-if="isLoading" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex items-center space-x-2">
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <p class="text-sm text-blue-800">💾 Termin wird gespeichert...</p>
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div class="sticky bottom-0 bg-gray-50 px-6 py-4 border-t rounded-b-lg">
        <div class="flex justify-end space-x-3">
          <button
            @click="handleClose"
            class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            :disabled="isLoading"
          >
            {{ mode === 'view' ? 'Schließen' : 'Abbrechen' }}
          </button>

          <button
            v-if="mode !== 'view'"
            @click="handleSave"
            :disabled="!isFormValid || isLoading"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2 transition-colors"
          >
            <span v-if="isLoading">⏳</span>
            <span v-else>💾</span>
            <span>{{ mode === 'create' ? 'Erstellen' : 'Speichern' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { getSupabase } from '~/utils/supabase'

// Components
import StudentSelector from '~/components/StudentSelector.vue'
import EventTypeSelector from '~/components/EventTypeSelector.vue'
import CategorySelector from '~/components/CategorySelector.vue'
import DurationSelector from '~/components/DurationSelector.vue'
import LocationSelector from '~/components/LocationSelector.vue'
import PriceDisplay from '~/components/PriceDisplay.vue'
import TimeSelector from '~/components/TimeSelector.vue'
import TitleInput from '~/components/TitleInput.vue'
import LessonTypeSelector from '~/components/LessonTypeSelector.vue'
import StaffSelector from '~/components/StaffSelector.vue'
import CustomerInviteSelector from '~/components/CustomerInviteSelector.vue' 

// Composables
import { useCompanyBilling } from '~/composables/useCompanyBilling'

// Types
interface Student {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  category: string
  assigned_staff_id: string
}

interface Props {
  isVisible: boolean
  eventData: any
  mode: 'view' | 'edit' | 'create'
  currentUser?: any
  eventType?: 'lesson' | 'staff_meeting'
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'create'
})

const emit = defineEmits<{
  'close': []
  'save': [data: any]
  'save-event': [data: any]
  'appointment-saved': [data: any]
  'appointment-updated': [data: any]
  'appointment-deleted': [id: string]
  'default-billing-address-loaded': [address: any]
  'payment-mode-changed': [paymentMode: string, data?: any]

}>()

// ============ REFS ============
const supabase = getSupabase()
const studentSelectorRef = ref()
const selectedStudent = ref<Student | null>(null)
const selectedLocation = ref<any | null>(null)
const availableDurations = ref([45])
const error = ref('')
const isLoading = ref(false)
const showEventTypeSelection = ref(false)
const selectedLessonType = ref('lesson') 
const staffSelectorRef = ref() 
const invitedStaffIds = ref<string[]>([])
const invitedCustomers = ref<any[]>([])  
const defaultBillingAddress = ref(null) // NEU


const formData = ref({
  id: '',
  title: '',
  type: '',
  appointment_type: 'lesson',
  startDate: '',
  startTime: '',
  endTime: '',
  duration_minutes: 45,
  location_id: '',
  staff_id: props.currentUser?.id || '',
  price_per_minute: 95/45,
  user_id: '',
  status: 'confirmed',
  is_paid: false,
  description: '',
  eventType: 'lesson' as 'lesson' | 'staff_meeting' | 'other',
  selectedSpecialType: '',
  discount: 0,
  discount_type: 'fixed' as const,
  discount_reason: '',
  payment_method: 'online',
  payment_data: null as any
})

const companyBilling = useCompanyBilling()

// ============ COMPUTED ============
const modalTitle = computed(() => {
  switch (props.mode) {
    case 'create': return '➕ Neuen Termin erstellen'
    case 'edit': return '✏️ Termin bearbeiten'
    case 'view': return '👁️ Termin anzeigen'
    default: return 'Termin'
  }
})

const shouldAutoLoadStudents = computed(() => {
  // ✅ FIX: Nicht auto-loaden wenn es ein free slot click ist
  if (props.eventData?.isFreeslotClick || props.eventData?.clickSource === 'calendar-free-slot') {
    console.log('🚫 Free slot click detected - disabling auto student load')
    return true
  }
  
  return formData.value.eventType === 'lesson' && (props.mode === 'create' || !selectedStudent.value)
})

const isFormValid = computed(() => {
  if (formData.value.eventType === 'lesson') {
    return selectedStudent.value && 
           formData.value.type && 
           formData.value.startDate && 
           formData.value.startTime && 
           formData.value.location_id &&
           formData.value.staff_id
  } else {
    // Für andere Terminarten
    return formData.value.title &&
           formData.value.startDate && 
           formData.value.startTime && 
           formData.value.location_id &&
           formData.value.staff_id
  }
})

const showStudentSelector = computed(() => {
  return formData.value.eventType === 'lesson' && !showEventTypeSelection.value
})

const showEventTypeSelector = computed(() => {
  return showEventTypeSelection.value
})

const showTimeSection = computed(() => {
  if (formData.value.eventType === 'lesson') {
    return !!selectedStudent.value
  } else {
    return !!formData.value.selectedSpecialType
  }
})

const totalPrice = computed(() => {
  const total = formData.value.price_per_minute * formData.value.duration_minutes
  return total.toFixed(2)
})

// ============ HANDLERS ============
const handleStudentSelected = async (student: Student | null) => {
  console.log('👤 Student selected:', student?.first_name)
  selectedStudent.value = student
  formData.value.user_id = student?.id || ''
  
  if (student?.category) {
    const primaryCategory = student.category.split(',')[0].trim()
    formData.value.type = primaryCategory
  }
  
  // Auto-generate title if we have student and location
  generateTitleIfReady()
}

const handleLessonTypeSelected = (lessonType: any) => {
  console.log('🎯 Lesson type selected:', lessonType.name)
  selectedLessonType.value = lessonType.code
  
  // ✅ NUR appointment_type setzen - Dauer bleibt über CategorySelector/DurationSelector
  // Das appointment_type wird später in der DB als 'type' gespeichert
  formData.value.appointment_type = lessonType.code
  
  console.log('📝 Appointment type set to:', lessonType.code)
}

const handleStudentCleared = () => {
  console.log('🗑️ Student cleared')
  selectedStudent.value = null
  formData.value.user_id = ''
  formData.value.title = ''
  formData.value.type = ''
  triggerStudentLoad()
}

const switchToOtherEventType = () => {
  console.log('🔄 Switching to other event types')
  formData.value.eventType = 'other'
  showEventTypeSelection.value = true
  selectedStudent.value = null
  formData.value.user_id = ''
}

const handleEventTypeSelected = (eventType: any) => {
  console.log('🎯 Event type selected:', eventType)
  formData.value.selectedSpecialType = eventType.code
  formData.value.title = eventType.name
  formData.value.type = eventType.code
  formData.value.duration_minutes = eventType.default_duration_minutes || 60
  calculateEndTime()
}

const backToStudentSelection = () => {
  console.log('⬅️ Back to student selection')
  showEventTypeSelection.value = false
  formData.value.eventType = 'lesson'
  formData.value.selectedSpecialType = ''
  formData.value.title = ''
  formData.value.type = ''
}

const handleCategorySelected = (category: any) => {
  console.log('🎯 Category selected:', category?.code)
  if (category) {
    formData.value.price_per_minute = category.price_per_lesson / 45
  }
}

const handlePriceChanged = (price: number) => {
  formData.value.price_per_minute = price
}

const handleDurationsChanged = (durations: number[]) => {
  console.log('⏱️ Durations changed:', durations)
  availableDurations.value = durations
  
  if (!durations.includes(formData.value.duration_minutes)) {
    formData.value.duration_minutes = durations[0] || 45
  }
}

const handleDurationChanged = (newDuration: number) => {
  console.log('⏱️ Duration changed to:', newDuration)
  formData.value.duration_minutes = newDuration
  calculateEndTime()
}

const handleDiscountChanged = (discount: number, discountType: 'fixed', reason: string) => {
  formData.value.discount = discount
  formData.value.discount_type = discountType
  formData.value.discount_reason = reason
  console.log('💰 Discount changed:', { discount, discountType, reason })
}

const handlePaymentStatusChanged = (isPaid: boolean, paymentMethod?: string) => {
  formData.value.is_paid = isPaid
  console.log('💳 Payment status changed:', { isPaid, paymentMethod })
  
  // Hier können Sie zusätzliche Logik für das Speichern hinzufügen
  // z.B. sofort in der Datenbank aktualisieren
}

const handleTimeChanged = (timeData: { startDate: string, startTime: string, endTime: string }) => {
  console.log('🕐 Time changed:', timeData)
  formData.value.startDate = timeData.startDate
  formData.value.startTime = timeData.startTime
  formData.value.endTime = timeData.endTime
}

const handleTitleGenerated = (title: string) => {
  console.log('📝 Title auto-generated:', title)
  formData.value.title = title
}

const handleOpenPaymentModal = () => {
  console.log('💳 Opening payment modal for online payment')
  // Hier würden Sie das PaymentModal öffnen
  // emit('open-payment-modal') oder ein separates Modal anzeigen
}

const updateLocationId = (locationId: string | null) => {
  formData.value.location_id = locationId || ''
}

const handleLocationSelected = (location: any) => {
  console.log('📍 Location selected:', location)
  selectedLocation.value = location
  formData.value.location_id = location?.id || ''
  
  // Auto-generate title if we have student and location
  generateTitleIfReady()
}

const generateTitleIfReady = () => {
  if (formData.value.eventType === 'lesson' && selectedStudent.value && selectedLocation.value) {
    const firstName = selectedStudent.value.first_name
    const lastName = selectedStudent.value.last_name
    const location = selectedLocation.value.name || selectedLocation.value.address || 'Treffpunkt'
    const newTitle = `${firstName} ${lastName} - ${location}`
    
    formData.value.title = newTitle
    console.log('🎯 Auto-generated title:', newTitle)
  }
}

const calculateEndTime = () => {
  if (formData.value.startTime && formData.value.duration_minutes) {
    const [hours, minutes] = formData.value.startTime.split(':').map(Number)
    const startDate = new Date()
    startDate.setHours(hours, minutes, 0, 0)
    
    const endDate = new Date(startDate.getTime() + formData.value.duration_minutes * 60000)
    formData.value.endTime = endDate.toTimeString().slice(0, 5)
  }
}

const triggerStudentLoad = () => {
  // ✅ FIX: Nicht bei free slot clicks triggern
  if (props.eventData?.isFreeslotClick || props.eventData?.clickSource === 'calendar-free-slot') {
    console.log('🚫 Triggering student load blocked - free slot click detected')
    return
  }
  
  console.log('🔄 Triggering student load...')
  if (studentSelectorRef.value) {
    studentSelectorRef.value.loadStudents()
  }
}

const resetForm = () => {
  
  selectedStudent.value = null
  selectedLocation.value = null
  showEventTypeSelection.value = false

    invitedStaffIds.value = []
  if (staffSelectorRef.value?.resetSelection) {
    staffSelectorRef.value.resetSelection()
  }

  formData.value = {
    id: '',
    title: '',
    type: '',
    appointment_type: 'lesson',
    startDate: '',
    startTime: '',
    endTime: '',
    duration_minutes: 45,
    location_id: '',
    staff_id: props.currentUser?.id || '',
    price_per_minute: 95/45,
    user_id: '',
    status: 'confirmed',
    is_paid: false,
    description: '',
    eventType: 'lesson' as 'lesson',
    selectedSpecialType: '',
    discount: 0,
    discount_type: 'fixed' as const,
    discount_reason: '',
    payment_method: props.eventData.payment_method || 'cash',
    payment_data: props.eventData.payment_data || null
  }
  error.value = ''
  isLoading.value = false
}

// Staff Selection Handler
const handleStaffSelectionChanged = (staffIds: string[], staffMembers: any[]) => {
  console.log('👥 Staff selection changed:', { 
    selectedIds: staffIds, 
    selectedMembers: staffMembers.length 
  })
  
  invitedStaffIds.value = staffIds
  
  // Optional: Weitere Logik für Team-Einladungen
  if (staffIds.length > 0) {
    console.log('✅ Team members selected for invitation')
  }
}

// NEU: Customer Invite Handlers
const handleCustomersAdded = (customers: any[]) => {
  console.log('📞 Customers added to invite list:', customers.length)
}

const handleCustomersCleared = () => {
  console.log('🗑️ Customer invite list cleared')
  invitedCustomers.value = []
}

// ============ SAVE LOGIC ============
const handleSave = async () => {
  console.log('💾 Saving appointment')
  
  if (!isFormValid.value) {
    error.value = 'Bitte füllen Sie alle Felder aus'
    return
  }
  
  isLoading.value = true
  error.value = ''
  
  try {
    // Create proper datetime strings
    const localStart = new Date(`${formData.value.startDate}T${formData.value.startTime}`)
    const localEnd = new Date(`${formData.value.startDate}T${formData.value.endTime}`)
    
    const appointmentData = {
      title: formData.value.title,
      start_time: localStart.toISOString(),
      end_time: localEnd.toISOString(),
      duration_minutes: formData.value.duration_minutes,
      user_id: formData.value.user_id || formData.value.staff_id,
      staff_id: formData.value.staff_id,
      location_id: formData.value.location_id,
      type: formData.value.type,
      status: formData.value.status,
      is_paid: formData.value.is_paid,
      price_per_minute: formData.value.price_per_minute,
      description: formData.value.title || ''
    }
    
    console.log('📋 Saving appointment data:', appointmentData)
    console.log('👥 Selected staff for team invitations:', invitedStaffIds.value.length, 'members')
    
    let result
    if (props.mode === 'create') {
      const { data, error: saveError } = await supabase
        .from('appointments')
        .insert([appointmentData])
        .select()
        .single()
      
      if (saveError) throw saveError
      result = data
      console.log('✅ Appointment created:', result.id)
      
    } else if (props.mode === 'edit') {
      const { data, error: updateError } = await supabase
        .from('appointments')
        .update(appointmentData)
        .eq('id', formData.value.id)
        .select()
        .single()
      
      if (updateError) throw updateError
      result = data
      console.log('✅ Appointment updated:', result.id)
    }
    
    // NEU: Team-Einladungen erstellen falls StaffSelector verwendet wurde
    if (invitedStaffIds.value.length > 0 && staffSelectorRef.value && result?.id) {
      console.log('📧 Creating team invites via StaffSelector...')
      
      try {
        const teamInvites = await staffSelectorRef.value.createTeamInvites(appointmentData)
        console.log('✅ Team invites created:', teamInvites.length)
      } catch (inviteError) {
        console.error('❌ Error creating team invites:', inviteError)
        // Haupt-Termin ist gespeichert, auch wenn Team-Einladungen fehlschlagen
      }
    }
    
    console.log('✅ All save events emitted for mode:', props.mode)
    emit('save-event', result)
    handleClose()
    
  } catch (err: any) {
    console.error('❌ Save error:', err)
    error.value = err.message || 'Fehler beim Speichern des Termins'
  } finally {
    isLoading.value = false
  }
}

const handleClose = () => {
  console.log('🚪 Closing modal')
  resetForm()
  emit('close')
}

// ============ MODAL INITIALIZATION ============
const initializeFormData = () => {
  console.log('🎯 Initializing form data, mode:', props.mode)
  
  if (props.mode === 'edit' && props.eventData) {
    // Edit mode - populate with existing data
    formData.value.id = props.eventData.id || ''
    formData.value.title = props.eventData.title || ''
    formData.value.type = props.eventData.extendedProps?.category || ''
    formData.value.user_id = props.eventData.extendedProps?.user_id || ''
    formData.value.location_id = props.eventData.extendedProps?.location_id || ''
    formData.value.duration_minutes = props.eventData.extendedProps?.duration_minutes || 45
    formData.value.price_per_minute = props.eventData.extendedProps?.price_per_minute || 95/45
    formData.value.status = props.eventData.extendedProps?.status || 'confirmed'
    formData.value.is_paid = props.eventData.extendedProps?.is_paid || false
    formData.value.description = props.eventData.extendedProps?.description || ''
    
    if (props.eventData.start) {
      const startDate = new Date(props.eventData.start)
      formData.value.startDate = startDate.toISOString().split('T')[0]
      formData.value.startTime = startDate.toTimeString().slice(0, 5)
    }
    
    if (props.eventData.end) {
      const endDate = new Date(props.eventData.end)
      formData.value.endTime = endDate.toTimeString().slice(0, 5)
    }
    
    // Load student if available
    if (formData.value.user_id) {
      loadStudentForEdit(formData.value.user_id)
    }
    
  } else if (props.mode === 'create' && props.eventData?.start) {
    // Create mode with time data
    formData.value.eventType = 'lesson'  
    showEventTypeSelection.value = false 
    const utcDate = new Date(props.eventData.start)
    const year = utcDate.getFullYear()
    const month = String(utcDate.getMonth() + 1).padStart(2, '0')
    const day = String(utcDate.getDate()).padStart(2, '0')
    const hours = String(utcDate.getHours()).padStart(2, '0')
    const minutes = String(utcDate.getMinutes()).padStart(2, '0')
    
    formData.value.startDate = `${year}-${month}-${day}`
    formData.value.startTime = `${hours}:${minutes}`
    calculateEndTime()
        // Auto-load students für lesson events
    console.log('🔄 CREATE mode - triggering student load')
    setTimeout(() => {
      triggerStudentLoad()
    }, 100)
  }
}

const loadStudentForEdit = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) throw error
    
    if (data) {
      selectedStudent.value = data
      console.log('👤 Student loaded for edit mode:', data.first_name)
    }
  } catch (err) {
    console.error('❌ Error loading student for edit:', err)
  }
}

// In EventModal.vue - erweitere die Funktion mit mehr Logs:
const saveStudentPaymentPreferences = async (studentId: string, paymentMode: string, data?: any) => {
 console.log('🔥 saveStudentPaymentPreferences called with:', {
   studentId,
   paymentMode,
   data,
   hasCurrentAddress: !!data?.currentAddress?.id
 })
 
 try {
   const supabase = getSupabase()
   
   // 🔧 KORREKTUR: Richtiges Mapping für payment_methods
   const paymentMethodMapping: Record<string, string> = {
     'cash': 'cash',           // ✅ Existiert
     'invoice': 'invoice',     // ✅ Existiert  
     'online': 'twint'         // ❌ 'online' → 'twint' (Standard Online-Method)
   }
   
   const actualMethodCode = paymentMethodMapping[paymentMode]
   
   if (!actualMethodCode) {
     console.warn('⚠️ Unknown payment mode:', paymentMode)
     return // Speichere nichts bei unbekannter Methode
   }
   
   const updateData: any = {
     preferred_payment_method: actualMethodCode  // ← WICHTIG: actualMethodCode statt paymentMode
   }
   
   // Falls Rechnungsadresse gewählt und Adresse gespeichert
   if (paymentMode === 'invoice' && data?.currentAddress?.id) {
     updateData.default_company_billing_address_id = data.currentAddress.id
     console.log('📋 Adding billing address ID:', data.currentAddress.id)
   }
   
   console.log('💾 Mapping:', paymentMode, '→', actualMethodCode)
   console.log('💾 Updating user with data:', updateData)
   console.log('👤 For student ID:', studentId)
   
   const { error, data: result } = await supabase
     .from('users')
     .update(updateData)
     .eq('id', studentId)
     .select('id, preferred_payment_method') // ← Debug: Zeige was gespeichert wurde
   
   if (error) {
     console.error('❌ Supabase error:', error)
     throw error
   }
   
   console.log('✅ Update result:', result)
   console.log('✅ Payment preferences saved successfully!')
   
 } catch (err) {
   console.error('❌ Error saving payment preferences:', err)
 }
}

const handlePaymentModeChanged = (paymentMode: 'invoice' | 'cash' | 'online', data?: any) => {
  console.log('💳 handlePaymentModeChanged called:', { paymentMode, data, selectedStudentId: selectedStudent.value?.id, selectedStudentName: selectedStudent.value?.first_name })
  
  // Store payment method
  formData.value.payment_method = paymentMode
  
  // NEU: Wenn Invoice-Mode und wir haben eine Standard-Adresse geladen
  if (paymentMode === 'invoice' && defaultBillingAddress.value && !data?.currentAddress) {
    console.log('🏠 Using default billing address for invoice mode')
    const address = defaultBillingAddress.value as any
    data = {
      formData: {
        companyName: address.company_name,
        contactPerson: address.contact_person,
        email: address.email,
        phone: address.phone || '',
        street: address.street,
        streetNumber: address.street_number || '',
        zip: address.zip,
        city: address.city,
        country: address.country,
        vatNumber: address.vat_number || '',
        notes: address.notes || ''
      },
      currentAddress: address,
      isValid: true
    }
  }
  
  // Save preferences if student selected
  if (selectedStudent.value?.id) {
    console.log('🎯 Calling saveStudentPaymentPreferences...')
    saveStudentPaymentPreferences(selectedStudent.value.id, paymentMode, data)
  }
  
  // Emit for PriceDisplay
  emit('payment-mode-changed', paymentMode, data)
}

const handleInvoiceDataChanged = (invoiceData: any, isValid: boolean) => {
  console.log('📄 Invoice data changed:', invoiceData, isValid)
  // Hier kannst du die Rechnungsdaten speichern falls nötig
  // formData.value.invoiceData = invoiceData
  // formData.value.invoiceValid = isValid
}

// ============ WATCHERS ============
watch(() => props.isVisible, (visible) => {
  if (visible) {
    console.log('✅ Modal opened:', {
      mode: props.mode,
      hasEventData: !!props.eventData
    })
    
    if (props.mode === 'create') {
      resetForm()
      triggerStudentLoad()
    }
    
    initializeFormData()
  }
})

watch(() => formData.value.duration_minutes, () => {
  calculateEndTime()
})

watch(selectedStudent, (newStudent, oldStudent) => {
  if (oldStudent && !newStudent && props.mode === 'create') {
    console.log('🔄 Student cleared in create mode - triggering reload')
    setTimeout(() => {
      triggerStudentLoad()
    }, 100)
  }
})

// ============ LIFECYCLE ============
onMounted(() => {
  console.log('🔥 EventModal - Component mounted')
})
</script>

<style scoped>
input:focus, select:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

input:disabled, select:disabled {
  background-color: #f9fafb;
  color: #6b7280;
  cursor: not-allowed;
}

button:not(:disabled):hover {
  transform: translateY(-1px);
  transition: all 0.2s ease;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>```

### ./components/EventTypeSelector.vue
```vue
<template>
  <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
    <!-- Header mit Zurück-Button -->
    <div class="flex justify-between items-center mb-3">
      <label class="block text-sm font-semibold text-gray-900">
        📋 Terminart auswählen
      </label>
      <button
        @click="$emit('back-to-student')"
        class="text-md text-purple-600 hover:text-purple-800 text-bold"
      >
        ← Zurück
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-4">
      <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto mb-2"></div>
      <p class="text-sm text-gray-600">Terminarten werden geladen...</p>
    </div>

    <!-- Event Types Grid -->
    <div v-else class="grid grid-cols-2 gap-2 mb-4">
      <button
        v-for="eventType in eventTypes" 
        :key="eventType.code"
        @click="selectEventType(eventType)"
        :class="[
          'p-3 text-sm rounded border text-left transition-colors duration-200',
          selectedType === eventType.code
            ? 'bg-purple-600 text-white border-purple-600'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        ]"
      >
        {{ eventType.emoji }} {{ eventType.name }}
      </button>
    </div>

    <!-- Empty State -->
    <div v-if="!isLoading && eventTypes.length === 0" class="text-center py-4">
      <p class="text-sm text-gray-500">Keine Terminarten verfügbar</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getSupabase } from '~/utils/supabase'

// Types
interface EventType {
  code: string
  name: string
  emoji: string
  description?: string
  default_duration_minutes?: number
  default_color?: string
  auto_generate_title?: boolean
  price_per_minute?: number
}

// Props
interface Props {
  selectedType?: string | null
  autoLoad?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectedType: null,
  autoLoad: true
})

// Emits
const emit = defineEmits<{
  'event-type-selected': [eventType: EventType]
  'back-to-student': []
}>()

// State
const eventTypes = ref<EventType[]>([])
const isLoading = ref(false)

// Methods
const loadEventTypes = async () => {
  isLoading.value = true
  try {
    console.log('🔄 Loading event types from database...')
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('event_types')
      .select('*')
      .eq('is_active', true)
      .order('display_order')

    if (error) throw error

    eventTypes.value = (data || []) as EventType[]
    console.log('✅ Event types loaded:', {
      count: eventTypes.value.length,
      types: eventTypes.value.map((et: EventType) => `${et.emoji} ${et.name} (${et.default_duration_minutes}min)`)
    })
  } catch (error) {
    console.error('❌ Error loading event types:', error)
    // Fallback: Statische Event-Types falls DB-Abfrage fehlschlägt
    eventTypes.value = [
      {
        code: 'meeting',
        name: 'Sitzung',
        emoji: '🤝',
        description: 'Team-Meeting',
        default_duration_minutes: 180,
        default_color: '#019ee5'
      },
      {
        code: 'course',
        name: 'Kurs',
        emoji: '☕',
        description: 'Verkehrskunde',
        default_duration_minutes: 300,
        default_color: '#62b22f'
      },
      {
        code: 'other',
        name: 'Sonstiges',
        emoji: '📝',
        description: 'Individueller Termin',
        default_duration_minutes: 45,
        default_color: '#666666'
      }
    ] as EventType[]
    console.log('🔄 Using fallback event types')
  } finally {
    isLoading.value = false
  }
}

const selectEventType = (eventType: EventType) => {
  try {
    console.log('📋 Selecting event type:', eventType)
    // Sichere Checks
    if (!eventType || !eventType.code) {
      console.error('❌ Invalid event type:', eventType)
      return
    }
    
    console.log('✅ Event type selected successfully:', {
      code: eventType.code,
      name: eventType.name,
      duration: eventType.default_duration_minutes
    })
    
    emit('event-type-selected', eventType)
  } catch (error) {
    console.error('❌ Error in selectEventType:', error)
  }
}

// Lifecycle
onMounted(() => {
  if (props.autoLoad) {
    loadEventTypes()
  }
})

// Expose methods for manual loading
defineExpose({
  loadEventTypes
})
</script>```

### ./components/LessonTypeSelector.vue
```vue
<template>
  <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
    <label class="block text-sm font-semibold text-gray-900 mb-3">
      🎯 Terminart auswählen
    </label>

    <!-- Lesson Types Grid -->
    <div class="grid grid-cols-2 gap-2">
      <button
        v-for="lessonType in lessonTypes" 
        :key="lessonType.code"
        @click="selectLessonType(lessonType)"
        :class="[
          'p-3 text-sm rounded border text-left transition-colors duration-200',
          selectedType === lessonType.code
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        ]"
      >
        {{ lessonType.emoji }} {{ lessonType.name }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

// Types
interface LessonType {
  code: string
  name: string
  emoji: string
  description?: string
}

interface Props {
  selectedType?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectedType: 'lesson',
  disabled: false
})

const emit = defineEmits<{
  'lesson-type-selected': [lessonType: LessonType]
  'update:modelValue': [code: string]
}>()

// State
const selectedType = ref(props.selectedType)

// Lesson Types Data
const lessonTypes = ref<LessonType[]>([
  {
    code: 'lesson',
    name: 'Fahrstunde',
    emoji: '🚗',
    description: 'Reguläre Fahrstunde'
  },
  {
    code: 'exam',
    name: 'Prüfung',
    emoji: '📝',
    description: 'Praktische Fahrprüfung'
  },
  {
    code: 'theory',
    name: 'Theorie',
    emoji: '📚',
    description: 'Theorieunterricht'
  },
  {
    code: 'meeting',
    name: 'Besprechung',
    emoji: '💬',
    description: 'Besprechung mit Schüler'
  }
])

// Methods
const selectLessonType = (lessonType: LessonType) => {
  if (props.disabled) return
  
  selectedType.value = lessonType.code
  
  console.log('🎯 Lesson type selected:', lessonType.name)
  
  emit('lesson-type-selected', lessonType)
  emit('update:modelValue', lessonType.code)
}

// Initialize
onMounted(() => {
  // Auto-select default lesson type
  const defaultType = lessonTypes.value.find(t => t.code === props.selectedType)
  if (defaultType) {
    selectLessonType(defaultType)
  }
})
</script>```

### ./components/LocationSelector.vue
```vue
<template>
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-2">
      📍 Standort
    </label>
    
    <!-- Toggle zwischen Standard und Custom -->
    <div class="flex gap-2 mb-3">
      <button
        @click="useStandardLocations = true"
        :class="[
          'px-3 py-1 text-sm rounded border',
          useStandardLocations 
            ? 'bg-blue-600 text-white border-blue-600' 
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        ]"
      >
        📋 Standard-Orte
      </button>
      <button
        @click="useStandardLocations = false"
        :class="[
          'px-3 py-1 text-sm rounded border',
          !useStandardLocations 
            ? 'bg-purple-600 text-white border-purple-600' 
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        ]"
      >
        🔍 Google Suche
      </button>
    </div>

    <!-- Kombinierter Dropdown für Standard + Pickup Locations -->
    <select
      v-if="useStandardLocations"
      v-model="selectedLocationId"
      @change="onLocationChange"
      class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
      :required="required"
      :disabled="isLoadingLocations"
    >
      <option value="">Standort wählen</option>
      
      <!-- Standard Locations (Fahrschule) -->
      <optgroup label="🏢 Fahrschule-Standorte" v-if="standardLocations.length > 0">
        <option v-for="location in standardLocations" :key="`standard-${location.id}`" :value="location.id">
          {{ location.name }} - {{ location.address }}
        </option>
      </optgroup>
      
      <!-- Pickup Locations (Schüler) -->
      <optgroup label="📍 Gespeicherte Treffpunkte" v-if="studentPickupLocations.length > 0 && selectedStudentId">
        <option v-for="location in studentPickupLocations" :key="`pickup-${location.id}`" :value="location.id">
          {{ location.name }} - {{ location.address }}
        </option>
      </optgroup>
      
      <!-- Loading State -->
      <option v-if="isLoadingLocations" disabled>Lade Standorte...</option>
    </select>

    <!-- Google Places Input -->
    <div v-else class="relative">
      <input
        ref="googlePlacesInput"
        v-model="locationSearchQuery"
        @input="onLocationSearch"
        @focus="showLocationSuggestions = true"
        @blur="hideLocationSuggestionsDelayed"
        type="text"
        placeholder="Adresse eingeben... (z.B. Bahnhofstrasse 1, Zürich)"
        class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        autocomplete="off"
      />
      
      <!-- Loading -->
      <div v-if="isLoadingGooglePlaces" class="absolute right-3 top-3">
        <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
      </div>

      <!-- Google Suggestions -->
      <div 
        v-if="showLocationSuggestions && locationSuggestions.length > 0" 
        class="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto"
      >
        <div
          v-for="suggestion in locationSuggestions"
          :key="suggestion.place_id"
          @mousedown="selectLocationSuggestion(suggestion)"
          class="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
        >
          <div class="flex items-start gap-3">
            <span class="text-lg mt-0.5">📍</span>
            <div class="flex-1">
              <div class="font-medium text-gray-900">
                {{ suggestion.structured_formatting?.main_text || suggestion.description }}
              </div>
              <div class="text-sm text-gray-500">
                {{ suggestion.structured_formatting?.secondary_text || '' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No Results -->
      <div 
        v-if="showLocationSuggestions && locationSearchQuery.length > 2 && locationSuggestions.length === 0 && !isLoadingGooglePlaces"
        class="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500"
      >
        <span class="text-2xl block mb-2">🔍</span>
        <p>Keine Ergebnisse für "{{ locationSearchQuery }}"</p>
      </div>
    </div>

    <!-- Selected Custom Location Preview -->
    <div v-if="!useStandardLocations && selectedCustomLocation" class="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
      <div class="flex items-start gap-3">
        <span class="text-green-600 text-lg mt-0.5">✅</span>
        <div class="flex-1">
          <div class="font-medium text-green-800">{{ selectedCustomLocation.name }}</div>
          <div class="text-sm text-green-600">{{ selectedCustomLocation.address }}</div>
          <div class="flex gap-2 mt-2">
            <a :href="getLocationMapsUrl(selectedCustomLocation)" target="_blank" 
               class="text-xs text-blue-600 hover:text-blue-800">
              🗺️ In Google Maps öffnen
            </a>
            <button @click="clearCustomLocation" class="text-xs text-red-600 hover:text-red-800">
              ✕ Entfernen
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Selected Standard/Pickup Location Preview -->
    <div v-if="useStandardLocations && selectedLocationId && currentSelectedLocation" class="mt-2">
      <div class="flex items-center gap-2 text-sm text-gray-600">
        <a :href="getLocationMapsUrl(currentSelectedLocation)" target="_blank" 
           class="text-blue-600 hover:text-blue-800 ml-auto">
          🗺️ Google Maps
        </a>
      </div>
    </div>
    
    <!-- Loading Indicator -->
    <div v-if="isLoadingLocations" class="flex items-center gap-2 mt-2 text-sm text-gray-500">
      <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
      <span>Lade Standorte...</span>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
      ⚠️ {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

// Google Maps Types Declaration
declare global {
  interface Window {
    google: any
  }
  const google: any
}

// Types
interface Location {
  id: string
  name: string
  address: string
  latitude?: number | null
  longitude?: number | null
  place_id?: string
  location_type: 'standard' | 'pickup'
  staff_id?: string | null
  user_id?: string | null
  google_place_id?: string | null
  source?: 'standard' | 'pickup' | 'google'
}

interface GooglePlaceSuggestion {
  place_id: string
  description: string
  structured_formatting?: {
    main_text: string
    secondary_text: string
  }
}

// Props
const props = defineProps({
  modelValue: {
    type: String,
    default: null
  },
  required: {
    type: Boolean,
    default: false
  },
  selectedStudentId: {
    type: String,
    default: null
  },
  selectedStudentName: {
    type: String,
    default: ''
  },
  currentStaffId: {
    type: String,
    default: null
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'locationSelected'])

// Supabase
const supabase = getSupabase()

// Reactive state
const useStandardLocations = ref(true)
const selectedLocationId = ref('')
const locationSearchQuery = ref('')
const showLocationSuggestions = ref(false)
const isLoadingGooglePlaces = ref(false)
const isLoadingLocations = ref(false)
const locationSuggestions = ref<GooglePlaceSuggestion[]>([])
const selectedCustomLocation = ref<Location | null>(null)
const googlePlacesInput = ref<HTMLInputElement | null>(null)
const error = ref<string | null>(null)

// Location Data
const standardLocations = ref<Location[]>([])
const studentPickupLocations = ref<Location[]>([])

// Computed
const currentSelectedLocation = computed(() => {
  if (!selectedLocationId.value) return null
  
  return [...standardLocations.value, ...studentPickupLocations.value]
    .find(loc => loc.id === selectedLocationId.value)
})

// Google Places Service
let placesLibrary: any = null

// === DATABASE FUNCTIONS ===

const loadStandardLocations = async () => {
  try {
    let query = supabase
      .from('locations')
      .select('id, name, address, latitude, longitude, location_type, staff_id')
      .eq('location_type', 'standard')
      .eq('is_active', true)
      .order('name')

    // Filter by current staff if provided
    if (props.currentStaffId) {
      query = query.eq('staff_id', props.currentStaffId)
    }

    const { data, error: fetchError } = await query

    if (fetchError) throw fetchError
    
    standardLocations.value = (data || []).map(item => ({
      ...item,
      address: item.address || '',
      source: 'standard' as const
    }))
    
    console.log('✅ Standard locations loaded:', data?.length)
    
  } catch (err: any) {
    error.value = `Fehler beim Laden der Standard-Standorte: ${err.message}`
    console.error('❌ Error loading standard locations:', err)
  }
}

const loadStudentPickupLocations = async (studentId: string) => {
  if (!studentId) {
    studentPickupLocations.value = []
    return
  }

  try {
    console.log('🔍 Loading student pickup locations for:', studentId)
    
    // 1. Lade alle Pickup-Locations des Schülers
    const { data, error: fetchError } = await supabase
      .from('locations')
      .select('id, name, address, latitude, longitude, location_type, user_id, google_place_id')
      .eq('location_type', 'pickup')
      .eq('user_id', studentId)
      .eq('is_active', true)
      .order('name')

    if (fetchError) throw fetchError
    
    studentPickupLocations.value = (data || []).map(item => ({
      ...item,
      address: item.address || '',
      source: 'pickup' as const
    }))
    
    console.log('✅ Student pickup locations loaded:', data?.length)
    
    // 2. Lade letzten verwendeten Standort nur wenn staffId vorhanden
    if (props.currentStaffId) {
      const lastLocation = await loadLastUsedLocation(studentId, props.currentStaffId)
      
      if (lastLocation && !selectedLocationId.value) {
        // Suche die entsprechende Location in den geladenen Locations
        const matchingLocation = [...standardLocations.value, ...studentPickupLocations.value]
          .find(loc => loc.id === lastLocation.location_id)
        
        if (matchingLocation) {
          selectedLocationId.value = matchingLocation.id
          emit('update:modelValue', matchingLocation.id)
          emit('locationSelected', matchingLocation)
          console.log('🎯 Auto-selected last used location:', matchingLocation.name)
        }
      }
    }
    
    // 3. Fallback: Ersten Pickup-Location wählen falls noch nichts ausgewählt
    if (!selectedLocationId.value && studentPickupLocations.value.length > 0) {
      const firstPickup = studentPickupLocations.value[0]
      selectedLocationId.value = firstPickup.id
      emit('update:modelValue', firstPickup.id)
      emit('locationSelected', firstPickup)
      console.log('📍 Auto-selected first pickup location:', firstPickup.name)
    }
    
  } catch (err: any) {
    error.value = `Fehler beim Laden der Treffpunkte: ${err.message}`
    console.error('❌ Error loading pickup locations:', err)
  }
}

const savePickupLocation = async (locationData: any, studentId: string) => {
  try {
    const locationName = `${props.selectedStudentName} - ${locationData.name}`.trim()
    
    const locationToSave = {
      location_type: 'pickup',
      user_id: studentId,
      staff_id: null,
      name: locationName,
      address: locationData.address,
      latitude: locationData.latitude || null,
      longitude: locationData.longitude || null,
      google_place_id: locationData.place_id || null,
      is_active: true
    }
    
    console.log('📤 Saving pickup location:', locationToSave)
    
    const { data, error: saveError } = await supabase
      .from('locations')
      .insert(locationToSave)
      .select()
      .single()

    if (saveError) {
      console.error('❌ Supabase Error:', saveError)
      throw saveError
    }

    const savedLocation = {
      ...data,
      address: data.address || '',
      source: 'pickup' as const
    }
    
    studentPickupLocations.value.push(savedLocation)
    console.log('✅ Pickup location saved successfully:', savedLocation)
    return savedLocation

  } catch (err: any) {
    console.error('❌ Error saving pickup location:', err)
    error.value = `Fehler beim Speichern des Treffpunkts: ${err.message}`
    throw err
  }
}

// ✅ Korrigierte loadLastUsedLocation Funktion
const loadLastUsedLocation = async (userId: string, staffId: string): Promise<any> => {
  try {
    console.log('🔍 Loading last used location for student:', userId, 'staff:', staffId)
    
    if (!userId || !staffId || staffId === '') {
      console.log('⚠️ Missing or empty staffId, skipping last location load')
      return null
    }
    
    const { data, error } = await supabase
      .from('appointments')
      .select('location_id, custom_location_name, custom_location_address')
      .eq('user_id', userId)
      .eq('staff_id', staffId)
      .eq('status', 'completed')
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (error) {
      console.log('❌ Error loading appointments:', error)
      return null
    }
    
    if (!data) {
      console.log('ℹ️ No completed appointments found')
      return null
    }
    
    console.log('✅ Last used location data:', data)
    return data
    
  } catch (err: any) {
    console.log('❌ Error loading last location:', err)
    return null
  }
}

// === GOOGLE PLACES FUNCTIONS ===

const initializeGooglePlaces = async () => {
  if (typeof window !== 'undefined' && window.google && window.google.maps) {
    try {
      const { Place, AutocompleteSuggestion } = await window.google.maps.importLibrary('places')
      placesLibrary = { Place, AutocompleteSuggestion }
      console.log('✅ Google Places (New API) initialized')
    } catch (error) {
      console.warn('⚠️ New Places API failed, using legacy API:', error)
      if (window.google.maps.places) {
        console.log('✅ Google Places (Legacy) initialized')
      }
    }
  }
}

const onLocationSearch = async () => {
  const query = locationSearchQuery.value.trim()
  
  if (query.length < 3) {
    locationSuggestions.value = []
    showLocationSuggestions.value = false
    return
  }

  isLoadingGooglePlaces.value = true
  error.value = null
  
  try {
    // Try new API first
    if (placesLibrary && placesLibrary.AutocompleteSuggestion) {
      try {
        const request = {
          input: query,
          includedRegionCodes: ['CH'],
          language: 'de'
        }

        const { suggestions } = await placesLibrary.AutocompleteSuggestion.fetchAutocompleteSuggestions(request)
        
        if (suggestions && suggestions.length > 0) {
          locationSuggestions.value = suggestions.map((suggestion: any) => ({
            place_id: suggestion.placePrediction?.placeId || `new_${Date.now()}_${Math.random()}`,
            description: suggestion.placePrediction?.text?.text || 'Unbekannter Ort',
            structured_formatting: {
              main_text: suggestion.placePrediction?.mainText?.text || '',
              secondary_text: suggestion.placePrediction?.secondaryText?.text || ''
            }
          }))
          showLocationSuggestions.value = true
          isLoadingGooglePlaces.value = false
          return
        }
      } catch (newApiError) {
        console.warn('New Places API failed:', newApiError)
      }
    }

    // Fallback to legacy API
    if (window.google && window.google.maps && window.google.maps.places && window.google.maps.places.AutocompleteService) {
      const autocompleteService = new window.google.maps.places.AutocompleteService()
      
      const request = {
        input: query,
        types: ['establishment', 'geocode'],
        componentRestrictions: { country: 'ch' },
        language: 'de'
      }

      autocompleteService.getPlacePredictions(request, (predictions: any, status: any) => {
        isLoadingGooglePlaces.value = false
        
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          locationSuggestions.value = predictions.map((prediction: any) => ({
            place_id: prediction.place_id,
            description: prediction.description,
            structured_formatting: prediction.structured_formatting
          }))
          showLocationSuggestions.value = true
        } else {
          locationSuggestions.value = []
          error.value = 'Keine Vorschläge von Google Places gefunden'
        }
      })
    } else {
      // Final fallback
      locationSuggestions.value = [
        {
          place_id: `fallback_${Date.now()}`,
          description: `${query}, Zürich, Schweiz`,
          structured_formatting: {
            main_text: query,
            secondary_text: 'Zürich, Schweiz'
          }
        }
      ]
      showLocationSuggestions.value = true
      isLoadingGooglePlaces.value = false
    }
  } catch (err: any) {
    console.error('Error searching places:', err)
    error.value = 'Fehler bei der Adresssuche'
    isLoadingGooglePlaces.value = false
    locationSuggestions.value = []
  }
}

const selectLocationSuggestion = async (suggestion: GooglePlaceSuggestion) => {
  try {
    const locationData = {
      name: suggestion.structured_formatting?.main_text || suggestion.description,
      address: suggestion.description,
      place_id: suggestion.place_id,
      latitude: null,
      longitude: null
    }
    
    // Check if this location already exists for this student
    const existingLocation = studentPickupLocations.value.find(
      loc => loc.google_place_id === suggestion.place_id
    )
    
    if (existingLocation) {
      // Use existing pickup location
      selectedLocationId.value = existingLocation.id
      useStandardLocations.value = true
      locationSearchQuery.value = ''
      selectedCustomLocation.value = null
      
      emit('update:modelValue', existingLocation.id)
      emit('locationSelected', existingLocation)
      
      console.log('🔄 Using existing pickup location:', existingLocation.name)
    } else if (props.selectedStudentId) {
      // Save as new pickup location
      const savedLocation = await savePickupLocation(locationData, props.selectedStudentId)
      
      selectedLocationId.value = savedLocation.id
      useStandardLocations.value = true
      locationSearchQuery.value = ''
      selectedCustomLocation.value = null
      
      emit('update:modelValue', savedLocation.id)
      emit('locationSelected', savedLocation)
      
      console.log('💾 Saved and selected new pickup location:', savedLocation.name)
    } else {
      // Kein Student selected - emitte temporäre Location
      const tempLocation: Location = {
        id: `temp_${Date.now()}`,
        name: locationData.name,
        address: locationData.address,
        place_id: locationData.place_id,
        latitude: null,
        longitude: null,
        location_type: 'pickup',
        source: 'google'
      }
      
      selectedCustomLocation.value = tempLocation
      locationSearchQuery.value = suggestion.description
      
      emit('update:modelValue', null)
      emit('locationSelected', tempLocation)
      
      console.log('⚠️ Temporary location (no student selected):', tempLocation)
    }
    
    showLocationSuggestions.value = false
    
  } catch (err: any) {
    error.value = `Fehler beim Speichern des Treffpunkts: ${err.message}`
    console.error('❌ Error selecting location:', err)
  }
}

// === EVENT HANDLERS ===

const onLocationChange = () => {
  const location = [...standardLocations.value, ...studentPickupLocations.value]
    .find(l => l.id === selectedLocationId.value)
    
  if (location) {
    emit('update:modelValue', location.id)
    emit('locationSelected', location)
    console.log('📍 Location selected:', location.name)
  }
}

const clearCustomLocation = () => {
  selectedCustomLocation.value = null
  locationSearchQuery.value = ''
  emit('update:modelValue', null)
  emit('locationSelected', null)
}

const hideLocationSuggestionsDelayed = () => {
  setTimeout(() => {
    showLocationSuggestions.value = false
  }, 150)
}

const getLocationMapsUrl = (location: Location) => {
  if (!location) return '#'
  
  if (location.latitude && location.longitude) {
    return `https://maps.google.com/maps?q=${location.latitude},${location.longitude}`
  } else {
    const query = encodeURIComponent(location.address)
    return `https://maps.google.com/maps?q=${query}`
  }
}

// === WATCHERS ===

watch(() => props.selectedStudentId, async (newStudentId, oldStudentId) => {
  if (newStudentId && newStudentId !== oldStudentId) {
    isLoadingLocations.value = true
    
    // Reset current selection when student changes
    selectedLocationId.value = ''
    selectedCustomLocation.value = null
    emit('update:modelValue', null)
    
    await loadStudentPickupLocations(newStudentId)
    isLoadingLocations.value = false
  } else if (!newStudentId) {
    studentPickupLocations.value = []
    selectedLocationId.value = ''
    selectedCustomLocation.value = null
    emit('update:modelValue', null)
  }
})

watch(() => props.currentStaffId, async (newStaffId) => {
  if (newStaffId) {
    isLoadingLocations.value = true
    await loadStandardLocations()
    isLoadingLocations.value = false
  }
})

watch(() => props.modelValue, (newValue) => {
  if (newValue && newValue !== selectedLocationId.value) {
    selectedLocationId.value = newValue
    useStandardLocations.value = true
    selectedCustomLocation.value = null
  }
})

// === LIFECYCLE ===

onMounted(async () => {
  // Initialize Google Maps
  if (typeof window !== 'undefined' && window.google) {
    await initializeGooglePlaces()
  }
  
  // Load initial data
  isLoadingLocations.value = true
  
  try {
    await loadStandardLocations()
    
    if (props.selectedStudentId) {
      await loadStudentPickupLocations(props.selectedStudentId)
    }
  } catch (err) {
    console.error('Error loading initial location data:', err)
  } finally {
    isLoadingLocations.value = false
  }
})
</script>

<style scoped>
.relative .absolute {
  z-index: 50;
}
</style>```

### ./components/MoveAppointmentModal.vue
```vue
<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg max-w-md w-full shadow-xl">
      <!-- Header -->
      <div class="bg-green-600 text-white p-4 rounded-t-lg">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold flex items-center">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            Termin verschieben
          </h3>
          <button @click="closeModal" class="text-white hover:text-green-200 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-6">
        <!-- Aktueller Termin Info -->
        <div v-if="appointment" class="bg-gray-50 rounded-lg p-4">
          <h4 class="font-semibold text-gray-900 mb-2">Aktueller Termin</h4>
          <div class="space-y-1 text-sm">
            <div class="flex items-center">
              <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
              <span class="font-medium">{{ appointment.title || getStudentName() }}</span>
            </div>
            <div class="flex items-center">
              <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>{{ formatDateTime(appointment.start_time) }}</span>
            </div>
            <div class="flex items-center">
              <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              </svg>
              <span>{{ appointment.extendedProps?.location || 'Standort nicht definiert' }}</span>
            </div>
            <div v-if="appointment.extendedProps?.duration_minutes" class="flex items-center">
              <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>{{ appointment.extendedProps.duration_minutes }} Minuten</span>
            </div>
          </div>
        </div>

        <!-- Neues Datum/Zeit -->
        <div class="space-y-4">
          <h4 class="font-semibold text-gray-900">Neuer Termin</h4>
          
          <!-- Datum -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Neues Datum
            </label>
            <input
              v-model="newDate"
              type="date"
              :min="minDate"
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>

          <!-- Startzeit -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Startzeit
            </label>
            <input
              v-model="newStartTime"
              type="time"
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>

          <!-- Endzeit (automatisch berechnet oder manuell) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Endzeit
            </label>
            <input
              v-model="newEndTime"
              type="time"
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>

          <!-- Vorschau des neuen Termins -->
          <div v-if="isValidTime" class="bg-green-50 border border-green-200 rounded-lg p-3">
            <div class="flex items-center">
              <svg class="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="text-sm text-green-800 font-medium">
                Neuer Termin: {{ formatNewDateTime() }}
              </span>
            </div>
          </div>

          <!-- Fehlermeldung -->
          <div v-if="errorMessage" class="bg-red-50 border border-red-200 rounded-lg p-3">
            <div class="flex items-center">
              <svg class="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="text-sm text-red-800">{{ errorMessage }}</span>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="border-t pt-4">
          <h5 class="text-sm font-medium text-gray-700 mb-2">Schnell verschieben:</h5>
          <div class="flex flex-wrap gap-2">
            <button
              @click="shiftByDays(1)"
              class="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              +1 Tag
            </button>
            <button
              @click="shiftByDays(7)"
              class="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              +1 Woche
            </button>
            <button
              @click="shiftByDays(-1)"
              class="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              -1 Tag
            </button>
            <button
              @click="shiftByHours(1)"
              class="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              +1 Stunde
            </button>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="bg-gray-50 px-6 py-4 rounded-b-lg">
        <div class="flex gap-3">
          <button
            @click="closeModal"
            class="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
          >
            Abbrechen
          </button>
          <button
            @click="moveAppointment"
            :disabled="!isValidTime || isLoading"
            class="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            <svg v-if="isLoading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ isLoading ? 'Wird verschoben...' : 'Verschieben' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { formatDateTime } from '~/utils/dateUtils'

// Props
interface Props {
  isVisible: boolean
  appointment: any
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits(['close', 'moved', 'error'])

// Supabase
const supabase = getSupabase()

// State
const newDate = ref('')
const newStartTime = ref('')
const newEndTime = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

// Computed
const minDate = computed(() => {
  const today = new Date()
  return today.toISOString().split('T')[0]
})

const isValidTime = computed(() => {
  if (!newDate.value || !newStartTime.value || !newEndTime.value) return false
  
  const startDateTime = new Date(`${newDate.value}T${newStartTime.value}`)
  const endDateTime = new Date(`${newDate.value}T${newEndTime.value}`)
  
  return endDateTime > startDateTime
})

// Methods
const closeModal = () => {
  resetForm()
  emit('close')
}

const resetForm = () => {
  newDate.value = ''
  newStartTime.value = ''
  newEndTime.value = ''
  errorMessage.value = ''
  isLoading.value = false
}

const initializeForm = () => {
  if (!props.appointment) return
  
  const startDate = new Date(props.appointment.start)
  const endDate = new Date(props.appointment.end)
  
  newDate.value = startDate.toISOString().split('T')[0]
  newStartTime.value = startDate.toTimeString().slice(0, 5)
  newEndTime.value = endDate.toTimeString().slice(0, 5)
}

const getStudentName = () => {
  const extendedProps = props.appointment?.extendedProps
  return extendedProps?.student || extendedProps?.user_name || 'Unbekannter Schüler'
}

const formatNewDateTime = () => {
  if (!newDate.value || !newStartTime.value) return ''
  
  const dateTime = new Date(`${newDate.value}T${newStartTime.value}`)
  return formatDateTime(dateTime.toISOString())
}

const shiftByDays = (days: number) => {
  if (!newDate.value) return
  
  const currentDate = new Date(newDate.value)
  currentDate.setDate(currentDate.getDate() + days)
  newDate.value = currentDate.toISOString().split('T')[0]
}

const shiftByHours = (hours: number) => {
  if (!newStartTime.value || !newEndTime.value) return
  
  const [startHour, startMin] = newStartTime.value.split(':').map(Number)
  const [endHour, endMin] = newEndTime.value.split(':').map(Number)
  
  const newStartHour = Math.max(0, Math.min(23, startHour + hours))
  const newEndHour = Math.max(0, Math.min(23, endHour + hours))
  
  newStartTime.value = `${newStartHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`
  newEndTime.value = `${newEndHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`
}

const moveAppointment = async () => {
  if (!isValidTime.value || !props.appointment) return
  
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    const newStartDateTime = new Date(`${newDate.value}T${newStartTime.value}`)
    const newEndDateTime = new Date(`${newDate.value}T${newEndTime.value}`)
    
    console.log('🔄 Moving appointment:', props.appointment.id)
    console.log('📅 New times:', newStartDateTime, newEndDateTime)
    
    const { error } = await supabase
      .from('appointments')
      .update({
        start_time: newStartDateTime.toISOString(),
        end_time: newEndDateTime.toISOString()
      })
      .eq('id', props.appointment.id)
    
    if (error) {
      console.error('❌ Error moving appointment:', error)
      throw error
    }
    
    console.log('✅ Appointment moved successfully')
    
    // Emit success
    emit('moved', {
      appointmentId: props.appointment.id,
      newStart: newStartDateTime.toISOString(),
      newEnd: newEndDateTime.toISOString()
    })
    
    closeModal()
    
  } catch (err: any) {
    console.error('❌ Error in moveAppointment:', err)
    errorMessage.value = err.message || 'Fehler beim Verschieben des Termins'
    emit('error', err.message)
  } finally {
    isLoading.value = false
  }
}

// Watchers
watch(() => props.isVisible, (newValue) => {
  if (newValue) {
    initializeForm()
  }
})

watch([newStartTime, () => props.appointment], () => {
  // Auto-calculate end time based on original duration
  if (newStartTime.value && props.appointment) {
    const originalStart = new Date(props.appointment.start)
    const originalEnd = new Date(props.appointment.end)
    const durationMs = originalEnd.getTime() - originalStart.getTime()
    
    const newStart = new Date(`${newDate.value}T${newStartTime.value}`)
    const newEnd = new Date(newStart.getTime() + durationMs)
    
    newEndTime.value = newEnd.toTimeString().slice(0, 5)
  }
})
</script>```

### ./components/PaymentComponent.vue
```vue
<!-- components/PaymentComponent.vue - KORRIGIERTE VERSION -->
<template>
  <div class="payment-section mt-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
    <h4 class="font-semibold text-gray-900 mb-4">💳 Zahlung</h4>
    
    <!-- Preis Anzeige -->
    <div class="mb-4">
      <div class="flex justify-between items-center p-3 bg-white rounded border">
        <span class="text-sm text-gray-600">Lektionspreis:</span>
        <span class="font-semibold">CHF {{ calculatedPrice.lessonPrice.toFixed(2) }}</span>
      </div>
      <div v-if="calculatedPrice.adminFee > 0" class="flex justify-between items-center p-3 bg-yellow-50 rounded border border-yellow-200 mt-2">
        <span class="text-sm text-gray-600">Versicherungspauschale:</span>
        <span class="font-semibold text-yellow-800">CHF {{ calculatedPrice.adminFee.toFixed(2) }}</span>
      </div>
      <div class="flex justify-between items-center p-3 bg-blue-50 rounded border border-blue-200 mt-2">
        <span class="font-semibold text-blue-900">Gesamtpreis:</span>
        <span class="font-bold text-lg text-blue-900">CHF {{ calculatedPrice.total.toFixed(2) }}</span>
      </div>
    </div>

    <!-- Zahlungsstatus -->
    <UFormGroup label="Zahlungsstatus">
      <div class="flex items-center space-x-3">
        <UToggle 
          :model-value="isPaid" 
          @update:model-value="updatePaymentStatus"
          :disabled="paymentProcessing"
        />
        <span :class="isPaid ? 'text-green-600' : 'text-gray-500'">
          {{ isPaid ? '✅ Bezahlt' : '⏳ Ausstehend' }}
        </span>
      </div>
    </UFormGroup>

    <!-- Payment Actions -->
    <div v-if="!isPaid && !readonly" class="mt-4 space-y-3">
      <!-- Wallee Payment Button -->
      <UButton 
        v-if="walleeAvailable && student"
        @click="processWalleePayment"
        :loading="paymentProcessing"
        :disabled="!canProcessPayment || paymentProcessing"
        color="blue"
        size="lg"
        class="w-full"
      >
        <template #leading>
          <Icon name="i-heroicons-credit-card" />
        </template>
        {{ paymentProcessing ? 'Zahlung wird verarbeitet...' : 'Online bezahlen (Wallee)' }}
      </UButton>

      <!-- Manual Payment Options -->
      <div class="grid grid-cols-2 gap-2">
        <UButton 
          @click="markAsPaidCash"
          :disabled="paymentProcessing"
          color="green"
          variant="outline"
        >
          💵 Bar bezahlt
        </UButton>
        <UButton 
          @click="markAsPaidInvoice"
          :disabled="paymentProcessing"
          color="orange"
          variant="outline"
        >
          🧾 Rechnung
        </UButton>
      </div>
    </div>

    <!-- Payment Error Display -->
    <div v-if="paymentError" class="mt-3 p-3 bg-red-50 border border-red-200 rounded">
      <div class="flex justify-between items-start">
        <p class="text-sm text-red-600">❌ {{ paymentError }}</p>
        <UButton 
          @click="clearPaymentError" 
          variant="ghost" 
          size="xs"
          class="text-red-400 hover:text-red-600"
        >
          ✕
        </UButton>
      </div>
    </div>

    <!-- Payment Success Display -->
    <div v-if="paymentSuccess" class="mt-3 p-3 bg-green-50 border border-green-200 rounded">
      <div class="flex justify-between items-start">
        <p class="text-sm text-green-600">✅ {{ paymentSuccess }}</p>
        <UButton 
          @click="clearPaymentSuccess" 
          variant="ghost" 
          size="xs"
          class="text-green-400 hover:text-green-600"
        >
          ✕
        </UButton>
      </div>
    </div>

    <!-- Payment History (if appointment exists) -->
    <div v-if="appointmentId && showHistory" class="mt-4 border-t pt-4">
      <UButton 
        @click="togglePaymentHistory"
        variant="ghost"
        size="sm"
        class="w-full"
      >
        {{ showPaymentHistory ? 'Zahlungshistorie ausblenden' : 'Zahlungshistorie anzeigen' }}
      </UButton>
      
      <div v-if="showPaymentHistory" class="mt-3 space-y-2">
        <div 
          v-for="payment in paymentHistory" 
          :key="payment.id"
          class="p-2 bg-white rounded border text-sm"
        >
          <div class="flex justify-between">
            <span>{{ payment.method }}</span>
            <span>CHF {{ payment.amount }}</span>
          </div>
          <div class="text-xs text-gray-500">
            {{ formatDate(payment.created_at) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useWallee } from '~/composables/useWallee'
import { getSupabase } from '~/utils/supabase'

// Props Interface
interface Props {
  appointmentId?: string
  category: string
  duration: number
  isPaid: boolean
  student?: any
  readonly?: boolean
  showHistory?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  showHistory: false
})

// Emits
const emit = defineEmits<{
  'update:isPaid': [value: boolean]
  'payment-success': [data: any]
  'payment-error': [error: string]
  'save-required': [appointmentData: any]
}>()

// Reactive State
const paymentProcessing = ref(false)
const paymentError = ref<string | null>(null)
const paymentSuccess = ref<string | null>(null)
const showPaymentHistory = ref(false)
const paymentHistory = ref<any[]>([])

// Wallee Composable
const { 
  createAppointmentPayment, 
  calculateAppointmentPrice, 
  isWalleeAvailable 
} = useWallee()

const walleeAvailable = computed(() => isWalleeAvailable())

// Computed
const calculatedPrice = computed(() => {
  if (!props.category || !props.duration) {
    return { lessonPrice: 0, adminFee: 0, total: 0 }
  }

  // TODO: Implement logic to check if this is second appointment
  const isSecondAppointment = false

  const lessonPrice = calculateAppointmentPrice(
    props.category,
    props.duration,
    false
  )

  const adminFee = isSecondAppointment ? calculateAppointmentPrice(
    props.category,
    props.duration,
    true
  ) - lessonPrice : 0

  return {
    lessonPrice,
    adminFee,
    total: lessonPrice + adminFee
  }
})

const canProcessPayment = computed(() => {
  return props.student && props.category && props.duration > 0
})

// Methods
const updatePaymentStatus = (value: boolean) => {
  emit('update:isPaid', value)
  
  if (value && props.appointmentId) {
    updateAppointmentPaymentStatus(props.appointmentId, true)
  }
}

const processWalleePayment = async () => {
  if (!props.student) {
    setPaymentError('Bitte wählen Sie zuerst einen Schüler aus')
    return
  }

  paymentProcessing.value = true
  clearMessages()

  try {
    let appointmentId = props.appointmentId

    // If no appointment ID, request parent to save first
    if (!appointmentId) {
      const appointmentData = {
        category: props.category,
        duration: props.duration,
        total_price: calculatedPrice.value.total
      }
      
      emit('save-required', appointmentData)
      setPaymentError('Bitte speichern Sie zuerst den Termin')
      return
    }

    // Check if this is second appointment
    const isSecondAppointment = await checkIsSecondAppointment(props.student.id)

    // Create Wallee payment
    const result = await createAppointmentPayment(
      {
        id: appointmentId,
        type: props.category,
        duration_minutes: props.duration
      },
      props.student,
      isSecondAppointment
    )

    if (result.success && result.paymentUrl) {
      // Open payment page in new window
      const paymentWindow = window.open(
        result.paymentUrl, 
        '_blank', 
        'width=800,height=600,scrollbars=yes,resizable=yes'
      )
      
      if (!paymentWindow) {
        setPaymentError('Popup wurde blockiert. Bitte erlauben Sie Popups für diese Seite.')
        return
      }

      setPaymentSuccess('Zahlungsseite wurde geöffnet. Bitte schließen Sie die Zahlung ab.')
      
      // Emit success event
      emit('payment-success', {
        transactionId: result.transactionId,
        paymentUrl: result.paymentUrl
      })
      
    } else {
      throw new Error(result.error || 'Unbekannter Fehler bei der Zahlungsverarbeitung')
    }

  } catch (error: any) {
    console.error('Payment Error:', error)
    setPaymentError(error.message || 'Fehler bei der Zahlungsverarbeitung')
    emit('payment-error', error.message)
  } finally {
    paymentProcessing.value = false
  }
}

const markAsPaidCash = async () => {
  emit('update:isPaid', true)
  setPaymentSuccess('Als bar bezahlt markiert')
  
  if (props.appointmentId) {
    await updateAppointmentPaymentStatus(props.appointmentId, true, 'cash')
    await recordPayment('cash')
  }
}

const markAsPaidInvoice = async () => {
  // For invoices, keep isPaid as false until actually paid
  setPaymentSuccess('Rechnung wird erstellt')
  
  if (props.appointmentId) {
    await recordPayment('invoice')
  }
  
  // TODO: Implement invoice generation
  console.log('TODO: Generate invoice for appointment')
}

const checkIsSecondAppointment = async (studentId: string): Promise<boolean> => {
  try {
    const supabase = getSupabase()
    const { count } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', studentId)
      .eq('status', 'completed')

    return (count || 0) >= 1
  } catch (error) {
    console.error('Error checking appointment count:', error)
    return false
  }
}

const updateAppointmentPaymentStatus = async (
  appointmentId: string, 
  isPaid: boolean, 
  method?: string
) => {
  try {
    const supabase = getSupabase()
    const updateData: any = { is_paid: isPaid }
    
    if (method) {
      updateData.payment_method = method
    }

    const { error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId)

    if (error) throw error
  } catch (error) {
    console.error('Error updating payment status:', error)
  }
}

const recordPayment = async (method: string) => {
  if (!props.appointmentId) return

  try {
    const supabase = getSupabase()
    const { error } = await supabase
      .from('payments')
      .insert({
        appointment_id: props.appointmentId,
        amount: calculatedPrice.value.total,
        currency: 'CHF',
        payment_method: method,
        status: 'completed'
      })

    if (error) throw error
  } catch (error) {
    console.error('Error recording payment:', error)
  }
}

const loadPaymentHistory = async () => {
  if (!props.appointmentId) return

  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('appointment_id', props.appointmentId)
      .order('created_at', { ascending: false })

    if (error) throw error
    paymentHistory.value = data || []
  } catch (error) {
    console.error('Error loading payment history:', error)
  }
}

const togglePaymentHistory = () => {
  showPaymentHistory.value = !showPaymentHistory.value
  if (showPaymentHistory.value && paymentHistory.value.length === 0) {
    loadPaymentHistory()
  }
}

// Utility Methods
const setPaymentError = (message: string) => {
  paymentError.value = message
  paymentSuccess.value = null
}

const setPaymentSuccess = (message: string) => {
  paymentSuccess.value = message
  paymentError.value = null
}

const clearMessages = () => {
  paymentError.value = null
  paymentSuccess.value = null
}

const clearPaymentError = () => {
  paymentError.value = null
}

const clearPaymentSuccess = () => {
  paymentSuccess.value = null
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Watch for prop changes
watch(() => props.appointmentId, (newId: string | undefined) => {
  if (newId && props.showHistory) {
    loadPaymentHistory()
  }
})
</script>```

### ./components/PaymentDisplay.vue
```vue
<template>
  <div class="payment-display">
    <!-- Loading State -->
    <div v-if="isCalculating" class="flex items-center justify-center p-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span class="ml-3 text-gray-600">Preis wird berechnet...</span>
    </div>

    <!-- Error State -->
    <UAlert
      v-else-if="error"
      icon="i-heroicons-exclamation-triangle"
      color="red"
      variant="soft"
      :title="error"
      class="mb-4"
    />

    <!-- Payment Display -->
    <div v-else class="space-y-6">
      
      <!-- Header -->
      <div class="text-center">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">
          💰 Zahlung für Fahrstunde
        </h3>
        <p class="text-sm text-gray-500" v-if="appointmentData">
          {{ appointmentData.title || 'Fahrstunde' }} • {{ formatDate(appointmentData.start_time) }}
        </p>
      </div>

      <!-- Price Breakdown -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-calculator" class="w-5 h-5 text-blue-600" />
            <span class="font-semibold">Preisaufstellung</span>
          </div>
        </template>

        <div class="space-y-3">
          <!-- Product Info -->
          <div class="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
            <div>
              <div class="font-medium text-gray-900">
                {{ getProductName() }}
              </div>
              <div class="text-sm text-gray-500">
                Kategorie {{ category }} • {{ duration }}min
                <span v-if="appointmentNumber > 1" class="ml-1">
                  ({{ appointmentNumber }}. Termin)
                </span>
              </div>
            </div>
            <div class="text-right">
              <div class="text-lg font-semibold text-gray-900">
                CHF {{ formatPrice(basePrice) }}
              </div>
              <div class="text-xs text-gray-500">
                CHF {{ formatPrice(pricePerMinute) }}/min
              </div>
            </div>
          </div>

          <!-- Discount (if applicable) -->
          <div 
            v-if="discount.amount > 0" 
            class="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200"
          >
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-tag" class="w-4 h-4 text-green-600" />
              <div>
                <div class="font-medium text-green-800">
                  Rabatt {{ discount.type === 'percentage' ? `(${discount.amount}%)` : '' }}
                </div>
                <div class="text-sm text-green-600" v-if="discount.reason">
                  {{ discount.reason }}
                </div>
              </div>
            </div>
            <div class="text-lg font-semibold text-green-700">
              -CHF {{ formatPrice(discount.calculatedAmount) }}
            </div>
          </div>

          <!-- Admin Fee (if applicable) -->
          <div 
            v-if="adminFee > 0" 
            class="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border border-yellow-200"
          >
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-document-text" class="w-4 h-4 text-yellow-600" />
              <div>
                <div class="font-medium text-yellow-800">
                  Versicherungspauschale
                </div>
                <div class="text-sm text-yellow-600">
                  Ab 2. Fahrstunde (einmalig)
                </div>
              </div>
            </div>
            <div class="text-lg font-semibold text-yellow-700">
              CHF {{ formatPrice(adminFee) }}
            </div>
          </div>

          <!-- Total -->
          <div class="border-t pt-3">
            <div class="flex justify-between items-center">
              <div class="text-xl font-bold text-gray-900">
                Total zu zahlen:
              </div>
              <div class="text-2xl font-bold text-blue-600">
                CHF {{ formatPrice(totalAmount) }}
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Payment Methods -->
      <UCard v-if="showPaymentMethods && !appointmentData?.is_paid">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-credit-card" class="w-5 h-5 text-blue-600" />
            <span class="font-semibold">Zahlungsmethode wählen</span>
          </div>
        </template>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <!-- Online Payment -->
          <UButton
            @click="handlePaymentMethod('wallee')"
            :loading="processingMethod === 'wallee'"
            :disabled="isProcessingPayment"
            color="blue"
            variant="solid"
            size="lg"
            class="h-20 flex-col justify-center"
          >
            <UIcon name="i-heroicons-credit-card" class="w-6 h-6 mb-1" />
            <span class="text-sm font-medium">Online bezahlen</span>
            <span class="text-xs opacity-75">Karte, Twint, etc.</span>
          </UButton>

          <!-- Cash Payment -->
          <UButton
            @click="handlePaymentMethod('cash')"
            :loading="processingMethod === 'cash'"
            :disabled="isProcessingPayment"
            color="yellow"
            variant="solid"
            size="lg"
            class="h-20 flex-col justify-center"
          >
            <UIcon name="i-heroicons-banknotes" class="w-6 h-6 mb-1" />
            <span class="text-sm font-medium">Bar bezahlen</span>
            <span class="text-xs opacity-75">Beim Fahrlehrer</span>
          </UButton>

          <!-- Invoice -->
          <UButton
            @click="handlePaymentMethod('invoice')"
            :loading="processingMethod === 'invoice'"
            :disabled="isProcessingPayment"
            color="gray"
            variant="solid"
            size="lg"
            class="h-20 flex-col justify-center"
          >
            <UIcon name="i-heroicons-document" class="w-6 h-6 mb-1" />
            <span class="text-sm font-medium">Rechnung</span>
            <span class="text-xs opacity-75">Firmenrechnung</span>
          </UButton>
        </div>
      </UCard>

      <!-- Already Paid Status -->
      <UAlert
        v-if="appointmentData?.is_paid"
        icon="i-heroicons-check-circle"
        color="green"
        variant="soft"
        title="Bereits bezahlt"
        description="Diese Fahrstunde wurde bereits bezahlt."
      />

      <!-- Payment Status -->
      <UAlert
        v-if="paymentStatus"
        :icon="paymentStatus.type === 'success' ? 'i-heroicons-check-circle' : 'i-heroicons-exclamation-triangle'"
        :color="paymentStatus.type === 'success' ? 'green' : 'red'"
        variant="soft"
        :title="paymentStatus.title"
        :description="paymentStatus.message"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { usePayments } from '~/composables/usePayments'
import { useWallee } from '~/composables/useWallee'
import { useCategoryData } from '~/composables/useCategoryData'
import { formatDate } from '~/utils/dateUtils'

// Props
interface Props {
  appointmentData?: any
  category: string
  duration: number
  userId?: string
  staffId?: string
  appointmentNumber?: number
  showPaymentMethods?: boolean
  discount?: {
    amount: number
    type: 'fixed' | 'percentage'
    reason?: string
  }
}

const props = withDefaults(defineProps<Props>(), {
  duration: 45,
  appointmentNumber: 1,
  showPaymentMethods: true,
  discount: () => ({ amount: 0, type: 'fixed', reason: '' })
})

// Emits
const emit = defineEmits<{
  'payment-success': [data: any]
  'payment-error': [error: string]
  'payment-started': [method: string]
}>()

// Composables
const { 
  calculatePrice, 
  processCashPayment, 
  processInvoicePayment,
  isLoadingPrice,
  isProcessing,
  priceError,
  clearErrors
} = usePayments()

const { createAppointmentPayment } = useWallee()

const { 
  getCategoryName, 
  getCategoryByCode,
  getAdminFee 
} = useCategoryData()

// State - verwende Composable States
const calculatedPriceData = ref<any>(null)
const paymentStatus = ref<any>(null)
const processingMethod = ref<string | null>(null)

// Computed für Preise (direkt aus usePayments)
const isCalculating = computed(() => isLoadingPrice.value)
const error = computed(() => priceError.value)
const isProcessingPayment = computed(() => isProcessing.value)

// Price refs basierend auf calculatedPriceData
const basePrice = computed(() => 
  calculatedPriceData.value ? calculatedPriceData.value.base_price_rappen / 100 : 0
)

const adminFee = computed(() => 
  calculatedPriceData.value ? calculatedPriceData.value.admin_fee_rappen / 100 : 0
)

const pricePerMinute = computed(() => 
  basePrice.value / (props.duration || 45)
)

const totalAmount = computed(() => {
  let total = basePrice.value
  
  // Apply discount
  if (props.discount.amount > 0) {
    if (props.discount.type === 'percentage') {
      total -= (total * props.discount.amount / 100)
    } else {
      total -= props.discount.amount
    }
  }
  
  // Add admin fee
  total += adminFee.value
  
  return Math.max(0, total)
})

const discount = computed(() => {
  if (props.discount.amount <= 0) return { amount: 0, calculatedAmount: 0, type: 'fixed', reason: '' }
  
  let calculatedAmount = 0
  if (props.discount.type === 'percentage') {
    calculatedAmount = basePrice.value * props.discount.amount / 100
  } else {
    calculatedAmount = props.discount.amount
  }
  
  return {
    ...props.discount,
    calculatedAmount
  }
})

// Methods
const calculatePrices = async () => {
  if (!props.category) return
  
  clearErrors()
  
  try {
    const result = await calculatePrice(
      props.category,
      props.duration,
      props.userId
    )
    
    calculatedPriceData.value = result
    
  } catch (err: any) {
    console.error('Error calculating prices:', err)
    
    // Fallback calculation wenn usePayments nicht verfügbar
    const categoryPricing: Record<string, number> = {
      'B': 95, 'A1': 95, 'BE': 120, 'C': 170, 'CE': 200, 'D': 200, 'BPT': 100
    }
    
    const fallbackBasePrice = (categoryPricing[props.category] || 95) * (props.duration / 45)
    const fallbackAdminFee = props.appointmentNumber > 1 ? getAdminFee(props.category) : 0
    
    calculatedPriceData.value = {
      base_price_rappen: Math.round(fallbackBasePrice * 100),
      admin_fee_rappen: Math.round(fallbackAdminFee * 100),
      total_rappen: Math.round((fallbackBasePrice + fallbackAdminFee) * 100),
      category_code: props.category,
      duration_minutes: props.duration
    }
  }
}

const handlePaymentMethod = async (method: string) => {
  if (isProcessingPayment.value || !props.userId || !props.staffId) return
  
  processingMethod.value = method
  paymentStatus.value = null
  
  emit('payment-started', method)
  
  try {
    let result: any
    
    switch (method) {
      case 'wallee':
        if (!props.appointmentData?.id) {
          throw new Error('Appointment ID fehlt für Online-Zahlung')
        }
        
        result = await createAppointmentPayment(
          props.appointmentData,
          { 
            id: props.userId, 
            email: props.appointmentData?.users?.email || props.appointmentData?.user_email 
          },
          props.appointmentNumber > 1
        )
        
        if (result.success && result.paymentUrl) {
          window.location.href = result.paymentUrl
        } else {
          throw new Error(result.error || 'Online-Zahlung fehlgeschlagen')
        }
        break
        
      case 'cash':
        result = await processCashPayment(
          props.appointmentData?.id || 'temp_cash_payment',
          props.userId,
          props.staffId,
          calculatedPriceData.value
        )
        
        paymentStatus.value = {
          type: 'success',
          title: 'Barzahlung erfasst',
          message: 'Die Barzahlung wurde erfolgreich im System erfasst.'
        }
        
        emit('payment-success', result)
        break
        
      case 'invoice':
        const invoiceData = {
          company: props.appointmentData?.users?.company_name || '',
          address: `${props.appointmentData?.users?.street || ''} ${props.appointmentData?.users?.street_nr || ''}`.trim(),
          city: `${props.appointmentData?.users?.zip || ''} ${props.appointmentData?.users?.city || ''}`.trim()
        }
        
        result = await processInvoicePayment(
          props.appointmentData?.id || 'temp_invoice_payment',
          props.userId,
          props.staffId,
          calculatedPriceData.value,
          invoiceData
        )
        
        paymentStatus.value = {
          type: 'success',
          title: 'Rechnung erstellt',
          message: 'Die Rechnung wurde erstellt und wird per E-Mail versendet.'
        }
        
        emit('payment-success', result)
        break
    }
    
  } catch (err: any) {
    console.error('Payment error:', err)
    
    paymentStatus.value = {
      type: 'error',
      title: 'Zahlung fehlgeschlagen',
      message: err.message || 'Ein unbekannter Fehler ist aufgetreten.'
    }
    
    emit('payment-error', err.message)
  } finally {
    processingMethod.value = null
  }
}

const getProductName = () => {
  return `Fahrstunde ${getCategoryName(props.category)}`
}

const formatPrice = (amount: number) => {
  return amount.toFixed(2)
}

// Watchers
watch([() => props.category, () => props.duration, () => props.userId], calculatePrices, { immediate: true })

// Lifecycle
onMounted(() => {
  if (props.category) {
    calculatePrices()
  }
})
</script>```

### ./components/PaymentModal.vue
```vue
<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg max-w-2xl w-full max-h-[95vh] overflow-hidden shadow-xl">
      
      <!-- Header -->
      <div class="bg-green-600 text-white p-6 rounded-t-lg">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <svg class="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
            <h3 class="text-xl font-semibold">Zahlung für Fahrlektion</h3>
          </div>
          <button @click="closeModal" class="text-white hover:text-green-200 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="overflow-y-auto max-h-[calc(95vh-140px)]">
        
        <!-- Termin Details -->
        <div v-if="appointment" class="p-6 border-b bg-gray-50">
          <h4 class="font-semibold text-gray-900 mb-4 flex items-center">
            <svg class="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            Termindetails
          </h4>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-gray-600">Schüler:</span>
                <span class="font-medium">{{ getStudentName() }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Datum & Zeit:</span>
                <span class="font-medium">{{ formatDateTime(appointment.start_time) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Dauer:</span>
                <span class="font-medium">{{ appointment.duration_minutes }} Minuten</span>
              </div>
            </div>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-gray-600">Kategorie:</span>
                <span class="font-medium">{{ appointment.extendedProps?.category || 'B' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Standort:</span>
                <span class="font-medium">{{ appointment.extendedProps?.location || 'Nicht definiert' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Status:</span>
                <span class="font-medium capitalize">{{ appointment.extendedProps?.status || 'Geplant' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Preisberechnung -->
        <div class="p-6 border-b">
          <h4 class="font-semibold text-gray-900 mb-4 flex items-center">
            <svg class="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
            </svg>
            Preisberechnung
          </h4>

          <div v-if="isLoadingPrice" class="flex items-center justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <span class="ml-2 text-gray-600">Preis wird berechnet...</span>
          </div>

          <div v-else-if="priceError" class="bg-red-50 border border-red-200 rounded-lg p-4">
            <div class="flex items-center">
              <svg class="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="text-red-800 text-sm">{{ priceError }}</span>
            </div>
          </div>

          <div v-else-if="calculatedPrice" class="space-y-3">
            <div class="bg-white border rounded-lg p-4">
              <div class="space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="text-gray-600">Grundpreis ({{ appointment?.duration_minutes || 45 }} Min):</span>
                  <span class="font-medium">CHF {{ calculatedPrice.base_price_chf }}</span>
                </div>
                
                <div v-if="Number(calculatedPrice.admin_fee_chf) > 0" class="flex justify-between text-sm">
                  <span class="text-gray-600">Administrationspauschale:</span>
                  <span class="font-medium">CHF {{ calculatedPrice.admin_fee_chf }}</span>
                </div>
                
                <div v-if="Number(calculatedPrice.admin_fee_chf) === 0" class="flex justify-between text-sm text-green-600">
                  <span>Administrationspauschale:</span>
                  <span class="font-medium">Kostenlos (1. Termin)</span>
                </div>
                
                <hr class="my-2">
                
                <div class="flex justify-between text-lg font-semibold">
                  <span>Gesamtbetrag:</span>
                  <span class="text-green-600">CHF {{ calculatedPrice.total_chf }}</span>
                </div>
              </div>
            </div>

            <!-- Appointment Counter Info -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div class="flex items-start">
                <svg class="w-4 h-4 text-blue-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div class="text-xs text-blue-800">
                  <p><strong>Termin {{ appointmentCount }} für diesen Schüler</strong></p>
                  <p v-if="appointmentCount === 1">Die Administrationspauschale entfällt beim ersten Termin.</p>
                  <p v-else>Administrationspauschale wird ab dem 2. Termin berechnet.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Zahlungsmethoden -->
        <div class="p-6">
          <h4 class="font-semibold text-gray-900 mb-4 flex items-center">
            <svg class="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
            </svg>
            Zahlungsart wählen
          </h4>

          <div v-if="isLoadingMethods" class="flex items-center justify-center py-8">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
            <span class="ml-2 text-gray-600">Zahlungsmethoden werden geladen...</span>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="method in availablePaymentMethods"
              :key="method.method_code"
              @click="selectPaymentMethod(method.method_code)"
              class="border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md"
              :class="{
                'border-green-500 bg-green-50': selectedPaymentMethod === method.method_code,
                'border-gray-200 hover:border-gray-300': selectedPaymentMethod !== method.method_code
              }"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center mr-3"
                       :class="getMethodIconClass(method.method_code)">
                    <component :is="getMethodIcon(method.method_code)" class="w-5 h-5" />
                  </div>
                  <div>
                    <div class="font-medium text-gray-900">{{ method.display_name }}</div>
                    <div class="text-sm text-gray-600">{{ method.description }}</div>
                  </div>
                </div>
                <div class="flex items-center">
                  <div
                    class="w-4 h-4 rounded-full border-2"
                    :class="{
                      'border-green-500 bg-green-500': selectedPaymentMethod === method.method_code,
                      'border-gray-300': selectedPaymentMethod !== method.method_code
                    }"
                  >
                    <div v-if="selectedPaymentMethod === method.method_code" 
                         class="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                  </div>
                </div>
              </div>

              <!-- Method-specific info -->
              <div v-if="method.method_code === 'invoice'" class="mt-3 text-xs text-gray-600">
                <p>💼 Nur für Firmenkunden verfügbar</p>
              </div>
              <div v-if="method.method_code === 'cash'" class="mt-3 text-xs text-gray-600">
                <p>💵 Zahlung direkt beim Fahrlehrer</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Firmenrechnung Details (falls ausgewählt) -->
        <div v-if="selectedPaymentMethod === 'invoice'" class="px-6 pb-6">
          <div class="border-t pt-4">
            <h5 class="font-medium text-gray-900 mb-3">Rechnungsdetails</h5>
            <div class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Firmenname</label>
                <input
                  v-model="invoiceData.companyName"
                  type="text"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Firma AG"
                  required
                />
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Kontaktperson</label>
                  <input
                    v-model="invoiceData.contactPerson"
                    type="text"
                    class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Max Muster"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                  <input
                    v-model="invoiceData.email"
                    type="email"
                    class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="rechnung@firma.ch"
                  />
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Rechnungsadresse</label>
                <textarea
                  v-model="invoiceData.address"
                  rows="3"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Musterstrasse 123&#10;8000 Zürich&#10;Schweiz"
                  required
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        <!-- Wallee Payment Integration -->
        <div v-if="selectedPaymentMethod === 'wallee'" class="px-6 pb-6">
          <div class="border-t pt-4">
            <h5 class="font-medium text-gray-900 mb-3">Online Zahlung</h5>
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div class="flex items-center">
                <svg class="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
                <div class="text-sm text-blue-800">
                  <p><strong>Sichere Online-Zahlung</strong></p>
                  <p>Sie werden zu unserem sicheren Zahlungspartner weitergeleitet.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="bg-gray-50 px-6 py-4 rounded-b-lg border-t">
        <div class="flex justify-between items-center">
          <div class="text-sm text-gray-600">
            Gesamtbetrag: <span class="font-semibold text-lg text-green-600">
              CHF {{ calculatedPrice?.total_chf || '0.00' }}
            </span>
          </div>
          <div class="flex gap-3">
            <button
              @click="closeModal"
              class="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Abbrechen
            </button>
            <button
              @click="processPayment"
              :disabled="!selectedPaymentMethod || isProcessing || !isFormValid"
              class="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              <svg v-if="isProcessing" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isProcessing ? 'Wird verarbeitet...' : getPaymentButtonText() }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { formatDateTime } from '~/utils/dateUtils'

// Props
interface Props {
  isVisible: boolean
  appointment: any
  currentUser?: any
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits(['close', 'payment-completed', 'payment-failed'])

// Interfaces
interface PaymentMethod {
  method_code: string
  display_name: string
  description: string
  icon_name: string
  is_active: boolean
  is_online: boolean
  display_order: number
}

interface CalculatedPrice {
  base_price_rappen: number
  admin_fee_rappen: number
  total_rappen: number
  base_price_chf: string
  admin_fee_chf: string
  total_chf: string
  category_code: string
  duration_minutes: number
}

interface PaymentMetadata {
  appointment_count: number
  category: string
  student_name?: string
  invoice_data?: Record<string, unknown>
  [key: string]: unknown
}

interface InvoiceData {
  companyName: string
  contactPerson: string
  email: string
  address: string
}

// Supabase
const supabase = getSupabase()

// State
const selectedPaymentMethod = ref<string>('')
const availablePaymentMethods = ref<PaymentMethod[]>([
  {
    method_code: 'wallee',
    display_name: 'Online Zahlung',
    description: 'Kreditkarte, Twint, etc.',
    icon_name: 'credit-card',
    is_active: true,
    is_online: true,
    display_order: 1
  },
  {
    method_code: 'cash',
    display_name: 'Bar',
    description: 'Zahlung beim Fahrlehrer',
    icon_name: 'cash',
    is_active: true,
    is_online: false,
    display_order: 2
  },
  {
    method_code: 'invoice',
    display_name: 'Rechnung',
    description: 'Firmenrechnung',
    icon_name: 'document',
    is_active: true,
    is_online: false,
    display_order: 3
  }
])

const showPaymentModal = ref(false)
const selectedAppointment = ref(null)

const openPaymentModal = (appointment: any) => {
  selectedAppointment.value = appointment
  showPaymentModal.value = true
}

const handlePaymentCompleted = (result: any) => {
  console.log('Payment completed:', result)
  // Refresh calendar or appointment list
}

const isLoadingMethods = ref(false)
const isLoadingPrice = ref(false)
const isProcessing = ref(false)
const calculatedPrice = ref<CalculatedPrice | null>(null)
const priceError = ref<string>('')
const appointmentCount = ref(1)

// Invoice data
const invoiceData = ref<InvoiceData>({
  companyName: '',
  contactPerson: '',
  email: '',
  address: ''
})

// Computed
const getStudentName = () => {
  const extendedProps = props.appointment?.extendedProps
  return extendedProps?.student || extendedProps?.user_name || 'Unbekannter Schüler'
}

const getPaymentButtonText = () => {
  switch (selectedPaymentMethod.value) {
    case 'wallee': return 'Online bezahlen'
    case 'twint': return 'Mit Twint bezahlen'
    case 'stripe_card': return 'Mit Karte bezahlen'
    case 'debit_card': return 'Mit Debitkarte bezahlen'
    case 'cash': return 'Bar bezahlen'
    case 'invoice': return 'Rechnung erstellen'
    default: return 'Bezahlen'
  }
}

const isFormValid = computed(() => {
  if (selectedPaymentMethod.value === 'invoice') {
    return invoiceData.value.companyName && 
           invoiceData.value.address && 
           invoiceData.value.email
  }
  return true
})

// Methods
const closeModal = () => {
  resetForm()
  emit('close')
}

const resetForm = () => {
  selectedPaymentMethod.value = ''
  calculatedPrice.value = null
  priceError.value = ''
  invoiceData.value = {
    companyName: '',
    contactPerson: '',
    email: '',
    address: ''
  }
}

const loadPaymentMethods = async () => {
  // Mock data for now - in production load from database
  isLoadingMethods.value = true
  
  setTimeout(() => {
    isLoadingMethods.value = false
  }, 500)
}

const loadAppointmentCount = async () => {
  if (!props.appointment?.extendedProps?.user_id) return

  try {
    const { count, error } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', props.appointment.extendedProps.user_id)
      .in('status', ['completed', 'confirmed'])

    if (error) throw error
    appointmentCount.value = (count || 0) + 1
  } catch (err: any) {
    console.error('❌ Error loading appointment count:', err)
    appointmentCount.value = 1
  }
}

const calculatePrice = async () => {
  if (!props.appointment) return

  isLoadingPrice.value = true
  priceError.value = ''

  try {
    const category = props.appointment.extendedProps?.category || 'B'
    const duration = props.appointment.duration_minutes || 45

    console.log('💰 Calculating price for:', { category, duration, appointmentCount: appointmentCount.value })

    // Mock price calculation - replace with actual Supabase RPC call
    const mockPrice = {
      base_price_rappen: 9500,
      admin_fee_rappen: appointmentCount.value === 1 ? 0 : 12000,
      total_rappen: appointmentCount.value === 1 ? 9500 : 21500,
      base_price_chf: '95.00',
      admin_fee_chf: appointmentCount.value === 1 ? '0.00' : '120.00',
      total_chf: appointmentCount.value === 1 ? '95.00' : '215.00',
      category_code: category,
      duration_minutes: duration
    }

    calculatedPrice.value = mockPrice
    console.log('✅ Price calculated:', mockPrice)

  } catch (err: any) {
    console.error('❌ Error calculating price:', err)
    priceError.value = err.message || 'Fehler bei der Preisberechnung'
  } finally {
    isLoadingPrice.value = false
  }
}

const selectPaymentMethod = (methodCode: string) => {
  selectedPaymentMethod.value = methodCode
}

const getMethodIcon = (methodCode: string) => {
  // Return SVG icon component or simple div
  return 'div'
}

const getMethodIconClass = (methodCode: string) => {
  const classes: Record<string, string> = {
    wallee: 'bg-blue-100 text-blue-600',
    twint: 'bg-blue-100 text-blue-600',
    stripe_card: 'bg-purple-100 text-purple-600',
    debit_card: 'bg-green-100 text-green-600',
    cash: 'bg-yellow-100 text-yellow-600',
    invoice: 'bg-gray-100 text-gray-600'
  }
  return classes[methodCode] || 'bg-gray-100 text-gray-600'
}

const processPayment = async () => {
  if (!selectedPaymentMethod.value || !calculatedPrice.value) return

  isProcessing.value = true

  try {
    console.log('💳 Processing payment:', {
      method: selectedPaymentMethod.value,
      amount: calculatedPrice.value.total_rappen,
      appointment: props.appointment.id
    })

    // Handle different payment methods
    switch (selectedPaymentMethod.value) {
      case 'wallee':
        await handleWalleePayment()
        break
      case 'cash':
        await handleCashPayment()
        break
      case 'invoice':
        await handleInvoicePayment()
        break
      default:
        throw new Error('Unbekannte Zahlungsmethode')
    }

  } catch (err: any) {
    console.error('❌ Payment processing error:', err)
    emit('payment-failed', err.message)
  } finally {
    isProcessing.value = false
  }
}

interface WalleeResponse {
  success: boolean
  paymentUrl: string
  transactionId: string
  transaction: any
}

const handleWalleePayment = async () => {
  try {
    console.log('🔄 Creating Wallee payment...')
    
    const paymentData = {
      appointmentId: props.appointment.id,
      amount: Number(calculatedPrice.value?.total_chf || 0),
      currency: 'CHF',
      customerId: props.appointment.extendedProps?.user_id || 'guest',
      customerEmail: props.currentUser?.email || 'test@example.com',
      successUrl: `${window.location.origin}/payment/success`,
      failedUrl: `${window.location.origin}/payment/failed`
    }

    const response = await $fetch<WalleeResponse>('/api/wallee/create-transaction', {
      method: 'POST',
      body: paymentData
    })

    console.log('✅ Wallee payment created:', response)

    if (response.success && response.paymentUrl) {
      // Redirect to Wallee payment page
      window.location.href = response.paymentUrl
    } else {
      throw new Error('Fehler beim Erstellen der Zahlung')
    }

  } catch (err: any) {
    console.error('❌ Wallee payment error:', err)
    throw new Error(`Wallee Fehler: ${err.message}`)
  }
}

const handleCashPayment = async () => {
  // Create payment record for cash payment
  const paymentData = {
    appointment_id: props.appointment.id,
    user_id: props.appointment.extendedProps?.user_id,
    staff_id: props.appointment.extendedProps?.staff_id || props.currentUser?.id,
    amount_rappen: calculatedPrice.value?.base_price_rappen,
    admin_fee_rappen: calculatedPrice.value?.admin_fee_rappen,
    total_amount_rappen: calculatedPrice.value?.total_rappen,
    payment_method: 'cash',
    payment_status: 'pending',
    description: `Fahrlektion ${calculatedPrice.value?.category_code} - ${calculatedPrice.value?.duration_minutes} Min`,
    metadata: {
      appointment_count: appointmentCount.value,
      category: calculatedPrice.value?.category_code
    } as PaymentMetadata
  }

  const { data: payment, error } = await supabase
    .from('payments')
    .insert(paymentData)
    .select()
    .single()

  if (error) throw error

  emit('payment-completed', { payment, method: 'cash' })
  closeModal()
}

const handleInvoicePayment = async () => {
  const paymentData = {
    appointment_id: props.appointment.id,
    user_id: props.appointment.extendedProps?.user_id,
    staff_id: props.appointment.extendedProps?.staff_id || props.currentUser?.id,
    amount_rappen: calculatedPrice.value?.base_price_rappen,
    admin_fee_rappen: calculatedPrice.value?.admin_fee_rappen,
    total_amount_rappen: calculatedPrice.value?.total_rappen,
    payment_method: 'invoice',
    payment_status: 'pending',
    description: `Fahrlektion ${calculatedPrice.value?.category_code} - ${calculatedPrice.value?.duration_minutes} Min`,
    metadata: {
      appointment_count: appointmentCount.value,
      category: calculatedPrice.value?.category_code,
      invoice_data: invoiceData.value
    } as PaymentMetadata
  }

  const { data: payment, error } = await supabase
    .from('payments')
    .insert(paymentData)
    .select()
    .single()

  if (error) throw error

  emit('payment-completed', { payment, method: 'invoice' })
  closeModal()
}

// Watchers
watch(() => props.isVisible, (newValue) => {
  if (newValue) {
    loadPaymentMethods()
    loadAppointmentCount()
    calculatePrice()
  }
})

// Lifecycle
onMounted(() => {
  if (props.isVisible) {
    loadPaymentMethods()
    loadAppointmentCount()
    calculatePrice()
  }
})
</script>

<style scoped>
/* Additional styles if needed */
.payment-method-card {
  transition: all 0.2s ease-in-out;
}

.payment-method-card:hover {
  transform: translateY(-1px);
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Custom scrollbar for modal content */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>```

### ./components/PendenzenModal.vue
```vue
<!-- components/PendenzenModal.vue -->
<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
    <!-- MODAL CONTAINER -->
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

        <!-- Smart Stats mit Farbkodierung -->
        <div class="mt-4 flex gap-4 items-center text-sm">
          <span class="text-green-200">
            <span class="inline-block w-2 h-2 bg-green-300 rounded-full mr-1"></span>
            Offen: {{ getOpenCount() }}
          </span>
          <span class="text-orange-200">
            <span class="inline-block w-2 h-2 bg-orange-300 rounded-full mr-1"></span>
            Fällig: {{ getDueCount() }}
          </span>
          <span class="text-red-200">
            <span class="inline-block w-2 h-2 bg-red-300 rounded-full mr-1"></span>
            Überfällig: {{ getOverdueCount() }}
          </span>
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
              @click="refreshData" 
              class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Erneut versuchen
            </button>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="pendingCount === 0" class="flex items-center justify-center py-8">
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
            v-for="appointment in formattedAppointments"
            :key="appointment.id"
            :class="[
              'rounded-lg border p-4 hover:shadow-md transition-all cursor-pointer',
              getAppointmentBackgroundClass(appointment)
            ]"
            @click="openEvaluation(appointment)"
          >
            <!-- Vereinfachtes Layout -->
            <div class="flex items-center justify-between">
              <!-- Links: Name & Kategorie -->
              <div class="flex-1">
                <h3 class="font-semibold text-gray-900">
                  {{ appointment.studentName }}
                </h3>
                <p class="text-sm text-gray-600">
                  {{ appointment.title }}
                </p>
              </div>
              
              <!-- Rechts: Status & Datum -->
              <div class="text-right">
                <!-- Status Badge -->
                <span :class="[
                  'text-xs px-2 py-1 rounded-full font-medium block mb-1',
                  getPriorityClass(appointment)
                ]">
                  {{ getPriorityText(appointment) }}
                </span>
                
                <!-- Datum & Zeit -->
                <p class="text-xs text-gray-500">
                  {{ appointment.formattedDate }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ appointment.formattedStartTime }} - {{ appointment.formattedEndTime }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

    <!-- Evaluation Modal (außerhalb des Hauptmodals) -->
    <EvaluationModal
      v-if="showEvaluationModal"
      :is-open="showEvaluationModal"
      :appointment="selectedAppointment"
      :student-category="selectedAppointment?.users?.category || 'B'"
      :current-user="currentUser"
      @close="closeEvaluationModal"
      @saved="onEvaluationSaved"
    />
  </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { usePendingTasks } from '~/composables/usePendingTasks'
import EvaluationModal from '~/components/EvaluationModal.vue'

// Props
interface Props {
  isOpen: boolean
  currentUser: any
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  close: []
  'evaluate-lesson': [appointment: any]
}>()

// WICHTIG: Verwende das zentrale usePendingTasks Composable
const {
  pendingAppointments,
  formattedAppointments,
  pendingCount,
  isLoading,
  error,
  fetchPendingTasks,
  clearError
} = usePendingTasks()

// Modal state
const showEvaluationModal = ref(false)
const selectedAppointment = ref<any>(null)


// Methods
const closeModal = () => {
  console.log('🔥 PendenzenModal closing...')
  emit('close')
}

const openEvaluation = (appointment: any) => {
  console.log('🔥 PendenzenModal - opening evaluation for:', appointment.id)
  selectedAppointment.value = appointment
  showEvaluationModal.value = true
}

const closeEvaluationModal = () => {
  console.log('🔥 PendenzenModal - closing evaluation modal')
  showEvaluationModal.value = false
  selectedAppointment.value = null
}

const onEvaluationSaved = async (appointmentId: string) => {
  console.log('🎉 PendenzenModal - evaluation saved for:', appointmentId)
  
  // Das Composable wird automatisch aktualisiert durch markAsCompleted
  console.log('✅ New pending count after evaluation:', pendingCount.value)
  
  closeEvaluationModal()
}

const refreshData = async () => {
  if (!props.currentUser?.id) {
    console.warn('⚠️ No current user ID available for refresh')
    return
  }
  
  console.log('🔄 PendenzenModal - refreshing data...')
  clearError()
  await fetchPendingTasks(props.currentUser.id)
  console.log('✅ PendenzenModal - data refreshed, count:', pendingCount.value)
}

// Smart Count Funktionen
const getOpenCount = () => {
  const today = new Date().toDateString()
  return pendingAppointments.value.filter(apt => 
    new Date(apt.start_time).toDateString() === today
  ).length
}

const getDueCount = () => {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayString = yesterday.toDateString()
  
  return pendingAppointments.value.filter(apt => 
    new Date(apt.start_time).toDateString() === yesterdayString
  ).length
}

const getOverdueCount = () => {
  const dayBeforeYesterday = new Date()
  dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2)
  
  return pendingAppointments.value.filter(apt => 
    new Date(apt.start_time) <= dayBeforeYesterday
  ).length
}

// Background-Klassen für Termine
const getAppointmentBackgroundClass = (appointment: any) => {
  const appointmentDate = new Date(appointment.start_time).toDateString()
  const today = new Date().toDateString()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayString = yesterday.toDateString()
  
  if (appointmentDate === today) {
    return 'bg-green-50 border-green-200 hover:bg-green-100'
  } else if (appointmentDate === yesterdayString) {
    return 'bg-orange-50 border-orange-200 hover:bg-orange-100'
  } else {
    return 'bg-red-50 border-red-200 hover:bg-red-100'
  }
}

const getPriorityClass = (appointment: any) => {
  const appointmentDate = new Date(appointment.start_time).toDateString()
  const today = new Date().toDateString()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayString = yesterday.toDateString()
  
  if (appointmentDate === today) {
    return 'bg-green-100 text-green-800'
  } else if (appointmentDate === yesterdayString) {
    return 'bg-orange-100 text-orange-800'
  } else {
    return 'bg-red-100 text-red-800'
  }
}

const getPriorityText = (appointment: any) => {
  const appointmentDate = new Date(appointment.start_time).toDateString()
  const today = new Date().toDateString()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayString = yesterday.toDateString()
  
  if (appointmentDate === today) {
    return 'Offen'
  } else if (appointmentDate === yesterdayString) {
    return 'Fällig'
  } else {
    return 'Überfällig'
  }
}

// Watch für Modal-Öffnung
watch(() => props.isOpen, async (newIsOpen) => {
  console.log('🔥 PendenzenModal isOpen changed:', newIsOpen)
  console.log('🔥 Current user in modal:', props.currentUser)
  
  if (newIsOpen && props.currentUser?.id) {
    console.log('🔄 PendenzenModal opened - loading data...')
    await refreshData()
  } else if (!newIsOpen) {
    console.log('ℹ️ PendenzenModal closed')
  } else {
    console.warn('⚠️ Modal opened but no user ID available')
  }
}, { immediate: true })

// Debug: Watch pendingCount changes
watch(pendingCount, (newCount, oldCount) => {
  console.log(`🔄 PendenzenModal - pending count changed: ${oldCount} → ${newCount}`)
}, { immediate: true })

// Initial load wenn Component gemounted wird UND Modal bereits offen ist
onMounted(() => {
  if (props.isOpen && props.currentUser?.id) {
    console.log('🔄 PendenzenModal mounted with open state - loading data...')
    refreshData()
  }
})
</script>

<style scoped>
/* Custom scrollbar */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

/* Smooth transitions */
.transition-all {
  transition: all 0.2s ease-in-out;
}

.transition-colors {
  transition: color 0.2s ease-in-out, background-color 0.2s ease-in-out, border-color 0.2s ease-in-out;
}

/* Mobile optimizations */
@media (hover: none) and (pointer: coarse) {
  .hover\:bg-gray-100:hover {
    background-color: #f3f4f6;
  }
}

/* Ensure text doesn't break layout on small screens */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>```

### ./components/PriceDisplay.vue
```vue
<template>
  <div class="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
    <!-- Price Display -->
    <div>
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-gray-700">
          {{ eventType === 'lesson' ? 'Fahrstunde' : 'Termin' }}
        </h3>
        <span class="text-xs text-gray-500">
          {{ formattedAppointmentInfo }}
        </span>
      </div>

      <!-- Preis dieser Fahrstunde -->
      <div class="flex justify-between items-center text-sm mt-2">
        <span class="text-gray-600">Preis dieser Fahrstunde:</span>
        <span class="font-medium">CHF {{ formatPrice(lessonPrice) }}</span>
      </div>

      <!-- Versicherungsgebühr (falls vorhanden) -->
      <div v-if="shouldShowAdminFee" class="flex justify-between items-center text-sm">
        <div class="flex items-center space-x-1">
          <span class="text-gray-600">Versicherungsgebühr:</span>
          <button @click="showAdminFeeInfo = !showAdminFeeInfo" class="text-blue-500 hover:text-blue-700 text-xs">
            ℹ️
          </button>
        </div>
        <span class="font-medium">CHF {{ formatPrice(adminFee) }}</span>
      </div>

      <!-- Rabatt (falls vorhanden) -->
      <div v-if="props.discount > 0" class="flex justify-between items-center text-sm text-green-600">
        <div class="flex items-center space-x-2">
          <span>Rabatt</span>
          <span v-if="props.discountReason" class="text-xs text-gray-500">({{ props.discountReason }})</span>
          <button v-if="props.allowDiscountEdit" @click="removeDiscount" class="text-red-500 hover:text-red-700 text-xs">
            ✕ 
          </button>
        </div>
        <span class="font-medium">- CHF {{ formatPrice(props.discount) }}</span>
      </div>

      <!-- Rabatt hinzufügen Button (falls kein Rabatt und editierbar) -->
      <div v-if="props.allowDiscountEdit && props.discount === 0" class="flex justify-between items-center text-sm">
        <button 
          @click="showDiscountEdit = true"
          class="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          ➕ Rabatt hinzufügen
        </button>
      </div>

      <!-- Gesamtpreis dieses Termins -->
      <div class="flex justify-between items-center text-lg font-semibold border-t border-gray-200 pt-2 mt-2" 
           :class="paymentStatusClass">
        <span>Total:</span>
        <div class="text-right">
          <div>CHF {{ finalPrice }}</div>
          <div class="text-xs font-normal">{{ paymentStatusText }}</div>
        </div>
      </div>

      <!-- Admin Fee Info -->
      <div v-if="showAdminFeeInfo" class="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
        <p><strong>Versicherungsgebühr:</strong></p>
        <p v-if="props.appointmentNumber === 1">Entfällt beim ersten Termin.</p>
        <p v-else>Wird ab dem 2. Termin einmalig erhoben.</p>
      </div>
    </div>

    <!-- Rabatt-Bearbeitungs-Modal -->
    <div v-if="showDiscountEdit" class="border-t border-gray-200 pt-4">
      <h4 class="text-md font-medium text-gray-900 mb-3">Rabatt hinzufügen</h4>
      
      <div class="space-y-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Rabattbetrag (CHF)</label>
          <input 
            type="number" 
            v-model="tempDiscountInput"
            @blur="formatToTwoDecimals"
            step="0.01"
            min="0"
            :max="maxDiscount"
            placeholder="z.B. 20.00"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
          <p class="text-xs text-gray-500 mt-1">
            Maximaler Rabatt: CHF {{ formatPrice(maxDiscount) }}
          </p>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Grund für Rabatt</label>
          <input 
            type="text" 
            v-model="tempDiscountReason"
            placeholder="z.B. Treuebonus, Ausbildungsrabatt"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
        </div>

        <!-- Rabatt-Vorschau -->
        <div v-if="tempDiscount > 0" class="bg-gray-50 p-3 rounded-md">
          <h5 class="text-sm font-medium text-gray-700 mb-2">Vorschau:</h5>
          <div class="space-y-1 text-xs">
            <div class="flex justify-between">
              <span>Ursprungspreis:</span>
              <span>CHF {{ formatPrice(totalPriceWithoutDiscount) }}</span>
            </div>
            <div class="flex justify-between text-green-600">
              <span>Rabatt:</span>
              <span>- CHF {{ formatPrice(tempDiscount) }}</span>
            </div>
            <div class="flex justify-between font-medium border-t border-gray-200 pt-1">
              <span>Neuer Preis:</span>
              <span>CHF {{ formatPrice(totalPriceWithoutDiscount - tempDiscount) }}</span>
            </div>
          </div>
        </div>

        <!-- Buttons -->
        <div class="flex justify-end space-x-3 pb-2">
          <button
            @click="cancelDiscountEdit"
            class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button
            @click="applyDiscount"
            :disabled="tempDiscount <= 0"
            class="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Rabatt anwenden
          </button>
        </div>
      </div>
    </div>

    <!-- Zahlungsart-Regler -->
    <div class="border-t border-gray-200 pt-4">
      <h4 class="text-md font-medium text-gray-900 mb-3">Zahlungsart wählen</h4>
      
      <div class="space-y-3">
        <!-- Rechnung Toggle -->
        <div class="flex items-center justify-between p-3 border rounded-lg" 
             :class="[
               invoiceMode ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'
             ]">
          <div class="flex items-center space-x-3">
            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <div>
              <span class="font-medium text-gray-900">Rechnung</span>
            </div>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              v-model="invoiceMode" 
              @change="onInvoiceModeChange"
              class="sr-only peer"
            >
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <!-- Barzahlung Toggle -->
        <div class="flex items-center justify-between p-3 border rounded-lg"
             :class="[
               cashMode ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 bg-gray-50'
             ]">
          <div class="flex items-center space-x-3">
            <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
            <div>
              <span class="font-medium text-gray-900">Barzahlung</span>
            </div>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              v-model="cashMode" 
              @change="onCashModeChange"
              class="sr-only peer"
            >
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
          </label>
        </div>

        <!-- Online Zahlung (Standard wenn nichts aktiviert) -->
        <div v-if="!invoiceMode && !cashMode" class="flex items-center justify-between p-3 border-2 border-green-500 bg-green-50 rounded-lg">
          <div class="flex items-center space-x-3">
            <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
            </svg>
            <div>
              <span class="font-medium text-gray-900">Online Zahlung</span>
              <p class="text-sm text-gray-600">Twint, Kreditkarte über Wallee</p>
            </div>
          </div>
          <span class="px-2 py-1 bg-green-600 text-white text-xs rounded-full">Aktiv</span>
        </div>
      </div>
    </div>

    <!-- Rechnungsadresse Formular (nur wenn Rechnung aktiviert) -->
    <div v-if="invoiceMode" class="border-t border-gray-200 pt-4">
      <h4 class="text-md font-medium text-gray-900 mb-3">Firmenrechnungsadresse</h4>
      
      <!-- Bestehende Adresse auswählen -->
      <div v-if="companyBilling.savedAddresses.value.length > 0" class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">Gespeicherte Adresse verwenden</label>
        <select 
          @change="onSavedAddressSelected"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Neue Adresse eingeben</option>
          <option v-for="address in companyBilling.savedAddresses.value" :key="address.id" :value="address.id">
            {{ companyBilling.getAddressPreview(address) }}
          </option>
        </select>
      </div>

      <!-- Firmenadresse Formular -->
      <div class="space-y-3">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Firmenname *</label>
            <input 
              type="text" 
              v-model="companyBilling.formData.value.companyName"
              placeholder="z.B. Muster AG"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              :class="{ 'border-red-300': companyBilling.validation.value.errors.companyName }"
            >
            <p v-if="companyBilling.validation.value.errors.companyName" class="text-xs text-red-600 mt-1">
              {{ companyBilling.validation.value.errors.companyName }}
            </p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Ansprechperson *</label>
            <input 
              type="text" 
              v-model="companyBilling.formData.value.contactPerson"
              placeholder="z.B. Max Mustermann"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              :class="{ 'border-red-300': companyBilling.validation.value.errors.contactPerson }"
            >
            <p v-if="companyBilling.validation.value.errors.contactPerson" class="text-xs text-red-600 mt-1">
              {{ companyBilling.validation.value.errors.contactPerson }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">E-Mail *</label>
            <input 
              type="email" 
              v-model="companyBilling.formData.value.email"
              placeholder="rechnung@firma.ch"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              :class="{ 'border-red-300': companyBilling.validation.value.errors.email }"
            >
            <p v-if="companyBilling.validation.value.errors.email" class="text-xs text-red-600 mt-1">
              {{ companyBilling.validation.value.errors.email }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
            <input 
              type="tel" 
              v-model="companyBilling.formData.value.phone"
              placeholder="+41 44 123 45 67"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
          </div>
        </div>

        <div class="grid grid-cols-4 gap-3">
          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Strasse *</label>
            <input 
              type="text" 
              v-model="companyBilling.formData.value.street"
              placeholder="Musterstrasse"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              :class="{ 'border-red-300': companyBilling.validation.value.errors.street }"
            >
            <p v-if="companyBilling.validation.value.errors.street" class="text-xs text-red-600 mt-1">
              {{ companyBilling.validation.value.errors.street }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nr.</label>
            <input 
              type="text" 
              v-model="companyBilling.formData.value.streetNumber"
              placeholder="123"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">PLZ *</label>
            <input 
              type="text" 
              v-model="companyBilling.formData.value.zip"
              placeholder="8000"
              maxlength="4"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              :class="{ 'border-red-300': companyBilling.validation.value.errors.zip }"
            >
            <p v-if="companyBilling.validation.value.errors.zip" class="text-xs text-red-600 mt-1">
              {{ companyBilling.validation.value.errors.zip }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Ort *</label>
            <input 
              type="text" 
              v-model="companyBilling.formData.value.city"
              placeholder="Zürich"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              :class="{ 'border-red-300': companyBilling.validation.value.errors.city }"
            >
            <p v-if="companyBilling.validation.value.errors.city" class="text-xs text-red-600 mt-1">
              {{ companyBilling.validation.value.errors.city }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">MwSt-Nummer</label>
            <input 
              type="text" 
              v-model="companyBilling.formData.value.vatNumber"
              placeholder="CHE-123.456.789 MWST"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
          </div>
        </div>

        <!-- Speichern Button -->
        <div v-if="!companyBilling.currentAddress.value" class="pt-2">
          <button
            @click="saveCompanyAddress"
            :disabled="!companyBilling.validation.value.isValid || companyBilling.isLoading.value"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <span v-if="companyBilling.isLoading.value">⏳ Speichere...</span>
            <span v-else>💾 Adresse speichern</span>
          </button>
        </div>

        <!-- Validation Status -->
        <div v-if="!companyBilling.validation.value.isValid && invoiceMode" class="text-sm text-red-600 bg-red-50 p-2 rounded">
          ⚠️ Bitte füllen Sie alle Pflichtfelder korrekt aus
        </div>
        
        <div v-if="companyBilling.validation.value.isValid && invoiceMode" class="text-sm text-green-600 bg-green-50 p-2 rounded">
          ✅ Rechnungsadresse vollständig
        </div>

        <!-- Error Display -->
        <div v-if="companyBilling.error.value" class="text-sm text-red-600 bg-red-50 p-2 rounded">
          ❌ {{ companyBilling.error.value }}
        </div>
      </div>
    </div>

    <!-- Statusmeldung -->
    <div v-if="paymentModeStatus" class="text-sm p-3 rounded-lg" 
         :class="[
           paymentModeStatus.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
           paymentModeStatus.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
           'bg-red-50 text-red-800 border border-red-200'
         ]">
      {{ paymentModeStatus.message }}
    </div>

    <!-- Für Clients: Link zu PaymentModal -->
    <div v-if="currentUser?.role === 'student' && !isPaid" class="mt-3 pt-3 border-t border-gray-200">
      <button
        @click="emit('open-payment-modal')"
        class="w-full bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700"
      >
        💳 Online bezahlen (Twint, Karte)
      </button>
    </div>
    <!-- Checkbox für automatisches Speichern hinzufügen -->
    <div v-if="invoiceMode || cashMode" class="flex items-center mt-3 p-2 bg-gray-50 rounded">
      <input 
        type="checkbox" 
        v-model="savePaymentPreference" 
        id="save-payment-pref"
        class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
      >
      <label for="save-payment-pref" class="ml-2 text-sm text-gray-600">
        ✅ Als Standard für zukünftige Termine speichern
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useCompanyBilling } from '~/composables/useCompanyBilling'
import { getSupabase } from '~/utils/supabase'


// Props - angepasst an bestehende Struktur
interface Props {
  eventType?: 'lesson' | 'meeting'
  durationMinutes: number
  pricePerMinute: number
  isPaid: boolean
  adminFee: number
  isSecondOrLaterAppointment: boolean
  appointmentNumber: number
  showAdminFeeByDefault?: boolean
  discount: number
  discountType: 'fixed'
  discountReason: string
  allowDiscountEdit: boolean
  selectedDate?: string | null
  startTime?: string | null
  currentUser?: any
  initialPaymentMethod?: string
  selectedStudentId?: string
  selectedStudent?: any  

}

const props = withDefaults(defineProps<Props>(), {
  eventType: 'lesson',
  durationMinutes: 45,
  pricePerMinute: 0,
  isPaid: false,
  adminFee: 120,
  isSecondOrLaterAppointment: false,
  appointmentNumber: 1,
  showAdminFeeByDefault: false,
  discount: 0,
  discountType: 'fixed',
  discountReason: '',
  allowDiscountEdit: false,
  selectedDate: '',
  startTime: '',
  currentUser: null
})

// Emits - alle Events aus deiner bestehenden Komponente
const emit = defineEmits([
  'discount-changed', 
  'update:discount', 
  'update:discountReason',
  'payment-status-changed',
  'open-payment-modal',
  'payment-mode-changed',
  'invoice-data-changed'
])

// Composables
const companyBilling = useCompanyBilling()

// State - angepasst an bestehende Logik
const showAdminFeeInfo = ref(false)
const showDiscountEdit = ref(false)

// Temp discount for editing
const tempDiscountInput = ref('')
const tempDiscountReason = ref('')

// State - Neue Zahlungsart-Regler
const invoiceMode = ref(false)
const cashMode = ref(false)
const selectedAddressId = ref('')
const savePaymentPreference = ref(true)

// Computed - angepasst an bestehende Props
const tempDiscount = computed(() => parseFloat(tempDiscountInput.value) || 0)

const lessonPrice = computed(() => {
  return props.durationMinutes * props.pricePerMinute
})

const shouldShowAdminFee = computed(() => {
  return props.appointmentNumber === 2 || props.showAdminFeeByDefault || props.isSecondOrLaterAppointment
})

const totalPriceWithoutDiscount = computed(() => {
  let total = lessonPrice.value
  if (shouldShowAdminFee.value) {
    total += props.adminFee
  }
  return total
})

const maxDiscount = computed(() => totalPriceWithoutDiscount.value)

const finalPrice = computed(() => {
  const total = totalPriceWithoutDiscount.value - props.discount
  return formatPrice(total)
})

const paymentStatusClass = computed(() => {
  if (props.isPaid) return 'text-green-700'
  return 'text-gray-900'
})

const paymentStatusText = computed(() => {
  if (props.isPaid) return 'Bezahlt'
  return 'Offen'
})

const formattedAppointmentInfo = computed(() => {
  let parts = []
  
  if (props.selectedDate) {
    const date = new Date(props.selectedDate)
    parts.push(date.toLocaleDateString('de-CH'))
  }
  
  if (props.startTime) {
    const [hours, minutes] = props.startTime.split(':').map(Number)
    const startMinutes = hours * 60 + minutes
    const endMinutes = startMinutes + props.durationMinutes
    const endHours = Math.floor(endMinutes / 60)
    const endMins = endMinutes % 60
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`
    
    parts.push(`${props.startTime} - ${endTime} (${props.durationMinutes}min)`)
  } else {
    parts.push(`${props.durationMinutes}min`)
  }
  
  return parts.join('\n')
})

// Computed - Neue Zahlungsart-Logik
const invoiceDataValid = computed(() => {
  return companyBilling.validation.value.isValid
})

const paymentModeStatus = computed(() => {
  if (invoiceMode.value && cashMode.value) {
    return {
      type: 'warning',
      message: 'Bitte wählen Sie nur eine Zahlungsart aus.'
    }
  }
  
  if (invoiceMode.value && !invoiceDataValid.value) {
    return {
      type: 'warning',
      message: 'Bitte füllen Sie alle Pflichtfelder für die Rechnungsadresse aus.'
    }
  }
  
  if (invoiceMode.value && invoiceDataValid.value) {
    return {
      type: 'success',
      message: 'Rechnung wird nach der Fahrstunde erstellt und versendet.'
    }
  }
  
  if (cashMode.value) {
    return {
      type: 'success',
      message: 'Zahlung erfolgt bar beim Fahrlehrer.'
    }
  }
  
  return {
    type: 'success',
    message: 'Online-Zahlung über Customer Dashboard.'
  }
})

// Methods
const formatPrice = (amount: number): string => {
  return amount.toFixed(2)
}

const formatToTwoDecimals = () => {
  if (tempDiscountInput.value) {
    tempDiscountInput.value = parseFloat(tempDiscountInput.value).toFixed(2)
  }
}

const applyDiscount = () => {
  // Emit in bestehender Struktur
  emit('discount-changed', tempDiscount.value, 'fixed', tempDiscountReason.value)
  
  showDiscountEdit.value = false
  tempDiscountInput.value = ''
  tempDiscountReason.value = ''
}

const cancelDiscountEdit = () => {
  showDiscountEdit.value = false
  tempDiscountInput.value = ''
  tempDiscountReason.value = ''
}

const removeDiscount = () => {
  emit('discount-changed', 0, 'fixed', '')
}

// Methods - Neue Zahlungsart-Logik
// In PriceDisplay.vue - bei der onInvoiceModeChange Funktion:
const onInvoiceModeChange = async () => {
  if (invoiceMode.value && cashMode.value) {
    cashMode.value = false
  }
  
  // Lade gespeicherte Adressen wenn Invoice-Mode aktiviert wird
  if (invoiceMode.value && props.currentUser?.id) {
    await companyBilling.loadUserCompanyAddresses(props.currentUser.id)
  }
  
  updatePaymentMode()
}

// ============ PAYMENT PREFERENCES METHODS ============
const loadUserPaymentPreferences = async (userId: string) => {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('users')
      .select('preferred_payment_method, default_company_billing_address_id')
      .eq('id', userId)
      .maybeSingle()

    if (error) throw error
    
    console.log('🔍 DB Result preferred_payment_method:', data?.preferred_payment_method)
    console.log('🔍 DB Result default_company_billing_address_id:', data?.default_company_billing_address_id)
    
    // Store billing address ID for later use
    let billingAddressData = null
    
    // NEU: Lade Standard-Rechnungsadresse zuerst (falls vorhanden)
    if (data?.default_company_billing_address_id) {
      billingAddressData = await loadDefaultBillingAddress(data.default_company_billing_address_id)
    }
    
    if (data?.preferred_payment_method) {
      // Bestehende Payment-Method Logik...
      const uiMethodMapping: Record<string, string> = {
        'cash': 'cash',
        'invoice': 'invoice',
        'twint': 'online',
        'stripe_card': 'online',
        'debit_card': 'online'
      }
      
      const uiMethod = uiMethodMapping[data.preferred_payment_method] || 'online'
      
      console.log('✅ Loaded payment preference:', data.preferred_payment_method, '→', uiMethod)
      
      // Setze UI-Zustand basierend auf Preference
      if (uiMethod === 'cash') {
        cashMode.value = true
        invoiceMode.value = false
      } else if (uiMethod === 'invoice') {
        invoiceMode.value = true
        cashMode.value = false
      } else {
        cashMode.value = false
        invoiceMode.value = false
      }
      
      // Pass billing data if invoice method and address loaded
      const paymentData = (uiMethod === 'invoice' && billingAddressData) ? billingAddressData : null
      updatePaymentMode()
      
    } else {
      console.log('📭 No payment preference found, setting to online')
      cashMode.value = false
      invoiceMode.value = false
    }
    
  } catch (err) {
    console.error('❌ Error loading payment preferences:', err)
    cashMode.value = false
    invoiceMode.value = false
  }
}

const loadDefaultBillingAddress = async (addressId: string) => {
  try {
    await companyBilling.loadUserCompanyAddresses(props.currentUser.id)
    
    const address = companyBilling.savedAddresses.value.find(
      (addr: any) => addr.id === addressId
    )
    
    if (address) {
      companyBilling.loadFormFromAddress(address)
      selectedAddressId.value = addressId
      console.log('✅ Auto-loaded default billing address')
      return {
        formData: companyBilling.formData.value,
        currentAddress: address,
        isValid: companyBilling.validation.value.isValid
      }
    }
    
    return null
  } catch (err) {
    console.error('❌ Error loading default billing:', err)
    return null
  }
}

const onCashModeChange = () => {
  if (cashMode.value && invoiceMode.value) {
    invoiceMode.value = false
  }
  updatePaymentMode()
}

const onSavedAddressSelected = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const addressId = target.value
  
  if (addressId) {
    const address = companyBilling.savedAddresses.value.find(addr => addr.id === addressId)
    if (address) {
      companyBilling.loadFormFromAddress(address)
      selectedAddressId.value = addressId
    }
  } else {
    companyBilling.resetForm()
    selectedAddressId.value = ''
  }
}

const saveCompanyAddress = async () => {
  if (!props.currentUser?.id) {
    companyBilling.error.value = 'Benutzer nicht angemeldet'
    return
  }

  const result = await companyBilling.createCompanyBillingAddress(props.currentUser.id)
  
  if (result.success) {
    // Erfolgreich gespeichert, lade Liste neu
    await companyBilling.loadUserCompanyAddresses(props.currentUser.id)
    selectedAddressId.value = result.data?.id || ''
  }
}

const updatePaymentMode = () => {
  let mode: 'invoice' | 'cash' | 'online' = 'online'
  let data = undefined
  
  if (invoiceMode.value) {
    mode = 'invoice'
    data = {
      formData: companyBilling.formData.value,
      currentAddress: companyBilling.currentAddress.value,
      isValid: companyBilling.validation.value.isValid
    }
  } else if (cashMode.value) {
    mode = 'cash'
  }
  
  emit('payment-mode-changed', mode, data)
  
  // Zusätzliches Event für Invoice-Data
  if (mode === 'invoice') {
    emit('invoice-data-changed', companyBilling.formData.value, companyBilling.validation.value.isValid)
  }
}



// Watchers
// Watcher für initialPaymentMethod
watch(() => props.initialPaymentMethod, (newMethod) => {
  
  if (newMethod === 'cash') {
    cashMode.value = true
    invoiceMode.value = false
  } else if (newMethod === 'invoice') {
    invoiceMode.value = true
    cashMode.value = false
  } else {
    cashMode.value = false
    invoiceMode.value = false
  }
}, { immediate: true })

watch([invoiceMode, cashMode], updatePaymentMode)

watch(() => companyBilling.formData.value, () => {
  if (invoiceMode.value) {
    updatePaymentMode()
  }
}, { deep: true })

// Watcher für selectedStudent
watch(() => props.selectedStudent, async (newStudent) => {
  if (newStudent?.id) {
    console.log('👤 PriceDisplay: Loading payment preferences for:', newStudent.first_name)
    await loadUserPaymentPreferences(newStudent.id)
  }
}, { immediate: true })

// Lifecycle
onMounted(async () => {
  // Lade gespeicherte Adressen beim Component-Mount
  if (props.currentUser?.id) {
    await companyBilling.loadUserCompanyAddresses(props.currentUser.id)
  }
})
</script>```

### ./components/ProfileSetup.vue
```vue
<!-- components/ProfileSetup.vue -->
<template>
  <div class="profile-setup">
    <div class="setup-container">
      <h2>Profil vervollständigen</h2>
      <p>Hallo {{ userEmail }}! Bitte vervollständige dein Profil:</p>
      
      <form @submit.prevent="createProfile" class="setup-form">
        <div class="form-group">
          <label for="companyName">Firmenname:</label>
          <input 
            id="companyName"
            v-model="profileData.company_name" 
            type="text"
            required 
            placeholder="Deine Firma"
          />
        </div>
        
        <div class="form-group">
          <label for="role">Rolle:</label>
          <select id="role" v-model="profileData.role" required>
            <option value="user">Benutzer</option>
            <option value="staff">Staff</option>
            <option value="admin">Administrator</option>
          </select>
        </div>
        
        <button type="submit" :disabled="isLoading" class="submit-btn">
          {{ isLoading ? 'Erstelle Profil...' : 'Profil erstellen' }}
        </button>
      </form>
      
      <div v-if="error" class="error">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useCurrentUser } from '~/composables/useCurrentUser'
import { getSupabase } from '~/utils/supabase'

const emit = defineEmits(['profile-created'])

const { createUserProfile, isLoading, userError } = useCurrentUser()

const profileData = ref({
  company_name: '',
  role: 'user'
})

const error = ref('')
const userEmail = ref('')

onMounted(async () => {
  const supabase = getSupabase()
  const { data: authData } = await supabase.auth.getUser()
  userEmail.value = authData?.user?.email || ''
})

async function createProfile() {
  error.value = ''
  
  try {
    await createUserProfile(profileData.value)
    emit('profile-created')
  } catch (err) {
    error.value = userError.value || 'Fehler beim Erstellen des Profils'
  }
}
</script>

<style scoped>
.profile-setup {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background-color: #f5f5f5;
}

.setup-container {
  max-width: 400px;
  width: 100%;
  padding: 30px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.setup-container h2 {
  margin-bottom: 10px;
  color: #333;
}

.setup-container p {
  margin-bottom: 25px;
  color: #666;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #333;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #007bff;
}

.submit-btn {
  width: 100%;
  padding: 12px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
}

.submit-btn:hover:not(:disabled) {
  background-color: #0056b3;
}

.submit-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.error {
  margin-top: 15px;
  padding: 10px;
  background-color: #f8d7da;
  color: #721c24;
  border-radius: 4px;
  border: 1px solid #f5c6cb;
}
</style>```

### ./components/StaffDurationSettings.vue
```vue
<template>
  <div class="bg-white p-6 rounded-lg border border-gray-200">
    <h3 class="text-lg font-medium text-gray-900 mb-4">
      ⏱️ Lektionsdauern pro Kategorie
    </h3>
    
    <p class="text-sm text-gray-600 mb-6">
      Konfigurieren Sie für jede Fahrzeugkategorie die verfügbaren Lektionsdauern. 
      Diese werden bei der Terminbuchung zur Auswahl angezeigt.
    </p>

    <!-- Loading state -->
    <div v-if="isLoading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="h-32 bg-gray-200 rounded animate-pulse"></div>
    </div>

    <!-- Error state -->
    <div v-if="error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
      ❌ {{ error }}
    </div>

    <!-- Kategorien -->
    <div v-if="!isLoading" class="space-y-6">
      <div 
        v-for="category in availableCategories"
        :key="category.code"
        class="border border-gray-200 rounded-lg p-4"
      >
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <div 
              class="w-4 h-4 rounded-full"
              :style="{ backgroundColor: category.color || '#gray' }"
            ></div>
            <h4 class="font-medium text-gray-900">
              Kategorie {{ category.code }} - {{ category.name }}
            </h4>
            <span class="text-xs text-gray-500">
              CHF {{ category.price_per_lesson }}/45min
            </span>
          </div>
        </div>

        <!-- Aktuelle Dauern für diese Kategorie -->
        <div v-if="categoryDurations[category.code]?.length > 0" class="mb-3">
          <div class="text-xs font-medium text-gray-600 mb-1">Aktuell konfiguriert:</div>
          <div class="flex flex-wrap gap-1">
            <span 
              v-for="duration in getFormattedDurations(categoryDurations[category.code])"
              :key="duration.value"
              class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
            >
              {{ duration.label }}
            </span>
          </div>
        </div>

        <!-- Verfügbare Dauern für diese Kategorie -->
        <div class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          <label 
            v-for="duration in getAllPossibleDurations()"
            :key="`${category.code}-${duration.value}`"
            class="flex items-center p-2 border rounded cursor-pointer hover:bg-gray-50 transition-colors text-sm"
            :class="{
              'border-green-500 bg-green-50': isDurationSelectedForCategory(category.code, duration.value),
              'border-gray-300': !isDurationSelectedForCategory(category.code, duration.value)
            }"
          >
            <input
              type="checkbox"
              :checked="isDurationSelectedForCategory(category.code, duration.value)"
              @change="toggleDurationForCategory(category.code, duration.value)"
              class="w-3 h-3 text-green-600 border-gray-300 rounded focus:ring-green-500 mr-2"
            >
            <span class="text-xs">{{ duration.label }}</span>
          </label>
        </div>

        <!-- Info für diese Kategorie -->
        <div class="mt-2 text-xs text-gray-500">
          Standard-Lektionsdauer: {{ category.lesson_duration_minutes || 45 }}min
        </div>
      </div>
    </div>

    <!-- Save Actions -->
    <div class="mt-8 flex gap-3">
      <button
        @click="saveAllDurations"
        :disabled="isSaving"
        class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {{ isSaving ? 'Speichern...' : 'Alle Änderungen speichern' }}
      </button>
      
      <button
        @click="resetToDefaults"
        type="button"
        class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
      >
        Auf Standard zurücksetzen
      </button>

      <button
        @click="createDefaultsForAll"
        type="button"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Standard-Dauern erstellen
      </button>
    </div>

    <!-- Save feedback -->
    <div v-if="saveSuccess" class="mt-3 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-600">
      ✅ Lektionsdauern erfolgreich gespeichert!
    </div>
    
    <div v-if="saveError" class="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
      ❌ {{ saveError }}
    </div>

    <!-- Statistik -->
    <div v-if="!isLoading" class="mt-6 p-3 bg-gray-50 rounded text-sm">
      <div class="font-medium text-gray-700 mb-2">Übersicht:</div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div v-for="category in availableCategories" :key="category.code">
          <span class="font-medium">{{ category.code }}:</span>
          <span class="ml-1">{{ categoryDurations[category.code]?.length || 0 }} Dauern</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useStaffCategoryDurations } from '~/composables/useStaffCategoryDurations'
import { getSupabase } from '~/utils/supabase'

interface Props {
  currentUser: any
}

const props = defineProps<Props>()

// Composable verwenden
const {
  saveStaffCategoryDurations,
  loadAllStaffDurations,
  createDefaultDurations
} = useStaffCategoryDurations()

// State
const availableCategories = ref<any[]>([])
const categoryDurations = ref<Record<string, number[]>>({})
const isLoading = ref(false)
const isSaving = ref(false)
const error = ref<string | null>(null)
const saveSuccess = ref(false)
const saveError = ref<string | null>(null)

// Alle möglichen Dauern (15min steps von 45-240)
const getAllPossibleDurations = () => {
  const durations = [45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240]
  
  return durations.map(duration => ({
    value: duration,
    label: duration >= 120 
      ? `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? duration % 60 + 'min' : ''}`.trim() 
      : `${duration}min`
  }))
}

// Helper Functions
const getFormattedDurations = (durations: number[]) => {
  return durations.map(duration => ({
    value: duration,
    label: duration >= 120 
      ? `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? duration % 60 + 'min' : ''}`.trim() 
      : `${duration}min`
  }))
}

const isDurationSelectedForCategory = (categoryCode: string, duration: number) => {
  return categoryDurations.value[categoryCode]?.includes(duration) || false
}

const toggleDurationForCategory = (categoryCode: string, duration: number) => {
  if (!categoryDurations.value[categoryCode]) {
    categoryDurations.value[categoryCode] = []
  }
  
  const index = categoryDurations.value[categoryCode].indexOf(duration)
  if (index > -1) {
    categoryDurations.value[categoryCode].splice(index, 1)
  } else {
    categoryDurations.value[categoryCode].push(duration)
    categoryDurations.value[categoryCode].sort((a: number, b: number) => a - b)
  }
}

// Data Loading
const loadCategories = async () => {
  console.log('🔥 Loading categories for staff settings')
  
  try {
    const supabase = getSupabase()
    const { data, error: fetchError } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
      .order('name')

    if (fetchError) throw fetchError

    availableCategories.value = data || []
    console.log('✅ Categories loaded:', data?.length)
  } catch (err: any) {
    console.error('❌ Error loading categories:', err)
    error.value = err.message
  }
}

const loadCurrentDurations = async () => {
  if (!props.currentUser?.id) return

  console.log('🔥 Loading current staff durations')
  
  try {
    const supabase = getSupabase()
    const { data, error: fetchError } = await supabase
      .from('staff_category_durations')
      .select('category_code, duration_minutes')
      .eq('staff_id', props.currentUser.id)
      .eq('is_active', true)
      .order('category_code')
      .order('duration_minutes')

    if (fetchError) throw fetchError

    // Gruppiere Dauern nach Kategorie
    const grouped: Record<string, number[]> = {}
    data?.forEach(item => {
      if (!grouped[item.category_code]) {
        grouped[item.category_code] = []
      }
      grouped[item.category_code].push(item.duration_minutes)
    })

    categoryDurations.value = grouped
    console.log('✅ Current durations loaded:', grouped)
  } catch (err: any) {
    console.error('❌ Error loading current durations:', err)
    error.value = err.message
  }
}

const loadData = async () => {
  isLoading.value = true
  error.value = null

  try {
    await Promise.all([
      loadCategories(),
      loadCurrentDurations()
    ])
  } catch (err: any) {
    error.value = err.message
  } finally {
    isLoading.value = false
  }
}

// Save Functions
const saveAllDurations = async () => {
  if (!props.currentUser?.id) return

  isSaving.value = true
  saveError.value = null
  saveSuccess.value = false

  try {
    // Speichere für jede Kategorie die konfigurierten Dauern
    const savePromises = Object.entries(categoryDurations.value).map(([categoryCode, durations]) => {
      if (durations.length > 0) {
        return saveStaffCategoryDurations(props.currentUser.id, categoryCode, durations)
      }
      return Promise.resolve()
    })

    await Promise.all(savePromises)
    
    saveSuccess.value = true
    console.log('✅ All durations saved successfully')
    
    // Success message nach 3 Sekunden ausblenden
    setTimeout(() => {
      saveSuccess.value = false
    }, 3000)
    
  } catch (err: any) {
    console.error('❌ Error saving durations:', err)
    saveError.value = err.message
  } finally {
    isSaving.value = false
  }
}

const resetToDefaults = async () => {
  // Setze Standard-Dauern für alle Kategorien
  const defaults: Record<string, number[]> = {}
  availableCategories.value.forEach(category => {
    const baseDuration = category.lesson_duration_minutes || 45
    defaults[category.code] = [baseDuration]
    
    // Füge zusätzliche Standard-Dauern hinzu
    if (baseDuration === 45) {
      defaults[category.code] = [45, 90]
    } else if (baseDuration === 90) {
      defaults[category.code] = [90, 135]
    } else {
      defaults[category.code] = [baseDuration]
    }
  })
  
  categoryDurations.value = defaults
  saveError.value = null
  saveSuccess.value = false
}

const createDefaultsForAll = async () => {
  if (!props.currentUser?.id) return

  try {
    await createDefaultDurations(props.currentUser.id)
    await loadCurrentDurations() // Reload nach dem Erstellen
    saveSuccess.value = true
  } catch (err: any) {
    saveError.value = err.message
  }
}

// Watchers
watch(() => props.currentUser?.id, (newUserId) => {
  if (newUserId) {
    loadData()
  }
})

// Lifecycle
onMounted(() => {
  if (props.currentUser?.id) {
    loadData()
  }
})
</script>

<style scoped>
.transition-colors {
  transition: all 0.2s ease-in-out;
}

/* Custom checkbox styling */
input[type="checkbox"]:checked + span {
  font-weight: 500;
}
</style>```

### ./components/StaffSelector.vue
```vue
<template>
  <div class="staff-selector">
    <!-- Kollapsible Header -->
    <div class="bg-blue-50 border border-blue-200 rounded-lg">
      
      <!-- Klickbarer Header -->
      <div 
        class="flex items-center justify-between p-3 cursor-pointer hover:bg-blue-100 transition-colors"
        @click="toggleExpanded"
      >
        <div class="flex items-center gap-2">
          <span class="text-lg">👥</span>
          <label class="text-sm font-semibold text-gray-900 cursor-pointer">
            Team-Mitglieder einladen
          </label>
          <span v-if="invitedStaffIds.length > 0" class="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
            {{ invitedStaffIds.length }}
          </span>
        </div>
        
        <div class="flex items-center gap-2">
          <!-- Schnell-Aktionen (nur wenn expanded und Staff verfügbar) -->
          <div v-if="isExpanded && availableStaff.length > 0" class="flex gap-1">
            <button
              @click.stop="inviteAll"
              :disabled="disabled"
              class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
            >
              Alle
            </button>
            <button
              @click.stop="clearAll"
              :disabled="disabled"
              class="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              Keine
            </button>
          </div>
          
          <!-- Expand/Collapse Icon -->
          <svg 
            class="w-4 h-4 text-gray-600 transition-transform duration-200"
            :class="{ 'rotate-180': isExpanded }"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

    <!-- Ausklappbarer Inhalt -->
    <div 
      v-if="isExpanded"
      class="border-t border-blue-200 transition-all duration-300 ease-in-out"
    >
      
      <!-- Loading State -->
      <div v-if="isLoading" class="p-4 animate-pulse">
        <div class="h-10 bg-gray-200 rounded mb-3"></div>
        <div class="space-y-2">
          <div v-for="i in 3" :key="i" class="h-8 bg-gray-100 rounded"></div>
        </div>
      </div>

      <!-- Error State -->
      <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 m-3">
        ❌ {{ error }}
      </div>

      <!-- Hauptbereich -->
      <div v-if="!isLoading" class="bg-white">
        
        <!-- Suchfeld -->
        <div v-if="availableStaff.length > 0" class="p-3 border-b border-gray-200">
          <div class="relative">
            <input
              ref="searchInput"
              v-model="searchQuery"
              type="text"
              :placeholder="placeholder"
              :disabled="disabled"
              @focus="handleSearchFocus"
              class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
            />
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Staff Liste -->
        <div class="max-h-64 overflow-y-auto">
          
          <!-- Keine Staff-Mitglieder verfügbar -->
          <div v-if="availableStaff.length === 0" class="p-4 text-center text-gray-500 text-sm">
            <div class="mb-2">👥</div>
            <div>Keine verfügbaren Team-Mitglieder</div>
          </div>

          <!-- Staff-Liste -->
          <div v-else-if="staffList.length === 0 && searchQuery" class="p-4 text-center text-gray-500 text-sm">
            <div class="mb-2">🔍</div>
            <div>Keine Team-Mitglieder gefunden für "{{ searchQuery }}"</div>
          </div>

          <!-- Staff Items -->
          <div v-else class="divide-y divide-gray-100">
            <div
              v-for="staff in staffList"
              :key="staff.id"
              class="flex items-center p-3 hover:bg-gray-50 transition-colors cursor-pointer"
              @click="toggleStaff(staff.id)"
            >
              <!-- Checkbox -->
              <div class="flex-shrink-0 mr-3">
                <input
                  type="checkbox"
                  :checked="invitedStaffIds.includes(staff.id)"
                  :disabled="disabled"
                  @click.stop="toggleStaff(staff.id)"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                />
              </div>

              <!-- Staff Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <div class="text-sm font-medium text-gray-900 truncate">
                      {{ staff.first_name }} {{ staff.last_name }}
                    </div>
                    <div class="text-xs text-gray-500 truncate">
                      {{ staff.email }}
                    </div>
                  </div>
                  
                  <!-- Status Badge - nur Staff -->
                  <div class="flex-shrink-0 ml-2">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      Staff
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Liste Statistiken -->
          <div v-if="availableStaff.length > 0" class="bg-gray-50 border-t border-gray-200 px-3 py-2">
            <div class="text-xs text-gray-500 text-center">
              <span class="font-medium">{{ invitedStaffIds.length }}</span> von {{ staffList.length }} ausgewählt
              <span v-if="searchQuery"> • Gefiltert nach "{{ searchQuery }}"</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Ausgewählte Staff-Mitglieder Übersicht -->
    <div v-if="invitedStaffIds.length > 0" class="mt-3">
      <div class="text-xs font-medium text-gray-700 m-2">
        Eingeladene Team-Mitglieder ({{ invitedStaffIds.length }}):
      </div>
      <div class="flex flex-wrap gap-1 m-2">
        <span
          v-for="staffId in invitedStaffIds"
          :key="staffId"
          class="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800"
        >
          {{ getStaffName(staffId) }}
          <button
            v-if="!disabled"
            @click="toggleStaff(staffId)"
            class="ml-1 hover:text-blue-600"
          >
            ×
          </button>
        </span>
      </div>
    </div>
  </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { getSupabase } from '~/utils/supabase'

// Staff Interface - nur Staff, keine Admins
interface Staff {
  id: string
  first_name: string
  last_name: string
  email: string
  role: 'staff' // Nur Staff
  is_active: boolean
}

// Props
interface Props {
  modelValue?: string[] // Array of staff IDs
  currentUser?: any
  disabled?: boolean
  placeholder?: string
  autoLoad?: boolean
  excludeCurrentUser?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  disabled: false,
  placeholder: 'Team-Mitglied suchen (Name oder E-Mail)...',
  autoLoad: true,
  excludeCurrentUser: true
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [staffIds: string[]]
  'staff-selected': [staff: Staff]
  'staff-removed': [staffId: string]
  'selection-changed': [staffIds: string[], staffMembers: Staff[]]
}>()

// State
const searchQuery = ref('')
const availableStaff = ref<Staff[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const searchInput = ref<HTMLInputElement>()
const isExpanded = ref(false) // NEU: Expanded State

// Computed
const invitedStaffIds = computed({
  get: () => props.modelValue || [],
  set: (value) => emit('update:modelValue', value)
})

const staffList = computed(() => {
  if (!searchQuery.value) {
    return availableStaff.value
  }
  
  const query = searchQuery.value.toLowerCase()
  return availableStaff.value.filter(staff =>
    staff.first_name?.toLowerCase().includes(query) ||
    staff.last_name?.toLowerCase().includes(query) ||
    staff.email?.toLowerCase().includes(query)
  )
})

// Supabase Types
interface UserFromDB {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  role: 'client' | 'staff' | 'admin'
  is_active: boolean
}

// Methods
const loadStaff = async () => {
  if (isLoading.value) return
  isLoading.value = true
  error.value = null
  
  try {
    console.log('👥 StaffSelector: Loading staff members...')
    const supabase = getSupabase()

    let query = supabase
      .from('users')
      .select('id, first_name, last_name, email, role, is_active')
      .eq('role', 'staff')  // Nur Staff, keine Admins
      .eq('is_active', true)
      .order('first_name')

    // Aktuellen User ausschließen falls gewünscht
    if (props.excludeCurrentUser && props.currentUser?.id) {
      query = query.neq('id', props.currentUser.id)
    }

    const { data, error: fetchError } = await query

    if (fetchError) throw fetchError
    
    const typedStaff: Staff[] = (data || []).map((user: UserFromDB) => ({
      id: user.id,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      role: 'staff', // Immer 'staff' da wir nur Staff laden
      is_active: user.is_active
    }))
    
    availableStaff.value = typedStaff
    console.log('✅ Staff members loaded:', availableStaff.value.length)

  } catch (err: any) {
    console.error('❌ StaffSelector: Error loading staff:', err)
    error.value = err.message || 'Fehler beim Laden der Team-Mitglieder'
    availableStaff.value = []
  } finally {
    isLoading.value = false
  }
}

const handleSearchFocus = () => {
  console.log('🔍 Staff search field focused')
  
  if (props.autoLoad && availableStaff.value.length === 0) {
    console.log('📚 Auto-loading staff on search focus')
    loadStaff()
  }
}

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
  console.log('🔄 StaffSelector expanded:', isExpanded.value)
  
  // Auto-load when expanded for the first time
  if (isExpanded.value && props.autoLoad && availableStaff.value.length === 0) {
    console.log('📚 Auto-loading staff on first expand')
    loadStaff()
  }
}

const toggleStaff = (staffId: string) => {
  if (props.disabled) return
  
  const currentIds = [...invitedStaffIds.value]
  const index = currentIds.indexOf(staffId)
  
  if (index > -1) {
    // Entfernen
    currentIds.splice(index, 1)
    console.log('➖ Staff removed from invite list:', staffId)
    emit('staff-removed', staffId)
  } else {
    // Hinzufügen
    currentIds.push(staffId)
    const staff = availableStaff.value.find(s => s.id === staffId)
    console.log('➕ Staff added to invite list:', staffId)
    if (staff) {
      emit('staff-selected', staff)
    }
  }
  
  invitedStaffIds.value = currentIds
  
  // Ausgewählte Staff-Objekte für Event
  const selectedStaff = availableStaff.value.filter(s => currentIds.includes(s.id))
  emit('selection-changed', currentIds, selectedStaff)
}

const inviteAll = () => {
  if (props.disabled) return
  
  const allIds = staffList.value.map(s => s.id)
  invitedStaffIds.value = allIds
  
  console.log('👥 All staff invited:', allIds.length, 'staff members')
  emit('selection-changed', allIds, staffList.value)
}

const clearAll = () => {
  if (props.disabled) return
  
  invitedStaffIds.value = []
  console.log('🗑️ All team invites cleared')
  emit('selection-changed', [], [])
}

const getStaffName = (staffId: string): string => {
  const staff = availableStaff.value.find(s => s.id === staffId)
  if (!staff) return 'Unbekannt'
  return `${staff.first_name} ${staff.last_name}`.trim()
}

const resetSelection = () => {
  invitedStaffIds.value = []
  searchQuery.value = ''
  isExpanded.value = false
  console.log('🔄 StaffSelector: Selection reset')
}

// Watchers
watch(() => props.currentUser, async (newUser) => {
  if (newUser && props.autoLoad) {
    await loadStaff()
  }
}, { immediate: true })

// Lifecycle
onMounted(() => {
  console.log('👥 StaffSelector mounted, autoLoad:', props.autoLoad)
  
  if (props.autoLoad) {
    console.log('🔄 Auto-loading staff on mount')
    loadStaff()
  } else {
    console.log('🚫 Auto-load disabled, waiting for user action')
  }
})

// Expose methods for parent components
defineExpose({
  loadStaff,
  inviteAll,
  clearAll,
  toggleStaff
})
</script>

<style scoped>
/* Custom scrollbar */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

/* Smooth transitions */
.transition-colors {
  transition: color 0.2s ease-in-out, background-color 0.2s ease-in-out;
}

/* Focus states for accessibility */
input:focus {
  outline: none;
}

/* Checkbox styling */
input[type="checkbox"]:checked {
  background-color: #3b82f6;
  border-color: #3b82f6;
}

input[type="checkbox"]:focus {
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}
</style>```

### ./components/StaffSettings.vue
```vue
<template>
  <!-- Modal Wrapper -->
  <div class="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
      
      <!-- Modal Header -->
      <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
        <h2 class="text-xl font-semibold text-gray-900">⚙️ Personaleinstellungen</h2>
        <button
          @click="$emit('close')"
          class="text-gray-500 hover:text-gray-700 text-2xl leading-none font-bold"
        >
          ×
        </button>
      </div>

      <!-- Modal Content -->
      <div class="p-6 space-y-4">
        
        <!-- Loading State -->
        <div v-if="isLoading" class="space-y-4">
          <div v-for="i in 3" :key="i" class="h-16 bg-gray-200 rounded animate-pulse"></div>
        </div>

        <!-- Error State -->
        <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          ❌ {{ error }}
        </div>

        <!-- Success Message -->
        <div v-if="saveSuccess" class="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
          ✅ Einstellungen erfolgreich gespeichert!
        </div>

        <!-- Accordion Sections -->
        <div v-if="!isLoading" class="space-y-3">
          
          <!-- 1. Treffpunkte/Standorte -->
          <div class="border border-gray-200 rounded-lg">
            <button
              @click="toggleSection('locations')"
              class="w-full px-4 py-3 text-left flex justify-between items-center hover:bg-gray-50 focus:outline-none"
            >
              <span class="font-medium text-gray-900">📍 Treffpunkte/Standorte</span>
              <span class="text-gray-600 font-bold">{{ openSections.locations ? '−' : '+' }}</span>
            </button>
            
            <div v-if="openSections.locations" class="px-4 pb-4 border-t border-gray-100">
              <div class="space-y-3 mt-3">
                <!-- Aktuelle Standorte -->
                <div v-if="myLocations.length > 0">
                  <div class="text-sm font-medium text-gray-800 mb-2">Ihre Standorte:</div>
                  <div class="space-y-2">
                    <div 
                      v-for="location in myLocations" 
                      :key="location.id"
                      class="flex justify-between items-center p-2 bg-gray-50 rounded text-sm"
                    >
                      <div>
                        <div class="font-medium text-gray-900">{{ location.name }}</div>
                        <div class="text-gray-700 text-xs">{{ location.address }}</div>
                      </div>
                      <button
                        @click="removeLocation(location.id)"
                        class="text-red-600 hover:text-red-800 text-xs font-medium"
                      >
                        Entfernen
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Neuen Standort hinzufügen -->
                <div class="border-t pt-3">
                  <div class="text-sm font-medium text-gray-800 mb-2">Neuen Standort hinzufügen:</div>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      v-model="newLocationName"
                      type="text"
                      placeholder="Name (z.B. Bahnhof Zürich)"
                      class="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                    <input
                      v-model="newLocationAddress"
                      type="text"
                      placeholder="Adresse"
                      class="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                  </div>
                  <button
                    @click="addLocation"
                    :disabled="!newLocationName || !newLocationAddress"
                    class="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Hinzufügen
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. Fahrzeugkategorien -->
          <div class="border border-gray-200 rounded-lg">
            <button
              @click="toggleSection('categories')"
              class="w-full px-4 py-3 text-left flex justify-between items-center hover:bg-gray-50 focus:outline-none"
            >
              <span class="font-medium text-gray-900">🚗 Fahrzeugkategorien</span>
              <span class="text-gray-600 font-bold">{{ openSections.categories ? '−' : '+' }}</span>
            </button>
            
            <div v-if="openSections.categories" class="px-4 pb-4 border-t border-gray-100">
              <div class="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                <label 
                  v-for="category in availableCategories"
                  :key="category.id"
                  class="flex items-center p-2 border rounded cursor-pointer hover:bg-gray-50 text-sm"
                  :class="{
                    'border-green-500 bg-green-50': selectedCategories.includes(category.id),
                    'border-gray-300': !selectedCategories.includes(category.id)
                  }"
                >
                  <input
                    type="checkbox"
                    :checked="selectedCategories.includes(category.id)"
                    @change="toggleCategory(category.id)"
                    class="w-3 h-3 text-green-600 border-gray-300 rounded focus:ring-green-500 mr-2"
                  >
                  <div>
                    <div class="font-medium text-gray-900">{{ category.code }}</div>
                    <div class="text-xs text-gray-700">CHF {{ category.price_per_lesson }}/45min</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <!-- 3. Lektionsdauern pro Kategorie -->
          <div class="border border-gray-200 rounded-lg">
            <button
              @click="toggleSection('durations')"
              class="w-full px-4 py-3 text-left flex justify-between items-center hover:bg-gray-50 focus:outline-none"
            >
              <span class="font-medium text-gray-900">⏱️ Lektionsdauern</span>
              <span class="text-gray-600 font-bold">{{ openSections.durations ? '−' : '+' }}</span>
            </button>
            
            <div v-if="openSections.durations" class="px-4 pb-4 border-t border-gray-100">
              <div class="space-y-4 mt-3">
                <div 
                  v-for="category in filteredCategoriesForDurations"
                  :key="category.code"
                  class="border border-gray-100 rounded p-3"
                >
                  <div class="flex items-center gap-2 mb-2">
                    <div 
                      class="w-3 h-3 rounded-full"
                      :style="{ backgroundColor: category.color || '#gray' }"
                    ></div>
                    <span class="font-medium text-sm text-gray-900">{{ category.code }} - {{ category.name }}</span>
                  </div>

                  <div class="grid grid-cols-4 md:grid-cols-6 gap-1">
                    <label 
                      v-for="duration in getRelevantDurations(category)"
                      :key="`${category.code}-${duration.value}`"
                      class="flex items-center justify-center p-1 border rounded cursor-pointer hover:bg-gray-50 text-xs"
                      :class="{
                        'border-green-500 bg-green-50': isDurationSelectedForCategory(category.code, duration.value),
                        'border-gray-300': !isDurationSelectedForCategory(category.code, duration.value)
                      }"
                    >
                      <input
                        type="checkbox"
                        :checked="isDurationSelectedForCategory(category.code, duration.value)"
                        @change="toggleDurationForCategory(category.code, duration.value)"
                        class="sr-only"
                      >
                      <span class="text-gray-900 font-medium">{{ duration.label }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 4. Arbeitszeiten -->
          <div class="border border-gray-200 rounded-lg">
            <button
              @click="toggleSection('worktime')"
              class="w-full px-4 py-3 text-left flex justify-between items-center hover:bg-gray-50 focus:outline-none"
            >
              <span class="font-medium text-gray-900">🕒 Arbeitszeiten</span>
              <span class="text-gray-600 font-bold">{{ openSections.worktime ? '−' : '+' }}</span>
            </button>
            
            <div v-if="openSections.worktime" class="px-4 pb-4 border-t border-gray-100">
              <div class="space-y-3 mt-3">
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-sm font-medium text-gray-800 mb-1">Von:</label>
                    <input
                      v-model="workingHours.start"
                      type="time"
                      class="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-800 mb-1">Bis:</label>
                    <input
                      v-model="workingHours.end"
                      type="time"
                      class="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-800 mb-2">Arbeitstage:</label>
                  <div class="flex flex-wrap gap-2">
                    <label 
                      v-for="(day, index) in weekDays"
                      :key="day"
                      class="flex items-center p-2 border rounded cursor-pointer hover:bg-gray-50 text-sm"
                      :class="{
                        'border-green-500 bg-green-50': availableDays.includes(index + 1),
                        'border-gray-300': !availableDays.includes(index + 1)
                      }"
                    >
                      <input
                        type="checkbox"
                        :checked="availableDays.includes(index + 1)"
                        @change="toggleDay(index + 1)"
                        class="sr-only"
                      >
                      <span class="text-gray-900 font-medium">{{ day }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 5. Benachrichtigungen -->
          <div class="border border-gray-200 rounded-lg">
            <button
              @click="toggleSection('notifications')"
              class="w-full px-4 py-3 text-left flex justify-between items-center hover:bg-gray-50 focus:outline-none"
            >
              <span class="font-medium text-gray-900">🔔 Benachrichtigungen</span>
              <span class="text-gray-600 font-bold">{{ openSections.notifications ? '−' : '+' }}</span>
            </button>
            
            <div v-if="openSections.notifications" class="px-4 pb-4 border-t border-gray-100">
              <div class="space-y-3 mt-3">
                <label class="flex items-center">
                  <input
                    type="checkbox"
                    v-model="notifications.sms"
                    class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  >
                  <span class="ml-2 text-sm text-gray-800">SMS-Benachrichtigungen</span>
                </label>
                <label class="flex items-center">
                  <input
                    type="checkbox"
                    v-model="notifications.email"
                    class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  >
                  <span class="ml-2 text-sm text-gray-800">E-Mail-Benachrichtigungen</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="sticky bottom-0 bg-gray-50 px-6 py-4 border-t flex justify-between">
        <button
          @click="$emit('close')"
          class="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors font-medium"
        >
          Abbrechen
        </button>
        <button
          @click="saveAllSettings"
          :disabled="isSaving"
          class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {{ isSaving ? 'Speichern...' : 'Speichern' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { getSupabase } from '~/utils/supabase'

interface Props {
  currentUser: any
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  'settings-updated': []
}>()

// State
const isLoading = ref(false)
const isSaving = ref(false)
const error = ref<string | null>(null)
const saveSuccess = ref(false)

// Accordion State
const openSections = reactive({
  locations: false,
  categories: false,
  durations: false,
  worktime: false,
  notifications: false
})

// Data
const availableCategories = ref<any[]>([])
const selectedCategories = ref<number[]>([])
const myLocations = ref<any[]>([])
const categoryDurations = ref<Record<string, number[]>>({})
const workingHours = ref({ start: '08:00', end: '18:00' })
const availableDays = ref<number[]>([1, 2, 3, 4, 5]) // Mo-Fr
const notifications = ref({ sms: true, email: true })

// New Location
const newLocationName = ref('')
const newLocationAddress = ref('')

// Constants
const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

// Computed
const filteredCategoriesForDurations = computed(() => {
  return availableCategories.value.filter(cat => 
    selectedCategories.value.includes(cat.id)
  )
})

// Methods
const toggleSection = (section: keyof typeof openSections) => {
  openSections[section] = !openSections[section]
}

const getAllPossibleDurations = () => {
  const durations = [45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240]
  return durations.map(duration => ({
    value: duration,
    label: duration >= 120 
      ? `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? duration % 60 + 'min' : ''}`.trim() 
      : `${duration}min`
  }))
}

const getRelevantDurations = (category: any) => {
  // Zeige nur relevante Dauern basierend auf Kategorie
  const allDurations = getAllPossibleDurations()
  const baseMinutes = category.lesson_duration_minutes || 45
  
  if (baseMinutes <= 45) {
    return allDurations.filter(d => d.value <= 135)
  } else if (baseMinutes <= 90) {
    return allDurations.filter(d => d.value >= 90 && d.value <= 180)
  } else {
    return allDurations.filter(d => d.value >= 135)
  }
}

const isDurationSelectedForCategory = (categoryCode: string, duration: number) => {
  return categoryDurations.value[categoryCode]?.includes(duration) || false
}

const toggleDurationForCategory = (categoryCode: string, duration: number) => {
  if (!categoryDurations.value[categoryCode]) {
    categoryDurations.value[categoryCode] = []
  }
  
  const index = categoryDurations.value[categoryCode].indexOf(duration)
  if (index > -1) {
    categoryDurations.value[categoryCode].splice(index, 1)
  } else {
    categoryDurations.value[categoryCode].push(duration)
    categoryDurations.value[categoryCode].sort((a, b) => a - b)
  }
}

const toggleCategory = (categoryId: number) => {
  const index = selectedCategories.value.indexOf(categoryId)
  if (index > -1) {
    selectedCategories.value.splice(index, 1)
  } else {
    selectedCategories.value.push(categoryId)
  }
}

const toggleDay = (dayNumber: number) => {
  const index = availableDays.value.indexOf(dayNumber)
  if (index > -1) {
    availableDays.value.splice(index, 1)
  } else {
    availableDays.value.push(dayNumber)
  }
}

const addLocation = async () => {
  if (!newLocationName.value || !newLocationAddress.value) return

  try {
    console.log('🔥 Adding new location:', newLocationName.value)
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('locations')
      .insert({
        name: newLocationName.value,
        address: newLocationAddress.value,
        staff_id: props.currentUser.id
      })
      .select()
      .single()

    if (error) throw error

    myLocations.value.push(data)
    newLocationName.value = ''
    newLocationAddress.value = ''
    console.log('✅ Location added successfully')
  } catch (err: any) {
    console.error('❌ Error adding location:', err)
    error.value = `Fehler beim Hinzufügen: ${err.message}`
  }
}

const removeLocation = async (locationId: string) => {
  try {
    console.log('🔥 Removing location:', locationId)
    const supabase = getSupabase()
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', locationId)

    if (error) throw error

    myLocations.value = myLocations.value.filter(loc => loc.id !== locationId)
    console.log('✅ Location removed successfully')
  } catch (err: any) {
    console.error('❌ Error removing location:', err)
    error.value = `Fehler beim Entfernen: ${err.message}`
  }
}

const loadData = async () => {
  if (!props.currentUser?.id) return

  isLoading.value = true
  error.value = null

  try {
    const supabase = getSupabase()

    console.log('🔥 Loading staff settings data...')

    // Kategorien laden
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order')

    if (categoriesError) throw categoriesError
    availableCategories.value = categories || []

    // Standorte laden
    const { data: locations, error: locationsError } = await supabase
      .from('locations')
      .select('*')
      .eq('staff_id', props.currentUser.id)

    if (locationsError) throw locationsError
    myLocations.value = locations || []

    // Zugewiesene Kategorien laden
    const { data: staffCategories, error: staffCatError } = await supabase
      .from('staff_categories')
      .select('category_id')
      .eq('staff_id', props.currentUser.id)
      .eq('is_active', true)

    if (staffCatError) throw staffCatError
    selectedCategories.value = staffCategories?.map(sc => sc.category_id) || []

    // Lektionsdauern laden
    const { data: durations, error: durationsError } = await supabase
      .from('staff_category_durations')
      .select('category_code, duration_minutes')
      .eq('staff_id', props.currentUser.id)
      .eq('is_active', true)

    if (durationsError) throw durationsError

    const grouped: Record<string, number[]> = {}
    durations?.forEach(item => {
      if (!grouped[item.category_code]) {
        grouped[item.category_code] = []
      }
      grouped[item.category_code].push(item.duration_minutes)
    })
    categoryDurations.value = grouped

    // Staff Settings laden (falls vorhanden)
    const { data: settings, error: settingsError } = await supabase
      .from('staff_settings')
      .select('*')
      .eq('staff_id', props.currentUser.id)
      .maybeSingle()

    if (settingsError && !settingsError.message.includes('does not exist')) {
      console.warn('⚠️ Staff settings error:', settingsError.message)
    }

    if (settings) {
      workingHours.value = {
        start: settings.work_start_time || '08:00',
        end: settings.work_end_time || '18:00'
      }
      availableDays.value = settings.available_weekdays 
        ? settings.available_weekdays.split(',').map(Number)
        : [1, 2, 3, 4, 5]
      notifications.value = {
        sms: settings.sms_notifications ?? true,
        email: settings.email_notifications ?? true
      }
    }

    console.log('✅ All data loaded successfully')

  } catch (err: any) {
    console.error('❌ Error loading data:', err)
    error.value = `Fehler beim Laden: ${err.message}`
  } finally {
    isLoading.value = false
  }
}

const saveAllSettings = async () => {
  if (!props.currentUser?.id) return

  isSaving.value = true
  error.value = null
  saveSuccess.value = false

  try {
    const supabase = getSupabase()

    // 1. Staff-Kategorien speichern
    console.log('🔥 Saving staff categories...', selectedCategories.value)
    
    // Erst alle alten löschen
    const { error: deleteError } = await supabase
      .from('staff_categories')
      .delete()
      .eq('staff_id', props.currentUser.id)

    if (deleteError) throw deleteError

    // Dann neue einfügen
    if (selectedCategories.value.length > 0) {
      const categoryData = selectedCategories.value.map(categoryId => ({
        staff_id: props.currentUser.id,
        category_id: categoryId,
        is_active: true
      }))

      const { error: insertError } = await supabase
        .from('staff_categories')
        .insert(categoryData)

      if (insertError) throw insertError
      console.log('✅ Staff categories saved:', categoryData.length)
    }

    // 2. Lektionsdauern speichern
    console.log('🔥 Saving lesson durations...', categoryDurations.value)
    
    // Erst alle alten löschen
    const { error: deleteDurationsError } = await supabase
      .from('staff_category_durations')
      .delete()
      .eq('staff_id', props.currentUser.id)

    if (deleteDurationsError) throw deleteDurationsError

    // Dann neue einfügen
    const durationData = []
    for (const [categoryCode, durations] of Object.entries(categoryDurations.value)) {
      for (const duration of durations) {
        durationData.push({
          staff_id: props.currentUser.id,
          category_code: categoryCode,
          duration_minutes: duration,
          is_active: true
        })
      }
    }

    if (durationData.length > 0) {
      const { error: insertDurationsError } = await supabase
        .from('staff_category_durations')
        .insert(durationData)

      if (insertDurationsError) throw insertDurationsError
      console.log('✅ Lesson durations saved:', durationData.length)
    }

    // 3. Staff Settings speichern (falls Tabelle existiert)
    console.log('🔥 Saving staff settings...')
    
    const settingsData = {
      staff_id: props.currentUser.id,
      work_start_time: workingHours.value.start,
      work_end_time: workingHours.value.end,
      available_weekdays: availableDays.value.join(','),
      sms_notifications: notifications.value.sms,
      email_notifications: notifications.value.email,
      updated_at: new Date().toISOString()
    }

    // Erst prüfen ob Eintrag existiert
    const { data: existingSettings } = await supabase
      .from('staff_settings')
      .select('id')
      .eq('staff_id', props.currentUser.id)
      .maybeSingle()

    if (existingSettings) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('staff_settings')
        .update({
          work_start_time: workingHours.value.start,
          work_end_time: workingHours.value.end,
          available_weekdays: availableDays.value.join(','),
          sms_notifications: notifications.value.sms,
          email_notifications: notifications.value.email,
          updated_at: new Date().toISOString()
        })
        .eq('staff_id', props.currentUser.id)

      if (updateError) throw updateError
      console.log('✅ Staff settings updated')
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('staff_settings')
        .insert(settingsData)

      if (insertError) throw insertError
      console.log('✅ Staff settings created')
    }

    console.log('✅ All settings saved successfully!')
    saveSuccess.value = true
    emit('settings-updated')
    setTimeout(() => emit('close'), 1000)
    
    // Modal automatisch schließen nach erfolgreichem Speichern
    setTimeout(() => {
      saveSuccess.value = false
      emit('close')
    }, 1500)

  } catch (err: any) {
    console.error('❌ Error saving settings:', err)
    error.value = `Fehler beim Speichern: ${err.message}`
  } finally {
    isSaving.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadData()
})
</script>

<style scoped>
/* Modal backdrop animation */
.modal-backdrop {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Smooth transitions */
.transition-colors {
  transition: all 0.2s ease-in-out;
}

/* Hide default checkbox styling for custom design */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>```

### ./components/StudentDetailModal.vue
```vue
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

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('de-CH')
}

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  return `${date.toLocaleDateString('de-CH')} ${date.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}`
}

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('de-CH', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

// Watchers
watch(() => props.show && props.student, (newValue) => {
  if (newValue) {
    loadStudentData()
  }
}, { immediate: true })
</script>```

### ./components/StudentSelector.vue
```vue
<template>
  <div class="student-selector">
    <!-- Toggle nur anzeigen wenn kein Student ausgewählt -->
    <div 
      v-if="!selectedStudent && currentUser?.role === 'staff'"
      class="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg border"
    >
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
        </svg>
        <span class="text-sm font-medium text-gray-700">
          Alle Schüler anzeigen
        </span>
      </div>
      
      <!-- Toggle Switch -->
      <label class="relative inline-flex items-center cursor-pointer">
        <input 
          type="checkbox" 
          v-model="showAllStudentsLocal"
          class="sr-only peer"
        >
        <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
      </label>
    </div>
    
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div class="flex justify-between items-center mb-3">
        <label class="block text-sm font-semibold text-gray-900">
          🎓 Fahrschüler auswählen
        </label>
       <button 
          @click="handleSwitchToOther"
          :disabled="isLoading || availableStudents.length === 0"
          class="text-xs text-blue-600 font-bold hover:text-blue-800 border-solid border-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          Andere Terminart
        </button>
      </div>
      
      <!-- Ausgewählter Schüler Anzeige (oben) -->
      <div v-if="selectedStudent" class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div class="flex justify-between items-start">
          <div>
            <div class="font-semibold text-green-800">
              {{ selectedStudent.first_name }} {{ selectedStudent.last_name }}
            </div>
            <div class="text-sm text-green-600">
              Kat. {{ selectedStudent.category }} | {{ selectedStudent.phone }}
            </div>
          </div>
          <button @click="clearStudent" class="text-red-500 hover:text-red-700">
            ✕
          </button>
        </div>
      </div>

      <!-- Suchfeld - nur wenn kein Schüler ausgewählt -->
      <div v-if="!selectedStudent" class="mb-3">
        <input
          v-model="searchQuery"
          @focus="handleSearchFocus"
          @input="filterStudents"
          type="text"
          placeholder="Schüler suchen (Name, E-Mail oder Telefon)..."
          autocomplete="off"
          class="w-full p-3 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <!-- Manual Load Button - nur wenn autoLoad false und keine Students geladen -->
      <div v-if="!shouldAutoLoadComputed && availableStudents.length === 0 && !isLoading && !selectedStudent" class="mb-3">
        <button 
          @click="loadStudents()"
          class="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          👥 Schüler laden
        </button>
      </div>

      <!-- Scrollbare Schülerliste - nur wenn kein Schüler ausgewählt -->
      <div v-if="!selectedStudent" class="border border-gray-300 rounded-lg bg-white">
        <!-- Loading State -->
        <div v-if="isLoading" class="text-center py-8">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p class="text-sm text-gray-600">Schüler werden geladen...</p>
        </div>

        <!-- No Students State -->
        <div v-else-if="studentList.length === 0" class="text-center py-8 text-gray-500">
          <span class="text-3xl mb-2 block">👨‍🎓</span>
          <p class="text-sm">
            {{ searchQuery ? 'Keine Schüler gefunden' : (!shouldAutoLoadComputed ? 'Klicken Sie "Schüler laden" um die Liste anzuzeigen' : 'Keine Schüler verfügbar') }}
          </p>
        </div>

        <!-- Schülerliste -->
        <div v-else class="max-h-64 overflow-y-auto">
          <div 
            v-for="student in studentList" 
            :key="student.id"
            @click="selectStudent(student)"
            :class="[
              'p-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors',
              'hover:bg-blue-50'
            ]"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="font-semibold text-gray-900">
                  {{ student.first_name }} {{ student.last_name }}
                </div>
                <div class="text-sm text-gray-500 flex items-center gap-2">
                  <span>{{ student.phone }}</span>
                  <span>•</span>
                  <span class="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-medium">
                    Kat. {{ student.category }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Liste Statistiken -->
        <div v-if="!isLoading && studentList.length > 0" class="bg-gray-50 border-t border-gray-200 px-3 py-2">
          <div class="text-xs text-gray-500 text-center">
            {{ studentList.length }} von {{ availableStudents.length }} Schüler
            <span v-if="searchQuery">• Gefiltert nach "{{ searchQuery }}"</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { getSupabase } from '~/utils/supabase'

// Student Interface
interface Student {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  category: string
  assigned_staff_id: string
  preferred_location_id?: string
  preferred_duration?: number 
}

// Props
interface Props {
  modelValue?: Student | null
  currentUser?: any
  disabled?: boolean
  placeholder?: string
  autoLoad?: boolean
  showAllStudents?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  disabled: false,
  placeholder: 'Schüler suchen (Name, E-Mail oder Telefon)...',
  autoLoad: true,
  showAllStudents: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [student: Student | null]
  'student-selected': [student: Student]
  'student-cleared': []
  'switch-to-other': []
}>()

// State
const searchQuery = ref('')
const availableStudents = ref<Student[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const showAllStudentsLocal = ref(props.showAllStudents)

// Computed
const selectedStudent = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const studentList = computed(() => {
  if (!searchQuery.value) {
    return availableStudents.value
  }
  
  const query = searchQuery.value.toLowerCase()
  return availableStudents.value.filter(student =>
    student.first_name?.toLowerCase().includes(query) ||
    student.last_name?.toLowerCase().includes(query) ||
    student.email?.toLowerCase().includes(query) ||
    student.phone?.includes(query)
  )
})

// 🔥 FIX: Better auto-load logic
const shouldAutoLoadComputed = computed(() => {
  return props.autoLoad
})

// Supabase Types
interface UserFromDB {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  category: string | null
  assigned_staff_id: string | null
  preferred_location_id: string | null
  role: 'client' | 'staff' | 'admin'
  is_active: boolean
}

interface AppointmentResponse {
  user_id: string
  users: UserFromDB | null
}

// Methods
const loadStudents = async (editStudentId?: string | null) => {
  console.log('🔄 Loading students...', { 
    showAll: showAllStudentsLocal.value,
    editMode: !!editStudentId,
    editStudentId: editStudentId,
    currentUserId: props.currentUser?.id,
    currentUserRole: props.currentUser?.role,
    autoLoad: props.autoLoad
  })
  
  if (isLoading.value) return
  isLoading.value = true
  error.value = null
  
  try {
    console.log('📚 StudentSelector: Loading students...')
    const supabase = getSupabase()

    // Staff-spezifische Logik
    if (props.currentUser?.role === 'staff' && !showAllStudentsLocal.value) {
      console.log('👨‍🏫 Loading students for staff member:', props.currentUser.id)
      
      // 1. Direkt zugewiesene Schüler laden
      const { data: assignedStudents, error: assignedError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, phone, category, assigned_staff_id, preferred_location_id, role, is_active')
        .eq('role', 'client')
        .eq('is_active', true)
        .eq('assigned_staff_id', props.currentUser.id)
        .order('first_name')

      if (assignedError) throw assignedError

      // 2. Schüler mit Termin-Historie laden
      const { data: appointmentStudents, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          user_id,
          users!appointments_user_id_fkey (
            id, first_name, last_name, email, phone, category, 
            assigned_staff_id, preferred_location_id, role, is_active
          )
        `)
        .eq('staff_id', props.currentUser.id)
        .not('users.id', 'is', null)

      if (appointmentError) throw appointmentError

      const typedAppointmentStudents = appointmentStudents as unknown as AppointmentResponse[]
      
      const historyStudents = typedAppointmentStudents
        .map(apt => apt.users)
        .filter((user): user is UserFromDB => {
          return user !== null && 
                 user.role === 'client' && 
                 user.is_active === true
        })

      console.log('📊 Student loading results:', {
        assignedStudents: assignedStudents?.length || 0,
        appointmentStudents: typedAppointmentStudents?.length || 0,
        historyStudents: historyStudents.length
      })

      // 3. Kombinieren und Duplikate entfernen
      const allStudentIds = new Set<string>()
      const combinedStudents: Student[] = []

      if (assignedStudents) {
        assignedStudents.forEach((student: UserFromDB) => {
          if (!allStudentIds.has(student.id)) {
            allStudentIds.add(student.id)
            combinedStudents.push({
              id: student.id,
              first_name: student.first_name || '',
              last_name: student.last_name || '',
              email: student.email || '',
              phone: student.phone || '',
              category: student.category || '',
              assigned_staff_id: student.assigned_staff_id || '',
              preferred_location_id: student.preferred_location_id || undefined
            })
          }
        })
      }

      historyStudents.forEach(student => {
        if (student && !allStudentIds.has(student.id)) {
          allStudentIds.add(student.id)
          combinedStudents.push({
            id: student.id,
            first_name: student.first_name || '',
            last_name: student.last_name || '',
            email: student.email || '',
            phone: student.phone || '',
            category: student.category || '',
            assigned_staff_id: student.assigned_staff_id || '',
            preferred_location_id: student.preferred_location_id || undefined
          })
        }
      })

      // 4. Edit-Mode: Spezifischen Student hinzufügen
      if (editStudentId && !allStudentIds.has(editStudentId)) {
        console.log('✏️ Loading specific student for edit mode:', editStudentId)
        const { data: specificStudent, error: specificError } = await supabase
          .from('users')
          .select('id, first_name, last_name, email, phone, category, assigned_staff_id, preferred_location_id, role, is_active')
          .eq('id', editStudentId)
          .eq('role', 'client')
          .single()

        if (!specificError && specificStudent) {
          const typedSpecificStudent = specificStudent as UserFromDB
          combinedStudents.push({
            id: typedSpecificStudent.id,
            first_name: typedSpecificStudent.first_name || '',
            last_name: typedSpecificStudent.last_name || '',
            email: typedSpecificStudent.email || '',
            phone: typedSpecificStudent.phone || '',
            category: typedSpecificStudent.category || '',
            assigned_staff_id: typedSpecificStudent.assigned_staff_id || '',
            preferred_location_id: typedSpecificStudent.preferred_location_id || undefined
          })
        }
      }

      // Sortieren nach Vorname
      combinedStudents.sort((a, b) => 
        (a.first_name || '').localeCompare(b.first_name || '')
      )

      availableStudents.value = combinedStudents

      console.log('✅ Staff students loaded:', {
        total: combinedStudents.length,
        assigned: combinedStudents.filter(s => s.assigned_staff_id === props.currentUser.id).length,
        fromHistory: combinedStudents.filter(s => s.assigned_staff_id !== props.currentUser.id).length
      })

    } else {
      // Standard-Logik für alle Schüler oder andere Rollen
      let query = supabase
        .from('users')
        .select('id, first_name, last_name, email, phone, category, assigned_staff_id, preferred_location_id, role, is_active')
        .eq('role', 'client')
        .eq('is_active', true)
        .order('first_name')

      if (editStudentId && props.currentUser?.role === 'staff') {
        query = query.or(`assigned_staff_id.eq.${props.currentUser.id},id.eq.${editStudentId}`)
      }

      const { data, error: fetchError } = await query
      if (fetchError) throw fetchError
      
      const typedStudents: Student[] = (data || []).map((user: UserFromDB) => ({
        id: user.id,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        category: user.category || '',
        assigned_staff_id: user.assigned_staff_id || '',
        preferred_location_id: user.preferred_location_id || undefined
      }))
      
      availableStudents.value = typedStudents
      console.log('✅ All students loaded:', availableStudents.value.length)
    }

  } catch (err: any) {
    console.error('❌ StudentSelector: Error loading students:', err)
    error.value = err.message || 'Fehler beim Laden der Schüler'
    availableStudents.value = []
  } finally {
    isLoading.value = false
  }
}

const handleSwitchToOther = () => {
  console.log('🔄 User manually clicked "Andere Terminart" button')
  
  // Nur wenn Studenten geladen sind und kein Student ausgewählt ist
  if (!isLoading.value && availableStudents.value.length > 0 && !selectedStudent.value) {
    emit('switch-to-other')
  }
}

// 🔥 FIX: Enhanced Search Focus Handler
const handleSearchFocus = () => {
  console.log('🔍 Search field focused, autoLoad:', shouldAutoLoadComputed.value)
  
  if (shouldAutoLoadComputed.value && availableStudents.value.length === 0) {
    console.log('📚 Auto-loading students on search focus')
    loadStudents()
  } else if (!shouldAutoLoadComputed.value) {
    console.log('🚫 Auto-load disabled - user must manually trigger loading')
  }
}

const filterStudents = () => {
  // Diese Funktion ist jetzt leer, da wir computed verwenden
  // Wird aber für Kompatibilität beibehalten
}

const selectStudent = (student: Student) => {
  selectedStudent.value = student
  searchQuery.value = ''
  
  console.log('✅ StudentSelector: Student selected:', student.first_name, student.last_name)
  emit('student-selected', student)
}

const clearStudent = () => {
  selectedStudent.value = null
  searchQuery.value = ''
  
  console.log('🗑️ StudentSelector: Student cleared')
  emit('student-cleared')
}

const selectStudentById = async (userId: string, retryCount = 0) => {
  const maxRetries = 3
  console.log(`👨‍🎓 StudentSelector: Selecting student by ID: ${userId}, Retry: ${retryCount}`)
  
  while (isLoading.value) {
    console.log('⏳ Waiting for current loading to finish...')
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  if (availableStudents.value.length === 0 && retryCount < maxRetries) {
    console.log('⏳ Students not loaded yet, loading first...')
    await loadStudents(userId)
  }
  
  while (isLoading.value) {
    console.log('⏳ Waiting for loading to complete...')
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  const student = availableStudents.value.find(s => s.id === userId)
  
  if (student) {
    selectStudent(student)
    console.log('✅ StudentSelector: Student selected by ID:', student.first_name, student.last_name)
    return student
  } else {
    console.log('❌ StudentSelector: Student not found for ID:', userId)
    if (retryCount < maxRetries) {
      console.log('🔄 Retrying to find student...')
      await new Promise(resolve => setTimeout(resolve, 200))
      return selectStudentById(userId, retryCount + 1)
    }
    return null
  }
}

// Watchers
watch(showAllStudentsLocal, async () => {
  console.log('🔄 Toggle changed:', showAllStudentsLocal.value)
  await loadStudents()
})

// 🔥 FIX: Enhanced onMounted with better auto-load logic
onMounted(() => {
  console.log('📚 StudentSelector mounted, autoLoad:', shouldAutoLoadComputed.value)
  
  if (shouldAutoLoadComputed.value) {
    console.log('🔄 Auto-loading students on mount')
    loadStudents()
  } else {
    console.log('🚫 Auto-load disabled, waiting for user action')
  }
})

// 🔥 NEW: Watch for autoLoad prop changes
watch(() => props.autoLoad, (newAutoLoad) => {
  console.log('🔄 autoLoad prop changed to:', newAutoLoad)
  
  if (newAutoLoad && availableStudents.value.length === 0) {
    console.log('🔄 autoLoad enabled - loading students')
    loadStudents()
  }
}, { immediate: true })

// Expose methods for parent components
defineExpose({
  loadStudents,
  clearStudent,
  selectStudent,
  selectStudentById,
})
</script>```

### ./components/TimeSelector.vue
```vue
<!-- TimeSelector.vue -->
<template>
  <div v-if="shouldShow" class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Datum -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          📅 Datum
        </label>
        <input
          :value="startDate"
          @input="updateStartDate(($event.target as HTMLInputElement)?.value || '')"
          type="date"
          :min="minDate"
          class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          :disabled="disabled"
        />
      </div>

      <!-- Startzeit -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          🕐 Startzeit
        </label>
        <input
          :value="startTime"
          @input="updateStartTime(($event.target as HTMLInputElement)?.value || '')"
          type="time"
          class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          :disabled="disabled"
        />
      </div>

      <!-- Endzeit -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          🕐 Endzeit
        </label>
        <input
          :value="endTime"
          type="time"
          class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          :disabled="disabled"
        />
        <div v-if="durationMinutes" class="text-xs text-gray-500 mt-1">
          Dauer: {{ durationMinutes }} Minuten
        </div>
      </div>
    </div>

    <!-- Zeitkonflikt Warnung -->
    <div v-if="timeConflictWarning" class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
      <div class="flex items-center gap-2">
        <span class="text-yellow-600">⚠️</span>
        <span class="text-sm text-yellow-800">{{ timeConflictWarning }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'

interface Props {
  startDate: string
  startTime: string
  endTime: string
  durationMinutes: number
  disabled?: boolean
  eventType?: 'lesson' | 'staff_meeting' | 'other'
  selectedStudent?: any
  selectedSpecialType?: string
  mode?: 'create' | 'edit' | 'view'
}

interface Emits {
  (e: 'update:startDate', value: string): void
  (e: 'update:startTime', value: string): void
  (e: 'update:endTime', value: string): void
  (e: 'time-changed', data: { startDate: string, startTime: string, endTime: string }): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  eventType: 'lesson',
  mode: 'create'
})

const emit = defineEmits<Emits>()

// Computed Properties
const shouldShow = computed(() => {
  if (props.eventType === 'lesson') {
    return !!props.selectedStudent
  } else {
    return !!props.selectedSpecialType
  }
})

const minDate = computed(() => {
  const today = new Date()
  return today.toISOString().split('T')[0]
})

const timeConflictWarning = computed(() => {
  if (!props.startDate || !props.startTime) return ''
  
  const selectedDateTime = new Date(`${props.startDate}T${props.startTime}`)
  const now = new Date()
  
  if (selectedDateTime < now) {
    return 'Die gewählte Zeit liegt in der Vergangenheit'
  }
  
  const dayOfWeek = selectedDateTime.getDay()
  const hour = selectedDateTime.getHours()
  
  // Warnung für Wochenenden
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return 'Termin am Wochenende - bitte prüfen Sie die Verfügbarkeit'
  }
  
  // Warnung für ungewöhnliche Zeiten
  if (hour < 7 || hour > 20) {
    return 'Ungewöhnliche Uhrzeit - bitte prüfen Sie die Geschäftszeiten'
  }
  
  return ''
})

const suggestedTimes = computed(() => {
  if (props.disabled || !props.startDate) return []
  
  // Standard Fahrstunden-Zeiten
  if (props.eventType === 'lesson') {
    return ['08:00', '10:00', '13:00', '15:00', '17:00', '19:00']
  }
  
  // Für Staff Meetings
  if (props.eventType === 'staff_meeting') {
    return ['09:00', '11:00', '14:00', '16:00']
  }
  
  // Für andere Terminarten
  return ['09:00', '11:00', '14:00', '16:00', '18:00']
})

// Methods
const updateStartDate = (value: string) => {
  emit('update:startDate', value)
  calculateEndTime(value, props.startTime)
}

const updateStartTime = (value: string) => {
  emit('update:startTime', value)
  calculateEndTime(props.startDate, value)
}

const calculateEndTime = (date: string, time: string) => {
  if (!date || !time || !props.durationMinutes) return
  
  const [hours, minutes] = time.split(':').map(Number)
  const startDate = new Date(`${date}T${time}`)
  
  const endDate = new Date(startDate.getTime() + props.durationMinutes * 60000)
  const endTime = endDate.toTimeString().slice(0, 5)
  
  emit('update:endTime', endTime)
  emit('time-changed', {
    startDate: date,
    startTime: time,
    endTime: endTime
  })
}

const selectSuggestedTime = (time: string) => {
  updateStartTime(time)
}

// Watchers
watch(() => props.durationMinutes, () => {
  if (props.startDate && props.startTime) {
    calculateEndTime(props.startDate, props.startTime)
  }
})

// Expose für Parent-Component
defineExpose({
  calculateEndTime,
  suggestedTimes
})
</script>

<style scoped>
input:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

input:disabled {
  background-color: #f9fafb;
  color: #6b7280;
  cursor: not-allowed;
}

button:hover:not(:disabled) {
  transform: translateY(-1px);
  transition: all 0.2s ease;
}

.transition-colors {
  transition: color 0.2s ease-in-out, background-color 0.2s ease-in-out;
}
</style>```

### ./components/TitleInput.vue
```vue
<!-- TitleInput.vue -->
<template>
  <div v-if="shouldShow" class="space-y-2">
    <label class="block text-sm font-medium text-gray-700 mb-2">
      📝 {{ labelText }}
    </label>
    
    <input
      :value="title"
      @input="updateTitle(($event.target as HTMLInputElement)?.value || '')"
      @blur="handleBlur"
      type="text"
      class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
      :placeholder="computedPlaceholder"
      :disabled="disabled"
      :maxlength="maxLength"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

interface Props {
  title: string
  eventType: 'lesson' | 'staff_meeting' | 'other'
  selectedStudent?: any
  selectedSpecialType?: string
  categoryCode?: string
  selectedLocation?: any
  disabled?: boolean
  maxLength?: number
  showSuggestions?: boolean
  showCharacterCount?: boolean
  autoGenerate?: boolean
}

interface Emits {
  (e: 'update:title', value: string): void
  (e: 'title-generated', title: string): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  maxLength: 100,
  showSuggestions: true,
  showCharacterCount: true,
  autoGenerate: true
})

const emit = defineEmits<Emits>()

// State
const currentSuggestion = ref('')

// Computed Properties
const shouldShow = computed(() => {
  if (props.eventType === 'lesson') {
    return !!props.selectedStudent
  } else {
    return !!props.selectedSpecialType
  }
})

const labelText = computed(() => {
  switch (props.eventType) {
    case 'lesson': return 'Titel der Fahrstunde'
    case 'staff_meeting': return 'Meeting Titel'
    case 'other': return 'Titel des Termins'
    default: return 'Titel'
  }
})

const computedPlaceholder = computed(() => {
  if (!shouldShow.value) return ''
  
  if (props.eventType === 'lesson' && props.selectedStudent) {
    const name = `${props.selectedStudent.first_name} ${props.selectedStudent.last_name}`
    const location = props.selectedLocation?.name || 'Treffpunkt'
    return `${name} - ${location}`
  }
  
  if (props.eventType === 'other' && props.selectedSpecialType) {
    return props.selectedSpecialType
  }
  
  return 'Titel eingeben...'
})

const suggestions = computed(() => {
  if (!shouldShow.value) return []
  
  if (props.eventType === 'lesson' && props.selectedStudent) {
    const firstName = props.selectedStudent.first_name
    const lastName = props.selectedStudent.last_name
    const fullName = `${firstName} ${lastName}`
    const category = props.categoryCode ? ` ${props.categoryCode}` : ''
    const location = props.selectedLocation?.name || props.selectedLocation?.address || 'Treffpunkt'
    
    return [
      `${fullName} - ${location}`,
      `${fullName} - Fahrstunde ${location}`,
      `${firstName} ${lastName} - ${location}${category}`,
      `${fullName} - Übungsfahrt ${location}`,
      `${fullName} - Prüfungsvorbereitung ${location}`,
      `${firstName} ${lastName} - Erste Fahrstunde ${location}`,
      `${fullName} - Autobahnfahrt ab ${location}`,
      `${firstName} ${lastName} - Nachtfahrt ${location}`
    ]
  }
  
  if (props.eventType === 'staff_meeting') {
    return [
      'Team Meeting',
      'Wochenplanung',
      'Kundenbesprechu',
      'Qualitätssicherung',
      'Fahrzeugkontrolle',
      'Administration'
    ]
  }
  
  if (props.eventType === 'other') {
    return [
      'Beratung',
      'Theorieunterricht',
      'Fahrzeugwartung',
      'Prüfung',
      'Verwaltung',
      'Pause'
    ]
  }
  
  return []
})

const validationMessage = computed(() => {
  if (!props.title) return ''
  
  if (props.title.length < 3) {
    return '⚠️ Titel sollte mindestens 3 Zeichen haben'
  }
  
  if (props.title.length > props.maxLength) {
    return `❌ Titel ist zu lang (max. ${props.maxLength} Zeichen)`
  }
  
  if (props.title.length > props.maxLength * 0.8) {
    return `⚠️ Titel wird lang (${props.title.length}/${props.maxLength})`
  }
  
  return '✅ Titel ist gültig'
})

const validationClass = computed(() => {
  if (!props.title) return ''
  
  if (props.title.length < 3 || props.title.length > props.maxLength) {
    return 'text-red-600'
  }
  
  if (props.title.length > props.maxLength * 0.8) {
    return 'text-yellow-600'
  }
  
  return 'text-green-600'
})

const showSuggestions = computed(() => {
  return props.showSuggestions && !props.title && suggestions.value.length > 0
})

// Methods
const updateTitle = (value: string) => {
  emit('update:title', value)
}

const selectSuggestion = (suggestion: string) => {
  emit('update:title', suggestion)
  emit('title-generated', suggestion)
}

const handleBlur = () => {
  // Auto-generate title if empty and auto-generate is enabled
  if (!props.title && props.autoGenerate && suggestions.value.length > 0) {
    const autoTitle = suggestions.value[0]
    emit('update:title', autoTitle)
    emit('title-generated', autoTitle)
  }
}

// Set random suggestion as tip
const updateSuggestion = () => {
  if (suggestions.value.length > 0) {
    const randomIndex = Math.floor(Math.random() * suggestions.value.length)
    currentSuggestion.value = suggestions.value[randomIndex]
  }
}

// Update suggestion when suggestions change
watch(() => suggestions.value, updateSuggestion, { immediate: true })

// Auto-generate title when key data changes
watch([
  () => props.selectedStudent,
  () => props.selectedLocation,
  () => props.selectedSpecialType
], () => {
  if (props.autoGenerate && suggestions.value.length > 0) {
    // Only auto-update if title is empty or matches old pattern
    if (!props.title || shouldAutoUpdate()) {
      const newTitle = suggestions.value[0]
      emit('update:title', newTitle)
      emit('title-generated', newTitle)
    }
  }
}, { deep: true })

// Helper function to determine if we should auto-update
const shouldAutoUpdate = (): boolean => {
  // Auto-update if current title matches a previous suggestion pattern
  if (props.eventType === 'lesson' && props.selectedStudent) {
    const firstName = props.selectedStudent.first_name
    const lastName = props.selectedStudent.last_name
    return props.title.includes(firstName) || props.title.includes(lastName)
  }
  return false
}

// Expose für Parent-Component
defineExpose({
  suggestions,
  selectSuggestion,
  updateSuggestion
})
</script>

<style scoped>
input:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

input:disabled {
  background-color: #f9fafb;
  color: #6b7280;
  cursor: not-allowed;
}

button:hover:not(:disabled) {
  transform: translateY(-1px);
  transition: all 0.2s ease;
}

.transition-colors {
  transition: color 0.2s ease-in-out, background-color 0.2s ease-in-out, border-color 0.2s ease-in-out;
}

/* Smooth fade-in for suggestions */
.space-y-2 > div {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>```

### ./components/admin/UserPaymentDetails.vue
```vue
<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <!-- Back Button & Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <NuxtLink 
              to="/admin/payment-overview" 
              class="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
              </svg>
              Zurück zur Übersicht
            </NuxtLink>
            
            <div>
              <h1 class="text-3xl font-bold text-gray-900">
                👤 {{ displayName }}
              </h1>
              <p class="mt-2 text-gray-600">Detaillierte Zahlungsübersicht und Rechnungshistorie</p>
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div class="flex space-x-3">
            <button 
              @click="sendPaymentReminder"
              :disabled="!hasUnpaidAppointments || isLoading"
              class="inline-flex items-center px-4 py-2 border border-orange-300 rounded-md shadow-sm text-sm font-medium text-orange-700 bg-white hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
              Zahlungserinnerung senden
            </button>
            
            <button 
              @click="refreshData"
              :disabled="isLoading"
              class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              <svg v-if="isLoading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <svg v-else class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              {{ isLoading ? 'Laden...' : 'Aktualisieren' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading && !userDetails" class="bg-white shadow rounded-lg">
        <div class="px-6 py-12 text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p class="text-gray-600">Benutzerdaten werden geladen...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-white shadow rounded-lg">
        <div class="px-6 py-12 text-center">
          <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Fehler beim Laden</h3>
          <p class="text-gray-600 mb-4">{{ error }}</p>
          <button 
            @click="refreshData"
            class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
          >
            Erneut versuchen
          </button>
        </div>
      </div>

      <!-- Main Content -->
      <div v-else class="space-y-8">
        
        <!-- User Info Card -->
        <div class="bg-white shadow rounded-lg overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg leading-6 font-medium text-gray-900">Benutzerinformationen</h3>
          </div>
          <div class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <dt class="text-sm font-medium text-gray-500">Name</dt>
                <dd class="mt-1 text-sm text-gray-900">{{ displayName }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">E-Mail</dt>
                <dd class="mt-1 text-sm text-gray-900">
                  <a :href="emailLink" class="text-blue-600 hover:text-blue-800">
                    {{ displayEmail }}
                  </a>
                </dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Telefon</dt>
                <dd class="mt-1 text-sm text-gray-900">
                  <a v-if="userDetails?.phone" :href="phoneLink" class="text-blue-600 hover:text-blue-800">
                    {{ userDetails.phone }}
                  </a>
                  <span v-else class="text-gray-400">Nicht angegeben</span>
                </dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Rolle</dt>
                <dd class="mt-1">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        :class="roleClass">
                    {{ roleLabel }}
                  </span>
                </dd>
              </div>
            </div>
          </div>
        </div>

        <!-- Payment Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Gesamt Termine</dt>
                    <dd class="text-lg font-medium text-gray-900">{{ totalAppointments }}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Bezahlte Termine</dt>
                    <dd class="text-lg font-medium text-gray-900">{{ paidAppointments }}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Unbezahlte Termine</dt>
                    <dd class="text-lg font-medium text-gray-900">{{ unpaidAppointments }}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"></path>
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.51-1.31c-.562-.649-1.413-1.076-2.353-1.253V5z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Offener Betrag</dt>
                    <dd class="text-lg font-medium text-gray-900">{{ formattedTotalUnpaidAmount }}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Payment Settings -->
        <div class="bg-white shadow rounded-lg overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg leading-6 font-medium text-gray-900">Zahlungseinstellungen</h3>
          </div>
          <div class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <dt class="text-sm font-medium text-gray-500">Bevorzugte Zahlmethode</dt>
                <dd class="mt-1">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        :class="paymentMethodClass">
                    {{ paymentMethodLabel }}
                  </span>
                </dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Firmenrechnung</dt>
                <dd class="mt-1">
                  <span v-if="hasCompanyBilling" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"></path>
                    </svg>
                    Aktiviert
                  </span>
                  <span v-else class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Nicht eingerichtet
                  </span>
                </dd>
              </div>
            </div>
            
            <!-- Company Billing Details -->
            <div v-if="companyBillingAddress" class="mt-6 pt-6 border-t border-gray-200">
              <h4 class="text-sm font-medium text-gray-900 mb-4">Rechnungsadresse</h4>
              <div class="bg-gray-50 rounded-lg p-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span class="font-medium">{{ companyBillingAddress.company_name }}</span><br>
                    <span>{{ companyBillingAddress.contact_person }}</span><br>
                    <span>{{ companyBillingAddress.street }} {{ companyBillingAddress.street_number || '' }}</span><br>
                    <span>{{ companyBillingAddress.zip }} {{ companyBillingAddress.city }}</span>
                  </div>
                  <div>
                    <span class="text-gray-600">E-Mail:</span> {{ companyBillingAddress.email }}<br>
                    <span v-if="companyBillingAddress.phone" class="text-gray-600">Telefon:</span> 
                    <span v-if="companyBillingAddress.phone">{{ companyBillingAddress.phone }}</span><br>
                    <span v-if="companyBillingAddress.vat_number" class="text-gray-600">MwSt-Nr:</span> 
                    <span v-if="companyBillingAddress.vat_number">{{ companyBillingAddress.vat_number }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Appointments Table -->
        <div class="bg-white shadow rounded-lg overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200">
            <div class="flex items-center justify-between">
              <h3 class="text-lg leading-6 font-medium text-gray-900">
                Terminhistorie ({{ appointments.length }})
              </h3>
              
              <!-- Filter Buttons -->
              <div class="flex space-x-2">
                <button
                  @click="appointmentFilter = 'all'"
                  :class="[
                    'px-3 py-1 text-sm rounded-md font-medium',
                    appointmentFilter === 'all' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  ]"
                >
                  Alle
                </button>
                <button
                  @click="appointmentFilter = 'unpaid'"
                  :class="[
                    'px-3 py-1 text-sm rounded-md font-medium',
                    appointmentFilter === 'unpaid' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  ]"
                >
                  Unbezahlt
                </button>
                <button
                  @click="appointmentFilter = 'paid'"
                  :class="[
                    'px-3 py-1 text-sm rounded-md font-medium',
                    appointmentFilter === 'paid' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  ]"
                >
                  Bezahlt
                </button>
              </div>
            </div>
          </div>
          
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Datum & Zeit
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Titel
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dauer
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Betrag
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Zahlungsstatus
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="appointment in filteredAppointments" :key="appointment.id" class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div class="font-medium">{{ formatDate(appointment.start_time) }}</div>
                      <div class="text-gray-500">{{ formatTime(appointment.start_time) }} - {{ formatTime(appointment.end_time) }}</div>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-900">
                    <div class="max-w-xs truncate">{{ appointment.title }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {{ appointment.duration_minutes }}min
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          :class="getStatusClass(appointment.status)">
                      {{ getStatusLabel(appointment.status) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div class="font-medium">{{ formatCurrency(calculateAppointmentAmount(appointment)) }}</div>
                      <div v-if="appointment.discount > 0" class="text-green-600 text-xs">
                        Rabatt: -{{ formatCurrency(appointment.discount) }}
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span v-if="appointment.is_paid" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                      </svg>
                      Bezahlt
                    </span>
                    <span v-else class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                      </svg>
                      Offen
                    </span>
                  </td>
                </tr>
                
                <!-- Empty State -->
                <tr v-if="filteredAppointments.length === 0">
                  <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                    <div class="flex flex-col items-center">
                      <svg class="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      <p class="text-lg font-medium text-gray-900 mb-2">Keine Termine gefunden</p>
                      <p class="text-gray-600">
                        {{ appointmentFilter !== 'all' ? 'Versuche einen anderen Filter.' : 'Noch keine Termine vorhanden.' }}
                      </p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from '#app'
import { getSupabase } from '~/utils/supabase'

// Types
interface UserDetails {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  role: string | null
  preferred_payment_method: string | null
  default_company_billing_address_id: string | null
  is_active: boolean
}

interface Appointment {
  id: string
  title: string
  start_time: string
  end_time: string
  duration_minutes: number
  price_per_minute: number
  discount: number
  is_paid: boolean
  status: string
  type: string
}

interface CompanyBillingAddress {
  id: string
  company_name: string
  contact_person: string
  email: string
  phone: string | null
  street: string
  street_number: string | null
  zip: string
  city: string
  vat_number: string | null
}

// Get route params and setup
const route = useRoute()
const supabase = getSupabase()
const userId = route.params.id as string

// Reactive state
const isLoading = ref(true)
const error = ref<string | null>(null)
const userDetails = ref<UserDetails | null>(null)
const appointments = ref<Appointment[]>([])
const companyBillingAddress = ref<CompanyBillingAddress | null>(null)
const appointmentFilter = ref<'all' | 'paid' | 'unpaid'>('all')

// Computed properties for display
const displayName = computed(() => {
  if (!userDetails.value) return 'Unbekannt'
  const firstName = userDetails.value.first_name || ''
  const lastName = userDetails.value.last_name || ''
  return `${firstName} ${lastName}`.trim() || 'Unbekannt'
})

const displayEmail = computed(() => {
  return userDetails.value?.email || 'Keine E-Mail'
})

const emailLink = computed(() => {
  return `mailto:${userDetails.value?.email || ''}`
})

const phoneLink = computed(() => {
  return `tel:${userDetails.value?.phone || ''}`
})

const roleLabel = computed(() => {
  const labels: Record<string, string> = {
    'client': 'Kunde',
    'staff': 'Fahrlehrer',
    'admin': 'Administrator'
  }
  return labels[userDetails.value?.role || ''] || 'Unbekannt'
})

const roleClass = computed(() => {
  const classes: Record<string, string> = {
    'client': 'bg-blue-100 text-blue-800',
    'staff': 'bg-green-100 text-green-800',
    'admin': 'bg-purple-100 text-purple-800'
  }
  return classes[userDetails.value?.role || ''] || 'bg-gray-100 text-gray-800'
})

const paymentMethodLabel = computed(() => {
  const labels: Record<string, string> = {
    'cash': 'Bar',
    'invoice': 'Rechnung',
    'twint': 'Twint',
    'stripe_card': 'Kreditkarte',
    'debit_card': 'Debitkarte'
  }
  return labels[userDetails.value?.preferred_payment_method || ''] || 'Nicht festgelegt'
})

const paymentMethodClass = computed(() => {
  const classes: Record<string, string> = {
    'cash': 'bg-yellow-100 text-yellow-800',
    'invoice': 'bg-blue-100 text-blue-800',
    'twint': 'bg-purple-100 text-purple-800',
    'stripe_card': 'bg-green-100 text-green-800',
    'debit_card': 'bg-gray-100 text-gray-800'
  }
  return classes[userDetails.value?.preferred_payment_method || ''] || 'bg-gray-100 text-gray-800'
})

// Statistics computed properties
const totalAppointments = computed(() => appointments.value.length)
const paidAppointments = computed(() => appointments.value.filter(apt => apt.is_paid).length)
const unpaidAppointments = computed(() => appointments.value.filter(apt => !apt.is_paid).length)
const hasUnpaidAppointments = computed(() => unpaidAppointments.value > 0)
const hasCompanyBilling = computed(() => !!companyBillingAddress.value || !!(userDetails.value?.default_company_billing_address_id))

const totalUnpaidAmount = computed(() => {
  return appointments.value
    .filter(apt => !apt.is_paid)
    .reduce((sum, apt) => sum + calculateAppointmentAmount(apt), 0)
})

const formattedTotalUnpaidAmount = computed(() => {
  return formatCurrency(totalUnpaidAmount.value)
})

const filteredAppointments = computed(() => {
  switch (appointmentFilter.value) {
    case 'paid':
      return appointments.value.filter(apt => apt.is_paid)
    case 'unpaid':
      return appointments.value.filter(apt => !apt.is_paid)
    default:
      return appointments.value
  }
})

// Methods
const refreshData = async () => {
  await Promise.all([
    loadUserDetails(),
    loadUserAppointments(),
    loadCompanyBillingAddress()
  ])
}

const loadUserDetails = async () => {
  try {
    const { data, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        role,
        preferred_payment_method,
        default_company_billing_address_id,
        is_active
      `)
      .eq('id', userId)
      .single()

    if (userError) {
      throw new Error(userError.message)
    }

    userDetails.value = data
    console.log('✅ User details loaded:', data)

  } catch (err: any) {
    console.error('❌ Error loading user details:', err.message)
    error.value = err.message
  }
}

const loadUserAppointments = async () => {
  try {
    const { data, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        title,
        start_time,
        end_time,
        duration_minutes,
        price_per_minute,
        discount,
        is_paid,
        status,
        type
      `)
      .eq('user_id', userId)
      .order('start_time', { ascending: false })

    if (appointmentsError) {
      throw new Error(appointmentsError.message)
    }

    appointments.value = data || []
    console.log('✅ Appointments loaded:', data?.length)

  } catch (err: any) {
    console.error('❌ Error loading appointments:', err.message)
    // Don't set error here, appointments are optional
  }
}

const loadCompanyBillingAddress = async () => {
  const billingAddressId = userDetails.value?.default_company_billing_address_id
  
  if (!billingAddressId) {
    return
  }

  try {
    const { data, error: billingError } = await supabase
      .from('company_billing_addresses')
      .select(`
        id,
        company_name,
        contact_person,
        email,
        phone,
        street,
        street_number,
        zip,
        city,
        vat_number
      `)
      .eq('id', billingAddressId)
      .single()

    if (billingError) {
      console.warn('Warning loading billing address:', billingError.message)
      return
    }

    companyBillingAddress.value = data
    console.log('✅ Company billing address loaded:', data)

  } catch (err: any) {
    console.warn('Warning loading billing address:', err.message)
    // Don't set error, billing address is optional
  }
}

const calculateAppointmentAmount = (appointment: Appointment): number => {
  const baseAmount = (appointment.price_per_minute || 0) * (appointment.duration_minutes || 0)
  return Math.max(0, baseAmount - (appointment.discount || 0))
}

const sendPaymentReminder = async () => {
  if (!userDetails.value) return

  try {
    console.log('Sending payment reminder to:', userDetails.value.email)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const firstName = userDetails.value.first_name || 'Unbekannt'
    const lastName = userDetails.value.last_name || 'Unbekannt'
    alert(`Zahlungserinnerung an ${firstName} ${lastName} wurde gesendet.`)
    
  } catch (err: any) {
    console.error('❌ Error sending payment reminder:', err.message)
    alert('Fehler beim Senden der Zahlungserinnerung.')
  }
}

// Utility methods
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('de-CH', { 
    style: 'currency', 
    currency: 'CHF' 
  }).format(amount)
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const formatTime = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString('de-CH', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'confirmed': 'Bestätigt',
    'completed': 'Abgeschlossen',
    'cancelled': 'Abgesagt',
    'pending': 'Ausstehend'
  }
  return labels[status] || status
}

const getStatusClass = (status: string): string => {
  const classes: Record<string, string> = {
    'confirmed': 'bg-blue-100 text-blue-800',
    'completed': 'bg-green-100 text-green-800',
    'cancelled': 'bg-red-100 text-red-800',
    'pending': 'bg-yellow-100 text-yellow-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

// Lifecycle
onMounted(async () => {
  isLoading.value = true
  error.value = null

  try {
    await loadUserDetails()
    await Promise.all([
      loadUserAppointments(),
      loadCompanyBillingAddress()
    ])
  } catch (err: any) {
    console.error('❌ Error during initial load:', err)
    if (!error.value) {
      error.value = err.message
    }
  } finally {
    isLoading.value = false
  }
})
</script>```

### ./components/admin/UsersPaymentOverview.vue
```vue
<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">💰 Zahlungsübersicht</h1>
            <p class="mt-2 text-gray-600">Übersicht aller Schüler mit Zahlungsstatus und offenen Beträgen</p>
          </div>
          
          <!-- Refresh Button -->
          <button 
            @click="fetchUsersSummary"
            :disabled="loading"
            class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            <svg v-if="loading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <svg v-else class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            {{ loading ? 'Laden...' : 'Aktualisieren' }}
          </button>
        </div>
      </div>

      <!-- Statistics Cards -->
      <div v-if="!loading && !error" class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Gesamt Schüler</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ totalUsers }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                  </svg>
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Unbezahlte Lektionen</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ usersWithUnpaidAppointments }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"></path>
                  </svg>
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Firmenrechnungen</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ usersWithCompanyBilling }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"></path>
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.51-1.31c-.562-.649-1.413-1.076-2.353-1.253V5z" clip-rule="evenodd"></path>
                  </svg>
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Offener Betrag</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ formatCurrency(totalUnpaidAmount) }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Search and Filters -->
      <div class="bg-white shadow rounded-lg mb-6">
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div class="flex-1 min-w-0">
              <div class="relative rounded-md shadow-sm">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"></path>
                  </svg>
                </div>
                <input
                  type="text"
                  v-model="searchTerm"
                  placeholder="Nach Name oder E-Mail suchen..."
                  class="focus:ring-green-500 focus:border-green-500 block w-full pl-10 pr-3 py-2 border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            
            <div class="mt-4 sm:mt-0 sm:ml-4 flex space-x-3">
              <!-- Filter Buttons -->
              <select 
                v-model="selectedFilter"
                class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
              >
                <option value="all">Alle anzeigen</option>
                <option value="unpaid">Nur unbezahlte</option>
                <option value="company">Nur Firmenrechnungen</option>
                <option value="cash">Nur Barzahlungen</option>
                <option value="invoice">Nur Rechnungen</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="bg-white shadow rounded-lg">
        <div class="px-6 py-12 text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p class="text-gray-600">Daten werden geladen...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-white shadow rounded-lg">
        <div class="px-6 py-12 text-center">
          <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Fehler beim Laden</h3>
          <p class="text-gray-600 mb-4">{{ error }}</p>
          <button 
            @click="fetchUsersSummary"
            class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
          >
            Erneut versuchen
          </button>
        </div>
      </div>

      <!-- Data Table -->
      <div v-else class="bg-white shadow rounded-lg overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg leading-6 font-medium text-gray-900">
            Schülerliste ({{ filteredUsers.length }} von {{ totalUsers }})
          </h3>
        </div>
        
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Schüler
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kontakt
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Zahlmethode
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Offener Betrag
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="user in filteredUsers" :key="user.user_id" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                      <div class="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <span class="text-sm font-medium text-gray-700">
                          {{ getInitials(user.first_name, user.last_name) }}
                        </span>
                      </div>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">
                        {{ user.first_name }} {{ user.last_name }}
                      </div>
                      <div class="text-sm text-gray-500">
                        {{ user.role }}
                      </div>
                    </div>
                  </div>
                </td>
                
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">{{ user.email }}</div>
                  <div class="text-sm text-gray-500">{{ user.phone }}</div>
                </td>
                
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        :class="getPaymentMethodClass(user.preferred_payment_method)">
                    {{ getPaymentMethodLabel(user.preferred_payment_method) }}
                  </span>
                </td>
                
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex flex-col space-y-1">
                    <!-- Company Billing Status -->
                    <span v-if="user.has_company_billing" 
                          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"></path>
                      </svg>
                      Firmenrechnung
                    </span>
                    
                    <!-- Unpaid Status -->
                    <span v-if="user.has_unpaid_appointments" 
                          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                      </svg>
                      Unbezahlt
                    </span>
                    
                    <span v-if="!user.has_unpaid_appointments" 
                          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                      </svg>
                      Bezahlt
                    </span>
                  </div>
                </td>
                
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <span class="font-medium" :class="user.total_unpaid_amount > 0 ? 'text-red-600' : 'text-green-600'">
                    {{ formatCurrency(user.total_unpaid_amount) }}
                  </span>
                </td>
                
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div class="flex space-x-2">
                    <NuxtLink 
                      :to="`/admin/users/${user.user_id}`"
                      class="text-green-600 hover:text-green-900 inline-flex items-center"
                    >
                      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                      </svg>
                      Details
                    </NuxtLink>
                    
                    <button 
                      v-if="user.has_unpaid_appointments"
                      @click="sendPaymentReminder(user)"
                      class="text-orange-600 hover:text-orange-900 inline-flex items-center"
                    >
                      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
                      </svg>
                      Erinnerung
                    </button>
                  </div>
                </td>
              </tr>
              
              <!-- Empty State -->
              <tr v-if="filteredUsers.length === 0">
                <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                  <div class="flex flex-col items-center">
                    <svg class="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <p class="text-lg font-medium text-gray-900 mb-2">Keine Benutzer gefunden</p>
                    <p class="text-gray-600">
                      {{ searchTerm ? 'Versuche einen anderen Suchbegriff.' : 'Versuche die Filter zu ändern.' }}
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

// TypeScript Interface
interface UserPaymentSummary {
  user_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  role: string
  preferred_payment_method: string | null
  has_company_billing: boolean
  has_unpaid_appointments: boolean
  total_unpaid_amount: number
}

// Reactive state
const supabase = getSupabase()
const users = ref<UserPaymentSummary[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const searchTerm = ref('')
const selectedFilter = ref('all')

// Computed properties
const totalUsers = computed(() => users.value.length)

const usersWithUnpaidAppointments = computed(() => 
  users.value.filter(user => user.has_unpaid_appointments).length
)

const usersWithCompanyBilling = computed(() => 
  users.value.filter(user => user.has_company_billing).length
)

const totalUnpaidAmount = computed(() => 
  users.value.reduce((sum, user) => sum + user.total_unpaid_amount, 0)
)

const filteredUsers = computed<UserPaymentSummary[]>(() => {
  let filtered = users.value

  // Search filter
  if (searchTerm.value) {
    const lowerSearchTerm = searchTerm.value.toLowerCase()
    filtered = filtered.filter(user =>
      (user.first_name && user.first_name.toLowerCase().includes(lowerSearchTerm)) ||
      (user.last_name && user.last_name.toLowerCase().includes(lowerSearchTerm)) ||
      (user.email && user.email.toLowerCase().includes(lowerSearchTerm))
    )
  }

  // Status filter
  switch (selectedFilter.value) {
    case 'unpaid':
      filtered = filtered.filter(user => user.has_unpaid_appointments)
      break
    case 'company':
      filtered = filtered.filter(user => user.has_company_billing)
      break
    case 'cash':
      filtered = filtered.filter(user => user.preferred_payment_method === 'cash')
      break
    case 'invoice':
      filtered = filtered.filter(user => user.preferred_payment_method === 'invoice')
      break
  }

  return filtered
})

// Methods
const fetchUsersSummary = async () => {
  loading.value = true
  error.value = null
  
  try {
    // Lade alle Benutzer mit ihren Zahlungsinformationen
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        role,
        preferred_payment_method,
        default_company_billing_address_id,
        is_active
      `)
      .eq('is_active', true)
      .neq('role', 'admin') // Admins ausschließen
    
    if (usersError) {
      throw new Error(usersError.message)
    }

    // Lade alle Termine mit Zahlungsstatus
    const { data: appointmentsData, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        user_id,
        is_paid,
        price_per_minute,
        duration_minutes,
        discount
      `)

    if (appointmentsError) {
      throw new Error(appointmentsError.message)
    }

    // Lade Company Billing Adressen
    const { data: billingData, error: billingError } = await supabase
      .from('company_billing_addresses')
      .select('created_by')

    if (billingError) {
      console.warn('Warning loading billing addresses:', billingError.message)
    }

    // Verarbeite die Daten
    const processedUsers: UserPaymentSummary[] = (usersData || []).map(user => {
      // Finde alle Termine für diesen User
      const userAppointments = (appointmentsData || []).filter(apt => apt.user_id === user.id)
      
      // Berechne unbezahlte Termine
      const unpaidAppointments = userAppointments.filter(apt => !apt.is_paid)
      
      // Berechne offenen Betrag (in CHF)
      const totalUnpaidAmount = unpaidAppointments.reduce((sum, apt) => {
        const basePrice = (apt.price_per_minute || 0) * (apt.duration_minutes || 0)
        const discountedPrice = basePrice - (apt.discount || 0)
        return sum + discountedPrice
      }, 0)

      // Prüfe ob User Company Billing hat
      const hasCompanyBilling = billingData?.some(billing => billing.created_by === user.id) || 
                               !!user.default_company_billing_address_id

      return {
        user_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        role: user.role || 'client',
        preferred_payment_method: user.preferred_payment_method,
        has_company_billing: hasCompanyBilling,
        has_unpaid_appointments: unpaidAppointments.length > 0,
        total_unpaid_amount: totalUnpaidAmount
      }
    })
    
    users.value = processedUsers
    console.log('✅ Loaded user payment summary:', users.value.length, 'users')
    
  } catch (err: any) {
    console.error('❌ Error loading user summary:', err.message)
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('de-CH', { 
    style: 'currency', 
    currency: 'CHF' 
  }).format(amount)
}

const getInitials = (firstName: string | null, lastName: string | null): string => {
  const first = firstName?.charAt(0)?.toUpperCase() || ''
  const last = lastName?.charAt(0)?.toUpperCase() || ''
  return first + last || '??'
}

const getPaymentMethodLabel = (method: string | null): string => {
  const labels: Record<string, string> = {
    'cash': 'Bar',
    'invoice': 'Rechnung',
    'twint': 'Twint',
    'stripe_card': 'Karte',
    'debit_card': 'Debit'
  }
  return labels[method || ''] || 'Unbekannt'
}

const getPaymentMethodClass = (method: string | null): string => {
  const classes: Record<string, string> = {
    'cash': 'bg-yellow-100 text-yellow-800',
    'invoice': 'bg-blue-100 text-blue-800',
    'twint': 'bg-purple-100 text-purple-800',
    'stripe_card': 'bg-green-100 text-green-800',
    'debit_card': 'bg-gray-100 text-gray-800'
  }
  return classes[method || ''] || 'bg-gray-100 text-gray-800'
}

const sendPaymentReminder = async (user: UserPaymentSummary) => {
  // Placeholder for payment reminder functionality
  console.log('Sending payment reminder to:', user.email)
  // TODO: Implement payment reminder logic
  alert(`Zahlungserinnerung an ${user.first_name} ${user.last_name} würde gesendet werden.`)
}

// Lifecycle
onMounted(() => {
  fetchUsersSummary()
})
</script>```

### ./layouts/default.vue
```vue
<!-- layouts/default.vue -->
<template>
  <div>
    <slot />
  </div>
</template>

<script setup>
// Optional: Global layout logic here
</script>```

### ./layouts/minimal.vue
```vue
<!-- layouts/minimal.vue -->
<template>
  <div class="min-h-screen bg-gray-50">
    <slot />
  </div>
</template>```

### ./pages/AdminEventTypes.vue
```vue
<!-- AdminEventTypes.vue - Admin-Dashboard für Terminarten -->
<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Terminarten verwalten</h1>
      <button
        @click="openCreateModal"
        class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
      >
        <span>+</span>
        Neue Terminart
      </button>
    </div>

    <!-- Event-Types Liste -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Terminart</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Standard-Dauer</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farbe</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aktionen</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="eventType in eventTypes" :key="eventType.id">
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center gap-3">
                <span class="text-2xl">{{ eventType.emoji }}</span>
                <div>
                  <div class="text-sm font-medium text-gray-900">{{ eventType.name }}</div>
                  <div class="text-sm text-gray-500">{{ eventType.description }}</div>
                  <div class="text-xs text-gray-400">Code: {{ eventType.code }}</div>
                </div>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ eventType.default_duration_minutes }} Minuten
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center gap-2">
                <div 
                  class="w-6 h-6 rounded border border-gray-300"
                  :style="{ backgroundColor: eventType.default_color }"
                ></div>
                <span class="text-sm text-gray-600">{{ eventType.default_color }}</span>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span 
                :class="[
                  'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                  eventType.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                ]"
              >
                {{ eventType.is_active ? 'Aktiv' : 'Inaktiv' }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
              <button
                @click="editEventType(eventType)"
                class="text-blue-600 hover:text-blue-900"
              >
                Bearbeiten
              </button>
              <button
                @click="toggleEventType(eventType)"
                :class="[
                  eventType.is_active 
                    ? 'text-red-600 hover:text-red-900' 
                    : 'text-green-600 hover:text-green-900'
                ]"
              >
                {{ eventType.is_active ? 'Deaktivieren' : 'Aktivieren' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg w-full max-w-2xl mx-4">
        <div class="px-6 py-4 border-b">
          <h3 class="text-lg font-medium">
            {{ editingEventType ? 'Terminart bearbeiten' : 'Neue Terminart erstellen' }}
          </h3>
        </div>
        
        <div class="px-6 py-4 space-y-4">
          <!-- Code -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Code *</label>
            <input
              v-model="formData.code"
              type="text"
              class="w-full p-3 border border-gray-300 rounded-lg"
              placeholder="z.B. meeting"
              :disabled="!!editingEventType"
            />
          </div>
          
          <!-- Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Name *</label>
            <input
              v-model="formData.name"
              type="text"
              class="w-full p-3 border border-gray-300 rounded-lg"
              placeholder="z.B. Besprechung"
            />
          </div>
          
          <!-- Emoji -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Emoji</label>
            <input
              v-model="formData.emoji"
              type="text"
              class="w-20 p-3 border border-gray-300 rounded-lg text-center"
              placeholder="🤝"
            />
          </div>
          
          <!-- Beschreibung -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Beschreibung</label>
            <textarea
              v-model="formData.description"
              rows="2"
              class="w-full p-3 border border-gray-300 rounded-lg"
              placeholder="Kurze Beschreibung der Terminart"
            ></textarea>
          </div>
          
          <!-- Standard-Dauer -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Standard-Dauer (Minuten) *</label>
            <input
              v-model="formData.default_duration_minutes"
              type="number"
              min="15"
              max="480"
              step="15"
              class="w-32 p-3 border border-gray-300 rounded-lg"
            />
          </div>
          
          <!-- Farbe -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Standard-Farbe</label>
            <div class="flex items-center gap-3">
              <input
                v-model="formData.default_color"
                type="color"
                class="w-12 h-12 border border-gray-300 rounded cursor-pointer"
              />
              <input
                v-model="formData.default_color"
                type="text"
                class="w-24 p-2 border border-gray-300 rounded-lg"
                placeholder="#019ee5"
              />
            </div>
          </div>
        </div>
        
        <div class="px-6 py-4 bg-gray-50 flex justify-end gap-3">
          <button
            @click="closeModal"
            class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button
            @click="saveEventType"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {{ editingEventType ? 'Speichern' : 'Erstellen' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getSupabase } from '~/utils/supabase'

const supabase = getSupabase()

const eventTypes = ref<any[]>([])
const showModal = ref(false)
const editingEventType = ref<any>(null)
const formData = ref({
  code: '',
  name: '',
  emoji: '📝',
  description: '',
  default_duration_minutes: 45,
  default_color: '#666666'
})

// Event-Types laden
const loadEventTypes = async () => {
  try {
    const { data, error } = await supabase
      .from('event_types')
      .select('*')
      .order('display_order')
    
    if (error) throw error
    eventTypes.value = data || []
  } catch (error) {
    console.error('Error loading event types:', error)
  }
}

// Modal öffnen/schließen
const openCreateModal = () => {
  editingEventType.value = null
  formData.value = {
    code: '',
    name: '',
    emoji: '📝',
    description: '',
    default_duration_minutes: 45,
    default_color: '#666666'
  }
  showModal.value = true
}

const editEventType = (eventType: any) => {
  editingEventType.value = eventType
  formData.value = { ...eventType }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingEventType.value = null
}

// Speichern
const saveEventType = async () => {
  try {
    if (editingEventType.value) {
      // Update
      const { error } = await supabase
        .from('event_types')
        .update(formData.value)
        .eq('id', editingEventType.value.id)
      
      if (error) throw error
    } else {
      // Create
      const { error } = await supabase
        .from('event_types')
        .insert(formData.value)
      
      if (error) throw error
    }
    
    await loadEventTypes()
    closeModal()
  } catch (error) {
    console.error('Error saving event type:', error)
    alert('Fehler beim Speichern')
  }
}

// Aktivieren/Deaktivieren
const toggleEventType = async (eventType: any) => {
  try {
    const { error } = await supabase
      .from('event_types')
      .update({ is_active: !eventType.is_active })
      .eq('id', eventType.id)
    
    if (error) throw error
    await loadEventTypes()
  } catch (error) {
    console.error('Error toggling event type:', error)
  }
}

onMounted(() => {
  loadEventTypes()
})
</script>```

### ./pages/admin/index.vue
```vue
<template>
  <div class="admin-dashboard-page">
    <h1>Admin Dashboard</h1>

    <div class="dashboard-sections">
      <section class="dashboard-section">
        <UsersPaymentOverview />
      </section>
      </div>
  </div>
</template>

<script setup lang="ts">
import { definePageMeta } from '#imports';
import UsersPaymentOverview from '~/components/admin/UsersPaymentOverview.vue'; // Pfad anpassen, falls nötig

definePageMeta({
  middleware: ['auth'] 
})

</script>

<style scoped>
.admin-dashboard-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 30px;
  color: #333;
  text-align: center;
}

.dashboard-sections {
  display: grid;
  gap: 30px;
  grid-template-columns: 1fr; /* Standard: Eine Spalte */
}

@media (min-width: 768px) {
  .dashboard-sections {
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); /* Zwei oder mehr Spalten auf größeren Bildschirmen */
  }
}

.dashboard-section {
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  padding: 25px;
}

.dashboard-section h2 {
  font-size: 1.8rem;
  color: #555;
  margin-top: 0;
  margin-bottom: 15px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.dashboard-section p {
  color: #666;
}
</style>```

### ./pages/admin/payment-overview.vue
```vue
<!-- pages/admin/payment-overview.vue -->
<template>
  <UsersPaymentOverview />
</template>

<script setup>
import UsersPaymentOverview from '~/components/admin/UsersPaymentOverview.vue'

definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})
</script>```

### ./pages/admin/users/[id].vue
```vue
<template>
  <UserPaymentDetails />
</template>

<script setup lang="ts">
import UserPaymentDetails from '~/components/admin/UserPaymentDetails.vue'
import { definePageMeta } from '#imports';

// Page Meta für Admin-Layout
definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})
</script>```

### ./pages/customer-dashboard.vue
```vue
<!-- pages/customer-dashboard.vue -->
<template>
  <CustomerDashboard />
</template>

<script setup>
// Meta
definePageMeta({
  middleware: 'auth-check',
  layout: false // Use no layout for clean customer view
})

// Redirect non-clients to main dashboard
const authStore = useAuthStore()
const { user, userRole, isClient } = storeToRefs(authStore)

watch([user, userRole], ([newUser, newRole]) => {
  if (newUser && !isClient.value) {
    console.log('🔄 User is not a client, redirecting to main dashboard')
    navigateTo('/')
  }
}, { immediate: true })
</script>```

### ./pages/customers.vue
```vue
<!-- pages/customers.vue - Mobile-Optimierte Version -->
<template>
  <!-- Loading State -->
  <div v-if="isUserLoading" class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto"></div>
      <p class="mt-4 text-gray-600">Lade Benutzer...</p>
    </div>
  </div>

  <!-- Error State -->
  <div v-else-if="userError" class="min-h-screen flex items-center justify-center">
    <div class="text-center max-w-md p-6 bg-red-50 rounded-lg">
      <h2 class="text-xl font-bold text-red-800 mb-4">Fehler</h2>
      <p class="text-red-600 mb-4">{{ userError }}</p>
      <button 
        @click="navigateTo('/')" 
        class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
      >
        Zum Login
      </button>
    </div>
  </div>

  <!-- Main Content -->
  <div v-else-if="currentUser" class="h-screen flex flex-col bg-gray-50">
    <!-- Header -->
    <div class="bg-white shadow-sm border-b p-4">
      <div class="flex items-center justify-between">
        <!-- Back Button & Title -->
        <div class="flex items-center gap-4">
          <button 
            @click="navigateTo('/dashboard')"
            class="text-gray-600 hover:text-gray-800 text-2xl"
          >
            ← 
          </button>
          <h1 class="text-xl sm:text-2xl font-bold text-gray-900">Schülerliste</h1>
        </div>

        <!-- Add Student Button (nur Desktop) -->
        <button 
          v-if="currentUser.role !== 'client'"
          @click="showAddModal = true"
          class="hidden sm:block bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          + Neu
        </button>
      </div>

      <!-- Search & Filters -->
      <div class="mt-4 space-y-3">
        <!-- Search Bar -->
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Schüler suchen (Name oder E-Mail)..."
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
          <div class="absolute left-3 top-2.5 text-gray-400">
            🔍
          </div>
        </div>

        <!-- Filter Toggles -->
        <div class="flex gap-4 items-center text-sm">
          <!-- Inactive Toggle -->
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              v-model="showInactive"
              type="checkbox"
              class="rounded border-gray-300 text-green-600 focus:ring-green-500"
            >
            <span class="text-gray-700">Inaktive</span>
          </label>

          <!-- All Students Toggle (nur für Staff) -->
          <label 
            v-if="currentUser.role === 'staff'" 
            class="flex items-center gap-2 cursor-pointer"
          >
            <input
              v-model="showAllStudents"
              type="checkbox"
              class="rounded border-gray-300 text-green-600 focus:ring-green-500"
              @change="loadStudents"
            >
            <span class="text-gray-700">Alle Fahrschüler</span>
          </label>
        </div>

        <!-- Statistics -->
        <div class="flex gap-3 text-xs sm:text-sm text-gray-600">
          <span>Gesamt: {{ students.length }}</span>
          <span>Aktiv: {{ students.filter(s => s.is_active).length }}</span>
          <span>Inaktiv: {{ students.filter(s => !s.is_active).length }}</span>
          <span v-if="searchQuery">Gefiltert: {{ filteredStudents.length }}</span>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-hidden">
      <!-- Loading Students -->
      <div v-if="isLoading" class="flex items-center justify-center h-full">
        <div class="text-center">
          <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto"></div>
          <p class="mt-4 text-gray-600">Lade Schüler...</p>
        </div>
      </div>

      <!-- Error Loading Students -->
      <div v-else-if="error" class="flex items-center justify-center h-full">
        <div class="text-center max-w-md p-6 bg-red-50 rounded-lg">
          <h3 class="text-lg font-bold text-red-800 mb-2">Fehler beim Laden</h3>
          <p class="text-red-600 mb-4">{{ error }}</p>
          <button 
            @click="loadStudents" 
            class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Erneut versuchen
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredStudents.length === 0" class="flex items-center justify-center h-full">
        <div class="text-center px-4">
          <div class="text-6xl mb-4">👥</div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">
            {{ searchQuery ? 'Keine Schüler gefunden' : 'Noch keine Schüler' }}
          </h3>
          <p class="text-gray-600 mb-4">
            {{ searchQuery 
              ? 'Versuchen Sie einen anderen Suchbegriff' 
              : 'Fügen Sie Ihren ersten Schüler hinzu' }}
          </p>
          <button 
            v-if="!searchQuery && currentUser.role !== 'client'"
            @click="showAddModal = true"
            class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Ersten Schüler hinzufügen
          </button>
        </div>
      </div>

      <!-- Mobile-Optimierte Students List -->
      <div v-else class="h-full overflow-y-auto">
        <!-- Mobile: Single Column, Desktop: Grid -->
        <div class="p-2 sm:p-4">
          <div class="space-y-2 sm:grid sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:space-y-0">
            <div
              v-for="student in filteredStudents"
              :key="student.id"
              @click="selectStudent(student)"
              class="bg-white rounded-lg shadow-sm border p-3 cursor-pointer hover:shadow-md transition-all active:scale-98 hover:border-green-300"
            >
              <!-- Mobile-First Layout -->
              <div class="flex items-center justify-between">
                <!-- Left: Main Info -->
                <div class="flex-1 min-w-0"> <!-- min-w-0 für text truncation -->
                  <!-- Name & Category in one line -->
                  <div class="flex items-center gap-2 mb-1">
                    <h3 class="font-semibold text-gray-900 truncate flex-1">
                      {{ student.first_name }} {{ student.last_name }}
                    </h3>
                    <!-- Category Badge - compact -->
                    <span v-if="student.category" class="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-medium">
                      {{ student.category }}
                    </span>
                  </div>
                  
                  <!-- Contact Info - compact -->
                  <div class="space-y-0.5">
                    <p v-if="student.phone" class="text-sm text-gray-600 flex items-center gap-1">
                      <span class="text-xs">📱</span>
                      {{ formatPhone(student.phone) }}
                    </p>
                    <p v-if="student.email" class="text-xs text-gray-500 truncate">
                      {{ student.email }}
                    </p>
                  </div>
                </div>
                
                <!-- Right: Status & Actions -->
                <div class="flex flex-col items-end gap-2 ml-3">
                  <!-- Status Badge -->
                  <span :class="[
                    'text-xs px-2 py-1 rounded-full font-medium',
                    student.is_active 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  ]">
                    {{ student.is_active ? 'Aktiv' : 'Inaktiv' }}
                  </span>
                  
                  <!-- Quick Action Button -->
                  <button 
                    @click.stop="quickAction(student)"
                    class="text-xs text-green-600 hover:text-green-800 font-medium py-1 px-2 rounded hover:bg-green-50 transition-colors"
                  >
                    Details →
                  </button>
                </div>
              </div>

              <!-- Additional Info Row (Mobile) -->
              <div class="mt-2 pt-2 border-t border-gray-100 sm:hidden">
                <div class="flex items-center justify-between text-xs text-gray-500">
                  <!-- Left: Additional info -->
                  <div class="flex items-center gap-3">
                    <span v-if="student.assignedInstructor">
                      👨‍🏫 {{ student.assignedInstructor }}
                    </span>
                    <span v-if="student.lessonsCount">
                      📚 {{ student.lessonsCount }} Lektionen
                    </span>
                  </div>
                  
                  <!-- Right: Date -->
                  <span v-if="student.lastLesson" class="text-xs text-gray-400">
                    {{ formatRelativeDate(student.lastLesson) }}
                  </span>
                </div>
              </div>

              <!-- Desktop Additional Info -->
              <div class="hidden sm:block mt-3 pt-2 border-t border-gray-100">
                <div class="flex justify-between items-center text-xs text-gray-500">
                  <div class="flex gap-3">
                    <span v-if="student.assignedInstructor">
                      👨‍🏫 {{ student.assignedInstructor }}
                    </span>
                    <span v-if="student.lessonsCount">
                      📚 {{ student.lessonsCount }}
                    </span>
                    <span v-if="student.lastLesson">
                      🕒 {{ formatRelativeDate(student.lastLesson) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Mobile: Floating Action Button -->
        <div class="sm:hidden fixed bottom-4 right-4 z-10">
          <button 
            v-if="currentUser.role !== 'client'"
            @click="showAddModal = true"
            class="bg-green-600 text-white p-4 rounded-full shadow-lg hover:bg-green-700 transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Enhanced Student Detail Modal -->
     <EnhancedStudentModal
    :selected-student="selectedStudent"
    @close="selectedStudent = null"
    @edit="editStudent"
    @create-appointment="handleCreateAppointment"
    @evaluate-lesson="handleEvaluateLesson"
  />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { navigateTo } from '#app'
import { useCurrentUser } from '~/composables/useCurrentUser'
import { getSupabase } from '~/utils/supabase'
import EnhancedStudentModal from '~/components/EnhancedStudentModal.vue'


// Supabase client
const supabase = getSupabase()

// Composables
const { currentUser, fetchCurrentUser, isLoading: isUserLoading, userError } = useCurrentUser()

// Local state
const selectedStudent = ref<any>(null)
const showAddModal = ref(false)
const students = ref<any[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const searchQuery = ref('')
const showInactive = ref(false)
const showAllStudents = ref(false)

// Computed
const filteredStudents = computed(() => {
  let filtered = students.value

  // Filter by active/inactive
  if (!showInactive.value) {
    filtered = filtered.filter(s => s.is_active)
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(s => 
      s.first_name?.toLowerCase().includes(query) ||
      s.last_name?.toLowerCase().includes(query) ||
      s.email?.toLowerCase().includes(query)
    )
  }

  return filtered
})

// Mobile optimization methods
const formatPhone = (phone: string) => {
  if (!phone) return ''
  
  // Swiss format: +41 79 123 45 67 -> 079 123 45 67
  if (phone.startsWith('+41')) {
    return phone.replace('+41', '0').replace(/\s+/g, ' ')
  }
  
  return phone
}

const formatRelativeDate = (dateString: string) => {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 1) return 'Gestern'
  if (diffDays < 7) return `vor ${diffDays}d`
  if (diffDays < 30) return `vor ${Math.floor(diffDays / 7)}w`
  if (diffDays < 365) return `vor ${Math.floor(diffDays / 30)}M`
  return `vor ${Math.floor(diffDays / 365)}J`
}

const quickAction = (student: any) => {
  selectedStudent.value = student
}

const editStudent = (student: any) => {
  selectedStudent.value = null
  // TODO: Implement edit modal
  console.log('Edit student:', student)
}

const viewLessons = (student: any) => {
  // TODO: Show lessons history for student
  console.log('View lessons for:', student)
}

const callStudent = (student: any) => {
  if (student.phone) {
    window.open(`tel:${student.phone}`)
  }
}

const handleCreateAppointment = (student: any) => {
  selectedStudent.value = null
  // Verwende deine bestehende createAppointment Funktion oder navigiere direkt
  console.log('Create appointment for:', student)
  // navigateTo(`/appointments/create?student=${student.id}`)
  
  // Oder falls du die bestehende Funktion verwenden willst:
  // createAppointment(student)
}

const handleEvaluateLesson = (lesson: any) => {
  selectedStudent.value = null
  // TODO: Öffne Bewertungsmodal für diese spezifische Lektion
  console.log('Evaluate lesson:', lesson)
  // showEvaluationModal.value = true
  // selectedAppointment.value = lesson
}

const emailStudent = (student: any) => {
  if (student.email) {
    window.open(`mailto:${student.email}`)
  }
}

const calculateAge = (birthdate: string) => {
  if (!birthdate) return ''
  const birth = new Date(birthdate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  
  return age
}

// Lifecycle
onMounted(async () => {
  await fetchCurrentUser()
  
  if (userError.value || !currentUser.value) {
    await navigateTo('/')
    return
  }

  await loadStudents()
})

// Methods - ECHTE SUPABASE CALLS mit korrekten Spaltennamen
const loadStudents = async () => {
  if (!currentUser.value) return
  
  isLoading.value = true
  error.value = null
  
  try {
    console.log('🔄 Loading students from database...')
    console.log('Current user role:', currentUser.value.role)
    
    let query = supabase
      .from('users')
      .select(`
        id,
        created_at,
        email,
        first_name,
        last_name,
        phone,
        birthdate,
        street,
        street_nr,
        zip,
        city,
        is_active,
        category,
        assigned_staff_id,
        payment_provider_customer_id,
        lernfahrausweis_url
      `)
      .eq('role', 'client') // Nur Schüler laden
      .order('first_name', { ascending: true })

    // Filterung basierend auf Benutzerrolle
    if (currentUser.value.role === 'staff' && !showAllStudents.value) {
      // Staff sieht nur seine eigenen Schüler
      query = query.eq('assigned_staff_id', currentUser.value.id)
      console.log('📚 Loading only assigned students for staff:', currentUser.value.id)
    } else if (currentUser.value.role === 'admin') {
      // Admin sieht alle Schüler
      console.log('👑 Loading all students for admin')
    }

    const { data, error: supabaseError } = await query

    if (supabaseError) {
      throw new Error(`Database error: ${supabaseError.message}`)
    }

    if (!data) {
      students.value = []
      console.log('ℹ️ No students found')
      return
    }

    // Erweiterte Schüler-Daten mit zusätzlichen Informationen
    const enrichedStudents = await Promise.all(
      data.map(async (student: any) => {
        // Zugewiesenen Fahrlehrer laden
        let assignedInstructor = 'Nicht zugewiesen'
        if (student.assigned_staff_id) {
          const { data: instructorData } = await supabase
            .from('users')
            .select('first_name, last_name')
            .eq('id', student.assigned_staff_id)
            .single()

          if (instructorData) {
            assignedInstructor = `${instructorData.first_name} ${instructorData.last_name.charAt(0)}.`
          }
        }

        // Anzahl Lektionen aus appointments zählen
        const { count: lessonsCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', student.id)

        // Letzte Lektion finden
        const { data: lastLessonData } = await supabase
          .from('appointments')
          .select('start_time')
          .eq('user_id', student.id)
          .order('start_time', { ascending: false })
          .limit(1)

        return {
          ...student,
          assignedInstructor,
          lessonsCount: lessonsCount || 0,
          lastLesson: lastLessonData?.[0]?.start_time || null,
          // Formatierte Adresse
          fullAddress: [student.street, student.street_nr, student.zip, student.city]
            .filter(Boolean)
            .join(' '),
          // Payment provider korrekt mappen
          payment_provider: student.payment_provider_customer_id ? 'Konfiguriert' : 'Nicht konfiguriert'
        }
      })
    )

    students.value = enrichedStudents
    console.log('✅ Students loaded successfully:', students.value.length)
    console.log('📊 Sample student:', students.value[0])

  } catch (err: any) {
    console.error('❌ Error loading students:', err)
    error.value = err.message || 'Fehler beim Laden der Schüler'
    students.value = []
  } finally {
    isLoading.value = false
  }
}

const selectStudent = (student: any) => {
  selectedStudent.value = student
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('de-CH')
}
</script>

<style scoped>
/* Mobile optimizations */
.active\:scale-98:active {
  transform: scale(0.98);
}

/* Smooth touch interactions */
@media (hover: none) and (pointer: coarse) {
  .cursor-pointer {
    cursor: default;
  }
  
  .hover\:shadow-md:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
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
</style>```

### ./pages/dashboard.vue
```vue
<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted, nextTick } from 'vue'
import CalendarComponent from '../components/CalendarComponent.vue'
import StaffSettings from '~/components/StaffSettings.vue'
import PendenzenModal from '~/components/PendenzenModal.vue'
import ProfileSetup from '~/components/ProfileSetup.vue'
import { navigateTo } from '#app'
import { useCurrentUser } from '~/composables/useCurrentUser'
import { usePendingTasks } from '~/composables/usePendingTasks'
import { useAppointmentStatus } from '~/composables/useAppointmentStatus'
import { useFeatureFlags } from '@/utils/useFeatureFlags'


interface CalendarApi {
  today(): void
  next(): void
  prev(): void
  getDate(): Date
  view: { currentStart: Date }
}

// Composables
const { currentUser, fetchCurrentUser, isLoading, userError, profileExists } = useCurrentUser()
const { isEnabled } = useFeatureFlags()


// WICHTIG: Hole das ganze Composable-Objekt für volle Reaktivität
const pendingTasksComposable = usePendingTasks()
const { 
  pendingAppointments,
  pendingCount,
  buttonClasses,
  buttonText,
  fetchPendingTasks,
  isLoading: isPendingLoading,
  error: pendingError
} = pendingTasksComposable

const { 
  updateOverdueAppointments, 
  markAppointmentEvaluated,
  isUpdating: isUpdatingStatus,
  updateError: statusUpdateError 
} = useAppointmentStatus()

// Refs
const calendarRef = ref<{ getApi(): CalendarApi } | null>(null)
const showStaffSettings = ref(false)
const showCustomers = ref(false)
const showPendenzen = ref(false)
const isTodayActive = ref(false)
const currentMonth = ref('')

// NEU: Lokale computed für bessere Reaktivität
const pendenzenButtonClasses = computed(() => {
  return buttonClasses.value
})

const pendenzenButtonText = computed(() => {
  return buttonText.value
})

// Debug computed für bessere Nachverfolgung
const debugInfo = computed(() => ({
  userEmail: currentUser.value?.email || 'NULL',
  profileExists: profileExists.value,
  pendingCount: pendingCount.value,
  isPendingLoading: isPendingLoading.value,
  pendingError: pendingError.value
}))

// NEU: Funktion für nach Profilerstellung
const handleProfileCreated = async () => {
  console.log('Profil wurde erstellt, lade Daten neu...')
  await fetchCurrentUser()
  
  // Nach erfolgreicher Profilerstellung Pending Tasks laden
  if (currentUser.value && ['staff', 'admin'].includes(currentUser.value.role)) {
    console.log('🔄 Loading pending tasks after profile creation...')
    await fetchPendingTasks(currentUser.value.id)
    console.log('✅ Pending tasks loaded, count:', pendingCount.value)
  }
}

// NEU: Zentrale Funktion zum Aktualisieren der Pendenzen
const refreshPendingData = async () => {
  if (!currentUser.value || !['staff', 'admin'].includes(currentUser.value.role)) {
    return
  }

  try {
    console.log('🔄 Refreshing pending data...')
    
    // 1. Erst überfällige Termine updaten
    const result = await updateOverdueAppointments()
    if (result.updated > 0) {
      console.log(`✅ Updated ${result.updated} appointments to 'completed'`)
    }
    
    // 2. Dann Pending Tasks neu laden
    await fetchPendingTasks(currentUser.value.id)
    console.log('✅ Pending tasks refreshed, count:', pendingCount.value)
    
  } catch (err) {
    console.error('❌ Error refreshing pending data:', err)
  }
}

const goToToday = () => {
  const api = calendarRef.value?.getApi()
  if (!api) return
  api.today()
  updateTodayState()
  updateCurrentMonth()
}

const goNext = () => {
  const api = calendarRef.value?.getApi()
  if (!api) return
  api.next()
  updateTodayState()
  updateCurrentMonth()
}

const goPrev = () => {
  const api = calendarRef.value?.getApi()
  if (!api) return
  api.prev()
  updateTodayState()
  updateCurrentMonth()
}

const updateTodayState = () => {
  const api = calendarRef.value?.getApi()
  if (!api) return

  const viewStart = api.view.currentStart
  const now = new Date()

  isTodayActive.value = viewStart.getFullYear() === now.getFullYear() &&
    getWeekNumber(viewStart) === getWeekNumber(now)
}

const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

const updateCurrentMonth = () => {
  const api = calendarRef.value?.getApi()
  if (!api) return

  const date = api.getDate()
  currentMonth.value = date.toLocaleDateString('de-CH', {
    month: 'long',
    year: 'numeric',
  })
}

const onViewUpdate = (currentStart: Date) => {
  updateTodayState()
  updateCurrentMonth()
}

const goToCustomers = () => {
  navigateTo('/customers')
}

watch(calendarRef, () => {
  updateTodayState()
})

// Definiere refreshInterval außerhalb der Funktionen
const refreshInterval = ref<number | null>(null)

// HINZUFÜGEN: State für Evaluation Modal
const showEvaluationModal = ref(false)
const selectedAppointment = ref<any>(null)

// HINZUFÜGEN: Event Handler für Pendenzen Modal
const handleEvaluateLesson = (appointment: any) => {
  console.log('🔥 Evaluating lesson:', appointment)
  selectedAppointment.value = appointment
  showEvaluationModal.value = true
}
const onAppointmentChanged = async (event: { type: string, data: any }) => {
  console.log('📅 Appointment changed:', event.type, event.data)
  
  // Bei jedem Termin-Change die Pendenzen aktualisieren
  await refreshPendingData()
}

// NEU: Watch für pendingCount um Debugging zu verbessern
watch(pendingCount, (newCount, oldCount) => {
  console.log(`🔄 Pending count changed: ${oldCount} → ${newCount}`)
}, { immediate: true })

// onMounted
// onMounted - UPDATED VERSION mit Feature Flags
onMounted(async () => {
  console.log('🚀 Dashboard mounting...')

    console.log('🔥 Feature Flags Debug:', isEnabled('AUTO_REFRESH_PENDING'))

  
  await fetchCurrentUser()
  
  console.log('🔥 Current user after fetch:', currentUser.value)
  console.log('Debug - profileExists:', profileExists?.value)
  console.log('Debug - userError:', userError.value)

  if (currentUser.value && profileExists.value && ['staff', 'admin'].includes(currentUser.value.role)) {
    console.log('🔄 About to refresh pending data...')
    await refreshPendingData()
    console.log('✅ Pending data refresh completed')

  }
  console.log('🔄 About to update today state...')

  updateTodayState()
  updateCurrentMonth()
  console.log('✅ Today state updated')


// ✅ AUTO-REFRESH MIT FEATURE FLAG:
  console.log('🔍 Checking auto-refresh conditions...')
  console.log('🔍 process.client:', process.client)
  console.log('🔍 isEnabled result:', isEnabled('AUTO_REFRESH_PENDING'))

  if (process.client && isEnabled('AUTO_REFRESH_PENDING')) {
    console.log('🔄 Setting up auto-refresh interval (Feature Flag enabled)...')
    refreshInterval.value = setInterval(async () => {
      if (currentUser.value && profileExists.value && ['staff', 'admin'].includes(currentUser.value.role)) {
        console.log('🔄 Auto-refreshing pending data...')
        await refreshPendingData()
      }
    }, 5 * 60 * 1000) as unknown as number
  } else if (process.client) {
    console.log('⏸️ Auto-refresh disabled via Feature Flag')
     } else {
    console.log('⏸️ Auto-refresh disabled - not client side')
  }
    console.log('✅ onMounted completed')
})

// Cleanup on unmount (bleibt gleich)
onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
    console.log('🧹 Cleaned up refresh interval')
  }
})
</script>

<template>

  <!-- Loading State -->
  <div v-if="isLoading" class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto"></div>
      <p class="mt-4 text-gray-600">Lade Dashboard...</p>
    </div>
  </div>

  <!-- Auth Error State (nur bei echten Auth-Fehlern) -->
  <div v-else-if="userError && userError === 'Nicht eingeloggt'" class="min-h-screen flex items-center justify-center">
    <div class="text-center max-w-md p-6 bg-red-50 rounded-lg">
      <h2 class="text-xl font-bold text-red-800 mb-4">Nicht angemeldet</h2>
      <p class="text-red-600 mb-4">Du musst dich anmelden, um das Dashboard zu verwenden.</p>
      <button 
        @click="navigateTo('/')" 
        class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
      >
        Zum Login
      </button>
    </div>
  </div>

  <!-- NEU: Profile Setup State -->
  <div v-else-if="!profileExists && !userError" class="min-h-screen">
    <ProfileSetup @profile-created="handleProfileCreated" />
  </div>

  <!-- Success State - Dashboard -->
  <div v-else-if="currentUser && profileExists" class="h-screen flex flex-col">
    <!-- NEU: Status Update Indicator -->
    <div v-if="isUpdatingStatus" class="fixed top-4 right-4 bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg z-50">
      🔄 Updating appointment status...
    </div>

    <!-- Error Indicator -->
    <div v-if="statusUpdateError" class="fixed top-4 right-4 bg-red-500 text-white px-3 py-2 rounded-lg shadow-lg z-50">
      ❌ {{ statusUpdateError }}
    </div>

    <!-- Main Content -->
    <div class="flex-1 overflow-hidden">
      <CalendarComponent 
        ref="calendarRef" 
        :current-user="currentUser"
        @view-updated="onViewUpdate" 
        @appointment-changed="onAppointmentChanged"
      />
    </div>

    <!-- Footer Navigation -->
    <div class="fixed bottom-0 left-0 right-0 h-[50px] bg-white shadow z-50 flex justify-around items-center px-4">
      <button 
        @click="goToCustomers" 
        class="responsive bg-blue-500 hover:bg-blue-600 text-white font-bold px-3 py-2 rounded-xl shadow-lg transform active:scale-95 transition-all duration-200"
      >
        📋 Schüler
      </button>   
      
      <!-- Pendenzen Button - VERBESSERT -->
      <button 
        @click="() => { 
          console.log('🔥 Opening pendenzen modal, current count:', pendingCount); 
          showPendenzen = true; 
        }"
        :class="pendenzenButtonClasses"
      >
        {{ pendenzenButtonText }}
      </button>

      <!-- Pendenzen Modal -->
      <PendenzenModal
        :is-open="showPendenzen"
        :current-user="currentUser"
        @close="() => { 
          console.log('🔥 Closing pendenzen modal'); 
          showPendenzen = false; 
        }"
        @evaluate-lesson="handleEvaluateLesson"
      />
      
      <!-- Staff Settings nur für Staff/Admin -->
      <button 
        v-if="currentUser && (currentUser.role === 'staff' || currentUser.role === 'admin')"
        @click="showStaffSettings = true" 
        class="responsive bg-gray-500 hover:bg-gray-600 text-white font-bold px-3 py-2 rounded-xl shadow-lg transform active:scale-95 transition-all duration-200"
      >
        ⚙️ Profil
      </button>
    </div>
  </div>
  
  <!-- Fallback für andere Fehlerzustände -->
  <div v-else class="min-h-screen flex items-center justify-center">
    <div class="text-center max-w-md p-6 bg-yellow-50 rounded-lg">
      <h2 class="text-xl font-bold text-yellow-800 mb-4">Unbekannter Zustand</h2>
      <p class="text-yellow-600 mb-4">{{ userError || 'Ein unerwarteter Fehler ist aufgetreten.' }}</p>
      <button 
        @click="fetchCurrentUser()" 
        class="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 mr-2"
      >
        Erneut versuchen
      </button>
      <button 
        @click="navigateTo('/')" 
        class="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
      >
        Zum Login
      </button>
    </div>
  </div>

  <!-- Modals -->
  <StaffSettings 
    v-if="showStaffSettings && currentUser" 
    :current-user="currentUser"
    @close="showStaffSettings = false"
/>
</template>

<style>
.responsive {
  font-size: clamp(0.8rem, 1.5vw, 2rem)
}
</style>```

### ./pages/debug-auth.vue
```vue
<!-- pages/debug-auth.vue -->
<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold mb-4">Auth Debug</h1>
    
    <div class="space-y-4">
      <div>
        <h3 class="font-semibold">Auth Store State:</h3>
        <pre class="bg-gray-100 p-4 rounded">{{ authState }}</pre>
      </div>
      
      <div>
        <h3 class="font-semibold">Supabase User:</h3>
        <pre class="bg-gray-100 p-4 rounded">{{ supabaseUser }}</pre>
      </div>
      
      <div>
        <h3 class="font-semibold">Session:</h3>
        <pre class="bg-gray-100 p-4 rounded">{{ session }}</pre>
      </div>
      
      <button 
        @click="testLogin"
        class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Test Login
      </button>
    </div>
  </div>
</template>

<script setup>
import { getSupabase } from '~/utils/supabase'

const authStore = useAuthStore()
const { user, userRole, loading, errorMessage } = storeToRefs(authStore)
const supabase = getSupabase()

const supabaseUser = ref(null)
const session = ref(null)

const authState = computed(() => ({
  user: user.value,
  userRole: userRole.value,
  loading: loading.value,
  errorMessage: errorMessage.value
}))

const testLogin = async () => {
  console.log('🔄 Testing login...')
  
  const result = await authStore.login(
    'test.zuerich@example.com',
    'Test2025!',
    supabase
  )
  
  console.log('✅ Login result:', result)
}

const checkSession = async () => {
  const { data: { session: currentSession } } = await supabase.auth.getSession()
  session.value = currentSession
  
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  supabaseUser.value = currentUser
}

onMounted(() => {
  checkSession()
})
</script>```

### ./pages/debug-login.vue
```vue
<!-- pages/debug-login.vue -->
<template>
  <div class="min-h-screen bg-white py-12 px-4">
    <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8 border-4 border-black">
      <h1 class="text-4xl font-bold mb-8 text-center text-black">🔐 Login Debug</h1>
      
      <!-- Login Form -->
      <div class="space-y-6 mb-8">
        <div>
          <label class="block text-2xl font-bold text-black mb-2">Email:</label>
          <input 
            v-model="email"
            type="email" 
            class="block w-full border-4 border-black rounded-md px-4 py-4 text-2xl text-black bg-white"
            placeholder="test.zuerich@example.com"
          />
        </div>
        
        <div>
          <label class="block text-2xl font-bold text-black mb-2">Password:</label>
          <input 
            v-model="password"
            type="password" 
            class="block w-full border-4 border-black rounded-md px-4 py-4 text-2xl text-black bg-white"
            placeholder="123456"
          />
        </div>
        
        <div class="grid grid-cols-1 gap-4">
          <button 
            @click="testLogin"
            :disabled="isLoading"
            class="bg-black text-white py-4 px-8 rounded-md hover:bg-gray-800 disabled:opacity-50 text-2xl font-bold"
          >
            {{ isLoading ? 'Testing...' : 'TEST LOGIN' }}
          </button>
          
          <button 
            @click="testSupabaseDirectly"
            class="bg-blue-600 text-white py-4 px-8 rounded-md hover:bg-blue-700 text-2xl font-bold"
          >
            TEST SUPABASE DIRECTLY
          </button>
        </div>
      </div>

      <!-- Results -->
      <div v-if="result" class="mb-8 p-8 rounded-lg border-4" :class="result.success ? 'bg-green-200 border-green-600' : 'bg-red-200 border-red-600'">
        <h3 class="text-3xl font-bold mb-4" :class="result.success ? 'text-green-800' : 'text-red-800'">
          {{ result.success ? '✅ LOGIN SUCCESS!' : '❌ LOGIN FAILED' }}
        </h3>
        <div class="bg-white p-6 rounded border-4 border-black">
          <pre class="text-xl text-black overflow-auto whitespace-pre-wrap">{{ JSON.stringify(result, null, 2) }}</pre>
        </div>
      </div>

      <!-- Auth Store Status -->
      <div class="mb-8 p-8 bg-yellow-200 rounded-lg border-4 border-black">
        <h3 class="text-3xl font-bold text-black mb-4">Auth Store Status:</h3>
        <div class="text-2xl space-y-3 text-black">
          <div><strong>User:</strong> {{ authStore.user?.email || 'NONE' }}</div>
          <div><strong>Role:</strong> {{ authStore.userRole || 'NONE' }}</div>
          <div><strong>Loading:</strong> {{ authStore.loading }}</div>
          <div><strong>Error:</strong> {{ authStore.errorMessage || 'NONE' }}</div>
        </div>
      </div>

      <!-- Session Info -->
      <div v-if="sessionInfo" class="mb-8 p-8 bg-blue-200 rounded-lg border-4 border-black">
        <h3 class="text-3xl font-bold mb-4 text-black">Session Info:</h3>
        <div class="bg-white p-6 rounded border-4 border-black">
          <pre class="text-xl text-black overflow-auto whitespace-pre-wrap">{{ JSON.stringify(sessionInfo, null, 2) }}</pre>
        </div>
      </div>

      <!-- Instructions -->
      <div class="p-8 bg-gray-200 rounded-lg border-4 border-black">
        <h3 class="text-3xl font-bold mb-4 text-black">📝 Instructions:</h3>
        <div class="text-2xl text-black space-y-3">
          <div>• Press F12 to open Browser Console for detailed logs</div>
          <div>• Try different passwords if login fails</div>
          <div>• Check the exact error message in results</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { getSupabase } from '~/utils/supabase'

// State
const email = ref('test.zuerich@example.com')
const password = ref('123456')
const isLoading = ref(false)
const result = ref(null)
const sessionInfo = ref(null)

// Auth Store
const authStore = useAuthStore()

// Methods
const testLogin = async () => {
  isLoading.value = true
  result.value = null
  
  try {
    console.log('🔄 Testing login with auth store...')
    console.log('📧 Email:', email.value)
    console.log('🔑 Password:', password.value)
    
    const supabase = getSupabase()
    const success = await authStore.login(email.value, password.value, supabase)
    
    // Convert reactive objects to plain objects for display
    const plainResult = {
      success,
      method: 'AuthStore',
      user: authStore.user ? {
        id: authStore.user.id,
        email: authStore.user.email,
        email_confirmed_at: authStore.user.email_confirmed_at
      } : null,
      role: authStore.userRole,
      error: authStore.errorMessage,
      loading: authStore.loading
    }
    
    result.value = plainResult
    
    console.log('✅ Auth store result:', plainResult)
    console.log('🔍 Raw user object:', authStore.user)
    console.log('🔍 Raw error:', authStore.errorMessage)
    
  } catch (error) {
    console.error('❌ Login test failed:', error)
    result.value = {
      success: false,
      method: 'AuthStore',
      error: error.message,
      stack: error.stack
    }
  } finally {
    isLoading.value = false
  }
}

const testSupabaseDirectly = async () => {
  try {
    console.log('🔄 Testing Supabase directly...')
    
    const supabase = getSupabase()
    
    // Test login
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })
    
    console.log('🔐 Direct login result:', { data, error })
    
    sessionInfo.value = {
      loginData: data,
      loginError: error,
      timestamp: new Date().toISOString()
    }
    
    if (error) {
      result.value = {
        success: false,
        method: 'Direct Supabase',
        error: error.message,
        errorCode: error.code,
        errorStatus: error.status
      }
    } else {
      result.value = {
        success: true,
        method: 'Direct Supabase',
        user: data.user,
        session: data.session
      }
    }
    
  } catch (error) {
    console.error('❌ Direct Supabase test failed:', error)
    result.value = {
      success: false,
      method: 'Direct Supabase',
      error: error.message
    }
  }
}
</script>```

### ./pages/index.vue
```vue
<!-- ERWEITERTE index.vue mit Passwort Toggle & Debug Features -->

<template>
  <div class="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md">
      <!-- Header -->
      <div class="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-t-xl">
        <div class="text-center">
          <img src="/images/Driving_Team_ch.jpg" class="h-12 w-auto mx-auto mb-3" alt="Driving Team">
          <h1 class="text-2xl font-bold">Willkommen</h1>
          <p class="text-blue-100 mt-1">Melden Sie sich in Ihrem Account an</p>
        </div>
      </div>

      <!-- Login Form -->
      <div class="p-6">
        <form @submit.prevent="manualLogin" class="space-y-4">
          <!-- Email -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              E-Mail-Adresse
            </label>
            <input
              v-model="loginEmail"
              type="email"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="ihre.email@example.com"
            />
          </div>

          <!-- Password mit Toggle -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Passwort
            </label>
            <div class="relative">
              <input
                v-model="loginPassword"
                :type="showPassword ? 'text' : 'password'"
                required
                class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ihr Passwort"
              />
              <!-- Toggle Button -->
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <!-- Eye Icon (sichtbar) -->
                <svg v-if="!showPassword" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                
                <!-- Eye Slash Icon (versteckt) -->
                <svg v-else class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.466 8.466M9.878 9.878l4.242 4.242m0 0L15.533 15.533M14.12 14.12L8.466 8.466m5.654 5.654l1.414 1.414" />
                </svg>
              </button>
            </div>
            
            <!-- Debug Info (Development) -->
            <div v-if="loginPassword" class="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600">
              <strong>Debug:</strong> "{{ loginPassword }}" ({{ loginPassword.length }} Zeichen)
            </div>
          </div>

          <!-- Remember Me & Forgot Password -->
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <input
                v-model="rememberMe"
                type="checkbox"
                class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label class="ml-2 text-sm text-gray-600">
                Angemeldet bleiben
              </label>
            </div>
            
            <button
              type="button"
              @click="resetPassword"
              class="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              Passwort vergessen?
            </button>
          </div>

          <!-- Login Button -->
          <button
            type="submit"
            :disabled="isLoading || !loginEmail || !loginPassword"
            class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            <span v-if="isLoading">⏳ Anmelden...</span>
            <span v-else>🔑 Anmelden</span>
          </button>
        </form>


        <!-- Divider -->
        <div class="my-6 flex items-center">
          <div class="flex-1 border-t border-gray-300"></div>
          <span class="px-4 text-gray-500 text-sm">oder</span>
          <div class="flex-1 border-t border-gray-300"></div>
        </div>

        <!-- Register Link -->
        <div class="text-center">
          <p class="text-gray-600 text-sm mb-3">
            Noch kein Account?
          </p>
          <button
            @click="goToRegister"
            class="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            ✨ Kostenlos registrieren
          </button>
        </div>
      </div>
    </div>

    <!-- PASSWORD RESET MODAL -->
    <div v-if="showResetForm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <!-- Reset Header -->
        <div class="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-t-xl">
          <div class="text-center">
            <h2 class="text-xl font-bold">🔑 Neues Passwort setzen</h2>
            <p class="text-blue-100 mt-1">Geben Sie Ihr neues Passwort ein</p>
          </div>
        </div>
        
        <!-- Reset Content -->
        <div class="p-6">
          <!-- Success Message -->
          <div v-if="resetSuccess" class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p class="text-green-800 text-sm">{{ resetSuccess }}</p>
          </div>
          
          <!-- Error Message -->
          <div v-if="resetError" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-red-800 text-sm">{{ resetError }}</p>
          </div>
          
          <!-- Reset Form -->
          <form @submit.prevent="updatePassword" class="space-y-4">
            <!-- New Password -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Neues Passwort *
              </label>
              <input
                v-model="newPassword"
                type="password"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Mindestens 8 Zeichen"
              />
              <div class="mt-2 space-y-1">
                <div class="flex items-center space-x-2">
                  <span :class="passwordChecks.length ? 'text-green-600' : 'text-gray-400'" class="text-sm">
                    {{ passwordChecks.length ? '✓' : '○' }} Mindestens 8 Zeichen
                  </span>
                </div>
                <div class="flex items-center space-x-2">
                  <span :class="passwordChecks.uppercase ? 'text-green-600' : 'text-gray-400'" class="text-sm">
                    {{ passwordChecks.uppercase ? '✓' : '○' }} Großbuchstabe
                  </span>
                </div>
                <div class="flex items-center space-x-2">
                  <span :class="passwordChecks.number ? 'text-green-600' : 'text-gray-400'" class="text-sm">
                    {{ passwordChecks.number ? '✓' : '○' }} Zahl
                  </span>
                </div>
              </div>
            </div>

            <!-- Confirm Password -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Passwort bestätigen *
              </label>
              <input
                v-model="confirmPassword"
                type="password"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Passwort wiederholen"
              />
              <p v-if="confirmPassword && newPassword !== confirmPassword" 
                 class="text-red-600 text-sm mt-1">
                Passwörter stimmen nicht überein
              </p>
            </div>

            <!-- Buttons -->
            <div class="flex space-x-3">
              <button
                type="button"
                @click="showResetForm = false"
                class="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                :disabled="!canSubmitReset || isResetting"
                class="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg"
              >
                <span v-if="isResetting">⏳ Speichere...</span>
                <span v-else>💾 Speichern</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { navigateTo, useRoute } from '#app' // useRoute hier importieren
import { getSupabase } from '~/utils/supabase'
import { useAuthStore } from '~/stores/auth'
import { storeToRefs } from 'pinia'

const supabase = getSupabase()
const authStore = useAuthStore()
const { user, userRole, loading: authLoading } = storeToRefs(authStore)

// Login variables
const loginEmail = ref('')
const loginPassword = ref('')
const isLoading = ref(false)
const rememberMe = ref(false)
const showPassword = ref(false)

// Reset variables
const showResetForm = ref(false)
const resetError = ref('')
const resetSuccess = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const isResetting = ref(false)

// Password validation
const passwordChecks = computed(() => ({
  length: newPassword.value.length >= 8,
  uppercase: /[A-Z]/.test(newPassword.value),
  number: /[0-9]/.test(newPassword.value)
}))

const passwordIsValid = computed(() => {
  return passwordChecks.value.length &&
         passwordChecks.value.uppercase &&
         passwordChecks.value.number
})

const canSubmitReset = computed(() => {
  return newPassword.value &&
         confirmPassword.value &&
         newPassword.value === confirmPassword.value &&
         passwordIsValid.value
})

// Debug functions
const fillLoginData = (email: string, password: string) => {
  loginEmail.value = email
  loginPassword.value = password
  console.log(`🎯 Filled: ${email} / "${password}"`)
}

const debugAuth = () => {
  console.log('🔍 === LOGIN DEBUG INFO ===')
  console.log('Email:', `"${loginEmail.value}"`)
  console.log('Password:', `"${loginPassword.value}"`)
  console.log('Email Length:', loginEmail.value.length)
  console.log('Password Length:', loginPassword.value.length)
  console.log('Email Trimmed:', `"${loginEmail.value.trim()}"`)
  console.log('Password has spaces:', loginPassword.value.includes(' '))
  console.log('Password visible chars:', loginPassword.value.split('').map(c => c.charCodeAt(0)))
  console.log('========================')
}

// Auth token handling on mount
onMounted(async () => {
  try {
    const urlParams = new URLSearchParams(window.location.search)
    const hash = window.location.hash

    console.log('Page loaded with hash:', hash)

    // Check for reset parameter
    if (urlParams.get('reset') === 'true') {
      showResetForm.value = true
      return
    }

    // Check for auth tokens in hash
    if (hash.includes('access_token') && hash.includes('refresh_token')) {
      const hashParams = new URLSearchParams(hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const type = hashParams.get('type')

      if (type === 'recovery' && accessToken && refreshToken) {
        console.log('Password recovery detected')

        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })

        if (error) {
          resetError.value = `Session-Fehler: ${error.message}`
        } else {
          showResetForm.value = true
          resetSuccess.value = '✅ Reset-Link erfolgreich verarbeitet!'
        }

        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }

  } catch (error: any) {
    console.error('Mount error:', error)
  }
})

// WICHTIG: Watcher-Logik HIERher verschieben, direkt nach den reaktiven Variablen
watch(userRole, (newRole: string | null) => { // <<< `newRole: string | null` Typisierung hinzugefügt
  if (newRole) { // Wenn userRole gesetzt ist (nicht leer)
    console.log('DEBUG: UserRole detected in index.vue watcher:', newRole);
    // Nur navigieren, wenn nicht bereits auf der Zielseite
    const currentPath = useRoute().path; // useRoute ist jetzt importiert
    let targetPath = '/';

    switch (newRole) {
      case 'admin':
        targetPath = '/admin';
        console.log('🔄 Navigating admin to:', targetPath); // ← DIESE ZEILE HINZUFÜGEN

        break;
      case 'staff':
        targetPath = '/dashboard';
        break;
      case 'client':
        targetPath = '/customer-dashboard';
        break;
      default:
        targetPath = '/';
    }

    console.log('🎯 Final navigation:', currentPath, '→', targetPath); // ← UND DIESE
      if (currentPath !== targetPath) {
          navigateTo(targetPath);
      }
  }
});


// Enhanced Login function
const manualLogin = async () => {
  if (!loginEmail.value || !loginPassword.value) {
    alert('Bitte geben Sie E-Mail und Passwort ein')
    return
  }

  isLoading.value = true // Nur für den Button

  try {
    const email = loginEmail.value.trim().toLowerCase()
    const password = loginPassword.value

    console.log('🔑 Login attempt:', email)
    console.log('🔍 Password (visible):', password)

    await supabase.auth.signOut()

    const loginSuccess = await authStore.login(email, password, supabase);

    if (!loginSuccess) {
      alert(`Login fehlgeschlagen: ${authStore.errorMessage}`);
      return;
    }

    console.log('✅ Login initiated successfully via store action.');
    // Keine direkte Navigation hier, der Watcher auf userRole übernimmt dies
    // sobald der Store die Rolle geladen hat.

  } catch (error: any) {
    console.error('❌ Catch Error in manualLogin:', error)
    alert(`Fehler: ${error.message}`)
  } finally {
    isLoading.value = false
  }
}

// Password reset request
const resetPassword = async () => {
  if (!loginEmail.value) {
    alert('Bitte geben Sie zuerst Ihre E-Mail-Adresse ein')
    return
  }

  const { error } = await supabase.auth.resetPasswordForEmail(
    loginEmail.value.trim().toLowerCase(),
    {
      redirectTo: `${window.location.origin}/?reset=true`
    }
  )

  if (error) {
    alert(`Fehler: ${error.message}`)
  } else {
    alert('✅ Reset-E-Mail gesendet! Checken Sie Ihr Postfach.')
  }
}

// Password update
const updatePassword = async () => {
  if (!canSubmitReset.value) return

  isResetting.value = true

  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword.value
    })

    if (error) {
      throw error
    }

    resetSuccess.value = '🎉 Passwort erfolgreich geändert!'
    resetError.value = ''

    newPassword.value = ''
    confirmPassword.value = ''

    setTimeout(() => {
      showResetForm.value = false
      resetSuccess.value = ''
    }, 3000)

  } catch (error: any) {
    resetError.value = `Fehler: ${error.message}`
  } finally {
    isResetting.value = false
  }
}

// Navigation
const goToRegister = () => {
  navigateTo('/register')
}
</script>```

### ./pages/payment/failed.vue
```vue
<!-- pages/payment/failed.vue -->
<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      
      <!-- Error Card -->
      <div class="bg-white rounded-lg shadow-lg p-6 text-center">
        
        <!-- Error Icon -->
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </div>

        <!-- Error Message -->
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Zahlung fehlgeschlagen</h1>
        <p class="text-gray-600 mb-6">
          Ihre Zahlung konnte nicht verarbeitet werden. Bitte versuchen Sie es erneut oder wählen Sie eine andere Zahlungsart.
        </p>

        <!-- Error Details -->
        <div v-if="errorDetails" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
          <h3 class="font-semibold text-red-900 mb-2">Details</h3>
          <p class="text-sm text-red-800">{{ errorDetails.message }}</p>
          <p v-if="errorDetails.transactionId" class="text-xs text-red-600 mt-2 font-mono">
            Referenz: {{ errorDetails.transactionId }}
          </p>
        </div>

        <!-- Common Error Reasons -->
        <div class="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <h3 class="font-semibold text-gray-900 mb-3">Mögliche Ursachen:</h3>
          <ul class="text-sm text-gray-600 space-y-1">
            <li>• Ungenügend Guthaben auf der Karte</li>
            <li>• Karte ist abgelaufen oder gesperrt</li>
            <li>• Technisches Problem beim Zahlungsanbieter</li>
            <li>• Verbindungsfehler</li>
          </ul>
        </div>

        <!-- Actions -->
        <div class="space-y-3">
          <button
            @click="retryPayment"
            class="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            💳 Zahlung wiederholen
          </button>
          
          <button
            @click="goToCalendar"
            class="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Zurück zum Kalender
          </button>
          
          <button
            @click="contactSupport"
            class="w-full text-gray-600 py-2 px-4 rounded-lg font-medium hover:text-gray-800 transition-colors"
          >
            📞 Support kontaktieren
          </button>
        </div>
      </div>

      <!-- Additional Info -->
      <div class="mt-6 text-center">
        <p class="text-sm text-gray-600">
          Bei anhaltenden Problemen kontaktieren Sie uns unter 
          <a href="mailto:info@drivingteam.ch" class="text-green-600 hover:underline">
            info@drivingteam.ch
          </a> oder 
          <a href="tel:+41444310033" class="text-green-600 hover:underline">
            044 431 00 33
          </a>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
// Import von Nuxt hinzufügen
import {  useRoute, useRouter } from '#app'
import { getSupabase } from '~/utils/supabase'

// Router
const route = useRoute()
const router = useRouter()

// Supabase
const supabase = getSupabase()

// State
const errorDetails = ref<any>(null)
const failedPayment = ref<any>(null)

// Methods
const loadFailureDetails = async () => {
  try {
    const transactionId = route.query.transaction_id || route.query.id
    const errorCode = route.query.error
    const errorMessage = route.query.error_description
    
    console.log('❌ Payment failed:', { transactionId, errorCode, errorMessage })

    if (transactionId) {
      // Try to find the failed payment in database
      const { data: payment, error } = await supabase
        .from('payments')
        .select(`
          *,
          appointments (
            title,
            start_time,
            duration_minutes
          )
        `)
        .eq('wallee_transaction_id', transactionId)
        .single()

      if (!error && payment) {
        failedPayment.value = payment
        
        // Update payment status to failed
        await supabase
          .from('payments')
          .update({ 
            payment_status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.id)
      }
    }

    // Set error details
    errorDetails.value = {
      message: errorMessage || 'Die Zahlung wurde abgebrochen oder konnte nicht verarbeitet werden.',
      code: errorCode,
      transactionId: transactionId
    }

  } catch (err: any) {
    console.error('❌ Error loading failure details:', err)
    errorDetails.value = {
      message: 'Ein unbekannter Fehler ist aufgetreten.'
    }
  }
}

const retryPayment = () => {
  // Go back to calendar and show payment modal again
  if (failedPayment.value?.appointment_id) {
    router.push(`/?retry_payment=${failedPayment.value.appointment_id}`)
  } else {
    router.push('/')
  }
}

const goToCalendar = () => {
  router.push('/')
}

const contactSupport = () => {
  // Open email client with pre-filled error info
  const subject = encodeURIComponent('Zahlungsproblem - Driving Team')
  const body = encodeURIComponent(`
Hallo,

ich hatte ein Problem bei der Zahlung meiner Fahrlektion.

Details:
- Transaktions-ID: ${errorDetails.value?.transactionId || 'Unbekannt'}
- Fehlermeldung: ${errorDetails.value?.message || 'Unbekannt'}
- Datum: ${new Date().toLocaleString('de-CH')}

Bitte helfen Sie mir bei der Lösung dieses Problems.

Vielen Dank!
  `)
  
  window.location.href = `mailto:info@drivingteam.ch?subject=${subject}&body=${body}`
}

// Lifecycle
onMounted(() => {
  loadFailureDetails()
})
</script>
```

### ./pages/payment/success.vue
```vue
<!-- pages/payment/success.vue -->
<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      
      <!-- Success Card -->
      <div class="bg-white rounded-lg shadow-lg p-6 text-center">
        
        <!-- Success Icon -->
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>

        <!-- Success Message -->
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Zahlung erfolgreich!</h1>
        <p class="text-gray-600 mb-6">
          Ihre Zahlung wurde erfolgreich verarbeitet. Sie erhalten in Kürze eine Bestätigung per E-Mail.
        </p>

        <!-- Payment Details -->
        <div v-if="paymentDetails" class="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <h3 class="font-semibold text-gray-900 mb-3">Zahlungsdetails</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">Betrag:</span>
              <span class="font-medium">CHF {{ paymentDetails.amount }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Zahlungsart:</span>
              <span class="font-medium">{{ paymentDetails.method }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Transaktions-ID:</span>
              <span class="font-medium font-mono text-xs">{{ paymentDetails.transactionId }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Datum:</span>
              <span class="font-medium">{{ formatDate(paymentDetails.date) }}</span>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="flex items-center justify-center py-4">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
          <span class="ml-2 text-gray-600">Zahlungsdetails werden geladen...</span>
        </div>

        <!-- Actions -->
        <div class="space-y-3">
          <button
            @click="goToCalendar"
            class="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Zurück zum Kalender
          </button>
          
          <button
            v-if="paymentDetails"
            @click="downloadReceipt"
            class="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            📄 Quittung herunterladen
          </button>
        </div>
      </div>

      <!-- Additional Info -->
      <div class="mt-6 text-center">
        <p class="text-sm text-gray-600">
          Bei Fragen zur Zahlung kontaktieren Sie uns unter 
          <a href="mailto:info@drivingteam.ch" class="text-green-600 hover:underline">
            info@drivingteam.ch
          </a>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
// Import von Nuxt hinzufügen
import { useRoute, useRouter } from '#app'
import { getSupabase } from '~/utils/supabase'

// Router
const route = useRoute()
const router = useRouter()

// Supabase
const supabase = getSupabase()

// State
const isLoading = ref(true)
const paymentDetails = ref<any>(null)

// Methods
const loadPaymentDetails = async () => {
  try {
    const transactionId = route.query.transaction_id || route.query.id
    
    if (!transactionId) {
      console.error('❌ No transaction ID provided')
      return
    }

    console.log('🔍 Loading payment details for transaction:', transactionId)

    // Fetch payment from database
    const { data: payment, error } = await supabase
      .from('payments')
      .select(`
        *,
        appointments (
          title,
          start_time,
          duration_minutes
        ),
        users!payments_user_id_fkey (
          first_name,
          last_name,
          email
        )
      `)
      .eq('wallee_transaction_id', transactionId)
      .single()

    if (error) {
      console.error('❌ Error loading payment:', error)
      return
    }

    if (!payment) {
      console.error('❌ Payment not found')
      return
    }

    paymentDetails.value = {
      id: payment.id,
      amount: (payment.total_amount_rappen / 100).toFixed(2),
      method: getPaymentMethodName(payment.payment_method),
      transactionId: payment.wallee_transaction_id,
      date: payment.paid_at || payment.created_at,
      status: payment.payment_status,
      appointment: payment.appointments,
      user: payment.users
    }

    console.log('✅ Payment details loaded:', paymentDetails.value)

  } catch (err: any) {
    console.error('❌ Error loading payment details:', err)
  } finally {
    isLoading.value = false
  }
}

const getPaymentMethodName = (method: string): string => {
  const methods: Record<string, string> = {
    'twint': 'Twint',
    'wallee_card': 'Kreditkarte',
    'stripe_card': 'Kreditkarte', 
    'debit_card': 'Debitkarte',
    'cash': 'Bar',
    'invoice': 'Rechnung'
  }
  return methods[method] || method
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('de-CH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const goToCalendar = () => {
  router.push('/')
}

const downloadReceipt = async () => {
  if (!paymentDetails.value) return
  
  try {
    // Type the response properly
    interface ReceiptResponse {
      success: boolean
      pdfUrl?: string
      error?: string
    }
    
    // Generate PDF receipt
    const response = await $fetch<ReceiptResponse>('/api/payments/receipt', {
      method: 'POST',
      body: {
        paymentId: paymentDetails.value.id
      }
    })

    if (response.success && response.pdfUrl) {
      // Download PDF
      const link = document.createElement('a')
      link.href = response.pdfUrl
      link.download = `Quittung_${paymentDetails.value.transactionId}.pdf`
      link.click()
    } else {
      throw new Error(response.error || 'Receipt generation failed')
    }
  } catch (err: any) {
    console.error('❌ Error downloading receipt:', err)
    alert('Fehler beim Herunterladen der Quittung')
  }
}

// Lifecycle
onMounted(() => {
  loadPaymentDetails()
})
</script>```

### ./pages/register.vue
```vue
<template>
  <div class="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-t-xl">
        <div class="text-center">
          <img src="/images/Driving_Team_ch.jpg" class="h-12 w-auto mx-auto mb-3" alt="Driving Team">
          <h1 class="text-2xl font-bold">Fahrschüler Registrierung</h1>
          <p class="text-blue-100 mt-1">Erstellen Sie Ihr Konto für Fahrstunden</p>
        </div>
      </div>

      <!-- Progress Steps -->
      <div class="px-6 py-4 bg-gray-50 border-b">
        <div class="flex items-center justify-center space-x-4">
          <div :class="currentStep >= 1 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'" 
               class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold">
            1
          </div>
          <div class="h-1 w-12 bg-gray-300">
            <div v-if="currentStep >= 2" class="h-full bg-green-500 transition-all duration-300"></div>
          </div>
          <div :class="currentStep >= 2 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'" 
               class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold">
            2
          </div>
          <div class="h-1 w-12 bg-gray-300">
            <div v-if="currentStep >= 3" class="h-full bg-green-500 transition-all duration-300"></div>
          </div>
          <div :class="currentStep >= 3 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'" 
               class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold">
            3
          </div>
        </div>
        <div class="flex justify-center mt-2 space-x-16 text-xs text-gray-600">
          <span>Persönliche Daten</span>
          <span>Lernfahrausweis</span>
          <span>Account</span>
        </div>
      </div>

      <!-- Step Content -->
      <div class="p-6">
        
        <!-- Step 1: Personal Data -->
        <div v-if="currentStep === 1" class="space-y-6">
          <div class="text-center">
            <h2 class="text-xl font-semibold text-gray-900 mb-2">👤 Persönliche Daten</h2>
            <p class="text-gray-600">Bitte geben Sie Ihre persönlichen Daten ein</p>
          </div>

          <!-- Personal Information Form -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- First Name -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Vorname *
              </label>
              <input
                v-model="formData.firstName"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Max"
              />
            </div>

            <!-- Last Name -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Nachname *
              </label>
              <input
                v-model="formData.lastName"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Mustermann"
              />
            </div>

            <!-- Birth Date -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Geburtsdatum *
              </label>
              <input
                v-model="formData.birthDate"
                type="date"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <!-- Phone -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Telefon *
              </label>
              <input
                v-model="formData.phone"
                type="tel"
                required
                @blur="normalizePhone"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="079 123 45 67"
              />
              <p class="text-xs text-gray-500 mt-1">Format: +41791234567</p>
            </div>

            <!-- Street -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Strasse *
              </label>
              <input
                v-model="formData.street"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Musterstrasse"
              />
            </div>

            <!-- Street Number -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Hausnummer *
              </label>
              <input
                v-model="formData.streetNr"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="123"
              />
            </div>

            <!-- ZIP -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                PLZ *
              </label>
              <input
                v-model="formData.zip"
                type="text"
                required
                pattern="[0-9]{4}"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="8000"
              />
            </div>

            <!-- City -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Ort *
              </label>
              <input
                v-model="formData.city"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Zürich"
              />
            </div>
          </div>

          <!-- Categories -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-3">
              Führerschein-Kategorien *
            </label>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div v-for="category in availableCategories" :key="category.code" class="relative">
                <input
                  :id="`cat-${category.code}`"
                  v-model="formData.categories"
                  :value="category.code"
                  type="checkbox"
                  class="sr-only"
                />
                <label
                  :for="`cat-${category.code}`"
                  :class="formData.categories.includes(category.code) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'"
                  class="flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer hover:border-blue-400 transition-colors"
                >
                  <span class="text-lg font-bold">{{ category.code }}</span>
                  <span class="text-xs mt-1">{{ category.name }}</span>
                  <span class="text-xs text-gray-500">CHF {{ category.price }}/45min</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Lernfahrausweis Upload -->
        <div v-if="currentStep === 2" class="space-y-6">
          <div class="text-center">
            <h2 class="text-xl font-semibold text-gray-900 mb-2">📄 Lernfahrausweis hochladen</h2>
            <p class="text-gray-600">Laden Sie ein Foto oder Scan Ihres Lernfahrausweises hoch</p>
          </div>

          <!-- Lernfahrausweis Number (Manual Entry) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Lernfahrausweis-Nummer *
            </label>
            <input
              v-model="formData.lernfahrausweisNr"
              type="text"
              required
              pattern="L[0-9]{6,10}"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="z.B. L123456789"
            />
            <p class="text-xs text-gray-500 mt-1">Format: L + 6-10 Ziffern</p>
          </div>

          <!-- Upload Area -->
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-8">
            <!-- Upload Buttons -->
            <div v-if="!uploadedImage" class="text-center space-y-4">
              <div class="text-6xl text-gray-400 mb-4">📄</div>
              
              <!-- Camera Button -->
              <button
                @click="openCamera"
                class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors mr-4"
              >
                📸 Foto aufnehmen
              </button>
              
              <!-- File Upload -->
              <div class="relative inline-block">
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/*"
                  @change="handleFileUpload"
                  class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <button class="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
                  📁 Datei auswählen
                </button>
              </div>
              
              <p class="text-sm text-gray-500 mt-4">
                Unterstützte Formate: JPG, PNG<br>
                Maximale Dateigröße: 5MB
              </p>
            </div>

            <!-- Uploaded Image Preview -->
            <div v-if="uploadedImage" class="space-y-4">
              <div class="text-center">
                <img :src="uploadedImage" alt="Lernfahrausweis" class="max-w-full h-64 object-contain mx-auto rounded-lg shadow-md">
              </div>
              
              <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                <p class="text-green-800 font-medium">✅ Lernfahrausweis erfolgreich hochgeladen!</p>
                <p class="text-green-600 text-sm mt-1">Das Bild wird mit Ihrer Registrierung gespeichert.</p>
              </div>
              
              <!-- Buttons -->
              <div class="flex justify-center space-x-4">
                <button
                  @click="clearImage"
                  class="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  🗑️ Neues Bild
                </button>
              </div>
            </div>
          </div>

          <!-- Camera Modal -->
          <div v-if="showCamera" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 class="text-lg font-semibold mb-4">📸 Foto aufnehmen</h3>
              
              <video ref="videoElement" autoplay class="w-full rounded-lg mb-4"></video>
              <canvas ref="canvasElement" class="hidden"></canvas>
              
              <div class="flex justify-between space-x-4">
                <button
                  @click="closeCamera"
                  class="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg"
                >
                  Abbrechen
                </button>
                <button
                  @click="capturePhoto"
                  class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
                >
                  📸 Aufnehmen
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 3: Account Creation -->
        <div v-if="currentStep === 3" class="space-y-6">
          <div class="text-center">
            <h2 class="text-xl font-semibold text-gray-900 mb-2">🔐 Account erstellen</h2>
            <p class="text-gray-600">Erstellen Sie Ihren Login-Account</p>
          </div>

          <!-- Email -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              E-Mail-Adresse *
            </label>
            <input
              v-model="formData.email"
              type="email"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="max.mustermann@example.com"
            />
          </div>

          <!-- Password -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Passwort *
            </label>
            <input
              v-model="formData.password"
              type="password"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Mindestens 8 Zeichen"
            />
            <div class="mt-2 space-y-1">
              <div class="flex items-center space-x-2">
                <span :class="passwordChecks.length ? 'text-green-600' : 'text-gray-400'" class="text-sm">
                  {{ passwordChecks.length ? '✓' : '○' }} Mindestens 8 Zeichen
                </span>
              </div>
              <div class="flex items-center space-x-2">
                <span :class="passwordChecks.uppercase ? 'text-green-600' : 'text-gray-400'" class="text-sm">
                  {{ passwordChecks.uppercase ? '✓' : '○' }} Großbuchstabe
                </span>
              </div>
              <div class="flex items-center space-x-2">
                <span :class="passwordChecks.number ? 'text-green-600' : 'text-gray-400'" class="text-sm">
                  {{ passwordChecks.number ? '✓' : '○' }} Zahl
                </span>
              </div>
            </div>
          </div>

          <!-- Password Confirmation -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Passwort bestätigen *
            </label>
            <input
              v-model="formData.confirmPassword"
              type="password"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Passwort wiederholen"
            />
            <p v-if="formData.confirmPassword && formData.password !== formData.confirmPassword" 
               class="text-red-600 text-sm mt-1">
              Passwörter stimmen nicht überein
            </p>
          </div>

          <!-- Terms -->
          <div class="flex items-start space-x-3">
            <input
              v-model="formData.acceptTerms"
              type="checkbox"
              required
              class="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label class="text-sm text-gray-700">
              Ich akzeptiere die <a href="#" class="text-blue-600 hover:underline">Allgemeinen Geschäftsbedingungen</a> 
              und die <a href="#" class="text-blue-600 hover:underline">Datenschutzerklärung</a> *
            </label>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <div class="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-between">
        <button
          v-if="currentStep > 1"
          @click="prevStep"
          class="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          ← Zurück
        </button>
        <div v-else></div>

        <button
          v-if="currentStep < 3"
          @click="nextStep"
          :disabled="!canProceed"
          class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          Weiter →
        </button>
        
        <button
          v-if="currentStep === 3"
          @click="submitRegistration"
          :disabled="!canSubmit || isSubmitting"
          class="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          <span v-if="isSubmitting">⏳ Registrierung...</span>
          <span v-else>✅ Registrieren</span>
        </button>
      </div>

      <!-- Login Link -->
      <div class="px-6 py-3 text-center border-t">
        <p class="text-gray-600 text-sm">
          Bereits registriert?
          <button 
            @click="navigateTo('/')"
            class="text-blue-600 hover:text-blue-800 font-semibold ml-1"
          >
            Hier anmelden
          </button>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { navigateTo } from '#app'
import { getSupabase } from '~/utils/supabase'

const supabase = getSupabase()

// State
const currentStep = ref(1)
const isSubmitting = ref(false)
const uploadedImage = ref<string | null>(null)
const showCamera = ref(false)

// Refs
const fileInput = ref<HTMLInputElement>()
const videoElement = ref<HTMLVideoElement>()
const canvasElement = ref<HTMLCanvasElement>()

// Form data
const formData = ref({
  // Personal data
  firstName: '',
  lastName: '',
  birthDate: '',
  phone: '',
  street: '',
  streetNr: '',
  zip: '',
  city: '',
  categories: [] as string[],
  lernfahrausweisNr: '',
  
  // Account data
  email: '',
  password: '',
  confirmPassword: '',
  acceptTerms: false
})

// Available categories
const availableCategories = ref([
  { code: 'B', name: 'Auto', price: 95 },
  { code: 'A', name: 'Motorrad', price: 95 },
  { code: 'BE', name: 'Auto + Anhänger', price: 120 },
  { code: 'C', name: 'LKW', price: 170 },
  { code: 'CE', name: 'LKW + Anhänger', price: 200 },
  { code: 'D', name: 'Bus', price: 200 },
  { code: 'BPT', name: 'Berufspersonentransport', price: 100 }
])

// Computed
const canProceed = computed(() => {
  if (currentStep.value === 1) {
    return formData.value.firstName && formData.value.lastName && 
           formData.value.birthDate && formData.value.phone && 
           formData.value.street && formData.value.streetNr && 
           formData.value.zip && formData.value.city && 
           formData.value.categories.length > 0
  }
  if (currentStep.value === 2) {
    return formData.value.lernfahrausweisNr && uploadedImage.value
  }
  return true
})

const canSubmit = computed(() => {
  return formData.value.email && 
         formData.value.password && 
         formData.value.confirmPassword === formData.value.password && 
         formData.value.acceptTerms && 
         passwordIsValid.value
})

const passwordChecks = computed(() => ({
  length: formData.value.password.length >= 8,
  uppercase: /[A-Z]/.test(formData.value.password),
  number: /[0-9]/.test(formData.value.password)
}))

const passwordIsValid = computed(() => {
  return passwordChecks.value.length && 
         passwordChecks.value.uppercase && 
         passwordChecks.value.number
})

// Methods
const normalizePhone = () => {
  let phone = formData.value.phone.replace(/[^0-9+]/g, '')
  
  if (phone.startsWith('0') && phone.length === 10) {
    phone = '+41' + phone.substring(1)
  } else if (phone.startsWith('41') && phone.length === 11) {
    phone = '+' + phone
  }
  
  formData.value.phone = phone
}

const nextStep = () => {
  if (canProceed.value) {
    currentStep.value++
  }
}

const prevStep = () => {
  currentStep.value--
}

// Camera functions
const openCamera = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' }
    })
    showCamera.value = true
    
    await nextTick()
    if (videoElement.value) {
      videoElement.value.srcObject = stream
    }
  } catch (error) {
    console.error('Camera access denied:', error)
    alert('Kamera-Zugriff verweigert. Bitte laden Sie eine Datei hoch.')
  }
}

const closeCamera = () => {
  if (videoElement.value?.srcObject) {
    const stream = videoElement.value.srcObject as MediaStream
    stream.getTracks().forEach(track => track.stop())
  }
  showCamera.value = false
}

const capturePhoto = () => {
  if (videoElement.value && canvasElement.value) {
    const canvas = canvasElement.value
    const video = videoElement.value
    
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    const ctx = canvas.getContext('2d')
    ctx?.drawImage(video, 0, 0)
    
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8)
    uploadedImage.value = imageDataUrl
    
    closeCamera()
  }
}

// File upload
const handleFileUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('Datei zu groß! Maximale Größe: 5MB')
      return
    }
    
    const reader = new FileReader()
    reader.onload = (e) => {
      uploadedImage.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}

const clearImage = () => {
  uploadedImage.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// FINALE LÖSUNG: Registrierung mit separater public.users Tabelle

const submitRegistration = async () => {
  if (!canSubmit.value) return
  
  isSubmitting.value = true
  
  try {
    // 1. Auth User erstellen (für Login)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.value.email,
      password: formData.value.password,
      options: {
        data: {
          first_name: formData.value.firstName,
          last_name: formData.value.lastName
        }
      }
    })
    
    if (authError) throw authError
    
    if (!authData.user?.id) {
      throw new Error('Benutzer-ID nicht erhalten')
    }
    
    console.log('Auth User created:', authData.user.id)
    
    // 2. Profil-Daten in public.users speichern
    let { data: userData, error: profileError } = await supabase
      .from('users')
      .insert({
        // WICHTIG: Verwende die auth.user.id als id
        id: authData.user.id,
        email: formData.value.email,
        role: 'client',
        first_name: formData.value.firstName,
        last_name: formData.value.lastName,
        phone: formData.value.phone,
        birthdate: formData.value.birthDate,
        street: formData.value.street,
        street_nr: formData.value.streetNr,
        zip: formData.value.zip,
        city: formData.value.city,
        category: formData.value.categories.join(','),
        lernfahrausweis_url: formData.value.lernfahrausweisNr,
        is_active: true
      })
      .select()
      .single()
    
    if (profileError) {
      console.error('Profile error:', profileError)
      
      // Fallback: Falls public.users bereits existiert, update stattdessen
      if (profileError.code === '23505') { // Unique constraint violation
        const { data: updateData, error: updateError } = await supabase
          .from('users')
          .update({
            email: formData.value.email,
            role: 'client',
            first_name: formData.value.firstName,
            last_name: formData.value.lastName,
            phone: formData.value.phone,
            birthdate: formData.value.birthDate,
            street: formData.value.street,
            street_nr: formData.value.streetNr,
            zip: formData.value.zip,
            city: formData.value.city,
            category: formData.value.categories.join(','),
            lernfahrausweis_url: formData.value.lernfahrausweisNr,
            is_active: true
          })
          .eq('id', authData.user.id)
          .select()
          .single()
        
        if (updateError) throw updateError
        userData = updateData
      } else {
        throw profileError
      }
    }
    
    console.log('Profile created:', userData)
    
    // 3. Lernfahrausweis-Bild hochladen
    if (uploadedImage.value) {
      try {
        const blob = await fetch(uploadedImage.value).then(r => r.blob())
        const fileName = `learner_permit_${authData.user.id}_${Date.now()}.jpg`
        
        // Upload in bestehenden learner-permits bucket
        const { error: uploadError } = await supabase.storage
          .from('learner-permits')
          .upload(fileName, blob, {
            cacheControl: '3600',
            upsert: false
          })
        
        if (!uploadError) {
          // Update user mit Bild-Pfad
          await supabase
            .from('users')
            .update({ lernfahrausweis_url: fileName })
            .eq('id', authData.user.id)
          
          console.log('Image uploaded:', fileName)
        } else {
          console.warn('Image upload failed:', uploadError)
          // Nicht kritisch - weiter ohne Bild
        }
      } catch (uploadError) {
        console.warn('Image upload error:', uploadError)
      }
    }
    
    // 4. Erfolg!
    alert('🎉 Registrierung erfolgreich! Bitte bestätigen Sie Ihre E-Mail-Adresse.')
    await navigateTo('/')
    
  } catch (error: any) {
    console.error('Registration error:', error)
    
    // Spezifische Fehlermeldungen
    let errorMessage = 'Unbekannter Fehler'
    
    if (error.message?.includes('User already registered')) {
      errorMessage = 'Diese E-Mail-Adresse ist bereits registriert.'
    } else if (error.message?.includes('duplicate key')) {
      errorMessage = 'Benutzer existiert bereits. Versuchen Sie sich anzumelden.'
    } else if (error.message?.includes('invalid email')) {
      errorMessage = 'Ungültige E-Mail-Adresse.'
    } else if (error.message?.includes('weak password')) {
      errorMessage = 'Passwort zu schwach. Mindestens 8 Zeichen, 1 Großbuchstabe, 1 Zahl erforderlich.'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    alert(`Fehler bei der Registrierung: ${errorMessage}`)
    
    // Bei Auth-Erfolg aber Profile-Fehler: User zur Vervollständigung weiterleiten
    if (error.code === '23505' && error.table === 'users') {
      alert('Ihr Account wurde erstellt, aber das Profil konnte nicht gespeichert werden. Bitte loggen Sie sich ein und vervollständigen Sie Ihr Profil.')
      await navigateTo('/')
    }
    
  } finally {
    isSubmitting.value = false
  }
}

// Load categories from database
onMounted(async () => {
  try {
    const { data: categories } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
    
    if (categories) {
      availableCategories.value = categories.map(cat => ({
        code: cat.code || cat.name,
        name: cat.description || cat.name,
        price: cat.price_per_lesson || 95
      }))
    }
  } catch (error) {
    console.error('Error loading categories:', error)
  }
})
</script>```

### ./pages/reset-password.vue
```vue
<template>
  <div class="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md">
      <!-- Header -->
      <div class="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-t-xl">
        <div class="text-center">
          <img src="/images/Driving_Team_ch.jpg" class="h-12 w-auto mx-auto mb-3" alt="Driving Team">
          <h1 class="text-2xl font-bold">Passwort zurücksetzen</h1>
          <p class="text-blue-100 mt-1">Geben Sie Ihr neues Passwort ein</p>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6">
        <!-- Loading State -->
        <div v-if="isLoading" class="text-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p class="text-gray-600">Verarbeite Reset-Link...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-center py-8">
          <div class="text-6xl mb-4">❌</div>
          <h3 class="text-lg font-semibold text-red-600 mb-2">Reset-Link ungültig</h3>
          <p class="text-gray-600 mb-4">{{ error }}</p>
          <button
            @click="goToLogin"
            class="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
          >
            Zurück zum Login
          </button>
        </div>

        <!-- Success State -->
        <div v-else-if="success" class="text-center py-8">
          <div class="text-6xl mb-4">🎉</div>
          <h3 class="text-lg font-semibold text-green-600 mb-2">Passwort erfolgreich geändert!</h3>
          <p class="text-gray-600 mb-4">Sie können sich jetzt mit Ihrem neuen Passwort anmelden.</p>
          <button
            @click="goToLogin"
            class="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
          >
            Zum Login
          </button>
        </div>

        <!-- Reset Form -->
        <form v-else @submit.prevent="updatePassword" class="space-y-4">
          <div class="text-center mb-6">
            <div class="text-4xl mb-2">🔑</div>
            <p class="text-green-600 font-medium">✅ Reset-Link ist gültig!</p>
            <p class="text-gray-600 text-sm">Geben Sie Ihr neues Passwort ein</p>
          </div>

          <!-- New Password -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Neues Passwort *
            </label>
            <input
              v-model="newPassword"
              type="password"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Mindestens 8 Zeichen"
            />
            <div class="mt-2 space-y-1">
              <div class="flex items-center space-x-2">
                <span :class="passwordChecks.length ? 'text-green-600' : 'text-gray-400'" class="text-sm">
                  {{ passwordChecks.length ? '✓' : '○' }} Mindestens 8 Zeichen
                </span>
              </div>
              <div class="flex items-center space-x-2">
                <span :class="passwordChecks.uppercase ? 'text-green-600' : 'text-gray-400'" class="text-sm">
                  {{ passwordChecks.uppercase ? '✓' : '○' }} Großbuchstabe
                </span>
              </div>
              <div class="flex items-center space-x-2">
                <span :class="passwordChecks.number ? 'text-green-600' : 'text-gray-400'" class="text-sm">
                  {{ passwordChecks.number ? '✓' : '○' }} Zahl
                </span>
              </div>
            </div>
          </div>

          <!-- Confirm Password -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Passwort bestätigen *
            </label>
            <input
              v-model="confirmPassword"
              type="password"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Passwort wiederholen"
            />
            <p v-if="confirmPassword && newPassword !== confirmPassword" 
               class="text-red-600 text-sm mt-1">
              Passwörter stimmen nicht überein
            </p>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="!canSubmit || isSubmitting"
            class="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            <span v-if="isSubmitting">⏳ Passwort wird gesetzt...</span>
            <span v-else>🔒 Passwort speichern</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { navigateTo } from '#app'
import { getSupabase } from '~/utils/supabase'

const supabase = getSupabase()

// State
const isLoading = ref(true)
const isSubmitting = ref(false)
const error = ref('')
const success = ref(false)
const newPassword = ref('')
const confirmPassword = ref('')

// Computed
const passwordChecks = computed(() => ({
  length: newPassword.value.length >= 8,
  uppercase: /[A-Z]/.test(newPassword.value),
  number: /[0-9]/.test(newPassword.value)
}))

const passwordIsValid = computed(() => {
  return passwordChecks.value.length && 
         passwordChecks.value.uppercase && 
         passwordChecks.value.number
})

const canSubmit = computed(() => {
  return newPassword.value && 
         confirmPassword.value && 
         newPassword.value === confirmPassword.value && 
         passwordIsValid.value
})

// Methods
const updatePassword = async () => {
  if (!canSubmit.value) return
  
  isSubmitting.value = true
  
  try {
    const { data, error: updateError } = await supabase.auth.updateUser({
      password: newPassword.value
    })
    
    if (updateError) {
      throw updateError
    }
    
    console.log('Password updated successfully:', data)
    success.value = true
    
    // Auto-redirect nach 3 Sekunden
    setTimeout(() => {
      goToLogin()
    }, 3000)
    
  } catch (err: any) {
    console.error('Password update error:', err)
    error.value = `Fehler beim Passwort-Update: ${err.message}`
  } finally {
    isSubmitting.value = false
  }
}

const goToLogin = () => {
  navigateTo('/')
}

// Handle the reset session on mount
onMounted(async () => {
  try {
    console.log('=== PASSWORD RESET PAGE LOADED ===')
    
    // Check URL for auth tokens
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    
    console.log('URL tokens found:', { 
      hasAccessToken: !!accessToken, 
      hasRefreshToken: !!refreshToken 
    })
    
    if (accessToken && refreshToken) {
      // Set the session from URL tokens
      const { data, error: setSessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })
      
      if (setSessionError) {
        throw setSessionError
      }
      
      console.log('Session set successfully:', data.session?.user?.email)
      isLoading.value = false
    } else {
      // Check if we already have a valid session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        throw sessionError
      }
      
      if (session) {
        console.log('Existing session found:', session.user.email)
        isLoading.value = false
      } else {
        throw new Error('Kein gültiger Reset-Token gefunden. Bitte fordern Sie einen neuen Reset-Link an.')
      }
    }
    
  } catch (err: any) {
    console.error('Reset page error:', err)
    error.value = err.message
    isLoading.value = false
  }
})
</script>```

### ./composables/useAppointmentStatus.ts
```typescript
// composables/useAppointmentStatus.ts - Status-Workflow Management
import { ref } from 'vue'
import { getSupabase } from '~/utils/supabase'

export const useAppointmentStatus = () => {
  const supabase = getSupabase()
  const isUpdating = ref(false)
  const updateError = ref<string | null>(null)

  /**
   * Update appointments from 'confirmed' to 'completed' after end_time
   * Läuft automatisch und updated alle überfälligen Termine
   */
const updateOverdueAppointments = async () => {
  isUpdating.value = true
  updateError.value = null
  try {
    console.log('🔄 Checking for overdue appointments...')
    
    const now = new Date().toISOString()
    
    // 🆕 ERWEITERT: Finde ALLE Termine die bereits beendet sind
    const { data: overdueAppointments, error: findError } = await supabase
      .from('appointments')
      .select('id, title, start_time, end_time, staff_id, status')
      .in('status', ['confirmed', 'scheduled', 'booked']) // 🆕 Alle relevanten Status
      .lt('end_time', now) // Termine die bereits vorbei sind
    
    if (findError) {
      throw new Error(`Error finding overdue appointments: ${findError.message}`)
    }
    
    if (!overdueAppointments || overdueAppointments.length === 0) {
      console.log('✅ No overdue appointments found')
      return { updated: 0, appointments: [] }
    }
    
    console.log(`📅 Found ${overdueAppointments.length} overdue appointments:`, overdueAppointments)
    
    // Update alle überfälligen Termine auf 'completed'
    const appointmentIds = overdueAppointments.map(apt => apt.id)
    
    const { data: updatedAppointments, error: updateError } = await supabase
      .from('appointments')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .in('id', appointmentIds)
      .select('id, title, status')
    
    if (updateError) {
      throw new Error(`Error updating appointments: ${updateError.message}`)
    }
    
    console.log(`✅ Successfully updated ${updatedAppointments?.length || 0} appointments to 'completed'`)
    
    return {
      updated: updatedAppointments?.length || 0,
      appointments: updatedAppointments || []
    }
  } catch (err: any) {
    console.error('❌ Error updating overdue appointments:', err)
    updateError.value = err.message
    throw err
  } finally {
    isUpdating.value = false
  }
}

  /**
   * Update specific appointment to 'completed' status
   * Für manuelles Update einzelner Termine
   */
  const markAppointmentCompleted = async (appointmentId: string) => {
    isUpdating.value = true
    updateError.value = null

    try {
      console.log(`🔄 Marking appointment ${appointmentId} as completed...`)

      const { data, error } = await supabase
        .from('appointments')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
        .select('id, title, status')
        .single()

      if (error) {
        throw new Error(`Error updating appointment: ${error.message}`)
      }

      console.log('✅ Appointment marked as completed:', data)
      return data

    } catch (err: any) {
      console.error('❌ Error marking appointment completed:', err)
      updateError.value = err.message
      throw err
    } finally {
      isUpdating.value = false
    }
  }

  /**
   * Update appointment to 'evaluated' status after rating
   * Nach dem Speichern einer Bewertung
   */
  const markAppointmentEvaluated = async (appointmentId: string) => {
    isUpdating.value = true
    updateError.value = null

    try {
      console.log(`🔄 Marking appointment ${appointmentId} as evaluated...`)

      const { data, error } = await supabase
        .from('appointments')
        .update({ 
          status: 'evaluated',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
        .select('id, title, status')
        .single()

      if (error) {
        throw new Error(`Error updating appointment: ${error.message}`)
      }

      console.log('✅ Appointment marked as evaluated:', data)
      return data

    } catch (err: any) {
      console.error('❌ Error marking appointment evaluated:', err)
      updateError.value = err.message
      throw err
    } finally {
      isUpdating.value = false
    }
  }

  /**
   * Get appointment status statistics
   * Für Dashboard/Debugging
   */
  const getStatusStatistics = async (staffId?: string) => {
    try {
      let query = supabase
        .from('appointments')
        .select('status')

      if (staffId) {
        query = query.eq('staff_id', staffId)
      }

      const { data, error } = await query

      if (error) throw error

      const stats = data?.reduce((acc: Record<string, number>, appointment) => {
        const status = appointment.status || 'unknown'
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {}) || {}

      console.log('📊 Appointment status statistics:', stats)
      return stats

    } catch (err: any) {
      console.error('❌ Error getting status statistics:', err)
      return {}
    }
  }

  /**
   * Batch status update with filters
   * Erweiterte Update-Funktionen
   */
  const batchUpdateStatus = async (filters: {
    fromStatus: string
    toStatus: string
    staffId?: string
    beforeDate?: string
    afterDate?: string
  }) => {
    isUpdating.value = true
    updateError.value = null

    try {
      console.log('🔄 Batch updating appointment status...', filters)

      let query = supabase
        .from('appointments')
        .update({ 
          status: filters.toStatus,
          updated_at: new Date().toISOString()
        })
        .eq('status', filters.fromStatus)

      if (filters.staffId) {
        query = query.eq('staff_id', filters.staffId)
      }

      if (filters.beforeDate) {
        query = query.lt('end_time', filters.beforeDate)
      }

      if (filters.afterDate) {
        query = query.gt('start_time', filters.afterDate)
      }

      const { data, error } = await query.select('id, title, status')

      if (error) {
        throw new Error(`Batch update error: ${error.message}`)
      }

      console.log(`✅ Batch updated ${data?.length || 0} appointments from '${filters.fromStatus}' to '${filters.toStatus}'`)
      
      return {
        updated: data?.length || 0,
        appointments: data || []
      }

    } catch (err: any) {
      console.error('❌ Error in batch status update:', err)
      updateError.value = err.message
      throw err
    } finally {
      isUpdating.value = false
    }
  }

  return {
    // State
    isUpdating,
    updateError,
    
    // Core Functions
    updateOverdueAppointments,
    markAppointmentCompleted,
    markAppointmentEvaluated,
    
    // Utility Functions
    getStatusStatistics,
    batchUpdateStatus
  }
}```

### ./composables/useCategoryData.ts
```typescript
// composables/useCategoryData.ts - Mit Supabase Database

import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

interface Category {
  id: number
  created_at: string
  name: string
  description?: string
  code: string
  price_per_lesson: number
  price_unit: string
  lesson_duration: number
  color?: string
  is_active: boolean
  display_order: number
}

// Global shared state
const allCategories = ref<Category[]>([])
const isLoading = ref(false)
const isLoaded = ref(false)

export const useCategoryData = () => {
  const supabase = getSupabase()

  // Fallback data wenn DB nicht verfügbar
  const fallbackCategories: Record<string, Partial<Category>> = {
    'B': { name: 'Autoprüfung Kategorie B', price_per_lesson: 95, color: 'hellgrün' },
    'A1': { name: 'Motorrad A1/A35kW/A', price_per_lesson: 95, color: 'hellgrün' },
    'BE': { name: 'Anhänger BE', price_per_lesson: 120, color: 'orange' },
    'C1': { name: 'LKW C1/D1', price_per_lesson: 150, color: 'gelb' },
    'C': { name: 'LKW C', price_per_lesson: 170, color: 'rot' },
    'CE': { name: 'LKW CE', price_per_lesson: 200, color: 'violett' },
    'D': { name: 'Bus D', price_per_lesson: 200, color: 'türkis' },
    'Motorboot': { name: 'Motorboot', price_per_lesson: 95, color: 'hellblau' },
    'BPT': { name: 'Berufsprüfung Transport', price_per_lesson: 100, color: 'dunkelblau' }
  }

  // Admin Fees aus den Projektunterlagen
  const adminFees: Record<string, number> = {
    'B': 120, 'A1': 0, 'A35kW': 0, 'A': 0, 'BE': 120,
    'C1': 200, 'D1': 200, 'C': 200, 'CE': 250, 'D': 300,
    'Motorboot': 120, 'BPT': 120
  }

  // Kategorien aus Datenbank laden
  const loadCategories = async () => {
    if (isLoaded.value || isLoading.value) return
    
    isLoading.value = true
    
    try {
      console.log('🔄 Loading categories from database...')
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error

      allCategories.value = data || []
      isLoaded.value = true
      
      console.log('✅ Categories loaded:', data?.length)
      
    } catch (err: any) {
      console.error('❌ Error loading categories:', err)
      // Bei Fehler: Fallback verwenden
      allCategories.value = []
    } finally {
      isLoading.value = false
    }
  }

  // Category by code finden
  const getCategoryByCode = (code: string): Category | null => {
    if (!code) return null
    
    // Aus geladenen Kategorien suchen
    const dbCategory = allCategories.value.find(cat => cat.code === code)
    if (dbCategory) return dbCategory
    
    // Fallback auf statische Daten
    const fallback = fallbackCategories[code]
    if (fallback) {
      return {
        id: 0,
        code,
        name: fallback.name || code,
        price_per_lesson: fallback.price_per_lesson || 95,
        lesson_duration: 45,
        color: fallback.color || 'grau',
        is_active: true,
        display_order: 0,
        price_unit: 'per_lesson',
        created_at: new Date().toISOString()
      } as Category
    }
    
    return null
  }

  // Helper Funktionen
  const getCategoryName = (code: string): string => {
    const category = getCategoryByCode(code)
    return category?.name || code || 'Unbekannte Kategorie'
  }

  const getCategoryPrice = (code: string): number => {
    const category = getCategoryByCode(code)
    return category?.price_per_lesson || 95
  }

  const getCategoryColor = (code: string): string => {
    const category = getCategoryByCode(code)
    return category?.color || 'grau'
  }

  const getAdminFee = (code: string): number => {
    return adminFees[code] || 120
  }

  const getCategoryIcon = (code: string): string => {
    const icons: Record<string, string> = {
      'B': '🚗', 'A1': '🏍️', 'A35kW': '🏍️', 'A': '🏍️',
      'BE': '🚛', 'C1': '🚚', 'D1': '🚌', 'C': '🚚',
      'CE': '🚛', 'D': '🚌', 'Motorboot': '🛥️', 'BPT': '📋'
    }
    return icons[code] || '🚗'
  }

  // Computed properties
  const categoriesLoaded = computed(() => isLoaded.value)
  const categoriesLoading = computed(() => isLoading.value)

  return {
    // State
    allCategories: computed(() => allCategories.value),
    categoriesLoaded,
    categoriesLoading,

    // Methods
    loadCategories,
    getCategoryByCode,
    getCategoryName,
    getCategoryPrice,
    getCategoryColor,
    getCategoryIcon,
    getAdminFee
  }
}```

### ./composables/useCompanyBilling.ts
```typescript
// composables/useCompanyBilling.ts

import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'
import type { 
  CompanyBillingAddress, 
  CompanyBillingAddressInsert,
  CompanyBillingFormData,
  CompanyBillingValidation,
  CreateCompanyBillingResponse,
  CompanyBillingListResponse
} from '~/types/companyBilling'

export const useCompanyBilling = () => {
  const supabase = getSupabase()
  
  // State
  const isLoading = ref(false)
  const error = ref<string>('')
  const savedAddresses = ref<CompanyBillingAddress[]>([])
  const currentAddress = ref<CompanyBillingAddress | null>(null)
  
  // Form Data
  const formData = ref<CompanyBillingFormData>({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    street: '',
    streetNumber: '',
    zip: '',
    city: '',
    country: 'Schweiz',
    vatNumber: '',
    notes: ''
  })

  // Validation
  const validation = computed((): CompanyBillingValidation => {
    const errors: Record<string, string> = {}
    
    if (!formData.value.companyName.trim()) {
      errors.companyName = 'Firmenname ist erforderlich'
    }
    
    if (!formData.value.contactPerson.trim()) {
      errors.contactPerson = 'Ansprechperson ist erforderlich'
    }
    
    if (!formData.value.email.trim()) {
      errors.email = 'E-Mail ist erforderlich'
    } else if (!isValidEmail(formData.value.email)) {
      errors.email = 'Gültige E-Mail-Adresse erforderlich'
    }
    
    if (!formData.value.street.trim()) {
      errors.street = 'Strasse ist erforderlich'
    }
    
    if (!formData.value.zip.trim()) {
      errors.zip = 'PLZ ist erforderlich'
    } else if (!/^\d{4}$/.test(formData.value.zip)) {
      errors.zip = 'PLZ muss 4 Ziffern haben'
    }
    
    if (!formData.value.city.trim()) {
      errors.city = 'Ort ist erforderlich'
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  })

  // Methods
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const resetForm = () => {
    formData.value = {
      companyName: '',
      contactPerson: '',
      email: '',
      phone: '',
      street: '',
      streetNumber: '',
      zip: '',
      city: '',
      country: 'Schweiz',
      vatNumber: '',
      notes: ''
    }
    error.value = ''
  }

  const loadFormFromAddress = (address: CompanyBillingAddress) => {
    formData.value = {
      companyName: address.company_name,
      contactPerson: address.contact_person,
      email: address.email,
      phone: address.phone || '',
      street: address.street,
      streetNumber: address.street_number || '',
      zip: address.zip,
      city: address.city,
      country: address.country,
      vatNumber: address.vat_number || '',
      notes: address.notes || ''
    }
    currentAddress.value = address
  }

  const convertFormToInsert = (userId: string): CompanyBillingAddressInsert => {
    return {
      company_name: formData.value.companyName.trim(),
      contact_person: formData.value.contactPerson.trim(),
      email: formData.value.email.trim(),
      phone: formData.value.phone.trim() || undefined,
      street: formData.value.street.trim(),
      street_number: formData.value.streetNumber.trim() || undefined,
      zip: formData.value.zip.trim(),
      city: formData.value.city.trim(),
      country: formData.value.country.trim(),
      vat_number: formData.value.vatNumber.trim() || undefined,
      notes: formData.value.notes.trim() || undefined,
      created_by: userId
    }
  }

  // CRUD Operations
  const createCompanyBillingAddress = async (userId: string): Promise<CreateCompanyBillingResponse> => {
    if (!validation.value.isValid) {
      return {
        success: false,
        error: 'Bitte füllen Sie alle Pflichtfelder korrekt aus'
      }
    }

    isLoading.value = true
    error.value = ''

    try {
      const insertData = convertFormToInsert(userId)
      
      console.log('💾 Creating company billing address:', insertData)

      const { data, error: supabaseError } = await supabase
        .from('company_billing_addresses')
        .insert(insertData)
        .select()
        .single()

      if (supabaseError) {
        console.error('❌ Supabase error:', supabaseError)
        throw new Error(supabaseError.message)
      }

      if (!data) {
        throw new Error('Keine Daten von der Datenbank erhalten')
      }

      currentAddress.value = data
      console.log('✅ Company billing address created:', data)

      return {
        success: true,
        data: data
      }

    } catch (err: any) {
      const errorMessage = err.message || 'Fehler beim Speichern der Firmenadresse'
      error.value = errorMessage
      console.error('❌ Error creating company billing address:', err)
      
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      isLoading.value = false
    }
  }

  const loadUserCompanyAddresses = async (userId: string): Promise<CompanyBillingListResponse> => {
    isLoading.value = true
    error.value = ''

    try {
      console.log('🔄 Loading company addresses for user:', userId)

      const { data, error: supabaseError } = await supabase
        .from('company_billing_addresses')
        .select('*')
        .eq('created_by', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (supabaseError) {
        console.error('❌ Supabase error:', supabaseError)
        throw new Error(supabaseError.message)
      }

      savedAddresses.value = data || []
      console.log('✅ Company addresses loaded:', savedAddresses.value.length)

      return {
        success: true,
        data: data || []
      }

    } catch (err: any) {
      const errorMessage = err.message || 'Fehler beim Laden der Firmenadresse'
      error.value = errorMessage
      console.error('❌ Error loading company addresses:', err)
      
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      isLoading.value = false
    }
  }

  const updateCompanyBillingAddress = async (addressId: string): Promise<CreateCompanyBillingResponse> => {
    if (!validation.value.isValid) {
      return {
        success: false,
        error: 'Bitte füllen Sie alle Pflichtfelder korrekt aus'
      }
    }

    isLoading.value = true
    error.value = ''

    try {
      const updateData = {
        company_name: formData.value.companyName.trim(),
        contact_person: formData.value.contactPerson.trim(),
        email: formData.value.email.trim(),
        phone: formData.value.phone.trim() || null,
        street: formData.value.street.trim(),
        street_number: formData.value.streetNumber.trim() || null,
        zip: formData.value.zip.trim(),
        city: formData.value.city.trim(),
        country: formData.value.country.trim(),
        vat_number: formData.value.vatNumber.trim() || null,
        notes: formData.value.notes.trim() || null,
        updated_at: new Date().toISOString()
      }

      console.log('💾 Updating company billing address:', addressId, updateData)

      const { data, error: supabaseError } = await supabase
        .from('company_billing_addresses')
        .update(updateData)
        .eq('id', addressId)
        .select()
        .single()

      if (supabaseError) {
        console.error('❌ Supabase error:', supabaseError)
        throw new Error(supabaseError.message)
      }

      currentAddress.value = data
      console.log('✅ Company billing address updated:', data)

      return {
        success: true,
        data: data
      }

    } catch (err: any) {
      const errorMessage = err.message || 'Fehler beim Aktualisieren der Firmenadresse'
      error.value = errorMessage
      console.error('❌ Error updating company billing address:', err)
      
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      isLoading.value = false
    }
  }

  const deleteCompanyBillingAddress = async (addressId: string): Promise<{ success: boolean; error?: string }> => {
    isLoading.value = true
    error.value = ''

    try {
      console.log('🗑️ Deleting company billing address:', addressId)

      const { error: supabaseError } = await supabase
        .from('company_billing_addresses')
        .update({ is_active: false })
        .eq('id', addressId)

      if (supabaseError) {
        console.error('❌ Supabase error:', supabaseError)
        throw new Error(supabaseError.message)
      }

      // Remove from local state
      savedAddresses.value = savedAddresses.value.filter(addr => addr.id !== addressId)
      
      if (currentAddress.value?.id === addressId) {
        currentAddress.value = null
        resetForm()
      }

      console.log('✅ Company billing address deleted')

      return { success: true }

    } catch (err: any) {
      const errorMessage = err.message || 'Fehler beim Löschen der Firmenadresse'
      error.value = errorMessage
      console.error('❌ Error deleting company billing address:', err)
      
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      isLoading.value = false
    }
  }

  // Utility Methods
  const formatAddress = (address: CompanyBillingAddress): string => {
    const parts = [
      address.company_name,
      address.contact_person,
      `${address.street}${address.street_number ? ' ' + address.street_number : ''}`,
      `${address.zip} ${address.city}`,
      address.country
    ]
    return parts.join('\n')
  }

  const getAddressPreview = (address: CompanyBillingAddress): string => {
    return `${address.company_name} - ${address.contact_person}`
  }

  return {
    // State
    formData,
    currentAddress,
    savedAddresses,
    isLoading,
    error,
    validation,
    
    // Methods
    createCompanyBillingAddress,
    loadUserCompanyAddresses,
    updateCompanyBillingAddress,
    deleteCompanyBillingAddress,
    loadFormFromAddress,
    resetForm,
    formatAddress,
    getAddressPreview
  }
}```

### ./composables/useCurrentUser.ts
```typescript
// composables/useCurrentUser.ts
import { ref } from 'vue'
import { getSupabase } from '~/utils/supabase'

export const useCurrentUser = () => {
  const currentUser = ref<any>(null)
  const isLoading = ref(false)
  const userError = ref<string | null>(null)
  const profileExists = ref(false) // 🆕 NEU: Profil-Status

  const fetchCurrentUser = async () => {
    // Skip auf Login-Seite
    if (process.client && window.location.pathname === '/') {
      return
    }

    isLoading.value = true
    userError.value = null
    currentUser.value = null
    profileExists.value = false // 🆕 Reset

    try {
      const supabase = getSupabase()
      
      // 1. Auth-User holen
      const { data: authData, error: authError } = await supabase.auth.getUser()
      const user = authData?.user

      if (authError || !user?.email) {
        userError.value = 'Nicht eingeloggt'
        return
      }

      console.log('Auth-User gefunden:', user.email)

      // 2. Database-User per E-Mail suchen
      const { data: usersData, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email)
        .eq('is_active', true)

      if (dbError) {
        console.error('Database Error:', dbError)
        userError.value = `Database-Fehler: ${dbError.message}`
        return
      }

      if (!usersData || usersData.length === 0) {
        console.log('Business-User nicht gefunden für:', user.email)
        // 🆕 WICHTIGE ÄNDERUNG: Setze profileExists auf false, aber keinen userError
        profileExists.value = false
        currentUser.value = {
          email: user.email,
          auth_user_id: user.id
        }
        // 🚫 ENTFERNT: userError.value = `Kein Benutzerprofil für ${user.email} gefunden.`
        return
      }

      // ✅ User gefunden
      const userData = usersData[0]
      console.log('✅ Business-User geladen:', userData)
      
      currentUser.value = {
        ...userData,
        auth_user_id: user.id
      }
      profileExists.value = true // 🆕 Profil existiert

    } catch (err: any) {
      console.error('Unerwarteter Fehler:', err)
      userError.value = err?.message || 'Unbekannter Fehler'
    } finally {
      isLoading.value = false
    }
  }

  // 🆕 NEU: Funktion zum Erstellen des User-Profils
  const createUserProfile = async (profileData: { company_name: string, role: string }) => {
    isLoading.value = true
    userError.value = null

    try {
      const supabase = getSupabase()
      const { data: authData } = await supabase.auth.getUser()
      const user = authData?.user

      if (!user?.email) {
        throw new Error('Kein authentifizierter Benutzer')
      }

      // Erstelle neuen User in der Datenbank
      const { data, error } = await supabase
        .from('users')
        .insert({
          email: user.email,
          auth_user_id: user.id,
          company_name: profileData.company_name,
          role: profileData.role,
          is_active: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      console.log('✅ Profil erstellt:', data)
      
      // Update lokaler State
      currentUser.value = {
        ...data,
        auth_user_id: user.id
      }
      profileExists.value = true

      return data

    } catch (err: any) {
      console.error('Fehler beim Erstellen des Profils:', err)
      userError.value = err?.message || 'Fehler beim Erstellen des Profils'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  return {
    currentUser,
    isLoading,
    userError,
    profileExists, // 🆕 NEU exportiert
    fetchCurrentUser,
    createUserProfile // 🆕 NEU exportiert
  }
}```

### ./composables/useDurationManager.ts
```typescript
// composables/useDurationManager.ts - Komplett neue Datei ohne Cache-Probleme
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

export const useDurationManager = () => {
  // State
  const availableDurations = ref<number[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed - formatierte Dauern für UI
  const formattedDurations = computed(() => {
    return availableDurations.value.map(duration => ({
      value: duration,
      label: duration >= 120 
        ? `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? duration % 60 + 'min' : ''}`.trim() 
        : `${duration}min`
    }))
  })

  // Staff-Dauern direkt laden - KEINE Kategorie-Abfrage!
  const loadStaffDurations = async (staffId: string) => {
    console.log('🚀 useDurationManager - Loading staff durations for:', staffId)
    isLoading.value = true
    error.value = null

    try {
      const supabase = getSupabase()

      // NUR Staff Settings laden - KEINE Categories!
      console.log('📋 Querying ONLY staff_settings...')
      const { data: staffSettings, error: staffError } = await supabase
        .from('staff_settings')
        .select('preferred_durations')
        .eq('staff_id', staffId)
        .maybeSingle()

      console.log('📋 Staff settings result:', { data: staffSettings, error: staffError })

      let finalDurations: number[] = []
      
      if (staffSettings?.preferred_durations) {
        console.log('👤 Raw staff durations:', staffSettings.preferred_durations)
        
        try {
          // Parse different formats
          if (staffSettings.preferred_durations.startsWith('[') && staffSettings.preferred_durations.endsWith(']')) {
            const jsonArray = JSON.parse(staffSettings.preferred_durations)
            
            finalDurations = jsonArray.map((item: any) => {
              const num = typeof item === 'string' ? parseInt(item) : item
              return isNaN(num) ? 0 : num
            }).filter((d: number) => d > 0).sort((a: number, b: number) => a - b)
            
            console.log('✅ Parsed durations:', finalDurations)
          } else if (staffSettings.preferred_durations.includes(',')) {
            // CSV format: "45,60,75,90"
            finalDurations = staffSettings.preferred_durations
              .split(',')
              .map((d: string) => parseInt(d.trim()))
              .filter((d: number) => !isNaN(d) && d > 0)
              .sort((a: number, b: number) => a - b)
            
            console.log('✅ Parsed CSV durations:', finalDurations)
          } else {
            // Single number
            const singleDuration = parseInt(staffSettings.preferred_durations)
            if (!isNaN(singleDuration) && singleDuration > 0) {
              finalDurations = [singleDuration]
              console.log('✅ Parsed single duration:', finalDurations)
            } else {
              console.log('⚠️ Invalid format, using fallback')
              finalDurations = [45]
            }
          }
        } catch (parseError) {
          console.error('❌ Parse error:', parseError)
          finalDurations = [45]
        }
      } else {
        console.log('⚠️ No staff settings found, using default [45]')
        finalDurations = [45]
      }

      availableDurations.value = finalDurations
      console.log('🎯 Final available durations:', finalDurations)
      return finalDurations

    } catch (err: any) {
      console.error('❌ Error loading staff durations:', err)
      error.value = err.message
      availableDurations.value = [45]
      return [45]
    } finally {
      isLoading.value = false
    }
  }

  // Staff preferred durations in DB updaten
  const updateStaffDurations = async (staffId: string, newDurations: number[]) => {
    console.log('🔄 Updating staff durations in DB:', newDurations)
    
    try {
      const supabase = getSupabase()
      // Als JSON Array speichern um konsistent mit bestehenden Daten zu sein
      const durationsString = JSON.stringify(newDurations.sort((a: number, b: number) => a - b))
      
      const { error: upsertError } = await supabase
        .from('staff_settings')
        .upsert({
          staff_id: staffId,
          preferred_durations: durationsString,
          updated_at: new Date().toISOString()
        })

      if (upsertError) throw upsertError

      console.log('✅ Staff durations updated in DB as JSON:', durationsString)
      
      // State aktualisieren
      availableDurations.value = newDurations.sort((a: number, b: number) => a - b)
      
    } catch (err: any) {
      console.error('❌ Error updating staff durations:', err)
      error.value = err.message
      throw err
    }
  }

  // Standard-Dauern für alle Kategorien aus DB laden (für Settings UI)
  const loadAllPossibleDurations = async () => {
    console.log('🔥 Loading all possible durations')
    
    try {
      // Alle möglichen Dauern sammeln (15min steps von 45-240)
      const allDurations = [45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240]
      
      return allDurations.map(duration => ({
        value: duration,
        label: duration >= 120 
          ? `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? duration % 60 + 'min' : ''}`.trim() 
          : `${duration}min`,
        // Info für Settings UI
        category: 'all'
      }))

    } catch (err: any) {
      console.error('❌ Error loading possible durations:', err)
      return []
    }
  }

  // Staff-Settings für User laden
  const loadStaffSettings = async (staffId: string) => {
    console.log('🔥 Loading complete staff settings')
    
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('staff_settings')
        .select('*')
        .eq('staff_id', staffId)
        .maybeSingle()

      if (error) throw error
      
      return data
    } catch (err: any) {
      console.error('❌ Error loading staff settings:', err)
      return null
    }
  }

  // Erstes verfügbares Dauer zurückgeben
  const getDefaultDuration = () => {
    return availableDurations.value.length > 0 ? availableDurations.value[0] : 45
  }

  // Check ob Dauer verfügbar ist
  const isDurationAvailable = (duration: number) => {
    return availableDurations.value.includes(duration)
  }

  // Reset state
  const reset = () => {
    availableDurations.value = []
    isLoading.value = false
    error.value = null
  }

  return {
    // State
    availableDurations: computed(() => availableDurations.value),
    formattedDurations,
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),

    // Actions
    loadStaffDurations,
    updateStaffDurations,
    loadAllPossibleDurations,
    loadStaffSettings,
    
    // Utils
    getDefaultDuration,
    isDurationAvailable,
    reset
  }
}```

### ./composables/useEventModalForm.ts
```typescript
// composables/useEventModalForm.ts
import { ref, computed, reactive } from 'vue'
import { getSupabase } from '~/utils/supabase'

// Types (können später in separates types file)
interface AppointmentData {
  id?: string
  title: string
  description: string
  type: string
  startDate: string
  startTime: string
  endTime: string 
  duration_minutes: number
  user_id: string
  staff_id: string
  location_id: string
  price_per_minute: number
  status: string
  eventType: string 
  selectedSpecialType: string 
  is_paid: boolean 
  discount?: number
  discount_type?: string
  discount_reason?: string
}

interface Student {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  category: string
  assigned_staff_id: string
  preferred_location_id?: string
  preferred_duration?: number 
}

export const useEventModalForm = (currentUser?: any) => {
  
  // ============ STATE ============
  const formData = ref<AppointmentData>({
    title: '',
    description: '',
    type: '',
    startDate: '',
    startTime: '',
    endTime: '',
    duration_minutes: 45,
    user_id: '',
    staff_id: '',
    location_id: '',
    price_per_minute: 0,
    status: 'booked',
    eventType: 'lesson',
    selectedSpecialType: '',
    is_paid: false,
    discount: 0,
    discount_type: 'fixed',
    discount_reason: ''
  })

  const selectedStudent = ref<Student | null>(null)
  const selectedCategory = ref<any>(null)
  const selectedLocation = ref<any>(null)
  const availableDurations = ref<number[]>([45])
  const appointmentNumber = ref<number>(1)
  
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // ============ COMPUTED ============
  const isFormValid = computed(() => {
    const baseValid = formData.value.title && 
                     formData.value.startDate && 
                     formData.value.startTime &&
                     formData.value.endTime

    if (formData.value.eventType === 'lesson') {
      return baseValid && 
             selectedStudent.value && 
             formData.value.type && 
             formData.value.location_id &&
             formData.value.duration_minutes > 0
    } else {
      return baseValid && formData.value.selectedSpecialType
    }
  })

  const computedEndTime = computed(() => {
    if (!formData.value.startTime || !formData.value.duration_minutes) return ''
    
    const [hours, minutes] = formData.value.startTime.split(':').map(Number)
    const startDate = new Date()
    startDate.setHours(hours, minutes, 0, 0)
    
    const endDate = new Date(startDate.getTime() + formData.value.duration_minutes * 60000)
    
    const endHours = String(endDate.getHours()).padStart(2, '0')
    const endMinutes = String(endDate.getMinutes()).padStart(2, '0')
    
    return `${endHours}:${endMinutes}`
  })

  const totalPrice = computed(() => {
    const pricePerMinute = formData.value.price_per_minute || (95/45)
    const total = pricePerMinute * (formData.value.duration_minutes || 45)
    return total.toFixed(2)
  })

  // ============ FORM ACTIONS ============
  const resetForm = () => {
    console.log('🔄 Resetting form data')
    
    formData.value = {
      title: '',
      description: '',
      type: '',
      startDate: '',
      startTime: '',
      endTime: '',
      duration_minutes: 45,
      user_id: '',
      staff_id: currentUser?.id || '',
      location_id: '',
      price_per_minute: 0,
      status: 'booked',
      eventType: 'lesson',
      selectedSpecialType: '',
      is_paid: false,
      discount: 0,
      discount_type: 'fixed',
      discount_reason: ''
    }
    
    selectedStudent.value = null
    selectedCategory.value = null
    selectedLocation.value = null
    availableDurations.value = [45]
    appointmentNumber.value = 1
    error.value = null
  }

  const populateFormFromAppointment = (appointment: any) => {
    console.log('📝 Populating form from appointment:', appointment?.id)
    
    // Event-Type Detection
    const appointmentType = appointment.extendedProps?.type ||
                           appointment.type ||
                           appointment.extendedProps?.appointment_type ||
                           'lesson'
    
    const otherEventTypes = ['meeting', 'break', 'training', 'maintenance', 'admin', 'team_invite', 'other']
    const isOtherEvent = appointmentType && otherEventTypes.includes(appointmentType.toLowerCase())
    
    // Zeit-Verarbeitung
    const startDateTime = new Date(appointment.start_time || appointment.start)
    const endDateTime = appointment.end_time || appointment.end ? new Date(appointment.end_time || appointment.end) : null
    const startDate = startDateTime.toISOString().split('T')[0]
    const startTime = startDateTime.toTimeString().slice(0, 5)
    const endTime = endDateTime ? endDateTime.toTimeString().slice(0, 5) : ''
    
    let duration = appointment.duration_minutes || appointment.extendedProps?.duration_minutes
    if (!duration && endDateTime) {
      duration = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60))
    }
    duration = duration || 45
    
    // Form Data setzen
    formData.value = {
      title: appointment.title || '',
      description: appointment.description || appointment.extendedProps?.description || '',
      type: appointmentType,
      startDate: startDate,
      startTime: startTime,
      endTime: endTime,
      duration_minutes: duration,
      user_id: appointment.user_id || appointment.extendedProps?.user_id || '',
      staff_id: appointment.staff_id || appointment.extendedProps?.staff_id || currentUser?.id || '',
      location_id: appointment.location_id || appointment.extendedProps?.location_id || '',
      price_per_minute: appointment.price_per_minute || appointment.extendedProps?.price_per_minute || 0,
      status: appointment.status || appointment.extendedProps?.status || 'confirmed',
      eventType: isOtherEvent ? 'other' : 'lesson',
      selectedSpecialType: isOtherEvent ? appointmentType : '',
      is_paid: appointment.is_paid || appointment.extendedProps?.is_paid || false
    }
    
    console.log('✅ Form populated with type:', formData.value.type)
  }

  const calculateEndTime = () => {
    if (formData.value.startTime && formData.value.duration_minutes) {
      formData.value.endTime = computedEndTime.value
      console.log('⏰ End time calculated:', formData.value.endTime)
    }
  }

  // ============ SAVE/DELETE LOGIC ============ 
  const saveAppointment = async (mode: 'create' | 'edit', eventId?: string) => {
    isLoading.value = true
    error.value = null
    
    try {
      if (!isFormValid.value) {
        throw new Error('Bitte füllen Sie alle Pflichtfelder aus')
      }
      
      const supabase = getSupabase()
      
      // Auth Check
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (!authData?.user) {
        throw new Error('Nicht authentifiziert')
      }
      
      // User Check
      const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .single()
      
      if (!dbUser) {
        throw new Error('User-Profil nicht gefunden')
      }
      
      // Appointment Data
      const appointmentData = {
        title: formData.value.title,
        description: formData.value.description,
        user_id: formData.value.user_id,
        staff_id: formData.value.staff_id || dbUser.id,
        location_id: formData.value.location_id,
        start_time: `${formData.value.startDate}T${formData.value.startTime}:00`,
        end_time: `${formData.value.startDate}T${formData.value.endTime}:00`,
        duration_minutes: formData.value.duration_minutes,
        type: formData.value.type,
        status: formData.value.status,
        price_per_minute: formData.value.price_per_minute,
        is_paid: formData.value.is_paid
      }
      
      console.log('💾 Saving appointment data:', appointmentData)
      
      let result
      if (mode === 'edit' && eventId) {
        // Update
        const { data, error: updateError } = await supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', eventId)
          .select()
          .single()
        
        if (updateError) throw updateError
        result = data
      } else {
        // Create
        const { data, error: insertError } = await supabase
          .from('appointments')
          .insert(appointmentData)
          .select()
          .single()
        
        if (insertError) throw insertError
        result = data
      }
      
      console.log('✅ Appointment saved:', result.id)
      return result
      
    } catch (err: any) {
      console.error('❌ Save error:', err)
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const deleteAppointment = async (eventId: string) => {
    isLoading.value = true
    
    try {
      const supabase = getSupabase()
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', eventId)
      
      if (error) throw error
      
      console.log('✅ Appointment deleted:', eventId)
      
    } catch (err: any) {
      console.error('❌ Delete error:', err)
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // ============ UTILS ============
  const getAppointmentNumber = async (userId?: string) => {
    const studentId = userId || formData.value.user_id
    if (!studentId) return 1
    
    try {
      const supabase = getSupabase()
      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', studentId)
        .in('status', ['completed', 'confirmed'])
      
      if (error) throw error
      return (count || 0) + 1
      
    } catch (err) {
      console.error('❌ Error counting appointments:', err)
      return 1
    }
  }

  return {
    // State
    formData,
    selectedStudent,
    selectedCategory,
    selectedLocation,
    availableDurations,
    appointmentNumber,
    isLoading,
    error,
    
    // Computed
    isFormValid,
    computedEndTime,
    totalPrice,
    
    // Actions
    resetForm,
    populateFormFromAppointment,
    calculateEndTime,
    saveAppointment,
    deleteAppointment,
    getAppointmentNumber
  }
}```

### ./composables/useEventModalHandlers.ts
```typescript
import { ref, nextTick } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { usePaymentMethods } from '~/composables/usePaymentMethods'

// Define constants for better readability and maintainability
const DEFAULT_DURATION_MINUTES = 45
const FALLBACK_PRICE_PER_MINUTE = 95 / DEFAULT_DURATION_MINUTES

export const useEventModalHandlers = (
  formData: any,
  selectedStudent: any,
  selectedCategory: any,
  availableDurations: any,
  appointmentNumber: any,
  selectedLocation: any 
) => {

  const supabase = getSupabase()
  const paymentMethods = usePaymentMethods()

  // ============ UTILITY FUNCTIONS (Defined first for better accessibility) ============

  /**
   * Calculates the end time of the appointment based on start time and duration.
   */
  const calculateEndTime = () => {
    if (formData.value.startTime && formData.value.duration_minutes) {
      const [hours, minutes] = formData.value.startTime.split(':').map(Number)
      const startDate = new Date()
      startDate.setHours(hours, minutes, 0, 0)

      const endDate = new Date(startDate.getTime() + formData.value.duration_minutes * 60000) // Convert minutes to milliseconds

      const endHours = String(endDate.getHours()).padStart(2, '0')
      const endMinutes = String(endDate.getMinutes()).padStart(2, '0')

      formData.value.endTime = `${endHours}:${endMinutes}`
      console.log('⏰ End time calculated:', formData.value.endTime)
    } else {
      formData.value.endTime = '' // Clear end time if start time or duration is missing
      console.log('⚠️ Cannot calculate end time: Missing start time or duration.')
    }
  }

  /**
   * Loads the duration of the last completed appointment for a given student.
   * @param studentId The ID of the student.
   * @returns The duration in minutes or null if no completed appointment is found.
   */
  const getLastAppointmentDuration = async (studentId: string): Promise<number | null> => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('duration_minutes')
        .eq('user_id', studentId)
        .eq('status', 'completed') // Only consider completed appointments
        .order('end_time', { ascending: false }) // Get the most recent one
        .limit(1)
        .maybeSingle() // Expects zero or one record

      if (error) {
        console.error('❌ Error fetching last appointment duration:', error.message)
        return null
      }

      if (!data) {
        console.log('⚠️ No completed appointments found for student:', studentId)
        return null
      }

      return data.duration_minutes || null
    } catch (err) {
      console.error('❌ Unexpected error loading last appointment duration:', err)
      return null
    }
  }

  /**
   * Counts the number of completed or confirmed appointments for a student.
   * Used to determine the appointment number for insurance fees.
   * @param studentId The ID of the student.
   * @returns The total count of relevant appointments + 1 (for the current appointment).
   */
  const getAppointmentNumber = async (studentId: string): Promise<number> => {
    try {
      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true }) // 'head: true' fetches no data, just the count
        .eq('user_id', studentId)
        .in('status', ['completed', 'confirmed']) // Count completed and confirmed appointments

      if (error) throw error
      return (count || 0) + 1 // +1 because the current appointment is the next one
    } catch (err) {
      console.error('❌ Error counting appointments from DB:', err)
      return 1 // Default to 1 if counting fails
    }
  }

  /**
   * Loads preferred durations for a staff member from the 'staff_settings' table.
   * @param staffId The ID of the staff member.
   */
  const loadStaffDurations = async (staffId: string) => {
    try {
      const { data, error } = await supabase
        .from('staff_settings')
        .select('preferred_durations')
        .eq('staff_id', staffId)
        .maybeSingle()

      if (error || !data?.preferred_durations) {
        console.log('⚠️ No staff durations found in DB or error, using defaults.')
        availableDurations.value = [DEFAULT_DURATION_MINUTES, 90, 135]
        return
      }

      // Parse preferred_durations (can be JSON string or comma-separated string)
      let durations: number[] = []
      try {
        if (typeof data.preferred_durations === 'string' && data.preferred_durations.startsWith('[')) {
          durations = JSON.parse(data.preferred_durations)
        } else if (typeof data.preferred_durations === 'string') {
          durations = data.preferred_durations.split(',').map((d: string) => parseInt(d.trim()))
        } else if (Array.isArray(data.preferred_durations)) {
          durations = data.preferred_durations
        }
        durations = durations.filter(d => !isNaN(d) && d > 0).sort((a, b) => a - b)
      } catch (parseErr) {
        console.error('❌ Error parsing staff durations:', parseErr)
        durations = [DEFAULT_DURATION_MINUTES, 90, 135] // Fallback on parsing error
      }

      availableDurations.value = durations
      console.log('✅ Staff durations loaded from DB:', durations)

    } catch (err) {
      console.error('❌ Error loading staff durations from DB:', err)
      availableDurations.value = [DEFAULT_DURATION_MINUTES, 90, 135] // Fallback on fetch error
    }
  }

  /**
   * Generates a default title for the event based on event type and selected student.
   * @returns The generated default title.
   */
  const getDefaultTitle = () => {
    if (formData.value.eventType === 'lesson' && selectedStudent.value) {
      return selectedStudent.value.first_name || 'Schüler'
    }
    if (formData.value.selectedSpecialType) {
      return getEventTypeName(formData.value.selectedSpecialType)
    }
    return 'Neuer Termin'
  }

  /**
   * Returns a human-readable name for an event type code.
   * @param code The event type code.
   * @returns The human-readable name.
   */
  const getEventTypeName = (code: string): string => {
    const eventTypes: Record<string, string> = {
      'meeting': 'Team-Meeting',
      'course': 'Verkehrskunde',
      'break': 'Pause',
      'training': 'Weiterbildung',
      'maintenance': 'Wartung',
      'admin': 'Administration',
      'other': 'Sonstiges'
    }
    return eventTypes[code] || code || 'Neuer Termin'
  }

  /**
   * Retrieves the administrative fee for a given category.
   * This is typically an insurance fee applied from the 2nd appointment onwards.
   * @param categoryCode The code of the category.
   * @returns The administrative fee amount.
   */
  const getAdminFeeForCategory = (categoryCode: string): number => {
    // Insurance fee from project data - only from 2nd appointment
    const adminFees: Record<string, number> = {
      'B': 120, 'A1': 0, 'A35kW': 0, 'A': 0, 'BE': 120,
      'C1': 200, 'D1': 200, 'C': 200, 'CE': 250, 'D': 300,
      'Motorboot': 120, 'BPT': 120
    }
    return adminFees[categoryCode] || 0
  }

  // ============ STUDENT HANDLERS ============

  /**
   * Auto-fills form data based on the selected student's profile from Supabase.
   * @param student The student object to auto-fill from.
   */
  const autoFillFromStudent = async (student: any) => {
    console.log('🤖 Auto-filling form from student:', student.first_name)

    // Set basic data from users table
    formData.value.user_id = student.id
    formData.value.staff_id = student.assigned_staff_id || formData.value.staff_id

    // Set category from users.category (taking the primary category if multiple exist)
    if (student.category) {
      const primaryCategory = student.category.split(',')[0].trim()
      formData.value.type = primaryCategory
      console.log('📚 Category from users table:', formData.value.type)
    }

    // Load preferred payment method from student profile using the paymentMethods composable
    const preferredPaymentMethod = await paymentMethods.loadStudentPaymentPreference(student.id)
    formData.value.payment_method = preferredPaymentMethod
    console.log('💳 Loaded payment preference:', preferredPaymentMethod)

    // Load last appointment duration from appointments table
    try {
      const lastDuration = await getLastAppointmentDuration(student.id)
      if (lastDuration) {
        formData.value.duration_minutes = lastDuration
        console.log('⏱️ Duration from last appointment:', lastDuration)
      } else {
        formData.value.duration_minutes = DEFAULT_DURATION_MINUTES // Default
      }
    } catch (err) {
      console.log('⚠️ Could not load last duration, using default', DEFAULT_DURATION_MINUTES, 'min:', err)
      formData.value.duration_minutes = DEFAULT_DURATION_MINUTES
    }

    // Update price based on category - from project data (static fallback)
    const categoryPricing: Record<string, number> = {
      'A': 95 / 45, 'A1': 95 / 45, 'A35kW': 95 / 45, 'B': 95 / 45,
      'BE': 120 / 45, 'C1': 150 / 45, 'D1': 150 / 45, 'C': 170 / 45,
      'CE': 200 / 45, 'D': 200 / 45, 'BPT': 100 / 45, 'Motorboot': 95 / 45
    }
    formData.value.price_per_minute = categoryPricing[formData.value.type] || FALLBACK_PRICE_PER_MINUTE

    // Count appointments for this user (important for insurance fee from 2nd appointment)
    try {
      appointmentNumber.value = await getAppointmentNumber(student.id)
      console.log('📈 Appointment number from DB:', appointmentNumber.value)
    } catch (err) {
      console.error('❌ Error counting appointments:', err)
      appointmentNumber.value = 1 // Default to 1 if counting fails
    }

    console.log('✅ Auto-fill from Supabase completed')
  }

  /**
   * Handles the selection of a student.
   * Auto-fills form data based on the selected student's profile.
   * @param student The selected student object.
   */
  const handleStudentSelected = async (student: any) => {
    console.log('🎯 Student selected:', student.first_name, student.id)

    selectedStudent.value = student

    // Auto-fill form data from student (only in CREATE mode, implicitly handled by initial state)
    if (student) {
      await autoFillFromStudent(student)
    }
  }

  /**
   * Handles clearing the selected student and resetting related form fields.
   */
  const handleStudentCleared = () => {
    console.log('🗑️ Student cleared')

    selectedStudent.value = null
    formData.value.title = ''
    formData.value.type = ''
    formData.value.user_id = ''
    formData.value.location_id = ''
    formData.value.price_per_minute = 0
    formData.value.payment_method = 'cash' // Default payment method
  }

  // ============ CATEGORY HANDLERS ============

  /**
   * Handles the selection of a category.
   * Updates price and loads staff durations based on the selected category.
   * @param category The selected category object.
   */
  const handleCategorySelected = async (category: any) => {
    console.log('🎯 Category selected:', category?.code)

    selectedCategory.value = category

    if (category) {
      // Load category data from categories table
      try {
        const { data: categoryData, error } = await supabase
          .from('categories')
          .select('*')
          .eq('code', category.code)
          .eq('is_active', true)
          .maybeSingle()

        if (categoryData) {
          formData.value.price_per_minute = categoryData.price_per_lesson / DEFAULT_DURATION_MINUTES
          console.log('💰 Price from categories table:', categoryData.price_per_lesson)
        } else {
          // Fallback to static prices if not found in DB
          const fallbackPrices: Record<string, number> = {
            'B': 95, 'A1': 95, 'BE': 120, 'C1': 150, 'D1': 150, 'C': 170,
            'CE': 200, 'D': 200, 'BPT': 100, 'Motorboot': 95
          }
          formData.value.price_per_minute = (fallbackPrices[category.code] || 95) / DEFAULT_DURATION_MINUTES
          console.log('⚠️ Category not found in DB, using fallback price:', formData.value.price_per_minute * DEFAULT_DURATION_MINUTES)
        }
      } catch (err) {
        console.error('❌ Error loading category from DB:', err)
        formData.value.price_per_minute = FALLBACK_PRICE_PER_MINUTE // Fallback
      }

      // Load staff durations from staff_settings table if staff_id is present
      if (formData.value.staff_id) {
        try {
          await loadStaffDurations(formData.value.staff_id)
        } catch (err) {
          console.log('⚠️ Could not load staff durations from DB, using defaults:', err)
          availableDurations.value = [DEFAULT_DURATION_MINUTES, 90, 135] // Fallback
        }
      }

      calculateEndTime()
    }
  }

  /**
   * Handles changes to the price per minute.
   * @param pricePerMinute The new price per minute.
   */
  const handlePriceChanged = (pricePerMinute: number) => {
    console.log('💰 Price changed:', pricePerMinute)
    formData.value.price_per_minute = pricePerMinute
  }

  /**
   * Handles changes to the available durations.
   * Adjusts the current duration if it's no longer available.
   * @param durations An array of available durations in minutes.
   */
  const handleDurationsChanged = (durations: number[]) => {
    console.log('📥 Durations changed to:', durations)

    availableDurations.value = [...durations]

    // If current duration not available, select first available
    if (durations.length > 0 && !durations.includes(formData.value.duration_minutes)) {
      formData.value.duration_minutes = durations[0]
      calculateEndTime()
      console.log('✅ Updated duration to:', durations[0])
    }
  }

  // ============ DURATION HANDLERS ============

  /**
   * Handles changes to the selected duration.
   * Recalculates the end time.
   * @param duration The new duration in minutes.
   */
  const handleDurationChanged = (duration: number) => {
    console.log('⏱️ Duration changed to:', duration)
    formData.value.duration_minutes = duration
    calculateEndTime()
  }

  // ============ LOCATION HANDLERS ============

  /**
   * Handles the selection of a location.
   * Saves new Google Places locations to the 'locations' table.
   * @param location The selected location object.
   */
  const handleLocationSelected = async (location: any) => {
    console.log('📍 Location selected:', location?.name)

    selectedLocation.value = location; // WICHTIG: selectedLocation Ref aktualisieren

    if (!location) {
      formData.value.location_id = ''
      return
    }

    // Existing location from 'locations' table
    if (location.id && !String(location.id).startsWith('temp_')) {
      formData.value.location_id = location.id
      console.log('✅ Location ID from locations table:', location.id)
    }
    // New location from Google Places - save to 'locations' table
    else if (location.id && String(location.id).startsWith('temp_') && formData.value.staff_id) {
      try {
        const { data: newLocation, error } = await supabase
          .from('locations')
          .insert({
            staff_id: formData.value.staff_id,
            name: location.name,
            adress: location.address || location.formatted_address || '' // Use 'address' or 'formatted_address'
          })
          .select()
          .single()

        if (error) throw error

        formData.value.location_id = newLocation.id
        console.log('✅ New location saved to DB:', newLocation.id)
      } catch (err) {
        console.error('❌ Could not save location to DB:', err)
        formData.value.location_id = ''
      }
    }
    // Temporary location (will be handled when the appointment is saved)
    else {
      formData.value.location_id = ''
      console.log('⚠️ Temporary location, will handle on save or if staff_id is missing.')
    }
  }

  // ============ EVENT TYPE HANDLERS ============

  /**
   * Handles the selection of a special event type (e.g., meeting, break).
   * @param eventType The selected event type object.
   */
  const handleEventTypeSelected = (eventType: any) => {
    console.log('📋 Event type selected:', eventType?.code)

    formData.value.selectedSpecialType = eventType.code
    formData.value.duration_minutes = eventType.default_duration_minutes || DEFAULT_DURATION_MINUTES

    if (eventType.auto_generate_title) {
      formData.value.title = eventType.name || 'Neuer Termin'
    }

    calculateEndTime()
  }

  /**
   * Switches the event type to 'other' and resets related fields.
   */
  const switchToOtherEventType = () => {
    formData.value.eventType = 'other'
    formData.value.selectedSpecialType = ''
    formData.value.title = ''
  }

  /**
   * Switches the event type back to 'lesson' and resets related fields.
   */
  const backToStudentSelection = () => {
    formData.value.eventType = 'lesson'
    formData.value.selectedSpecialType = ''
    formData.value.title = ''
  }

  // ============ PAYMENT HANDLERS ============

  /**
   * Handles a successful payment.
   * Optionally saves a payment record to the 'payments' table.
   * @param paymentData Data related to the successful payment.
   */
  const handlePaymentSuccess = async (paymentData: any) => {
    console.log('✅ Payment successful:', paymentData)
    formData.value.is_paid = true

    // Optional: Save payment record to payments table
    if (paymentData.transactionId && formData.value.id) {
      try {
        await supabase
          .from('payments')
          .insert({
            appointment_id: formData.value.id,
            user_id: formData.value.user_id,
            staff_id: formData.value.staff_id,
            amount_rappen: Math.round(formData.value.price_per_minute * formData.value.duration_minutes * 100),
            payment_method: paymentData.method || 'wallee',
            payment_status: 'completed',
            wallee_transaction_id: paymentData.transactionId
          })

        console.log('💾 Payment record saved to DB')
      } catch (err) {
        console.error('❌ Could not save payment record:', err)
      }
    }
  }

  /**
   * Handles a payment error.
   * @param error The error message.
   */
  const handlePaymentError = (error: string) => {
    console.error('❌ Payment error:', error)
    formData.value.is_paid = false
  }

  /**
   * Handles the start of a payment process.
   * @param method The payment method used.
   */
  const handlePaymentStarted = (method: string) => {
    console.log('🔄 Payment started with method:', method)
  }

  /**
   * Signals that the appointment needs to be saved before payment processing can occur.
   * This is crucial for obtaining a real UUID for the appointment.
   * @param appointmentData The current appointment data.
   * @returns A Promise resolving with a flag indicating save is required.
   */
  const handleSaveRequired = async (appointmentData: any) => {
    console.log('💾 Save required for payment processing')

    // IMPORTANT: Appointment must be saved FIRST to get a real UUID
    return new Promise((resolve) => {
      // Signal parent that appointment needs to be saved first
      resolve({
        ...appointmentData,
        requiresSave: true,
        message: 'Appointment must be saved before payment'
      })
    })
  }

  // ============ PAYMENT METHOD HANDLERS ============

  /**
   * Handles the selection of a payment method.
   * Updates the form data and optionally saves the preference for the student.
   * @param paymentMethod The selected payment method string.
   */
  const handlePaymentMethodSelected = async (paymentMethod: string) => {
    console.log('💳 Payment method selected:', paymentMethod)

    // Use payment composable to handle selection (e.g., saving preference)
    if (selectedStudent.value?.id) {
      await paymentMethods.selectPaymentMethod(paymentMethod, selectedStudent.value.id)
    }

    // Update form data
    formData.value.payment_method = paymentMethod
    formData.value.payment_status = 'pending'
    formData.value.is_paid = false // Reset paid status

    console.log('💳 Payment method configured:', {
      method: paymentMethod,
      status: formData.value.payment_status,
      paid: formData.value.is_paid
    })
  }

  /**
   * Retrieves the available payment method options from the paymentMethods composable.
   * @returns An array of payment method options.
   */
  const getPaymentMethodOptions = () => {
    return paymentMethods.paymentMethodOptions.value
  }

  /**
   * Calculates the payment breakdown (total, discounts, fees) for the current appointment.
   * @returns The payment breakdown object or null if data is insufficient.
   */
  const calculatePaymentBreakdown = () => {
    if (!formData.value.type || !formData.value.duration_minutes) {
      console.warn('⚠️ Cannot calculate payment breakdown: Missing type or duration.')
      return null
    }

    const discount = formData.value.discount ? {
      amount: formData.value.discount,
      type: formData.value.discount_type || 'fixed',
      reason: formData.value.discount_reason
    } : undefined

    return paymentMethods.calculatePaymentBreakdown(
      formData.value.type,
      formData.value.duration_minutes,
      appointmentNumber.value,
      discount
    )
  }

  /**
   * Processes the payment after the appointment has been successfully saved.
   * Delegates to specific payment processing functions based on the selected method.
   * @param savedAppointment The appointment object returned after being saved to the DB.
   * @returns The result of the payment processing, potentially including a redirect flag for online payments.
   * @throws Error if payment calculation fails or processing encounters an issue.
   */
  const processPaymentAfterSave = async (savedAppointment: any) => {
    const paymentMethod = formData.value.payment_method

    if (!paymentMethod || paymentMethod === 'none') {
      console.log('ℹ️ No payment processing needed (method is none or not set).')
      return null // No payment processing needed
    }

    const calculation = calculatePaymentBreakdown()
    if (!calculation) {
      throw new Error('Could not calculate payment breakdown before processing.')
    }

    const appointmentData = {
      appointmentId: savedAppointment.id,
      userId: formData.value.user_id,
      staffId: formData.value.staff_id,
      category: formData.value.type,
      duration: formData.value.duration_minutes,
      appointmentNumber: appointmentNumber.value,
      calculation // Pass the calculated breakdown
    }

    try {
      switch (paymentMethod) {
        case 'cash':
          return await paymentMethods.processCashPayment(appointmentData)

        case 'invoice':
          return await paymentMethods.processInvoicePayment(appointmentData)

        case 'online':
          const result = await paymentMethods.processOnlinePayment(appointmentData)

          if (result.needsWalleeRedirect) {
            // Return data for Wallee integration in parent component
            return {
              ...result,
              redirectToWallee: true,
              amount: calculation.totalAmount,
              currency: 'CHF' // Assuming CHF as currency
            }
          }

          return result

        default:
          console.log('⚠️ Unknown payment method:', paymentMethod)
          return null
      }
    } catch (err) {
      console.error('❌ Payment processing error:', err)
      throw err // Re-throw to be handled by the calling component
    }
  }

  /**
   * Handles changes to discount values.
   * @param discount The discount amount.
   * @param discountType The type of discount ('fixed' or 'percentage').
   * @param reason The reason for the discount.
   */
  const handleDiscountChanged = (discount: number, discountType: string, reason: string) => {
    console.log('🏷️ Discount changed:', { discount, discountType, reason })

    formData.value.discount = discount
    formData.value.discount_type = discountType
    formData.value.discount_reason = reason
  }

  // ============ TEAM HANDLERS (TAGS/EINLADUNGEN) ============

  /**
   * Toggles the invitation status for a staff member.
   * @param staffId The ID of the staff member to toggle.
   * @param invitedStaff A ref containing an array of invited staff IDs.
   */
  const handleTeamInviteToggle = (staffId: string, invitedStaff: any) => {
    console.log('👥 Team invite toggled for staff ID:', staffId)

    const index = invitedStaff.value.indexOf(staffId)
    if (index > -1) {
      invitedStaff.value.splice(index, 1)
      console.log('➖ Staff removed from invite list.')
    } else {
      invitedStaff.value.push(staffId)
      console.log('➕ Staff added to invite list.')
    }
  }

  /**
   * Clears all staff invites.
   * @param invitedStaff A ref containing an array of invited staff IDs.
   */
  const clearAllInvites = (invitedStaff: any) => {
    invitedStaff.value = []
    console.log('🗑️ All team invites cleared.')
  }

  /**
   * Invites all available staff members.
   * @param availableStaff A ref containing an array of all available staff members.
   * @param invitedStaff A ref containing an array of invited staff IDs.
   */
  const inviteAllStaff = (availableStaff: any, invitedStaff: any) => {
    invitedStaff.value = availableStaff.value.map((s: any) => s.id)
    console.log('👥 All staff invited:', invitedStaff.value.length, 'staff members.')
  }

  return {
    // Student Handlers
    handleStudentSelected,
    handleStudentCleared,
    autoFillFromStudent,

    // Category Handlers
    handleCategorySelected,
    handlePriceChanged,
    handleDurationsChanged,
    
    // Duration Handlers
    handleDurationChanged,

    // Location Handlers
    handleLocationSelected,

    // Event Type Handlers
    handleEventTypeSelected,
    switchToOtherEventType,
    backToStudentSelection,

    // Payment Handlers
    handlePaymentSuccess,
    handlePaymentError,
    handlePaymentStarted, // <-- NEU: Jetzt exportiert
    handleSaveRequired,

    // Payment Method Handlers
    handlePaymentMethodSelected,
    getPaymentMethodOptions,
    calculatePaymentBreakdown, // Expose for external use
    processPaymentAfterSave,   // Expose for external use

    // Discount Handlers
    handleDiscountChanged,

    // Team Handlers (Tags/Einladungen)
    handleTeamInviteToggle,
    clearAllInvites,
    inviteAllStaff,

    // Utilities
    calculateEndTime,
    getLastAppointmentDuration,
    getAppointmentNumber,
    loadStaffDurations,
    getDefaultTitle,
    getEventTypeName,
    getAdminFeeForCategory
  }
}
```

### ./composables/useEventModalState.ts
```typescript
// composables/useEventModalState.ts
import { ref, reactive, computed, nextTick } from 'vue'

// Centralized State mit Race Condition Prevention
export const useEventModalState = () => {
  
  // === LOADING STATES ===
  const isInitializing = ref(false)
  const isUserInteraction = ref(false)
  const updateQueue = ref<string[]>([])
  
  // === CORE DATA ===
  const formData = reactive({
    selectedStudent: null,
    selectedCategory: null,
    selectedDuration: 45,
    availableDurations: [45],
    isAutoSelecting: false
  })
  
  // === RACE CONDITION PREVENTION ===
  const preventRaceCondition = async (operation: string, callback: () => void) => {
    if (isInitializing.value) {
      console.log(`🚫 Race prevented: ${operation} during initialization`)
      return
    }
    
    if (updateQueue.value.includes(operation)) {
      console.log(`🚫 Race prevented: ${operation} already in queue`)
      return
    }
    
    updateQueue.value.push(operation)
    
    try {
      await nextTick()
      callback()
    } finally {
      updateQueue.value = updateQueue.value.filter(op => op !== operation)
    }
  }
  
  // === DEBOUNCED OPERATIONS ===
  let durationUpdateTimeout: any = null
  
  const setDurationsDebounced = (durations: number[], source: string) => {
    clearTimeout(durationUpdateTimeout)
    
    durationUpdateTimeout = setTimeout(() => {
      preventRaceCondition(`duration-update-${source}`, () => {
        console.log(`⏱️ Setting durations from ${source}:`, durations)
        formData.availableDurations = [...durations]
        
        // Auto-select first duration only if none selected
        if (!formData.selectedDuration || !durations.includes(formData.selectedDuration)) {
          formData.selectedDuration = durations[0] || 45
          console.log(`✅ Auto-selected duration: ${formData.selectedDuration}`)
        }
      })
    }, 100) // 100ms debounce
  }
  
  // === STUDENT SELECTION WITH LOCK ===
  const selectStudent = async (student: any) => {
    if (formData.isAutoSelecting) {
      console.log('🚫 Student selection blocked - auto-selection in progress')
      return
    }
    
    isUserInteraction.value = true
    formData.isAutoSelecting = true
    
    try {
      console.log('👤 Manual student selection:', student?.first_name)
      formData.selectedStudent = student
      
      // Clear dependent selections
      formData.selectedCategory = null
      formData.availableDurations = [45]
      formData.selectedDuration = 45
      
      await nextTick()
      
      // Auto-select category if student has one
      if (student?.category && !isInitializing.value) {
        setTimeout(() => {
          preventRaceCondition('auto-category-from-student', () => {
            console.log('🎯 Auto-selecting category from student:', student.category)
            // Emit to parent to trigger category selection
          })
        }, 150) // Delayed auto-selection
      }
      
    } finally {
      formData.isAutoSelecting = false
      isUserInteraction.value = false
    }
  }
  
  // === CATEGORY SELECTION WITH LOCK ===
  const selectCategory = async (category: any, isAutomatic = false) => {
    if (formData.isAutoSelecting && !isAutomatic) {
      console.log('🚫 Category selection blocked - auto-selection in progress')
      return
    }
    
    preventRaceCondition('category-selection', () => {
      console.log('🎯 Category selected:', category?.code)
      formData.selectedCategory = category
      
      if (category?.availableDurations) {
        setDurationsDebounced(category.availableDurations, 'category-selection')
      }
    })
  }
  
  // === INITIALIZATION MODE ===
  const startInitialization = () => {
    console.log('🔄 Starting initialization mode')
    isInitializing.value = true
    updateQueue.value = []
  }
  
  const finishInitialization = async () => {
    await nextTick()
    isInitializing.value = false
    console.log('✅ Initialization completed')
  }
  
  // === COMPUTED HELPERS ===
  const canAutoSelect = computed(() => {
    return !isInitializing.value && !formData.isAutoSelecting
  })
  
  const isInUserInteraction = computed(() => {
    return isUserInteraction.value
  })
  
  return {
    // State
    formData,
    isInitializing,
    canAutoSelect,
    isInUserInteraction,
    
    // Methods
    selectStudent,
    selectCategory,
    setDurationsDebounced,
    preventRaceCondition,
    startInitialization,
    finishInitialization
  }
}```

### ./composables/useEventModalWatchers.ts
```typescript
// composables/useEventModalWatchers.ts - SIMPLIFIED VERSION
import { watch, nextTick } from 'vue'
import { getSupabase } from '~/utils/supabase'

export const useEventModalWatchers = (
  props: any,
  formData: any,
  selectedStudent: any,
  selectedLocation: any,
  availableLocations: any,
  appointmentNumber: any,
  actions: any
) => {

  // ============ HELPER FUNCTIONS ============
  const calculateEndTime = () => {
    if (formData.value.startTime && formData.value.duration_minutes) {
      const [hours, minutes] = formData.value.startTime.split(':').map(Number)
      const startDate = new Date()
      startDate.setHours(hours, minutes, 0, 0)

      const endDate = new Date(startDate.getTime() + formData.value.duration_minutes * 60000)

      const endHours = String(endDate.getHours()).padStart(2, '0')
      const endMinutes = String(endDate.getMinutes()).padStart(2, '0')

      formData.value.endTime = `${endHours}:${endMinutes}`
      console.log('⏰ End time calculated:', formData.value.endTime)
    }
  }

  // 🔥 LOCAL appointment number function
  const getAppointmentNumber = async (studentId: string): Promise<number> => {
    try {
      const supabase = getSupabase()
      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', studentId)
        .in('status', ['completed', 'confirmed'])

      if (error) throw error
      return (count || 0) + 1

    } catch (err) {
      console.error('❌ Error counting appointments:', err)
      return 1
    }
  }

        // ============ MODAL LIFECYCLE WATCHER ============
          const setupModalWatcher = () => {
            watch(() => props.isVisible, async (isVisible) => {
              console.log('👀 Modal visibility changed to:', isVisible)
              
              if (isVisible) {
                console.log('🔄 Modal opening - starting initialization...')
                
                try {
                  // Mode-based initialization
                  if (props.eventData && (props.mode === 'edit' || props.mode === 'view')) {
                    console.log('📝 Processing EDIT/VIEW mode...')
                    actions.populateFormFromAppointment(props.eventData)
                    
                    // Handle student selection for edit mode
                    if (formData.value.user_id) {
                      await handleEditModeStudentSelection()
                    }
                  } else if (props.mode === 'create') {  // 🔥 WICHTIG: else if statt else!
                    console.log('📅 Processing CREATE mode...')
                    await handleCreateModeInitialization()
                  }
                  
                  console.log('✅ Modal initialization completed')
                  
                } catch (error: unknown) {
                  console.error('❌ Error during modal initialization:', error)
                }
              } else {
                // Modal closed - reset state
                console.log('❌ Modal closed - resetting state')
                actions.resetForm()
              }
            }, { immediate: true })
          }

  // ============ FORM DATA WATCHERS ============
  const setupFormWatchers = () => {

    // Title generation watcher
    watch([
      () => selectedStudent.value,
      () => formData.value.location_id,
      () => formData.value.type,
      () => formData.value.eventType,
    ], ([currentStudent, locationId, category, eventType]) => {

      // Skip title generation in edit/view mode
      if (props.mode === 'edit' || props.mode === 'view') {
        return
      }

      if (eventType === 'lesson' && currentStudent) {
        generateLessonTitle(currentStudent, locationId, category)
      }
    }, { immediate: true })

    // 🔥 NEW: Auto-load students when needed
    watch(() => props.mode, (newMode) => {
      if (newMode === 'create') {
        console.log('🔄 Create mode detected - triggering student load')
        // Trigger student loading for create mode
        if (actions.triggerStudentLoad) {
          actions.triggerStudentLoad()
        }
      }
    }, { immediate: true })

    // 🔥 NEW: Auto-reload students when student is cleared
    watch(selectedStudent, (newStudent, oldStudent) => {
      if (oldStudent && !newStudent) {
        console.log('🔄 Student cleared - triggering student reload')
        // Trigger student loading when student is cleared
        if (actions.triggerStudentLoad) {
          actions.triggerStudentLoad()
        }
      }
    })

    // Time calculation watcher
    watch([
      () => formData.value.startTime,
      () => formData.value.duration_minutes
    ], () => {
      if (formData.value.startTime && formData.value.duration_minutes) {
        calculateEndTime()
      }
    }, { immediate: true })

    // Event type change watcher
    watch(() => formData.value.eventType, (newType) => {
      console.log('👀 Event type changed to:', newType)

      // Reset form when switching types
      if (newType !== 'lesson') {
        formData.value.user_id = ''
        formData.value.type = ''
        selectedStudent.value = null
      }
    })

    // User ID change watcher (for appointment number)
    watch(() => formData.value.user_id, async (newUserId) => {
      // Skip in edit/view mode
      if (props.mode === 'edit' || props.mode === 'view') {
        console.log(`📝 ${props.mode} mode detected - skipping auto-operations`)
        return
      }

      if (newUserId && formData.value.eventType === 'lesson') {
        // Load appointment number for pricing
        try {
          console.log('🔢 Loading appointment number for pricing...')
          appointmentNumber.value = await getAppointmentNumber(newUserId)
          console.log('✅ Appointment number loaded:', appointmentNumber.value)
        } catch (err) {
          console.error('❌ Error loading appointment number:', err)
          appointmentNumber.value = 1
        }
      } else if (!newUserId) {
        appointmentNumber.value = 1
        console.log('🔄 Reset appointment number to 1')
      }
    })

    // Category type watcher
    watch(() => formData.value.type, async (newType) => {
      if (newType && props.mode === 'edit') {
        console.log('👀 Category type changed in edit mode:', newType)

        // Force category update in edit mode
        await nextTick()
      }
    }, { immediate: true })

    // Duration change watcher
    watch(() => formData.value.duration_minutes, () => {
      calculateEndTime()
    })
  }

  // ============ DEBUG WATCHERS ============
  const setupDebugWatchers = () => {
    // Location debugging
    watch(() => formData.value.location_id, (newVal, oldVal) => {
      console.log('🔄 location_id changed:', oldVal, '→', newVal)
    })

    // Selected student debugging
    watch(selectedStudent, (newStudent, oldStudent) => {
      console.log('🔄 selectedStudent changed:', 
        oldStudent?.first_name || 'none', 
        '→', 
        newStudent?.first_name || 'none'
      )
    })
  }

  // ============ HELPER FUNCTIONS ============
  const handleEditModeStudentSelection = async () => {
    console.log('📝 Setting up student for edit mode:', formData.value.user_id)
    
    // This would typically trigger the StudentSelector to select the correct student
    // The implementation depends on how your StudentSelector handles programmatic selection
    
    // Example: You might need to emit to parent or use a ref to StudentSelector
    // to call selectStudentById(formData.value.user_id)
  }

  const handleCreateModeInitialization = async () => {
    // Initialize create mode with default values
    let startDate, startTime

    if (props.eventData?.start) {
      const clickedDateTime = new Date(props.eventData.start)
      startDate = clickedDateTime.toISOString().split('T')[0]
      startTime = clickedDateTime.toTimeString().slice(0, 5)
    } else {
      const now = new Date()
      startDate = now.toISOString().split('T')[0]
      startTime = now.toTimeString().slice(0, 5)
    }

    formData.value.startDate = startDate
    formData.value.startTime = startTime

    console.log('📅 Create mode initialized with date/time:', startDate, startTime)
    
    // Calculate end time immediately
    if (formData.value.duration_minutes) {
      calculateEndTime()
    }
  }

  const generateLessonTitle = (currentStudent: any, locationId: string, category: string) => {
    // Safety check for availableLocations
    const selectedLocationObject = Array.isArray(availableLocations.value) && availableLocations.value.length > 0
      ? availableLocations.value.find((loc: any) => loc.id === locationId)
      : null

    const locationName = selectedLocationObject?.name || ''
    const currentCategory = category || ''

    let title = 'Fahrstunde' // Default title

    if (currentStudent?.first_name) {
      title = `${currentStudent.first_name}`
    }

    if (locationName) {
      title += ` • ${locationName}`
    }

    if (currentCategory) {
      title += ` (${currentCategory})`
    }

    console.log('✏️ Title generated:', title)
    formData.value.title = title
  }

  // ============ PUBLIC API ============
  const setupAllWatchers = () => {
    setupModalWatcher()
    setupFormWatchers()
    setupDebugWatchers()

    console.log('⚡ All watchers initialized (simplified version)')
  }

  return {
    setupAllWatchers,
    setupModalWatcher,
    setupFormWatchers,
    setupDebugWatchers,
    calculateEndTime,
    getAppointmentNumber,
    generateLessonTitle
  }
}```

### ./composables/usePaymentMethods.ts
```typescript
// composables/usePaymentMethods.ts
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

interface PaymentMethod {
  value: string
  label: string
  icon: string
  description: string
  color: string
}

interface PaymentCalculation {
  basePrice: number
  adminFee: number
  discountAmount: number
  totalAmount: number
  pricePerMinute: number
}

export const usePaymentMethods = () => {
  const supabase = getSupabase()
  
  // State
  const selectedPaymentMethod = ref<string>('cash')
  const isProcessingPayment = ref(false)
  const paymentError = ref<string>('')
  const paymentSuccess = ref<any>(null)

  // Available Payment Methods
  const paymentMethodOptions = computed((): PaymentMethod[] => [
    {
      value: 'cash',
      label: 'Bar beim Fahrlehrer',
      icon: 'i-heroicons-banknotes',
      description: 'Zahlung vor Ort beim Fahrlehrer',
      color: 'yellow'
    },
    {
      value: 'invoice',
      label: 'Rechnung',
      icon: 'i-heroicons-document-text',
      description: 'Rechnung wird erstellt und versendet',
      color: 'blue'
    },
    {
      value: 'online',
      label: 'Online bezahlen',
      icon: 'i-heroicons-credit-card',
      description: 'Sofortige Zahlung mit Kreditkarte/Twint',
      color: 'green'
    }
  ])

  // Get payment method by value
  const getPaymentMethod = (value: string): PaymentMethod | undefined => {
    return paymentMethodOptions.value.find(method => method.value === value)
  }

  // Load student's preferred payment method
  const loadStudentPaymentPreference = async (studentId: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('preferred_payment_method')
        .eq('id', studentId)
        .maybeSingle()

      if (error) throw error
      
      const preference = data?.preferred_payment_method || 'cash'
      selectedPaymentMethod.value = preference
      
      console.log('💳 Loaded payment preference:', preference)
      return preference

    } catch (err) {
      console.error('❌ Error loading payment preference:', err)
      selectedPaymentMethod.value = 'cash'
      return 'cash'
    }
  }

  // Save payment method preference to student profile
  const saveStudentPaymentPreference = async (studentId: string, paymentMethod: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ preferred_payment_method: paymentMethod })
        .eq('id', studentId)

      if (error) throw error
      
      console.log('✅ Payment preference saved:', paymentMethod)
      
    } catch (err) {
      console.error('❌ Error saving payment preference:', err)
      // Non-critical error - don't throw
    }
  }

  // Select payment method and save preference
  const selectPaymentMethod = async (method: string, studentId?: string) => {
    selectedPaymentMethod.value = method
    
    // Save to student profile if studentId provided
    if (studentId) {
      await saveStudentPaymentPreference(studentId, method)
    }
    
    console.log('💳 Payment method selected:', method)
  }

  // Calculate price breakdown
  const calculatePaymentBreakdown = (
    category: string,
    duration: number,
    appointmentNumber: number,
    discount?: { amount: number, type: 'fixed' | 'percentage', reason?: string }
  ): PaymentCalculation => {
    
    // Base prices from project data
    const categoryPricing: Record<string, number> = {
      'A': 95, 'A1': 95, 'A35kW': 95, 'B': 95,
      'BE': 120, 'C1': 150, 'D1': 150, 'C': 170,
      'CE': 200, 'D': 200, 'BPT': 100, 'Motorboot': 95
    }

    // Admin fees - only from 2nd appointment
    const adminFees: Record<string, number> = {
      'B': 120, 'A1': 0, 'A35kW': 0, 'A': 0, 'BE': 120,
      'C1': 200, 'D1': 200, 'C': 200, 'CE': 250, 'D': 300,
      'Motorboot': 120, 'BPT': 120
    }

    const basePriceFor45Min = categoryPricing[category] || 95
    const basePrice = (basePriceFor45Min / 45) * duration
    const pricePerMinute = basePriceFor45Min / 45
    
    const adminFee = appointmentNumber > 1 ? (adminFees[category] || 0) : 0
    
    let discountAmount = 0
    if (discount && discount.amount > 0) {
      if (discount.type === 'percentage') {
        discountAmount = basePrice * (discount.amount / 100)
      } else {
        discountAmount = discount.amount
      }
    }
    
    const totalAmount = Math.max(0, basePrice + adminFee - discountAmount)
    
    return {
      basePrice,
      adminFee,
      discountAmount,
      totalAmount,
      pricePerMinute
    }
  }

  // Create pending payment record for admin dashboard
  const createPendingPaymentRecord = async (appointmentData: {
    appointmentId: string
    userId: string
    staffId: string
    category: string
    duration: number
    appointmentNumber: number
    paymentMethod: string
    calculation: PaymentCalculation
  }) => {
    try {
      const paymentRecord = {
        appointment_id: appointmentData.appointmentId,
        user_id: appointmentData.userId,
        staff_id: appointmentData.staffId,
        amount_rappen: Math.round(appointmentData.calculation.basePrice * 100),
        admin_fee_rappen: Math.round(appointmentData.calculation.adminFee * 100),
        total_amount_rappen: Math.round(appointmentData.calculation.totalAmount * 100),
        payment_method: appointmentData.paymentMethod,
        payment_status: 'pending',
        description: `Fahrstunde ${appointmentData.category} - ${appointmentData.duration} Min`,
        metadata: {
          category: appointmentData.category,
          duration: appointmentData.duration,
          appointment_number: appointmentData.appointmentNumber,
          price_breakdown: appointmentData.calculation,
          created_at: new Date().toISOString()
        }
      }

      const { data, error } = await supabase
        .from('payments')
        .insert(paymentRecord)
        .select()
        .single()

      if (error) throw error

      console.log('✅ Pending payment record created:', data.id)
      return data

    } catch (err) {
      console.error('❌ Error creating pending payment record:', err)
      throw err
    }
  }

  // Process cash payment
  const processCashPayment = async (appointmentData: any) => {
    isProcessingPayment.value = true
    paymentError.value = ''
    
    try {
      // Create pending payment record
      const paymentRecord = await createPendingPaymentRecord({
        ...appointmentData,
        paymentMethod: 'cash'
      })

      // Update appointment
      const { error } = await supabase
        .from('appointments')
        .update({
          payment_method: 'cash',
          payment_status: 'pending',
          is_paid: false
        })
        .eq('id', appointmentData.appointmentId)

      if (error) throw error

      paymentSuccess.value = {
        type: 'cash',
        message: 'Barzahlung erfasst - Zahlung erfolgt beim Fahrlehrer',
        paymentId: paymentRecord.id
      }

      return paymentRecord

    } catch (err: any) {
      paymentError.value = err.message
      throw err
    } finally {
      isProcessingPayment.value = false
    }
  }

  // Process invoice payment
  const processInvoicePayment = async (appointmentData: any) => {
    isProcessingPayment.value = true
    paymentError.value = ''
    
    try {
      // Create pending payment record
      const paymentRecord = await createPendingPaymentRecord({
        ...appointmentData,
        paymentMethod: 'invoice'
      })

      // Update appointment
      const { error } = await supabase
        .from('appointments')
        .update({
          payment_method: 'invoice',
          payment_status: 'pending',
          is_paid: false
        })
        .eq('id', appointmentData.appointmentId)

      if (error) throw error

      paymentSuccess.value = {
        type: 'invoice',
        message: 'Rechnung wird erstellt und per E-Mail versendet',
        paymentId: paymentRecord.id
      }

      return paymentRecord

    } catch (err: any) {
      paymentError.value = err.message
      throw err
    } finally {
      isProcessingPayment.value = false
    }
  }

  // Process online payment (requires appointment to be saved first)
  const processOnlinePayment = async (appointmentData: any) => {
    isProcessingPayment.value = true
    paymentError.value = ''
    
    try {
      if (!appointmentData.appointmentId || appointmentData.appointmentId.startsWith('temp_')) {
        throw new Error('Termin muss zuerst gespeichert werden für Online-Zahlung')
      }

      // Create pending payment record
      const paymentRecord = await createPendingPaymentRecord({
        ...appointmentData,
        paymentMethod: 'online'
      })

      // Update appointment
      const { error } = await supabase
        .from('appointments')
        .update({
          payment_method: 'online',
          payment_status: 'pending',
          is_paid: false
        })
        .eq('id', appointmentData.appointmentId)

      if (error) throw error

      // Return data for Wallee integration
      return {
        paymentRecord,
        appointmentId: appointmentData.appointmentId,
        amount: appointmentData.calculation.totalAmount,
        needsWalleeRedirect: true
      }

    } catch (err: any) {
      paymentError.value = err.message
      throw err
    } finally {
      isProcessingPayment.value = false
    }
  }

  // Mark payment as completed (called after successful online payment)
  const markPaymentCompleted = async (appointmentId: string, transactionData?: any) => {
    try {
      // Update appointment
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({
          payment_status: 'completed',
          is_paid: true
        })
        .eq('id', appointmentId)

      if (appointmentError) throw appointmentError

      // Update payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          payment_status: 'completed',
          paid_at: new Date().toISOString(),
          wallee_transaction_id: transactionData?.transactionId || null,
          metadata: {
            ...transactionData,
            completed_at: new Date().toISOString()
          }
        })
        .eq('appointment_id', appointmentId)

      if (paymentError) throw paymentError

      paymentSuccess.value = {
        type: 'online',
        message: 'Online-Zahlung erfolgreich abgeschlossen',
        transactionId: transactionData?.transactionId
      }

      console.log('✅ Payment marked as completed:', appointmentId)

    } catch (err) {
      console.error('❌ Error marking payment completed:', err)
      throw err
    }
  }

  // Get pending payments for admin dashboard
  const getPendingPayments = async (staffId?: string) => {
    try {
      let query = supabase
        .from('payments')
        .select(`
          *,
          appointments (
            title,
            start_time,
            end_time,
            type
          ),
          users!payments_user_id_fkey (
            first_name,
            last_name,
            email
          )
        `)
        .eq('payment_status', 'pending')
        .order('created_at', { ascending: false })

      if (staffId) {
        query = query.eq('staff_id', staffId)
      }

      const { data, error } = await query

      if (error) throw error

      return data || []

    } catch (err) {
      console.error('❌ Error loading pending payments:', err)
      return []
    }
  }

  // Clear state
  const clearPaymentState = () => {
    paymentError.value = ''
    paymentSuccess.value = null
    isProcessingPayment.value = false
  }

  return {
    // State
    selectedPaymentMethod,
    isProcessingPayment: computed(() => isProcessingPayment.value),
    paymentError: computed(() => paymentError.value),
    paymentSuccess: computed(() => paymentSuccess.value),
    
    // Options
    paymentMethodOptions,
    getPaymentMethod,
    
    // Student Preferences
    loadStudentPaymentPreference,
    saveStudentPaymentPreference,
    selectPaymentMethod,
    
    // Calculations
    calculatePaymentBreakdown,
    
    // Payment Processing
    processCashPayment,
    processInvoicePayment,
    processOnlinePayment,
    markPaymentCompleted,
    
    // Admin
    getPendingPayments,
    createPendingPaymentRecord,
    
    // Utils
    clearPaymentState
  }
}```

### ./composables/usePayments.ts
```typescript
// composables/usePayments.ts - Gemeinsame Payment Logic
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

interface CalculatedPrice {
  base_price_rappen: number
  admin_fee_rappen: number
  total_rappen: number
  base_price_chf: string
  admin_fee_chf: string
  total_chf: string
  category_code: string
  duration_minutes: number
}

interface PaymentMethod {
  method_code: string
  display_name: string
  description: string
  icon_name: string
  is_active: boolean
  is_online: boolean
  display_order: number
}

interface PaymentData {
  appointment_id: string
  user_id: string
  staff_id?: string
  amount_rappen: number
  admin_fee_rappen: number
  total_amount_rappen: number
  payment_method: string
  payment_status: string
  description: string
  metadata: Record<string, any>
}

export const usePayments = () => {
  const supabase = getSupabase()
  
  // State
  const isLoadingPrice = ref(false)
  const isProcessing = ref(false)
  const calculatedPrice = ref<CalculatedPrice | null>(null)
  const priceError = ref<string>('')

  // Payment Methods (could be loaded from database)
  const availablePaymentMethods = ref<PaymentMethod[]>([
    {
      method_code: 'wallee',
      display_name: 'Online Zahlung',
      description: 'Kreditkarte, Twint, etc.',
      icon_name: 'credit-card',
      is_active: true,
      is_online: true,
      display_order: 1
    },
    {
      method_code: 'cash',
      display_name: 'Bar',
      description: 'Zahlung beim Fahrlehrer',
      icon_name: 'cash',
      is_active: true,
      is_online: false,
      display_order: 2
    },
    {
      method_code: 'invoice',
      display_name: 'Rechnung',
      description: 'Firmenrechnung',
      icon_name: 'document',
      is_active: true,
      is_online: false,
      display_order: 3
    }
  ])

  // Category-specific pricing (from your project data)
  const categoryPricing: Record<string, { base: number, admin: number }> = {
    'B': { base: 95, admin: 120 },
    'A1': { base: 95, admin: 0 },
    'A35kW': { base: 95, admin: 0 },
    'A': { base: 95, admin: 0 },
    'BE': { base: 120, admin: 120 },
    'C1': { base: 150, admin: 200 },
    'D1': { base: 150, admin: 200 },
    'C': { base: 170, admin: 200 },
    'CE': { base: 200, admin: 250 },
    'D': { base: 200, admin: 300 },
    'Motorboot': { base: 95, admin: 120 },
    'BPT': { base: 100, admin: 120 }
  }

  // Get appointment count for a user
  const getAppointmentCount = async (userId: string): Promise<number> => {
    try {
      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['completed', 'confirmed'])

      if (error) throw error
      return (count || 0) + 1
    } catch (error) {
      console.error('Error getting appointment count:', error)
      return 1
    }
  }

  // Calculate price based on category, duration, and appointment count
  const calculatePrice = async (
    category: string, 
    duration: number, 
    userId?: string
  ): Promise<CalculatedPrice> => {
    isLoadingPrice.value = true
    priceError.value = ''

    try {
      // Get appointment count if userId provided
      const appointmentCount = userId ? await getAppointmentCount(userId) : 1
      
      // Get category pricing
      const pricing = categoryPricing[category] || categoryPricing['B']
      
      // Calculate base price (per 45min, scaled to duration)
      const basePriceChf = (pricing.base / 45) * duration
      const basePriceRappen = Math.round(basePriceChf * 100)
      
      // Admin fee only from 2nd appointment (except for A1/A35kW/A)
      const adminFeeChf = (appointmentCount > 1 && pricing.admin > 0) ? pricing.admin : 0
      const adminFeeRappen = adminFeeChf * 100
      
      // Total
      const totalRappen = basePriceRappen + adminFeeRappen
      const totalChf = totalRappen / 100

      const result: CalculatedPrice = {
        base_price_rappen: basePriceRappen,
        admin_fee_rappen: adminFeeRappen,
        total_rappen: totalRappen,
        base_price_chf: basePriceChf.toFixed(2),
        admin_fee_chf: adminFeeChf.toFixed(2),
        total_chf: totalChf.toFixed(2),
        category_code: category,
        duration_minutes: duration
      }

      calculatedPrice.value = result
      return result

    } catch (error: any) {
      priceError.value = error.message || 'Fehler bei der Preisberechnung'
      throw error
    } finally {
      isLoadingPrice.value = false
    }
  }

  // Create payment record in database
  const createPaymentRecord = async (data: Partial<PaymentData>): Promise<any> => {
    try {
      const { data: payment, error } = await supabase
        .from('payments')
        .insert(data)
        .select()
        .single()

      if (error) throw error
      return payment
    } catch (error) {
      console.error('Error creating payment record:', error)
      throw error
    }
  }

  // Handle cash payment
  const processCashPayment = async (
    appointmentId: string,
    userId: string,
    staffId: string,
    price: CalculatedPrice
  ) => {
    isProcessing.value = true

    try {
      const paymentData: Partial<PaymentData> = {
        appointment_id: appointmentId,
        user_id: userId,
        staff_id: staffId,
        amount_rappen: price.base_price_rappen,
        admin_fee_rappen: price.admin_fee_rappen,
        total_amount_rappen: price.total_rappen,
        payment_method: 'cash',
        payment_status: 'completed', // Cash is immediately completed
        description: `Fahrlektion ${price.category_code} - ${price.duration_minutes} Min`,
        metadata: {
          category: price.category_code,
          duration: price.duration_minutes,
          processed_at: new Date().toISOString()
        }
      }

      const payment = await createPaymentRecord(paymentData)

      // Update appointment as paid
      await updateAppointmentPaymentStatus(appointmentId, true, 'cash')

      return payment
    } finally {
      isProcessing.value = false
    }
  }

  // Handle invoice payment
  const processInvoicePayment = async (
    appointmentId: string,
    userId: string,
    staffId: string,
    price: CalculatedPrice,
    invoiceData: Record<string, any>
  ) => {
    isProcessing.value = true

    try {
      const paymentData: Partial<PaymentData> = {
        appointment_id: appointmentId,
        user_id: userId,
        staff_id: staffId,
        amount_rappen: price.base_price_rappen,
        admin_fee_rappen: price.admin_fee_rappen,
        total_amount_rappen: price.total_rappen,
        payment_method: 'invoice',
        payment_status: 'pending', // Invoice starts as pending
        description: `Fahrlektion ${price.category_code} - ${price.duration_minutes} Min`,
        metadata: {
          category: price.category_code,
          duration: price.duration_minutes,
          invoice_data: invoiceData,
          created_at: new Date().toISOString()
        }
      }

      const payment = await createPaymentRecord(paymentData)

      // Don't mark appointment as paid yet (wait for invoice payment)
      
      return payment
    } finally {
      isProcessing.value = false
    }
  }

  // Update appointment payment status
  const updateAppointmentPaymentStatus = async (
    appointmentId: string,
    isPaid: boolean,
    paymentMethod?: string
  ) => {
    try {
      const updateData: any = { is_paid: isPaid }
      
      if (paymentMethod) {
        updateData.payment_method = paymentMethod
      }

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating appointment payment status:', error)
      throw error
    }
  }

  // Get payment history for appointment
  const getPaymentHistory = async (appointmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting payment history:', error)
      return []
    }
  }

  // Get payment method icon class
  const getPaymentMethodIconClass = (methodCode: string): string => {
    const classes: Record<string, string> = {
      wallee: 'bg-blue-100 text-blue-600',
      cash: 'bg-yellow-100 text-yellow-600',
      invoice: 'bg-gray-100 text-gray-600',
      card: 'bg-purple-100 text-purple-600',
      twint: 'bg-blue-100 text-blue-600'
    }
    return classes[methodCode] || 'bg-gray-100 text-gray-600'
  }

  // Get payment button text
  const getPaymentButtonText = (methodCode: string): string => {
    const texts: Record<string, string> = {
      wallee: 'Online bezahlen',
      cash: 'Bar bezahlen',
      invoice: 'Rechnung erstellen',
      card: 'Mit Karte bezahlen',
      twint: 'Mit Twint bezahlen'
    }
    return texts[methodCode] || 'Bezahlen'
  }

  return {
    // State
    isLoadingPrice: computed(() => isLoadingPrice.value),
    isProcessing: computed(() => isProcessing.value),
    calculatedPrice: computed(() => calculatedPrice.value),
    priceError: computed(() => priceError.value),
    availablePaymentMethods: computed(() => availablePaymentMethods.value),

    // Methods
    calculatePrice,
    getAppointmentCount,
    createPaymentRecord,
    processCashPayment,
    processInvoicePayment,
    updateAppointmentPaymentStatus,
    getPaymentHistory,

    // Utilities
    getPaymentMethodIconClass,
    getPaymentButtonText,

    // Reset
    clearErrors: () => {
      priceError.value = ''
    }
  }
}```

### ./composables/usePendingTasks.ts
```typescript
// composables/usePendingTasks.ts
import { ref, computed, reactive } from 'vue'
import { getSupabase } from '~/utils/supabase'

// Typen für bessere Typsicherheit
interface PendingAppointment {
  id: string
  title: string
  start_time: string
  end_time: string
  user_id: string
  status: string
  users: {
    first_name: string
    last_name: string
  }
  // Da wir nur Kriterien-Bewertungen wollen, passen wir den Typ an
  // Die notes Property sollte hier nur die Kriterien-spezifischen Notizen halten
  notes: Array<{
    id: string
    criteria_rating?: number
    criteria_note?: string
    evaluation_criteria_id?: string
  }>
}

// Typ für die Daten, die von saveCriteriaEvaluations erwartet werden
export interface CriteriaEvaluationData {
  criteria_id: string; // evaluation_criteria_id
  rating: number;     // criteria_rating
  note: string;       // criteria_note
}

// SINGLETON PATTERN - Globaler reaktiver State
const globalState = reactive({
  pendingAppointments: [] as PendingAppointment[],
  isLoading: false,
  error: null as string | null
})

// Computed values basierend auf globalem State
const pendingCount = computed(() => globalState.pendingAppointments.length)

const buttonClasses = computed(() =>
  `text-white font-bold px-4 py-2 rounded-xl shadow-lg transform active:scale-95 transition-all duration-200
  ${pendingCount.value > 0 ? 'bg-red-600 hover:bg-red-700' : 'bg-green-500 hover:bg-green-600'}`
)

const buttonText = computed(() => 
  `Pendenzen${pendingCount.value > 0 ? `(${pendingCount.value})` : '(0)'}`
)

// Hilfsfunktion für formatierte Anzeige
const getFormattedAppointment = (appointment: PendingAppointment) => {
  const startDate = new Date(appointment.start_time)
  const endDate = new Date(appointment.end_time)
  
  return {
    ...appointment,
    formattedDate: startDate.toLocaleDateString('de-CH'),
    formattedStartTime: startDate.toLocaleTimeString('de-CH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    formattedEndTime: endDate.toLocaleTimeString('de-CH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    studentName: `${appointment.users.first_name} ${appointment.users.last_name}`,
    duration: Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60)) // Minuten
  }
}

// Computed für direkt formatierte Appointments
const formattedAppointments = computed(() => {
  return globalState.pendingAppointments.map(appointment => getFormattedAppointment(appointment))
})

// SINGLETON FUNCTIONS - Funktionen operieren auf globalem State
const fetchPendingTasks = async (staffId: string) => {
  console.log('🔥 fetchPendingTasks starting for staff:', staffId)
  globalState.isLoading = true
  globalState.error = null

  try {
    const supabase = getSupabase()
    
    // Vergangene Termine des Fahrlehrers abrufen
    const { data, error: fetchError } = await supabase
      .from('appointments')
      .select(`
        id,
        title,
        start_time,
        end_time,
        user_id,
        status,
        users!appointments_user_id_fkey (
          first_name,
          last_name
        ),
        notes (
          evaluation_criteria_id,
          criteria_rating
        )
      `)
      .eq('staff_id', staffId)
      .lt('end_time', new Date().toISOString()) // Nur vergangene Termine
      .eq('status', 'completed') // Nur abgeschlossene Termine
      .order('start_time', { ascending: false }) // Neueste zuerst

    if (fetchError) throw fetchError

    console.log('🔥 Fetched appointments (raw data):', data?.length)

    // Termine ohne Kriterienbewertung filtern
    const pending: PendingAppointment[] = (data || []).filter((appointment: any) => {
      // Ein Termin ist "pending", wenn er KEINE Kriterien-Bewertung hat.
      // Wir definieren "Kriterien-Bewertung" als einen Note-Eintrag, 
      // bei dem evaluation_criteria_id und criteria_rating gesetzt sind.
      const hasCriteriaEvaluation = appointment.notes && 
        appointment.notes.some((note: any) => 
          note.evaluation_criteria_id !== null && 
          note.criteria_rating !== null
        );

      // Hier ignorieren wir alte staff_rating Einträge komplett für die Pendenzen-Logik
      console.log(`🔥 Appointment ${appointment.id}: hasCriteriaEvaluation=${hasCriteriaEvaluation}`)
      return !hasCriteriaEvaluation; // Pending, wenn keine Kriterien-Bewertung vorhanden ist
    }).map((appointment: any): PendingAppointment => ({
      id: appointment.id,
      title: appointment.title,
      start_time: appointment.start_time,
      end_time: appointment.end_time,
      user_id: appointment.user_id,
      status: appointment.status,
      users: appointment.users,
      // Wichtig: Filtere hier die notes, damit nur relevante Kriterien-notes enthalten sind
      notes: appointment.notes.filter((note: any) => note.evaluation_criteria_id !== null)
    }))

    console.log('🔥 Filtered pending appointments:', pending.length)
    
    // WICHTIG: Globalen State komplett ersetzen (nicht mutieren)
    globalState.pendingAppointments = [...pending]
    console.log('🔥 Global pending state updated, count:', pendingCount.value)
    
  } catch (err: any) {
    globalState.error = err?.message || 'Fehler beim Laden der Pendenzen'
    console.error('❌ Fehler beim Laden der Pendenzen:', err)
  } finally {
    globalState.isLoading = false
  }
}

// NEUE Funktion zum Speichern der Kriterien-Bewertungen
const saveCriteriaEvaluations = async (
  appointmentId: string,
  evaluations: CriteriaEvaluationData[], // Array von Kriterien-Bewertungen
  currentUserId?: string
) => {
  try {
    const supabase = getSupabase();
    
    // Validierung der übergebenen Daten
    if (!evaluations || evaluations.length === 0) {
      throw new Error('Es müssen Bewertungen für mindestens ein Kriterium angegeben werden.');
    }

    const notesToInsert = evaluations.map(evalData => {
      // Validierung für jede einzelne Kriterienbewertung
      if (evalData.rating < 1 || evalData.rating > 6) {
        throw new Error(`Bewertung für Kriterium ${evalData.criteria_id} muss zwischen 1 und 6 liegen.`);
      }
      if (typeof evalData.note !== 'string') { // Stellen Sie sicher, dass note ein String ist
        evalData.note = String(evalData.note);
      }
      if (evalData.note.trim().length === 0) { // Eine Notiz ist nicht mehr zwingend
        evalData.note = ''; // Sicherstellen, dass es ein leerer String ist
      }

      return {
        appointment_id: appointmentId,
        evaluation_criteria_id: evalData.criteria_id,
        criteria_rating: evalData.rating,
        criteria_note: evalData.note.trim(),
        // staff_rating und staff_note bleiben NULL, da nicht mehr verwendet
        staff_rating: null,
        staff_note: '',
        last_updated_by_user_id: currentUserId || null,
        last_updated_at: new Date().toISOString()
      };
    });

    console.log('Attempting to upsert notes:', notesToInsert);

    // Verwende upsert für mehrere Einträge
    const { error: upsertError } = await supabase
      .from('notes')
      .upsert(notesToInsert, { onConflict: 'appointment_id,evaluation_criteria_id' }); // Conflict auf diesen beiden Spalten
                                                                                        // um Updates zu ermöglichen
    if (upsertError) throw upsertError;

    // Nach erfolgreichem Speichern: Aktualisiere die Pendenzen
    // Ein Termin ist NICHT mehr pending, wenn er mindestens eine Kriterien-Bewertung hat.
    // Die fetchPendingTasks Funktion wird das übernehmen.
    await fetchPendingTasks(currentUserId || ''); // Aktualisiere die Liste nach dem Speichern

    console.log('✅ Kriterien-Bewertungen erfolgreich gespeichert und Pendenzen aktualisiert:', appointmentId);

  } catch (err: any) {
    globalState.error = err?.message || 'Fehler beim Speichern der Kriterien-Bewertungen';
    console.error('❌ Fehler beim Speichern der Kriterien-Bewertungen:', err);
    throw err;
  }
};


// Die markAsCompleted und markMultipleAsCompleted Funktionen sind obsolet,
// da wir keine Gesamtbewertungen mehr speichern.
// Ich habe sie hier entfernt, damit sie nicht mehr versehentlich aufgerufen werden.
// Wenn du sie noch irgendwo im Code hast, wo sie aufgerufen werden, musst du diese Aufrufe ändern.

const refreshPendingTasks = async (staffId: string) => {
  await fetchPendingTasks(staffId)
}

const clearError = () => {
  globalState.error = null
}

// SINGLETON EXPORT - Immer dieselbe Instanz zurückgeben
export const usePendingTasks = () => {
  console.log('🔄 usePendingTasks called - returning singleton instance')
  console.log('🔥 Current global pending count:', pendingCount.value)
  
  return {
    // Reactive state - direkte Referenzen auf reactive state
    pendingAppointments: computed(() => globalState.pendingAppointments),
    formattedAppointments,
    pendingCount,
    buttonClasses,
    buttonText,
    isLoading: computed(() => globalState.isLoading),
    error: computed(() => globalState.error),
    
    // Actions
    fetchPendingTasks,
    saveCriteriaEvaluations, // Die neue Funktion zum Export hinzufügen
    refreshPendingTasks,
    clearError,
    
    // Utilities
    getFormattedAppointment
  }
}```

### ./composables/usePricing.ts
```typescript
// composables/usePricing.ts

import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

// Types
interface PricingRule {
  id: string
  category_code: string
  price_per_minute_rappen: number
  admin_fee_rappen: number
  admin_fee_applies_from: number
  base_duration_minutes: number
  is_active: boolean
  valid_from: string | null
  valid_until: string | null
  rule_name: string
}

interface CalculatedPrice {
  base_price_rappen: number
  admin_fee_rappen: number
  total_rappen: number
  base_price_chf: string
  admin_fee_chf: string
  total_chf: string
  category_code: string
  duration_minutes: number
  appointment_number: number
}

export const usePricing = () => {
  const supabase = getSupabase()
  
  // State
  const pricingRules = ref<PricingRule[]>([])
  const isLoadingPrices = ref(false)
  const pricingError = ref<string>('')
  const lastLoaded = ref<Date | null>(null)
  
  // Cache für 5 Minuten
  const CACHE_DURATION = 5 * 60 * 1000 // 5 Minuten

  // Load pricing rules from database
  const loadPricingRules = async (forceReload = false): Promise<void> => {
    // Prüfe Cache
    if (!forceReload && lastLoaded.value && 
        (Date.now() - lastLoaded.value.getTime()) < CACHE_DURATION) {
      return // Cache noch gültig
    }

    isLoadingPrices.value = true
    pricingError.value = ''

    try {
      console.log('🔄 Loading pricing rules from database...')

      const { data, error } = await supabase
        .from('pricing_rules')
        .select('*')
        .eq('rule_type', 'category_pricing')
        .eq('is_active', true)
        .order('category_code')

      if (error) {
        console.error('❌ Database error:', error)
        throw new Error(`Database error: ${error.message}`)
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ No pricing rules found, using fallback')
        await createFallbackPricingRules()
        return
      }

      // Filter nur gültige Regeln (Datumsbereich)
      const today = new Date().toISOString().split('T')[0]
      const validRules = data.filter(rule => {
        const validFrom = rule.valid_from || '1900-01-01'
        const validUntil = rule.valid_until || '2099-12-31'
        return today >= validFrom && today <= validUntil
      })

      pricingRules.value = validRules
      lastLoaded.value = new Date()

      console.log('✅ Pricing rules loaded:', validRules.length, 'rules')
      console.log('📊 Categories:', validRules.map(r => r.category_code))

    } catch (err: any) {
      console.error('❌ Error loading pricing rules:', err)
      pricingError.value = err.message || 'Fehler beim Laden der Preisregeln'
      
      // Fallback auf hard-coded Werte bei Fehler
      await createFallbackPricingRules()
    } finally {
      isLoadingPrices.value = false
    }
  }

  // Fallback: Hard-coded Werte in Memory laden
  const createFallbackPricingRules = async (): Promise<void> => {
    console.log('🔄 Using fallback pricing rules...')
    
    const fallbackRules: PricingRule[] = [
      { id: 'fallback-B', category_code: 'B', price_per_minute_rappen: 211, admin_fee_rappen: 12000, admin_fee_applies_from: 2, base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback B' },
      { id: 'fallback-A1', category_code: 'A1', price_per_minute_rappen: 211, admin_fee_rappen: 0, admin_fee_applies_from: 999, base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback A1' },
      { id: 'fallback-A35kW', category_code: 'A35kW', price_per_minute_rappen: 211, admin_fee_rappen: 0, admin_fee_applies_from: 999, base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback A35kW' },
      { id: 'fallback-A', category_code: 'A', price_per_minute_rappen: 211, admin_fee_rappen: 0, admin_fee_applies_from: 999, base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback A' },
      { id: 'fallback-BE', category_code: 'BE', price_per_minute_rappen: 267, admin_fee_rappen: 12000, admin_fee_applies_from: 2, base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback BE' },
      { id: 'fallback-C1', category_code: 'C1', price_per_minute_rappen: 333, admin_fee_rappen: 20000, admin_fee_applies_from: 2, base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback C1' },
      { id: 'fallback-D1', category_code: 'D1', price_per_minute_rappen: 333, admin_fee_rappen: 20000, admin_fee_applies_from: 2, base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback D1' },
      { id: 'fallback-C', category_code: 'C', price_per_minute_rappen: 378, admin_fee_rappen: 20000, admin_fee_applies_from: 2, base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback C' },
      { id: 'fallback-CE', category_code: 'CE', price_per_minute_rappen: 444, admin_fee_rappen: 25000, admin_fee_applies_from: 2, base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback CE' },
      { id: 'fallback-D', category_code: 'D', price_per_minute_rappen: 444, admin_fee_rappen: 30000, admin_fee_applies_from: 2, base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback D' },
      { id: 'fallback-Motorboot', category_code: 'Motorboot', price_per_minute_rappen: 211, admin_fee_rappen: 12000, admin_fee_applies_from: 2, base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback Motorboot' },
      { id: 'fallback-BPT', category_code: 'BPT', price_per_minute_rappen: 222, admin_fee_rappen: 12000, admin_fee_applies_from: 2, base_duration_minutes: 45, is_active: true, valid_from: null, valid_until: null, rule_name: 'Fallback BPT' }
    ]
    
    pricingRules.value = fallbackRules
    lastLoaded.value = new Date()
    console.log('✅ Fallback pricing rules loaded')
  }

  // Get pricing rule for specific category
  const getPricingRule = (categoryCode: string): PricingRule | null => {
    const rule = pricingRules.value.find(rule => rule.category_code === categoryCode)
    if (!rule) {
      console.warn(`⚠️ No pricing rule found for category: ${categoryCode}`)
      return null
    }
    return rule
  }

  // Get appointment count for user
  const getAppointmentCount = async (userId: string): Promise<number> => {
    try {
      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['completed', 'confirmed'])

      if (error) {
        console.error('❌ Error counting appointments:', error)
        return 1
      }

      return (count || 0) + 1
    } catch (error) {
      console.error('❌ Error in getAppointmentCount:', error)
      return 1
    }
  }

  // Calculate price based on category, duration, and appointment count
  const calculatePrice = async (
    categoryCode: string,
    durationMinutes: number,
    userId?: string
  ): Promise<CalculatedPrice> => {
    // Lade Pricing Rules falls noch nicht geladen
    if (pricingRules.value.length === 0) {
      await loadPricingRules()
    }

    const rule = getPricingRule(categoryCode)
    if (!rule) {
      throw new Error(`Keine Preisregel für Kategorie ${categoryCode} gefunden`)
    }

    // Appointment count ermitteln
    const appointmentNumber = userId ? await getAppointmentCount(userId) : 1

    // Grundpreis berechnen (skaliert auf Dauer)
    const basePriceRappen = Math.round(rule.price_per_minute_rappen * durationMinutes)
    
    // Admin-Fee nur ab entsprechendem Termin
    const adminFeeRappen = appointmentNumber >= rule.admin_fee_applies_from ? rule.admin_fee_rappen : 0
    
    // Gesamtpreis
    const totalRappen = basePriceRappen + adminFeeRappen

    const result: CalculatedPrice = {
      base_price_rappen: basePriceRappen,
      admin_fee_rappen: adminFeeRappen,
      total_rappen: totalRappen,
      base_price_chf: (basePriceRappen / 100).toFixed(2),
      admin_fee_chf: (adminFeeRappen / 100).toFixed(2),
      total_chf: (totalRappen / 100).toFixed(2),
      category_code: categoryCode,
      duration_minutes: durationMinutes,
      appointment_number: appointmentNumber
    }

    console.log('💰 Price calculated:', {
      category: categoryCode,
      duration: durationMinutes,
      appointment: appointmentNumber,
      basePrice: result.base_price_chf,
      adminFee: result.admin_fee_chf,
      total: result.total_chf
    })

    return result
  }

  // Get admin fee for category (legacy support)
  const getAdminFeeForCategory = (categoryCode: string): number => {
    const rule = getPricingRule(categoryCode)
    return rule ? rule.admin_fee_rappen / 100 : 0
  }

  // Get price per minute for category
  const getPricePerMinuteForCategory = (categoryCode: string): number => {
    const rule = getPricingRule(categoryCode)
    return rule ? rule.price_per_minute_rappen / 100 : 0
  }

  // Get all available categories
  const getAvailableCategories = (): string[] => {
    return pricingRules.value.map(rule => rule.category_code).sort()
  }

  // Update single pricing rule
  const updatePricingRule = async (
    categoryCode: string, 
    updates: Partial<Pick<PricingRule, 'price_per_minute_rappen' | 'admin_fee_rappen' | 'admin_fee_applies_from'>>
  ): Promise<boolean> => {
    try {
      console.log('💾 Updating pricing rule:', categoryCode, updates)

      const { error } = await supabase
        .from('pricing_rules')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('category_code', categoryCode)
        .eq('rule_type', 'category_pricing')

      if (error) {
        console.error('❌ Error updating pricing rule:', error)
        throw new Error(error.message)
      }

      // Cache invalidieren und neu laden
      await loadPricingRules(true)
      
      console.log('✅ Pricing rule updated successfully')
      return true

    } catch (err: any) {
      console.error('❌ Error in updatePricingRule:', err)
      pricingError.value = err.message || 'Fehler beim Aktualisieren der Preisregel'
      return false
    }
  }

  // Computed
  const isLoaded = computed(() => pricingRules.value.length > 0)
  const categoriesCount = computed(() => pricingRules.value.length)

  return {
    // State
    pricingRules,
    isLoadingPrices,
    pricingError,
    isLoaded,
    categoriesCount,
    
    // Methods
    loadPricingRules,
    calculatePrice,
    getPricingRule,
    getAdminFeeForCategory,
    getPricePerMinuteForCategory,
    getAvailableCategories,
    updatePricingRule,
    
    // Legacy support
    getAppointmentCount
  }
}```

### ./composables/useStaffCategoryDurations.ts
```typescript
// composables/useStaffCategoryDurations.ts - Neue saubere DB-Struktur
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

interface StaffCategoryDuration {
  id: string
  created_at: string
  staff_id: string
  category_code: string
  duration_minutes: number
  is_active: boolean
  display_order: number
}

export const useStaffCategoryDurations = () => {
  // State
  const availableDurations = ref<number[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed - formatierte Dauern für UI
  const formattedDurations = computed(() => {
    return availableDurations.value.map(duration => ({
      value: duration,
      label: duration >= 120 
        ? `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? duration % 60 + 'min' : ''}`.trim() 
        : `${duration}min`
    }))
  })

  // Dauern für Staff + Kategorie laden
  const loadStaffCategoryDurations = async (staffId: string, categoryCode: string) => {
    console.log('🚀 Loading staff category durations:', { staffId, categoryCode })
    isLoading.value = true
    error.value = null

    try {
      const supabase = getSupabase()

      const { data, error: fetchError } = await supabase
        .from('staff_category_durations')
        .select('duration_minutes')
        .eq('staff_id', staffId)
        .eq('category_code', categoryCode)
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (fetchError) throw fetchError

      const durations = data?.map(item => item.duration_minutes) || []
      
      // Fallback wenn keine spezifischen Dauern gefunden
      if (durations.length === 0) {
        console.log('⚠️ No specific durations found, using category default')
        
        // Hole Standard-Dauer aus categories Tabelle
        const { data: categoryData, error: categoryError } = await supabase
          .from('categories')
          .select('lesson_duration_minutes')
          .eq('code', categoryCode)
          .eq('is_active', true)
          .maybeSingle()

        if (categoryError) throw categoryError
        
        const defaultDuration = categoryData?.lesson_duration_minutes || 45
        availableDurations.value = [defaultDuration]
      } else {
        availableDurations.value = durations.sort((a: number, b: number) => a - b)
      }

      console.log('✅ Loaded durations:', availableDurations.value)
      return availableDurations.value

    } catch (err: any) {
      console.error('❌ Error loading staff category durations:', err)
      error.value = err.message
      // Absoluter Fallback
      availableDurations.value = [45]
      return [45]
    } finally {
      isLoading.value = false
    }
  }

  // Dauern für Staff + Kategorie speichern
  const saveStaffCategoryDurations = async (
    staffId: string, 
    categoryCode: string, 
    durations: number[]
  ) => {
    console.log('💾 Saving staff category durations:', { staffId, categoryCode, durations })
    
    try {
      const supabase = getSupabase()

      // Erst alle bestehenden Einträge für diesen Staff + Kategorie löschen
      const { error: deleteError } = await supabase
        .from('staff_category_durations')
        .delete()
        .eq('staff_id', staffId)
        .eq('category_code', categoryCode)

      if (deleteError) throw deleteError

      // Neue Einträge einfügen
      const insertData = durations.map((duration, index) => ({
        staff_id: staffId,
        category_code: categoryCode,
        duration_minutes: duration,
        display_order: index + 1,
        is_active: true
      }))

      const { error: insertError } = await supabase
        .from('staff_category_durations')
        .insert(insertData)

      if (insertError) throw insertError

      // State aktualisieren
      availableDurations.value = durations.sort((a: number, b: number) => a - b)
      
      console.log('✅ Staff category durations saved successfully')

    } catch (err: any) {
      console.error('❌ Error saving staff category durations:', err)
      error.value = err.message
      throw err
    }
  }

  // Alle Dauern eines Staff laden (für Settings)
  const loadAllStaffDurations = async (staffId: string) => {
    console.log('📋 Loading all staff durations for settings')
    
    try {
      const supabase = getSupabase()

      const { data, error: fetchError } = await supabase
        .from('staff_category_durations')
        .select(`
          category_code,
          duration_minutes,
          display_order,
          categories (name)
        `)
        .eq('staff_id', staffId)
        .eq('is_active', true)
        .order('category_code')
        .order('display_order')

      if (fetchError) throw fetchError

      // Gruppiere nach Kategorie
      const groupedDurations = data?.reduce((acc: any, item: any) => {
        if (!acc[item.category_code]) {
          acc[item.category_code] = {
            categoryCode: item.category_code,
            categoryName: item.categories?.name || item.category_code,
            durations: []
          }
        }
        acc[item.category_code].durations.push(item.duration_minutes)
        return acc
      }, {}) || {}

      return Object.values(groupedDurations)

    } catch (err: any) {
      console.error('❌ Error loading all staff durations:', err)
      return []
    }
  }

  // Standard-Dauern für neue Staff erstellen
  const createDefaultDurations = async (staffId: string) => {
    console.log('🏗️ Creating default durations for new staff')
    
    try {
      const supabase = getSupabase()

      // Lade alle aktiven Kategorien
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('code, lesson_duration_minutes')
        .eq('is_active', true)

      if (categoriesError) throw categoriesError

      // Erstelle Standard-Dauern für jede Kategorie
      const defaultDurations = categories?.flatMap(category => {
        const baseDuration = category.lesson_duration_minutes || 45
        
        // Erstelle 2-3 Standard-Optionen basierend auf der Kategorie
        const durations = [baseDuration]
        if (baseDuration >= 45) durations.push(baseDuration + 45) // +45min
        if (baseDuration <= 135) durations.push(baseDuration + 90) // +90min
        
        return durations.map((duration, index) => ({
          staff_id: staffId,
          category_code: category.code,
          duration_minutes: duration,
          display_order: index + 1,
          is_active: true
        }))
      }) || []

      const { error: insertError } = await supabase
        .from('staff_category_durations')
        .insert(defaultDurations)

      if (insertError) throw insertError

      console.log('✅ Default durations created for all categories')

    } catch (err: any) {
      console.error('❌ Error creating default durations:', err)
      throw err
    }
  }

  // Erstes verfügbares Dauer zurückgeben
  const getDefaultDuration = () => {
    return availableDurations.value.length > 0 ? availableDurations.value[0] : 45
  }

  // Check ob Dauer verfügbar ist
  const isDurationAvailable = (duration: number) => {
    return availableDurations.value.includes(duration)
  }

  // Reset state
  const reset = () => {
    availableDurations.value = []
    isLoading.value = false
    error.value = null
  }

  return {
    // State
    availableDurations: computed(() => availableDurations.value),
    formattedDurations,
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),

    // Actions
    loadStaffCategoryDurations,
    saveStaffCategoryDurations,
    loadAllStaffDurations,
    createDefaultDurations,
    
    // Utils
    getDefaultDuration,
    isDurationAvailable,
    reset
  }
}```

### ./composables/useStaffDurations.ts
```typescript
// composables/useStaffDurations.ts - Komplett Datenbank-getrieben
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

export const useStaffDurations = () => {
  // State
  const availableDurations = ref<number[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed - formatierte Dauern für UI
  const formattedDurations = computed(() => {
    return availableDurations.value.map(duration => ({
      value: duration,
      label: duration >= 120 
        ? `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? duration % 60 + 'min' : ''}`.trim() 
        : `${duration}min`
    }))
  })

  // Verfügbare Dauern für Staff + Kategorie aus Datenbank laden
  const loadAvailableDurations = async (categoryCode: string, staffId: string) => {
    console.log('🔥 Loading durations from DB for:', categoryCode, 'staff:', staffId)
    isLoading.value = true
    error.value = null

    try {
      const supabase = getSupabase()

      // 1. Staff Settings laden (preferred_durations)
      const { data: staffSettings, error: staffError } = await supabase
        .from('staff_settings')
        .select('preferred_durations')
        .eq('staff_id', staffId)
        .maybeSingle()

      if (staffError) {
        console.log('⚠️ No staff settings found, will use category defaults')
      }

      // 2. Kategorie aus DB laden (für Fallback-Dauer)
      const { data: category, error: categoryError } = await supabase
        .from('categories')
        .select('lesson_duration, code')
        .eq('code', categoryCode)
        .eq('is_active', true)
        .maybeSingle()

      if (categoryError) throw categoryError

      if (!category) {
        throw new Error(`Kategorie ${categoryCode} nicht gefunden`)
      }

      // 3. Staff preferred_durations parsen
      let finalDurations: number[] = []
      
      if (staffSettings?.preferred_durations) {
        // Staff hat eigene Dauern konfiguriert
        finalDurations = staffSettings.preferred_durations
          .split(',')
          .map((d: string) => parseInt(d.trim()))
          .filter((d: number) => !isNaN(d) && d > 0)
          .sort((a: number, b: number) => a - b)
        
        console.log('✅ Using staff configured durations:', finalDurations)
      } else {
        // Fallback: Standard-Dauer der Kategorie
        finalDurations = [category.lesson_duration || 45]
        console.log('⚠️ No staff durations found, using category default:', finalDurations)
      }

      availableDurations.value = finalDurations
      return finalDurations

    } catch (err: any) {
      console.error('❌ Error loading durations from DB:', err)
      error.value = err.message
      // Absoluter Fallback
      availableDurations.value = [45]
      return [45]
    } finally {
      isLoading.value = false
    }
  }

  // Staff preferred durations in DB updaten
  const updateStaffDurations = async (staffId: string, newDurations: number[]) => {
    console.log('🔄 Updating staff durations in DB:', newDurations)
    
    try {
      const supabase = getSupabase()
      // Als JSON Array speichern um konsistent mit bestehenden Daten zu sein
      const durationsString = JSON.stringify(newDurations.sort((a: number, b: number) => a - b))
      
      const { error: upsertError } = await supabase
        .from('staff_settings')
        .upsert({
          staff_id: staffId,
          preferred_durations: durationsString,
          updated_at: new Date().toISOString()
        })

      if (upsertError) throw upsertError

      console.log('✅ Staff durations updated in DB as JSON:', durationsString)
      
      // State aktualisieren
      availableDurations.value = newDurations.sort((a: number, b: number) => a - b)
      
    } catch (err: any) {
      console.error('❌ Error updating staff durations:', err)
      error.value = err.message
      throw err
    }
  }

  // Standard-Dauern für alle Kategorien aus DB laden (für Settings UI)
  const loadAllPossibleDurations = async () => {
    console.log('🔥 Loading all possible durations from DB')
    
    try {
      const supabase = getSupabase()
      
      // Alle aktiven Kategorien laden
      const { data: categories, error } = await supabase
        .from('categories')
        .select('code, lesson_duration')
        .eq('is_active', true)
        .order('display_order')

      if (error) throw error

      // Alle möglichen Dauern sammeln (15min steps von 45-240)
      const allDurations = [45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240]
      
      return allDurations.map(duration => ({
        value: duration,
        label: duration >= 120 
          ? `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? duration % 60 + 'min' : ''}`.trim() 
          : `${duration}min`,
        // Zeige welche Kategorien diese Dauer unterstützen (Info für Settings)
        supportedCategories: categories?.filter(cat => {
          // Logik welche Kategorien welche Dauern unterstützen kann in DB erweitert werden
          return duration >= (cat.lesson_duration || 45)
        }).map(cat => cat.code) || []
      }))

    } catch (err: any) {
      console.error('❌ Error loading possible durations:', err)
      return []
    }
  }

  // Staff-Settings für User laden
  const loadStaffSettings = async (staffId: string) => {
    console.log('🔥 Loading complete staff settings from DB')
    
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('staff_settings')
        .select('*')
        .eq('staff_id', staffId)
        .maybeSingle()

      if (error) throw error
      
      return data
    } catch (err: any) {
      console.error('❌ Error loading staff settings:', err)
      return null
    }
  }

  // Erstes verfügbares Dauer zurückgeben
  const getDefaultDuration = () => {
    return availableDurations.value.length > 0 ? availableDurations.value[0] : 45
  }

  // Check ob Dauer verfügbar ist
  const isDurationAvailable = (duration: number) => {
    return availableDurations.value.includes(duration)
  }

  // Reset state
  const reset = () => {
    availableDurations.value = []
    isLoading.value = false
    error.value = null
  }

  return {
    // State
    availableDurations: computed(() => availableDurations.value),
    formattedDurations,
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),

    // Actions
    loadAvailableDurations,
    calculateAvailableDurations: loadAvailableDurations, // Alias für Kompatibilität
    updateStaffDurations,
    loadAllPossibleDurations,
    loadStaffSettings,
    
    // Utils
    getDefaultDuration,
    isDurationAvailable,
    reset
  }
}```

### ./composables/useStudents.ts
```typescript
// composables/useStudents.ts
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'
import type { User } from '~/types'

export const useStudents = () => {
  const students = ref<User[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const searchQuery = ref('')
  const showInactive = ref(false)
  const showAllStudents = ref(false) // false = nur eigene, true = alle

  // Computed: Gefilterte Schülerliste
  const filteredStudents = computed(() => {
    let filtered = students.value

    // Suche nach Name/Email
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase()
      filtered = filtered.filter(student =>
        `${student.first_name} ${student.last_name}`.toLowerCase().includes(query) ||
        student.email?.toLowerCase().includes(query)
      )
    }

    // Aktiv/Inaktiv Filter
    if (!showInactive.value) {
      filtered = filtered.filter(student => student.is_active)
    }

    return filtered
  })

  // Statistiken
  const totalStudents = computed(() => students.value.length)
  const activeStudents = computed(() => students.value.filter(s => s.is_active).length)
  const inactiveStudents = computed(() => students.value.filter(s => !s.is_active).length)

  // Schüler laden
  const fetchStudents = async (currentUserId: string, userRole: string) => {
    isLoading.value = true
    error.value = null

    try {
      const supabase = getSupabase()
      let query = supabase
        .from('users')
        .select('*')
        .eq('role', 'client')

      // Staff sieht nur eigene Schüler, außer showAllStudents ist true
      if (userRole === 'staff' && !showAllStudents.value) {
        query = query.eq('assigned_staff_id', currentUserId)
      }

      // Sortierung nach Nachname, Vorname
      query = query.order('last_name').order('first_name')

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      students.value = data || []

    } catch (err: any) {
      error.value = err.message
      console.error('Fehler beim Laden der Schüler:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Einzelnen Schüler laden
  const fetchStudent = async (studentId: string) => {
    try {
      const supabase = getSupabase()
      
      const { data, error: fetchError } = await supabase
        .from('users')
        .select(`
          *,
          assigned_staff:users!users_assigned_staff_id_fkey (
            first_name,
            last_name,
            email
          )
        `)
        .eq('id', studentId)
        .eq('role', 'client')
        .single()

      if (fetchError) throw fetchError

      return data

    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  // Schüler-Termine laden
  const fetchStudentAppointments = async (studentId: string) => {
    try {
      const supabase = getSupabase()
      
      const { data, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          *,
          staff:users!appointments_staff_id_fkey (
            first_name,
            last_name
          ),
          notes (
            staff_rating,
            staff_note,
            last_updated_at
          )
        `)
        .eq('user_id', studentId)
        .order('start_time', { ascending: false })

      if (fetchError) throw fetchError

      return data || []

    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  // Schüler aktivieren/deaktivieren
  const toggleStudentStatus = async (studentId: string, isActive: boolean) => {
    try {
      const supabase = getSupabase()
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ is_active: isActive })
        .eq('id', studentId)

      if (updateError) throw updateError

      // Lokale Liste aktualisieren
      const student = students.value.find(s => s.id === studentId)
      if (student) {
        student.is_active = isActive
      }

    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  // Neuen Schüler hinzufügen
  const addStudent = async (studentData: Partial<User>) => {
    try {
      const supabase = getSupabase()
      
      const { data, error: insertError } = await supabase
        .from('users')
        .insert([{
          ...studentData,
          role: 'client',
          is_active: true
        }])
        .select()
        .single()

      if (insertError) throw insertError

      // Zur lokalen Liste hinzufügen
      students.value.unshift(data)

      return data

    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  // Schüler bearbeiten
  const updateStudent = async (studentId: string, updates: Partial<User>) => {
    try {
      const supabase = getSupabase()
      
      const { data, error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', studentId)
        .select()
        .single()

      if (updateError) throw updateError

      // Lokale Liste aktualisieren
      const index = students.value.findIndex(s => s.id === studentId)
      if (index !== -1) {
        students.value[index] = { ...students.value[index], ...data }
      }

      return data

    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  return {
    // State
    students,
    isLoading,
    error,
    searchQuery,
    showInactive,
    showAllStudents,

    // Computed
    filteredStudents,
    totalStudents,
    activeStudents,
    inactiveStudents,

    // Methods
    fetchStudents,
    fetchStudent,
    fetchStudentAppointments,
    toggleStudentStatus,
    addStudent,
    updateStudent
  }
}```

### ./composables/useUsers.ts
```typescript
// composables/useUsers.ts
import { ref } from 'vue'
import { getSupabase } from '~/utils/supabase'

export const useUsers = () => {
  const users = ref<any[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Soft Delete - User deaktivieren
  const deactivateUser = async (userId: string, reason?: string) => {
    try {
      const supabase = getSupabase()
      
      const { error } = await supabase
        .from('users')
        .update({
          is_active: false,
          deleted_at: new Date().toISOString(),
          deletion_reason: reason || 'Deaktiviert'
        })
        .eq('id', userId)
        
      if (error) throw error
      console.log('User deaktiviert (Soft Delete)')
      
      // Liste aktualisieren
      await getActiveUsers()
      
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  // User reaktivieren
  const reactivateUser = async (userId: string) => {
    try {
      const supabase = getSupabase()
      
      const { error } = await supabase
        .from('users')
        .update({
          is_active: true,
          deleted_at: null,
          deletion_reason: null
        })
        .eq('id', userId)
        
      if (error) throw error
      console.log('User reaktiviert')
      
      // Liste aktualisieren
      await getActiveUsers()
      
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  // Nur aktive User laden (Standard)
  const getActiveUsers = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      const supabase = getSupabase()
      
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('is_active', true)
        .order('last_name')
        .order('first_name')
        
      if (fetchError) throw fetchError
      
      users.value = data || []
      return data
      
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Alle User inkl. inaktive (für Admin)
  const getAllUsers = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      const supabase = getSupabase()
      
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*, deleted_at')
        .order('is_active', { ascending: false })
        .order('last_name')
        .order('first_name')
        
      if (fetchError) throw fetchError
      
      users.value = data || []
      return data
      
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // User nach ID suchen
  const getUserById = async (userId: string) => {
    try {
      const supabase = getSupabase()
      
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
        
      if (fetchError) throw fetchError
      return data
      
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  return {
    // State
    users,
    isLoading,
    error,
    
    // Methods
    deactivateUser,
    reactivateUser,
    getActiveUsers,
    getAllUsers,
    getUserById
  }
}```

### ./composables/useWallee.ts
```typescript
// composables/useWallee.ts - Updated Version

import { useRuntimeConfig } from '#app'

interface WalleeTransactionResult {
  success: boolean
  error: string | null
  transactionId?: string
  paymentUrl?: string
  transaction?: any
}

interface WalleeConnectionResult {
  success: boolean
  error: string | null
  connected?: boolean
  spaceId?: string
}

interface WalleeTransactionRequest {
  appointmentId: string
  amount: number
  currency?: string
  customerId: string
  customerEmail: string
  lineItems?: Array<{
    uniqueId: string
    name: string
    quantity: number
    amountIncludingTax: number
    type: string
  }>
  successUrl?: string
  failedUrl?: string
}

export const useWallee = () => {
  const createTransaction = async (request: WalleeTransactionRequest): Promise<WalleeTransactionResult> => {
    try {
      console.log('🔄 Creating Wallee transaction:', request)
      
      // Validierung der erforderlichen Felder
      if (!request.appointmentId || !request.amount || !request.customerId || !request.customerEmail) {
        throw new Error('Missing required fields: appointmentId, amount, customerId, customerEmail')
      }

      // API Call zu deiner Wallee Route
      const response = await $fetch('/api/wallee/create-transaction', {
        method: 'POST',
        body: {
          appointmentId: request.appointmentId,
          amount: request.amount,
          currency: request.currency || 'CHF',
          customerId: request.customerId,
          customerEmail: request.customerEmail,
          lineItems: request.lineItems || [
            {
              uniqueId: `appointment-${request.appointmentId}`,
              name: 'Fahrstunde',
              quantity: 1,
              amountIncludingTax: request.amount,
              type: 'PRODUCT'
            }
          ],
          successUrl: request.successUrl,
          failedUrl: request.failedUrl
        }
      })  as any

      console.log('✅ Wallee transaction created successfully:', response)

      return {
        success: true,
        transactionId: response.transactionId,
        paymentUrl: response.paymentUrl,
        transaction: response.transaction,
        error: null
      }

    } catch (error: any) {
      console.error('❌ Wallee Transaction Error:', error)
      
      return {
        success: false,
        error: error.data?.message || error.message || 'Transaction creation failed'
      }
    }
  }

  const testConnection = async (): Promise<WalleeConnectionResult> => {
    try {
      console.log('🔄 Testing Wallee connection...')
      
      // Test mit einer minimalen Transaction oder Connection Check
      const testResponse = await $fetch('/api/wallee/test-connection', {
        method: 'GET'
      }) as any

      return {
        success: true,
        connected: true,
        spaceId: testResponse.spaceId,
        error: null
      }

    } catch (error: any) {
      console.error('❌ Wallee Connection Error:', error)
      
      return {
        success: false,
        connected: false,
        error: error.message || 'Connection test failed'
      }
    }
  }

  const isWalleeAvailable = (): boolean => {
    // Check if environment variables are available
    const config = useRuntimeConfig()
    return !!(config.public.walleeEnabled || process.env.WALLEE_SPACE_ID)
  }

  // Neue Utility-Funktionen
  const calculateAppointmentPrice = (category: string, duration: number, isSecondAppointment: boolean = false): number => {
    // Preise basierend auf deinen Projektdaten
    const categoryPrices: Record<string, { base: number, admin: number }> = {
      'B': { base: 95, admin: 120 },
      'A1': { base: 95, admin: 0 },
      'A35kW': { base: 95, admin: 0 },
      'A': { base: 95, admin: 0 },
      'BE': { base: 120, admin: 120 },
      'C1': { base: 150, admin: 200 },
      'D1': { base: 150, admin: 200 },
      'C': { base: 170, admin: 200 },
      'CE': { base: 200, admin: 250 },
      'D': { base: 200, admin: 300 },
      'Motorboot': { base: 95, admin: 120 },
      'BPT': { base: 100, admin: 120 }
    }

    const priceInfo = categoryPrices[category] || { base: 95, admin: 120 }
    
    // Preis pro 45min auf gewünschte Dauer umrechnen
    const lessonPrice = (priceInfo.base / 45) * duration
    
    // Versicherungspauschale ab 2. Termin (außer bei Motorrad-Kategorien)
    const adminFee = isSecondAppointment ? priceInfo.admin : 0
    
    return Math.round((lessonPrice + adminFee) * 100) / 100 // Auf 2 Dezimalstellen runden
  }

  const createAppointmentPayment = async (
    appointment: any, 
    user: any, 
    isSecondAppointment: boolean = false
  ): Promise<WalleeTransactionResult> => {
    const amount = calculateAppointmentPrice(
      appointment.type || 'B', 
      appointment.duration_minutes || 45, 
      isSecondAppointment
    )

    return await createTransaction({
      appointmentId: appointment.id,
      amount: amount,
      currency: 'CHF',
      customerId: user.id,
      customerEmail: user.email,
      lineItems: [
        {
          uniqueId: `appointment-${appointment.id}`,
          name: `Fahrstunde ${appointment.type || 'B'} (${appointment.duration_minutes || 45}min)`,
          quantity: 1,
          amountIncludingTax: amount,
          type: 'PRODUCT'
        }
      ]
    })
  }

  return {
    // Core functions
    createTransaction,
    testConnection,
    isWalleeAvailable,
    
    // Utility functions
    calculateAppointmentPrice,
    createAppointmentPayment
  }
}```

### ./middleware/auth.ts
```typescript
// middleware/auth.ts
import { defineNuxtRouteMiddleware, navigateTo } from '#app'
import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to, from) => {
  console.log('🔥 Auth middleware for:', to.path)
  
  // Skip auf Server
  if (process.server) return

  const authStore = useAuthStore()

  // Warte kurz auf Store-Initialisierung
  let attempts = 0
  while (!authStore.isInitialized && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 100))
    attempts++
  }

  // Prüfe ob User eingeloggt ist
  if (!authStore.isLoggedIn) {
    console.log('❌ Not logged in, redirecting to /')
    if (to.path !== '/') {
      return navigateTo('/')
    }
    return
  }

  // Prüfe ob User ein Profil hat
  if (!authStore.hasProfile && to.path !== '/profile-setup') {
    console.log('📝 No profile found, redirecting to setup')
    return navigateTo('/profile-setup')
  }

  // Wenn User Profil hat aber auf Setup-Seite ist
  if (authStore.hasProfile && to.path === '/profile-setup') {
    console.log('✅ Profile exists, redirecting to dashboard')
    return navigateTo('/dashboard')
  }

  console.log('✅ Auth check passed for role:', authStore.userRole)
})

// middleware/admin.ts
export const adminMiddleware = defineNuxtRouteMiddleware((to, from) => {
  console.log('🔐 Admin middleware for:', to.path)
  
  if (process.server) return

  const authStore = useAuthStore()

  // Basis-Auth prüfen
  if (!authStore.isLoggedIn) {
    console.log('❌ Not authenticated')
    return navigateTo('/')
  }

  // Admin/Staff Berechtigung prüfen
  if (!authStore.isAdmin && !authStore.isStaff) {
    console.log('❌ Insufficient permissions. Role:', authStore.userRole)
    return navigateTo('/dashboard')
  }

  console.log('✅ Admin access granted for role:', authStore.userRole)
})

// middleware/staff.ts
export const staffMiddleware = defineNuxtRouteMiddleware((to, from) => {
  console.log('👨‍🏫 Staff middleware for:', to.path)
  
  if (process.server) return

  const authStore = useAuthStore()

  if (!authStore.isLoggedIn) {
    console.log('❌ Not authenticated')
    return navigateTo('/')
  }

  if (!authStore.isStaff && !authStore.isAdmin) {
    console.log('❌ Staff access denied. Role:', authStore.userRole)
    return navigateTo('/dashboard')
  }

  console.log('✅ Staff access granted for role:', authStore.userRole)
})

// middleware/client.ts  
export const clientMiddleware = defineNuxtRouteMiddleware((to, from) => {
  console.log('👤 Client middleware for:', to.path)
  
  if (process.server) return

  const authStore = useAuthStore()

  if (!authStore.isLoggedIn) {
    console.log('❌ Not authenticated')
    return navigateTo('/')
  }

  // Clients können nur auf ihre eigenen Daten zugreifen
  if (authStore.isClient) {
    // Zusätzliche Client-spezifische Checks hier
    console.log('✅ Client access granted')
  }
})```

### ./plugins/wallee.client.ts
```typescript
// plugins/wallee.client.ts
import { defineNuxtPlugin } from '#app'
import type { WalleeService, WalleeTransactionResult, WalleeConnectionResult } from '~/types/wallee'

export default defineNuxtPlugin(() => {
  // Prüfe ob wir im Browser sind
  if (!process.client) {
    return {
      provide: {
        wallee: {
          createTransaction: () => Promise.resolve({ success: false, error: 'Server-side not supported' }),
          testSpaceConnection: () => Promise.resolve({ success: false, error: 'Server-side not supported' })
        }
      }
    }
  }

  // Browser-Implementation
  const createTransaction = async (): Promise<WalleeTransactionResult> => {
    try {
      console.log('🔄 Wallee: Creating transaction...')
      
      // Hier würde die echte Wallee-Integration stehen
      // Für den Moment geben wir ein Mock-Ergebnis zurück
      
      return {
        success: true,
        error: '',
        transactionId: `txn_${Date.now()}`,
        paymentUrl: 'https://checkout.wallee.com/...'
      }
    } catch (error: any) {
      console.error('❌ Wallee Transaction Error:', error)
      return {
        success: false,
        error: error.message || 'Transaction failed'
      }
    }
  }

  const testSpaceConnection = async (): Promise<WalleeConnectionResult> => {
    try {
      console.log('🔄 Testing Wallee Space connection...')
      
      // Test-Verbindung zu Wallee Space
      // Für den Moment simulieren wir eine erfolgreiche Verbindung
      
      return {
        success: true,
        error: '',
        spaceId: '12345',
        connected: true
      }
    } catch (error: any) {
      console.error('❌ Wallee Connection Error:', error)
      return {
        success: false,
        error: error.message || 'Connection failed'
      }
    }
  }

  return {
    provide: {
      wallee: {
        createTransaction,
        testSpaceConnection
      }
    }
  }
})```

### ./server/api/payments/receipt.post.ts
```typescript
// PDF Receipt Generation API

import { defineEventHandler, readBody } from 'h3'
import { getSupabase } from '~/utils/supabase'

interface ReceiptRequest {
  paymentId: string
}

interface ReceiptResponse {
  success: boolean
  pdfUrl?: string
  error?: string
}

export default defineEventHandler(async (event): Promise<ReceiptResponse> => {
  try {
    const { paymentId }: ReceiptRequest = await readBody(event)
    
    if (!paymentId) {
      throw new Error('Payment ID is required')
    }

    console.log('📄 Generating receipt for payment:', paymentId)

    // Get payment details from database
    const supabase = getSupabase()
    const { data: payment, error } = await supabase
      .from('payments')
      .select(`
        *,
        appointments (
          title,
          start_time,
          duration_minutes,
          type
        ),
        users!payments_user_id_fkey (
          first_name,
          last_name,
          email,
          street,
          street_nr,
          zip,
          city
        )
      `)
      .eq('id', paymentId)
      .single()

    if (error || !payment) {
      throw new Error('Payment not found')
    }

    // Generate PDF receipt
    const receiptData = {
      payment: {
        id: payment.id,
        transactionId: payment.wallee_transaction_id,
        amount: payment.total_amount_rappen / 100,
        baseAmount: payment.amount_rappen / 100,
        adminFee: payment.admin_fee_rappen / 100,
        method: payment.payment_method,
        status: payment.payment_status,
        paidAt: payment.paid_at,
        createdAt: payment.created_at,
        description: payment.description,
        currency: payment.currency
      },
      appointment: payment.appointments,
      customer: payment.users,
      company: {
        name: 'Driving Team Zürich GmbH',
        address: 'Baslerstrasse 145',
        zip: '8048',
        city: 'Zürich',
        email: 'info@drivingteam.ch',
        phone: '044 431 00 33'
      }
    }

    // Here you would integrate with a PDF generation service
    // For now, we'll return a placeholder
    const pdfUrl = await generatePDF(receiptData)

    console.log('✅ Receipt generated:', pdfUrl)

    return {
      success: true,
      pdfUrl
    }

  } catch (error: any) {
    console.error('❌ Receipt generation failed:', error)
    return {
      success: false,
      error: error.message || 'Receipt generation failed'
    }
  }
})

async function generatePDF(data: any): Promise<string> {
  // Placeholder for PDF generation
  // You can integrate with services like:
  // - Puppeteer
  // - jsPDF
  // - PDFKit
  // - External PDF service
  
  // For now, return a mock URL
  return '/api/receipts/placeholder.pdf'
}

// .env Variables für Wallee
/*
# Wallee Configuration
WALLEE_BASE_URL=https://app-wallee.com
WALLEE_SPACE_ID=your_space_id_here
WALLEE_USER_ID=your_user_id_here
WALLEE_API_SECRET=your_api_secret_here
WALLEE_TWINT_METHOD_ID=your_twint_method_configuration_id

# Webhook URLs (für Wallee Dashboard)
# Success URL: https://yourdomain.com/payment/success
# Failed URL: https://yourdomain.com/payment/failed
# Webhook URL: https://yourdomain.com/api/wallee/webhook
*/```

### ./server/api/wallee/create-transaction.post.ts
```typescript
// server/api/wallee/create-transaction.post.ts
export default defineEventHandler(async (event) => {
  try {
    console.log('🔥 Wallee API called')
    
    // Body aus der Anfrage lesen
    const body = await readBody(event)
    
    console.log('📨 Received body:', body)
    
    const {
      appointmentId,
      amount,
      currency = 'CHF',
      customerId,
      customerEmail,
      lineItems,
      successUrl,
      failedUrl
    } = body

    // Validierung der erforderlichen Felder
    if (!appointmentId || !amount || !customerId || !customerEmail) {
      console.error('❌ Missing required fields:', { appointmentId, amount, customerId, customerEmail })
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: appointmentId, amount, customerId, customerEmail'
      })
    }

    // Wallee Konfiguration aus Environment Variables
    const walleeSpaceId = process.env.WALLEE_SPACE_ID
    const walleeApplicationUserId = process.env.WALLEE_APPLICATION_USER_ID
    const walleeSecretKey = process.env.WALLEE_SECRET_KEY

    console.log('🔧 Wallee Config Check:', {
      hasSpaceId: !!walleeSpaceId,
      hasUserId: !!walleeApplicationUserId,
      hasSecretKey: !!walleeSecretKey,
      spaceId: walleeSpaceId ? `${walleeSpaceId.substring(0, 3)}...` : 'missing',
      userId: walleeApplicationUserId ? `${walleeApplicationUserId.substring(0, 3)}...` : 'missing'
    })

    if (!walleeSpaceId || !walleeApplicationUserId || !walleeSecretKey) {
      console.error('❌ Wallee configuration missing')
      throw createError({
        statusCode: 500,
        statusMessage: 'Wallee configuration missing in environment variables'
      })
    }

    // Base64 Authentifizierung für Wallee API
    const auth = Buffer.from(`${walleeApplicationUserId}:${walleeSecretKey}`).toString('base64')

    // Get request host for URLs
    const host = getHeader(event, 'host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`

    // Transaction Data für Wallee
    const transactionData = {
      lineItems: lineItems || [
        {
          uniqueId: `appointment-${appointmentId}`,
          name: 'Fahrstunde',
          quantity: 1,
          amountIncludingTax: amount,
          type: 'PRODUCT'
        }
      ],
      currency: currency,
      customerId: customerId,
      merchantReference: `appointment-${appointmentId}`,
      successUrl: successUrl || `${baseUrl}/payment/success`,
      failedUrl: failedUrl || `${baseUrl}/payment/failed`,
      language: 'de-CH',
      spaceId: parseInt(walleeSpaceId),
      autoConfirmationEnabled: true,
      customerEmailAddress: customerEmail,
      metaData: {
        appointmentId: appointmentId,
        createdAt: new Date().toISOString()
      }
    }

    console.log('🔄 Creating Wallee transaction:', {
      spaceId: walleeSpaceId,
      amount: amount,
      currency: currency,
      customerId: customerId
    })

    // Wallee Transaction erstellen
    const response = await $fetch<any>(
      `https://app-wallee.com/api/transaction/create?spaceId=${walleeSpaceId}`,
      {
        method: 'POST',
        body: transactionData,
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    )

    console.log('✅ Wallee transaction created:', {
      id: response?.id,
      state: response?.state,
      amount: response?.authorizationAmount
    })

    // Payment Page URL erstellen
    const paymentPageUrl = await $fetch<string>(
      `https://app-wallee.com/api/transaction-payment-page/payment-page-url?spaceId=${walleeSpaceId}`,
      {
        method: 'POST',
        body: {
          id: response?.id
        },
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    )

    console.log('✅ Payment page URL created:', paymentPageUrl)

    return {
      success: true,
      transactionId: response?.id,
      paymentUrl: paymentPageUrl,
      transaction: response
    }

  } catch (error: any) {
    console.error('❌ Wallee API Error:', error)
    
    // Spezifische Fehlerbehandlung für Wallee API Fehler
    if (error.data) {
      console.error('❌ Wallee API Response Error:', error.data)
      throw createError({
        statusCode: error.statusCode || 500,
        statusMessage: error.data.message || 'Wallee API Error'
      })
    }

    // Allgemeine Fehlerbehandlung
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Internal Server Error'
    })
  }
})```

### ./server/api/wallee/debug-credentials.get.ts
```typescript
// server/api/wallee/debug-credentials.get.ts
export default defineEventHandler(async (event) => {
  console.log('🔥 Debug Wallee Credentials')
  
  // Environment Variables checken
  const walleeSpaceId = process.env.WALLEE_SPACE_ID
  const walleeApplicationUserId = process.env.WALLEE_APPLICATION_USER_ID
  const walleeSecretKey = process.env.WALLEE_SECRET_KEY
  
  console.log('📊 Environment Check:', {
    NODE_ENV: process.env.NODE_ENV,
    hasSpaceId: !!walleeSpaceId,
    hasUserId: !!walleeApplicationUserId,
    hasSecretKey: !!walleeSecretKey,
    spaceIdLength: walleeSpaceId?.length || 0,
    userIdLength: walleeApplicationUserId?.length || 0,
    secretKeyLength: walleeSecretKey?.length || 0
  })
  
  // Partial values für Debug (keine Secrets leaken!)
  const debugInfo = {
    spaceId: walleeSpaceId ? `${walleeSpaceId.substring(0, 3)}...${walleeSpaceId.substring(-3)}` : 'MISSING',
    userId: walleeApplicationUserId ? `${walleeApplicationUserId.substring(0, 3)}...${walleeApplicationUserId.substring(-3)}` : 'MISSING',
    secretKey: walleeSecretKey ? `${walleeSecretKey.substring(0, 10)}...` : 'MISSING',
    authString: walleeApplicationUserId && walleeSecretKey ? 
      `${walleeApplicationUserId.substring(0, 3)}:${walleeSecretKey.substring(0, 10)}...` : 'MISSING'
  }
  
  console.log('🔐 Credential Preview:', debugInfo)
  
  // Test Base64 Encoding
  if (walleeApplicationUserId && walleeSecretKey) {
    const auth = Buffer.from(`${walleeApplicationUserId}:${walleeSecretKey}`).toString('base64')
    console.log('📝 Base64 Auth Length:', auth.length)
    console.log('📝 Base64 Auth Preview:', `${auth.substring(0, 20)}...`)
  }
  
  return {
    success: true,
    environment: process.env.NODE_ENV,
    hasCredentials: {
      spaceId: !!walleeSpaceId,
      userId: !!walleeApplicationUserId,
      secretKey: !!walleeSecretKey
    },
    debug: debugInfo,
    message: 'Check server console for detailed logs'
  }
})```

### ./server/api/wallee/test-auth.post.ts
```typescript
// server/api/wallee/test-auth.post.ts
export default defineEventHandler(async (event) => {
  console.log('🔥 Wallee Auth Test started')
  
  try {
    const body = await readBody(event)
    console.log('📨 Received:', body)
    
    // Get credentials
    const spaceId = process.env.WALLEE_SPACE_ID
    const userId = process.env.WALLEE_APPLICATION_USER_ID  
    const secretKey = process.env.WALLEE_SECRET_KEY
    
    console.log('📊 Credentials check:', {
      spaceId: spaceId,
      userId: userId,
      secretKey: secretKey ? `${secretKey.substring(0, 20)}...` : 'MISSING',
      allPresent: !!(spaceId && userId && secretKey)
    })
    
    if (!spaceId || !userId || !secretKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Missing Wallee credentials'
      })
    }
    
    // Create auth string
    const authString = `${userId}:${secretKey}`
    const authBase64 = Buffer.from(authString).toString('base64')
    
    console.log('🔐 Auth creation:', {
      authString: `${userId}:${secretKey.substring(0, 10)}...`,
      authBase64: `${authBase64.substring(0, 30)}...`,
      authBase64Length: authBase64.length
    })
    
    // Test simple Wallee API call - get space info
    const testUrl = `https://app-wallee.com/api/space/read?spaceId=${spaceId}&id=${spaceId}`
    
    console.log('🌐 Testing Wallee API:', {
      url: testUrl,
      headers: {
        'Authorization': `Basic ${authBase64.substring(0, 30)}...`,
        'Content-Type': 'application/json'
      }
    })
    
    const response = await $fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authBase64}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    
    console.log('✅ Wallee API Response:', response)
    
    return {
      success: true,
      message: 'Authentication working!',
      spaceInfo: response
    }
    
  } catch (error: any) {
    console.error('❌ Wallee Auth Test Error:', error)
    
    if (error.statusCode === 442) {
      console.error('🚨 Permission Error - User not authenticated or no permissions')
    }
    
    return {
      success: false,
      error: error.message,
      statusCode: error.statusCode,
      details: error
    }
  }
})```

### ./server/api/wallee/test-connection.get.ts
```typescript
// server/api/wallee/test-connection.get.ts
export default defineEventHandler(async (event) => {
  try {
    console.log('🔥 Testing Wallee connection...')

    // Environment Variables prüfen
    const walleeSpaceId = process.env.WALLEE_SPACE_ID
    const walleeApplicationUserId = process.env.WALLEE_APPLICATION_USER_ID
    const walleeSecretKey = process.env.WALLEE_SECRET_KEY

    console.log('🔧 Environment Variables Check:', {
      hasSpaceId: !!walleeSpaceId,
      hasUserId: !!walleeApplicationUserId,
      hasSecretKey: !!walleeSecretKey,
      spaceId: walleeSpaceId ? `${walleeSpaceId.substring(0, 3)}***` : 'missing'
    })

    if (!walleeSpaceId || !walleeApplicationUserId || !walleeSecretKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Wallee configuration missing. Please check environment variables.'
      })
    }

    // Base64 Authentifizierung
    const auth = Buffer.from(`${walleeApplicationUserId}:${walleeSecretKey}`).toString('base64')

    // Wallee Space Information abrufen (einfacher Connection Test)
    const spaceInfo = await $fetch(
      `https://app-wallee.com/api/space/read?spaceId=${walleeSpaceId}&id=${walleeSpaceId}`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    ) as any

    console.log('✅ Wallee connection successful:', {
      spaceId: walleeSpaceId,
      spaceName: spaceInfo?.name,
      state: spaceInfo?.state
    })

    return {
      success: true,
      connected: true,
      spaceId: walleeSpaceId,
      spaceName: spaceInfo?.name,
      state: spaceInfo?.state,
      message: 'Wallee connection successful'
    }

  } catch (error: any) {
    console.error('❌ Wallee connection test failed:', error)

    // Spezifische Fehlerbehandlung
    if (error.statusCode === 401) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Wallee authentication failed. Please check your credentials.'
      })
    }

    if (error.statusCode === 404) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Wallee space not found. Please check your Space ID.'
      })
    }

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Wallee connection test failed'
    })
  }
})```

### ./server/api/wallee/transaction-debug.post.ts
```typescript
// server/api/wallee/transaction-debug.post.ts
export default defineEventHandler(async (event) => {
  console.log('🔥 Transaction Debug API called')
  
  try {
    const body = await readBody(event)
    console.log('📨 Request body:', body)
    
    // Get credentials
    const spaceId = process.env.WALLEE_SPACE_ID
    const userId = process.env.WALLEE_APPLICATION_USER_ID  
    const secretKey = process.env.WALLEE_SECRET_KEY
    
    console.log('📊 Using credentials:', {
      spaceId: spaceId,
      userId: userId,
      secretKeyLength: secretKey?.length
    })
    
    // Create auth
    const authBase64 = Buffer.from(`${userId}:${secretKey}`).toString('base64')
    
    // Minimal transaction data
    const transactionData = {
      lineItems: [{
        uniqueId: `test-${Date.now()}`,
        name: 'Test Transaction',
        quantity: 1,
        amountIncludingTax: 95.00,
        type: 'PRODUCT'
      }],
      currency: 'CHF',
      customerId: 'test-customer-123',
      merchantReference: `test-${Date.now()}`,
      language: 'de-CH',
      spaceId: parseInt(spaceId!),
      autoConfirmationEnabled: false, // Einfacher für Test
      customerEmailAddress: 'test@drivingteam.ch'
    }
    
    console.log('💳 Transaction data:', JSON.stringify(transactionData, null, 2))
    
    const url = `https://app-wallee.com/api/transaction/create?spaceId=${spaceId}`
    console.log('🌐 API URL:', url)
    
    // Test transaction creation
    const response = await $fetch<any>(url, {
      method: 'POST',
      body: transactionData,
      headers: {
        'Authorization': `Basic ${authBase64}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    
    console.log('✅ Transaction created successfully:', response)
    
    return {
      success: true,
      message: 'Transaction creation working!',
      transactionId: response?.id || 'unknown',
      response: response
    }
    
  } catch (error: any) {
    console.error('❌ Transaction Debug Error:', {
      message: error.message,
      statusCode: error.statusCode,
      data: error.data,
      stack: error.stack?.split('\n')[0]
    })
    
    // Check specific permission error
    if (error.message?.includes('Permission denied')) {
      console.error('🚨 PERMISSION ISSUE:', {
        errorType: 'Permission denied',
        suggestion: 'User needs Transaction Create permission in the specific space',
        currentSpace: process.env.WALLEE_SPACE_ID
      })
    }
    
    return {
      success: false,
      error: error.message,
      statusCode: error.statusCode,
      errorData: error.data,
      suggestion: error.message?.includes('Permission denied') 
        ? 'Add Transaction Create permission to your Application User in this Space'
        : 'Check Wallee credentials and API format'
    }
  }
})```

### ./stores/auth.ts
```typescript
// stores/auth.ts
import { ref, computed, watch, readonly } from 'vue'
import { defineStore } from 'pinia'
import type { User, SupabaseClient } from '@supabase/supabase-js'
import type { Ref } from 'vue'

// Types
interface UserProfile {
  id: string
  email: string
  role: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  is_active: boolean
  preferred_payment_method?: string | null
}

export const useAuthStore = defineStore('authV2', () => {
  // State
  const user = ref<User | null>(null)
  const userProfile = ref<UserProfile | null>(null)
  const userRole = ref<string>('')
  const errorMessage = ref<string | null>(null)
  const loading = ref<boolean>(false)
  const isInitialized = ref<boolean>(false)

  // Computed Properties
  const isLoggedIn = computed(() => !!user.value && !!userProfile.value)
  const isAdmin = computed(() => userRole.value === 'admin')
  const isStaff = computed(() => userRole.value === 'staff')
  const isClient = computed(() => userRole.value === 'client')
  const hasProfile = computed(() => !!userProfile.value)
  
  const userDisplayName = computed(() => {
    if (!userProfile.value) return 'Unbekannt'
    const first = userProfile.value.first_name || ''
    const last = userProfile.value.last_name || ''
    return `${first} ${last}`.trim() || userProfile.value.email || 'Unbekannt'
  })

  const userInitials = computed(() => {
    if (!userProfile.value) return '??'
    const first = userProfile.value.first_name?.charAt(0)?.toUpperCase() || ''
    const last = userProfile.value.last_name?.charAt(0)?.toUpperCase() || ''
    return first + last || userProfile.value.email?.charAt(0)?.toUpperCase() || '??'
  })

  // Actions
  const initializeAuthStore = (
    supabaseClient: SupabaseClient,
    supabaseUserRef: Ref<User | null>
  ) => {
    console.log('🔥 Initializing Auth Store')
    
    // Setze den initialen Benutzerwert
    user.value = supabaseUserRef.value

    // Auth State Change Listener
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event, !!session)
      
      if (session?.user) {
        user.value = session.user
        await fetchUserProfile(supabaseClient, session.user.id)
      } else {
        clearAuthState()
      }
    })

    // Watcher für Supabase User
    if (process.client) {
      watch(supabaseUserRef, async (newUser) => {
        console.log('👤 User ref changed:', !!newUser)
        user.value = newUser
        
        if (newUser) {
          await fetchUserProfile(supabaseClient, newUser.id)
        } else {
          clearAuthState()
        }
      }, { immediate: true })
    }

    isInitialized.value = true
  }

  const login = async (email: string, password: string, supabaseClient: SupabaseClient) => {
    loading.value = true
    errorMessage.value = null

    try {
      console.log('🔑 Attempting login for:', email)
      
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        user.value = data.user
        await fetchUserProfile(supabaseClient, data.user.id)
        console.log('✅ Login successful')
        return true
      }

      return false
    } catch (err: any) {
      console.error('❌ Login error:', err.message)
      errorMessage.value = err.message || 'Login fehlgeschlagen.'
      return false
    } finally {
      loading.value = false
    }
  }

  const register = async (email: string, password: string, supabaseClient: SupabaseClient) => {
    loading.value = true
    errorMessage.value = null

    try {
      console.log('📝 Attempting registration for:', email)
      
      const { error } = await supabaseClient.auth.signUp({
        email,
        password,
      })

      if (error) throw error
      console.log('✅ Registration successful')
      return true
    } catch (err: any) {
      console.error('❌ Registration error:', err.message)
      errorMessage.value = err.message || 'Registrierung fehlgeschlagen.'
      return false
    } finally {
      loading.value = false
    }
  }

  const logout = async (supabaseClient: SupabaseClient) => {
    loading.value = true
    errorMessage.value = null

    try {
      console.log('🚪 Logging out')
      
      const { error } = await supabaseClient.auth.signOut()
      if (error) throw error
      
      clearAuthState()
      console.log('✅ Logout successful')
    } catch (err: any) {
      console.error('❌ Logout error:', err.message)
      errorMessage.value = err.message || 'Abmeldung fehlgeschlagen.'
    } finally {
      loading.value = false
    }
  }

  const fetchUserProfile = async (supabaseClient: SupabaseClient, userId: string) => {
    try {
      console.log('👤 Fetching user profile for:', userId)
      
      const { data, error } = await supabaseClient
        .from('users')
        .select(`
          id,
          email,
          role,
          first_name,
          last_name,
          phone,
          is_active,
          preferred_payment_method
        `)
        .eq('id', userId)
        .eq('is_active', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('📝 No user profile found, needs setup')
          userProfile.value = null
          userRole.value = ''
          return
        }
        throw error
      }

      userProfile.value = data
      userRole.value = data.role || ''
      
      console.log('✅ User profile loaded:', data.role)
    } catch (err: any) {
      console.error('❌ Error fetching user profile:', err.message)
      errorMessage.value = 'Konnte Benutzerprofil nicht laden.'
      userProfile.value = null
      userRole.value = ''
    }
  }

  const updateUserProfile = async (supabaseClient: SupabaseClient, updates: Partial<UserProfile>) => {
    if (!user.value?.id) return false

    try {
      console.log('📝 Updating user profile')
      
      const { data, error } = await supabaseClient
        .from('users')
        .update(updates)
        .eq('id', user.value.id)
        .select()
        .single()

      if (error) throw error

      userProfile.value = { ...userProfile.value, ...data } as UserProfile
      userRole.value = data.role || userRole.value
      
      console.log('✅ Profile updated')
      return true
    } catch (err: any) {
      console.error('❌ Error updating profile:', err.message)
      errorMessage.value = 'Profil konnte nicht aktualisiert werden.'
      return false
    }
  }

  const createUserProfile = async (supabaseClient: SupabaseClient, profileData: {
    role: string
    first_name?: string
    last_name?: string
    phone?: string
  }) => {
    if (!user.value?.id || !user.value?.email) return false

    try {
      console.log('🆕 Creating user profile')
      
      const { data, error } = await supabaseClient
        .from('users')
        .insert({
          id: user.value.id,
          email: user.value.email,
          ...profileData,
          is_active: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      userProfile.value = data
      userRole.value = data.role
      
      console.log('✅ Profile created')
      return true
    } catch (err: any) {
      console.error('❌ Error creating profile:', err.message)
      errorMessage.value = 'Profil konnte nicht erstellt werden.'
      return false
    }
  }

  const clearAuthState = () => {
    console.log('🧹 Clearing auth state')
    user.value = null
    userProfile.value = null
    userRole.value = ''
    errorMessage.value = null
  }

  const clearError = () => {
    errorMessage.value = null
  }

  // Route Guards
  const requireAuth = () => {
    if (!isLoggedIn.value) {
      throw new Error('Authentication required')
    }
  }

  const requireAdmin = () => {
    requireAuth()
    if (!isAdmin.value && !isStaff.value) {
      throw new Error('Admin access required')
    }
  }

  const requireStaff = () => {
    requireAuth()
    if (!isStaff.value && !isAdmin.value) {
      throw new Error('Staff access required')
    }
  }

  return {
    // State
    user,
    userProfile,
    userRole,
    errorMessage,
    loading,
    isInitialized,

    // Computed
    isLoggedIn,
    isAdmin,
    isStaff,
    isClient,
    hasProfile,
    userDisplayName,
    userInitials,

    // Actions
    initializeAuthStore,
    login,
    register,
    logout,
    fetchUserProfile,
    updateUserProfile,
    createUserProfile,
    clearAuthState,
    clearError,

    // Guards
    requireAuth,
    requireAdmin,
    requireStaff,

    // Legacy compatibility
    fetchUserRole: (supabaseClient: SupabaseClient, userId: string) => 
      fetchUserProfile(supabaseClient, userId)
  }
})```

### ./stores/ui.ts
```typescript
// stores/ui.ts
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useUIStore = defineStore('ui', () => {
  // State
  const sidebarOpen = ref(false)
  const theme = ref<'light' | 'dark'>('light')
  const notifications = ref<Array<{
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message: string
    timestamp: Date
    read: boolean
  }>>([])

  // Loading states for different operations
  const loadingStates = ref<Record<string, boolean>>({})

  // Modal states
  const modals = ref<Record<string, boolean>>({
    eventModal: false,
    paymentModal: false,
    confirmationModal: false,
    settingsModal: false
  })

  // Computed
  const unreadNotifications = computed(() => 
    notifications.value.filter(n => !n.read)
  )

  const unreadCount = computed(() => unreadNotifications.value.length)

  const isDark = computed(() => theme.value === 'dark')

  // Actions
  const toggleSidebar = () => {
    sidebarOpen.value = !sidebarOpen.value
  }

  const openSidebar = () => {
    sidebarOpen.value = true
  }

  const closeSidebar = () => {
    sidebarOpen.value = false
  }

  const setTheme = (newTheme: 'light' | 'dark') => {
    theme.value = newTheme
    // Persist to localStorage
    if (process.client) {
      localStorage.setItem('theme', newTheme)
    }
  }

  const toggleTheme = () => {
    setTheme(theme.value === 'light' ? 'dark' : 'light')
  }

  const addNotification = (notification: {
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message: string
  }) => {
    const id = Date.now().toString()
    notifications.value.unshift({
      id,
      ...notification,
      timestamp: new Date(),
      read: false
    })

    // Auto-remove success notifications after 5 seconds
    if (notification.type === 'success') {
      setTimeout(() => {
        removeNotification(id)
      }, 5000)
    }

    return id
  }

  const removeNotification = (id: string) => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  const markNotificationAsRead = (id: string) => {
    const notification = notifications.value.find(n => n.id === id)
    if (notification) {
      notification.read = true
    }
  }

  const markAllNotificationsAsRead = () => {
    notifications.value.forEach(n => {
      n.read = true
    })
  }

  const clearAllNotifications = () => {
    notifications.value = []
  }

  // Loading state management
  const setLoading = (key: string, loading: boolean) => {
    loadingStates.value[key] = loading
  }

  const isLoading = (key: string) => {
    return loadingStates.value[key] || false
  }

  const clearLoading = () => {
    loadingStates.value = {}
  }

  // Modal management
  const openModal = (modalName: string) => {
    modals.value[modalName] = true
  }

  const closeModal = (modalName: string) => {
    modals.value[modalName] = false
  }

  const isModalOpen = (modalName: string) => {
    return modals.value[modalName] || false
  }

  const closeAllModals = () => {
    Object.keys(modals.value).forEach(key => {
      modals.value[key] = false
    })
  }

  // Initialize theme from localStorage
  const initializeTheme = () => {
    if (process.client) {
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
      if (savedTheme) {
        theme.value = savedTheme
      }
    }
  }

  // Helper methods for common notification types
  const showSuccess = (title: string, message: string = '') => {
    return addNotification({ type: 'success', title, message })
  }

  const showError = (title: string, message: string = '') => {
    return addNotification({ type: 'error', title, message })
  }

  const showWarning = (title: string, message: string = '') => {
    return addNotification({ type: 'warning', title, message })
  }

  const showInfo = (title: string, message: string = '') => {
    return addNotification({ type: 'info', title, message })
  }

  return {
    // State
    sidebarOpen,
    theme,
    notifications,
    loadingStates,
    modals,

    // Computed
    unreadNotifications,
    unreadCount,
    isDark,

    // Actions
    toggleSidebar,
    openSidebar,
    closeSidebar,
    setTheme,
    toggleTheme,
    initializeTheme,

    // Notifications
    addNotification,
    removeNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearAllNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,

    // Loading
    setLoading,
    isLoading,
    clearLoading,

    // Modals
    openModal,
    closeModal,
    isModalOpen,
    closeAllModals
  }
})```

### ./tailwind.config.js
```typescript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './components/**/*.{vue,js,ts}',
    './pages/**/*.{vue,js,ts}',
    './app.vue',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### ./types/UserProfile.ts
```typescript
// types/UserProfile.ts
export interface UserProfile {
  id: string;
  created_at: string;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  birthdate: string | null;
  street: string | null;
  street_nr: string | null;
  zip: string | null;
  city: string | null;
  is_active: boolean;
  assigned_staff: string | null;
  category: string | null;
}```

### ./types/companyBilling.ts
```typescript
// types/companyBilling.ts

import type { User } from './index'

export interface CompanyBillingAddress {
  id: string
  created_at: string
  updated_at: string
  
  // Firmeninformationen
  company_name: string
  contact_person: string
  email: string
  phone?: string
  
  // Rechnungsadresse
  street: string
  street_number?: string
  zip: string
  city: string
  country: string
  
  // Geschäftsinformationen
  vat_number?: string
  company_register_number?: string
  
  // Status und Metadaten
  is_active: boolean
  is_verified: boolean
  notes?: string
  
  // Verknüpfung
  created_by?: string
}

export interface CompanyBillingAddressInsert {
  // Pflichtfelder für neue Adresse
  company_name: string
  contact_person: string
  email: string
  street: string
  zip: string
  city: string
  
  // Optionale Felder
  phone?: string
  street_number?: string
  country?: string
  vat_number?: string
  company_register_number?: string
  notes?: string
  created_by?: string
}

export interface CompanyBillingAddressUpdate {
  // Alle Felder optional für Updates
  company_name?: string
  contact_person?: string
  email?: string
  phone?: string
  street?: string
  street_number?: string
  zip?: string
  city?: string
  country?: string
  vat_number?: string
  company_register_number?: string
  is_active?: boolean
  is_verified?: boolean
  notes?: string
}

// Für die Component-Verwendung
export interface CompanyBillingFormData {
  companyName: string
  contactPerson: string
  email: string
  phone: string
  street: string
  streetNumber: string
  zip: string
  city: string
  country: string
  vatNumber: string
  notes: string
}

// Validation Interface
export interface CompanyBillingValidation {
  isValid: boolean
  errors: {
    companyName?: string
    contactPerson?: string
    email?: string
    street?: string
    zip?: string
    city?: string
    [key: string]: string | undefined
  }
}

// Erweiterte Payment Interface (update zu bestehenden types)
export interface PaymentWithCompanyBilling {
  id: string
  appointment_id: string
  user_id: string
  staff_id?: string
  amount_rappen: number
  admin_fee_rappen: number
  total_amount_rappen: number
  payment_method: string
  payment_status: string
  payment_provider?: string
  created_at: string
  updated_at: string
  
  // Neue Verknüpfung
  company_billing_address_id?: string
  company_billing_address?: CompanyBillingAddress
}

// User Interface erweitern (falls noch nicht vorhanden)
export interface UserWithBilling extends User {
  default_company_billing_address_id?: string
  default_company_billing_address?: CompanyBillingAddress
}

// API Response Types
export interface CreateCompanyBillingResponse {
  success: boolean
  data?: CompanyBillingAddress
  error?: string
}

export interface CompanyBillingListResponse {
  success: boolean
  data?: CompanyBillingAddress[]
  error?: string
}

// Für die Supabase View
export interface PaymentWithCompanyAddressView {
  // Payment Felder
  id: string
  appointment_id: string
  user_id: string
  staff_id?: string
  amount_rappen: number
  admin_fee_rappen: number
  total_amount_rappen: number
  payment_method: string
  payment_status: string
  created_at: string
  updated_at: string
  company_billing_address_id?: string
  
  // Company Address Felder (aus View)
  company_name?: string
  contact_person?: string
  company_email?: string
  street?: string
  street_number?: string
  zip?: string
  city?: string
  country?: string
  vat_number?: string
  formatted_address?: string
}

// Utility Types für bessere Entwicklung
export type CompanyBillingField = keyof CompanyBillingFormData
export type RequiredCompanyBillingFields = 'companyName' | 'contactPerson' | 'email' | 'street' | 'zip' | 'city'
export type OptionalCompanyBillingFields = Exclude<CompanyBillingField, RequiredCompanyBillingFields>```

### ./types/eventType.ts
```typescript
// types/eventTypes.ts
export interface EventType {
  code: string
  name: string
  emoji: string
  description?: string
  default_duration_minutes?: number
  default_color?: string
  auto_generate_title?: boolean
  price_per_minute?: number
}```

### ./types/h3.d.ts
```typescript
// types/h3.d.ts
declare global {
  // Nuxt 3 Server API Global Functions
  function defineEventHandler(handler: (event: any) => any): any
  function readBody(event: any): Promise<any>
  function createError(error: { statusCode: number; statusMessage: string }): never
  function getHeader(event: any, name: string): string | undefined
  function $fetch<T = any>(url: string, options?: any): Promise<T>
}

export {}```

### ./types/index.ts
```typescript
// types/index.ts (oder eine ähnliche Datei)
// Füge dies zu deinen bestehenden Typen hinzu

export interface Location {
  id: string; // UUID
  created_at: string; // ISO-Datum String
  staff_id: string; // UUID des zugehörigen Fahrlehrers
  name: string; // Name des Ortes, z.B. "Bahnhof Uster", "Meine Garage"
  address: string; // Vollständige Adresse des Ortes
}

// types/index.ts - Neue Datei erstellen
export interface User {
  id: string
  email: string | null  // ✅ Email kann null sein
  role: 'client' | 'staff' | 'admin'
  first_name: string | null
  last_name: string | null
  phone?: string | null
  is_active: boolean
  assigned_staff_id?: string | null
  category?: string | null
  created_at?: string
}

export interface CalendarApi {
  today(): void
  next(): void
  prev(): void
  getDate(): Date
  view: {
    currentStart: Date
  }
}

export interface DashboardState {
  showStaffSettings: boolean
  showCustomers: boolean
  showPendenzen: boolean
  showEinstellungen: boolean
  currentMonth: string
  isTodayActive: boolean
  pendingCount: number
}```

### ./types/students.ts
```typescript
// types/student.ts - Geteilte Student-Types für die gesamte Anwendung

export interface Student {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  category: string
  assigned_staff_id: string
  preferred_location_id?: string
  preferred_duration?: number 
}

export interface StudentFromDB {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  category: string | null
  assigned_staff_id: string | null
  preferred_location_id: string | null
  role: 'client' | 'staff' | 'admin'
  is_active: boolean
  created_at?: string
}

/**
 * Hilfsfunktion zur Konvertierung von DB-User zu Student
 */
export function convertDBUserToStudent(user: StudentFromDB): Student {
  return {
    id: user.id,
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    email: user.email || '',
    phone: user.phone || '',
    category: user.category || '',
    assigned_staff_id: user.assigned_staff_id || '',
    preferred_location_id: user.preferred_location_id || undefined
  }
}

/**
 * Type-Guard zur Überprüfung ob ein Objekt ein Student ist
 */
export function isStudent(obj: any): obj is Student {
  return obj && 
         typeof obj.id === 'string' &&
         typeof obj.first_name === 'string' &&
         typeof obj.last_name === 'string' &&
         typeof obj.email === 'string' &&
         typeof obj.phone === 'string' &&
         typeof obj.category === 'string' &&
         typeof obj.assigned_staff_id === 'string'
}```

### ./types/supabase.ts
```typescript
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      appointments: {
        Row: {
          created_at: string
          description: string
          duration_minutes: number
          end_time: string
          id: string
          is_paid: boolean
          location_id: string
          price_per_minute: number
          staff_id: string
          start_time: string
          status: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          duration_minutes: number
          end_time: string
          id?: string
          is_paid: boolean
          location_id: string
          price_per_minute: number
          staff_id: string
          start_time: string
          status?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          duration_minutes?: number
          end_time?: string
          id?: string
          is_paid?: boolean
          location_id?: string
          price_per_minute?: number
          staff_id?: string
          start_time?: string
          status?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: number
          name: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          name?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          name?: string | null
        }
        Relationships: []
      }
      locations: {
        Row: {
          adress: string | null
          created_at: string
          id: string
          name: string
          staff_id: string
        }
        Insert: {
          adress?: string | null
          created_at?: string
          id?: string
          name: string
          staff_id: string
        }
        Update: {
          adress?: string | null
          created_at?: string
          id?: string
          name?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          last_updated_at: string
          last_updated_by_user_id: string
          staff_note: string
          staff_rating: number
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          last_updated_at?: string
          last_updated_by_user_id: string
          staff_note?: string
          staff_rating: number
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          last_updated_at?: string
          last_updated_by_user_id?: string
          staff_note?: string
          staff_rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_categories: {
        Row: {
          category_id: number | null
          created_at: string
          id: number
          teacher_id: string
        }
        Insert: {
          category_id?: number | null
          created_at?: string
          id?: number
          teacher_id: string
        }
        Update: {
          category_id?: number | null
          created_at?: string
          id?: number
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_categories_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          assigned_staff_id: string | null
          birthdate: string | null
          category: string | null
          city: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          lernfahrausweis_url: string | null
          payment_provider_customer_id: string | null
          phone: string
          role: string
          street: string | null
          street_nr: string | null
          zip: string | null
        }
        Insert: {
          assigned_staff_id?: string | null
          birthdate?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          is_active?: boolean
          last_name: string
          lernfahrausweis_url?: string | null
          payment_provider_customer_id?: string | null
          phone: string
          role?: string
          street?: string | null
          street_nr?: string | null
          zip?: string | null
        }
        Update: {
          assigned_staff_id?: string | null
          birthdate?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean
          last_name?: string
          lernfahrausweis_url?: string | null
          payment_provider_customer_id?: string | null
          phone?: string
          role?: string
          street?: string | null
          street_nr?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { user_id: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
```

### ./types/wallee.ts
```typescript
// types/wallee.ts
export interface WalleeTransactionResult {
  success: boolean
  error: string
  transactionId?: string
  paymentUrl?: string
}

export interface WalleeConnectionResult {
  success: boolean
  error: string
  spaceId?: string
  connected?: boolean
}

export interface WalleeService {
  createTransaction: () => Promise<WalleeTransactionResult>
  testSpaceConnection: () => Promise<WalleeConnectionResult>
}

// Erweitere die Nuxt App Types
declare module '#app' {
  interface NuxtApp {
    $wallee: WalleeService
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $wallee: WalleeService
  }
}

export interface WalleeConfig {
  spaceId: number
  userId: number
  apiSecret: string
  environment: 'test' | 'live'
}

export interface PaymentData {
  id: string
  category: string
  totalAmount: number
  userId: string
  userEmail: string
  firstName: string
  lastName: string
  duration: number
}

export interface WalleeResponse {
  success: boolean
  error?: string
  statusCode?: number
  transactionId?: string
  paymentPageUrl?: string
}```

### ./utils/dateUtils.ts
```typescript
// utils/dateUtils.ts

// Beispiel für eine Funktion, die du bereits hast und korrekt exportieren könntest
export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  // Beispielformat: 09.07.2025
  return new Intl.DateTimeFormat('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

// Beispiel für formatTime
export const formatTime = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  // Beispielformat: 06:33
  return new Intl.DateTimeFormat('de-CH', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
};

// Hier müssen formatDateTime, formatDateShort und formatTimeShort hinzugefügt werden,
// falls sie noch nicht vorhanden sind, und mit 'export' versehen werden.

export const formatDateTime = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  // Beispielformat: 09.07.2025 06:33
  return new Intl.DateTimeFormat('de-CH', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false 
  }).format(date);
};

// Diese beiden sind entscheidend für deinen Fehler:
export const formatDateShort = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  // Beispielformat: 09.07.2025
  return new Intl.DateTimeFormat('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

export const formatTimeShort = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  // Beispielformat: 06:33
  return new Intl.DateTimeFormat('de-CH', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
};```

### ./utils/supabase.ts
```typescript
// utils/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

export const getSupabase = (): SupabaseClient => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      'https://unyjaetebnaexaflpyoc.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVueWphZXRlYm5hZXhhZmxweW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzOTc0NjAsImV4cCI6MjA2NTk3MzQ2MH0.GH3W1FzpogOG-iTWNv8ckt-TkqboCiB9RYGFlGUzLnU'
    )
  }
  return supabaseInstance
}

export default getSupabase```

### ./utils/useFeatureFlags.ts
```typescript
// utils/useFeatureFlags.ts
export const FEATURE_FLAGS = {
  // Debug & Development
  DEBUG_MODE: process.env.NODE_ENV === 'development',
  WALLEE_DEBUG: process.env.NODE_ENV === 'development',
  
  // Experimentelle Features
  AUTO_REFRESH_PENDING: false, 
  ENHANCED_LOGGING: false,
  
  // Für später wenn mehr Features da sind
  NEW_EVALUATION_UI: false,
  ADVANCED_CALENDAR: false
} as const

// Helper function
export const useFeatureFlags = () => {
  const isEnabled = (flag: keyof typeof FEATURE_FLAGS) => {
    return FEATURE_FLAGS[flag]
  }
  
  const getAllFlags = () => {
    return FEATURE_FLAGS
  }
  
  return { 
    isEnabled, 
    FEATURE_FLAGS: getAllFlags() 
  }
}```

### ./utils/walleeService.ts
```typescript
// utils/walleeService.ts
interface WalleeConfig {
  spaceId?: string
  userId?: string
  apiSecret?: string
}

interface WalleeTransactionResult {
  success: boolean
  error: string | null
  transactionId?: string
  paymentUrl?: string
}

interface WalleeConnectionResult {
  success: boolean
  error: string | null
  connected?: boolean
  spaceId?: string
}

export class WalleeService {
  private config: WalleeConfig

  constructor(config: WalleeConfig) {
    this.config = config
  }

  async createTransaction(amount: number, currency: string = 'CHF'): Promise<WalleeTransactionResult> {
    try {
      console.log('🔄 Wallee: Creating transaction...', { amount, currency })
      
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'Wallee not configured properly'
        }
      }

      // TODO: Implement real Wallee API call
      // For now, return mock data
      await this.delay(1000) // Simulate API call
      
      return {
        success: true,
        transactionId: `txn_${Date.now()}`,
        paymentUrl: `https://checkout.wallee.com/payment/${Date.now()}`,
        error: null
      }
    } catch (error: any) {
      console.error('❌ Wallee Transaction Error:', error)
      return {
        success: false,
        error: error.message || 'Transaction creation failed'
      }
    }
  }

  async testConnection(): Promise<WalleeConnectionResult> {
    try {
      console.log('🔄 Testing Wallee connection...')
      
      if (!this.isConfigured()) {
        return {
          success: false,
          connected: false,
          error: 'Wallee not configured properly'
        }
      }

      // TODO: Implement real connection test
      await this.delay(500) // Simulate API call
      
      return {
        success: true,
        connected: true,
        spaceId: this.config.spaceId,
        error: null
      }
    } catch (error: any) {
      console.error('❌ Wallee Connection Error:', error)
      return {
        success: false,
        connected: false,
        error: error.message || 'Connection test failed'
      }
    }
  }

  private isConfigured(): boolean {
    return !!(this.config.spaceId && this.config.userId)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Static factory method für einfache Erstellung
  static create(config: WalleeConfig): WalleeService {
    return new WalleeService(config)
  }
}```

