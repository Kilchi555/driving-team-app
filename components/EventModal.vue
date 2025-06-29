<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" @click="handleBackdropClick">
    <div class="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto" @click.stop>
      <!-- Header -->
      <div class="sticky top-0 bg-white border-b px-6 py-4 rounded-t-lg">
        <div class="flex justify-between items-center">
          <h3 class="text-xl font-semibold text-gray-900">
            {{ modalTitle }}
          </h3>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 text-2xl">
            ✕
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="px-6 py-6 space-y-6">
        <!-- Terminkategorie -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Kategorie *
          </label>
          <select 
            v-model="formData.category" 
            @change="handleCategoryChange"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            required
          >
            <option value="">Kategorie wählen...</option>
            <option 
              v-for="cat in availableCategories" 
              :key="cat.value" 
              :value="cat.value"
            >
              {{ cat.label }}
            </option>
          </select>
        </div>

        <!-- Titel -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Titel *
          </label>
          <input 
            v-model="formData.title"
            type="text" 
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="z.B. Grundschulung Stadtverkehr"
            required
          />
        </div>

        <!-- Datum & Zeit -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Startdatum *
            </label>
            <input 
              v-model="formData.startDate"
              type="date" 
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Startzeit *
            </label>
            <input 
              v-model="formData.startTime"
              type="time" 
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>
        </div>

        <!-- Dauer -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Dauer
          </label>
          <select 
            v-model="formData.duration" 
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="45">45 Minuten (1 Lektion)</option>
            <option value="90">90 Minuten (2 Lektionen)</option>
            <option value="135">135 Minuten (3 Lektionen)</option>
            <option value="60">60 Minuten</option>
            <option value="30">30 Minuten</option>
          </select>
        </div>

        <!-- Fahrlehrer -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Fahrlehrer *
          </label>
          <select 
            v-model="formData.instructor" 
            @change="handleInstructorChange"
            :disabled="!canEditInstructor"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
            required
          >
            <option value="">Fahrlehrer wählen...</option>
            <option 
              v-for="instructor in availableInstructors" 
              :key="instructor.value" 
              :value="instructor.value"
            >
              {{ instructor.label }}
            </option>
          </select>
          <p v-if="isStudentBooking && props.currentUser?.assigned_staff" class="text-xs text-gray-500 mt-1">
            Ihr zugewiesener Fahrlehrer: {{ instructorData[props.currentUser.assigned_staff]?.name }}
          </p>
        </div>

        <!-- Schüler (nur für Fahrlehrer/Admin sichtbar) -->
        <div v-if="props.currentUser?.role !== 'student'">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Schüler {{ isStudentBooking ? '' : '*' }}
          </label>
          <select 
            v-model="formData.student" 
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="">Schüler wählen...</option>
            <!-- Diese würden aus der Datenbank kommen -->
            <option value="anna_mueller">Anna Müller</option>
            <option value="tom_weber">Tom Weber</option>
            <option value="lisa_schneider">Lisa Schneider</option>
          </select>
        </div>

        <!-- Ort -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Treffpunkt *
            <span v-if="canEditLocations" class="text-xs text-blue-600">(bearbeitbar)</span>
          </label>
          <select 
            v-model="formData.location" 
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            required
          >
            <option value="">Ort wählen...</option>
            <option v-for="location in availableLocations" :key="location" :value="location">
              {{ location }}
            </option>
          </select>
          
          <!-- Location editing for instructors -->
          <div v-if="canEditLocations" class="mt-2">
            <input 
              v-model="newLocation"
              type="text" 
              placeholder="Neuen Ort hinzufügen..."
              class="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              @keyup.enter="addNewLocation"
            />
            <button 
              @click="addNewLocation"
              type="button"
              class="mt-1 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
            >
              + Ort hinzufügen
            </button>
          </div>
        </div>

        <!-- Preis -->
        <div v-if="formData.price > 0" class="bg-green-50 border border-green-200 rounded-lg p-4">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-green-800">Preis pro Lektion:</span>
            <span class="text-lg font-bold text-green-900">CHF {{ formData.price }}</span>
          </div>
          <div v-if="totalLessons > 1" class="text-sm text-green-700 mt-1">
            Total {{ totalLessons }} Lektionen: CHF {{ totalPrice }}
          </div>
        </div>

        <!-- Notizen -->
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Schüler-Notiz (sichtbar für Schüler)
            </label>
            <textarea 
              v-model="formData.clientNote"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Notizen für den Schüler..."
            ></textarea>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Fahrlehrer-Notiz (nur für Fahrlehrer sichtbar)
            </label>
            <textarea 
              v-model="formData.staffNote"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Interne Notizen..."
            ></textarea>
          </div>
        </div>

        <!-- Wiederholung (für zukünftige Erweiterung) -->
        <div v-if="false" class="border-t pt-4">
          <label class="flex items-center">
            <input 
              v-model="formData.isRecurring" 
              type="checkbox" 
              class="rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span class="ml-2 text-sm text-gray-700">Termin wiederholen</span>
          </label>
        </div>
      </div>

      <!-- Footer -->
      <div class="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-lg border-t">
        <div class="flex justify-between">
          <div>
            <button 
              v-if="mode === 'edit'" 
              @click="handleDelete"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
            >
              🗑️ Löschen
            </button>
          </div>
          <div class="flex space-x-3">
            <button 
              @click="$emit('close')" 
              class="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium"
            >
              Abbrechen
            </button>
            <button 
              @click="handleSave"
              :disabled="!isFormValid"
              class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {{ mode === 'create' ? '💾 Erstellen' : '💾 Speichern' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface EventData {
  id?: string
  title: string
  category: string
  startDate: string
  startTime: string
  duration: number
  instructor: string
  student: string
  location: string
  price: number
  clientNote: string
  staffNote: string
  isRecurring: boolean
}

interface Props {
  isVisible: boolean
  eventData: any
  mode: 'view' | 'edit' | 'create'
  currentUser?: any
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  'save-event': [eventData: any]
  'delete-event': [eventData: any]
}>()

// Form data
const formData = ref<EventData>({
  title: '',
  category: '',
  startDate: '',
  startTime: '',
  duration: 45,
  instructor: '',
  student: '',
  location: '',
  price: 0,
  clientNote: '',
  staffNote: '',
  isRecurring: false
})

const newLocation = ref('')

// Category-Instructor mapping
const categoryInstructors: Record<string, string[]> = {
  'A': ['samir_khedhri', 'peter_thoma'],
  'B': ['marc_hermann', 'nicole_stohr', 'peter_thoma'], 
  'BE': ['marc_hermann', 'nicole_stohr'],
  'C': ['peter_thoma'],
  'CE': ['peter_thoma'],
  'D': ['samir_khedhri'],
  'BPT': ['marc_hermann', 'nicole_stohr'],
  'Motorboot': ['samir_khedhri']
}

// Category pricing
const categoryPricing: Record<string, number> = {
  'A': 90,
  'B': 85,
  'BE': 95,
  'C': 120,
  'CE': 130,
  'D': 140,
  'BPT': 85,
  'Motorboot': 100,
  'theory': 0,
  'exam': 120,
  'consultation': 0,
  'internal': 0
}

// All instructors data
const instructorData: Record<string, { name: string; locations: string[] }> = {
  marc_hermann: {
    name: 'Marc Hermann',
    locations: ['Bahnhof Zürich', 'Limmatplatz', 'Hauptbahnhof']
  },
  nicole_stohr: {
    name: 'Nicole Stohr', 
    locations: ['Driving Team Büro', 'Stadelhofen', 'Oerlikon']
  },
  peter_thoma: {
    name: 'Peter Thoma',
    locations: ['Verkehrsübungsplatz', 'Albisriederplatz']
  },
  samir_khedhri: {
    name: 'Samir Khedhri',
    locations: ['Bahnhof Zürich', 'Wiedikon', 'Altstetten']
  }
}

// Computed
const modalTitle = computed(() => {
  if (props.mode === 'create') return '🆕 Neuer Termin'
  if (props.mode === 'edit') return '✏️ Termin bearbeiten'
  return '👁️ Termin anzeigen'
})

// Computed - based on user permissions
const availableCategories = computed(() => {
  if (props.currentUser?.role === 'instructor' || props.currentUser?.role === 'admin') {
    // Instructors/Admins see all categories
    return [
      { value: 'A', label: 'Fahrstunde A (CHF 90)', price: 90 },
      { value: 'B', label: 'Fahrstunde B (CHF 85)', price: 85 },
      { value: 'BE', label: 'Fahrstunde BE (CHF 95)', price: 95 },
      { value: 'C', label: 'Fahrstunde C (CHF 120)', price: 120 },
      { value: 'CE', label: 'Fahrstunde CE (CHF 130)', price: 130 },
      { value: 'D', label: 'Fahrstunde D (CHF 140)', price: 140 },
      { value: 'BPT', label: 'BPT (CHF 85)', price: 85 },
      { value: 'Motorboot', label: 'Motorboot (CHF 100)', price: 100 },
      { value: 'theory', label: 'Theoriestunde (kostenlos)', price: 0 },
      { value: 'exam', label: 'Prüfung (CHF 120)', price: 120 },
      { value: 'consultation', label: 'Beratung (kostenlos)', price: 0 },
      { value: 'internal', label: 'Interne Sitzung', price: 0 }
    ]
  } else {
    // Students only see their registered categories + theory/exam
    const userCategories = props.currentUser?.category ? props.currentUser.category.split(',') : []
    const categories: Array<{ value: string; label: string; price: number }> = []
    
    userCategories.forEach((cat: string) => {
      const price = categoryPricing[cat.trim()] || 0
      categories.push({
        value: cat.trim(),
        label: `Fahrstunde ${cat.trim()} (CHF ${price})`,
        price: price
      })
    })
    
    // Always add theory, exam, consultation for students
    categories.push(
      { value: 'theory', label: 'Theoriestunde (kostenlos)', price: 0 },
      { value: 'exam', label: 'Prüfung (CHF 120)', price: 120 },
      { value: 'consultation', label: 'Beratung (kostenlos)', price: 0 }
    )
    
    return categories
  }
})

const availableInstructors = computed(() => {
  if (props.currentUser?.role === 'instructor') {
    // Instructors only see themselves
    const instructorId = props.currentUser.id
    return instructorData[instructorId] ? [{
      value: instructorId,
      label: instructorData[instructorId].name
    }] : []
  } else if (props.currentUser?.role === 'admin') {
    // Admins see all instructors
    return Object.entries(instructorData).map(([id, data]) => ({
      value: id,
      label: data.name
    }))
  } else {
    // Students see their assigned staff or category-based instructors
    if (props.currentUser?.assigned_staff) {
      const staffData = instructorData[props.currentUser.assigned_staff]
      return staffData ? [{
        value: props.currentUser.assigned_staff,
        label: staffData.name
      }] : []
    } else if (formData.value.category && categoryInstructors[formData.value.category]) {
      return categoryInstructors[formData.value.category].map((id: string) => ({
        value: id,
        label: instructorData[id]?.name || id
      }))
    }
    return []
  }
})

const availableLocations = computed(() => {
  if (props.currentUser?.role === 'instructor' && formData.value.instructor === props.currentUser.id) {
    // Instructors can edit their own locations
    return instructorData[formData.value.instructor]?.locations || []
  } else {
    // Everyone else sees predefined locations
    return instructorData[formData.value.instructor]?.locations || []
  }
})

const canEditInstructor = computed(() => {
  return props.currentUser?.role === 'admin' || 
         (props.currentUser?.role === 'instructor' && props.mode === 'create')
})

const canEditLocations = computed(() => {
  return props.currentUser?.role === 'instructor' && 
         formData.value.instructor === props.currentUser.id
})

const isStudentBooking = computed(() => {
  return props.currentUser?.role === 'student'
})

const totalLessons = computed(() => {
  return Math.ceil((formData.value.duration || 45) / 45)
})

const totalPrice = computed(() => {
  return (formData.value.price || 0) * totalLessons.value
})

const isFormValid = computed(() => {
  const basicValidation = formData.value.title && 
         formData.value.category && 
         formData.value.startDate && 
         formData.value.startTime && 
         formData.value.instructor && 
         formData.value.location

  // For students booking themselves, no student field needed
  if (props.currentUser?.role === 'student') {
    return basicValidation
  }
  
  // For instructors/admins, student field required for driving lessons
  const needsStudent = ['A', 'B', 'BE', 'C', 'CE', 'D', 'BPT', 'Motorboot', 'theory', 'exam'].includes(formData.value.category)
  return basicValidation && (!needsStudent || formData.value.student)
})

// Methods
const handleCategoryChange = () => {
  const selectedCategory = availableCategories.value.find(cat => cat.value === formData.value.category)
  formData.value.price = selectedCategory?.price || 0
  
  // Auto-assign instructor for students
  if (props.currentUser?.role === 'student') {
    if (props.currentUser.assigned_staff) {
      formData.value.instructor = props.currentUser.assigned_staff
    } else if (categoryInstructors[formData.value.category]?.length === 1) {
      formData.value.instructor = categoryInstructors[formData.value.category][0]
    }
  }
  
  // Auto-generate title
  if (!formData.value.title && selectedCategory) {
    formData.value.title = selectedCategory.label.split(' (')[0] // Remove price part
  }
}

const handleInstructorChange = () => {
  // Reset location when instructor changes
  formData.value.location = ''
}

const addNewLocation = () => {
  if (newLocation.value.trim() && formData.value.instructor) {
    // Here you would save to database
    // For now, just add to local array
    instructorData[formData.value.instructor].locations.push(newLocation.value.trim())
    formData.value.location = newLocation.value.trim()
    newLocation.value = ''
    
    // TODO: Save to Supabase
    console.log('New location added:', formData.value.location)
  }
}

const handleSave = () => {
  if (!isFormValid.value) return

  // Convert form data to event format
  const startDateTime = new Date(`${formData.value.startDate}T${formData.value.startTime}`)
  const endDateTime = new Date(startDateTime.getTime() + formData.value.duration * 60000)

  const eventData = {
    id: props.eventData?.id || undefined,
    title: formData.value.title,
    start: startDateTime.toISOString(),
    end: endDateTime.toISOString(),
    allDay: false,
    extendedProps: {
      category: formData.value.category,
      instructor: formData.value.instructor,
      student: formData.value.student,
      location: formData.value.location,
      price: formData.value.price,
      client_note: formData.value.clientNote,
      staff_note: formData.value.staffNote
    }
  }

  emit('save-event', eventData)
}

const handleDelete = () => {
  if (confirm('Sind Sie sicher, dass Sie diesen Termin löschen möchten?')) {
    emit('delete-event', props.eventData)
  }
}

const handleBackdropClick = () => {
  emit('close')
}

// Load event data when modal opens
watch(() => props.eventData, (newData) => {
  if (newData && props.isVisible) {
    const startDate = new Date(newData.start)
    const endDate = newData.end ? new Date(newData.end) : new Date(startDate.getTime() + 45 * 60000)
    const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000)
    
    formData.value = {
      title: newData.title || '',
      category: newData.extendedProps?.category || '',
      startDate: startDate.toISOString().split('T')[0],
      startTime: startDate.toTimeString().slice(0, 5),
      duration: durationMinutes || 45,
      instructor: newData.extendedProps?.instructor || '',
      student: newData.extendedProps?.student || '',
      location: newData.extendedProps?.location || '',
      price: newData.extendedProps?.price || 0,
      clientNote: newData.extendedProps?.client_note || '',
      staffNote: newData.extendedProps?.staff_note || '',
      isRecurring: false
    }
  }
}, { immediate: true })

// Reset form when modal closes
watch(() => props.isVisible, (isVisible) => {
  if (!isVisible) {
    // Reset form after a delay to avoid visual glitch
    setTimeout(() => {
      formData.value = {
        title: '',
        category: '',
        startDate: '',
        startTime: '',
        duration: 45,
        instructor: '',
        student: '',
        location: '',
        price: 0,
        clientNote: '',
        staffNote: '',
        isRecurring: false
      }
    }, 300)
  }
})
</script>