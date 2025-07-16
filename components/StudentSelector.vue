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
          @click="$emit('switch-to-other')" 
          class="text-xs text-blue-600 font-bold hover:text-blue-800 border-solid border-blue-700"
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
</script>