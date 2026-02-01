<!-- AdminEventTypes.vue - Admin-Dashboard für Terminarten -->
<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Terminarten verwalten</h1>
      <button
        @click="openCreateModal"
        class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
      >
        <span>+</span>
        Neue Terminart
      </button>
    </div>

    <!-- Event-Types Liste -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Terminart</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Standard-Dauer</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farbe</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aktionen</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="eventType in eventTypes" :key="eventType.id">
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center gap-3">
                <span class="text-2xl">{{ eventType.emoji }}</span>
                <div>
                  <div class="text-sm font-medium text-gray-900">{{ eventType.name }}</div>
                  <div class="text-sm text-gray-500">{{ eventType.description }}</div>
                  <div class="text-xs text-gray-400">Code: {{ eventType.code }}</div>
                </div>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ eventType.default_duration_minutes }} Minuten
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center gap-2">
                <div 
                  class="w-6 h-6 rounded border border-gray-300"
                  :style="{ backgroundColor: eventType.default_color }"
                ></div>
                <span class="text-sm text-gray-600">{{ eventType.default_color }}</span>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span 
                :class="[
                  'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                  eventType.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                ]"
              >
                {{ eventType.is_active ? 'Aktiv' : 'Inaktiv' }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
              <button
                @click="editEventType(eventType)"
                class="text-blue-600 hover:text-blue-900"
              >
                Bearbeiten
              </button>
              <button
                @click="toggleEventType(eventType)"
                :class="[
                  eventType.is_active 
                    ? 'text-red-600 hover:text-red-900' 
                    : 'text-green-600 hover:text-green-900'
                ]"
              >
                {{ eventType.is_active ? 'Deaktivieren' : 'Aktivieren' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg w-full max-w-2xl mx-4">
        <div class="px-6 py-4 border-b">
          <h3 class="text-lg font-medium">
            {{ editingEventType ? 'Terminart bearbeiten' : 'Neue Terminart erstellen' }}
          </h3>
        </div>
        
        <div class="px-6 py-4 space-y-4">
          <!-- Code -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Code *</label>
            <input
              v-model="formData.code"
              type="text"
              class="w-full p-3 border border-gray-300 rounded-lg"
              placeholder="z.B. meeting"
              :disabled="!!editingEventType"
            />
          </div>
          
          <!-- Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Name *</label>
            <input
              v-model="formData.name"
              type="text"
              class="w-full p-3 border border-gray-300 rounded-lg"
              placeholder="z.B. Besprechung"
            />
          </div>
          
          <!-- Emoji -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Emoji</label>
            <input
              v-model="formData.emoji"
              type="text"
              class="w-20 p-3 border border-gray-300 rounded-lg text-center"
              placeholder="🤝"
            />
          </div>
          
          <!-- Beschreibung -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Beschreibung</label>
            <textarea
              v-model="formData.description"
              rows="2"
              class="w-full p-3 border border-gray-300 rounded-lg"
              placeholder="Kurze Beschreibung der Terminart"
            ></textarea>
          </div>
          
          <!-- Standard-Dauer -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Standard-Dauer (Minuten) *</label>
            <input
              v-model="formData.default_duration_minutes"
              type="number"
              min="15"
              max="600"
              step="15"
              class="w-32 p-3 border border-gray-300 rounded-lg"
            />
          </div>
          
          <!-- Farbe -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Standard-Farbe</label>
            <div class="flex items-center gap-3">
              <input
                v-model="formData.default_color"
                type="color"
                class="w-12 h-12 border border-gray-300 rounded cursor-pointer"
              />
              <input
                v-model="formData.default_color"
                type="text"
                class="w-24 p-2 border border-gray-300 rounded-lg"
                placeholder="#019ee5"
              />
            </div>
          </div>
        </div>
        
        <div class="px-6 py-4 bg-gray-50 flex justify-end gap-3">
          <button
            @click="closeModal"
            class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button
            @click="saveEventType"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {{ editingEventType ? 'Speichern' : 'Erstellen' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
// ✅ MIGRATED TO API - import { getSupabase } from '~/utils/supabase'

// ✅ MIGRATED TO API - const supabase = getSupabase()

const eventTypes = ref<any[]>([])
const showModal = ref(false)
const editingEventType = ref<any>(null)
const formData = ref({
  code: '',
  name: '',
  emoji: '📝',
  description: '',
  default_duration_minutes: 45,
  default_color: '#666666'
})

// Event-Types laden
const loadEventTypes = async () => {
  try {
    const { data, error } = await supabase
      .from('event_types')
      .select('*')
      .order('display_order')
    
    if (error) throw error
    eventTypes.value = data || []
  } catch (error) {
    console.error('Error loading event types:', error)
  }
}

// Modal öffnen/schließen
const openCreateModal = () => {
  editingEventType.value = null
  formData.value = {
    code: '',
    name: '',
    emoji: '📝',
    description: '',
    default_duration_minutes: 45,
    default_color: '#666666'
  }
  showModal.value = true
}

const editEventType = (eventType: any) => {
  editingEventType.value = eventType
  formData.value = { ...eventType }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingEventType.value = null
}

// Speichern
const saveEventType = async () => {
  try {
    if (editingEventType.value) {
      // Update
      const { error } = await supabase
        .from('event_types')
        .update(formData.value)
        .eq('id', editingEventType.value.id)
      
      if (error) throw error
    } else {
      // Create
      const { error } = await supabase
        .from('event_types')
        .insert(formData.value)
      
      if (error) throw error
    }
    
  await loadEventTypes()
  await nextTick() // Vue's nextTick importieren
  showModal.value = false // Explizit setzen
  editingEventType.value = null // Explizit zurücksetzen
  } catch (error) {
    console.error('Error saving event type:', error)
    alert('Fehler beim Speichern')
  }
}

// Aktivieren/Deaktivieren
const toggleEventType = async (eventType: any) => {
  try {
    const { error } = await supabase
      .from('event_types')
      .update({ is_active: !eventType.is_active })
      .eq('id', eventType.id)
    
    if (error) throw error
    await loadEventTypes()
  } catch (error) {
    console.error('Error toggling event type:', error)
  }
}

onMounted(() => {
  loadEventTypes()
})
</script>