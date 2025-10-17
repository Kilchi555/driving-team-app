<!-- pages/customers.vue - Mobile-Optimierte Version -->
<template>
  <!-- Loading State -->
  <div v-if="isLoading" class="flex items-center justify-center min-h-[100svh]">
    <LoadingLogo size="2xl"  />
  </div>

  <!-- Error State -->
  <div v-else-if="userError" class="min-h-[100svh] flex items-center justify-center">
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
  <div v-else-if="currentUser" class="h-[100svh] flex flex-col bg-gray-50">
    <!-- Header -->
    <div class="bg-white shadow-sm border-b p-4">
      <div class="flex items-center justify-between">
        <!-- Back Button & Title -->
        <div class="flex items-center gap-4">
          <button 
            @click="goBack"
            :class="[
              'text-2xl transition-colors duration-200',
              isNavigating 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-gray-600 hover:text-gray-800 cursor-pointer'
            ]"
            :disabled="isNavigating"
          >
            {{ isNavigating ? '⟳' : '←' }}
          </button>
          <h1 class="text-xl sm:text-2xl font-bold text-gray-900">
            {{ isNavigating ? 'Lade Kalender...' : 'Schülerliste' }}
          </h1>
        </div>

        <!-- Add Student Button (nur Desktop) -->
        <button 
          v-if="currentUser.role !== 'client'"
          @click="addNewStudent"
          class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
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
            class="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
          <div class="absolute left-3 top-2.5 text-gray-400">
          </div>
        </div>

        <!-- Filter Toggles -->
        <div class="grid grid-cols-3 gap-4 text-sm">
          <!-- Inactive Toggle -->
          <div class="flex items-center gap-3 rounded-lg">
            <span class="text-sm font-medium text-gray-700">
              {{ showInactive ? 'Inaktive' : 'Aktive' }}
            </span>
            <label class="relative inline-flex items-center cursor-pointer">
              <input 
                v-model="showInactive" 
                type="checkbox" 
                class="sr-only peer"
                @change="() => loadStudents(true)"
              >
              <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <!-- All Students Toggle (nur für Staff) -->
          <div v-if="currentUser.role === 'staff' || 'admin'" class="flex items-center gap-3 rounded-lg">
            <span class="text-sm font-medium text-gray-700">
              {{ showAllStudents ? 'Alle' : 'Meine' }}
            </span>
            <label class="relative inline-flex items-center cursor-pointer">
              <input v-model="showAllStudents" type="checkbox" class="sr-only peer" @change="() => loadStudents(true)">
              <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <!-- No Upcoming Appointments Toggle -->
          <div class="flex items-center gap-3 rounded-lg">
            <span class="text-sm font-medium text-gray-700">
              {{ showOnlyNoUpcoming ? 'Keine Termine geplant' : 'Termin geplant' }}
            </span>
            <label class="relative inline-flex items-center cursor-pointer">
              <input v-model="showOnlyNoUpcoming" type="checkbox" class="sr-only peer" @change="handleNoUpcomingToggle">
              <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
            </label>
          </div>
        </div>

        <!-- Statistics -->
        <div class="flex gap-3 text-xs sm:text-sm text-gray-600">
          <span v-if="!showAllStudents">Meine: {{ students.length }}</span>
          <span v-else>Alle: {{ students.length }}</span>
          <span>Aktiv: {{ students.filter(s => s.is_active).length }}</span>
          <span>Inaktiv: {{ students.filter(s => !s.is_active).length }}</span>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-hidden">
      <!-- Error Loading Students -->
      <div v-if="error" class="h-full flex items-center justify-center">
        <div class="text-center max-w-md p-6 bg-red-50 rounded-lg">
          <h3 class="text-lg font-bold text-red-800 mb-2">Fehler beim Laden</h3>
          <p class="text-red-600 mb-4">{{ error }}</p>
          <button 
            @click="() => loadStudents(true)" 
            class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Erneut versuchen
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredStudents.length === 0" class="h-full flex items-center justify-center">
        <div class="text-center px-4">
          <div class="text-6xl mb-4">👥</div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">
            {{ searchQuery ? 'Keine Schüler gefunden' : 'Noch keine Schüler' }}
          </h3>
        </div>
      </div>

      <!-- Mobile-Optimierte Students List -->
      <div v-else class="h-full overflow-y-auto relative">
        <!-- Loading Overlay für Schülerliste -->
        <div v-if="isLoading" class="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
          <div class="text-center">
            <LoadingLogo size="xl"  />
            <p class="text-gray-600 mt-4">Lade Schüler...</p>
          </div>
        </div>
        
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
                    <!-- Category Badges - compact -->
                    <div v-if="student.category && student.category.length > 0" class="flex flex-wrap gap-1">
                      <span 
                        v-for="cat in student.category" 
                        :key="cat"
                        class="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-medium"
                      >
                        {{ cat }}
                      </span>
                    </div>
                  </div>
                  
                  <!-- Contact Info - compact -->
                  <div class="space-y-0.5">
                    <p v-if="student.phone" class="text-sm text-gray-600 flex items-center gap-1">
                      <span class="text-xs">📱</span>
                      <a :href="`tel:${student.phone}`" class="text-blue-600 hover:text-blue-800 hover:underline"  @click.stop>
                        {{ formatPhone(student.phone) }}
                      </a>                    
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
                <div class="flex items-center justify-between text-xs text-gray-400">
                  <!-- Left: Additional info -->
                  <div class="flex items-center gap-3">
                    <span>
                      Fahrlehrer: {{ student.assignedInstructor || '-' }}
                    </span>
                    <span>
                      Lektionen: {{ student.completedLessonsCount || '-' }}
                    </span>

                  </div>
                  
                  <!-- Right: Date -->
                  <span class="text-xs text-gray-400">
                    Letzter Termin: {{ student.lastLesson ? formatRelativeDate(student.lastLesson) : '-' }}
                  </span>
                </div>
              </div>

              <!-- Desktop: Additional Info Row (hidden on mobile) -->
              <div class="mt-2 pt-2 border-t border-gray-100 hidden sm:block">
                <div class="flex items-center justify-between text-xs text-gray-400">
                  <!-- Left: Additional info -->
                  <div class="flex items-center gap-3">
                    <span>
                      Fahrlehrer: {{ student.assignedInstructor || '-' }}
                    </span>
                    <span>
                      Lektionen: {{ student.completedLessonsCount || '-' }}
                    </span>
                  </div>
                  
                  <!-- Right: Date -->
                  <span class="text-xs text-gray-400">
                    Letzter Termin: {{ student.lastLesson ? formatRelativeDate(student.lastLesson) : '-' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Enhanced Student Detail Modal -->
     <EnhancedStudentModal
    :selected-student="selectedStudent"
    :current-user="currentUser"
    @close="selectedStudent = null"
    @edit="editStudent"
    @create-appointment="handleCreateAppointment"
    @evaluate-lesson="handleEvaluateLesson"
    @student-updated="handleStudentUpdated"
  />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { navigateTo } from '#app'
import { useCurrentUser } from '~/composables/useCurrentUser'
import { getSupabase } from '~/utils/supabase'
import EnhancedStudentModal from '~/components/EnhancedStudentModal.vue'
import LoadingLogo from '~/components/LoadingLogo.vue'


// Supabase client
const supabase = getSupabase()

// Composables
const { currentUser, fetchCurrentUser, isLoading: isUserLoading, userError } = useCurrentUser()

// Local state
const selectedStudent = ref<any>(null)
const showAddModal = ref(false)
const students = ref<any[]>([])
const isLoading = ref(false)
const isNavigating = ref(false)
const error = ref<string | null>(null)
const searchQuery = ref('')
const showInactive = ref(false)
const showAllStudents = ref(false)
const showOnlyNoUpcoming = ref(false)

// Computed
const filteredStudents = computed(() => {
  console.log('🔄 filteredStudents computed triggered:', {
    studentsCount: students.value.length,
    showInactive: showInactive.value,
    showOnlyNoUpcoming: showOnlyNoUpcoming.value,
    searchQuery: searchQuery.value
  })
  
  let filtered = students.value

  // ✅ Aktiv/Inaktiv Filterung passiert jetzt in der DB-Abfrage (loadStudents)
  // Keine lokale Filterung mehr nötig

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(s => 
      s.first_name?.toLowerCase().includes(query) ||
      s.last_name?.toLowerCase().includes(query) ||
      s.email?.toLowerCase().includes(query)
    )
    console.log('✅ Filtered by search query:', filtered.length, 'students')
  }

  // Filter by upcoming appointments
  if (showOnlyNoUpcoming.value) {
    const beforeFilter = filtered.length
    const now = new Date()
    
    filtered = filtered.filter(student => {
      // Prüfe ob der Schüler geplante Termine hat
      const hasUpcomingAppointments = student.appointments?.some((apt: any) => {
        const appointmentDate = new Date(apt.start_time)
        return appointmentDate > now && ['scheduled', 'confirmed'].includes(apt.status)
      })
      return !hasUpcomingAppointments
    })
    
    // Sortiere nach dem letzten Termin (die am längsten her sind zuoberst)
    filtered = filtered.sort((a, b) => {
      const aLastAppointment = a.appointments?.length > 0 
        ? new Date(Math.max(...a.appointments.map((apt: any) => new Date(apt.start_time).getTime())))
        : new Date(0) // Falls keine Termine, ganz nach oben
      
      const bLastAppointment = b.appointments?.length > 0 
        ? new Date(Math.max(...b.appointments.map((apt: any) => new Date(apt.start_time).getTime())))
        : new Date(0) // Falls keine Termine, ganz nach oben
      
      return aLastAppointment.getTime() - bLastAppointment.getTime() // Älteste zuerst
    })
    
    console.log(`✅ Showing students without upcoming appointments: ${beforeFilter} → ${filtered.length} students`)
  }

  console.log('🔄 Final filtered students:', filtered.length)
  return filtered
})

// Filter students (for toggle changes)
const filterStudents = () => {
  // This function is called when the "No Upcoming" toggle changes
  // The filteredStudents computed property will automatically update
  console.log('🔄 Filtering students - showOnlyNoUpcoming:', showOnlyNoUpcoming.value)
}

const handleNoUpcomingToggle = async () => {
  console.log('🔄 No upcoming toggle changed:', showOnlyNoUpcoming.value)
  
  if (showOnlyNoUpcoming.value) {
    // If switching to "No Upcoming", we need appointments data
    console.log('📅 Loading appointments for "No Upcoming" filter...')
    await loadStudents(true)
  }
  
  // The filteredStudents computed property will handle the rest
}

// Navigation functions
const goBack = async () => {
  if (isNavigating.value) return // Prevent multiple clicks
  
  try {
    isNavigating.value = true
    console.log('🔙 Navigating back to dashboard...')
    
    // ✅ Optimierte Navigation mit Cache-Invalidierung
    try {
      // Verwende replace statt navigateTo für bessere Performance
      await navigateTo('/dashboard', { replace: true })
    } catch (navError) {
      console.warn('⚠️ navigateTo failed, trying window.location:', navError)
      // Fallback 1: Direct window navigation
      window.location.href = '/dashboard'
    }
  } catch (error) {
    console.error('❌ All navigation methods failed:', error)
    // Fallback 2: Force reload to dashboard
    window.location.replace('/dashboard')
  } finally {
    // ✅ Kürzere Timeout für bessere UX
    setTimeout(() => {
      isNavigating.value = false
    }, 1000)
  }
}

const addNewStudent = () => {
  console.log('🚀 Opening student registration')
  // Navigate to the customer registration page
  navigateTo('/register')
}

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

const handleStudentUpdated = (updateData: { id: string, [key: string]: any }) => {
  console.log('📡 Received student update:', updateData)
  
  // Find and update the student in the local students array
  const studentIndex = students.value.findIndex(s => s.id === updateData.id)
  if (studentIndex !== -1) {
    // Update the student object with new data
    Object.assign(students.value[studentIndex], updateData)
    console.log('✅ Updated local student data')
    
    // Also update selectedStudent if it's the same student
    if (selectedStudent.value?.id === updateData.id) {
      Object.assign(selectedStudent.value, updateData)
      console.log('✅ Updated selectedStudent data')
    }
  }
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

  // Load students with appointments for complete data
  await loadStudents(true)
})

// Methods - ECHTE SUPABASE CALLS mit korrekten Spaltennamen
const loadStudents = async (loadAppointments = true) => {
  if (!currentUser.value) return
  
  isLoading.value = true
  error.value = null
  
  try {
    console.log('🔄 Loading students from database...', loadAppointments ? 'with appointments' : 'without appointments')
    console.log('Current user role:', currentUser.value.role)
    
    // Get current user's tenant_id
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const { data: userProfile } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', authUser?.id)
      .single()
    const tenantId = userProfile?.tenant_id
    
    if (!tenantId) {
      throw new Error('User has no tenant assigned')
    }

    console.log('🔍 Customers page - Current tenant_id:', tenantId)
    
    // Base query without appointments for faster loading
    let baseQuery = `
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
      payment_provider_customer_id
    `
    
    // Only add appointments if specifically requested
    if (loadAppointments) {
      baseQuery += `,
        appointments!user_id (
          id,
          start_time,
          status,
          type,
          title
        )`
    }
    
    let query = supabase
      .from('users')
      .select(baseQuery)
      .eq('role', 'client') // Nur Schüler laden
      .eq('tenant_id', tenantId) // Filter by current tenant
      .order('first_name', { ascending: true })

    // ✅ Filterung basierend auf Benutzerrolle
    if (currentUser.value.role === 'staff' && !showAllStudents.value) {
      // Staff sieht alle Schüler des Tenants (nicht nur assigned_staff_id)
      console.log('📚 Loading all students for staff (showing all students in tenant):', currentUser.value.id)
    } else if (currentUser.value.role === 'admin') {
      // Admin sieht alle Schüler
      console.log('👑 Loading all students for admin')
    }

    // ✅ Filterung basierend auf Aktiv/Inaktiv Status
    if (showInactive.value) {
      // Nur inaktive Schüler laden
      query = query.eq('is_active', false)
      console.log('📚 Loading inactive students only')
    } else {
      // Nur aktive Schüler laden
      query = query.eq('is_active', true)
      console.log('📚 Loading active students only')
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

    // ✅ NEU: Intelligente Filterung basierend auf showAllStudents
    let studentsToProcess = data as any[]
    
    // ✅ DEBUG: Zeige alle geladenen Schüler
    console.log('🔍 All loaded students:', studentsToProcess.map((s: any) => ({ 
      id: s.id, 
      name: `${s.first_name} ${s.last_name}`, 
      is_active: s.is_active,
      email: s.email 
    })))
    
    // ✅ DEBUG: Zeige is_active Status aller Schüler
    const activeCount = studentsToProcess.filter((s: any) => s.is_active).length
    const inactiveCount = studentsToProcess.filter((s: any) => !s.is_active).length
    console.log(`📊 Students status: ${activeCount} active, ${inactiveCount} inactive`)
    
    if (!showAllStudents.value) {
      // Standard: Nur eigene Schüler (mit denen ich Fahrstunden hatte)
      console.log('📚 Loading only students with lessons from current staff:', currentUser.value.id)
      console.log('🔍 Current user details:', {
        id: currentUser.value.id,
        email: currentUser.value.email,
        role: currentUser.value.role,
        first_name: currentUser.value.first_name
      })
      
      const studentsWithMyLessons = []
      for (const student of studentsToProcess) {
        console.log(`🔍 Checking student: ${(student as any).first_name} ${(student as any).last_name} (ID: ${(student as any).id})`)
        
        // ✅ KORRIGIERT: Prüfe ob der Schüler Lektionen mit dem aktuellen Fahrlehrer hat
        const { data: myLessons, error: lessonError } = await supabase
          .from('appointments')
          .select('staff_id')
          .eq('user_id', (student as any).id)
          .eq('staff_id', currentUser.value.id)
          .limit(1)

        if (lessonError) {
          console.error('❌ Error checking my lessons for student:', (student as any).id, lessonError)
          continue
        }

        console.log(`🔍 Lessons found for ${(student as any).first_name}:`, myLessons)

        if (myLessons && myLessons.length > 0) {
          studentsWithMyLessons.push(student)
          console.log(`✅ Added ${(student as any).first_name} to my students list`)
        } else {
          console.log(`⚠️ No lessons found for ${(student as any).first_name} with current staff`)
          
          // ✅ DEBUG: Zeige alle Termine für diesen Schüler
          const { data: allLessons } = await supabase
            .from('appointments')
            .select('staff_id, start_time, status')
            .eq('user_id', (student as any).id)
            .limit(5)
          
          console.log(`🔍 All lessons for ${(student as any).first_name}:`, allLessons)
        }
      }
      
      studentsToProcess = studentsWithMyLessons
      console.log(`✅ Found ${studentsWithMyLessons.length} students with lessons from current staff out of ${(data as any[]).length} total`)
    } else {
      // Alle aktiven Kunden
      console.log('👑 Loading all active customers')
      studentsToProcess = (data as any[]).filter((student: any) => student.is_active)
      console.log(`✅ Found ${studentsToProcess.length} active customers`)
    }

    // ✅ OPTIMIERT: Lade alle Fahrlehrer-Daten in EINER Abfrage
    console.log('🚀 Loading all staff data in one query...')
    
    // Alle Schüler-IDs sammeln
    const studentIds = studentsToProcess.map((s: any) => s.id)
    
    // EINE Abfrage für alle Fahrlehrer aller Schüler
    const { data: allLessonInstructors, error: lessonError } = await supabase
      .from('appointments')
      .select('user_id, staff_id')
      .in('user_id', studentIds)
      .not('staff_id', 'is', null)

    if (lessonError) {
      console.error('❌ Error loading lesson instructors:', lessonError)
    }

    // EINE Abfrage für alle Fahrlehrer-Details
    let instructorData: any[] = []
    if (allLessonInstructors && allLessonInstructors.length > 0) {
      const uniqueInstructorIds = [...new Set(allLessonInstructors.map((l: any) => l.staff_id))]
      console.log('🔍 Unique instructor IDs for all students:', uniqueInstructorIds)
      
      const { data: instructors, error: instructorError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', uniqueInstructorIds)

      if (instructorError) {
        console.error('❌ Error loading instructor data:', instructorError)
      } else {
        instructorData = instructors || []
        console.log('✅ Loaded instructor data for all students:', instructorData.length)
      }
    }

    // Erweiterte Schüler-Daten mit zusätzlichen Informationen
    const enrichedStudents = studentsToProcess.map((student: any) => {
      // ✅ OPTIMIERT: Verwende bereits geladene Daten
      let assignedInstructor = '-'
      
      // Finde Fahrlehrer für diesen Schüler
      const studentInstructors = allLessonInstructors?.filter((l: any) => l.user_id === student.id) || []
      
      if (studentInstructors.length > 0) {
        const uniqueInstructorIds = [...new Set(studentInstructors.map((l: any) => l.staff_id))]
        const instructors = instructorData.filter((i: any) => uniqueInstructorIds.includes(i.id))
        
        if (instructors.length > 0) {
          const instructorInitials = instructors.map((instructor: any) => 
            `${instructor.first_name.charAt(0)}.${instructor.last_name.charAt(0)}.`
          ).join(', ')
          
          assignedInstructor = instructorInitials
        }
      }

        // ✅ OPTIMIERT: Verwende bereits geladene Termine statt neue DB-Abfragen
        const studentAppointments = student.appointments || []
        
        // Zähle Termine basierend auf Status (nur nicht gelöschte)
        const scheduledLessonsCount = studentAppointments.filter((apt: any) => 
          apt.status === 'scheduled' && !apt.deleted_at
        ).length

        const completedLessonsCount = studentAppointments.filter((apt: any) => 
          ['confirmed', 'completed'].includes(apt.status) && !apt.deleted_at
        ).length

        const cancelledLessonsCount = studentAppointments.filter((apt: any) => 
          ['cancelled', 'aborted', 'no_show'].includes(apt.status) && !apt.deleted_at
        ).length

        const deletedLessonsCount = studentAppointments.filter((apt: any) => 
          apt.deleted_at
        ).length

        // Letzter Termin (nur nicht gelöschte)
        const lastLesson = studentAppointments
          .filter((apt: any) => !apt.deleted_at)
          .sort((a: any, b: any) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())[0]
        
        console.log(`🔍 Student ${(student as any).first_name} ${(student as any).last_name} - Appointments:`, studentAppointments.length)

        // ✅ Alle Berechnungen verwenden jetzt bereits geladene Daten
        console.log(`🔍 Student ${(student as any).first_name} ${(student as any).last_name} - Appointments loaded:`, studentAppointments.length)

        return {
          ...(student as any),
          assignedInstructor,
          scheduledLessonsCount: scheduledLessonsCount || 0,
          completedLessonsCount: completedLessonsCount || 0,
          cancelledLessonsCount: cancelledLessonsCount || 0,
          deletedLessonsCount: deletedLessonsCount || 0,
          lessonsCount: (scheduledLessonsCount || 0) + (completedLessonsCount || 0) + (cancelledLessonsCount || 0), // Gesamt alle Termine
          lastLesson: lastLesson?.start_time || null,
          // Formatierte Adresse
          fullAddress: [(student as any).street, (student as any).street_nr, (student as any).zip, (student as any).city]
            .filter(Boolean)
            .join(' '),
          // Payment provider korrekt mappen
          payment_provider: (student as any).payment_provider_customer_id ? 'Konfiguriert' : 'Nicht konfiguriert'
        }
      })

    students.value = enrichedStudents
    console.log('✅ Students loaded successfully:', students.value.length)
    console.log('📊 Sample student:', students.value[0])
    console.log('🔍 Final students list:', students.value.map((s: any) => ({ name: `${s.first_name} ${s.last_name}`, instructor: s.assignedInstructor })))

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
</style>