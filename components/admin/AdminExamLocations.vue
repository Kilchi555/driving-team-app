<template>
  <div class="bg-white p-6 rounded-lg border border-gray-200">
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-lg font-medium text-gray-900">
        🏛️ Prüfungsstandorte verwalten
      </h3>
      <button
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        @click="showAddForm = !showAddForm"
      >
        {{ showAddForm ? 'Abbrechen' : '+ Neuer Standort' }}
      </button>
    </div>

    <!-- Error/Success Messages -->
    <div v-if="error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
      ❌ {{ error }}
    </div>
    
    <div v-if="successMessage" class="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
      ✅ {{ successMessage }}
    </div>

   <!-- Add Form (inline) -->
<div v-if="showAddForm && !editingLocation" class="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
  <h4 class="font-medium text-gray-900 mb-3">Neuen Prüfungsstandort hinzufügen</h4>
  
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
      <input
        v-model="formData.name"
        type="text"
        placeholder="z.B. TCS Zürich"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
    </div>
    
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Adresse *</label>
      <input
        v-model="formData.address"
        type="text"
        placeholder="Vollständige Adresse"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
    </div>
    
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Stadt</label>
      <input
        v-model="formData.city"
        type="text"
        placeholder="z.B. Zürich"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
    </div>
    
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Kanton</label>
      <select
        v-model="formData.canton"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">Kanton wählen</option>
        <option value="ZH">Zürich</option>
        <option value="BE">Bern</option>
        <option value="LU">Luzern</option>
        <option value="AG">Aargau</option>
        <option value="SG">St. Gallen</option>
        <option value="GR">Graubünden</option>
        <option value="TI">Tessin</option>
        <option value="VD">Waadt</option>
        <option value="VS">Wallis</option>
        <option value="GE">Genf</option>
      </select>
    </div>
    
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
      <input
        v-model="formData.postal_code"
        type="text"
        placeholder="z.B. 8005"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
    </div>
    
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
      <input
        v-model="formData.contact_phone"
        type="tel"
        placeholder="z.B. +41 44 123 45 67"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
    </div>
  </div>
  
  <div class="mt-4">
    <label class="block text-sm font-medium text-gray-700 mb-1">Verfügbare Kategorien</label>
    <div class="flex flex-wrap gap-2">
      <label
        v-for="category in availableCategories"
        :key="category"
        class="flex items-center p-2 border rounded cursor-pointer text-gray-700 hover:bg-gray-50 text-sm"
        :class="{
          'border-blue-500 bg-blue-50': formData.available_categories.includes(category),
          'border-gray-300': !formData.available_categories.includes(category)
        }"
      >
        <input
          type="checkbox"
          :checked="formData.available_categories.includes(category)"
          class="sr-only"
          @change="toggleCategory(category)"
        >
        <span class="font-medium">{{ category }}</span>
      </label>
    </div>
  </div>
  
  <div class="mt-4 flex gap-3">
    <button
      :disabled="isSaving || !formData.name || !formData.address"
      class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
      @click="saveLocation"
    >
      {{ isSaving ? 'Speichern...' : 'Hinzufügen' }}
    </button>
    <button
      class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      @click="cancelEdit"
    >
      Abbrechen
    </button>
  </div>
</div>

<!-- Edit Modal -->
<div v-if="editingLocation" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
  <div class="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
    <div class="p-6">
      <div class="flex justify-between items-center mb-4">
        <h4 class="text-lg font-medium text-gray-900">Prüfungsstandort bearbeiten</h4>
        <button class="text-gray-500 hover:text-gray-700" @click="cancelEdit">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input
            v-model="formData.name"
            type="text"
            placeholder="z.B. TCS Zürich"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Adresse *</label>
          <input
            v-model="formData.address"
            type="text"
            placeholder="Vollständige Adresse"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Stadt</label>
          <input
            v-model="formData.city"
            type="text"
            placeholder="z.B. Zürich"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Kanton</label>
          <select
            v-model="formData.canton"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Kanton wählen</option>
            <option value="ZH">Zürich</option>
            <option value="BE">Bern</option>
            <option value="LU">Luzern</option>
            <option value="AG">Aargau</option>
            <option value="SG">St. Gallen</option>
            <option value="GR">Graubünden</option>
            <option value="TI">Tessin</option>
            <option value="VD">Waadt</option>
            <option value="VS">Wallis</option>
            <option value="GE">Genf</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
          <input
            v-model="formData.postal_code"
            type="text"
            placeholder="z.B. 8005"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
          <input
            v-model="formData.contact_phone"
            type="tel"
            placeholder="z.B. +41 44 123 45 67"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
        </div>
      </div>
      
      <div class="mt-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">Verfügbare Kategorien</label>
        <div class="flex flex-wrap gap-2">
          <label
            v-for="category in availableCategories"
            :key="category"
            class="flex items-center p-2 border rounded cursor-pointer text-gray-700 hover:bg-gray-50 text-sm"
            :class="{
              'border-blue-500 bg-blue-50': formData.available_categories.includes(category),
              'border-gray-300': !formData.available_categories.includes(category)
            }"
          >
            <input
              type="checkbox"
              :checked="formData.available_categories.includes(category)"
              class="sr-only"
              @change="toggleCategory(category)"
            >
            <span class="font-medium">{{ category }}</span>
          </label>
        </div>
      </div>
      
      <div class="mt-6 flex gap-3">
        <button
          :disabled="isSaving || !formData.name || !formData.address"
          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          @click="saveLocation"
        >
          {{ isSaving ? 'Speichern...' : 'Aktualisieren' }}
        </button>
        <button
          class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          @click="cancelEdit"
        >
          Abbrechen
        </button>
      </div>
    </div>
  </div>
</div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"/>
      <p class="text-gray-600">Lade Prüfungsstandorte...</p>
    </div>

    <!-- Locations List -->
    <div v-else class="space-y-3">
      <div v-if="examLocations.length === 0" class="text-center py-12 text-gray-500">
        <div class="text-6xl mb-4">🏛️</div>
        <h4 class="text-lg font-medium text-gray-900 mb-2">Keine Prüfungsstandorte</h4>
        <p class="text-gray-600">Fügen Sie den ersten Prüfungsstandort hinzu</p>
      </div>

      <div
        v-for="location in examLocations"
        :key="location.id"
        class="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-all"
        :class="{ 'border-green-200 bg-green-50': location.is_active, 'border-gray-200': !location.is_active }"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <!-- Header -->
            <div class="flex items-center gap-3 mb-2">
              <h4 class="font-semibold text-gray-900">{{ location.name }}</h4>
            </div>
            
            <!-- Address -->
            <p class="text-sm text-gray-600 mb-2">
              📍 {{ location.address }}
              <span v-if="location.city" class="text-gray-500">
                • {{ location.city }}  {{ location.postal_code }}
              </span>
            </p>
            
            <!-- Categories -->
            <div v-if="location.available_categories && location.available_categories.length > 0" class="flex flex-wrap gap-1 mb-2">
              <span
                v-for="category in location.available_categories"
                :key="category"
                class="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
              >
                {{ category }}
              </span>
            </div>
            
            <!-- Usage Stats -->
            <div class="text-xs text-gray-500 mt-2">
              Erstellt: {{ formatDate(location.created_at) }}
              <span v-if="location.updated_at && location.updated_at !== location.created_at">
                • Aktualisiert: {{ formatDate(location.updated_at) }}
              </span>
            </div>
          </div>
          
            <!-- Actions -->
            <div class="flex flex-col sm:flex-row gap-1 sm:gap-2 min-w-max">
            <button
                class="px-2 py-1 text-blue-600 hover:text-blue-800 text-xs font-medium border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                @click="startEdit(location)"
            >
                ✏️ Bearbeiten
            </button>
            <button
                class="px-2 py-1 text-red-600 hover:text-red-800 text-xs font-medium border border-red-200 rounded hover:bg-red-50 transition-colors"
                @click="confirmDelete(location)"
            >
                🗑️ Löschen
            </button>
            </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { toLocalTimeString } from '~/utils/dateUtils'

// State
const examLocations = ref<any[]>([])
const isLoading = ref(false)
const isSaving = ref(false)
const error = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const showAddForm = ref(false)
const editingLocation = ref<any | null>(null)
const usageCount = ref(0)

// Form Data
const formData = ref({
  name: '',
  address: '',
  city: '',
  canton: '',
  postal_code: '',
  available_categories: [] as string[],
  contact_phone: ''
})

// Constants
const availableCategories = ['B', 'A1', 'A', 'BE', 'C1', 'C', 'D1', 'D']

// Computed - Removed unused computed properties

// === METHODS ===

const loadExamLocations = async () => {
  isLoading.value = true
  try {
    const supabase = getSupabase()
    
    const { data: locations, error: locationsError } = await supabase
      .from('exam_locations')
      .select('*')
      .order('name', { ascending: true })

    if (locationsError) throw locationsError
    examLocations.value = locations || []
      
    usageCount.value = 0

    console.log('✅ Admin: Exam locations loaded:', examLocations.value.length)

  } catch (err: any) {
    console.error('❌ Error loading exam locations:', err)
    error.value = `Fehler beim Laden: ${err.message}`
  } finally {
    isLoading.value = false
  }
}

const saveLocation = async () => {
  if (!formData.value.name || !formData.value.address) {
    error.value = 'Name und Adresse sind erforderlich'
    return
  }

  isSaving.value = true
  error.value = null
  
  try {
    const supabase = getSupabase()
    
    const locationData = {
      name: formData.value.name.trim(),
      address: formData.value.address.trim(),
      city: formData.value.city.trim() || null,
      canton: formData.value.canton || null,
      postal_code: formData.value.postal_code.trim() || null,
      available_categories: formData.value.available_categories,
      contact_phone: formData.value.contact_phone.trim() || null,
      updated_at: toLocalTimeString(new Date())
    }

    if (editingLocation.value) {
      // Update existing
      const { error: updateErr } = await supabase
        .from('exam_locations')
        .update(locationData)
        .eq('id', editingLocation.value.id)

      if (updateErr) throw updateErr
      successMessage.value = `"${formData.value.name}" wurde aktualisiert`
    } else {
      // Create new
      const { error: insertErr } = await supabase
        .from('exam_locations')
        .insert({
          ...locationData,
          created_at: toLocalTimeString(new Date())
        })

      if (insertErr) throw insertErr
      successMessage.value = `"${formData.value.name}" wurde hinzugefügt`
    }

    await loadExamLocations()
    cancelEdit()
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      successMessage.value = null
    }, 3000)

  } catch (err: any) {
    console.error('❌ Error saving location:', err)
    error.value = `Fehler beim Speichern: ${err.message}`
  } finally {
    isSaving.value = false
  }
}

const startEdit = (location: any) => {
    console.log('startEdit ausgeführt mit:', location)
  editingLocation.value = location
  showAddForm.value = true
  
  formData.value = {
    name: location.name,
    address: location.address,
    city: location.city || '',
    canton: location.canton || '',
    postal_code: location.postal_code || '',
    available_categories: [...(location.available_categories || [])],
    contact_phone: location.contact_phone || ''
  }
}

const cancelEdit = () => {
  editingLocation.value = null
  showAddForm.value = false
  
  formData.value = {
    name: '',
    address: '',
    city: '',
    canton: '',
    postal_code: '',
    available_categories: [],
    contact_phone: ''
  }
}

const toggleLocationStatus = async (location: any) => {
  try {
    const supabase = getSupabase()
    
    const { error: toggleErr } = await supabase
      .from('exam_locations')
      .update({ 
        is_active: !location.is_active,
        updated_at: toLocalTimeString(new Date())
      })
      .eq('id', location.id)

    if (toggleErr) throw toggleErr
    
    await loadExamLocations()
    successMessage.value = `"${location.name}" wurde ${!location.is_active ? 'aktiviert' : 'deaktiviert'}`
    
    setTimeout(() => {
      successMessage.value = null
    }, 3000)

  } catch (err: any) {
    console.error('❌ Error toggling location:', err)
    error.value = `Fehler beim Ändern des Status: ${err.message}`
  }
}

const confirmDelete = async (location: any) => {
  if (!confirm(`Möchten Sie "${location.name}" wirklich löschen?`)) {
    return
  }

  try {
    const supabase = getSupabase()
    
    const { error: deleteErr } = await supabase
      .from('exam_locations')
      .delete()
      .eq('id', location.id)

    if (deleteErr) throw deleteErr
    
    await loadExamLocations()
    successMessage.value = `"${location.name}" wurde gelöscht`
    
    setTimeout(() => {
      successMessage.value = null
    }, 3000)

  } catch (err: any) {
    console.error('❌ Error deleting location:', err)
    error.value = `Fehler beim Löschen: ${err.message}`
  }
}

const toggleCategory = (category: string) => {
  const index = formData.value.available_categories.indexOf(category)
  if (index > -1) {
    formData.value.available_categories.splice(index, 1)
  } else {
    formData.value.available_categories.push(category)
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('de-CH')
}

const getMapsUrl = (location: any) => {
  const query = encodeURIComponent(location.address)
  return `https://maps.google.com/maps?q=${query}`
}

// Clear messages when component unmounts
const clearMessages = () => {
  error.value = null
  successMessage.value = null
}

// Lifecycle
onMounted(() => {
  loadExamLocations()
})
</script>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>