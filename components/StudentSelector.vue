<template>
  <div class="student-selector">
    <!-- 🆕 Toggle nur anzeigen wenn kein Student ausgewählt -->
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
    
    <!-- Existing search input -->
    <div class="relative">
      <!-- ... existing code ... -->
    </div>
  </div>
  <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
    <div class="flex justify-between items-center mb-3">
      <label class="block text-sm font-semibold text-gray-900">
        🎓 Fahrschüler auswählen
      </label>
      <button 
        @click="$emit('switch-to-other')" 
        class="text-xs text-blue-600 font-bold hover:text-blue-800 border-solid border-blue-700"
      >
        Andere Terminart
      </button>
    </div>
    
    <!-- Schüler Suche/Dropdown -->
    <div class="relative">
      <input
        v-model="searchQuery"
        @input="filterStudents"
        @focus="showDropdown = true"
        @blur="hideDropdownDelayed"
        type="text"
        placeholder="Schüler suchen (Name, E-Mail oder Telefon)..."
        autocomplete="off"
        class="w-full p-3 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      
      <!-- Dropdown mit Schülern -->
      <div 
        v-if="showDropdown && filteredStudents.length > 0" 
        class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto"
      >
        <div 
          v-for="student in filteredStudents" 
          :key="student.id"
          @mousedown="selectStudent(student)"
          class="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
        >
          <div class="font-semibold text-gray-900">
            {{ student.first_name }} {{ student.last_name }}
          </div>
          <div class="text-sm text-gray-500">
            {{ student.phone }} • Kat. {{ student.category }}
          </div>
        </div>
      </div>
    </div>

    <!-- Ausgewählter Schüler Anzeige -->
    <div v-if="selectedStudent" class="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
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

    <!-- Loading State -->
    <div v-if="isLoading" class="mt-3 text-center py-4">
      <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
      <p class="text-sm text-gray-600">Schüler werden geladen...</p>
    </div>

    <!-- No Students State -->
    <div v-if="!isLoading && availableStudents.length === 0" class="mt-3 text-center py-4 text-gray-500">
      <span class="text-3xl mb-2 block">👨‍🎓</span>
      <p class="text-sm">Keine Schüler verfügbar</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { getSupabase } from '~/utils/supabase'

// Types
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
  showAllStudents?: boolean // 🆕 Neue Prop
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  disabled: false,
  placeholder: 'Schüler suchen (Name, E-Mail oder Telefon)...',
  autoLoad: true,
  showAllStudents: false // 🆕 Standard: nur eigene Schüler
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
const showDropdown = ref(false)
const availableStudents = ref<Student[]>([])
const filteredStudents = ref<Student[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const showAllStudentsLocal = ref(props.showAllStudents)


// Computed
const selectedStudent = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Methods
const loadStudents = async (editStudentId?: string | null) => {
  console.log('🔄 Loading students...', { 
    showAll: showAllStudentsLocal.value,
    editMode: !!editStudentId,
    editStudentId: editStudentId,
    currentUserId: props.currentUser?.id,
    currentUserRole: props.currentUser?.role
  })
  
  if (isLoading.value) return
  isLoading.value = true
  error.value = null
  
  try {
    console.log('📚 StudentSelector: Loading students...')
    const supabase = getSupabase()
    let query = supabase
      .from('users')
      .select('id, first_name, last_name, email, phone, category, assigned_staff_id, preferred_location_id')
      .eq('role', 'client')
      .eq('is_active', true)
      .order('first_name')

    // Role-based filtering - NUR wenn Toggle AUS ist UND kein Edit-Modus
        if (editStudentId && props.currentUser?.role === 'staff') {
        // Edit-Modus hat PRIORITÄT
        console.log('✏️ Edit mode: Loading own students + specific student:', editStudentId)
        query = query.or(`assigned_staff_id.eq.${props.currentUser.id},id.eq.${editStudentId}`)
        } else if (props.currentUser?.role === 'staff' && !showAllStudentsLocal.value) {
        // Normale Filterung nur wenn KEIN Edit-Modus
        console.log('🔒 Filtering for staff ID:', props.currentUser.id)
        query = query.eq('assigned_staff_id', props.currentUser.id)
        } else {
        console.log('🌍 Loading ALL students')
        }

    console.log('🚀 Executing query...')
    const { data, error: fetchError } = await query
    
    console.log('📊 Query result:', {
      dataCount: data?.length || 0,
      hasError: !!fetchError,
      foundTargetStudent: data?.find(s => s.id === editStudentId),
      allIds: data?.map(s => s.id) || []
    })

    if (fetchError) throw fetchError

    availableStudents.value = data || []
    filteredStudents.value = data || []
    console.log('✅ StudentSelector: Loaded', availableStudents.value.length, 'students')
  } catch (err: any) {
    console.error('❌ StudentSelector: Error loading students:', err)
    error.value = err.message || 'Fehler beim Laden der Schüler'
  } finally {
    isLoading.value = false
  }
}

const filterStudents = () => {
  const query = searchQuery.value.toLowerCase()
  
  if (!query) {
    filteredStudents.value = availableStudents.value
  } else {
    filteredStudents.value = availableStudents.value.filter(student =>
      student.first_name?.toLowerCase().includes(query) ||
      student.last_name?.toLowerCase().includes(query) ||
      student.email?.toLowerCase().includes(query) ||
      student.phone?.includes(query)
    )
  }
  
  showDropdown.value = true
}

const selectStudent = (student: Student) => {
  selectedStudent.value = student
  searchQuery.value = `${student.first_name} ${student.last_name}`
  showDropdown.value = false
  
  console.log('✅ StudentSelector: Student selected:', student.first_name, student.last_name)
  emit('student-selected', student)
}

const clearStudent = () => {
  selectedStudent.value = null
  searchQuery.value = ''
  showDropdown.value = false
  
  console.log('🗑️ StudentSelector: Student cleared')
  emit('student-cleared')
}

const hideDropdownDelayed = () => {
  setTimeout(() => {
    showDropdown.value = false
  }, 200)
}

// Watchers
watch(() => searchQuery.value, () => {
  filterStudents()
})

watch(() => availableStudents.value, (newStudents) => {
  if (newStudents.length > 0) {
    filteredStudents.value = newStudents
  }
}, { immediate: true })

watch(showAllStudentsLocal, async () => {
  console.log('🔄 Toggle changed:', showAllStudentsLocal.value)
  await loadStudents()
})

// Lifecycle
onMounted(() => {
  if (props.autoLoad) {
    loadStudents()
  }
})

const selectStudentById = async (userId: string, retryCount = 0) => {
  const maxRetries = 3
  console.log(`👨‍🎓 StudentSelector: Selecting student by ID: ${userId}, Retry: ${retryCount}`)
  
  // 🆕 WICHTIG: Warte bis aktueller Load fertig ist
  while (isLoading.value) {
    console.log('⏳ Waiting for current loading to finish...')
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  // Ensure students are loaded
  if (availableStudents.value.length === 0 && retryCount < maxRetries) {
    console.log('⏳ Students not loaded yet, loading first...')
    await loadStudents(userId)
  }
  
  // Warte bis Loading fertig ist
  while (isLoading.value) {
    console.log('⏳ Waiting for loading to complete...')
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  // DEBUG: Zeige aktuelle Studenten-Liste
  console.log('📚 Current students list:', {
    length: availableStudents.value?.length || 0,
    studentIds: availableStudents.value?.map(s => s.id) || [],
    searchingFor: {userId}
  })
  
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

// Expose methods for parent components
defineExpose({
  loadStudents,
  clearStudent,
  selectStudent,
  selectStudentById,
})
</script>