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

              <!-- Email (Optional) -->
              <div class="md:col-span-2">
                <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
                  E-Mail Adresse <span class="text-gray-400">(optional)</span>
                </label>
                <input
                  id="email"
                  v-model="form.email"
                  type="email"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  :class="{ 'border-red-300': errors.email }"
                  placeholder="max.mustermann@example.com"
                >
                <p v-if="errors.email" class="text-red-600 text-xs mt-1">{{ errors.email }}</p>
              </div>

              <!-- Phone -->
              <div>
                <label for="phone" class="block text-sm font-medium text-gray-700 mb-1">
                  Telefonnummer *
                </label>
                <input
                  id="phone"
                  v-model="form.phone"
                  type="tel"
                  required
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  :class="{ 'border-red-300': errors.phone }"
                  placeholder="+41 79 123 45 67"
                >
                <p v-if="errors.phone" class="text-red-600 text-xs mt-1">{{ errors.phone }}</p>
              </div>

              <!-- Birthdate (Optional) -->
              <div>
                <label for="birthdate" class="block text-sm font-medium text-gray-700 mb-1">
                  Geburtsdatum <span class="text-gray-400">(optional)</span>
                </label>
                <input
                  id="birthdate"
                  v-model="form.birthdate"
                  type="date"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
              </div>

              <!-- Category (Optional) -->
              <div>
                <label for="category" class="block text-sm font-medium text-gray-700 mb-1">
                  Führerausweis-Kategorie <span class="text-gray-400">(optional)</span>
                </label>
                <select
                  id="category"
                  v-model="form.category"
                  :disabled="isLoadingCategories"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  :class="{ 'border-red-300': errors.category }"
                >
                  <option value="">
                    {{ isLoadingCategories ? 'Lade Kategorien...' : 'Kategorie wählen' }}
                  </option>
                  <option 
                    v-for="category in availableCategories" 
                    :key="category.code" 
                    :value="category.code"
                  >
                    {{ category.name }}
                  </option>
                </select>
                <p v-if="errors.category" class="text-red-600 text-xs mt-1">{{ errors.category }}</p>
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

          <!-- Address Information (Optional) -->
          <div>
            <h3 class="text-lg font-medium text-gray-900 mb-4">
              Adresse <span class="text-sm font-normal text-gray-500">(optional)</span>
            </h3>
            
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <!-- Street (Optional) -->
              <div class="md:col-span-2">
                <label for="street" class="block text-sm font-medium text-gray-700 mb-1">
                  Strasse <span class="text-gray-400">(optional)</span>
                </label>
                <input
                  id="street"
                  v-model="form.street"
                  type="text"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  :class="{ 'border-red-300': errors.street }"
                  placeholder="Musterstrasse"
                >
                <p v-if="errors.street" class="text-red-600 text-xs mt-1">{{ errors.street }}</p>
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
                  :class="{ 'border-red-300': errors.street_nr }"
                  placeholder="123"
                >
                <p v-if="errors.street_nr" class="text-red-600 text-xs mt-1">{{ errors.street_nr }}</p>
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
                  :class="{ 'border-red-300': errors.zip }"
                  placeholder="8000"
                >
                <p v-if="errors.zip" class="text-red-600 text-xs mt-1">{{ errors.zip }}</p>
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
                  :class="{ 'border-red-300': errors.city }"
                  placeholder="Zürich"
                >
                <p v-if="errors.city" class="text-red-600 text-xs mt-1">{{ errors.city }}</p>
              </div>
              <p class="text-sm text-gray-600">
                * Pflichtfelder
              </p>
            </div>
          </div>

        </div>

        <!-- Footer - Sticky -->
        <div class="sticky bottom-0 flex items-center justify-between p-6 border-t bg-white shadow-lg">
          <div class="flex gap-4">
            <button
              type="button"
              @click="$emit('close')"
              class="px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              :disabled="isSubmitting || !isFormValid"
              :class="[
                'px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2',
                isFormValid && !isSubmitting
                  ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-300 shadow-md hover:shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              ]"
            >
              <span v-if="isSubmitting" class="flex items-center gap-2">
                <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Speichert...
              </span>
              <span v-else>
                Speichern
              </span>
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

// Composables
const { addStudent } = useStudents()

// State
const isSubmitting = ref(false)
const staffMembers = ref<any[]>([])
const availableCategories = ref<any[]>([])
const isLoadingCategories = ref(false)

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
  assigned_staff_id: ''
})

// Form Validation
const errors = ref<Record<string, string>>({})

const isFormValid = computed(() => {
  return form.value.first_name.trim() && 
         form.value.last_name.trim() && 
         form.value.phone.trim() &&
         form.value.phone.trim().length >= 12
})

// Methods
const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const formatPhoneNumber = (phone: string) => {
  if (!phone) return ''
  
  // Entferne alle nicht-numerischen Zeichen außer +
  let cleaned = phone.replace(/[^\d+]/g, '')
  
  // Wenn mit 0 beginnt, ersetze durch +41
  if (cleaned.startsWith('0')) {
    cleaned = '+41' + cleaned.substring(1)
  }
  
  // Wenn mit 41 beginnt, füge + hinzu
  if (cleaned.startsWith('41') && !cleaned.startsWith('+41')) {
    cleaned = '+' + cleaned
  }
  
  // Wenn weder + noch 0 noch 41, füge +41 hinzu
  if (!cleaned.startsWith('+') && !cleaned.startsWith('0') && !cleaned.startsWith('41')) {
    cleaned = '+41' + cleaned
  }
  
  return cleaned
}

const validateForm = () => {
  errors.value = {}

  if (!form.value.first_name.trim()) {
    errors.value.first_name = 'Vorname ist erforderlich'
  }

  if (!form.value.last_name.trim()) {
    errors.value.last_name = 'Nachname ist erforderlich'
  }

  // ✅ Email ist jetzt optional - wird vom Schüler ergänzt
  if (form.value.email && !isValidEmail(form.value.email)) {
    errors.value.email = 'Ungültige E-Mail-Adresse'
  }

  if (!form.value.phone.trim()) {
    errors.value.phone = 'Telefonnummer ist erforderlich'
  }

  // ✅ Alle anderen Felder sind jetzt optional - Schüler ergänzt sie via Onboarding-Link

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

const loadCategories = async () => {
  if (!props.currentUser?.id) return

  isLoadingCategories.value = true
  try {
    const supabase = getSupabase()
    
    // Get user's tenant_id
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', props.currentUser.id)
      .single()

    if (userError || !userProfile?.tenant_id) {
      console.error('Could not get tenant_id:', userError)
      return
    }

    // Load categories for this tenant
    const { data, error } = await supabase
      .from('categories')
      .select('code, name, is_active')
      .eq('tenant_id', userProfile.tenant_id)
      .eq('is_active', true)
      .order('code')

    if (error) throw error
    availableCategories.value = data || []

  } catch (error) {
    console.error('Fehler beim Laden der Kategorien:', error)
    // Fallback categories
    availableCategories.value = [
      { code: 'B', name: 'B - Auto' },
      { code: 'A1', name: 'A1 - Motorrad 125cc' },
      { code: 'A', name: 'A - Motorrad' },
      { code: 'BE', name: 'BE - Anhänger' },
      { code: 'C', name: 'C - LKW' },
      { code: 'C1', name: 'C1 - LKW klein' },
      { code: 'CE', name: 'CE - LKW mit Anhänger' }
    ]
  } finally {
    isLoadingCategories.value = false
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
    
    // Success feedback
    console.log('Schüler erfolgreich hinzugefügt:', newStudent)
    
    // ✅ NEUER WORKFLOW: SMS mit Onboarding-Link wird versendet
    alert(`Schüler erfolgreich erstellt!\n\nEine SMS mit einem Onboarding-Link wurde an ${form.value.phone} gesendet.\n\nDer Schüler kann über diesen Link:\n- Sein Passwort setzen\n- Email-Adresse ergänzen\n- Adresse & weitere Daten ausfüllen\n- Ausweis hochladen`)
    
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
  loadCategories()
})

// Watchers
watch(() => props.show, (newValue) => {
  if (newValue) {
    resetForm()
    loadStaffMembers()
    loadCategories()
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

watch(() => form.value.phone, () => {
  if (errors.value.phone && form.value.phone.trim()) {
    delete errors.value.phone
  }
})

watch(() => form.value.category, () => {
  if (errors.value.category && form.value.category.trim()) {
    delete errors.value.category
  }
})

watch(() => form.value.street, () => {
  if (errors.value.street && form.value.street.trim()) {
    delete errors.value.street
  }
})

watch(() => form.value.street_nr, () => {
  if (errors.value.street_nr && form.value.street_nr.trim()) {
    delete errors.value.street_nr
  }
})

watch(() => form.value.zip, () => {
  if (errors.value.zip && form.value.zip.trim()) {
    delete errors.value.zip
  }
})

watch(() => form.value.city, () => {
  if (errors.value.city && form.value.city.trim()) {
    delete errors.value.city
  }
})

// Phone number formatting watcher
watch(() => form.value.phone, (newPhone) => {
  if (newPhone) {
    const formatted = formatPhoneNumber(newPhone)
    if (formatted !== newPhone) {
      form.value.phone = formatted
    }
  }
})
</script>