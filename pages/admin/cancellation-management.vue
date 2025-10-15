<template>
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Absage-Management</h1>
      <p class="text-gray-600">Statistiken anzeigen und Absage-Gründe verwalten</p>
    </div>

    <!-- Tab Navigation -->
    <div class="border-b border-gray-200 mb-6">
      <nav class="-mb-px flex space-x-8">
        <button
          @click="activeTab = 'stats'"
          :class="[
            'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
            activeTab === 'stats'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
        >
          📊 Statistiken
        </button>
        <button
          @click="activeTab = 'reasons'"
          :class="[
            'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
            activeTab === 'reasons'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
        >
          ⚙️ Gründe verwalten
        </button>
        <button
          @click="activeTab = 'policies'"
          :class="[
            'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
            activeTab === 'policies'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
        >
          📋 Policies verwalten
        </button>
      </nav>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      <!-- Statistics Tab -->
      <div v-if="activeTab === 'stats'" class="space-y-6">
        <!-- Loading State -->
        <div v-if="isLoadingStats" class="flex justify-center items-center py-12">
          <div class="text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p class="text-gray-600">Lade Statistiken...</p>
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="statsError" class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div class="flex">
            <div class="text-red-400 mr-3">⚠️</div>
            <div>
              <h3 class="text-red-800 font-medium">Fehler beim Laden der Statistiken</h3>
              <p class="text-red-700 mt-1">{{ statsError }}</p>
            </div>
          </div>
        </div>

        <!-- Stats Content -->
        <div v-else-if="stats" class="space-y-6">
          <!-- Summary Cards -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="bg-white rounded-lg shadow p-6">
              <div class="flex items-center">
                <div class="text-3xl text-red-500 mr-4">❌</div>
                <div>
                  <p class="text-sm font-medium text-gray-600">Gesamte Absagen</p>
                  <p class="text-2xl font-bold text-gray-900">{{ stats.total_cancellations }}</p>
                </div>
              </div>
            </div>

            <div class="bg-white rounded-lg shadow p-6">
              <div class="flex items-center">
                <div class="text-3xl text-orange-500 mr-4">📊</div>
                <div>
                  <p class="text-sm font-medium text-gray-600">Häufigster Grund</p>
                  <p class="text-lg font-bold text-gray-900">
                    {{ topReasons[0]?.reason_name || 'Keine Daten' }}
                  </p>
                  <p class="text-sm text-gray-500">
                    {{ topReasons[0]?.percentage || 0 }}% aller Absagen
                  </p>
                </div>
              </div>
            </div>

            <div class="bg-white rounded-lg shadow p-6">
              <div class="flex items-center">
                <div class="text-3xl text-blue-500 mr-4">📅</div>
                <div>
                  <p class="text-sm font-medium text-gray-600">Letzte Absage</p>
                  <p class="text-lg font-bold text-gray-900">
                    {{ formatDate(stats.recent_cancellations[0]?.cancelled_at) || 'Keine Daten' }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Absage-Gründe Chart -->
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Absage-Gründe</h2>
            
            <div v-if="stats.stats_by_reason.length === 0" class="text-center py-8 text-gray-500">
              Keine Absage-Daten verfügbar
            </div>
            
            <div v-else class="space-y-4">
              <div v-for="reason in stats.stats_by_reason" :key="reason.reason_id" 
                   class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div class="flex items-center">
                  <div :class="[
                    'w-4 h-4 rounded-full mr-3',
                    reason.cancellation_type === 'student' ? 'bg-green-500' : 
                    reason.cancellation_type === 'staff' ? 'bg-blue-500' : 'bg-gray-500'
                  ]"></div>
                  <div>
                    <p class="font-medium text-gray-900">{{ reason.reason_name }}</p>
                    <p class="text-sm text-gray-500">
                      {{ reason.cancellation_type === 'student' ? '👨‍🎓 Schüler' : 
                         reason.cancellation_type === 'staff' ? '👨‍🏫 Fahrlehrer' : '❓ Unbekannt' }} • 
                      Letzte Absage: {{ formatDate(reason.last_cancellation) }}
                    </p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-2xl font-bold text-gray-900">{{ reason.count }}</p>
                  <p class="text-sm text-gray-500">{{ reason.percentage }}%</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Neueste Absagen -->
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Neueste Absagen</h2>
            
            <div v-if="stats.recent_cancellations.length === 0" class="text-center py-8 text-gray-500">
              Keine neueren Absagen verfügbar
            </div>
            
            <div v-else class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Termin
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Datum
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grund
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Abgesagt von
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Absage-Datum
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="cancellation in stats.recent_cancellations" :key="cancellation.id">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {{ cancellation.title }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {{ formatDateTime(cancellation.start_time) }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {{ cancellation.reason_name }}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {{ cancellation.cancelled_by }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {{ formatDateTime(cancellation.cancelled_at) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- No Data State -->
        <div v-else class="text-center py-12">
          <div class="text-6xl text-gray-300 mb-4">📊</div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Keine Daten verfügbar</h3>
          <p class="text-gray-500">Es wurden noch keine Absage-Statistiken erfasst.</p>
          <div class="mt-4">
            <button 
              @click="loadStats" 
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Erneut laden
            </button>
          </div>
        </div>
      </div>

      <!-- Reasons Management Tab -->
      <div v-if="activeTab === 'reasons'" class="space-y-6">
        <!-- Loading State -->
        <div v-if="isLoadingReasons" class="flex justify-center items-center py-12">
          <div class="text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p class="text-gray-600">Lade Gründe...</p>
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="reasonsError" class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div class="flex">
            <div class="text-red-400 mr-3">⚠️</div>
            <div>
              <h3 class="text-red-800 font-medium">Fehler beim Laden der Gründe</h3>
              <p class="text-red-700 mt-1">{{ reasonsError }}</p>
            </div>
          </div>
        </div>

        <!-- Content -->
        <div v-else>
          <!-- Add New Reason Button -->
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-lg font-semibold text-gray-900">Alle Absage-Gründe</h2>
            <button
              @click="showAddModal = true"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              ➕ Neuer Grund
            </button>
          </div>

          <!-- Reasons List -->
          <div class="bg-white rounded-lg shadow overflow-hidden">
            <div class="px-6 py-3 bg-gray-50 border-b border-gray-200">
              <p class="text-sm text-gray-600">
                💡 <strong>Tipp:</strong> Klicken Sie auf eine Zeile zum Bearbeiten
              </p>
            </div>
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Typ
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr 
                  v-for="reason in sortedCancellationReasons" 
                  :key="reason.id"
                  @click="editReason(reason)"
                  class="hover:bg-blue-50 hover:shadow-sm cursor-pointer transition-all duration-200"
                >
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {{ reason.name_de }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span :class="[
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      reason.cancellation_type === 'student' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    ]">
                      {{ reason.cancellation_type === 'student' ? '👨‍🎓 Schüler' : '👨‍🏫 Fahrlehrer' }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      @click.stop="deleteReason(reason)"
                      class="text-red-600 hover:text-red-900 hover:bg-red-100 px-3 py-1 rounded transition-colors duration-200"
                    >
                      🗑️ Löschen
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Policies Management Tab -->
      <div v-if="activeTab === 'policies'" class="space-y-6">
        <CancellationPoliciesManager />
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal || editingReason" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">
          {{ editingReason ? 'Grund bearbeiten' : 'Neuer Grund' }}
        </h3>
        
        <form @submit.prevent="saveReason" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name (Deutsch)</label>
            <input
              v-model="reasonForm.name_de"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="z.B. Krankheit"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Typ</label>
            <select
              v-model="reasonForm.cancellation_type"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="student">👨‍🎓 Schüler</option>
              <option value="staff">👨‍🏫 Fahrlehrer</option>
            </select>
          </div>
          
          <div class="flex space-x-3">
            <button
              type="submit"
              :disabled="isLoadingReasons"
              class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {{ isLoadingReasons ? 'Speichere...' : 'Speichern' }}
            </button>
            <button
              type="button"
              @click="cancelEdit"
              class="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Abbrechen
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { navigateTo } from '#imports'
import { useAuthStore } from '~/stores/auth'
import { useCancellationStats } from '~/composables/useCancellationStats'
import { useCancellationReasons } from '~/composables/useCancellationReasons'
import { formatDateTime } from '~/utils/dateUtils'
import CancellationPoliciesManager from '~/components/admin/CancellationPoliciesManager.vue'

// Meta
definePageMeta({
  layout: 'admin',
  middleware: 'features'
})

// Composables
const { 
  stats, 
  isLoading: isLoadingStats, 
  error: statsError, 
  topReasons, 
  fetchCancellationStats 
} = useCancellationStats()

const { 
  allCancellationReasons, 
  isLoading: isLoadingReasons, 
  error: reasonsError, 
  fetchAllCancellationReasons,
  createCancellationReason,
  updateCancellationReason
} = useCancellationReasons()

// Computed: Sortiere Gründe nach Typ (Schüler zuerst, dann Fahrlehrer)
const sortedCancellationReasons = computed(() => {
  return [...allCancellationReasons.value].sort((a, b) => {
    // Erst nach Typ sortieren (student vor staff)
    if (a.cancellation_type !== b.cancellation_type) {
      return a.cancellation_type === 'student' ? -1 : 1
    }
    // Dann nach Name sortieren
    return a.name_de.localeCompare(b.name_de)
  })
})

// State
const activeTab = ref('stats')
const showAddModal = ref(false)
const editingReason = ref(null)
const reasonForm = ref({
  name_de: '',
  code: '',
  description_de: '',
  sort_order: 0
})

// Computed
const isLoading = computed(() => isLoadingStats.value || isLoadingReasons.value)

// Functions
const loadStats = async () => {
  try {
    await fetchCancellationStats()
  } catch (error) {
    console.error('❌ Error loading cancellation stats:', error)
  }
}

const editReason = (reason) => {
  editingReason.value = reason
  reasonForm.value = {
    name_de: reason.name_de,
    cancellation_type: reason.cancellation_type
  }
}

const cancelEdit = () => {
  showAddModal.value = false
  editingReason.value = null
  reasonForm.value = {
    name_de: '',
    cancellation_type: 'student'
  }
}

// Hilfsfunktion um einen eindeutigen Code zu generieren
const generateUniqueCode = (name: string, existingReasons: any[]) => {
  let baseCode = name.toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .substring(0, 20) // Maximal 20 Zeichen
  
  let code = baseCode
  let counter = 1
  
  // Prüfe ob der Code bereits existiert
  while (existingReasons.some(reason => reason.code === code)) {
    code = `${baseCode}_${counter}`
    counter++
  }
  
  return code
}

const saveReason = async () => {
  try {
    // Generiere eindeutigen Code
    const uniqueCode = generateUniqueCode(
      reasonForm.value.name_de, 
      allCancellationReasons.value
    )
    
    const reasonData = {
      ...reasonForm.value,
      code: uniqueCode,
      description_de: '',
      sort_order: 0,
      is_active: true
    }
    
    if (editingReason.value) {
      await updateCancellationReason(editingReason.value.id, reasonData)
    } else {
      await createCancellationReason(reasonData)
    }
    await fetchAllCancellationReasons()
    cancelEdit()
  } catch (error: any) {
    console.error('Error saving reason:', error)
    
    // Spezifische Fehlermeldungen
    if (error.code === '23505') {
      alert('Ein Absage-Grund mit diesem Namen existiert bereits. Bitte wählen Sie einen anderen Namen.')
    } else if (error.message?.includes('permission')) {
      alert('Keine Berechtigung zum Erstellen von Absage-Gründen.')
    } else {
      alert(`Fehler beim Speichern des Grundes: ${error.message || 'Unbekannter Fehler'}`)
    }
  }
}

const toggleReasonStatus = async (reason) => {
  try {
    await updateCancellationReason(reason.id, { is_active: !reason.is_active })
  } catch (error) {
    console.error('Error toggling reason status:', error)
  }
}

const deleteReason = async (reason) => {
  if (confirm(`Möchten Sie den Grund "${reason.name_de}" wirklich löschen?`)) {
    try {
      await deleteCancellationReason(reason.id)
      console.log('✅ Reason deleted successfully')
    } catch (error) {
      console.error('❌ Error deleting reason:', error)
      alert('Fehler beim Löschen des Grundes')
    }
  }
}

// Auth check
const authStore = useAuthStore()

// Lade Daten beim Mount
onMounted(async () => {
  console.log('🔍 Cancellation management page mounted, checking auth...')
  
  // Warte kurz auf Auth-Initialisierung
  let attempts = 0
  while (!authStore.isInitialized && attempts < 10) {
    await new Promise(resolve => setTimeout(resolve, 100))
    attempts++
  }
  
  console.log('🔍 Auth state:', {
    isInitialized: authStore.isInitialized,
    isLoggedIn: authStore.isLoggedIn,
    isAdmin: authStore.isAdmin,
    hasProfile: authStore.hasProfile
  })
  
  // Prüfe ob User eingeloggt ist
  if (!authStore.isLoggedIn) {
    console.log('❌ User not logged in, redirecting to dashboard')
    return navigateTo('/dashboard')
  }
  
  // Prüfe ob User Admin ist
  if (!authStore.isAdmin) {
    console.log('❌ User not admin, redirecting to dashboard')
    return navigateTo('/dashboard')
  }
  
  console.log('✅ Auth check passed, loading cancellation management...')
  
  // Original onMounted logic
  await Promise.all([
    loadStats(),
    fetchAllCancellationReasons()
  ])
})

// Hilfsfunktionen
const formatDate = (dateString: string) => {
  if (!dateString) return 'Unbekannt'
  return new Date(dateString).toLocaleDateString('de-CH')
}
</script>
