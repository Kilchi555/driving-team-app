<!-- pages/customers.vue - MINIMALE VERSION -->
<template>
  <!-- Loading State -->
  <div v-if="isUserLoading" class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto"></div>
      <p class="mt-4 text-gray-600">Lade Benutzer...</p>
    </div>
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
          <h1 class="text-2xl font-bold text-gray-900">Schülerliste</h1>
        </div>

        <!-- Add Student Button (nur für Staff/Admin) -->
        <button 
          v-if="currentUser.role !== 'client'"
          @click="showAddModal = true"
          class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          + Neu
        </button>
      </div>

      <!-- Search & Filters -->
      <div class="mt-4 space-y-4">
        <!-- Search Bar -->
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Schüler suchen (Name oder E-Mail)..."
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
          <div class="absolute left-3 top-2.5 text-gray-400">
            🔍
          </div>
        </div>

        <!-- Filter Toggles -->
        <div class="flex gap-4 items-center">
          <!-- Inactive Toggle -->
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              v-model="showInactive"
              type="checkbox"
              class="rounded border-gray-300 text-green-600 focus:ring-green-500"
            >
            <span class="text-sm text-gray-700">Inaktive</span>
          </label>

          <!-- All Students Toggle (nur für Staff) -->
          <label 
            v-if="currentUser.role === 'staff'" 
            class="flex items-center gap-2 cursor-pointer"
          >
            <input
              v-model="showAllStudents"
              type="checkbox"
              class="rounded border-gray-300 text-green-600 focus:ring-green-500"
              @change="loadStudents"
            >
            <span class="text-sm text-gray-700">Alle Fahrschüler</span>
          </label>
        </div>

        <!-- Statistics -->
        <div class="flex gap-4 text-sm text-gray-600">
          <span>Gesamt: {{ students.length }}</span>
          <span>Aktiv: {{ students.filter(s => s.is_active).length }}</span>
          <span>Inaktiv: {{ students.filter(s => !s.is_active).length }}</span>
          <span v-if="searchQuery">Gefiltert: {{ filteredStudents.length }}</span>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-hidden">
      <!-- Loading Students -->
      <div v-if="isLoading" class="flex items-center justify-center h-full">
        <div class="text-center">
          <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto"></div>
          <p class="mt-4 text-gray-600">Lade Schüler...</p>
        </div>
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
        <div class="text-center">
          <div class="text-6xl mb-4">👥</div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">
            {{ searchQuery ? 'Keine Schüler gefunden' : 'Noch keine Schüler' }}
          </h3>
          <p class="text-gray-600 mb-4">
            {{ searchQuery 
              ? 'Versuchen Sie einen anderen Suchbegriff' 
              : 'Fügen Sie Ihren ersten Schüler hinzu' }}
          </p>
          <button 
            v-if="!searchQuery && currentUser.role !== 'client'"
            @click="showAddModal = true"
            class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Ersten Schüler hinzufügen
          </button>
        </div>
      </div>

      <!-- Students List -->
      <div v-else class="h-full overflow-y-auto p-4">
        <div class="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="student in filteredStudents"
            :key="student.id"
            @click="selectStudent(student)"
            class="bg-white rounded-lg shadow-sm border p-4 cursor-pointer hover:shadow-md transition-shadow"
          >
            <!-- Student Card Content -->
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h3 class="font-semibold text-gray-900">
                  {{ student.first_name }} {{ student.last_name }}
                </h3>
                <p class="text-sm text-gray-600">{{ student.email }}</p>
                <p v-if="student.phone" class="text-sm text-gray-600">{{ student.phone }}</p>
                <p v-if="student.category" class="text-xs text-gray-500 mt-1">
                  Kategorie: {{ student.category }}
                </p>
              </div>
              
              <!-- Status Badge -->
              <span :class="[
                'text-xs px-2 py-1 rounded-full',
                student.is_active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              ]">
                {{ student.is_active ? 'Aktiv' : 'Inaktiv' }}
              </span>
            </div>

            <!-- Quick Info -->
            <div class="mt-3 flex justify-between items-center text-xs text-gray-500">
              <span>Erstellt: {{ formatDate(student.created_at) }}</span>
              <span class="text-green-600 font-medium">Details →</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TEMPORÄRE Modals (einfache Alerts) -->
    <div v-if="selectedStudent" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-lg max-w-md">
        <h3 class="text-lg font-bold mb-4">{{ selectedStudent.first_name }} {{ selectedStudent.last_name }}</h3>
        <p><strong>E-Mail:</strong> {{ selectedStudent.email }}</p>
        <p><strong>Telefon:</strong> {{ selectedStudent.phone }}</p>
        <p><strong>Kategorie:</strong> {{ selectedStudent.category }}</p>
        <p><strong>Status:</strong> {{ selectedStudent.is_active ? 'Aktiv' : 'Inaktiv' }}</p>
        <button 
          @click="selectedStudent = null"
          class="mt-4 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Schließen
        </button>
      </div>
    </div>

    <div v-if="showAddModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-lg max-w-md">
        <h3 class="text-lg font-bold mb-4">Neuer Schüler</h3>
        <p class="text-gray-600 mb-4">Add Student Modal wird hier implementiert...</p>
        <button 
          @click="showAddModal = false"
          class="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Schließen
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { navigateTo } from '#app'
import { useCurrentUser } from '~/composables/useCurrentUser'

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
  let filtered = students.value

  // Filter by active/inactive
  if (!showInactive.value) {
    filtered = filtered.filter(s => s.is_active)
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(s => 
      s.first_name?.toLowerCase().includes(query) ||
      s.last_name?.toLowerCase().includes(query) ||
      s.email?.toLowerCase().includes(query)
    )
  }

  return filtered
})

// Lifecycle
onMounted(async () => {
  await fetchCurrentUser()
  
  if (userError.value || !currentUser.value) {
    await navigateTo('/')
    return
  }

  await loadStudents()
})

// Methods
const loadStudents = async () => {
  if (!currentUser.value) return
  
  isLoading.value = true
  error.value = null
  
  try {
    // MOCK DATA für Test
    students.value = [
      {
        id: '1',
        first_name: 'Sandra',
        last_name: 'Meier',
        email: 'test.zuerich@example.com',
        phone: '+41791234567',
        category: 'B',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        first_name: 'Michael',
        last_name: 'Gasser',
        email: 'test.lachen@example.com',
        phone: '+41791234568',
        category: 'B',
        is_active: true,
        created_at: new Date().toISOString()
      }
    ]
  } catch (err) {
    error.value = 'Fehler beim Laden der Schüler'
    console.error('Error loading students:', err)
  } finally {
    isLoading.value = false
  }
}

const selectStudent = (student: any) => {
  selectedStudent.value = student
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('de-CH')
}
</script>