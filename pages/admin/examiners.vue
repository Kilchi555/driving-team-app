<!-- pages/admin/examiners.vue -->
<template>
  <div>
    <div class="p-4">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Experten-Verwaltung</h1>
          <p class="text-gray-600">Verwalten Sie alle Prüfungsexperten im System</p>
        </div>
        <button
          @click="showAddModal = true"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Neuen Experten hinzufügen
        </button>
      </div>

      <!-- Statistiken -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Gesamt Experten</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ totalExaminers }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Aktive Experten</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ activeExaminers }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Durchschnittsbewertung</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ averageRating.toFixed(1) }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Prüfungen diesen Monat</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ examsThisMonth }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="bg-white shadow rounded-lg">
        <SkeletonLoader type="table" :columns="6" :rows="3" />
      </div>

      <!-- Experten Liste -->
      <div v-else class="bg-white shadow rounded-lg">
        <div class="px-4 py-3 border-b border-gray-200">
          <h3 class="text-base font-medium text-gray-900">Alle Experten</h3>
        </div>
        
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Experte
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bewertung
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="examiner in examiners" :key="examiner.id" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                      <div class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span class="text-sm font-medium text-blue-600">
                          {{ (examiner.first_name || '').charAt(0) }}{{ examiner.last_name.charAt(0) }}
                        </span>
                      </div>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">
                        {{ (examiner.first_name ? examiner.first_name + ' ' : '') }}{{ examiner.last_name }}
                      </div>
                      <div class="text-sm text-gray-500">
                        {{ examiner.contact_info?.email || 'Keine E-Mail' }}
                      </div>
                    </div>
                  </div>
                </td>
                
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="flex items-center space-x-1">
                      <span 
                        v-for="star in 6" 
                        :key="star"
                        :class="[
                          'text-sm',
                          star <= examiner.average_rating 
                            ? 'text-yellow-400' 
                            : 'text-gray-300'
                        ]"
                      >
                        ★
                      </span>
                    </div>
                    <span class="ml-2 text-sm text-gray-500">
                      {{ examiner.average_rating?.toFixed(1) || '0.0' }}
                    </span>
                  </div>
                </td>
                
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="[
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    examiner.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  ]">
                    {{ examiner.is_active ? 'Aktiv' : 'Inaktiv' }}
                  </span>
                </td>
                
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div class="flex space-x-2">
                    <button
                      @click="editExaminer(examiner)"
                      class="text-blue-600 hover:text-blue-900"
                      title="Bearbeiten"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    
                    <button
                      @click="toggleExaminerStatus(examiner)"
                      :class="[
                        'hover:text-gray-900',
                        examiner.is_active ? 'text-red-600' : 'text-green-600'
                      ]"
                      :title="examiner.is_active ? 'Deaktivieren' : 'Aktivieren'"
                    >
                      <svg v-if="examiner.is_active" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Add/Edit Examiner Modal -->
    <div v-if="showAddModal || editingExaminer" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold">
            {{ editingExaminer ? 'Experten bearbeiten' : 'Neuen Experten hinzufügen' }}
          </h3>
        </div>
        
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Vorname *</label>
            <input v-model="formData.first_name" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nachname *</label>
            <input v-model="formData.last_name" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
          </div>
          
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
            <input v-model="formData.email" type="email" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
            <input v-model="formData.phone" type="tel" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>
          
        </div>
        
        <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button @click="cancelEdit" class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">
            Abbrechen
          </button>
          <button @click="saveExaminer" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            {{ editingExaminer ? 'Aktualisieren' : 'Hinzufügen' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted } from 'vue'
import { navigateTo } from '#imports'
import { useAuthStore } from '~/stores/auth'
import SkeletonLoader from '~/components/SkeletonLoader.vue'

// Configure page meta for admin layout
definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

// State
const examiners = ref<any[]>([])
const isLoading = ref(false)
const showAddModal = ref(false)
const editingExaminer = ref<any>(null)

// Form data
const formData = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: ''
})


// Computed
const totalExaminers = computed(() => examiners.value.length)
const activeExaminers = computed(() => examiners.value.filter(e => e.is_active).length)
const averageRating = computed(() => {
  const ratings = examiners.value
    .map(e => e.average_rating)
    .filter(r => r && r > 0)
  
  if (ratings.length === 0) return 0
  return ratings.reduce((sum, r) => sum + r, 0) / ratings.length
})
const examsThisMonth = computed(() => {
  // TODO: Implement actual exam count for this month
  return 0
})

// Methods
const loadExaminers = async () => {
  isLoading.value = true
  
  try {
    const supabase = getSupabase()
    
    // Get current user's tenant_id
    const user = authStore.user // ✅ MIGRATED
    if (!user) throw new Error('Nicht angemeldet')

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError) throw new Error('Fehler beim Laden der Benutzerinformationen')
    if (!userProfile.tenant_id) throw new Error('Kein Tenant zugewiesen')

    logger.debug('🔍 Loading examiners for tenant:', userProfile.tenant_id)
    
    // Load examiners with their average ratings (filtered by tenant)
    const { data, error } = await supabase
      .from('examiners')
      .select(`
        *,
        exam_results(
          examiner_behavior_rating
        )
      `)
      .eq('tenant_id', userProfile.tenant_id)
      .order('last_name')
    
    if (error) throw error
    
    // Calculate average ratings
    const examinersWithRatings = (data || []).map(examiner => {
      const ratings = examiner.exam_results
        ?.map((r: any) => r.examiner_behavior_rating)
        .filter((r: number) => r && r > 0) || []
      
      const average = ratings.length > 0 
        ? ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length 
        : 0
      
      return {
        ...examiner,
        average_rating: average
      }
    })
    
    examiners.value = examinersWithRatings
    
  } catch (err: any) {
    console.error('❌ Error loading examiners:', err)
  } finally {
    isLoading.value = false
  }
}

const editExaminer = (examiner: any) => {
  editingExaminer.value = examiner
  formData.value = {
    first_name: examiner.first_name,
    last_name: examiner.last_name,
    email: examiner.contact_info?.email || '',
    phone: examiner.contact_info?.phone || ''
  }
}

const cancelEdit = () => {
  editingExaminer.value = null
  showAddModal.value = false
  resetForm()
}

const resetForm = () => {
  formData.value = {
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  }
}

const saveExaminer = async () => {
  if (!formData.value.first_name || !formData.value.last_name) {
    alert('Bitte füllen Sie alle Pflichtfelder aus.')
    return
  }
  
  try {
    const supabase = getSupabase()
    
    // Get current user's tenant_id
    const user = authStore.user // ✅ MIGRATED
    if (!user) throw new Error('Nicht angemeldet')

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError) throw new Error('Fehler beim Laden der Benutzerinformationen')
    if (!userProfile.tenant_id) throw new Error('Kein Tenant zugewiesen')
    
    const examinerData = {
      first_name: formData.value.first_name.trim(),
      last_name: formData.value.last_name.trim(),
      contact_info: {
        email: formData.value.email.trim() || null,
        phone: formData.value.phone.trim() || null
      }
    }
    
    if (editingExaminer.value) {
      // Update existing
      const { error } = await supabase
        .from('examiners')
        .update(examinerData)
        .eq('id', editingExaminer.value.id)
        .eq('tenant_id', userProfile.tenant_id) // Ensure tenant can only update their own examiners
      
      if (error) throw error
      
    } else {
      // Create new
      const { error } = await supabase
        .from('examiners')
        .insert({
          ...examinerData,
          tenant_id: userProfile.tenant_id,
          is_active: true
        })
      
      if (error) throw error
    }
    
    await loadExaminers()
    cancelEdit()
    
  } catch (err: any) {
    console.error('❌ Error saving examiner:', err)
    alert(`Fehler beim Speichern: ${err.message}`)
  }
}

const toggleExaminerStatus = async (examiner: any) => {
  try {
    const supabase = getSupabase()
    
    // Get current user's tenant_id
    const user = authStore.user // ✅ MIGRATED
    if (!user) throw new Error('Nicht angemeldet')

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError) throw new Error('Fehler beim Laden der Benutzerinformationen')
    if (!userProfile.tenant_id) throw new Error('Kein Tenant zugewiesen')
    
    const { error } = await supabase
      .from('examiners')
      .update({ is_active: !examiner.is_active })
      .eq('id', examiner.id)
      .eq('tenant_id', userProfile.tenant_id) // Ensure tenant can only toggle their own examiners
    
    if (error) throw error
    
    await loadExaminers()
    
  } catch (err: any) {
    console.error('❌ Error toggling examiner status:', err)
    alert(`Fehler beim Ändern des Status: ${err.message}`)
  }
}

// Lifecycle
// Load data immediately when component is created (not waiting for mount)
loadExaminers()

// Auth check
const authStore = useAuthStore()

onMounted(async () => {
  logger.debug('🔍 Examiners page mounted, checking auth...')
  
  // Warte kurz auf Auth-Initialisierung
  let attempts = 0
  while (!authStore.isInitialized && attempts < 10) {
    await new Promise(resolve => setTimeout(resolve, 100))
    attempts++
  }
  
  logger.debug('🔍 Auth state:', {
    isInitialized: authStore.isInitialized,
    isLoggedIn: authStore.isLoggedIn,
    isAdmin: authStore.isAdmin,
    hasProfile: authStore.hasProfile
  })
  
  // Prüfe ob User eingeloggt ist
  if (!authStore.isLoggedIn) {
    logger.debug('❌ User not logged in, redirecting to dashboard')
    return navigateTo('/dashboard')
  }
  
  // Prüfe ob User Admin ist
  if (!authStore.isAdmin) {
    logger.debug('❌ User not admin, redirecting to dashboard')
    return navigateTo('/dashboard')
  }
  
  logger.debug('✅ Auth check passed, loading examiners...')
  // Page is already displayed, data loads in background
  logger.debug('👨‍🏫 Examiners page mounted, data loading in background')
})
</script>
