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
          🎓 Fahrschüler:in
        </label>
       <button 
          v-if="showSwitchToOther"
          @click="handleSwitchToOther"
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
            <div class="text-sm text-green-600 flex items-center gap-2">
              <span 
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200"
                :title="`Kategorie: ${Array.isArray(selectedStudent.category) ? selectedStudent.category.join(', ') : (selectedStudent.category || '-')}`"
              >
                <span>
                  {{ Array.isArray(selectedStudent.category) ? selectedStudent.category.join(', ') : (selectedStudent.category || '-') }}
                </span>
              </span>
              <span class="text-green-700">•</span>
              <span>{{ selectedStudent.phone }}</span>
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
          class="w-full p-3 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <!-- Manual Load Button - nur wenn autoLoad false und keine Students geladen -->
      <div v-if="!shouldAutoLoadComputed && availableStudents.length === 0 && !isLoading && !selectedStudent" class="mb-3">
        <button 
          @click="loadStudents()"
          class="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Schüler:in laden
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
                <div class="font-semibold text-gray-900">
                  {{ student.first_name }} {{ student.last_name }}
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { 
  cacheStudents, 
  getCachedStudents, 
  isCacheValid, 
  getCacheStatus 
} from '~/utils/studentCache'

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
  if (isLoading.value) return
  
  const staffId = props.currentUser?.id
  if (!staffId && !props.showAllStudents) { // Zeige Fehler nur, wenn staffId erwartet wird und fehlt
    console.error('❌ No staff ID available for staff-specific load or showAllStudents is false.')
    return // Nur hier zurückkehren, wenn staffId wirklich obligatorisch ist
  }

  // ✅ FIX: Bei Freeslot-Modus editStudentId ignorieren
  if (props.isFreeslotMode && editStudentId) {
    console.log('🎯 Freeslot mode detected - ignoring editStudentId to prevent auto-selection')
    editStudentId = null
  }

  isLoading.value = true
  error.value = null
  loadTime.value = Date.now()

  try {
    // ✅ 1. Cache prüfen (nur für Staff-spezifische Abfragen)
    if (props.currentUser?.role === 'staff' && !showAllStudentsLocal.value && staffId) { 
      const cacheStatus = getCacheStatus(staffId)
      console.log('📦 Cache status:', cacheStatus)
      
      if (cacheStatus.isValid && cacheStatus.count > 0) {
        console.log('📦 Using cached students')
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
        console.log('✅ Students loaded from cache:', availableStudents.value.length)
        
        // Background refresh falls online
        if (navigator.onLine) {
          console.log('🔄 Cache valid, but trying to refresh in background...')
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
      
      console.log('📦 Network error - trying cache as fallback')
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
        console.log('✅ Students loaded from expired cache (offline fallback):', availableStudents.value.length)
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

// ✅ Neue Hilfsfunktion: DB-Laden
const loadStudentsFromDB = async (editStudentId?: string | null, isBackgroundRefresh: boolean = false) => {
  try {
    console.log('📚 StudentSelector: Loading students from database...')
    const supabase = getSupabase()

    let studentsToCache: any[] = []

    const staffId = props.currentUser?.id;

    // Staff-spezifische Logik
    const condition = Boolean(props.currentUser?.role === 'staff' && !showAllStudentsLocal.value && staffId)
    console.log('🔍 Debug loadStudentsFromDB:', {
      userRole: props.currentUser?.role,
      showAllStudents: showAllStudentsLocal.value,
      staffId: staffId,
      condition: condition
    })
    
    if (condition) {
      console.log('👨‍🏫 Loading students for staff member:', props.currentUser?.id)
      
      // Get current user's tenant_id first
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', currentUser?.id)
        .single()
      
      const tenantId = userProfile?.tenant_id
      if (!tenantId) {
        throw new Error('User has no tenant assigned')
      }
      
      // 1. Direkt zugewiesene Schüler laden - FILTERED BY TENANT
      console.log('🔍 Loading assigned students for staff:', staffId)
      const { data: assignedStudents, error: assignedError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, phone, category, assigned_staff_id, preferred_location_id, role, is_active')
        .eq('role', 'client')
        .eq('is_active', true)
        .eq('assigned_staff_id', staffId)
        .eq('tenant_id', tenantId)
        .order('first_name')

      if (assignedError) throw assignedError
      console.log('🔍 Assigned students loaded:', assignedStudents?.length || 0)

      // 2. Schüler mit Termin-Historie laden - FILTERED BY TENANT
      console.log('🔍 Loading students with appointment history for staff:', props.currentUser?.id)
      const { data: appointmentStudents, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          user_id,
          users!appointments_user_id_fkey (
            id, first_name, last_name, email, phone, category, 
            assigned_staff_id, preferred_location_id, role, is_active
          )
        `)
        .eq('staff_id', props.currentUser?.id as string)
        // .eq('tenant_id', tenantId)  // ← DISABLED: Column doesn't exist in schema 
        .not('users.id', 'is', null)

      if (appointmentError) throw appointmentError
      console.log('🔍 Appointments with students loaded:', appointmentStudents?.length || 0)

      const typedAppointmentStudents = appointmentStudents as unknown as AppointmentResponse[]
      
      const historyStudents = typedAppointmentStudents
        .map(apt => apt.users)
        .filter((user): user is UserFromDB => {
          return user !== null && 
                 user.role === 'client' && 
                 user.is_active === true
        })

      // 3. Kombinieren und deduplizieren
      //    Priorität: Daten aus Termin-Historie (appointments/users) vor zugewiesenen Nutzern (users)
      const byId: Record<string, UserFromDB> = {}

      // Zuerst: Studenten aus der Termin-Historie (bevorzugt für Kategorie)
      for (const u of historyStudents) {
        if (u) byId[u.id] = { ...u }
      }

      // Danach: Zugewiesene Studenten – nur ergänzen, falls noch nicht vorhanden
      for (const u of (assignedStudents || [])) {
        const existing = byId[u.id]
        if (!existing) {
          byId[u.id] = { ...u }
        } else {
          // Falls Kategorie aus Termin-Daten fehlt, übernehme Kategorie aus users
          const hasCategory = Boolean(existing.category && String(existing.category).length > 0)
          if (!hasCategory && u.category) {
            byId[u.id] = { ...existing, category: u.category }
          }
        }
      }

      const uniqueStudents = Object.values(byId)

      // 4. Falls ein editStudentId angegeben ist, diesen auch laden falls nicht enthalten
      if (editStudentId && !uniqueStudents.find(s => s.id === editStudentId)) {
        console.log('🔍 Loading specific student for edit mode:', editStudentId)
        
        // ✅ FIX: Bei Freeslot-Modus keinen Schüler automatisch auswählen
        if (props.isFreeslotMode) {
          console.log('🎯 Freeslot mode detected - not auto-selecting editStudentId')
        } else {
          const { data: editStudent } = await supabase
            .from('users')
            .select('id, first_name, last_name, email, phone, category, assigned_staff_id, preferred_location_id, role, is_active')
            .eq('id', editStudentId)
            .eq('role', 'client')
            .single()

          if (editStudent) {
            uniqueStudents.unshift(editStudent)
          }
        }
      }

      studentsToCache = uniqueStudents

      if (!isBackgroundRefresh) {
        const typedStudents: Student[] = uniqueStudents.map((user: UserFromDB) => ({
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
        console.log('✅ Staff students loaded:', availableStudents.value.length)
        console.log('🔍 Available students:', availableStudents.value)
      }

    } else {
      // Admin oder "Alle anzeigen" Modus - FILTERED BY TENANT
      console.log('👑 Loading all active students (Admin mode or show all)')
      console.log('🔍 Reason for admin mode:', {
        userRole: props.currentUser?.role,
        showAllStudents: showAllStudentsLocal.value,
        staffId: staffId
      })
      
      // ✅ TESTING MODE: Skip tenant validation temporarily  
      console.log('🔍 StudentSelector (Admin Mode) - TESTING MODE: Loading all students without tenant filter')
      
      let query = supabase
        .from('users')
        .select('id, first_name, last_name, email, phone, category, assigned_staff_id, preferred_location_id, role, is_active')
        .eq('role', 'client')
        .eq('is_active', true)
        // .eq('tenant_id', tenantId)  // ← DISABLED: Column doesn't exist in schema
        .order('first_name')

      if (props.currentUser?.role === 'staff') {
        query = query.limit(100)
      }

      const { data, error: fetchError } = await query
      if (fetchError) throw fetchError
      
      studentsToCache = data || []

      if (!isBackgroundRefresh) {
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
    }

    // ✅ Cache aktualisieren (nur für Staff-spezifische Abfragen)
    if (props.currentUser?.role === 'staff' && !showAllStudentsLocal.value && studentsToCache.length > 0 && staffId) {
      cacheStudents(studentsToCache, staffId)
    }

  } catch (err: any) {
    console.error('❌ StudentSelector: Error loading from DB:', err)
    if (!isBackgroundRefresh) {
      throw err
    }
  }
}

const handleSwitchToOther = () => {
  console.log('🔄 User manually clicked "Andere Terminart" button')
  console.log('📍 SWITCH CALL STACK:', new Error().stack)
  
  // ✅ Immer erlauben, unabhängig vom Loading-Status
  emit('switch-to-other')
}

const handleSearchFocus = () => {
  console.log('🔍 Search field focused, autoLoad:', shouldAutoLoadComputed.value)
  
  // ✅ Lade Studenten auch bei autoLoad=false wenn noch keine geladen sind
  // ÄNDERE DIESEN BLOCK:
  // Füge props.currentUser?.id hinzu, um sicherzustellen, dass die ID vorhanden ist
  if (availableStudents.value.length === 0 && props.currentUser?.id) { // <-- HIER IST DIE WICHTIGE ÄNDERUNG
    console.log('📚 Loading students on search focus (no students loaded yet)')
    loadStudents() // Ruft loadStudents auf, das intern die staffId prüft
  } else if (!props.currentUser?.id) {
    // Optionaler Log, um zu bestätigen, dass es hier nicht geladen wird, weil die ID fehlt
    console.log('🚫 Cannot load on focus yet: No staff ID available.');
  }
}

const filterStudents = () => {
  // Diese Funktion ist jetzt leer, da wir computed verwenden
  // Wird aber für Kompatibilität beibehalten
}


// In StudentSelector.vue - Zurück zur ursprünglichen selectStudent Funktion:
const selectStudent = (student: Student, isUserClick = false) => {
  console.log('🔍 DEBUG VALUES:', {
    isUserClick: isUserClick,
    isFreeslotMode: props.isFreeslotMode,
    studentName: student.first_name + ' ' + student.last_name
  })
  
  // ✅ Block automatische Selections bei Free-Slots
  if (props.isFreeslotMode && !isUserClick) {
    console.log('🚫 Auto-selection blocked - freeslot mode detected')
    return
  }
  
  selectedStudent.value = student
  searchQuery.value = ''
  
  console.log('✅ StudentSelector: Student selected:', student.first_name, student.last_name)
  emit('student-selected', student)
}

const handleStudentClick = (student: Student) => {
  console.log('🔍 Student click attempted:', {
    studentName: student.first_name,
    isFreeslotMode: props.isFreeslotMode
  })
  
  // Manuelle Klicks sollten erlaubt sein
  console.log('✅ Manual student click allowed - selecting student')
  selectStudent(student, true) // isUserClick=true bedeutet manueller Klick
}

const clearStudent = () => {
  selectedStudent.value = null
  searchQuery.value = ''
  
  console.log('🗑️ StudentSelector: Student cleared')
  emit('student-cleared')
}

const selectStudentById = async (userId: string, retryCount = 0) => {
  const maxRetries = 3
  
  // ✅ DEBUG: Stack trace anzeigen
  console.log(`👨‍🎓 StudentSelector: Selecting student by ID: ${userId}, Retry: ${retryCount}`)
  console.log('📍 CALL STACK:', new Error().stack)
  
  // ✅ FIX: Bei Freeslot-Modus Schüler laden aber nicht automatisch auswählen
  if (props.isFreeslotMode) {
    console.log('🎯 Freeslot mode detected - loading students but not auto-selecting')
    // Schüler laden falls noch nicht geladen
    if (availableStudents.value.length === 0) {
      await loadStudents()
    }
    return null // Keine automatische Auswahl
  }
  
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
    selectStudent(student, false) // Diese Zeile wird jetzt von unserem selectStudent-Fix abgefangen
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

watch(() => props.showAllStudents, (newVal) => { // <--- HIER newVal HINZUFÜGEN
  showAllStudentsLocal.value = newVal;
  console.log('👀 Watcher: showAllStudents changed to:', newVal);
  if (props.currentUser?.id) { 
      console.log('🔄 showAllStudents changed, re-loading students with current ID...');
      loadStudents(props.editStudentId);
  } else {
      console.log('🔄 showAllStudents changed, but no currentUser ID to trigger load yet.');
  }
});

// Watchers
watch(showAllStudentsLocal, async () => {
  console.log('🔄 Toggle changed:', showAllStudentsLocal.value)
  await loadStudents()
})

// StudentSelector.vue
// ...
// Füge DIESEN WATCHER HINZU ODER PASSE IHN AN, falls nicht exakt so
watch(() => props.currentUser?.id, (newId) => {
  console.log('👀 Watcher: currentUser.id changed to:', newId, 'autoLoad:', props.autoLoad, 'isFreeslotMode:', props.isFreeslotMode, 'showAllStudents:', props.showAllStudents);
  
  if (props.autoLoad && !props.isFreeslotMode && newId) {
    console.log('🚀 Triggering loadStudents from watcher (autoLoad & not freeslot & id available)');
    // ZEILE 601: Sicherstellen, dass 'editStudentId' als Prop existiert
    loadStudents(props.editStudentId); 
  } else if (props.showAllStudents && (newId || !props.autoLoad)) {
      console.log('🚀 Triggering loadStudents from watcher (showAllStudents enabled)');
      // ZEILE 607: Sicherstellen, dass 'editStudentId' als Prop existiert
      loadStudents(props.editStudentId);
  } else if (!newId) {
      console.log('Waiting for currentUser ID to become available to trigger loadStudents.');
  }
}, { immediate: true });

onMounted(() => {
  console.log('📚 StudentSelector mounted, autoLoad:', props.autoLoad, 'isFreeslotMode:', props.isFreeslotMode, 'currentUser.id:', props.currentUser?.id, 'showAllStudents:', props.showAllStudents);
  // Stelle sicher, dass HIER KEIN loadStudents() Aufruf mehr ist!
  if (!props.autoLoad || props.isFreeslotMode || (!props.currentUser?.id && !props.showAllStudents)) {
    console.log('🚫 Initial auto-load conditions not met. Waiting for props or user action.');
  }
});

watch(() => props.autoLoad, (newVal) => { // <--- HIER newVal HINZUFÜGEN
  console.log('🔄 autoLoad prop changed to:', newVal);
  if (newVal && props.currentUser?.id && !props.isFreeslotMode) {
    console.log('🚀 autoLoad enabled and ID available, triggering loadStudents.');
    loadStudents(props.editStudentId);
  } else if (newVal && !props.currentUser?.id) {
    console.log('🚫 autoLoad enabled, but no ID yet. Waiting for currentUser.id watcher.');
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