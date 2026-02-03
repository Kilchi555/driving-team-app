<template>
  <div class="student-selector">
    <!-- Toggle nur anzeigen wenn kein Student ausgewählt -->
    <div class="flex items-center gap-2">    
      <button 
            v-if="showSwitchToOther"
            @click="handleSwitchToOther"
            class="w-full px-4 py-2 mb-2 bg-blue-500 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
            Andere Terminart
          </button>
      </div>

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
      
      <!-- Ausgewählter Schüler Anzeige (oben) -->
      <div v-if="selectedStudent" class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div class="flex justify-between items-center">
          <div>
            <div class="font-semibold text-green-800">
              {{ selectedStudent.first_name }} {{ selectedStudent.last_name }}
            </div>
            <!-- Debug: Show what we have -->
            <div v-if="selectedStudent.category" class="text-xs text-green-600 mt-1">
              <span class="inline-block px-2 py-1 bg-green-100 rounded">
                {{ Array.isArray(selectedStudent.category) ? selectedStudent.category.join(', ') : selectedStudent.category }}
              </span>
            </div>
            <div v-if="selectedStudent.phone" class="text-xs text-green-600 mt-1">
              📞 {{ selectedStudent.phone }}
            </div>
          </div>
          <button 
            v-if="showClearButton" 
            @click="clearStudent" 
            class="text-red-500 hover:text-red-700"
          >
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
          class="w-full p-3 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 !bg-white !text-black"
        />
      </div>

      <!-- Manual Load Button - nur wenn autoLoad false und keine Students geladen -->
      <div v-if="!shouldAutoLoadComputed && availableStudents.length === 0 && !isLoading && !selectedStudent" class="mb-3">
        <button 
          @click="loadStudents()"
          class="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Schüler laden
        </button>
      </div>

      <!-- Neuer Schüler Button - immer sichtbar wenn kein Student ausgewählt -->
      <div v-if="!selectedStudent && !isLoading" class="mb-3">
        <button 
          @click="openAddStudentModal"
          class="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Neuer Schüler erstellen
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
              @click="handleStudentClick(student)"         
             :class="[
                'p-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors hover:bg-blue-50'
              ]"
            >
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="font-semibold text-gray-900 flex items-center gap-2">
                  {{ student.first_name }} {{ student.last_name }}
                  <!-- Pending Onboarding Indikator -->
                  <span 
                    v-if="student.onboarding_status === 'pending'"
                    class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200"
                    title="Onboarding ausstehend"
                  >
                    Neu
                  </span>
                </div>
                <div class="text-sm text-gray-500 flex items-center gap-2">
                  <span>{{ student.phone }}</span>
                  <span>•</span>
                  <span 
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
                    :title="`Kategorie: ${Array.isArray(student.category) ? student.category.join(', ') : (student.category || '-')}`"
                  >
                    <span>{{ Array.isArray(student.category) ? student.category.join(', ') : (student.category || '-') }}</span>
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

    <!-- Add Student Modal -->
    <AddStudentModal
      :show="showAddStudentModal"
      :current-user="props.currentUser"
      @close="showAddStudentModal = false"
      @added="handleStudentAdded"
    />
  </div>
</template>

<script setup lang="ts">

import { logger } from '~/utils/logger'
import { ref, computed, watch, onMounted } from 'vue'
// import { getSupabase } from '~/utils/supabase'
import { 
  cacheStudents, 
  getCachedStudents, 
  isCacheValid, 
  getCacheStatus 
} from '~/utils/studentCache'
import AddStudentModal from '~/components/AddStudentModal.vue'

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
  is_active?: boolean
  onboarding_status?: 'pending' | 'completed' | null
}

// Props
interface Props {
  modelValue?: Student | null
  currentUser?: { id: string; role: string; [key: string]: any } | null;
  disabled?: boolean
  placeholder?: string
  autoLoad?: boolean
  showAllStudents?: boolean
  isFreeslotMode?: boolean
  editStudentId?: string | null
  showClearButton?: boolean
  showSwitchToOther?: boolean
}

// ✅ FIX: Prevent ghost clicks from calendar free slot click propagating to student list
const clicksEnabled = ref(false)

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  disabled: false,
  placeholder: 'Schüler suchen (Name, E-Mail oder Telefon)...',
  autoLoad: true,
  showAllStudents: false,
  isFreeslotMode: false,
  editStudentId: undefined,
  showClearButton: true,
  showSwitchToOther: true
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
const loadTime = ref(0)
const showAddStudentModal = ref(false)

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

const shouldAutoLoadComputed = computed(() => {
  return props.autoLoad
})

// Methods

const loadStudents = async (editStudentId?: string | null) => {
  if (isLoading.value) return
  
  const staffId = props.currentUser?.id
  if (!staffId && !props.showAllStudents) {
    console.error('❌ No staff ID available for staff-specific load or showAllStudents is false.')
    return
  }

  // ✅ FIX: Bei Freeslot-Modus editStudentId ignorieren
  if (props.isFreeslotMode && editStudentId) {
    logger.debug('🎯 Freeslot mode detected - ignoring editStudentId to prevent auto-selection')
    editStudentId = null
  }

  isLoading.value = true
  error.value = null
  loadTime.value = Date.now()

  try {
    // ✅ 1. Cache prüfen (nur für Staff-spezifische Abfragen)
    if (props.currentUser?.role === 'staff' && !showAllStudentsLocal.value && staffId) { 
      const cacheStatus = getCacheStatus(staffId)
      logger.debug('📦 Cache status:', cacheStatus)
      
      if (cacheStatus.isValid && cacheStatus.count > 0) {
        logger.debug('📦 Using cached students')
        const cachedStudents = getCachedStudents(staffId)
        
        const typedStudents: Student[] = cachedStudents.map((student) => ({
          id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          email: student.email,
          phone: student.phone,
          category: student.category,
          assigned_staff_id: student.assigned_staff_id,
          preferred_location_id: undefined
        }))
        
        availableStudents.value = typedStudents
        logger.debug('✅ Students loaded from cache:', availableStudents.value.length)
        
        // Background refresh falls online
        if (navigator.onLine) {
          logger.debug('🔄 Cache valid, but trying to refresh in background...')
          setTimeout(() => {
            loadStudentsFromDB(editStudentId, true) // Background refresh
          }, 100)
        }
        
        isLoading.value = false
        return
      }
    }

    // ✅ 2. Von DB laden
    await loadStudentsFromDB(editStudentId, false)

  } catch (err: any) {
    console.error('❌ Error in loadStudents:', err)
    
    // ✅ 3. Bei Netzwerk-Fehler: Fallback auf Cache
    if ((err.message?.includes('fetch') || err.message?.includes('network')) && 
        props.currentUser?.role === 'staff' && !showAllStudentsLocal.value) {
      
      logger.debug('📦 Network error - trying cache as fallback')
      if (staffId) { 
      const cachedStudents = getCachedStudents(staffId)
      
      if (cachedStudents.length > 0) {
        const typedStudents: Student[] = cachedStudents.map((student) => ({
          id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          email: student.email,
          phone: student.phone,
          category: student.category,
          assigned_staff_id: student.assigned_staff_id,
          preferred_location_id: undefined
        }))
        
        availableStudents.value = typedStudents
        logger.debug('✅ Students loaded from expired cache (offline fallback):', availableStudents.value.length)
        error.value = '' // Kein Fehler anzeigen wenn Cache verfügbar
      } else {
        error.value = 'Offline - keine Schüler im Cache. Versuchen Sie es online.'
        availableStudents.value = []
      }
    } else {
      error.value = err.message || 'Fehler beim Laden der Schüler'
      availableStudents.value = []
    }
        } else {
      error.value = err.message || 'Fehler beim Laden der Schüler'
      availableStudents.value = []
        }
  } finally {
    isLoading.value = false
  }
}

// ✅ Backend API: Load students via API endpoint (bypasses RLS)
const loadStudentsFromDB = async (editStudentId?: string | null, isBackgroundRefresh: boolean = false) => {
  try {
    logger.debug('📚 StudentSelector: Loading students via API...')

    // Call backend API to fetch students (bypasses RLS)
    // No need to manually pass auth token - cookies are sent automatically
    const params = new URLSearchParams()
    params.append('showAllStudents', showAllStudentsLocal.value.toString())

    logger.debug('📡 Calling get-students API...')
    const response = await $fetch(`/api/admin/get-students?${params.toString()}`, {
      method: 'GET'
      // Cookies are automatically sent by the browser
    }) as any

    if (!response?.success || !response?.data) {
      throw new Error('Failed to load students from API')
    }

    const studentsToCache = response.data

    if (!isBackgroundRefresh) {
      const typedStudents: Student[] = (studentsToCache || []).map((user: any) => ({
        id: user.id,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        category: user.category || '',
        assigned_staff_id: user.assigned_staff_id || '',
        preferred_location_id: user.preferred_location_id || undefined,
        is_active: user.is_active,
        onboarding_status: user.onboarding_status
      }))

      availableStudents.value = typedStudents
      logger.debug('✅ Students loaded via API:', availableStudents.value.length)

      // Cache for staff-specific loads
      const staffId = props.currentUser?.id
      if (props.currentUser?.role === 'staff' && !showAllStudentsLocal.value && studentsToCache.length > 0 && staffId) {
        cacheStudents(studentsToCache, staffId)
      }
    }

  } catch (err: any) {
    console.error('❌ StudentSelector: Error loading from API:', err)
    if (!isBackgroundRefresh) {
      throw err
    }
  }
}

const handleSwitchToOther = () => {
  logger.debug('🔄 User manually clicked "Andere Terminart" button')
  logger.debug('📍 SWITCH CALL STACK:', new Error().stack)
  
  // ✅ Immer erlauben, unabhängig vom Loading-Status
  emit('switch-to-other')
}

const handleSearchFocus = () => {
  logger.debug('🔍 Search field focused, autoLoad:', shouldAutoLoadComputed.value)
  
  if (availableStudents.value.length === 0 && props.currentUser?.id) {
    logger.debug('📚 Loading students on search focus (no students loaded yet)')
    loadStudents()
  } else if (!props.currentUser?.id) {
    logger.debug('🚫 Cannot load on focus yet: No staff ID available.');
  }
}

const filterStudents = () => {
  // Diese Funktion ist jetzt leer, da wir computed verwenden
  // Wird aber für Kompatibilität beibehalten
}

const selectStudent = (student: Student, isUserClick = false) => {
  logger.debug('🔍 DEBUG VALUES:', {
    isUserClick: isUserClick,
    isFreeslotMode: props.isFreeslotMode,
    studentName: student.first_name + ' ' + student.last_name
  })
  
  // ✅ Block automatische Selections bei Free-Slots
  if (props.isFreeslotMode && !isUserClick) {
    logger.debug('🚫 Auto-selection blocked - freeslot mode detected')
    return
  }
  
  selectedStudent.value = student
  searchQuery.value = ''
  
  logger.debug('✅ StudentSelector: Student selected:', student.first_name, student.last_name)
  emit('student-selected', student)
}

const handleStudentClick = (student: Student) => {
  // ✅ FIX: Block ghost clicks that happen immediately when component mounts
  if (!clicksEnabled.value) {
    logger.debug('🚫 Student click blocked - clicks not yet enabled (anti-ghost-click protection)')
    return
  }
  
  logger.debug('🔍 Student click attempted:', {
    studentName: student.first_name,
    isFreeslotMode: props.isFreeslotMode,
    clicksEnabled: clicksEnabled.value
  })
  
  logger.debug('✅ Manual student click allowed - selecting student')
  selectStudent(student, true)
}

const clearStudent = () => {
  selectedStudent.value = null
  searchQuery.value = ''
  
  logger.debug('🗑️ StudentSelector: Student cleared')
  emit('student-cleared')
}

const openAddStudentModal = () => {
  logger.debug('🆕 Opening Add Student Modal')
  showAddStudentModal.value = true
}

const handleStudentAdded = async (newStudent: any) => {
  logger.debug('✅ New student added:', newStudent)
  showAddStudentModal.value = false
  
  const typedStudent: Student = {
    id: newStudent.id,
    first_name: newStudent.first_name || '',
    last_name: newStudent.last_name || '',
    email: newStudent.email || '',
    phone: newStudent.phone || '',
    category: newStudent.category || '',
    assigned_staff_id: newStudent.assigned_staff_id || '',
    preferred_location_id: newStudent.preferred_location_id || undefined
  }
  
  availableStudents.value.unshift(typedStudent)
  logger.debug('✅ Added new student to list:', typedStudent.first_name, typedStudent.last_name)
  
  selectStudent(typedStudent, true)
  logger.debug('✅ Auto-selected new student')
}

const selectStudentById = async (userId: string, retryCount = 0) => {
  const maxRetries = 3
  
  logger.debug(`👨‍🎓 StudentSelector: Selecting student by ID: ${userId}, Retry: ${retryCount}`)
  logger.debug('📍 CALL STACK:', new Error().stack)
  
  if (props.isFreeslotMode) {
    logger.debug('🎯 Freeslot mode detected - loading students but not auto-selecting')
    if (availableStudents.value.length === 0) {
      await loadStudents()
    }
    return null
  }
  
  while (isLoading.value) {
    logger.debug('⏳ Waiting for current loading to finish...')
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  if (availableStudents.value.length === 0 && retryCount < maxRetries) {
    logger.debug('⏳ Students not loaded yet, loading first...')
    await loadStudents(userId)
  }
  
  while (isLoading.value) {
    logger.debug('⏳ Waiting for loading to complete...')
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  const student = availableStudents.value.find(s => s.id === userId)
  
  if (student) {
    selectStudent(student, false)
    logger.debug('✅ StudentSelector: Student selected by ID:', student.first_name, student.last_name)
    return student
  } else {
    logger.debug('❌ StudentSelector: Student not found for ID:', userId)
    if (retryCount < maxRetries) {
      logger.debug('🔄 Retrying to find student...')
      await new Promise(resolve => setTimeout(resolve, 200))
      return selectStudentById(userId, retryCount + 1)
    }
    return null
  }
}

watch(() => props.showAllStudents, (newVal) => {
  showAllStudentsLocal.value = newVal;
  logger.debug('👀 Watcher: showAllStudents changed to:', newVal);
  if (props.currentUser?.id) { 
      logger.debug('🔄 showAllStudents changed, re-loading students with current ID...');
      loadStudents(props.editStudentId);
  } else {
      logger.debug('🔄 showAllStudents changed, but no currentUser ID to trigger load yet.');
  }
});

watch(showAllStudentsLocal, async () => {
  logger.debug('🔄 Toggle changed:', showAllStudentsLocal.value)
  await loadStudents()
})

watch(() => props.currentUser?.id, (newId) => {
  logger.debug('👀 Watcher: currentUser.id changed to:', newId, 'autoLoad:', props.autoLoad, 'isFreeslotMode:', props.isFreeslotMode, 'showAllStudents:', props.showAllStudents);
  
  if (props.autoLoad && !props.isFreeslotMode && newId) {
    logger.debug('🚀 Triggering loadStudents from watcher (autoLoad & not freeslot & id available)');
    loadStudents(props.editStudentId); 
  } else if (props.showAllStudents && (newId || !props.autoLoad)) {
      logger.debug('🚀 Triggering loadStudents from watcher (showAllStudents enabled)');
      loadStudents(props.editStudentId);
  } else if (!newId) {
      logger.debug('Waiting for currentUser ID to become available to trigger loadStudents.');
  }
}, { immediate: true });

onMounted(() => {
  logger.debug('📚 StudentSelector mounted, autoLoad:', props.autoLoad, 'isFreeslotMode:', props.isFreeslotMode, 'currentUser.id:', props.currentUser?.id, 'showAllStudents:', props.showAllStudents);
  if (!props.autoLoad || props.isFreeslotMode || (!props.currentUser?.id && !props.showAllStudents)) {
    logger.debug('🚫 Initial auto-load conditions not met. Waiting for props or user action.');
  }
  
  // ✅ FIX: Enable clicks after a short delay to prevent ghost clicks from calendar
  setTimeout(() => {
    clicksEnabled.value = true
    logger.debug('✅ StudentSelector: Clicks now enabled (after 300ms delay)')
  }, 300)
});

watch(() => props.autoLoad, (newVal) => {
  logger.debug('🔄 autoLoad prop changed to:', newVal);
  if (newVal && props.currentUser?.id && !props.isFreeslotMode) {
    logger.debug('🚀 autoLoad enabled and ID available, triggering loadStudents.');
    loadStudents(props.editStudentId);
  } else if (newVal && !props.currentUser?.id) {
    logger.debug('🚫 autoLoad enabled, but no ID yet. Waiting for currentUser.id watcher.');
  }
});

watch(() => props.isFreeslotMode, (newVal) => {
  if (newVal) {
    clicksEnabled.value = false
    logger.debug('🔄 Freeslot mode changed - resetting click protection')
    setTimeout(() => {
      clicksEnabled.value = true
      logger.debug('✅ StudentSelector: Clicks re-enabled after freeslot mode change')
    }, 300)
  }
});

// Expose methods for parent components
defineExpose({
  loadStudents,
  clearStudent,
  selectStudent,
  selectStudentById,
})
</script>
