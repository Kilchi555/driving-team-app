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
             <!-- Bei "Kommende Termine" Section -->
              <div class="bg-white rounded-lg shadow p-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center">
                    <div class="ml-4">
                      <h3 class="text-sm font-medium text-gray-500 truncate">Kommende Termine</h3>
                      <p class="text-lg font-medium text-gray-900">{{ upcomingAppointments.length }}</p>
                    </div>
                  </div>
                  
                  <!-- NEU: Klickbarer Button -->
                  <button
                    @click="showUpcomingLessonsModal = true"
                    class="p-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm"
                  >
                    Details anzeigen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

       <!-- Bei "Absolvierte Lektionen" Section - mache den Bereich klickbar -->
        <div class="bg-white rounded-lg shadow p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <div class="ml-4">
                <h3 class="text-sm font-medium text-gray-500 truncate">Absolvierte Lektionen</h3>
                <p class="text-lg font-medium text-gray-900">{{ completedLessonsCount }} </p>
              </div>
            </div>
            
            <!-- NEU: Klickbarer Button -->
            <button
              @click="showEvaluationsModal = true"
              class="p-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
            >Bewertungen anzeigen
            </button>
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

    <!-- Modal Component -->
  <EvaluationsOverviewModal 
    :is-open="showEvaluationsModal"
    :lessons="lessons"
    @close="showEvaluationsModal = false"
  />

  <!-- Upcoming Lessons Modal -->
  <UpcomingLessonsModal 
    :is-open="showUpcomingLessonsModal"
    :lessons="appointments"
    @close="showUpcomingLessonsModal = false"
  />

    </div>
  </div>
</template>

<!-- CustomerDashboard.vue - Router-Fehler beheben -->

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { navigateTo } from '#app'
import { getSupabase } from '~/utils/supabase'
import { useAuthStore } from '~/stores/auth'
import { storeToRefs } from 'pinia'
import EvaluationsOverviewModal from './EvaluationsOverviewModal.vue'
import UpcomingLessonsModal from './UpcomingLessonsModal.vue'
// Composables
const authStore = useAuthStore()
const { user: currentUser, userRole, isClient } = storeToRefs(authStore)

// State
const isLoading = ref(true)
const error = ref<string | null>(null)
const appointments = ref<any[]>([])
const locations = ref<any[]>([])
const staff = ref<any[]>([])
const lessons = ref<any[]>([]) 
const showEvaluationsModal = ref(false) 
const showUpcomingLessonsModal = ref(false)
// Computed properties
const completedLessonsCount = computed(() => {
  return appointments.value?.filter(apt => apt.status === 'completed').length || 0
})

const recentEvaluations = computed(() => {
  // Erstmal leer - hier würden die echten Bewertungen kommen
  const evaluations: any[] = []
  
  lessons.value?.forEach(lesson => {
    if (lesson.criteria_evaluations && lesson.criteria_evaluations.length > 0) {
      lesson.criteria_evaluations.forEach((evaluation: any) => {
        evaluations.push({
          criteria_id: evaluation.criteria_id,
          criteria_name: evaluation.criteria_name,
          criteria_rating: evaluation.criteria_rating,
          lesson_date: lesson.start_time,
          sort_date: new Date(lesson.start_time).getTime()
        })
      })
    }
  })

  // Sortiere nach Datum (neueste zuerst)
  return evaluations.sort((a, b) => b.sort_date - a.sort_date)
})

const totalEvaluationsCount = computed(() => recentEvaluations.value.length)

const upcomingAppointments = computed(() => {
  const now = new Date()
  return appointments.value.filter(apt => 
    new Date(apt.start_time) > now
  ).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
})

const completedAppointments = computed(() => {
  const now = new Date()
  return appointments.value.filter(apt => 
    new Date(apt.end_time) < now
  ).sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
})

const unpaidAppointments = computed(() => {
  return appointments.value.filter(apt => !apt.is_paid)
})

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

    console.log('🔍 Loading appointments for user:', userData.id)

    // 1. Lade Appointments
    const { data: appointmentsData, error: appointmentsError } = await supabase
      .from('appointments')
        .select(`
        id,
        title,
        start_time,
        end_time,
        duration_minutes,
        status,
        location_id,
        type,
        user_id,
        staff_id,
        price_per_minute,
        is_paid,
        notes (
          id,
          staff_rating,
          staff_note
        )
      `)
      .eq('user_id', userData.id)
      .order('start_time', { ascending: false })

    if (appointmentsError) throw appointmentsError
    console.log('✅ Appointments loaded:', appointmentsData?.length || 0)

    // 2. Lade Locations separat
    const locationIds = [...new Set(appointmentsData?.map(a => a.location_id).filter(Boolean))]
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

    // 3. Lade Bewertungen - KORRIGIERTE QUERY
    const appointmentIds = appointmentsData?.map(a => a.id) || []
    console.log('🔍 Searching evaluations for appointments:', appointmentIds.length)

    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select(`
        appointment_id,
        evaluation_criteria_id,
        criteria_rating,
        criteria_note
      `)
      .in('appointment_id', appointmentIds)
      .not('evaluation_criteria_id', 'is', null)
      .not('criteria_rating', 'is', null)

    if (notesError) {
      console.error('❌ Notes error:', notesError)
      throw notesError
    }

    console.log('✅ Evaluations loaded:', notes?.length || 0)

    // 4. Lade Criteria-Details separat - KORRIGIERT ohne category_id
    const criteriaIds = [...new Set(notes?.map(n => n.evaluation_criteria_id).filter(Boolean))]
    let criteriaMap: Record<string, any> = {}

    if (criteriaIds.length > 0) {
      console.log('🔍 Loading criteria details for:', criteriaIds.length, 'criteria')
      
      // Nur die verfügbaren Spalten laden
      const { data: criteria, error: criteriaError } = await supabase
        .from('evaluation_criteria')
        .select('id, name, short_code')
        .in('id', criteriaIds)

      if (criteriaError) {
        console.error('❌ Criteria error:', criteriaError)
        // Fallback: Erstelle leere criteriaMap Einträge
        criteriaIds.forEach(id => {
          criteriaMap[id] = {
            name: 'Bewertungskriterium',
            short_code: null,
            category_name: null
          }
        })
      } else if (criteria) {
        console.log('✅ Criteria loaded:', criteria.length)
        console.log('📊 Sample criteria:', criteria[0])
        
        // Erstelle criteriaMap
        criteriaMap = criteria.reduce((acc, crit) => {
          acc[crit.id] = {
            name: crit.name || 'Unbekanntes Kriterium',
            short_code: crit.short_code,
            category_name: null // Erstmal ohne Kategorien
          }
          return acc
        }, {} as Record<string, any>)
        
        console.log('📊 CriteriaMap sample:', Object.values(criteriaMap)[0])
      }
    }

    console.log('✅ Criteria details loaded:', Object.keys(criteriaMap).length)

    // 5. Verarbeite Notes zu Criteria Evaluations
    const notesByAppointment = (notes || []).reduce((acc: Record<string, any[]>, note: any) => {
      if (!acc[note.appointment_id]) {
        acc[note.appointment_id] = []
      }
      
      const criteriaDetails = criteriaMap[note.evaluation_criteria_id]
      
      if (note.evaluation_criteria_id && note.criteria_rating !== null && criteriaDetails) {
        acc[note.appointment_id].push({
          criteria_id: note.evaluation_criteria_id,
          criteria_name: criteriaDetails.name || 'Unbekannt',
          criteria_short_code: criteriaDetails.short_code || null,
          criteria_rating: note.criteria_rating,
          criteria_note: note.criteria_note || '',
          criteria_category_name: criteriaDetails.category_name || null
        })
      }
      
      return acc
    }, {} as Record<string, any[]>)

    // 6. Kombiniere alles
    const lessonsWithEvaluations = (appointmentsData || []).map(appointment => ({
      ...appointment,
      location_name: locationsMap[appointment.location_id] || null,
      criteria_evaluations: notesByAppointment[appointment.id] || []
    }))

    console.log('✅ Final lessons with evaluations:', lessonsWithEvaluations.length)
    console.log('📊 Lessons with evaluations:', lessonsWithEvaluations.filter(l => l.criteria_evaluations.length > 0).length)

    // Setze beide Arrays
    appointments.value = lessonsWithEvaluations
    lessons.value = lessonsWithEvaluations

  } catch (err: any) {
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
  } catch (err: any) {
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
  } catch (err: any) {
    console.error('❌ Error loading staff:', err)
  }
}

const handleLogout = async () => {
  try {
    const supabase = getSupabase()
    await authStore.logout(supabase)
    await navigateTo('/') // Zurück zu navigateTo - das sollte in Nuxt 3 verfügbar sein
  } catch (err: any) {
    console.error('❌ Fehler beim Abmelden:', err)
  }
}

const getRatingColorPreview = (rating: number) => {
  const colors = {
    1: 'bg-red-100 text-red-700',
    2: 'bg-orange-100 text-orange-700',
    3: 'bg-yellow-100 text-yellow-700',
    4: 'bg-blue-100 text-blue-700',
    5: 'bg-green-100 text-green-700',
    6: 'bg-emerald-100 text-emerald-700'
  }
  return colors[rating as keyof typeof colors] || 'bg-gray-100 text-gray-700'
}

// Watch for user role changes and redirect if needed
watch([currentUser, userRole], ([newUser, newRole]) => {
  if (newUser && !isClient.value) {
    console.log('🔄 User is not a client, redirecting to main dashboard')
    navigateTo('/')
  }
}, { immediate: true })

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
  } catch (err: any) {
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
</style>