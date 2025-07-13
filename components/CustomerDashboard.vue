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
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Kommende Termine</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ upcomingAppointments.length }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Absolvierte Lektionen</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ completedAppointments.length }}</dd>
                </dl>
              </div>
            </div>
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

      <!-- Rest of the template stays the same... -->
      <!-- ... (Tab navigation and content from original component) ... -->
    </div>
  </div>
</template>

<script setup>
import { formatDate, formatTime } from '~/utils/dateUtils'
import { getSupabase } from '~/utils/supabase'

// Composables
const authStore = useAuthStore()
const { user: currentUser, userRole, isClient } = storeToRefs(authStore)

// State
const isLoading = ref(true)
const error = ref(null)
const appointments = ref([])
const locations = ref([])
const staff = ref([])

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

// Computed
const upcomingAppointments = computed(() => {
  const now = new Date()
  return appointments.value.filter(apt => 
    new Date(apt.start_time) > now
  ).sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
})

const completedAppointments = computed(() => {
  const now = new Date()
  return appointments.value.filter(apt => 
    new Date(apt.end_time) < now
  ).sort((a, b) => new Date(b.start_time) - new Date(a.start_time))
})

const unpaidAppointments = computed(() => {
  return appointments.value.filter(apt => !apt.is_paid)
})

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

    // Load appointments with internal user_id
    const { data, error: fetchError } = await supabase
      .from('appointments')
      .select(`
        *,
        notes (
          id,
          staff_rating,
          staff_note
        )
      `)
      .eq('user_id', userData.id)
      .order('start_time', { ascending: false })

    if (fetchError) throw fetchError
    appointments.value = data || []
  } catch (err) {
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
  } catch (err) {
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
  } catch (err) {
    console.error('❌ Error loading staff:', err)
  }
}

const handleLogout = async () => {
  try {
    const supabase = getSupabase()
    await authStore.logout(supabase)
    await navigateTo('/')
  } catch (err) {
    console.error('❌ Fehler beim Abmelden:', err)
  }
}

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
  } catch (err) {
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