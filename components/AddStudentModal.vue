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
              <!-- Lernfahrausweis Nummer -->
              <div>
                <label for="lernfahrausweis" class="block text-sm font-medium text-gray-700 mb-1">
                  Lernfahrausweis-Nummer
                </label>
                <input
                  id="lernfahrausweis"
                  v-model="form.lernfahrausweis_nr"
                  type="text"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="z.B. L-123456789"
                >
                <p class="text-xs text-gray-500 mt-1">
                  Die Nummer des Lernfahrausweises. Dokumente können später hochgeladen werden.
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
                  <option value="online">Online (Karte/TWINT)</option>
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
  lernfahrausweis_nr: '',
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
    lernfahrausweis_nr: '',
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
</script>