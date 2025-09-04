<!-- pages/customers.vue - Mobile-Optimierte Version -->
<template>
  <!-- Loading State -->
  <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
    <LoadingLogo size="2xl" />
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
            @click="navigateToAuswahl"
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
            class="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
          <div class="absolute left-3 top-2.5 text-gray-400">
          </div>
        </div>

        <!-- Filter Toggles -->
        <!-- Filter Toggles -->
        <div class="flex gap-4 items-center text-sm">
          <!-- Inactive Toggle -->
          <div class="flex items-center justify-between rounded-lg">
            <span class="text-sm font-medium text-gray-700 mr-2">
              {{ showInactive ? 'Nur Inaktive' : 'Nur Aktive' }}
            </span>
            <label class="relative inline-flex items-center cursor-pointer">
              <input 
                v-model="showInactive" 
                type="checkbox" 
                class="sr-only peer"
                @change="() => console.log('🔄 Inactive toggle changed to:', showInactive)"
              >
              <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <!-- All Students Toggle (nur für Staff) -->
          <div v-if="currentUser.role === 'staff' || 'admin'" class="flex items-center justify-between rounded-lg">
            <span class="text-sm font-medium text-gray-700 mr-2">Alle Fahrschüler</span>
            <label class="relative inline-flex items-center cursor-pointer">
              <input v-model="showAllStudents" type="checkbox" class="sr-only peer" @change="loadStudents">
              <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        <!-- Statistics -->
        <div class="flex gap-3 text-xs sm:text-sm text-gray-600">
          <span v-if="!showAllStudents">Meine Schüler: {{ students.length }}</span>
          <span v-else>Alle Schüler: {{ students.length }}</span>
          <span>Aktiv: {{ students.filter(s => s.is_active).length }}</span>
          <span>Inaktiv: {{ students.filter(s => !s.is_active).length }}</span>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-hidden">
      <!-- Loading Students -->
      <div v-if="isLoading" class="flex items-center justify-center py-8">
        <LoadingLogo size="xl" />
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
                    <span v-if="student.assignedInstructor">
                      Fahrlehrer: {{ student.assignedInstructor }}
                    </span>
              <span v-if="student.completedLessonsCount" class="text-gray-400">
                Lektionen: {{ student.completedLessonsCount }}
              </span>

                  </div>
                  
                  <!-- Right: Date -->
                  <span v-if="student.lastLesson" class="text-xs text-gray-400">
                    Letzter Termin: {{ formatRelativeDate(student.lastLesson) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Mobile: Floating Action Button -->
        <div class="sm:hidden fixed top-3 right-3 z-10">
          <button 
            v-if="currentUser.role !== 'client'"
            @click="navigateToAuswahl"
            class="bg-green-600 text-white p-2 rounded-full shadow-lg hover:bg-green-700 transition-colors"
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
const error = ref<string | null>(null)
const searchQuery = ref('')
const showInactive = ref(false)
const showAllStudents = ref(false)

// Computed
const filteredStudents = computed(() => {
  console.log('🔄 filteredStudents computed triggered:', {
    studentsCount: students.value.length,
    showInactive: showInactive.value,
    searchQuery: searchQuery.value
  })
  
  let filtered = students.value

  // Filter by active/inactive
  if (!showInactive.value) {
    // ✅ Regler AUS: Nur aktive Schüler
    const beforeFilter = filtered.length
    filtered = filtered.filter(s => s.is_active)
    const afterFilter = filtered.length
    console.log(`✅ Showing active students only: ${beforeFilter} → ${afterFilter} students`)
    
    // ✅ DEBUG: Zeige welche Schüler gefiltert wurden
    if (beforeFilter !== afterFilter) {
      const filteredOut = students.value.filter(s => !s.is_active)
      console.log('🚫 Filtered out inactive students:', filteredOut.map(s => `${s.first_name} ${s.last_name}`))
    }
  } else {
    // ✅ Regler AN: Nur inaktive Schüler
    const beforeFilter = filtered.length
    filtered = filtered.filter(s => !s.is_active)
    const afterFilter = filtered.length
    console.log(`✅ Showing inactive students only: ${beforeFilter} → ${afterFilter} students`)
    
    // ✅ DEBUG: Zeige welche Schüler gefiltert wurden
    if (beforeFilter !== afterFilter) {
      const filteredOut = students.value.filter(s => s.is_active)
      console.log('🚫 Filtered out active students:', filteredOut.map(s => `${s.first_name} ${s.last_name}`))
    }
  }

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

  console.log('🔄 Final filtered students:', filtered.length)
  return filtered
})

// Navigation zum Register
const navigateToAuswahl = () => {
  console.log('🚀 Navigating to register page for new student')
  navigateTo('/auswahl')
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

    // ✅ KORRIGIERT: Filterung basierend auf Benutzerrolle
    if (currentUser.value.role === 'staff' && !showAllStudents.value) {
      // Staff sieht alle Schüler (nicht nur assigned_staff_id)
      console.log('📚 Loading all students for staff (will filter by lessons later):', currentUser.value.id)
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

    // ✅ NEU: Intelligente Filterung basierend auf showAllStudents
    let studentsToProcess = data
    
    // ✅ DEBUG: Zeige alle geladenen Schüler
    console.log('🔍 All loaded students:', data.map(s => ({ 
      id: s.id, 
      name: `${s.first_name} ${s.last_name}`, 
      is_active: s.is_active,
      email: s.email 
    })))
    
    // ✅ DEBUG: Zeige is_active Status aller Schüler
    const activeCount = data.filter(s => s.is_active).length
    const inactiveCount = data.filter(s => !s.is_active).length
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
      for (const student of data) {
        console.log(`🔍 Checking student: ${student.first_name} ${student.last_name} (ID: ${student.id})`)
        
        // ✅ KORRIGIERT: Prüfe ob der Schüler Lektionen mit dem aktuellen Fahrlehrer hat
        const { data: myLessons, error: lessonError } = await supabase
          .from('appointments')
          .select('staff_id')
          .eq('user_id', student.id)
          .eq('staff_id', currentUser.value.id)
          .limit(1)

        if (lessonError) {
          console.error('❌ Error checking my lessons for student:', student.id, lessonError)
          continue
        }

        console.log(`🔍 Lessons found for ${student.first_name}:`, myLessons)

        if (myLessons && myLessons.length > 0) {
          studentsWithMyLessons.push(student)
          console.log(`✅ Added ${student.first_name} to my students list`)
        } else {
          console.log(`⚠️ No lessons found for ${student.first_name} with current staff`)
          
          // ✅ DEBUG: Zeige alle Termine für diesen Schüler
          const { data: allLessons } = await supabase
            .from('appointments')
            .select('staff_id, start_time, status')
            .eq('user_id', student.id)
            .limit(5)
          
          console.log(`🔍 All lessons for ${student.first_name}:`, allLessons)
        }
      }
      
      studentsToProcess = studentsWithMyLessons
      console.log(`✅ Found ${studentsWithMyLessons.length} students with lessons from current staff out of ${data.length} total`)
    } else {
      // Alle aktiven Schüler der ganzen Fahrschule
      console.log('👑 Loading all active students from entire driving school')
      studentsToProcess = data.filter(student => student.is_active)
      console.log(`✅ Found ${studentsToProcess.length} active students in entire driving school`)
    }

    // Erweiterte Schüler-Daten mit zusätzlichen Informationen
    const enrichedStudents = await Promise.all(
      studentsToProcess.map(async (student: any) => {
        // ✅ NEU: Alle Fahrlehrer laden, die Lektionen mit dem Schüler hatten
        let assignedInstructor = 'Nicht zugewiesen'
        
        try {
          console.log('🔍 Loading instructors for student:', student.id)
          
          const { data: lessonInstructors, error: lessonError } = await supabase
            .from('appointments')
            .select('staff_id')
            .eq('user_id', student.id)
            .not('staff_id', 'is', null)

          if (lessonError) {
            console.error('❌ Error loading lesson instructors:', lessonError)
          } else {
            console.log('🔍 Lesson instructors found:', lessonInstructors)
          }

          if (lessonInstructors && lessonInstructors.length > 0) {
            // Eindeutige Fahrlehrer-IDs extrahieren
            const uniqueInstructorIds = [...new Set(lessonInstructors.map(l => l.staff_id))]
            console.log('🔍 Unique instructor IDs:', uniqueInstructorIds)
            
            // Fahrlehrer-Daten laden
            const { data: instructorData, error: instructorError } = await supabase
              .from('users')
              .select('first_name, last_name')
              .in('id', uniqueInstructorIds)

            if (instructorError) {
              console.error('❌ Error loading instructor data:', instructorError)
            } else {
              console.log('🔍 Instructor data loaded:', instructorData)
            }

            if (instructorData && instructorData.length > 0) {
              // Initialen aller Fahrlehrer anzeigen
              const instructorInitials = instructorData.map(instructor => 
                `${instructor.first_name.charAt(0)}.${instructor.last_name.charAt(0)}.`
              ).join(', ')
              
              assignedInstructor = instructorInitials
              console.log('✅ Final instructor display:', assignedInstructor)
            }
          } else {
            console.log('⚠️ No lesson instructors found for student:', student.id)
          }
        } catch (err) {
          console.error('❌ Error in instructor loading logic:', err)
        }

        // Anzahl geplante Termine (scheduled) - nur nicht gelöschte
        const { count: scheduledLessonsCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', student.id)
          .eq('status', 'scheduled')
          .is('deleted_at', null)

        // Anzahl durchgeführte Termine (confirmed/completed) - nur nicht gelöschte
        const { count: completedLessonsCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', student.id)
          .in('status', ['confirmed', 'completed'])
          .is('deleted_at', null)

        // Anzahl gecancellte Termine (auch gelöschte gecancelte Termine zählen)
        const { count: cancelledLessonsCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', student.id)
          .in('status', ['cancelled', 'aborted', 'no_show'])
          // ✅ Auch gelöschte gecancelte Termine zählen

        // DEBUG: Alle Status für diesen Schüler anzeigen
        const { data: allStatuses } = await supabase
          .from('appointments')
          .select('status')
          .eq('user_id', student.id)
          .is('deleted_at', null)
        
        console.log(`🔍 Student ${student.first_name} ${student.last_name} - All appointment statuses:`, allStatuses?.map(s => s.status))
        console.log(`🚫 Cancelled lessons count for ${student.first_name}:`, cancelledLessonsCount)

        // Anzahl gelöschte Termine (soft delete)
        const { count: deletedLessonsCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', student.id)
          .not('deleted_at', 'is', null)

        // DEBUG: Gelöschte Termine anzeigen
        const { data: deletedAppointments } = await supabase
          .from('appointments')
          .select('status, deleted_at')
          .eq('user_id', student.id)
          .not('deleted_at', 'is', null)
        
        console.log(`🗑️ Deleted appointments for ${student.first_name}:`, deletedAppointments)

        // Letzte durchgeführte Lektion finden (nicht gecancelt, nicht gelöscht)
        const { data: lastLessonData } = await supabase
          .from('appointments')
          .select('start_time')
          .eq('user_id', student.id)
          .in('status', ['confirmed', 'completed'])
          .is('deleted_at', null)
          .order('start_time', { ascending: false })
          .limit(1)

        return {
          ...student,
          assignedInstructor,
          scheduledLessonsCount: scheduledLessonsCount || 0,
          completedLessonsCount: completedLessonsCount || 0,
          cancelledLessonsCount: cancelledLessonsCount || 0,
          deletedLessonsCount: deletedLessonsCount || 0,
          lessonsCount: (scheduledLessonsCount || 0) + (completedLessonsCount || 0) + (cancelledLessonsCount || 0), // Gesamt alle Termine
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
    console.log('🔍 Final students list:', students.value.map(s => ({ name: `${s.first_name} ${s.last_name}`, instructor: s.assignedInstructor })))

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